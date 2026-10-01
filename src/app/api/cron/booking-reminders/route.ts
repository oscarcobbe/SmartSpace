import { NextResponse } from "next/server";
import { Resend } from "resend";
import twilio from "twilio";
import { logLead } from "@/lib/leads";
import { sendSiteAlert } from "@/lib/site-alerts";
import { BUSINESS_EMAIL } from "@/lib/business-constants";
import { cronAuthorised } from "@/lib/cron/auth";
import { approval } from "@/lib/signoff/state";
import { reminderConsultation, reminderInstall, reminderSms } from "@/lib/email/customer";
import { dublinDay, formatSlot } from "@/lib/calendly-events";
import { visitsBetween } from "@/lib/booking/upcoming";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Day-before booking reminders: an email and a text the evening before each
 * site visit and each installation. Runs at 17:00 UTC, which is 18:00 Dublin
 * in summer and 17:00 in winter.
 *
 * ── SIGNED OFF, MESSAGE BY MESSAGE ──────────────────────────────
 *
 * Paused on 10 June 2026 at Oscar's request, to be decided with Nigel. The
 * pause was a constant in this file; the switch is now Nigel's sign-off in the
 * CRM, one per message: the site visit email, its text, the installation
 * email and its text. Each goes only while it is approved in the wording it
 * has now (src/lib/signoff), so an edit after approval stops it until it is
 * approved again. With nothing approved the run stops before it touches
 * Calendly, and says why.
 *
 * The words come from src/lib/email/customer.ts, the same functions the
 * studio at /crm/emails shows, so what Nigel approved is what is sent.
 *
 * ── ONCE PER BOOKING ────────────────────────────────────────────
 *
 * Idempotency is unchanged: a "Booking Reminder" row in the leads sheet with
 * the booking as its order id (the Calendly event, or gcal:<ref>:<start> for
 * one on Google Calendar), read back at the start of each run.
 *
 * Tomorrow's visits come from src/lib/booking/upcoming.ts: Calendly's, and
 * Google Calendar's once bookings have moved there.
 */

async function fetchSentEventUris(): Promise<Set<string>> {
  const out = new Set<string>();
  const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();
  const readToken = process.env.GOOGLE_SHEET_READ_TOKEN?.trim();
  if (!sheetUrl || !readToken) {
    console.warn("[cron/booking-reminders] Sheet env vars not set, skipping idempotency check");
    return out;
  }
  try {
    const url = `${sheetUrl}?token=${encodeURIComponent(readToken)}&type=${encodeURIComponent("Booking Reminder")}&limit=500`;
    const res = await fetch(url, { cache: "no-store", redirect: "follow", signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.warn(`[cron/booking-reminders] Sheet read HTTP ${res.status}, proceeding without dedupe`);
      return out;
    }
    const data = await res.json();
    for (const row of data.rows || []) {
      const orderId = String((row as Record<string, string | number>).orderId || "").trim();
      if (orderId) out.add(orderId);
    }
  } catch (err) {
    console.warn("[cron/booking-reminders] Sheet read failed, proceeding without dedupe:", err);
  }
  return out;
}

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [emailVisit, smsVisit, emailInstall, smsInstall] = await Promise.all([
    approval("email:reminder-consultation"),
    approval("sms:reminder-consultation"),
    approval("email:reminder-install"),
    approval("sms:reminder-install"),
  ]);
  const gates = { emailVisit, smsVisit, emailInstall, smsInstall };
  if (!Object.values(gates).some((g) => g.approved)) {
    return NextResponse.json({
      ok: true,
      paused: true,
      message: "No reminder is approved in Sign-off, so nothing was sent.",
      reasons: Object.fromEntries(Object.entries(gates).map(([k, g]) => [k, g.reason])),
    });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  if (!resendKey || !resendFrom) {
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "error",
      summary: "Booking reminders cannot run: Resend is not configured",
      details: "Set RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel. Until then no reminder goes out.",
    });
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const { dateStr, startIso, endIso } = dublinDay(1);
  const { visits: events, problems } = await visitsBetween(startIso, endIso);
  if (problems.length) {
    console.error("[cron/booking-reminders] read problems:", problems);
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "error",
      summary: "Booking reminders could not read all of tomorrow's bookings",
      details: `${problems.join("\n")}\n\nCustomers on the unread calendar won't get a reminder unless one is sent by hand. A revoked CALENDLY_PERSONAL_TOKEN, or a Google Calendar connection that has lost its permission, is the usual cause.`,
    });
    if (!events.length) return NextResponse.json({ error: "Booking read failed", problems }, { status: 502 });
  }
  if (!events.length) return NextResponse.json({ ok: true, date: dateStr, sent: 0, total: 0 });

  const alreadySent = await fetchSentEventUris();
  const resend = new Resend(resendKey);
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
  const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const twilioClient = twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;
  const twilioReady = Boolean(twilioClient && (twilioFromNumber || twilioMessagingServiceSid));

  const tally = { emails: 0, texts: 0, held: 0, skipped: 0, failed: 0 };
  const failures: string[] = [];

  for (const event of events) {
    if (alreadySent.has(event.key)) {
      tally.skipped += 1;
      continue;
    }
    const visit = event.consultation;
    const emailGate = visit ? emailVisit : emailInstall;
    const smsGate = visit ? smsVisit : smsInstall;
    if (!emailGate.approved && !smsGate.approved) {
      tally.held += 1;
      continue;
    }

    if (!event.email) {
      tally.failed += 1;
      failures.push(`${event.key}: no customer email`);
      continue;
    }

    const name = event.name;
    const slot = formatSlot(event.start, event.end);
    const product = event.product || event.title || "installation";
    const notes: string[] = [];

    if (emailGate.approved) {
      const mail = visit ? reminderConsultation({ name, slot }) : reminderInstall({ name, slot, product });
      const res = await resend.emails
        .send({ from: resendFrom, to: [event.email], replyTo: BUSINESS_EMAIL, subject: mail.subject, html: mail.html, text: mail.text })
        .catch((err: unknown) => ({ error: err instanceof Error ? err.message : String(err), data: null }));
      if (res.error) {
        tally.failed += 1;
        failures.push(`${event.key}: email ${JSON.stringify(res.error).slice(0, 160)}`);
        continue;
      }
      tally.emails += 1;
      notes.push("Email sent.");
    }

    if (smsGate.approved) {
      const phone = event.phone || "";
      if (!twilioReady) notes.push("Text skipped: Twilio not configured.");
      else if (!phone) notes.push("Text skipped: no phone number on the booking.");
      else {
        try {
          await twilioClient!.messages.create({
            to: phone,
            body: visit ? reminderSms.consultation({ name, slot }) : reminderSms.install({ name, slot }),
            ...(twilioMessagingServiceSid ? { messagingServiceSid: twilioMessagingServiceSid } : { from: twilioFromNumber }),
          });
          tally.texts += 1;
          notes.push("Text sent.");
        } catch (err) {
          notes.push(`Text failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    await logLead({
      type: "Booking Reminder",
      name: name || undefined,
      email: event.email,
      phone: event.phone || undefined,
      address: event.address,
      product,
      bookingDate: dateStr,
      bookingSlot: slot,
      orderId: event.key,
      source: "cron/booking-reminders",
      notes: `${visit ? "Site visit" : "Installation"} reminder. ${notes.join(" ")}`,
    });
  }

  if (tally.failed > 0) {
    await sendSiteAlert({
      category: "booking-reminders",
      severity: "warning",
      summary: `Booking reminders: ${tally.failed} of ${events.length} failed for ${dateStr}`,
      details: ["Failures:", ...failures.map((f) => `  - ${f}`), "", "Send a reminder by hand to anyone who did not get one."].join("\n"),
    });
  }

  return NextResponse.json({ ok: true, date: dateStr, ...tally, total: events.length });
}
