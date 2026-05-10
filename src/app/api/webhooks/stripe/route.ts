import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { createBookingEvent } from "@/lib/calendly";
import { logLead } from "@/lib/leads";
import { fireServerConversion } from "@/lib/server-conversions";
import { sendSms } from "@/lib/sms";
import { formatEuro } from "@/lib/format";

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
  // Use formatEuro for consistency with the site's price display rules
  // (drop `.00` on whole-euro amounts). `params.currency` is unused here
  // because the site is EUR-only; if that ever changes, swap formatEuro
  // for an explicit currency-aware formatter.
  const formattedAmount = formatEuro(params.amount);

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

/**
 * Alert email for purchase ATTEMPTS that didn't complete — declined cards,
 * abandoned checkouts, async payment failures. Without this, a customer
 * whose card declines is invisible: the order never lands, so Nigel has
 * no idea they tried. The May 2026 incident (customer's card declined,
 * we only spotted it because Nigel happened to log into the Stripe
 * dashboard manually) is exactly what this guards against.
 *
 * Failure to send is logged but never thrown — webhook still returns 200.
 */
async function sendPurchaseAttemptAlert(params: {
  kind: "failed" | "expired" | "async_failed";
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
  sessionId?: string;
  paymentIntentId?: string;
  declineReason?: string;
  declineCode?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL ?? "nigel@smart-space.ie";
  if (!apiKey || !from) {
    console.warn("[stripe webhook] RESEND_API_KEY or RESEND_FROM_EMAIL missing — skipping purchase-attempt alert");
    return;
  }

  // Use formatEuro for consistency with the site's price display rules
  // (drop `.00` on whole-euro amounts). `params.currency` is unused here
  // because the site is EUR-only; if that ever changes, swap formatEuro
  // for an explicit currency-aware formatter.
  const formattedAmount = formatEuro(params.amount);
  const dateLabel = params.bookingLabel || params.bookingDate || "—";
  const slotLabel = params.bookingSlot || "—";

  let subject: string;
  let kindLabel: string;
  let urgencyLine: string;
  if (params.kind === "failed") {
    const reason = params.declineCode ? ` (${params.declineCode})` : "";
    subject = `⚠️ FAILED PAYMENT — ${params.customerName} — ${formattedAmount}${reason}`;
    kindLabel = "Payment FAILED";
    urgencyLine =
      "URGENT: Customer's card was declined. Call them now to suggest a different card before they give up on the booking.";
  } else if (params.kind === "expired") {
    subject = `⏰ Abandoned Checkout — ${params.customerName} — ${formattedAmount}`;
    kindLabel = "Checkout abandoned (24h timeout)";
    urgencyLine =
      "Customer reached the Stripe checkout page but never completed payment. Worth a follow-up call.";
  } else {
    subject = `⚠️ ASYNC PAYMENT FAILED — ${params.customerName} — ${formattedAmount}`;
    kindLabel = "Async payment FAILED";
    urgencyLine =
      "Customer's bank-transfer or delayed payment failed after checkout. They may not realise — call them.";
  }

  const declineText = params.declineReason ? `Decline reason: ${params.declineReason}` : "";

  const stripeUrl = params.paymentIntentId
    ? `https://dashboard.stripe.com/payments/${params.paymentIntentId}`
    : params.sessionId
    ? `https://dashboard.stripe.com/checkout/sessions/${params.sessionId}`
    : "https://dashboard.stripe.com/payments";

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: [to],
      replyTo: params.email || undefined,
      subject,
      text: [
        kindLabel,
        urgencyLine,
        "",
        `Customer: ${params.customerName}`,
        `Email: ${params.email || "—"}`,
        `Phone: ${params.phone || "—"}`,
        `Address: ${params.installationAddress || "—"}`,
        "",
        `Product: ${params.productName}`,
        `Amount: ${formattedAmount}`,
        "",
        `Booking Date: ${dateLabel}`,
        `Time Slot: ${slotLabel}`,
        "",
        ...(declineText ? [declineText, ""] : []),
        `Stripe: ${stripeUrl}`,
      ].join("\n"),
      html: `
        <h2 style="color:#b91c1c;margin-bottom:4px">${escapeHtml(kindLabel)}</h2>
        <p style="color:#b91c1c;font-weight:bold;margin-top:0">${escapeHtml(urgencyLine)}</p>
        <hr/>
        <p><strong>Customer:</strong> ${escapeHtml(params.customerName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(params.email || "—")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(params.phone || "—")}</p>
        <p><strong>Address:</strong> ${escapeHtml(params.installationAddress || "—")}</p>
        <hr/>
        <p><strong>Product:</strong> ${escapeHtml(params.productName)}</p>
        <p><strong>Amount:</strong> ${escapeHtml(formattedAmount)}</p>
        <p><strong>Booking Date:</strong> ${escapeHtml(dateLabel)}</p>
        <p><strong>Time Slot:</strong> ${escapeHtml(slotLabel)}</p>
        ${declineText ? `<p style="color:#b91c1c"><strong>${escapeHtml(declineText)}</strong></p>` : ""}
        <hr/>
        <p><a href="${stripeUrl}">Open in Stripe dashboard →</a></p>
      `,
    });
    console.log(
      `[stripe webhook] purchase-attempt alert sent kind=${params.kind} session=${params.sessionId ?? "-"} pi=${params.paymentIntentId ?? "-"}`
    );
  } catch (err) {
    console.error(`[stripe webhook] purchase-attempt alert FAILED kind=${params.kind}:`, err);
  }
}

/**
 * Common extractor — same field set the completed-checkout handler uses
 * to build customer/booking details out of a Checkout Session. Shared
 * with the new failure/abandonment handlers below.
 */
function extractSessionDetails(session: Stripe.Checkout.Session) {
  const email: string =
    session.customer_details?.email ?? (session.customer_email as string) ?? "";
  const amountTotal: number = (session.amount_total ?? 0) / 100;
  const currency: string = (session.currency ?? "eur").toUpperCase();
  const customerName: string =
    session.customer_details?.name ?? (email ? email.split("@")[0] : "(unknown)");
  const phone: string = session.customer_details?.phone ?? "";
  const bookingDate = session.metadata?.booking_date as string | undefined;
  const bookingSlot = session.metadata?.booking_slot as string | undefined;
  const bookingLabel = session.metadata?.booking_label as string | undefined;
  const productName: string =
    (session.metadata?.product_name as string) ?? "Installation";
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
  return {
    email,
    amountTotal,
    currency,
    customerName,
    phone,
    bookingDate,
    bookingSlot,
    bookingLabel,
    productName,
    installationAddress,
  };
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
    const paidLabel =
      (process.env.NEXT_PUBLIC_GADS_PAYMENT_SEND_TO || "")
        .replace(/^AW-\d+\//, "") || "IofPCOiZuJkcEJfU6PxC";
    await fireServerConversion({
      gadsLabel: paidLabel, // SmartSpace Paid Order
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
    //
    // Format prioritises legibility over byte-count — at €0.05/segment
    // and ≤10 SMS/day, total cost is <€20/month even at maximum volume.
    // iPhone Messages auto-detects the URL at the bottom and makes it
    // tap-to-open the dashboard.
    if (amountTotal >= 100 || calendlyStatus === "failed") {
      const lines: string[] = [
        "Smart Space — new paid order",
        `${formatEuro(amountTotal)} — ${customerName}`,
      ];
      if (phone) lines.push(phone);
      lines.push(""); // blank line

      lines.push(productName);
      if (bookingLabel || bookingDate) lines.push(bookingLabel || bookingDate || "");
      lines.push("");

      if (installationAddress) {
        lines.push("Address:");
        lines.push(installationAddress);
        lines.push("");
      }

      // Spec from metadata.configuration — same data we just wrote to
      // the Sheet, reformatted as a bullet list. Tells Nigel before he
      // arrives whether new cabling is needed, how many devices, etc.
      if (configNote) {
        lines.push("Spec:");
        for (const part of configNote.split(" | ")) {
          lines.push(`• ${part}`);
        }
        lines.push("");
      }

      if (calendlyStatus === "failed") {
        lines.push("⚠️ CALENDLY FAILED — book manually");
        lines.push("");
      }

      lines.push("https://smart-space.ie/admin/leads");

      await sendSms(lines.join("\n"));
    }
  } else if (event.type === "payment_intent.payment_failed") {
    // Card declined / 3DS failed / fraud rule blocked / etc. The customer
    // is most likely still on the Stripe checkout page and CAN retry with
    // a different card — but they often don't bother. This alert is the
    // single most important "save the booking" signal: if Nigel calls
    // them inside 5 minutes, conversion typically rescues. Beyond an hour
    // they've usually moved on.
    const pi = event.data.object as Stripe.PaymentIntent;
    // The PI doesn't carry our metadata — we attach metadata to the
    // Checkout Session, not the PI. Look up the owning session so we
    // have customer name, phone, address, booking date/slot, product.
    let session: Stripe.Checkout.Session | undefined;
    try {
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: pi.id,
        limit: 1,
      });
      session = sessions.data[0];
    } catch (err) {
      console.error(`[stripe webhook] failed to look up Checkout Session for PI ${pi.id}:`, err);
    }

    if (!session) {
      // Direct PaymentIntent API calls (no Checkout) won't have a session.
      // We don't currently use those — but log so we know if this changes.
      console.warn(
        `[stripe webhook] payment_intent.payment_failed ${pi.id} — no Checkout session, skipping alert`
      );
    } else {
      const d = extractSessionDetails(session);
      // Prefer details from the PI itself if the session didn't capture
      // customer info (sometimes the case if the customer typed nothing
      // before the card declined).
      const piEmail = (pi.receipt_email as string | null) ?? "";
      const piPhone = pi.shipping?.phone ?? "";
      await sendPurchaseAttemptAlert({
        kind: "failed",
        customerName: d.customerName,
        email: d.email || piEmail,
        phone: d.phone || piPhone,
        productName: d.productName,
        // Use PI amount as source of truth — session.amount_total can be
        // stale if Stripe updated the PI separately.
        amount: (pi.amount ?? 0) / 100,
        currency: (pi.currency ?? d.currency).toUpperCase(),
        bookingDate: d.bookingDate,
        bookingLabel: d.bookingLabel,
        bookingSlot: d.bookingSlot,
        installationAddress: d.installationAddress,
        sessionId: session.id,
        paymentIntentId: pi.id,
        declineReason: pi.last_payment_error?.message,
        declineCode:
          pi.last_payment_error?.decline_code ?? pi.last_payment_error?.code,
      });
    }
  } else if (event.type === "checkout.session.expired") {
    // Customer reached Stripe Checkout but never paid. Fires after Stripe's
    // 24h timeout. Less time-critical than payment_failed (the customer
    // is long gone) but still useful as a "leads to chase" signal.
    const session = event.data.object as Stripe.Checkout.Session;
    const d = extractSessionDetails(session);
    if (!d.email && !d.phone) {
      // No way to contact them — Stripe didn't capture any details before
      // they bounced. Alert is pointless.
      console.log(
        `[stripe webhook] checkout.session.expired ${session.id} — no contact info captured, skipping alert`
      );
    } else {
      await sendPurchaseAttemptAlert({
        kind: "expired",
        customerName: d.customerName,
        email: d.email,
        phone: d.phone,
        productName: d.productName,
        amount: d.amountTotal,
        currency: d.currency,
        bookingDate: d.bookingDate,
        bookingLabel: d.bookingLabel,
        bookingSlot: d.bookingSlot,
        installationAddress: d.installationAddress,
        sessionId: session.id,
      });
    }
  } else if (event.type === "checkout.session.async_payment_failed") {
    // Async payment methods (SEPA debit, bank redirects, BACS, etc.) can
    // succeed at checkout time and then fail days later when the bank
    // actually settles. We don't currently accept any of those — Stripe
    // Checkout is card-only by default — but handle it for completeness
    // so adding a payment method later doesn't silently swallow failures.
    const session = event.data.object as Stripe.Checkout.Session;
    const d = extractSessionDetails(session);
    await sendPurchaseAttemptAlert({
      kind: "async_failed",
      customerName: d.customerName,
      email: d.email,
      phone: d.phone,
      productName: d.productName,
      amount: d.amountTotal,
      currency: d.currency,
      bookingDate: d.bookingDate,
      bookingLabel: d.bookingLabel,
      bookingSlot: d.bookingSlot,
      installationAddress: d.installationAddress,
      sessionId: session.id,
    });
  }

  return NextResponse.json({ received: true });
}
