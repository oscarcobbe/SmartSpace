import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { uploadConversion, lookupGclidByEmail } from "@/lib/conversions";

// Disable body parsing — Stripe requires the raw body for signature verification
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const email: string =
      session.customer_details?.email ??
      (session.customer_email as string) ??
      "";
    const amountTotal: number = (session.amount_total ?? 0) / 100; // pence → €
    const currency: string = (session.currency ?? "eur").toUpperCase();
    const sessionId: string = session.id;

    // Look for GCLID in session metadata first, then fall back to email lookup
    let gclid: string = (session.metadata?.gclid as string) ?? "";
    if (!gclid && email) {
      gclid = (await lookupGclidByEmail(email)) ?? "";
    }

    if (gclid) {
      await uploadConversion({
        gclid,
        email,
        conversion_name: "Specialist Payment",
        conversion_value: amountTotal,
        conversion_time: new Date().toISOString(),
        transaction_id: sessionId,
        currency,
      });
      console.log(
        `[stripe] conversion uploaded – session=${sessionId} gclid=${gclid} value=${amountTotal} ${currency}`
      );
    } else {
      console.log(
        `[stripe] no gclid for session=${sessionId} email=${email}`
      );
    }

    // Redirect URL for success page is set on the payment link/session
    // The success_url should be: https://smart-space.ie/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}&amount=AMOUNT
    // That page fires the client-side gtag conversion event.
  }

  return NextResponse.json({ received: true });
}
