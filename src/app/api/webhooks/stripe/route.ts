import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createBookingEvent } from "@/lib/calendly";
import { logLead } from "@/lib/leads";

// In-memory idempotency cache — event IDs processed in the last hour.
// For multi-instance deployments, swap for Redis/Upstash.
const processedEvents = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000; // 1 hour

function pruneProcessed() {
  const now = Date.now();
  Array.from(processedEvents.entries()).forEach(([id, ts]) => {
    if (now - ts > IDEMPOTENCY_TTL_MS) processedEvents.delete(id);
  });
}

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Fail closed if either secret is missing — never process unsigned events
  if (!secretKey || !webhookSecret) {
    console.error("[stripe webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-03-25.dahlia" });

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency — skip if we've already processed this event ID
  pruneProcessed();
  if (processedEvents.has(event.id)) {
    console.log(`[stripe webhook] duplicate event ${event.id} skipped`);
    return NextResponse.json({ received: true, duplicate: true });
  }
  processedEvents.set(event.id, Date.now());

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const email: string =
      session.customer_details?.email ??
      (session.customer_email as string) ??
      "";
    const amountTotal: number = (session.amount_total ?? 0) / 100; // pence → €
    const currency: string = (session.currency ?? "eur").toUpperCase();
    const sessionId: string = session.id;
    const gclid: string = (session.metadata?.gclid as string) ?? "";

    const bookingDate = session.metadata?.booking_date;
    const bookingSlot = session.metadata?.booking_slot;
    const productName = session.metadata?.product_name ?? "Installation";
    const customerName = session.customer_details?.name ?? email.split("@")[0];
    const phone = session.customer_details?.phone ?? "";

    // Log paid order to tracking sheet (fire-and-forget — never blocks the webhook)
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
      attribution: {
        gclid: gclid || undefined,
        landingPage: (session.metadata?.landing_page as string) || undefined,
        referrer: (session.metadata?.referrer as string) || undefined,
        utmSource: (session.metadata?.utm_source as string) || undefined,
        utmMedium: (session.metadata?.utm_medium as string) || undefined,
        utmCampaign: (session.metadata?.utm_campaign as string) || undefined,
        utmContent: (session.metadata?.utm_content as string) || undefined,
        utmTerm: (session.metadata?.utm_term as string) || undefined,
      },
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
