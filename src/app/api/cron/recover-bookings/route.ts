import { NextResponse } from "next/server";
import { Resend } from "resend";
import { timingSafeEqual } from "crypto";
import { alertTo, monitorBcc } from "@/lib/business-constants";
import { fetchMarks } from "@/lib/crm/order-marks";
import { visitsBetween } from "@/lib/booking/upcoming";
import { googleCalendarConfigured } from "@/lib/booking/google-calendar";

export const dynamic = "force-dynamic";

function safeBearerEqual(actual: string, expected: string): boolean {
  // timingSafeEqual requires same length; pad/truncate both before
  // comparison so we don't leak the secret length via timing.
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
 * Daily safety net, diagnoses paid Stripe orders that are missing a
 * matching booking (Calendly or Google Calendar) and emails Nigel when there's something to act
 * on. Read-only by design: the cron does NOT auto-book, so a stale Stripe
 * webhook can't accidentally create double-bookings without human review.
 *
 * Runs via Vercel cron (configured in /vercel.json). Vercel injects a
 * special Authorization header `Bearer <CRON_SECRET>` on every cron-driven
 * request, we reject anything else so this endpoint can't be hit by
 * randoms scraping the site.
 *
 * Mirror of the manual /scripts/recover-bookings.mjs diagnostic mode.
 */

interface MissedOrder {
  /** What became of the booking, from Calendly's history, when it was made and then cancelled. */
  history: string | null;
  /** Cancelled within the last fortnight: still worth a nudge even if the original date is past. */
  recentCancel: boolean;
  sessionId: string;
  name: string;
  email: string;
  product: string;
  amount: string;
  bookingLabel: string;
  bookingSlot: string;
  isPast: boolean;
}

async function fetchPaidStripeOrders(stripeKey: string) {
  const r = await fetch(
    "https://api.stripe.com/v1/checkout/sessions?limit=100&status=complete&expand[]=data.custom_fields",
    {
      headers: { Authorization: `Bearer ${stripeKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.data ?? [];
}

/**
 * Every customer email with a live booking from 90 days back to 180 ahead,
 * which covers the recover-bookings window: Calendly's, and Google
 * Calendar's once bookings have moved there (src/lib/booking/upcoming.ts).
 * Throws when either could not be read, since a source read as empty would
 * report every one of its paid orders as missing.
 */
async function fetchBookedEmails(): Promise<Set<string>> {
  const past = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
  const { visits, problems } = await visitsBetween(past, future);
  if (problems.length) throw new Error(problems.join("; "));
  return new Set(visits.map((v) => (v.email || "").toLowerCase()).filter(Boolean));
}

/**
 * What happened to a customer's booking, when there is no live one.
 *
 * On 13 October 2026 the audit told Nigel, every morning, that Ciaran Smith's
 * paid installation on Wed 14 Oct was "missing a calendar booking". It was not
 * missing: Ciaran had rescheduled it himself on 9 October, and Nigel had then
 * cancelled the new time. The audit only asked whether a live booking existed,
 * read the date from the Stripe order, and so reported a visit that had been
 * moved and cancelled as one the system had failed to book, which made the
 * calendar sync look broken when it was working. This reads the customer's
 * most recent cancelled Calendly event and says who cancelled it and when.
 */
async function calendlyHistory(email: string, token: string, userUri: string): Promise<{ text: string; cancelledAt: number } | null> {
  try {
    const url = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&invitee_email=${encodeURIComponent(email)}&status=canceled&sort=start_time:desc&count=5`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const events = ((await r.json()).collection ?? []) as Array<{ start_time: string; cancellation?: { canceled_by?: string; canceler_type?: string; created_at?: string } }>;
    const latest = events
      .filter((e) => e.cancellation?.created_at)
      .sort((a, b) => Date.parse(b.cancellation!.created_at!) - Date.parse(a.cancellation!.created_at!))[0];
    if (!latest) return null;
    const fmt = (iso: string, withTime: boolean) =>
      new Date(iso).toLocaleString("en-IE", { timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "short", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
    const who = latest.cancellation!.canceler_type === "host" ? "you" : "the customer";
    return {
      text: `Visit for ${fmt(latest.start_time, true)} was cancelled by ${who} on ${fmt(latest.cancellation!.created_at!, false)}. No other visit is booked.`,
      cancelledAt: Date.parse(latest.cancellation!.created_at!),
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  // Vercel cron auth, reject anything else. Timing-safe to prevent the
  // secret being recovered byte-by-byte via response-time differences.
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || !safeBearerEqual(auth, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || (!process.env.CALENDLY_PERSONAL_TOKEN && !googleCalendarConfigured())) {
    return NextResponse.json({ error: "Stripe, or both Calendly and Google Calendar, not configured" }, { status: 500 });
  }

  let stripeOrders: Array<Record<string, unknown>>;
  let calendlyEmails: Set<string>;
  try {
    [stripeOrders, calendlyEmails] = await Promise.all([
      fetchPaidStripeOrders(stripeKey),
      fetchBookedEmails(),
    ]);
  } catch (err) {
    console.error("[cron/recover-bookings] fetch failed:", err);
    return NextResponse.json({ error: "Source fetch failed", detail: String(err) }, { status: 502 });
  }

  const missed: MissedOrder[] = [];
  for (const session of stripeOrders) {
    const cd = (session.customer_details ?? {}) as Record<string, unknown>;
    const md = (session.metadata ?? {}) as Record<string, unknown>;
    const email = String(cd.email ?? session.customer_email ?? "").toLowerCase();
    const name = String(cd.name ?? email.split("@")[0] ?? "-");
    const product = String(md.product_name ?? "Order");
    const bookingDate = String(md.booking_date ?? "");
    const bookingSlot = String(md.booking_slot ?? "");
    const bookingLabel = String(md.booking_label ?? "");
    const amountTotal = (session.amount_total as number) ?? 0;
    const amount = (amountTotal / 100).toFixed(2);
    // Test-row filter. Tightened from `/smart-space|smartspace|test/i`
    // (which incorrectly matched real customers like
    // `firstname@smartspace-design.com`) to: literal Smart Space staff
    // mailbox emails, OR an explicit `+test` plus addressing tag, OR
    // the Stripe test-orders sent by the team. Real customer emails
    // are never excluded.
    const isStaffEmail =
      /@smart-space\.ie$/i.test(email) ||
      /\+test\d*@/i.test(email) ||
      /^oscarcobbe2017\+/i.test(email);
    const isTestOrder = parseFloat(amount) < 5 || isStaffEmail;

    if (isTestOrder) continue;
    if (!bookingDate || !bookingSlot) continue; // some products legitimately have no install date

    const hasCalendly = calendlyEmails.has(email);
    if (hasCalendly) continue;

    const slotEndHour = parseInt(bookingSlot.split("-")[1]?.split(":")[0] ?? "0", 10);
    const isPast = new Date(`${bookingDate}T${String(slotEndHour).padStart(2, "0")}:00:00`).getTime() < Date.now();
    missed.push({
      history: null,
      recentCancel: false,
      sessionId: String(session.id),
      name,
      email,
      product,
      amount,
      bookingLabel,
      bookingSlot,
      isPast,
    });
  }

  /* An order Nigel has marked Done or Cancelled in the CRM (Orders) is settled:
     the job happened, or the customer was dealt with by phone. Left in, the
     same months-old orders were listed every morning (15 Oct 2026). A failed
     read keeps everything in, rather than hiding an order that needs a visit. */
  const marks = await fetchMarks("smart-space");
  if (marks.problem) console.error("[cron/recover-bookings]", marks.problem);
  for (let i = missed.length - 1; i >= 0; i--) if (marks.has(missed[i].sessionId)) missed.splice(i, 1);

  /* Each order without a live booking: was it ever booked, and if so what
     happened to it. Without Calendly configured, nothing is added. */
  const calendlyToken = process.env.CALENDLY_PERSONAL_TOKEN;
  if (calendlyToken && missed.length) {
    try {
      const me = await fetch("https://api.calendly.com/users/me", { headers: { Authorization: `Bearer ${calendlyToken}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
      const userUri = me.ok ? String((await me.json()).resource?.uri ?? "") : "";
      if (userUri) {
        const fortnight = Date.now() - 14 * 24 * 60 * 60 * 1000;
        await Promise.all(missed.map(async (m) => {
          const h = await calendlyHistory(m.email, calendlyToken, userUri);
          if (h) { m.history = h.text; m.recentCancel = h.cancelledAt > fortnight; }
        }));
      }
    } catch (err) {
      console.error("[cron/recover-bookings] Calendly history lookup failed:", err);
    }
  }

  // Nothing to flag → silent success
  if (missed.length === 0) {
    return NextResponse.json({ ok: true, missed: 0, checked: stripeOrders.length });
  }

  // Only email when there's something genuinely actionable. Past missed
  // bookings are a one-time phone call, not a recurring problem, emailing
  // about them every day would train Nigel to ignore the alert.
  /* Worth an email: a future visit that was never booked, or a booking
     cancelled in the last fortnight with nothing booked in its place (the
     customer has paid and has no visit). A cancelled booking's original date
     says nothing about when the visit is, so it is not counted as "future". */
  const futureRecoverable = missed.filter((m) => (!m.isPast && !m.history) || m.recentCancel);
  if (futureRecoverable.length === 0) {
    return NextResponse.json({
      ok: true,
      missed: missed.length,
      futureRecoverable: 0,
      past: missed.filter((m) => m.isPast).length,
      cancelledEarlier: missed.filter((m) => m.history).length,
      marked: marks.size,
      marksProblem: marks.problem ?? null,
      checked: stripeOrders.length,
      emailed: false,
      note: "All missed bookings are past, phone call only, no email sent",
    });
  }

  // Send Nigel an alert email
  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  const to = alertTo();
  if (resendKey && resendFrom) {
    /* The email lists what needs doing now; the older ones are one line, not
       twenty rows every morning that train Nigel to stop reading it. */
    const older = missed.filter((m) => !futureRecoverable.includes(m));
    const futureCount = futureRecoverable.filter((m) => !m.isPast && !m.history).length;
    const cancelledCount = futureRecoverable.filter((m) => m.history).length;
    const olderLine = older.length
      ? `${older.length} older paid order${older.length === 1 ? "" : "s"} without a booked visit ${older.length === 1 ? "is" : "are"} left out of this email. Mark each Done or Cancelled in the CRM's Orders and ${older.length === 1 ? "it stops" : "they stop"} being counted.`
      : "";
    const statusOf = (m: MissedOrder) => (m.history ? "❌ cancelled, nothing rebooked" : m.isPast ? "⚠️ PAST" : "🔧 future");
    // Escape every Stripe-supplied field. Stripe sanitizes their own
    // fields but we don't trust upstream data into our HTML, a custom
    // product_name with `<script>` would otherwise inject into Nigel's
    // inbox.
    const rows = futureRecoverable
      .map(
        (m) =>
          `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.email)}</td><td>${escapeHtml(m.product)}</td><td>${escapeHtml(m.bookingLabel || m.bookingSlot)}${m.history ? `<br/><small>${escapeHtml(m.history)}</small>` : ""}</td><td>${statusOf(m)}</td><td>€${escapeHtml(m.amount)}</td></tr>`
      )
      .join("");
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: resendFrom,
        to: [to],
        bcc: monitorBcc(),
        subject: `[Smart Space] ${futureRecoverable.length} paid order${futureRecoverable.length === 1 ? " needs" : "s need"} a visit booked`,
        text: [
          ...futureRecoverable.map(
            (m) =>
              `${m.name} <${m.email}>, ${m.product}, €${m.amount}, ordered for ${m.bookingLabel || m.bookingSlot}${m.history ? `. ${m.history}` : m.isPast ? " (PAST)" : ""}`
          ),
          ...(olderLine ? ["", olderLine] : []),
        ].join("\n"),
        html: `
          <h2>Daily booking-recovery audit</h2>
          <p>${futureCount} future visit${futureCount === 1 ? "" : "s"} never made it into your calendar; ${cancelledCount} paid order${cancelledCount === 1 ? " has" : "s have"} a visit cancelled in the last fortnight with nothing rebooked.</p>
          <p>A cancelled visit is not a sync problem: the customer has paid, so ring them to rebook or refund. Only the never-booked ones can be recovered with<br/>
            <code>node scripts/recover-bookings.mjs --book</code>, which leaves cancelled ones alone.</p>
          <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:system-ui">
            <thead style="background:#f3f4f6">
              <tr><th>Customer</th><th>Email</th><th>Product</th><th>Slot</th><th>Status</th><th>Amount</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          ${olderLine ? `<p style="color:#5A524C">${escapeHtml(olderLine)}</p>` : ""}
        `,
      });
    } catch (err) {
      console.error("[cron/recover-bookings] alert email failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    missed: missed.length,
    futureRecoverable: futureRecoverable.length,
    emailed: true,
    past: missed.filter((m) => m.isPast).length,
    checked: stripeOrders.length,
  });
}
