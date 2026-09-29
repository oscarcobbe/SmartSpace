/**
 * A Wi-Fi check becomes an enquiry.
 *
 * The report's readings arrive as the same parameter the report page reads,
 * and are graded again here. The colour and recommendation Nigel is emailed are
 * computed on the server from the measurements, so an edited page cannot send
 * him a green report for a red house.
 *
 * ── LIVE ONLY ONCE THE PAGES ARE PUBLIC ──────────────────────────
 *
 * Every send below reaches a real person or a real record: Nigel's inbox, the
 * customer's inbox, the leads sheet and the CRM. Until the production
 * deployment has NEXT_PUBLIC_NETWORK_PAGES_LIVE=1, the switch that makes the
 * pages public, this answers { dryRun: true }, logs what it would have sent,
 * and sends nothing. Before that switch only people signed in to the CRM can
 * open the pages (src/middleware.ts), so every enquiry is somebody testing,
 * and on 29 September 2026 the first test on the live site would otherwise
 * have emailed Nigel a lead for a service he had not been told about yet.
 * WIFI_CHECK_LIVE=1 turns the sends on anywhere, deliberately.
 *
 * No ad conversion fires from here yet. Which conversion action a Wi-Fi
 * enquiry counts as is a decision for the ads account, not for this route.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { decodeCheck } from "@/lib/wifi-check/codec";
import { grade, mbps, PLACE_LABEL, type Grade, type Reading } from "@/lib/wifi-check/grade";
import { packageBySlug, priceLabel } from "@/data/wifiPackages";
import { logLead, SHEET_BACKGROUND, type AttributionRecord } from "@/lib/leads";
import { afterResponse, AFTER_CEILING } from "@/lib/after-response";
import { wifiReport } from "@/lib/email/customer";
import { approval } from "@/lib/signoff/state";
import { sendToCrm } from "@/lib/crm";
import { recordEnquiryConsent, type ConsentInput } from "@/lib/ad-consent";
import { alertTo, monitorBcc, BUSINESS_SITE, BUSINESS_EMAIL } from "@/lib/business-constants";

export const dynamic = "force-dynamic";
/* The sheet append runs after the answer and can take minutes to settle
   (SHEET_BACKGROUND); waitUntil only keeps the function alive this long. */
export const maxDuration = 600;

const live = () =>
  process.env.WIFI_CHECK_LIVE?.trim() === "1" ||
  (process.env.VERCEL_ENV === "production" && process.env.NEXT_PUBLIC_NETWORK_PAGES_LIVE === "1");

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LIGHT_HEX = { red: "#DC2626", amber: "#B45309", green: "#15803D" } as const;

function reportLines(g: Grade, readings: Reading[]) {
  const lines = [`Result: ${g.light.toUpperCase()}. ${g.headline}.`, g.summary, ""];
  for (const r of readings) {
    lines.push(
      `${PLACE_LABEL[r.place]}: ${mbps(r.down)} down, ${mbps(r.up)} up Mbps` +
        (r.ping != null ? `, ping ${Math.round(r.ping)} ms` : "") +
        (r.busy != null ? `, ${Math.round(r.busy)} ms when busy` : ""),
    );
  }
  lines.push("");
  for (const c of g.checks) lines.push(`${c.light ? c.light.toUpperCase() : "NOT TESTED"}  ${c.title}: ${c.finding}`);
  return lines;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 });
  }

  const str = (k: string, max = 200) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const name = str("name", 120);
  const email = str("email", 200);
  const phone = str("phone", 40);
  const eircode = str("eircode", 8).toUpperCase();
  const page = str("page", 120);

  /* The site-wide honeypot. A bot gets a success so it does not retry, and
     nothing else happens. */
  if (str("homepage_url")) {
    console.warn(`[wifi-check] honeypot triggered, dropping. email=${email.slice(0, 60)}`);
    return NextResponse.json({ ok: true });
  }

  if (!name || !email || !phone) {
    return NextResponse.json({ error: "Please give your name, email and phone." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const reportParam = typeof body.report === "string" ? body.report : null;
  const check = reportParam ? decodeCheck(reportParam) : null;
  if (reportParam && !check) {
    return NextResponse.json({ error: "The report could not be read. Run the check again." }, { status: 400 });
  }
  const g = check ? grade(check.readings, check.answers) : null;
  const pkg = packageBySlug(g?.recommend ?? (typeof body.package === "string" ? body.package : null));
  const reportUrl = reportParam ? `${BUSINESS_SITE}/wifi-check/report?r=${reportParam}` : null;
  const attribution = (typeof body.attribution === "object" && body.attribution ? body.attribution : undefined) as
    | AttributionRecord
    | undefined;
  const consent = (body.consent ?? null) as ConsentInput | null;

  const detail = g ? `${g.light[0].toUpperCase()}${g.light.slice(1)}, ${pkg?.name ?? "smart security"}` : pkg?.name ?? "Wi-Fi enquiry";
  const contact = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Eircode: ${eircode || "not given"}`,
    `Page: ${page || "not given"}`,
  ];
  const report = [
    `Package: ${pkg ? `${pkg.name} (${priceLabel(pkg)})` : "none, the Wi-Fi is fine"}`,
    "",
    ...(g && check ? reportLines(g, check.readings) : ["No report attached: an enquiry from a package page."]),
    ...(reportUrl ? ["", `Report: ${reportUrl}`] : []),
  ];
  const lines = [...contact, "", ...report];
  /* The sheet and the CRM already hold the contact details in their own
     columns, so their notes carry the report alone. */
  const notes = report.join("\n").slice(0, 3000);

  if (!live()) {
    console.log(`[wifi-check] DRY RUN, nothing sent. Would have emailed Nigel, the customer, the sheet and the CRM:\n${lines.join("\n")}`);
    return NextResponse.json({ ok: true, dryRun: true, light: g?.light ?? null, recommend: g?.recommend ?? null });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.error("[wifi-check] RESEND_API_KEY or RESEND_FROM_EMAIL missing");
    return NextResponse.json({ error: "Email is not configured on the server." }, { status: 503 });
  }
  const resend = new Resend(apiKey);
  const to = alertTo();

  const { error } = await resend.emails.send({
    from,
    to: [to],
    bcc: monitorBcc(),
    replyTo: email,
    subject: g ? `Wi-Fi check (${g.light.toUpperCase()}): ${name}` : `Wi-Fi enquiry: ${name}, ${pkg?.name ?? "Wi-Fi"}`,
    text: lines.join("\n"),
    html: `<h2 style="margin:0 0 12px">${g ? `Wi-Fi check: <span style="color:${LIGHT_HEX[g.light]}">${g.light.toUpperCase()}</span>` : "Wi-Fi enquiry"}</h2>
<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.55">${esc(lines.join("\n"))}</pre>`,
  });
  if (error) {
    console.error("[wifi-check] Resend refused the lead email:", error);
    return NextResponse.json({ error: "That did not send. Please try again, or ring us." }, { status: 502 });
  }

  /*
   * Nigel has the enquiry, so the visitor gets their answer now and the rest
   * runs after it, the way the contact form does (src/lib/after-response.ts).
   * The customer's copy of the report is the shared template, so it is the
   * email the studio at /dev/emails shows.
   */
  if (g && reportUrl) {
    const mail = wifiReport({
      name,
      light: g.light,
      headline: g.headline,
      summary: g.summary,
      reportUrl,
      recommend: pkg?.name ?? null,
    });
    afterResponse("customer report", AFTER_CEILING.email, async () => {
      /* The customer's copy goes only once Nigel has signed it off. */
      const ok = await approval("email:wifi-report");
      if (!ok.approved) return { ok: true, outcome: `not sent, not signed off: ${ok.reason}` };
      const r = await resend.emails.send({
        from,
        to: [email],
        replyTo: BUSINESS_EMAIL,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      return r.error ? { ok: false, outcome: `refused: ${JSON.stringify(r.error)}` } : { ok: true, outcome: "sent" };
    });
  }

  afterResponse("leads sheet", AFTER_CEILING.sheet, () =>
    logLead(
      {
        type: "WiFi Check",
        name,
        email,
        phone,
        address: eircode || undefined,
        product: pkg?.name,
        source: "smart-space.ie",
        notes,
        attribution,
      },
      SHEET_BACKGROUND,
    ),
  );

  afterResponse("consent record", AFTER_CEILING.consent, () =>
    recordEnquiryConsent({ email, phone, consent, source: "wifi_check" }),
  );

  afterResponse("crm mirror", AFTER_CEILING.crm, () =>
    sendToCrm({
      source: "wifi_check",
      source_detail: detail,
      name,
      email,
      phone,
      eircode: eircode || null,
      message: notes,
      utm_source: attribution?.utmSource ?? null,
      utm_medium: attribution?.utmMedium ?? null,
      utm_campaign: attribution?.utmCampaign ?? null,
      utm_term: attribution?.utmTerm ?? null,
      utm_content: attribution?.utmContent ?? null,
      gclid: attribution?.gclid ?? null,
      referrer: attribution?.referrer ?? null,
      tags: ["wifi-check", ...(g ? [`wifi-${g.light}`] : [])],
      custom: {
        wifi: g
          ? { light: g.light, cause: g.cause, recommend: g.recommend, also: g.also, report: reportUrl }
          : { package: pkg?.slug ?? null },
      },
    }),
  );

  return NextResponse.json({ ok: true, light: g?.light ?? null, recommend: g?.recommend ?? null });
}
