import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Verifies a Stripe checkout session ID against Stripe's API and returns
 * the true payment status and amount. The payment success page uses this
 * to decide whether to render a receipt and fire the Google Ads conversion,
 * so it cannot be spoofed by a crafted `?amount=...&session_id=fake` URL.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id") ?? "";

  // Stripe session IDs look like `cs_live_...` or `cs_test_...`
  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message ?? "Stripe lookup failed" }, { status: 404 });
    }
    const session = await res.json();
    const paid = session.payment_status === "paid";
    const amount = typeof session.amount_total === "number" ? session.amount_total / 100 : 0;
    const currency = (session.currency ?? "eur").toUpperCase();
    // Email / phone for enhanced conversions on the success page
    const email = session.customer_details?.email ?? undefined;
    const phone = session.customer_details?.phone ?? undefined;
    return NextResponse.json({ paid, amount, currency, email, phone });
  } catch (err) {
    console.error("[verify-session] error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
