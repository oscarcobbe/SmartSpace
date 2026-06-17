import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { createBookingEvent } from "@/lib/calendly";
import { logLead } from "@/lib/leads";
import { fireServerConversion } from "@/lib/server-conversions";
import { sendToCrm } from "@/lib/crm";
import { sendSms } from "@/lib/sms";
import { formatEuro } from "@/lib/format";
import { sendSiteAlert } from "@/lib/site-alerts";
import { alertTo } from "@/lib/business-constants";

// EXPLICIT runtime + dynamic flags. The webhook calls req.text() to get
// the raw body for Stripe signature verification (which uses Node's
// crypto via Stripe SDK). On the edge runtime, req.text() can return an
// empty body if the request has been parsed elsewhere, and crypto isn't
// available. If Next ever defaults to edge for route handlers, signature
// verification would silently fail and every webhook would 400. Locking
// to nodejs prevents the mystery outage.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory idempotency cache, event IDs processed in the last hour.
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
 * logged but never thrown, the webhook must respond 200 to Stripe even if
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
  const to = alertTo();
  if (!apiKey || !from) {
    console.warn("[stripe webhook] RESEND_API_KEY or RESEND_FROM_EMAIL missing, skipping order email");
    return;
  }

  const calendlyLine =
    params.calendlyStatus === "created"
      ? "✅ Calendly event created automatically."
      : params.calendlyStatus === "failed"
      ? "⚠️ Calendly event creation FAILED, please book manually in Calendly."
      : "ℹ️ No booking date/slot in cart, Calendly was not attempted.";

  const dateLabel = params.bookingLabel || params.bookingDate || "-";
  const slotLabel = params.bookingSlot || "-";
  // Use formatEuro for consistency with the site's price display rules
  // (drop `.00` on whole-euro amounts). `params.currency` is unused here
  // because the site is EUR-only; if that ever changes, swap formatEuro
  // for an explicit currency-aware formatter.
  const formattedAmount = formatEuro(params.amount);

  const resend = new Resend(apiKey);

  // ──────────────────────────────────────────────────────────────
  // Internal alert to Nigel (unchanged behaviour, em dashes stripped).
  // This is the "we got money" signal Nigel acts on, so failure here
  // is logged loudly but the function continues so the customer-facing
  // email below still gets attempted.
  // ──────────────────────────────────────────────────────────────
  try {
    await resend.emails.send({
      from,
      to: [to],
      replyTo: params.email,
      subject: `New Paid Order, ${params.customerName}, ${formattedAmount}`,
      text: [
        `New paid order via smart-space.ie`,
        "",
        `Customer: ${params.customerName}`,
        `Email: ${params.email}`,
        `Phone: ${params.phone || "(none)"}`,
        `Address: ${params.installationAddress || "(none)"}`,
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
        <p><strong>Phone:</strong> ${escapeHtml(params.phone || "(none)")}</p>
        <p><strong>Address:</strong> ${escapeHtml(params.installationAddress || "(none)")}</p>
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

  // ──────────────────────────────────────────────────────────────
  // Customer-facing purchase confirmation (NEW).
  //
  // Stripe sends a generic payment receipt, but it's bland and doesn't
  // mention the install date, what happens next, or who to call. This
  // is the Smart Space-branded thank-you that lands within seconds of
  // the customer paying.
  //
  // Wrapped in its OWN try/catch. If this fails, we log loudly but do
  // NOT throw, the internal Nigel alert above already fired and the
  // webhook must still return 200 to Stripe (otherwise Stripe retries
  // and we double-book Calendly + double-email Nigel).
  //
  // Skip the customer email entirely if we have no address to send to.
  // ──────────────────────────────────────────────────────────────
  if (!params.email) {
    console.warn(`[stripe webhook] no customer email on session=${params.sessionId}, skipping customer confirmation`);
    return;
  }

  try {
    const firstName = (params.customerName || "").trim().split(/\s+/)[0] || "there";
    const firstNameSafe = escapeHtml(firstName);
    const productSafe = escapeHtml(params.productName);
    const amountSafe = escapeHtml(formattedAmount);
    const dateSafe = escapeHtml(dateLabel);
    const slotSafe = escapeHtml(slotLabel);
    // Brand-aware tagline: Eufy buyers shouldn't see "Ring installer" in their
    // order confirmation. Ring (and anything else) keeps the standard line.
    const isEufyOrder = /eufy/i.test(params.productName || "");
    const brandTagline = isEufyOrder
      ? "Dublin's trusted smart security installer."
      : "Dublin's #1 Ring installer.";
    // Trim product name for subject line so it stays under common
    // inbox preview widths (~60 chars after the "Order confirmed..."
    // prefix consumes ~30).
    const shortProduct =
      params.productName.length > 50
        ? params.productName.slice(0, 47) + "..."
        : params.productName;

    await resend.emails.send({
      from,
      to: [params.email],
      replyTo: to, // replies route to Nigel, not from-address (no-reply)
      subject: `Order confirmed, Smart Space, ${shortProduct}`,
      text: [
        `Hi ${firstName},`,
        "",
        "Thanks. We've got your order and everything's locked in.",
        "",
        "Order summary",
        `  Product: ${params.productName}`,
        `  Amount:  ${formattedAmount}`,
        `  Date:    ${dateLabel}`,
        `  Slot:    ${slotLabel}`,
        "",
        "What happens next",
        "  1. Before we arrive, have your WiFi name and password and your app account ready, that's all we need from you on the day.",
        "  2. We arrive in your slot, install everything, walk you through the app, and train the family before we leave.",
        "  3. Any issue in the first 30 days, we come back free of charge.",
        "",
        "Questions before then?",
        "  Phone: 01 513 0424",
        "  Email: info@smart-space.ie",
        "",
        "Talk soon,",
        "Nigel and the Smart Space team",
        "smart-space.ie",
        "",
        "Stripe sends a separate payment receipt to this address. This email is just the install side.",
      ].join("\n"),
      html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en-IE">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>Order confirmed, Smart Space</title>
</head>
<body style="margin:0;padding:0;background:#f1efea;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
<div style="display:none !important;visibility:hidden;mso-hide:all;font-size:1px;color:#f1efea;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Order confirmed. Install booked for ${dateSafe}, ${slotSafe}.</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#f1efea;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width:600px;max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:24px 32px 16px;border-bottom:1px solid #e6e3df;" align="left">
        <img src="https://smart-space.ie/Logo1.png" width="120" height="auto" alt="Smart Space" style="display:block;height:auto;max-width:120px;border:0;outline:none;text-decoration:none;">
      </td></tr>
      <tr><td style="padding:36px 32px 8px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#f48222;">Order confirmed</div>
        <h1 style="margin:10px 0 0;font-size:26px;line-height:1.15;letter-spacing:-0.5px;color:#1C1A18;font-weight:800;">Thanks, ${firstNameSafe}. We've got your order.</h1>
        <p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#3f3d3a;">Everything's locked in. Here's what you booked and what to expect.</p>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#fef4eb;border:1px solid #f4d4a8;border-radius:6px;">
          <tr><td style="padding:18px 20px;">
            <div style="font-size:11px;font-weight:800;color:#d96d15;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;">Order summary</div>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="font-size:14px;line-height:1.6;color:#1C1A18;">
              <tr>
                <td style="padding:4px 0;color:#7a7975;font-weight:600;width:120px;">Product</td>
                <td style="padding:4px 0;color:#1C1A18;font-weight:700;">${productSafe}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#7a7975;font-weight:600;">Amount</td>
                <td style="padding:4px 0;color:#1C1A18;font-weight:700;">${amountSafe}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#7a7975;font-weight:600;">Install date</td>
                <td style="padding:4px 0;color:#1C1A18;font-weight:700;">${dateSafe}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#7a7975;font-weight:600;">Time slot</td>
                <td style="padding:4px 0;color:#1C1A18;font-weight:700;">${slotSafe}</td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:28px 32px 8px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <div style="font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#f48222;margin-bottom:10px;">What happens next</div>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td valign="top" style="padding:0 0 14px;width:36px;">
              <div style="background:#f48222;color:#ffffff;width:28px;height:28px;border-radius:999px;text-align:center;font-weight:800;font-size:14px;line-height:28px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">1</div>
            </td>
            <td valign="top" style="padding:0 0 14px 12px;font-size:15px;line-height:1.55;color:#3f3d3a;">
              Before we arrive, have your WiFi name and password and your app account ready. That's all we need from you on the day.
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding:0 0 14px;width:36px;">
              <div style="background:#f48222;color:#ffffff;width:28px;height:28px;border-radius:999px;text-align:center;font-weight:800;font-size:14px;line-height:28px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">2</div>
            </td>
            <td valign="top" style="padding:0 0 14px 12px;font-size:15px;line-height:1.55;color:#3f3d3a;">
              We arrive in your slot, install everything, walk you through the app, and train the family before we leave.
            </td>
          </tr>
          <tr>
            <td valign="top" style="padding:0;width:36px;">
              <div style="background:#f48222;color:#ffffff;width:28px;height:28px;border-radius:999px;text-align:center;font-weight:800;font-size:14px;line-height:28px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">3</div>
            </td>
            <td valign="top" style="padding:0 0 0 12px;font-size:15px;line-height:1.55;color:#3f3d3a;">
              Any issue in the first 30 days, we come back free of charge.
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 8px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-left:3px solid #f48222;">
          <tr><td style="padding:4px 0 4px 16px;">
            <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#1C1A18;font-weight:700;">Questions before then?</p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#3f3d3a;">
              Phone: <a href="tel:+35315130424" style="color:#f48222;font-weight:700;text-decoration:underline;">01 513 0424</a><br>
              Email: <a href="mailto:info@smart-space.ie" style="color:#f48222;font-weight:700;text-decoration:underline;">info@smart-space.ie</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:24px 32px 32px;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3f3d3a;">Talk soon,<br><strong style="color:#1C1A18;">Nigel and the Smart Space team</strong><br><a href="https://smart-space.ie" style="color:#f48222;font-weight:700;text-decoration:underline;">smart-space.ie</a></p>
      </td></tr>
      <tr><td style="padding:28px 32px;background:#1C1A18;color:#cccccc;font-family:'Plus Jakarta Sans','Inter',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td valign="top" style="padding-right:16px;">
              <div style="font-weight:800;color:#ffffff;font-size:14px;letter-spacing:0.4px;margin-bottom:8px;">Smart Space</div>
              <div>${brandTagline}</div>
              <div>5,000+ installs across Leinster.</div>
            </td>
            <td valign="top" style="padding-left:16px;text-align:right;">
              <div><a href="tel:+35315130424" style="color:#ffffff;text-decoration:none;font-weight:700;">01 513 0424</a></div>
              <div><a href="mailto:info@smart-space.ie" style="color:#ffffff;text-decoration:none;">info@smart-space.ie</a></div>
              <div><a href="https://smart-space.ie" style="color:#ffffff;text-decoration:none;">smart-space.ie</a></div>
            </td>
          </tr>
        </table>
        <div style="border-top:1px solid #2e2c2a;margin-top:18px;padding-top:14px;font-size:11px;color:#888;line-height:1.55;">
          Stripe sends a separate payment receipt to this address. This email is just the install side, what you booked and what happens next.<br>
          © Smart Space · Three Ireland SME Business Winner 2025 · Dublin and Leinster
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
    });
    console.log(`[stripe webhook] customer confirmation email sent for session=${params.sessionId}`);
  } catch (err) {
    // Non-fatal: Nigel already got the internal alert above, the customer
    // just doesn't get the branded confirmation (Stripe still sends its
    // own receipt). Log loudly so we can spot a regression in Vercel logs.
    console.error(`[stripe webhook] customer confirmation email FAILED for session=${params.sessionId}:`, err);
  }
}

/**
 * Alert email for purchase ATTEMPTS that didn't complete, declined cards,
 * abandoned checkouts, async payment failures. Without this, a customer
 * whose card declines is invisible: the order never lands, so Nigel has
 * no idea they tried. The May 2026 incident (customer's card declined,
 * we only spotted it because Nigel happened to log into the Stripe
 * dashboard manually) is exactly what this guards against.
 *
 * Failure to send is logged but never thrown, webhook still returns 200.
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
  const to = alertTo();
  if (!apiKey || !from) {
    console.warn("[stripe webhook] RESEND_API_KEY or RESEND_FROM_EMAIL missing, skipping purchase-attempt alert");
    return;
  }

  // Use formatEuro for consistency with the site's price display rules
  // (drop `.00` on whole-euro amounts). `params.currency` is unused here
  // because the site is EUR-only; if that ever changes, swap formatEuro
  // for an explicit currency-aware formatter.
  const formattedAmount = formatEuro(params.amount);
  const dateLabel = params.bookingLabel || params.bookingDate || "-";
  const slotLabel = params.bookingSlot || "-";

  let subject: string;
  let kindLabel: string;
  let urgencyLine: string;
  if (params.kind === "failed") {
    const reason = params.declineCode ? ` (${params.declineCode})` : "";
    subject = `⚠️ FAILED PAYMENT, ${params.customerName}, ${formattedAmount}${reason}`;
    kindLabel = "Payment FAILED";
    urgencyLine =
      "URGENT: Customer's card was declined. Call them now to suggest a different card before they give up on the booking.";
  } else if (params.kind === "expired") {
    subject = `⏰ Abandoned Checkout, ${params.customerName}, ${formattedAmount}`;
    kindLabel = "Checkout abandoned (24h timeout)";
    urgencyLine =
      "Customer reached the Stripe checkout page but never completed payment. Worth a follow-up call.";
  } else {
    subject = `⚠️ ASYNC PAYMENT FAILED, ${params.customerName}, ${formattedAmount}`;
    kindLabel = "Async payment FAILED";
    urgencyLine =
      "Customer's bank-transfer or delayed payment failed after checkout. They may not realise, call them.";
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
        `Email: ${params.email || "-"}`,
        `Phone: ${params.phone || "-"}`,
        `Address: ${params.installationAddress || "-"}`,
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
        <p><strong>Email:</strong> ${escapeHtml(params.email || "-")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(params.phone || "-")}</p>
        <p><strong>Address:</strong> ${escapeHtml(params.installationAddress || "-")}</p>
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
 * Common extractor, same field set the completed-checkout handler uses
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

  // Fail closed if either secret is missing, never process unsigned events
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

  // Idempotency, skip if we've already processed this event ID
  pruneProcessed();
  if (processedEvents.has(event.id)) {
    console.log(`[stripe webhook] duplicate event ${event.id} skipped`);
    return NextResponse.json({ received: true, duplicate: true });
  }
  processedEvents.set(event.id, Date.now());

  // Wrap the entire post-signature event-handling block so any unexpected
  // throw fires a site-alert AND returns 500 (so Stripe retries with
  // exponential backoff). Without this, a transient logLead/Calendly/
  // Resend failure inside an event handler would surface as a generic 500
  // in Stripe's webhook dashboard and Nigel would never see it.
  try {

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
      } catch (err) {
        // /api/checkout truncates the JSON-encoded configuration to ~490 chars
        // to fit Stripe's metadata cap, which can produce invalid JSON. Log
        // so we know we silently lost a customer's product Q&A, but don't
        // throw, the order is still valid without it.
        console.warn(
          `[stripe webhook] failed to parse session.metadata.configuration for session=${sessionId}:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    // Log paid order to tracking sheet, must await; fire-and-forget gets
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
      console.warn(`[stripe] no booking_date/booking_slot in session=${sessionId} metadata, Calendly skipped`);
    }

    // Server-side conversion fire to Google Ads + GA4. Backstops the
    // client-side gtag fire on /smartspace-payment-success, that fire is
    // unreliable due to adblockers, consent denials, and SPA navigation
    // killing JS before the pixel completes. transaction_id=sessionId
    // dedupes when both client + server fire.
    const [firstName, ...rest] = (customerName || "").trim().split(/\s+/);
    const lastName = rest.join(" ") || undefined;
    // .trim(), see src/app/api/contact/route.ts for the rationale.
    // Critical here: this is the money path. A trailing-newline env var
    // would have dropped every Stripe-purchase conversion silently.
    const paidLabel =
      (process.env.NEXT_PUBLIC_GADS_PAYMENT_SEND_TO || "")
        .trim()
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

    // Notify Nigel, runs after Calendly so we can include the outcome in
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

    // Mirror to SmartCRM (fire-and-forget; never blocks the webhook).
    // Previously absent on the paid-order path, meant every paying
    // customer was invisible to the CRM, while contact / booking /
    // free-consultation all mirrored correctly. Real money customers
    // are the most valuable record-set; biggest CRM-coverage hole.
    void sendToCrm({
      source: "paid_order",
      source_detail: productName,
      name: customerName,
      email,
      phone: phone || null,
      message: null,
      utm_source: (session.metadata?.utm_source as string) || null,
      utm_medium: (session.metadata?.utm_medium as string) || null,
      utm_campaign: (session.metadata?.utm_campaign as string) || null,
      utm_term: (session.metadata?.utm_term as string) || null,
      utm_content: (session.metadata?.utm_content as string) || null,
      gclid: gclid || null,
      referrer: (session.metadata?.referrer as string) || null,
      tags: ["paid-order", calendlyStatus === "failed" ? "calendly-failed" : "calendly-ok"],
      custom: {
        stripe_session_id: sessionId,
        product: productName,
        amount_eur: amountTotal,
        booking_date: bookingDate || null,
        booking_slot: bookingSlot || null,
        installation_address: installationAddress || null,
        configuration: configNote || null,
      },
    });

    // SMS for high-value orders (≥ €100) OR for any order where Calendly
    // creation FAILED (Nigel needs to know immediately so he can book
    // manually before the customer gives up). No-op if TWILIO_* env vars
    // aren't set.
    //
    // Format prioritises legibility over byte-count, at €0.05/segment
    // and ≤10 SMS/day, total cost is <€20/month even at maximum volume.
    // iPhone Messages auto-detects the URL at the bottom and makes it
    // tap-to-open the dashboard.
    if (amountTotal >= 100 || calendlyStatus === "failed") {
      const lines: string[] = [
        "Smart Space, new paid order",
        `${formatEuro(amountTotal)}, ${customerName}`,
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

      // Spec from metadata.configuration, same data we just wrote to
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
        lines.push("⚠️ CALENDLY FAILED, book manually");
        lines.push("");
      }

      lines.push("https://smart-space.ie/admin/leads");

      await sendSms(lines.join("\n"));
    }
  } else if (event.type === "payment_intent.payment_failed") {
    // Card declined / 3DS failed / fraud rule blocked / etc. The customer
    // is most likely still on the Stripe checkout page and CAN retry with
    // a different card, but they often don't bother. This alert is the
    // single most important "save the booking" signal: if Nigel calls
    // them inside 5 minutes, conversion typically rescues. Beyond an hour
    // they've usually moved on.
    const pi = event.data.object as Stripe.PaymentIntent;
    // The PI doesn't carry our metadata, we attach metadata to the
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
      // We don't currently use those, but log so we know if this changes.
      console.warn(
        `[stripe webhook] payment_intent.payment_failed ${pi.id}, no Checkout session, skipping alert`
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
        // Use PI amount as source of truth, session.amount_total can be
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
      // No way to contact them, Stripe didn't capture any details before
      // they bounced. Alert is pointless.
      console.log(
        `[stripe webhook] checkout.session.expired ${session.id}, no contact info captured, skipping alert`
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
    // actually settles. We don't currently accept any of those, Stripe
    // Checkout is card-only by default, but handle it for completeness
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
  } catch (handlerErr) {
    console.error(
      `[stripe webhook] handler threw for event ${event.id} type=${event.type}:`,
      handlerErr
    );
    // Remove from idempotency cache so Stripe's retry actually re-attempts
    // this event ID instead of being de-duped as "already processed".
    processedEvents.delete(event.id);
    await sendSiteAlert({
      category: "stripe-webhook",
      severity: "critical",
      summary: `Stripe webhook handler threw on ${event.type}`,
      details: [
        `Stripe event ID:    ${event.id}`,
        `Event type:         ${event.type}`,
        `Event created:      ${new Date((event.created ?? 0) * 1000).toISOString()}`,
        "",
        "The webhook returned 500 so Stripe will retry with exponential backoff,",
        "but if every retry hits the same throw, the customer's order won't be",
        "logged to the dashboard and Nigel won't get the order email until this is fixed.",
        "",
        "Check Vercel logs for the stack trace, then check the Stripe webhook",
        "deliveries page to manually replay the event once the bug is fixed:",
        `https://dashboard.stripe.com/webhooks`,
        "",
        handlerErr instanceof Error
          ? `${handlerErr.name}: ${handlerErr.message}\n\n${handlerErr.stack ?? ""}`
          : String(handlerErr),
      ].join("\n"),
      dedupeKey: `stripe-webhook:handler-throw:${event.type}:${handlerErr instanceof Error ? handlerErr.name : "unknown"}`,
    });
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
