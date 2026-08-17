// POST /api/admin/send-payment-link
//
// Two modes, both driven from the leads dashboard. Each takes three fields:
// customer name (optional), customer email, and a link.
//
//   mode: "payment"  , emails the customer their Stripe payment link. What
//                      they are paying for is read back OUT of the link
//                      itself (line items, quantity, amount) rather than
//                      retyped. Nigel already writes the full job description
//                      into the Stripe product, so retyping it in the
//                      dashboard is duplicate data entry that can drift from
//                      the actual charge. Scraping it means the email can
//                      never disagree with what the customer is billed.
//   mode: "booking"   , emails a link to a booking page whose calendar is
//                      conflict-checked against Nigel's Google Calendar.
//
// Auth: Bearer ADMIN_KEY, timing-safe compare, plus per-IP rate limiting.
// The rate limit matters more here than on the leads endpoint: a guessed
// ADMIN_KEY on THIS route sends DKIM-signed mail from our verified domain
// with an attacker-chosen link behind a "Pay securely" button. That is a
// better phishing primitive than read access to the leads list.
//
// Env:
//   ADMIN_KEY, RESEND_API_KEY, STRIPE_SECRET_KEY,
//   RESEND_FROM_EMAIL / RESEND_REPLY_TO          (payment mode, Smart Space)
//   RESEND_SCL_FROM_EMAIL / RESEND_SCL_REPLY_TO  (booking mode, SmartCare Living)
//   TERMS_URL

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

// Payment mode is Smart Space work. Booking mode points at a SmartCare Living
// consultation, so it must not arrive from a "Smart Space" sender: an
// unfamiliar sender plus a link to a third domain is the exact shape spam
// filters score on, and it reads as a phish to the customer.
const SS_FROM = process.env.RESEND_FROM_EMAIL || "Smart Space <bookings@bookings.smart-space.ie>";
const SS_REPLY_TO = process.env.RESEND_REPLY_TO || "bookings@smart-space.ie";
const SCL_FROM =
  process.env.RESEND_SCL_FROM_EMAIL || "SmartCare Living <bookings@bookings.smart-space.ie>";
const SCL_REPLY_TO = process.env.RESEND_SCL_REPLY_TO || "bookings@smartcareliving.ie";

const TERMS_URL = process.env.TERMS_URL || "https://smart-space.ie/terms";

const PAYMENT_HOSTS = ["buy.stripe.com"];
const BOOKING_HOSTS = [
  "www.smartcareliving.ie",
  "smartcareliving.ie",
  "www.smart-space.ie",
  "smart-space.ie",
];

// Every outbound call gets a deadline. Without one, a hung Stripe request
// after the email has already sent runs the function to the platform timeout;
// the dashboard shows "Could not send", Nigel presses Send again, and the
// customer receives two payment emails.
const FETCH_TIMEOUT_MS = 8000;

// Per-IP rate limit, mirroring /api/admin/leads.
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
    timingSafeEqual(ab, ab); // burn an equivalent comparison, no length oracle
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

type LineItem = { description: string; quantity: number; amount: number };
type Cart = { items: LineItem[]; total: number; currency: string };

/** Read what the customer is actually being charged, straight from the payment
 *  link. Returns null when it cannot be determined; the email still sends,
 *  just without the itemised summary. */
async function readCart(paymentUrl: string): Promise<Cart | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[send-payment-link] STRIPE_SECRET_KEY missing, cannot itemise");
    return null;
  }
  const auth = { Authorization: `Bearer ${key}` };
  // buy.stripe.com URLs carry an opaque short code, not the plink_ id, so the
  // link has to be found by matching its canonical url. Compare without query
  // or trailing slash: Stripe's stored url has neither, but a pasted link
  // often carries ?prefilled_email=... which Stripe itself recommends.
  const canonical = paymentUrl.split("?")[0].replace(/\/$/, "");
  try {
    let startingAfter: string | undefined;
    for (let page = 0; page < 10; page++) {
      const qs = new URLSearchParams({ limit: "100" });
      if (startingAfter) qs.set("starting_after", startingAfter);
      const res = await fetch(`https://api.stripe.com/v1/payment_links?${qs}`, {
        headers: auth,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        console.warn("[send-payment-link] Stripe link list failed:", res.status);
        return null;
      }
      const body = (await res.json()) as {
        data?: Array<{ id: string; url: string }>;
        has_more?: boolean;
      };
      const rows = body.data ?? [];
      const match = rows.find((l) => l.url.split("?")[0].replace(/\/$/, "") === canonical);
      if (match) {
        const liRes = await fetch(
          `https://api.stripe.com/v1/payment_links/${match.id}/line_items?limit=20&expand[]=data.price.product`,
          { headers: auth, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
        );
        if (!liRes.ok) {
          console.warn("[send-payment-link] Stripe line_items failed:", liRes.status);
          return null;
        }
        const li = (await liRes.json()) as {
          data?: Array<{
            description?: string;
            quantity?: number;
            amount_total?: number;
            price?: { currency?: string };
          }>;
        };
        const items = (li.data ?? []).map((i) => ({
          description: i.description ?? "",
          quantity: i.quantity ?? 1,
          amount: (i.amount_total ?? 0) / 100,
        }));
        if (items.length === 0) return null;
        return {
          items,
          total: items.reduce((s, i) => s + i.amount, 0),
          currency: (li.data?.[0]?.price?.currency ?? "eur").toUpperCase(),
        };
      }
      if (!body.has_more || rows.length === 0) break;
      startingAfter = rows[rows.length - 1].id;
    }
    console.warn("[send-payment-link] no Stripe payment link matched the pasted URL");
    return null;
  } catch (err) {
    console.warn("[send-payment-link] could not read cart from Stripe:", err);
    return null;
  }
}

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export async function POST(request: Request) {
  // ── Auth ──
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimitOk(ip)) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const submittedKey = /^Bearer /i.test(authHeader) ? authHeader.slice(7) : "";
  if (!submittedKey || !safeEqual(submittedKey, adminKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse ──
  let body: { mode?: string; email?: string; name?: string; paymentUrl?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isBooking = body.mode === "booking";
  const to = (body.email ?? "").trim();
  const name = (body.name ?? "").trim().slice(0, 80);
  const url = (body.paymentUrl ?? "").trim();

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
      { error: isBooking ? "Booking link is missing." : "Paste the Stripe payment link." },
      { status: 400 },
    );
  }
  const allowed = isBooking ? BOOKING_HOSTS : PAYMENT_HOSTS;
  if (parsed.protocol !== "https:" || !allowed.includes(parsed.hostname)) {
    return NextResponse.json(
      {
        error: isBooking
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

  const safeUrl = parsed.toString().replace(/&/g, "&amp;");
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hello,";
  const cart = isBooking ? null : await readCart(parsed.toString());

  // ── Compose ──
  const accent = isBooking ? "#f48222" : "#e85c2b";
  const brand = isBooking ? "SmartCare Living" : "Smart Space";

  const cartHtml =
    cart && cart.items.length
      ? `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:0 0 32px;">
    <tr><td style="padding:0 0 10px;border-bottom:1px solid #e3e6ea;">
      <span style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#8a94a0;">Your order</span>
    </td></tr>
    ${cart.items
      .map(
        (i) => `<tr><td style="padding:16px 0;border-bottom:1px solid #eef0f3;">
      <div style="font-size:15px;line-height:1.5;color:#1a1f26;">${escapeHtml(i.description)}</div>
      ${i.quantity > 1 ? `<div style="font-size:13px;color:#8a94a0;margin-top:3px;">Quantity ${i.quantity}</div>` : ""}
    </td></tr>`,
      )
      .join("")}
    <tr><td style="padding:18px 0 0;">
      <span style="font-size:13px;color:#8a94a0;">Total due</span>
      <span style="float:right;font-size:26px;font-weight:700;letter-spacing:-0.5px;color:#1a1f26;">${escapeHtml(money(cart.total, cart.currency))}</span>
    </td></tr>
  </table>`
      : "";

  const intro = isBooking
    ? "Thanks for talking with us. Pick a day and time that suits you below. The calendar shows live availability, so whatever you choose is confirmed straight away."
    : "Thanks for choosing Smart Space. Everything you agreed is set out below, and you can pay securely whenever you're ready.";

  const tail = isBooking
    ? `<p style="font-size:14px;line-height:1.65;color:#5c6673;margin:0 0 24px;">
    The consultation is complimentary, with no obligation and no card required. Allow up to two hours.
  </p>`
    : `<p style="font-size:13px;line-height:1.6;color:#8a94a0;margin:0 0 24px;">
    Payment is handled by Stripe. We never see or store your card details. Completing
    payment accepts our <a href="${escapeHtml(TERMS_URL)}" style="color:#5c6673;">terms and conditions</a>,
    covering scope of work, warranty and liability.
  </p>`;

  const html = `
<div style="margin:0;padding:32px 16px;background:#f7f8f9;">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;padding:40px 36px;">
  <div style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};margin:0 0 24px;">${brand}</div>
  <p style="font-size:17px;line-height:1.5;color:#1a1f26;margin:0 0 12px;">${greeting}</p>
  <p style="font-size:15px;line-height:1.7;color:#5c6673;margin:0 0 32px;">${intro}</p>
  ${cartHtml}
  <a href="${safeUrl}"
     style="display:block;background:${accent};color:#ffffff;text-decoration:none;font-weight:600;
            font-size:16px;padding:16px 24px;border-radius:8px;text-align:center;margin:0 0 14px;">
    ${isBooking ? "Choose your appointment" : "Pay securely"}
  </a>
  <p style="font-size:12px;color:#a3abb5;text-align:center;margin:0 0 28px;">
    Or paste this into your browser:<br>
    <span style="color:#8a94a0;word-break:break-all;">${safeUrl}</span>
  </p>
  ${tail}
  <p style="font-size:14px;line-height:1.6;color:#5c6673;margin:0;">
    Any questions, just reply to this email or call
    <a href="tel:+35315130424" style="color:${accent};text-decoration:none;font-weight:600;">01 513 0424</a>.
  </p>
</div>
<p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#a3abb5;text-align:center;margin:20px 0 0;">
  ${brand} &middot; Dublin &amp; Leinster
</p>
</div>`.trim();

  const text = [
    name ? `Hi ${name},` : "Hello,",
    "",
    intro,
    "",
    ...(cart && cart.items.length
      ? [
          "YOUR ORDER",
          ...cart.items.map(
            (i) => `  ${i.description}${i.quantity > 1 ? ` (qty ${i.quantity})` : ""}`,
          ),
          `  Total due: ${money(cart.total, cart.currency)}`,
          "",
        ]
      : []),
    parsed.toString(),
    "",
    isBooking
      ? "The consultation is complimentary, with no obligation and no card required."
      : `Payment is handled by Stripe. Completing payment accepts our terms and conditions (${TERMS_URL}).`,
    "",
    "Questions? Reply to this email or call 01 513 0424.",
    "",
    `${brand}, Dublin & Leinster`,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      body: JSON.stringify({
        from: isBooking ? SCL_FROM : SS_FROM,
        to: [to],
        reply_to: isBooking ? SCL_REPLY_TO : SS_REPLY_TO,
        subject: isBooking
          ? "Book your complimentary consultation"
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

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    // Redact the address: Irish entity, customer data, GDPR applies.
    console.log(`[send-payment-link] ${body.mode ?? "payment"} sent, id`, data?.id);
    return NextResponse.json({
      ok: true,
      to,
      itemised: Boolean(cart),
      id: data?.id ?? null,
    });
  } catch (err) {
    console.error("[send-payment-link] send failed:", err);
    return NextResponse.json(
      { error: "Could not send the email. Please try again." },
      { status: 500 },
    );
  }
}
