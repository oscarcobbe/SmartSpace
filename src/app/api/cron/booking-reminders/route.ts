import { NextResponse } from "next/server";
import { Resend } from "resend";
import twilio from "twilio";
import { timingSafeEqual } from "crypto";
import { logLead } from "@/lib/leads";
import { sendSiteAlert } from "@/lib/site-alerts";
import { BUSINESS_PHONE_DISPLAY, BUSINESS_EMAIL, BUSINESS_SITE } from "@/lib/business-constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Day-before booking reminder.
 *
 * Replaces the manual reminder Nigel currently sends every evening. Runs at
 * 17:00 UTC daily — which is 18:00 Dublin in summer and 17:00 Dublin in
 * winter. Either way the email lands the evening before the booking which
 * is the only thing that matters for the customer (the manual flow he runs
 * isn't precisely 18:00 either).
 *
 * Auth: same `CRON_SECRET` Bearer pattern as the other cron routes. Vercel
 * cron invocations inject the secret automatically; anything else gets 401.
 *
 * Flow per run:
 *   1. Compute tomorrow's Dublin date.
 *   2. Query Calendly /scheduled_events for ALL active events whose
 *      start_time is in that window (covers both consultation and
 *      installation event types — we don't need to filter by event_type
 *      URI because we email both kinds, just with different prep copy).
 *   3. For each event, fetch the invitee to get name/email/phone/Q&A.
 *   4. Idempotency: skip if a "Booking Reminder" row with this event URI
 *      already exists in the Sheet. Survives cron re-invocations, manual
 *      re-runs, and Vercel's at-least-once delivery semantic.
 *   5. Send the reminder email via Resend.
 *   6. Log a "Booking Reminder" row on success so the next run will skip
 *      this event.
 *   7. Aggregate { sent, skipped, failed }. If failures > 0 OR the
 *      Calendly token fails wholesale, fire a site alert so Nigel sees
 *      the breakage rather than discovering it from a missed customer
 *      the next morning.
 */

function safeBearerEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c));
}

/**
 * Tomorrow's Dublin date as a YYYY-MM-DD string, plus the ISO start/end of
 * that day in UTC for the Calendly query. Built off `Europe/Dublin` so DST
 * crossings don't shift the window.
 */
function tomorrowDublinWindow(): { dateStr: string; startIso: string; endIso: string } {
  const now = new Date();
  // Build "today in Dublin" by formatting the current instant into Dublin's
  // calendar parts, then increment the day. Avoids `Date.setHours`-style
  // tricks that quietly use the server's local TZ.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parseInt(parts.find((p) => p.type === "year")?.value || "0", 10);
  const m = parseInt(parts.find((p) => p.type === "month")?.value || "0", 10);
  const d = parseInt(parts.find((p) => p.type === "day")?.value || "0", 10);

  // Tomorrow in Dublin's calendar — let JS Date roll the month/year for us
  // by building from UTC and adding a day.
  const tomorrow = new Date(Date.UTC(y, m - 1, d));
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const ty = tomorrow.getUTCFullYear();
  const tm = String(tomorrow.getUTCMonth() + 1).padStart(2, "0");
  const td = String(tomorrow.getUTCDate()).padStart(2, "0");
  const dateStr = `${ty}-${tm}-${td}`;

  // Convert Dublin-midnight + Dublin-23:59:59 to the matching UTC instants.
  // Dublin is UTC+0 in winter, UTC+1 in summer. We derive the offset by
  // formatting a known instant.
  const offsetMin = dublinOffsetMinutesForDate(dateStr);
  // Dublin 00:00 = UTC 00:00 - offsetMin; Dublin 23:59:59 = same + 23:59:59.
  const startUtcMs = Date.UTC(ty, tomorrow.getUTCMonth(), tomorrow.getUTCDate()) - offsetMin * 60 * 1000;
  const endUtcMs = startUtcMs + (24 * 60 - 1) * 60 * 1000 + 59 * 1000;

  return {
    dateStr,
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
  };
}

/** Offset in minutes between Dublin local time and UTC for the given YYYY-MM-DD. */
function dublinOffsetMinutesForDate(dateStr: string): number {
  // Format a noon-UTC instant for the date in Dublin's calendar and read back
  // the hour delta. Noon avoids ambiguity around DST-crossing midnights.
  const sample = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(sample);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "12", 10);
  const min = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  // sample is 12:00 UTC; in Dublin it reads as `h:min`. Offset = local - UTC.
  return (h - 12) * 60 + min;
}

/**
 * Pretty slot label like "10:00 – 12:00" in Dublin time. Uses an en dash (–)
 * not an em dash (—) per the brand voice rules.
 */
function formatSlot(startIso: string, endIso: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
}

interface CalendlyEvent {
  uri: string;
  name?: string;
  start_time: string;
  end_time: string;
}

interface CalendlyInvitee {
  name?: string;
  email?: string;
  text_reminder_number?: string;
  questions_and_answers?: { question: string; answer: string }[];
}

/**
 * Returns the set of Calendly event URIs that already have a Booking
 * Reminder row in the Sheet, so we can skip them. Reads via the same Apps
 * Script doGet path the admin dashboard uses. Failures are non-fatal — we
 * fall back to "no known sends" which preserves the email-once invariant
 * only via best effort. The trade-off: a Sheet read outage one day would
 * cause double-sends on the second run, which is annoying but recoverable.
 * That's strictly better than the alternative (skipping all reminders
 * because the Sheet is unreachable) which would silently break the
 * customer-facing flow.
 */
async function fetchSentEventUris(): Promise<Set<string>> {
  const out = new Set<string>();
  const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();
  const readToken = process.env.GOOGLE_SHEET_READ_TOKEN?.trim();
  if (!sheetUrl || !readToken) {
    console.warn("[cron/booking-reminders] Sheet env vars not set — skipping idempotency check");
    return out;
  }
  try {
    const url = `${sheetUrl}?token=${encodeURIComponent(readToken)}&type=${encodeURIComponent("Booking Reminder")}&limit=500`;
    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`[cron/booking-reminders] Sheet read HTTP ${res.status} — proceeding without dedupe`);
      return out;
    }
    const data = await res.json();
    for (const row of data.rows || []) {
      const r = row as Record<string, string | number>;
      const orderId = String(r.orderId || "").trim();
      if (orderId) out.add(orderId);
    }
  } catch (err) {
    console.warn("[cron/booking-reminders] Sheet read failed — proceeding without dedupe:", err);
  }
  return out;
}

/**
 * Build the HTML email body. Mirrors the SCL launch email's table-based
 * 600px structure for inbox compatibility (Outlook, Gmail, Apple Mail).
 * No em dashes anywhere. No "flat price" claims.
 */
function buildEmailHtml(opts: {
  firstName: string;
  slot: string;
  productLine: string;
  isConsultation: boolean;
}): string {
  const { firstName, slot, productLine, isConsultation } = opts;

  const prepBlock = isConsultation
    ? `
      <tr><td class="px" style="padding:18px 32px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fef4eb;border:1px solid #f4d4a8;border-radius:6px;">
          <tr><td style="padding:18px 20px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;color:#3f3d3a;font-size:14px;line-height:1.6;">
            We'll walk the property with you, point out where Wi-Fi might struggle, and give you a written quote the same day. No prep needed, just be home for the slot.
          </td></tr>
        </table>
      </td></tr>`
    : `
      <tr><td class="px" style="padding:18px 32px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fef4eb;border:1px solid #f4d4a8;border-radius:6px;">
          <tr><td style="padding:18px 20px 4px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
            <div style="font-size:11px;font-weight:800;color:#d96d15;letter-spacing:1.2px;text-transform:uppercase;">A couple of things before we arrive</div>
          </td></tr>
          <tr><td style="padding:6px 20px 18px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;color:#3f3d3a;font-size:14px;line-height:1.55;">
            <ul style="margin:0;padding-left:20px;">
              <li style="margin-bottom:10px;"><strong style="color:#1C1A18;">Wi-Fi reaches the front door or install location.</strong> If the signal is weak there, get the router moved closer or plug in an extender before tomorrow morning.</li>
              <li style="margin-bottom:10px;"><strong style="color:#1C1A18;">App installed on the phone you want to use.</strong> Ring, Eufy, Nest or Tapo, whichever brand you bought. We'll log in together on the day.</li>
              <li style="margin-bottom:10px;"><strong style="color:#1C1A18;">Passwords known.</strong> Wi-Fi password, and the app account password. We can't recover these for you.</li>
              <li><strong style="color:#1C1A18;">Someone home at the slot.</strong> Even if it's a quick install, we need access to the door.</li>
            </ul>
          </td></tr>
        </table>
      </td></tr>`;

  // Sentence order matters: keep "tomorrow at ${slot}" together, then the
  // purpose clause. Previous formula left "your" dangling without a noun
  // for installs ("...to fit your tomorrow at 10:00 - 12:00 Ring Video
  // Doorbell Pro"), which read awkwardly. Now: `we're calling out tomorrow
  // at ${slot} to fit your ${productLine}`.
  const introSentence = isConsultation
    ? `Just a quick note to confirm we're calling out for your free site visit tomorrow at ${escapeHtml(slot)}.`
    : `Just a quick note to confirm we're calling out tomorrow at ${escapeHtml(slot)} to fit your ${escapeHtml(productLine)}.`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en-IE">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light only">
<title>Tomorrow's booking with Smart Space</title>
<style type="text/css">
  body, table, td, div, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { border-collapse:collapse !important; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  body { margin:0 !important; padding:0 !important; width:100% !important; background:#f1efea; }
  a { color:#d96d15; text-decoration:underline; }
  @media only screen and (max-width:620px) {
    .container { width:100% !important; }
    .px { padding-left:24px !important; padding-right:24px !important; }
    .h1 { font-size:24px !important; line-height:1.2 !important; }
    .stack-col { display:block !important; width:100% !important; padding:0 !important; }
    .footer-right { text-align:left !important; padding-left:0 !important; padding-top:14px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f1efea;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
<div style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#f1efea;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Tomorrow at ${escapeHtml(slot)}. A few things to have ready.</div>

<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f1efea;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="container" style="width:600px;max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">

      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid #e6e3df;" align="left">
        <img src="https://smart-space.ie/Logo1.png" width="120" height="auto" alt="Smart Space" style="display:block;height:auto;max-width:120px;">
      </td></tr>

      <tr><td class="px" style="padding:28px 32px 8px;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#d96d15;">Tomorrow's booking</div>
        <h1 class="h1" style="margin:10px 0 0;font-size:26px;line-height:1.18;letter-spacing:-0.4px;color:#1C1A18;font-weight:800;">Looking forward to seeing you, ${escapeHtml(firstName)}.</h1>
      </td></tr>

      <tr><td class="px" style="padding:16px 32px 4px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3d3a;">${introSentence}</p>
      </td></tr>

      ${prepBlock}

      <tr><td class="px" style="padding:22px 32px 8px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3d3a;">Anything funny on the day, give us a ring on <a href="tel:+35315130424" style="color:#d96d15;font-weight:700;text-decoration:none;">${BUSINESS_PHONE_DISPLAY}</a> and we'll sort it.</p>
      </td></tr>

      <tr><td class="px" style="padding:20px 32px 32px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3d3a;">Talk soon,<br><strong style="color:#1C1A18;">Nigel, Smart Space</strong></p>
      </td></tr>

      <tr><td class="px" style="padding:28px 32px;background:#1C1A18;color:#cccccc;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td valign="top" class="stack-col" style="padding-right:16px;">
              <div style="font-weight:800;color:#ffffff;font-size:14px;letter-spacing:0.4px;margin-bottom:8px;">Smart Space</div>
              <div>Dublin's #1 Ring installer.</div>
              <div>Brand-agnostic. No contract.</div>
            </td>
            <td valign="top" class="stack-col footer-right" style="padding-left:16px;text-align:right;">
              <div><a href="tel:+35315130424" style="color:#ffffff;text-decoration:none;font-weight:700;">${BUSINESS_PHONE_DISPLAY}</a></div>
              <div><a href="mailto:${BUSINESS_EMAIL}" style="color:#ffffff;text-decoration:none;">${BUSINESS_EMAIL}</a></div>
              <div><a href="${BUSINESS_SITE}" style="color:#ffffff;text-decoration:none;">${BUSINESS_SITE.replace(/^https?:\/\//, "")}</a></div>
            </td>
          </tr>
        </table>
        <div style="border-top:1px solid #2e2c2a;margin-top:18px;padding-top:14px;font-size:11px;color:#888;line-height:1.55;">
          This is a one-off reminder for your booking with Smart Space. No unsubscribe needed, we only message you about your own appointment.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Build the SMS body. Single-segment GSM-7 target (160 chars) is the ideal,
 * but we accept up to ~2 segments (320 chars) before Twilio splits and bills
 * twice. Matches Nigel's manual SMS phrasing as closely as we can fit.
 *
 * Install vs consultation gets different prep cues — installs need the
 * Wi-Fi + app + passwords reminder; consultations are just "be home".
 */
function buildSmsText(opts: { firstName: string; slot: string; isConsultation: boolean }): string {
  const { firstName, slot, isConsultation } = opts;
  if (isConsultation) {
    return `Hi ${firstName}, Nigel @ Smart Space. See you tomorrow at ${slot} for your site visit. Just be home, we'll walk the property and quote on the day. ${BUSINESS_PHONE_DISPLAY} if anything.`;
  }
  return `Hi ${firstName}, Nigel @ Smart Space. See you tomorrow at ${slot}. Have ready: Wi-Fi to the install area, your app installed, passwords known. ${BUSINESS_PHONE_DISPLAY} if anything.`;
}

function buildEmailText(opts: { firstName: string; slot: string; productLine: string; isConsultation: boolean }): string {
  const { firstName, slot, productLine, isConsultation } = opts;
  if (isConsultation) {
    return [
      `Hi ${firstName},`,
      "",
      `Looking forward to seeing you tomorrow at ${slot} for your free site visit.`,
      "",
      "We'll walk the property, point out where Wi-Fi might struggle, and give you a written quote the same day. No prep needed, just be home for the slot.",
      "",
      `Anything funny on the day, give us a ring on ${BUSINESS_PHONE_DISPLAY}.`,
      "",
      "Talk soon,",
      "Nigel, Smart Space",
      BUSINESS_PHONE_DISPLAY,
    ].join("\n");
  }
  return [
    `Hi ${firstName},`,
    "",
    `Looking forward to your booking tomorrow at ${slot}. We're calling out to fit your ${productLine}.`,
    "",
    "A couple of things before we arrive:",
    "  - Wi-Fi reaches the front door or install location. If the signal is weak there, get the router moved closer or plug in an extender before tomorrow morning.",
    "  - App installed on the phone you want to use. Ring, Eufy, Nest or Tapo, whichever brand you bought. We'll log in together on the day.",
    "  - Passwords known. Wi-Fi password, and the app account password. We can't recover these for you.",
    "  - Someone home at the slot. Even if it's a quick install, we need access to the door.",
    "",
    `Anything funny on the day, give us a ring on ${BUSINESS_PHONE_DISPLAY}.`,
    "",
    "Talk soon,",
    "Nigel, Smart Space",
    BUSINESS_PHONE_DISPLAY,
  ].join("\n");
}

/** Pull a likely address out of Calendly Q&A payload, mirroring admin/leads.ts. */
function extractAddress(qas: { question: string; answer: string }[] | undefined): string | undefined {
  if (!qas) return undefined;
  for (const qa of qas) {
    if (/address|eircode|location/i.test(qa.question) && qa.answer) {
      return qa.answer.replace(/^Address:\s*/i, "").trim();
    }
    const m = qa.answer?.match(/Address:\s*([^|]+)/i);
    if (m) return m[1].trim();
  }
  return undefined;
}

/** Pull a likely phone out of Calendly Q&A, mirroring admin/leads.ts. */
function extractPhone(qas: { question: string; answer: string }[] | undefined): string | undefined {
  if (!qas) return undefined;
  const joined = qas.map((q) => q.answer).join(" ");
  const m = joined.match(/Phone:\s*([^|]+)/i);
  return m?.[1]?.trim() || undefined;
}

export async function GET(request: Request) {
  // Same Bearer-secret auth as every other cron route. Vercel cron injects
  // it automatically; anything else gets 401.
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || !safeBearerEqual(auth, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const calendlyToken = process.env.CALENDLY_PERSONAL_TOKEN;
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  if (!calendlyToken) {
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "error",
      summary: "Booking reminders cron cannot run — CALENDLY_PERSONAL_TOKEN missing",
      details: "Set CALENDLY_PERSONAL_TOKEN in Vercel env vars and redeploy. Until then, day-before reminders won't go out.",
    });
    return NextResponse.json({ error: "Calendly not configured" }, { status: 500 });
  }
  if (!resendKey || !resendFrom) {
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "error",
      summary: "Booking reminders cron cannot run — Resend not configured",
      details: "Set RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel env vars.",
    });
    return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  }

  const { dateStr, startIso, endIso } = tomorrowDublinWindow();

  // Resolve our Calendly user URI — mirrors the pattern in recover-bookings,
  // which means we don't have to hard-code the UUID and rotation works.
  let userUri: string;
  try {
    const meRes = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${calendlyToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!meRes.ok) {
      const body = await meRes.text().catch(() => "");
      throw new Error(`Calendly /users/me ${meRes.status}: ${body.slice(0, 200)}`);
    }
    const me = await meRes.json();
    userUri = me.resource.uri;
  } catch (err) {
    console.error("[cron/booking-reminders] /users/me failed:", err);
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "error",
      summary: "Booking reminders cron failed at Calendly /users/me",
      details: `${err instanceof Error ? err.message : String(err)}\n\nMost likely cause: CALENDLY_PERSONAL_TOKEN revoked or expired. Reissue at https://calendly.com/integrations/api_webhooks and update the Vercel env var.`,
    });
    return NextResponse.json({ error: "Calendly auth failed" }, { status: 502 });
  }

  // Fetch tomorrow's events for both event types in a single query — Calendly
  // returns all active events for the user in the time window regardless of
  // event_type, which is what we want.
  let events: CalendlyEvent[];
  try {
    const eventsRes = await fetch(
      `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${startIso}&max_start_time=${endIso}&status=active&sort=start_time:asc&count=100`,
      {
        headers: { Authorization: `Bearer ${calendlyToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!eventsRes.ok) {
      const body = await eventsRes.text().catch(() => "");
      throw new Error(`Calendly scheduled_events ${eventsRes.status}: ${body.slice(0, 200)}`);
    }
    const data = await eventsRes.json();
    events = (data.collection || []) as CalendlyEvent[];
  } catch (err) {
    console.error("[cron/booking-reminders] scheduled_events failed:", err);
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "error",
      summary: "Booking reminders cron failed fetching tomorrow's events",
      details: `${err instanceof Error ? err.message : String(err)}\n\nTomorrow's customers won't get a reminder unless you re-run manually or send by hand.`,
    });
    return NextResponse.json({ error: "Calendly fetch failed" }, { status: 502 });
  }

  // Nothing on tomorrow — silent success.
  if (events.length === 0) {
    return NextResponse.json({ ok: true, date: dateStr, sent: 0, skipped: 0, failed: 0, total: 0 });
  }

  const alreadySent = await fetchSentEventUris();

  const resend = new Resend(resendKey);

  // Twilio is optional: if creds are missing we still send emails (no SMS).
  // This lets the cron go live BEFORE Twilio env vars are added in Vercel,
  // and keeps the route from breaking if Twilio is ever rotated out.
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  // Either a direct From number (E.164) or a Messaging Service SID (MGxxxx).
  // We support either — twilio-node accepts both via the same `from` field
  // when passing a number, or `messagingServiceSid` when passing the MG SID.
  const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
  const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const twilioClient = twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;
  const twilioReady = twilioClient && (twilioFromNumber || twilioMessagingServiceSid);
  if (!twilioReady) {
    console.warn(
      "[cron/booking-reminders] Twilio not configured — SMS will be skipped. " +
        "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and one of TWILIO_PHONE_NUMBER " +
        "or TWILIO_MESSAGING_SERVICE_SID to enable.",
    );
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let smsSent = 0;
  let smsSkipped = 0;
  let smsFailed = 0;
  const failures: { event: string; reason: string }[] = [];
  const smsFailures: { event: string; phone: string; reason: string }[] = [];

  for (const event of events) {
    if (alreadySent.has(event.uri)) {
      skipped++;
      continue;
    }

    // Fetch invitee for this event. One missing invitee shouldn't kill the
    // whole run — just count it as a failure and keep going so the rest
    // still go out.
    let invitee: CalendlyInvitee | undefined;
    try {
      const invRes = await fetch(`${event.uri}/invitees`, {
        headers: { Authorization: `Bearer ${calendlyToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!invRes.ok) {
        throw new Error(`HTTP ${invRes.status}`);
      }
      const invData = await invRes.json();
      invitee = (invData.collection || [])[0];
    } catch (err) {
      console.warn(`[cron/booking-reminders] invitee fetch failed for ${event.uri}:`, err);
      failed++;
      failures.push({ event: event.uri, reason: `invitee fetch: ${err instanceof Error ? err.message : String(err)}` });
      continue;
    }

    if (!invitee?.email) {
      console.warn(`[cron/booking-reminders] no invitee email for ${event.uri}`);
      failed++;
      failures.push({ event: event.uri, reason: "no invitee email" });
      continue;
    }

    const fullName = (invitee.name || "").trim();
    const firstName = fullName.split(/\s+/)[0] || "there";
    const slot = formatSlot(event.start_time, event.end_time);
    const eventName = (event.name || "").trim();
    const isConsultation = /consultation/i.test(eventName);
    const productLine = eventName || (isConsultation ? "consultation" : "install");
    const subject = isConsultation
      ? `Tomorrow's visit with Smart Space, ${slot}`
      : `Tomorrow's install with Smart Space, ${slot}`;

    const html = buildEmailHtml({ firstName, slot, productLine, isConsultation });
    const text = buildEmailText({ firstName, slot, productLine, isConsultation });

    try {
      await resend.emails.send({
        from: resendFrom,
        to: [invitee.email],
        replyTo: BUSINESS_EMAIL,
        subject,
        html,
        text,
      });
    } catch (err) {
      console.error(`[cron/booking-reminders] Resend send failed for ${invitee.email}:`, err);
      failed++;
      failures.push({ event: event.uri, reason: `resend: ${err instanceof Error ? err.message : String(err)}` });
      continue;
    }

    // SMS send is best-effort. The email has already landed at this point so
    // the customer has the reminder even if Twilio fails or the phone number
    // is missing / a landline. We track outcomes separately so the alerting
    // can distinguish "email pipeline broke" (loud, paging) from "this one
    // SMS didn't send" (quiet, logged).
    const customerPhone =
      invitee.text_reminder_number ||
      extractPhone(invitee.questions_and_answers) ||
      "";
    let smsStatus: "sent" | "skipped" | "failed" = "skipped";
    let smsReason = "";
    if (!twilioReady) {
      smsSkipped++;
      smsReason = "twilio not configured";
    } else if (!customerPhone) {
      smsSkipped++;
      smsReason = "no invitee phone number on Calendly event";
    } else {
      try {
        await twilioClient!.messages.create({
          to: customerPhone,
          body: buildSmsText({ firstName, slot, isConsultation }),
          ...(twilioMessagingServiceSid
            ? { messagingServiceSid: twilioMessagingServiceSid }
            : { from: twilioFromNumber }),
        });
        smsSent++;
        smsStatus = "sent";
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        console.warn(`[cron/booking-reminders] Twilio send failed for ${customerPhone}:`, reason);
        smsFailed++;
        smsStatus = "failed";
        smsReason = `twilio: ${reason}`;
        smsFailures.push({ event: event.uri, phone: customerPhone, reason });
      }
    }

    // Log the send to the Sheet so the next run skips this event. We do this
    // AFTER a successful EMAIL send (SMS state recorded in notes) so a Sheet
    // write that fails doesn't block the email (the customer still gets the
    // reminder; worst case the next run re-sends, which is annoying but
    // recoverable). logLead swallows its own errors and alerts Nigel via
    // Resend if the write fails.
    const smsNote =
      smsStatus === "sent"
        ? "SMS sent."
        : smsStatus === "skipped"
          ? `SMS skipped (${smsReason}).`
          : `SMS failed (${smsReason}).`;
    await logLead({
      type: "Booking Reminder",
      name: fullName || undefined,
      email: invitee.email,
      phone: customerPhone || undefined,
      address: extractAddress(invitee.questions_and_answers) || undefined,
      product: eventName || undefined,
      bookingDate: dateStr,
      bookingSlot: slot,
      orderId: event.uri, // idempotency key on next run
      source: "cron/booking-reminders",
      notes: `Sent ${isConsultation ? "consultation" : "installation"} reminder for ${firstName}. ${smsNote}`,
    });

    sent++;
  }

  // If anything failed, fire an aggregated alert so Nigel can fall back to
  // the manual reminder for the affected customers tonight.
  if (failed > 0) {
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "warning",
      summary: `Booking reminders: ${failed} of ${events.length} failed for ${dateStr}`,
      details: [
        `Sent:    ${sent}`,
        `Skipped: ${skipped} (already reminded earlier today)`,
        `Failed:  ${failed}`,
        "",
        "Failures:",
        ...failures.map((f) => `  - ${f.event}: ${f.reason}`),
        "",
        "Action: open the admin dashboard, find tomorrow's bookings, and send a manual reminder to anyone who didn't get one.",
      ].join("\n"),
    });
  }

  // If a chunk of SMS sends failed, log an aggregated warning. We don't
  // page Nigel for a small number of bad/landline numbers (those will fail
  // forever), but a wholesale Twilio outage should be visible.
  if (smsFailed >= 3) {
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "warning",
      summary: `Booking reminder SMS: ${smsFailed} of ${events.length} failed for ${dateStr}`,
      details: [
        `Email pipeline OK (${sent} sent).`,
        `SMS: ${smsSent} sent, ${smsSkipped} skipped, ${smsFailed} failed.`,
        "",
        "SMS failures:",
        ...smsFailures.map((f) => `  - ${f.phone} (${f.event}): ${f.reason}`),
        "",
        "If most of these are 'not a mobile number' style errors, no action needed.",
        "If it looks like a Twilio outage (auth, balance, sub-account suspended), check the Twilio console.",
      ].join("\n"),
    });
  }

  return NextResponse.json({
    ok: true,
    date: dateStr,
    sent,
    skipped,
    failed,
    sms: { sent: smsSent, skipped: smsSkipped, failed: smsFailed },
    total: events.length,
  });
}
