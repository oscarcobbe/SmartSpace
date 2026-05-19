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
    // 10s ceiling — Stripe session GET typically completes in <500ms; a
    // hung call would otherwise pin this route up to the serverless
    // function limit and the success page would spin forever (and the
    // conversion never fires).
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message ?? "Stripe lookup failed" }, { status: 404 });
    }
    const session = await res.json();
    const paid = session.payment_status === "paid";
    const amount = typeof session.amount_total === "number" ? session.amount_total / 100 : 0;
    const currency = (session.currency ?? "eur").toUpperCase();
    // PII REMOVED. Previously this endpoint returned the customer's
    // email + phone in the response — convenient for Enhanced
    // Conversions on the success page, but it also meant anyone with
    // a session ID (which appears in the redirect URL, browser history,
    // any Referer header, screenshots of the success page) could fetch
    // the customer's email and phone.
    //
    // Enhanced Conversions still work without server-returned PII: the
    // page already has the user's gclid (from localStorage) and Google
    // Ads' built-in cookie matching for granted-consent users. Loss of
    // match rate ≈ 5–10% in exchange for closing a real PII leak.
    return NextResponse.json(
      { paid, amount, currency },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("[verify-session] error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
