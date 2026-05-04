import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { createBookingEvent } from "@/lib/calendly";
import { logLead } from "@/lib/leads";
import { fireServerConversion } from "@/lib/server-conversions";
import { sendSms } from "@/lib/sms";

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

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Send a notification email to the team about a paid order. Failure is
 * logged but never thrown — the webhook must respond 200 to Stripe even if
 * email infrastructure is having a bad day, otherwise Stripe will retry the
 * webhook and we'll double-book Calendly.
 */
async function sendOrderNotification(params: {
  customerName: string;
  email: string;
  phone: string;
  productName: string;
  amount: number;
  currency: string;
  bookingDate?: string;
  bookingLabel?: string;
  bookingSlot?: string;
  installationAddress?: string;
  sessionId: string;
  calendlyStatus: "created" | "failed" | "skipped";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL ?? "nigel@smart-space.ie";
  if (!apiKey || !from) {
    console.warn("[stripe webhook] RESEND_API_KEY or RESEND_FROM_EMAIL missing — skipping order email");
    return;
  }

  const calendlyLine =
    params.calendlyStatus === "created"
      ? "✅ Calendly event created automatically."
      : params.calendlyStatus === "failed"
      ? "⚠️ Calendly event creation FAILED — please book manually in Calendly."
      : "ℹ️ No booking date/slot in cart — Calendly was not attempted.";

  const dateLabel = params.bookingLabel || params.bookingDate || "—";
  const slotLabel = params.bookingSlot || "—";
  const formattedAmount = `${params.currency} ${params.amount.toFixed(2)}`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: [to],
      replyTo: params.email,
      subject: `New Paid Order — ${params.customerName} — ${formattedAmount}`,
      text: [
        `New paid order via smart-space.ie`,
        "",
        `Customer: ${params.customerName}`,
        `Email: ${params.email}`,
        `Phone: ${params.phone || "—"}`,
        `Address: ${params.installationAddress || "—"}`,
        "",
        `Product: ${params.productName}`,
        `Amount: ${formattedAmount}`,
        "",
        `Installation Date: ${dateLabel}`,
        `Time Slot: ${slotLabel}`,
        "",
        calendlyLine,
        "",
        `Stripe session: ${params.sessionId}`,
      ].join("\n"),
      html: `
        <h2>New Paid Order</h2>
        <p><strong>Customer:</strong> ${escapeHtml(params.customerName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(params.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(params.phone || "—")}</p>
        <p><strong>Address:</strong> ${escapeHtml(params.installationAddress || "—")}</p>
        <hr />
        <p><strong>Product:</strong> ${escapeHtml(params.productName)}</p>
        <p><strong>Amount:</strong> ${escapeHtml(formattedAmount)}</p>
        <hr />
        <p><strong>Installation Date:</strong> ${escapeHtml(dateLabel)}</p>
        <p><strong>Time Slot:</strong> ${escapeHtml(slotLabel)}</p>
        <p>${escapeHtml(calendlyLine)}</p>
        <hr />
        <p style="color:#999;font-size:12px;">Stripe session: ${escapeHtml(params.sessionId)}</p>
      `,
    });
    console.log(`[stripe webhook] order notification email sent for session=${params.sessionId}`);
  } catch (err) {
    console.error(`[stripe webhook] order notification email FAILED for session=${params.sessionId}:`, err);
  }
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
    const bookingLabel = session.metadata?.booking_label;
    const productName = session.metadata?.product_name ?? "Installation";
    const customerName = session.customer_details?.name ?? email.split("@")[0];
    const phone = session.customer_details?.phone ?? "";
    // Pull the installation address from the Stripe custom field (set in
    // /api/checkout). Falls back to the billing address if the customer
    // didn't provide a separate one.
    const installationAddressField = session.custom_fields?.find(
      (f) => f.key === "installation_address"
    )?.text?.value;
    const billingAddress = session.customer_details?.address;
    const billingAddressString = billingAddress
      ? [
          billingAddress.line1,
          billingAddress.line2,
          billingAddress.city,
          billingAddress.postal_code,
          billingAddress.country,
        ]
          .filter(Boolean)
          .join(", ")
      : "";
    const installationAddress = installationAddressField || billingAddressString;

    // Pull product-page question/answer pairs out of metadata.configuration
    // (set in /api/checkout) and format as a readable note string. The Sheet
    // only has a single "notes" column, so we collapse Q&A pairs into
    // "Q: A | Q: A" format. The dashboard re-parses this back into rows.
    let configNote = "";
    const cfgRaw = session.metadata?.configuration as string | undefined;
    if (cfgRaw) {
      try {
        const parsed = JSON.parse(cfgRaw) as Array<{ question: string; answer: string }>;
        if (Array.isArray(parsed)) {
          configNote = parsed
            .filter((p) => p?.question && p.answer)
            .map((p) => `${p.question}: ${p.answer}`)
            .join(" | ");
        }
      } catch { /* leave empty */ }
    }

    // Log paid order to tracking sheet — must await; fire-and-forget gets
    // killed by Vercel's serverless runtime when the webhook returns.
    await logLead({
      type: "Paid Order",
      name: customerName,
      email,
      phone,
      address: installationAddress || undefined,
      product: productName,
      amount: amountTotal,
      currency,
      bookingDate: bookingLabel || bookingDate || undefined,
      bookingSlot: bookingSlot || undefined,
      orderId: sessionId,
      notes: configNote || undefined,
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

    let calendlyStatus: "created" | "failed" | "skipped" = "skipped";
    if (bookingDate && bookingSlot) {
      const result = await createBookingEvent({
        date: bookingDate,
        timeSlot: bookingSlot,
        customerName,
        email,
        phone,
        productTitle: productName,
        orderId: sessionId,
        address: installationAddress || undefined,
      });
      if (result) {
        calendlyStatus = "created";
        console.log(`[stripe] calendly booking created for session=${sessionId}`);
      } else {
        calendlyStatus = "failed";
        console.error(`[stripe] calendly booking FAILED for session=${sessionId} date=${bookingDate} slot=${bookingSlot}`);
      }
    } else {
      console.warn(`[stripe] no booking_date/booking_slot in session=${sessionId} metadata — Calendly skipped`);
    }

    // Server-side conversion fire to Google Ads + GA4. Backstops the
    // client-side gtag fire on /smartspace-payment-success — that fire is
    // unreliable due to adblockers, consent denials, and SPA navigation
    // killing JS before the pixel completes. transaction_id=sessionId
    // dedupes when both client + server fire.
    const [firstName, ...rest] = (customerName || "").trim().split(/\s+/);
    const lastName = rest.join(" ") || undefined;
    await fireServerConversion({
      gadsLabel: "IofPCOiZuJkcEJfU6PxC", // SmartSpace Paid Order
      ga4EventName: "purchase",
      value: amountTotal,
      currency,
      transactionId: sessionId,
      gclid: gclid || undefined,
      email: email || undefined,
      phone: phone || undefined,
      firstName: firstName || undefined,
      lastName,
      extraParams: { product: productName, source: "stripe_webhook" },
    });

    // Notify Nigel — runs after Calendly so we can include the outcome in
    // the email body (e.g. "Calendly failed, book manually").
    await sendOrderNotification({
      customerName,
      email,
      phone,
      productName,
      amount: amountTotal,
      currency,
      bookingDate,
      bookingLabel,
      bookingSlot,
      installationAddress,
      sessionId,
      calendlyStatus,
    });

    // SMS for high-value orders (≥ €100) OR for any order where Calendly
    // creation FAILED (Nigel needs to know immediately so he can book
    // manually before the customer gives up). No-op if TWILIO_* env vars
    // aren't set.
    if (amountTotal >= 100 || calendlyStatus === "failed") {
      const calendlyHint =
        calendlyStatus === "failed"
          ? "⚠️ Calendly FAILED — book manually. "
          : calendlyStatus === "skipped"
          ? ""
          : "";
      await sendSms(
        `Smart Space — new paid order ${currency} ${amountTotal.toFixed(2)}: ${customerName} ${phone || ""}. ${productName}${
          bookingLabel || bookingDate ? ` for ${bookingLabel || bookingDate}` : ""
        }. ${calendlyHint}Email + dashboard /admin/leads.`
      );
    }
  }

  return NextResponse.json({ received: true });
}
