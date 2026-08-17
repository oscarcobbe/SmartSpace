// POST /api/admin/send-payment-link
//
// Two modes, both driven from the leads dashboard:
//
//   mode: "payment"  , emails the customer their Stripe payment link for a
//                      specific job, with a summary of exactly what they are
//                      paying for (date, time, product, spec) above the pay
//                      button. When job details are supplied we also push the
//                      same summary onto the Stripe checkout page itself via
//                      custom_text, so the customer sees identical wording in
//                      the email and at the point of payment.
//   mode: "booking"   , emails the customer a booking link so they can pick a
//                      slot themselves from a calendar that is conflict-checked
//                      against Nigel's Google Calendar.
//
// Why the payment URL is pasted rather than selected: every payment link on
// the account is bespoke per job ("Balance of EUR 271 on EUR 500", "Booking
// deposit of EUR 650 on EUR 1,084"). There is no catalogue to pick from.
//
// Auth: Bearer ADMIN_KEY, timing-safe compare, same as /api/admin/leads. This
// route sends email from our verified domain and embeds a payment link, so an
// unauthenticated version would be both a spam relay and a phishing vector.
//
// Env:
//   ADMIN_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_REPLY_TO,
//   STRIPE_SECRET_KEY (optional , only needed to mirror the summary onto the
//   Stripe checkout page), TERMS_URL

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const FROM =
  process.env.RESEND_FROM_EMAIL || "Smart Space <bookings@bookings.smart-space.ie>";
const REPLY_TO = process.env.RESEND_REPLY_TO || "bookings@smart-space.ie";
const TERMS_URL = process.env.TERMS_URL || "https://smart-space.ie/terms";

// Hosts we are willing to put behind a button in an email we send. Anything
// else is refused: a free-text URL field that mails any link from our verified
// domain is a phishing relay for anyone holding the admin key.
const PAYMENT_HOSTS = ["buy.stripe.com"];
const BOOKING_HOSTS = [
  "www.smartcareliving.ie",
  "smartcareliving.ie",
  "www.smart-space.ie",
  "smart-space.ie",
];

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab); // burn a comparison so timing hides the length
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

type JobDetail = { label: string; value: string };

/** Mirror the job summary onto the Stripe checkout page so the customer reads
 *  the same wording in the email and at the moment of payment. Best-effort:
 *  a failure here must never block the email, which is the thing the customer
 *  actually needs. Payment links are bespoke per job, so mutating one is safe. */
async function mirrorSummaryToStripe(paymentUrl: string, lines: JobDetail[]) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || lines.length === 0) return;
  try {
    // buy.stripe.com URLs carry an opaque short code, not the plink_ id, so
    // find the link by matching its url.
    const listRes = await fetch("https://api.stripe.com/v1/payment_links?limit=100", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!listRes.ok) return;
    const list = (await listRes.json()) as { data?: Array<{ id: string; url: string }> };
    const match = (list.data ?? []).find((l) => l.url === paymentUrl.replace(/\/$/, ""));
    if (!match) return;

    const message = lines.map((l) => `${l.label}: ${l.value}`).join(" · ").slice(0, 1200);
    await fetch(`https://api.stripe.com/v1/payment_links/${match.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ "custom_text[submit][message]": message }).toString(),
    });
  } catch (err) {
    console.warn("[send-payment-link] could not mirror summary to Stripe:", err);
  }
}

export async function POST(request: Request) {
  // ── Auth ──
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const submittedKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!submittedKey || !safeEqual(submittedKey, adminKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse ──
  let body: {
    mode?: string;
    email?: string;
    name?: string;
    paymentUrl?: string;
    date?: string;
    time?: string;
    product?: string;
    spec?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode === "booking" ? "booking" : "payment";
  const to = (body.email ?? "").trim();
  const name = (body.name ?? "").trim().slice(0, 80);
  const url = (body.paymentUrl ?? "").trim();
  const date = (body.date ?? "").trim().slice(0, 60);
  const time = (body.time ?? "").trim().slice(0, 40);
  const product = (body.product ?? "").trim().slice(0, 160);
  const spec = (body.spec ?? "").trim().slice(0, 300);

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json(
      { error: "A valid customer email address is required." },
      { status: 400 },
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json(
      { error: mode === "booking" ? "Booking link is missing." : "Paste the Stripe payment link." },
      { status: 400 },
    );
  }
  const allowed = mode === "booking" ? BOOKING_HOSTS : PAYMENT_HOSTS;
  if (parsed.protocol !== "https:" || !allowed.includes(parsed.hostname)) {
    return NextResponse.json(
      {
        error:
          mode === "booking"
            ? "Booking links must be on smartcareliving.ie or smart-space.ie."
            : "That is not a Stripe link. Payment links must be on buy.stripe.com.",
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Email is not configured (RESEND_API_KEY missing)." },
      { status: 500 },
    );
  }

  const safeUrl = parsed.toString();
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hello,";

  const details: JobDetail[] = [
    ...(date ? [{ label: "Date", value: date }] : []),
    ...(time ? [{ label: "Time", value: time }] : []),
    ...(product ? [{ label: "Product", value: product }] : []),
    ...(spec ? [{ label: "Specification", value: spec }] : []),
  ];

  const summaryHtml = details.length
    ? `
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f5f7fa;border:1px solid #e4e7eb;border-radius:8px;margin:0 0 24px;">
    <tr><td style="padding:16px 18px 6px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#7b8794;">What you're paying for</div>
    </td></tr>
    ${details
      .map(
        (d) => `<tr>
      <td style="padding:4px 18px;">
        <span style="display:inline-block;min-width:110px;font-size:14px;color:#7b8794;">${escapeHtml(d.label)}</span>
        <span style="font-size:15px;color:#1f2933;font-weight:600;">${escapeHtml(d.value)}</span>
      </td></tr>`,
      )
      .join("")}
    <tr><td style="padding:6px 18px 16px;"></td></tr>
  </table>`
    : "";

  const isBooking = mode === "booking";
  const buttonLabel = isBooking ? "Choose your appointment" : "Pay securely";
  const buttonColour = isBooking ? "#f48222" : "#e85c2b";

  const intro = isBooking
    ? `Thanks for talking with us. When you're ready, pick a day and time that suits you using the link below , the calendar shows live availability, so whatever you choose is confirmed straight away.`
    : `Thanks for choosing Smart Space. You can complete your payment securely using the link below.`;

  const paymentFooter = isBooking
    ? `<p style="font-size:13px;color:#52606d;margin:0 0 20px;text-align:center;">Your appointment is confirmed as soon as you choose a slot.</p>`
    : `<p style="font-size:13px;color:#52606d;margin:0 0 20px;text-align:center;">Payment is handled by Stripe. We never see or store your card details.</p>
  <div style="background:#f5f7fa;border-left:3px solid #cbd2d9;padding:14px 18px;border-radius:6px;margin:0 0 20px;">
    <p style="font-size:13px;color:#3e4c59;margin:0;">
      By completing this payment you accept our
      <a href="${TERMS_URL}" style="color:#c2410c;">terms and conditions</a>,
      which cover the scope of the work, our installation warranty and the limits
      of our liability. Please read them before paying, and reply to this email
      if anything is unclear.
    </p>
  </div>`;

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;line-height:1.6;color:#1f2933;">
  <p style="font-size:16px;margin:0 0 16px;">${greeting}</p>
  <p style="font-size:16px;margin:0 0 20px;">${intro}</p>
  ${summaryHtml}
  <p style="margin:0 0 24px;text-align:center;">
    <a href="${safeUrl}"
       style="background:${buttonColour};color:#ffffff;text-decoration:none;font-weight:700;
              font-size:16px;padding:14px 30px;border-radius:8px;display:inline-block;">
      ${buttonLabel}
    </a>
  </p>
  ${paymentFooter}
  <p style="font-size:15px;margin:0 0 8px;">
    Any questions, just reply to this email or call us on
    <a href="tel:+35315130424" style="color:#c2410c;">01 513 0424</a>.
  </p>
  <hr style="border:none;border-top:1px solid #e4e7eb;margin:28px 0 16px;">
  <p style="font-size:12px;color:#7b8794;margin:0;">
    ${isBooking ? "SmartCare Living" : "Smart Space"} &middot; Dublin &amp; Leinster
  </p>
</div>`.trim();

  const text = [
    name ? `Hi ${name},` : "Hello,",
    "",
    intro,
    "",
    ...(details.length
      ? ["WHAT YOU'RE PAYING FOR", ...details.map((d) => `  ${d.label}: ${d.value}`), ""]
      : []),
    safeUrl,
    "",
    isBooking
      ? "Your appointment is confirmed as soon as you choose a slot."
      : `Payment is handled by Stripe, we never see or store your card details.\n\nBy completing this payment you accept our terms and conditions (${TERMS_URL}).`,
    "",
    "Questions? Reply to this email or call 01 513 0424.",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject: isBooking
          ? "Book your free home consultation"
          : "Your Smart Space payment link",
        html,
        text,
      }),
    });

    // Resend resolves with an error body on most failure modes rather than
    // throwing, so a bare try/catch would report success on a silent failure.
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[send-payment-link] Resend rejected:", res.status, detail.slice(0, 300));
      return NextResponse.json(
        { error: `Email provider rejected the send (${res.status}).` },
        { status: 502 },
      );
    }

    // Email is away; mirroring to Stripe is a bonus, never a blocker.
    if (!isBooking) await mirrorSummaryToStripe(safeUrl, details);

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    console.log(`[send-payment-link] ${mode} sent to`, to, "id", data?.id);
    return NextResponse.json({ ok: true, to, mode, id: data?.id ?? null });
  } catch (err) {
    console.error("[send-payment-link] send failed:", err);
    return NextResponse.json(
      { error: "Could not send the email. Please try again." },
      { status: 500 },
    );
  }
}
