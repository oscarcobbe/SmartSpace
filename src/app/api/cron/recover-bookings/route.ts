import { NextResponse } from "next/server";
import { Resend } from "resend";
import { timingSafeEqual } from "crypto";
import { alertTo, monitorBcc } from "@/lib/business-constants";
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

  // Nothing to flag → silent success
  if (missed.length === 0) {
    return NextResponse.json({ ok: true, missed: 0, checked: stripeOrders.length });
  }

  // Only email when there's something genuinely actionable. Past missed
  // bookings are a one-time phone call, not a recurring problem, emailing
  // about them every day would train Nigel to ignore the alert.
  const futureRecoverable = missed.filter((m) => !m.isPast);
  if (futureRecoverable.length === 0) {
    return NextResponse.json({
      ok: true,
      missed: missed.length,
      futureRecoverable: 0,
      past: missed.filter((m) => m.isPast).length,
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
    const futureCount = missed.filter((m) => !m.isPast).length;
    const pastCount = missed.filter((m) => m.isPast).length;
    // Escape every Stripe-supplied field. Stripe sanitizes their own
    // fields but we don't trust upstream data into our HTML, a custom
    // product_name with `<script>` would otherwise inject into Nigel's
    // inbox.
    const rows = missed
      .map(
        (m) =>
          `<tr><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.email)}</td><td>${escapeHtml(m.product)}</td><td>${escapeHtml(m.bookingLabel || m.bookingSlot)}</td><td>${m.isPast ? "⚠️ PAST" : "🔧 future"}</td><td>€${escapeHtml(m.amount)}</td></tr>`
      )
      .join("");
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: resendFrom,
        to: [to],
        bcc: monitorBcc(),
        subject: `[Smart Space] ${missed.length} paid order${missed.length === 1 ? "" : "s"} missing a calendar booking`,
        text: missed
          .map(
            (m) =>
              `${m.name} <${m.email}>, ${m.product}, €${m.amount}, ${m.bookingLabel || m.bookingSlot} ${m.isPast ? "(PAST)" : ""}`
          )
          .join("\n"),
        html: `
          <h2>Daily booking-recovery audit</h2>
          <p>${futureCount} future booking${futureCount === 1 ? "" : "s"} need recovery; ${pastCount} past booking${pastCount === 1 ? "" : "s"} need a phone call.</p>
          <p>To recover automatically: SSH into the project and run<br/>
            <code>node scripts/recover-bookings.mjs --book</code></p>
          <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:system-ui">
            <thead style="background:#f3f4f6">
              <tr><th>Customer</th><th>Email</th><th>Product</th><th>Slot</th><th>Status</th><th>Amount</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `,
      });
    } catch (err) {
      console.error("[cron/recover-bookings] alert email failed:", err);
    }
  }

  return NextResponse.json({
    ok: true,
    missed: missed.length,
    futureRecoverable: missed.filter((m) => !m.isPast).length,
    past: missed.filter((m) => m.isPast).length,
    checked: stripeOrders.length,
  });
}
