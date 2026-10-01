/**
 * The emails around a Smart Space booking that Calendly used to send: to the
 * customer (confirmed, moved, cancelled, each with its calendar file) and to
 * Nigel (Calendly's "New Event" and "Canceled" notes).
 *
 * The customer ones pass Nigel's sign-off like every new customer message.
 * The switch off Calendly waits for those approvals (see the cut-over in
 * src/lib/booking/backend.ts), so if one is somehow missing at send time it is
 * not sent and Nigel and FourWinds are told who to contact by hand.
 *
 * SmartCare Living sends its own, branded, from its own site.
 */
import { Resend } from "resend";
import { approval } from "@/lib/signoff/state";
import { alertTo, monitorBcc } from "@/lib/business-constants";
import { sendSiteAlert } from "@/lib/site-alerts";
import { bookingCancelled, bookingConfirmed, bookingMoved, type BookingFacts } from "@/lib/email/booking";
import { bookingIcs } from "./ics";
import { manageUrl, type Booking } from "./engine";

function mailer(): { resend: Resend; from: string } | null {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return key && from ? { resend: new Resend(key), from } : null;
}

export function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function timeLabel(startIso: string, endIso: string): string {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${f.format(new Date(startIso))} to ${f.format(new Date(endIso))}`;
}

function facts(b: Booking): BookingFacts {
  return {
    name: b.name,
    title: b.title,
    dateLabel: dateLabel(b.start),
    time: timeLabel(b.start, b.end),
    address: b.address,
    rescheduleUrl: manageUrl(b, "reschedule"),
    cancelUrl: manageUrl(b, "cancel"),
  };
}

function ics(b: Booking, opts: { sequence?: number; cancelled?: boolean } = {}) {
  const content = bookingIcs({
    ref: b.ref,
    domain: "smart-space.ie",
    title: b.title,
    start: b.start,
    end: b.end,
    location: b.address ? `Your home, ${b.address}` : "Your home",
    description: opts.cancelled ? "Cancelled." : `Smart Space. To move or cancel: ${manageUrl(b)}`,
    organizerName: "Smart Space",
    organizerEmail: "info@smart-space.ie",
    ...opts,
  });
  return [{ filename: "invite.ics", content: Buffer.from(content).toString("base64"), contentType: "text/calendar; charset=utf-8" }];
}

type Gate = Awaited<ReturnType<typeof approval>>;

async function toCustomer(ok: Gate, b: Booking, mail: { subject: string; html: string; text: string }, attachments: ReturnType<typeof ics>): Promise<string> {
  const gate = ok.item;
  if (!ok.approved) {
    await sendSiteAlert({
      category: "booking-email",
      severity: "error",
      summary: `${b.name} was not emailed about their booking: ${gate} is not approved in Sign-off`,
      details: `${b.title}, ${dateLabel(b.start)} ${timeLabel(b.start, b.end)}. ${b.email}${b.phone ? `, ${b.phone}` : ""}.\n\n${ok.reason}\n\nContact them by hand.`,
      dedupeKey: `booking-email:${gate}:${b.ref}`,
    });
    return `not sent, not signed off: ${ok.reason}`;
  }
  const m = mailer();
  if (!m) return "not sent: email is not configured";
  const res = await m.resend.emails.send({ from: m.from, to: [b.email], replyTo: alertTo(), subject: mail.subject, html: mail.html, text: mail.text, attachments });
  return res.error ? `refused: ${JSON.stringify(res.error).slice(0, 200)}` : "sent";
}

/** Calendly's note to Nigel. Plain, for his inbox, with everything he needs to ring the customer. */
async function toNigel(subject: string, lines: string[]): Promise<void> {
  const m = mailer();
  if (!m) return;
  const res = await m.resend.emails.send({ from: m.from, to: [alertTo()], bcc: monitorBcc(), subject, text: lines.join("\n") });
  if (res.error) console.error("[booking/notify] Nigel's note refused:", res.error);
}

const who = (b: Booking) => [
  `Customer: ${b.name}`,
  `Email: ${b.email}`,
  b.phone ? `Phone: ${b.phone}` : "",
  b.address ? `Address: ${b.address}` : "",
  b.product ? `Product: ${b.product}` : "",
  b.orderId ? `Order: ${b.orderId}` : "",
].filter(Boolean);

const when = (b: Booking) => `${dateLabel(b.start)}, ${timeLabel(b.start, b.end)}`;

export async function bookingConfirmedEmails(b: Booking): Promise<string> {
  if (b.site !== "ss") return "skipped: SmartCare Living sends its own";
  const [outcome] = await Promise.all([
    approval("email:booking-confirmed").then((ok) => toCustomer(ok, b, bookingConfirmed(facts(b)), ics(b))),
    toNigel(`New booking: ${b.title}, ${when(b)}`, [`${b.title}`, when(b), "", ...who(b), "", "It's in your Google Calendar."]),
  ]);
  return outcome;
}

export async function bookingMovedEmails(from: Booking, b: Booking): Promise<string> {
  if (b.site !== "ss") return "skipped: SmartCare Living sends its own";
  const fromLabel = `${dateLabel(from.start)}, ${timeLabel(from.start, from.end).split(" ")[0]}`;
  const [outcome] = await Promise.all([
    approval("email:booking-moved").then((ok) => toCustomer(ok, b, bookingMoved({ ...facts(b), fromLabel }), ics(b, { sequence: Math.floor(Date.now() / 1000) }))),
    toNigel(`Booking moved: ${b.name}, now ${when(b)}`, [`${b.title}`, `Was: ${when(from)}`, `Now: ${when(b)}`, "", ...who(b), "", "The customer moved it from their confirmation email. Your Google Calendar is updated."]),
  ]);
  return outcome;
}

export async function bookingCancelledEmails(b: Booking): Promise<string> {
  if (b.site !== "ss") return "skipped: SmartCare Living sends its own";
  const mail = bookingCancelled({ ...facts(b), bookAgainUrl: b.kind === "consultation" ? "https://smart-space.ie/services/free-consultation" : "https://smart-space.ie/services" });
  const [outcome] = await Promise.all([
    approval("email:booking-cancelled").then((ok) => toCustomer(ok, b, mail, ics(b, { sequence: Math.floor(Date.now() / 1000), cancelled: true }))),
    toNigel(`Cancelled: ${b.title}, ${when(b)}`, [`${b.title}`, when(b), "", ...who(b), "", "The customer cancelled from their confirmation email. It's gone from your Google Calendar.", b.orderId ? "This was a paid order: refund it in Stripe if that's owed." : ""].filter((l, i, a) => l || a[i - 1] !== "")),
  ]);
  return outcome;
}
