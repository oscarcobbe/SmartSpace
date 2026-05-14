import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { createBookingEvent } from "@/lib/calendly";
import { logLead, type AttributionRecord } from "@/lib/leads";
import { fireServerConversion } from "@/lib/server-conversions";
import { sendToCrm } from "@/lib/crm";
import { alertTo } from "@/lib/business-constants";

// POST routes are inherently dynamic but explicit is better — without
// this, Next.js may try static optimization on a future major.
export const dynamic = "force-dynamic";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  bookingDate?: string;
  bookingSlot?: string;
  bookingLabel?: string;
}

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface FreeCheckoutBody {
  items: CartItem[];
  customer?: CustomerDetails;
  attribution?: AttributionRecord;
  gclid?: string; // legacy
}



function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  try {
    const { items, customer, attribution, gclid }: FreeCheckoutBody = await request.json();
    const finalAttribution = attribution ?? (gclid ? { gclid } : undefined);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    // Anti-abuse: this route writes to Calendly (consuming real slots
    // in Nigel's calendar) and triggers Resend emails (real cost). All
    // three of these were previously bypass-able via curl:
    //
    //   - items wasn't validated against the catalogue, so an attacker
    //     could put any productName string in (which then ends up in
    //     Calendly Q&A, Sheet, and Nigel's email subject)
    //   - customer was optional, falling back to nigel@smart-space.ie,
    //     which meant an attacker could book Nigel a calendar slot
    //     against himself silently
    //   - no email format validation
    //
    // Now: products are restricted to a known free-consultation set,
    // customer.email is required and format-validated.
    const ALLOWED_FREE_PRODUCTS = new Set(["free-consultation"]);
    const allItemsAreFree = items.every((i) => i.price === 0 && ALLOWED_FREE_PRODUCTS.has(i.productId));
    if (!allItemsAreFree) {
      console.warn("[free-checkout] rejected non-free or non-allow-listed product", { items });
      return NextResponse.json({ error: "Invalid product for free checkout" }, { status: 400 });
    }

    if (!customer?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      return NextResponse.json({ error: "Valid customer email is required" }, { status: 400 });
    }

    // Find the item with booking info
    const bookedItem = items.find((i) => i.bookingDate && i.bookingSlot);

    if (bookedItem?.bookingDate && bookedItem?.bookingSlot) {
      const customerName = customer.name || "Free Consultation";
      const customerEmail = customer.email.trim();
      const customerPhone = customer.phone;
      const customerAddress = customer.address;

      // Create Calendly booking for consultation with real customer details
      const result = await createBookingEvent({
        date: bookedItem.bookingDate,
        timeSlot: bookedItem.bookingSlot,
        customerName,
        email: customerEmail,
        phone: customerPhone,
        productTitle: bookedItem.name,
        orderId: `free-${Date.now()}`,
        kind: "consultation",
        address: customerAddress,
      });

      if (result) {
        console.log("[free-checkout] Calendly booking created:", result.eventId);
      } else {
        console.error(
          `[free-checkout] Calendly booking failed for ${customerEmail} on ${bookedItem.bookingDate} ${bookedItem.bookingSlot}`
        );
        // No debug object in the response — was previously leaking the
        // internal slot/date/kind to the client unnecessarily.
        return NextResponse.json(
          { error: "Failed to book your consultation. Please try again or contact us." },
          { status: 500 }
        );
      }

      // Send notification email to Nigel with customer details.
      // .env CONTACT_TO_EMAIL takes precedence over the hardcoded fallback
      // so Nigel can route alerts to a team inbox without a redeploy. All
      // other handlers (contact, booking, stripe webhook) do this; this one
      // was the odd-one-out, baking nigel@smart-space.ie into code.
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM_EMAIL;
      const notifyTo = alertTo();
      if (apiKey && from) {
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from,
          to: [notifyTo],
          replyTo: customerEmail,
          subject: `New Free Consultation Booking — ${customerName}`,
          text: [
            `New free consultation booked on smart-space.ie`,
            "",
            `Name: ${customerName}`,
            `Email: ${customerEmail}`,
            `Phone: ${customerPhone || "—"}`,
            `Address: ${customerAddress || "—"}`,
            `Date: ${bookedItem.bookingLabel || bookedItem.bookingDate}`,
            `Time Slot: ${bookedItem.bookingSlot}`,
          ].join("\n"),
          html: `
            <h2>New Free Consultation Booking</h2>
            <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(customerPhone || "—")}</p>
            <p><strong>Address:</strong> ${escapeHtml(customerAddress || "—")}</p>
            <hr />
            <p><strong>Date:</strong> ${escapeHtml(bookedItem.bookingLabel || bookedItem.bookingDate || "")}</p>
            <p><strong>Time Slot:</strong> ${escapeHtml(bookedItem.bookingSlot || "")}</p>
          `,
        });
      }
    }

    // Await so the row reaches the sheet before the function exits.
    // Fire-and-forget gets killed by Vercel's serverless runtime.
    await logLead({
      type: "Free Consultation",
      name: customer?.name,
      email: customer?.email,
      phone: customer?.phone,
      address: customer?.address,
      product: bookedItem?.name || "Free Home Consultation",
      amount: 0,
      currency: "EUR",
      bookingDate: bookedItem?.bookingLabel || bookedItem?.bookingDate,
      bookingSlot: bookedItem?.bookingSlot,
      attribution: finalAttribution,
      source: "smart-space.ie",
    });

    // Server-side conversion fire for the Free Consultation. Mirrors the
    // contact + booking + Stripe-paid paths: the client-side gtag fire on
    // the success page is unreliable (adblockers, consent denials, tab
    // close) so we double-fire from the server. Same pattern: shared
    // conversionId acts as transaction_id so Google Ads dedupes.
    const conversionId = randomUUID();
    // .trim() — see src/app/api/contact/route.ts for the rationale.
    const freeConsultLabel =
      (process.env.NEXT_PUBLIC_GADS_FREE_CONSULT_SEND_TO || "")
        .trim()
        .replace(/^AW-\d+\//, "") || "fH4ZCMHv7ZocEJfU6PxC";
    const [firstName, ...rest] = (customer?.name?.trim() || "").split(/\s+/);
    const lastName = rest.join(" ") || undefined;
    await fireServerConversion({
      gadsLabel: freeConsultLabel,
      ga4EventName: "generate_lead",
      value: 50, // matches FREE_CONSULTATION_VALUE on the success page
      currency: "EUR",
      transactionId: conversionId,
      gclid: finalAttribution?.gclid || undefined,
      email: customer?.email || undefined,
      phone: customer?.phone || undefined,
      firstName: firstName || undefined,
      lastName,
      extraParams: { lead_source: "free_consultation" },
    });

    // Mirror to SmartCRM (fire-and-forget; never blocks the response).
    // Previously absent on this path — meant every free-consultation
    // booking was invisible to the CRM, even though the contact form
    // and the paid booking endpoint both mirror correctly.
    void sendToCrm({
      source: "free_consultation",
      source_detail: bookedItem?.name || "Free Home Consultation",
      name: customer?.name || null,
      email: customer?.email || null,
      phone: customer?.phone || null,
      message: null,
      utm_source: finalAttribution?.utmSource ?? null,
      utm_medium: finalAttribution?.utmMedium ?? null,
      utm_campaign: finalAttribution?.utmCampaign ?? null,
      utm_term: finalAttribution?.utmTerm ?? null,
      utm_content: finalAttribution?.utmContent ?? null,
      gclid: finalAttribution?.gclid ?? null,
      referrer: finalAttribution?.referrer ?? null,
      tags: ["free-consultation"],
      custom: {
        conversion_id: conversionId,
        booking_date: bookedItem?.bookingDate || null,
        booking_slot: bookedItem?.bookingSlot || null,
        address: customer?.address || null,
      },
    });

    return NextResponse.json({ success: true, conversionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Free checkout error:", message);
    return NextResponse.json({ error: `Booking failed: ${message}` }, { status: 500 });
  }
}
