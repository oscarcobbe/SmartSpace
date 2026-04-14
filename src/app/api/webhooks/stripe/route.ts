import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { uploadConversion, lookupGclidByEmail } from "@/lib/conversions";
import { createBookingEvent } from "@/lib/calendly";
import { logLead } from "@/lib/leads";

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! as any);

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  if (secret) {
    // Verify signature when secret is configured (recommended for production)
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err) {
      console.error("[stripe webhook] signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // No secret configured — parse without verification (set STRIPE_WEBHOOK_SECRET in Vercel to harden)
    console.warn("[stripe webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
    event = JSON.parse(rawBody) as Stripe.Event;
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

    // Create Calendly booking if booking date/slot present in metadata
    const bookingDate = session.metadata?.booking_date;
    const bookingSlot = session.metadata?.booking_slot;
    const productName = session.metadata?.product_name ?? "Installation";
    const customerName = session.customer_details?.name ?? email.split("@")[0];
    const phone = session.customer_details?.phone ?? "";

    // Log paid order to tracking sheet
    logLead({
      type: "Paid Order",
      name: customerName,
      email,
      phone,
      product: productName,
      amount: amountTotal,
      currency,
      bookingDate: bookingDate || undefined,
      bookingSlot: bookingSlot || undefined,
      orderId: sessionId,
      gclid: gclid || undefined,
      source: "smart-space.ie",
    });

    if (bookingDate && bookingSlot) {
      const result = await createBookingEvent({
        date: bookingDate,
        timeSlot: bookingSlot,
        customerName,
        email,
        phone,
        productTitle: productName,
        orderId: sessionId,
      });
      if (result) {
        console.log(`[stripe] calendly booking created for session=${sessionId}`);
      } else {
        console.error(`[stripe] calendly booking FAILED for session=${sessionId} date=${bookingDate} slot=${bookingSlot}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
