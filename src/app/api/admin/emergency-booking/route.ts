// POST /api/admin/emergency-booking
//
// Backend tool for Nigel. He specs a product plus a fixed date and time
// (ignoring the public calendar and whatever it has blocked), and this route
// creates ONE Stripe checkout link for that exact job and emails it to the
// customer. When they pay, the existing Stripe webhook records it as a Paid
// Order (which then shows in the dashboard and, because its booking date is in
// the future, in the Upcoming tab) and sends the standard confirmation.
//
// metadata.emergency = "1" tells the webhook to SKIP Calendly: Nigel set the
// slot by hand and it may not be a bookable Calendly slot, so we must not try
// to create a calendar event for it (that is the whole point of this tool).
//
// Auth mirrors send-payment-link: Bearer ADMIN_KEY (timing-safe) plus per-IP
// rate limiting. This route can move real money and send DKIM-signed mail from
// our domain, so it is held to the same bar as the payment-link sender.

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const SS_FROM = process.env.RESEND_FROM_EMAIL || "Smart Space <bookings@bookings.smart-space.ie>";
const SS_REPLY_TO = process.env.RESEND_REPLY_TO || "bookings@smart-space.ie";
const SITE = "https://smart-space.ie";
const FETCH_TIMEOUT_MS = 10000;

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rateBuckets.set(ip, hits);
    return false;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return true;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab); // burn an equivalent compare, no length oracle
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

interface Spec {
  question: string;
  answer: string;
}
interface Body {
  name?: string;
  email?: string;
  productName?: string; // full label e.g. "Plus Video Doorbell - No New Cabling Required"
  amount?: number; // euros
  date?: string; // ISO yyyy-mm-dd
  slot?: string; // e.g. "10:00-12:00"
  bookingLabel?: string; // human e.g. "Thu 8 Oct, 10:00-12:00"
  address?: string;
  specs?: Spec[];
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!rateLimitOk(ip)) {
    return NextResponse.json({ error: "Too many requests, wait a minute." }, { status: 429 });
  }

  const adminKey = process.env.ADMIN_KEY || "";
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
  if (!adminKey || !token || !safeEqual(token, adminKey)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const productName = String(body.productName || "").trim();
  const amount = Number(body.amount);
  const date = String(body.date || "").trim();
  const slot = String(body.slot || "").trim();
  const name = String(body.name || "").trim();
  const address = String(body.address || "").trim();
  const bookingLabel = String(body.bookingLabel || "").trim() || `${date}${slot ? ` ${slot}` : ""}`;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "A valid customer email is required" }, { status: 400 });
  }
  if (!productName) {
    return NextResponse.json({ error: "Pick a product" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
    return NextResponse.json({ error: "Enter a valid price" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Pick a date" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 500 });
  }

  const cents = Math.round(amount * 100);

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${SITE}/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", SITE);
  params.append("billing_address_collection", "required");
  params.append("phone_number_collection[enabled]", "true");
  params.append("custom_fields[0][key]", "installation_address");
  params.append("custom_fields[0][label][type]", "custom");
  params.append("custom_fields[0][label][custom]", "Installation Address (if different from billing)");
  params.append("custom_fields[0][type]", "text");
  params.append("custom_fields[0][optional]", "true");
  params.append("customer_email", email);
  // Booking + product metadata, same keys the site checkout uses so the
  // webhook and dashboard treat this exactly like any other paid order.
  params.append("metadata[booking_date]", date);
  params.append("metadata[booking_slot]", slot);
  params.append("metadata[booking_label]", bookingLabel);
  params.append("metadata[product_name]", productName.slice(0, 480));
  params.append("metadata[emergency]", "1");
  if (name) params.append("metadata[customer_name]", name.slice(0, 200));
  if (address) params.append("metadata[install_address_note]", address.slice(0, 480));
  if (Array.isArray(body.specs) && body.specs.length) {
    const cfg = JSON.stringify(
      body.specs
        .filter((s) => s && s.question && s.answer)
        .map((s) => ({ question: String(s.question).slice(0, 120), answer: String(s.answer).slice(0, 120) })),
    );
    params.append("metadata[configuration]", cfg.slice(0, 490));
  }
  // Show the booked slot + the spec breakdown right under the price on the
  // Stripe checkout page (Stripe renders the line-item description there), so
  // the customer sees exactly what they are paying for and when it is booked.
  const descLines: string[] = [`Booked for ${bookingLabel}`];
  if (Array.isArray(body.specs)) {
    for (const s of body.specs) {
      if (s && s.question && s.answer) descLines.push(`${String(s.question)}: ${String(s.answer)}`);
    }
  }
  if (address) descLines.push(`Install: ${address}`);
  params.append("line_items[0][price_data][currency]", "eur");
  params.append("line_items[0][price_data][unit_amount]", String(cents));
  params.append("line_items[0][price_data][product_data][name]", productName.slice(0, 250));
  params.append("line_items[0][price_data][product_data][description]", descLines.join("\n").slice(0, 900));
  params.append("line_items[0][quantity]", "1");

  let url = "";
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };
    if (!res.ok || !data.url) {
      console.error("[emergency-booking] Stripe session failed:", res.status, data.error?.message);
      return NextResponse.json({ error: data.error?.message || `Stripe error (${res.status})` }, { status: 502 });
    }
    url = data.url;
  } catch (err) {
    console.error("[emergency-booking] Stripe error:", err);
    return NextResponse.json({ error: "Could not create the payment link" }, { status: 502 });
  }

  // Email the customer the single pay-and-book link. Best-effort: the URL is
  // returned to the dashboard either way, so Nigel can copy and send it himself
  // if the mail send is having a bad day.
  let sent = false;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const greeting = name ? `Hi ${escapeHtml(name)},` : "Hello,";
    const safeUrl = escapeHtml(url);
    const row = (k: string, v: string) =>
      `<tr><td style="padding:6px 0;font-size:13px;color:#8a94a0;">${escapeHtml(k)}</td>` +
      `<td style="padding:6px 0;font-size:14px;color:#1a1f26;text-align:right;font-weight:600;">${escapeHtml(v)}</td></tr>`;
    const html = `
<div style="margin:0;padding:32px 16px;background:#f7f8f9;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:40px 36px;">
  <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#e2661d;margin:0 0 24px;">Smart Space</div>
  <p style="font-size:17px;line-height:1.5;color:#1a1f26;margin:0 0 12px;">${greeting}</p>
  <p style="font-size:15px;line-height:1.7;color:#5c6673;margin:0 0 24px;">Here are the details for your booking. Tap below to confirm and pay securely, and your slot is held for you.</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px;border-top:1px solid #eef0f3;border-bottom:1px solid #eef0f3;">
    ${row("Service", productName)}
    ${row("Date and time", bookingLabel)}
    ${row("Total", money(cents))}
  </table>
  <a href="${safeUrl}" style="display:block;background:#e2661d;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:16px 24px;border-radius:8px;text-align:center;margin:0 0 14px;">
    Confirm and pay ${escapeHtml(money(cents))}
  </a>
  <p style="font-size:12px;color:#a3abb5;text-align:center;margin:0 0 28px;">Or paste this into your browser:<br><span style="color:#8a94a0;word-break:break-all;">${safeUrl}</span></p>
  <p style="font-size:14px;line-height:1.6;color:#5c6673;margin:0;">Any questions, just reply to this email or call <a href="tel:+35315130424" style="color:#e2661d;text-decoration:none;font-weight:600;">01 513 0424</a>.</p>
</div>
<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#a3abb5;text-align:center;margin:20px 0 0;">Smart Space &middot; Dublin &amp; Leinster</p>
</div>`.trim();
    const text = [
      greeting,
      "",
      "Here are the details for your booking. Open the link below to confirm and pay securely, and your slot is held for you.",
      "",
      `Service: ${productName}`,
      `Date and time: ${bookingLabel}`,
      `Total: ${money(cents)}`,
      "",
      `Confirm and pay: ${url}`,
      "",
      "Questions? Reply to this email or call 01 513 0424.",
      "",
      "Smart Space, Dublin & Leinster",
    ].join("\n");
    try {
      const mailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        body: JSON.stringify({
          from: SS_FROM,
          to: email,
          reply_to: SS_REPLY_TO,
          subject: "Confirm and pay for your Smart Space booking",
          html,
          text,
        }),
      });
      sent = mailRes.ok;
      if (!mailRes.ok) {
        console.error("[emergency-booking] Resend failed:", mailRes.status, await mailRes.text().catch(() => ""));
      }
    } catch (err) {
      console.error("[emergency-booking] Resend error:", err);
    }
  }

  return NextResponse.json({ ok: true, url, sent });
}
