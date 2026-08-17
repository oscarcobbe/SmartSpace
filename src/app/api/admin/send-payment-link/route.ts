// POST /api/admin/send-payment-link
//
// Emails a customer their Stripe payment link for a specific job, together
// with the terms that apply to the work. Nigel uses this from the leads
// dashboard after quoting: he creates the payment link in Stripe for that
// job, pastes it here with the customer's email, and presses Send.
//
// Why a pasted link rather than a fixed product: every Stripe payment link
// on the account is bespoke per job ("Balance of EUR 271 on EUR 500",
// "Booking deposit of EUR 650 on EUR 1,084", "Supply and installation of 2x
// Ring Floodlight"). There is no catalogue to select from, so the operator
// supplies the link.
//
// Auth: Bearer ADMIN_KEY, timing-safe compare, same as /api/admin/leads and
// /api/admin/test-conversion. This route SENDS EMAIL FROM OUR DOMAIN and
// includes a payment link, so an unauthenticated version would be both a
// spam relay and a phishing vector. It must never be open.
//
// Env:
//   ADMIN_KEY            , admin password shared with the dashboard
//   RESEND_API_KEY       , Resend key. NOTE: must belong to the Resend team
//                          that owns the verified bookings.smart-space.ie
//                          domain, otherwise sends are rejected.
//   RESEND_FROM_EMAIL    , verified from-address on that domain
//   RESEND_REPLY_TO      , optional; where customer replies land

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const FROM =
  process.env.RESEND_FROM_EMAIL || "Smart Space <bookings@bookings.smart-space.ie>";
const REPLY_TO = process.env.RESEND_REPLY_TO || "bookings@smart-space.ie";
const TERMS_URL = process.env.TERMS_URL || "https://smart-space.ie/terms";

// Constant-time compare that does not leak length via early return.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still burn a comparison so timing does not reveal the length mismatch.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
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
  let body: { email?: string; name?: string; paymentUrl?: string; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const to = (body.email ?? "").trim();
  const name = (body.name ?? "").trim().slice(0, 80);
  const paymentUrl = (body.paymentUrl ?? "").trim();
  const note = (body.note ?? "").trim().slice(0, 300);

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json(
      { error: "A valid customer email address is required." },
      { status: 400 },
    );
  }

  // Only accept genuine Stripe payment links. A free-text URL field that
  // emails whatever it is given, from our verified domain, is a phishing
  // relay: anyone who obtained the admin key could send convincing
  // "Smart Space" payment requests pointing at their own collection page.
  let parsed: URL;
  try {
    parsed = new URL(paymentUrl);
  } catch {
    return NextResponse.json(
      { error: "Paste the Stripe payment link for this job." },
      { status: 400 },
    );
  }
  const hostOk =
    parsed.protocol === "https:" &&
    (parsed.hostname === "buy.stripe.com" || parsed.hostname.endsWith(".stripe.com"));
  if (!hostOk) {
    return NextResponse.json(
      { error: "That is not a Stripe link. Payment links must be on buy.stripe.com." },
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
  const noteBlock = note
    ? `<p style="font-size:15px;margin:0 0 16px;">${escapeHtml(note)}</p>`
    : "";

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;line-height:1.6;color:#1f2933;">
  <p style="font-size:16px;margin:0 0 16px;">${greeting}</p>
  <p style="font-size:16px;margin:0 0 16px;">
    Thanks for choosing Smart Space. You can complete your payment securely
    using the link below.
  </p>
  ${noteBlock}
  <p style="margin:28px 0;text-align:center;">
    <a href="${safeUrl}"
       style="background:#e85c2b;color:#ffffff;text-decoration:none;font-weight:700;
              font-size:16px;padding:14px 30px;border-radius:8px;display:inline-block;">
      Pay securely
    </a>
  </p>
  <p style="font-size:13px;color:#52606d;margin:0 0 20px;text-align:center;">
    Payment is handled by Stripe. We never see or store your card details.
  </p>
  <div style="background:#f5f7fa;border-left:3px solid #cbd2d9;padding:14px 18px;border-radius:6px;margin:0 0 20px;">
    <p style="font-size:13px;color:#3e4c59;margin:0;">
      By completing this payment you accept our
      <a href="${TERMS_URL}" style="color:#c2410c;">terms and conditions</a>,
      which cover the scope of the work, our installation warranty and the
      limits of our liability. Please read them before paying, and reply to
      this email if anything is unclear.
    </p>
  </div>
  <p style="font-size:15px;margin:0 0 8px;">
    Any questions, just reply to this email or call us on
    <a href="tel:+35315130424" style="color:#c2410c;">01 513 0424</a>.
  </p>
  <hr style="border:none;border-top:1px solid #e4e7eb;margin:28px 0 16px;">
  <p style="font-size:12px;color:#7b8794;margin:0;">
    Smart Space &middot; Dublin &amp; Leinster &middot; smart-space.ie
  </p>
</div>`.trim();

  const text = [
    name ? `Hi ${name},` : "Hello,",
    "",
    "Thanks for choosing Smart Space. You can complete your payment securely here:",
    "",
    safeUrl,
    "",
    note || "",
    "Payment is handled by Stripe, we never see or store your card details.",
    "",
    `By completing this payment you accept our terms and conditions (${TERMS_URL}),`,
    "which cover the scope of the work, our installation warranty and the limits",
    "of our liability. Please read them before paying.",
    "",
    "Questions? Reply to this email or call 01 513 0424.",
    "",
    "Smart Space, Dublin & Leinster",
  ]
    .filter(Boolean)
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
        subject: "Your Smart Space payment link",
        html,
        text,
      }),
    });

    // Resend resolves with an error body on most failure modes (unverified
    // domain, blocked recipient, rate limit) rather than throwing, so a bare
    // try/catch would report success on a silent failure.
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn("[send-payment-link] Resend rejected:", res.status, detail.slice(0, 300));
      return NextResponse.json(
        { error: `Email provider rejected the send (${res.status}).` },
        { status: 502 },
      );
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    console.log("[send-payment-link] sent to", to, "id", data?.id);
    return NextResponse.json({ ok: true, to, id: data?.id ?? null });
  } catch (err) {
    console.error("[send-payment-link] send failed:", err);
    return NextResponse.json(
      { error: "Could not send the email. Please try again." },
      { status: 500 },
    );
  }
}
