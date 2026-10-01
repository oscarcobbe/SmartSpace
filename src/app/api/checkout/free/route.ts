import { NextResponse } from "next/server";
import { consentFrom, openAiConsented, recordEnquiryConsent, type ConsentInput } from "@/lib/ad-consent";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { createBookingEvent } from "@/lib/calendly";
import { logLead, SHEET_BACKGROUND, type AttributionRecord } from "@/lib/leads";
import { browserContext, fireServerConversion } from "@/lib/server-conversions";
import { sendToCrm } from "@/lib/crm";
import { alertTo, monitorBcc } from "@/lib/business-constants";
import { afterResponse, AFTER_CEILING } from "@/lib/after-response";
import { foundUsDetailFrom, foundUsFrom, notesWithFoundUs } from "@/lib/found-us";
import { sendConsultationConfirmation } from "@/lib/email/send-customer";

// POST routes are inherently dynamic but explicit is better, without
// this, Next.js may try static optimization on a future major.
export const dynamic = "force-dynamic";
/* The answer waits only for Calendly and Nigel's email, but the work after it
   can need up to nine minutes: a sheet append that ends in doubt is read back
   only once it has certainly finished (SHEET_BACKGROUND in src/lib/leads.ts),
   and waitUntil only keeps the function alive while maxDuration allows. */
export const maxDuration = 600;

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
  /** The cookie banner's stored answer, read in the browser. */
  consent?: ConsentInput | null;
  gclid?: string; // legacy
  /** "How did you hear about us?", optional: src/lib/found-us.ts. */
  found_us?: unknown;
  /** The visitor's own words under it, optional. */
  found_us_detail?: unknown;
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
    // Parse JSON in its own try-block so bot/scanner traffic with malformed
    // bodies returns a quiet 400 rather than dropping into the outer catch
    // and being logged as a real checkout failure.
    let parsed: FreeCheckoutBody;
    try {
      parsed = (await request.json()) as FreeCheckoutBody;
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON" },
        { status: 400 }
      );
    }
    const { items, customer, attribution, gclid, consent } = parsed;
    const finalAttribution = attribution ?? (gclid ? { gclid } : undefined);
    /* One of the CRM's FOUND_US keys or "" (not answered, or not an answer). */
    const foundUs = foundUsFrom(parsed.found_us);
    const foundUsDetail = foundUsDetailFrom(parsed.found_us_detail);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }
    if (items.length > 5) {
      return NextResponse.json({ error: "Too many items" }, { status: 400 });
    }

    // Cap customer field lengths so a 10MB POST can't blow up Resend
    // bandwidth or pump absurd rows into the Sheet / Calendly Q&A.
    if (customer) {
      if (customer.name && customer.name.length > 200) {
        return NextResponse.json({ error: "Name is too long (max 200 characters)" }, { status: 400 });
      }
      if (customer.email && customer.email.length > 320) {
        return NextResponse.json({ error: "Email is too long (max 320 characters)" }, { status: 400 });
      }
      if (customer.phone && customer.phone.length > 40) {
        return NextResponse.json({ error: "Phone is too long (max 40 characters)" }, { status: 400 });
      }
      if (customer.address && customer.address.length > 500) {
        return NextResponse.json({ error: "Address is too long (max 500 characters)" }, { status: 400 });
      }
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
        // No debug object in the response, was previously leaking the
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
        const sent = await resend.emails.send({
          from,
          to: [notifyTo],
          bcc: monitorBcc(),
          replyTo: customerEmail,
          subject: `New Free Consultation Booking, ${customerName}`,
          text: [
            `New free consultation booked on smart-space.ie`,
            "",
            `Name: ${customerName}`,
            `Email: ${customerEmail}`,
            `Phone: ${customerPhone || "-"}`,
            `Address: ${customerAddress || "-"}`,
            `Date: ${bookedItem.bookingLabel || bookedItem.bookingDate}`,
            `Time Slot: ${bookedItem.bookingSlot}`,
          ].join("\n"),
          html: `
            <h2>New Free Consultation Booking</h2>
            <p><strong>Name:</strong> ${escapeHtml(customerName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(customerEmail)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(customerPhone || "-")}</p>
            <p><strong>Address:</strong> ${escapeHtml(customerAddress || "-")}</p>
            <hr />
            <p><strong>Date:</strong> ${escapeHtml(bookedItem.bookingLabel || bookedItem.bookingDate || "")}</p>
            <p><strong>Time Slot:</strong> ${escapeHtml(bookedItem.bookingSlot || "")}</p>
          `,
        });
        /* The booking is in Nigel's Calendly either way, so the visitor still
           gets their confirmation; this only makes a lost email visible. */
        if (sent.error) {
          console.error("[free-checkout] booking email to Nigel rejected by Resend:", JSON.stringify(sent.error));
        }
      }
    }

    /*
     * The booking is in Nigel's Calendly and his email has gone (copied to
     * FourWinds), which is all the visitor's answer waits for. The rest runs
     * after the answer, through afterResponse (src/lib/after-response.ts):
     * the consent record, the leads sheet, the server conversion and the CRM
     * mirror. This route used to await them one after another, the sheet
     * alone for up to 23.5 s, before the page could move to the success page
     * where the browser conversion fires.
     *
     * waitUntil, not `void`: Vercel can stop a function once it has answered.
     * The CRM mirror here was a bare `void sendToCrm(...)`, one possible
     * reason free consultations with a consent row have no CRM lead.
     * scripts/check-lead-routes-answer-first.mjs fails the build if any of
     * these is awaited before the answer or started outside afterResponse.
     */

    // Server-side conversion id for the Free Consultation. Mirrors the
    // contact + booking + Stripe-paid paths: the client-side gtag fire on
    // the success page is unreliable (adblockers, consent denials, tab
    // close) so we double-fire from the server. Same pattern: shared
    // conversionId acts as transaction_id so Google Ads dedupes.
    const conversionId = randomUUID();
    // .trim(), see src/app/api/contact/route.ts for the rationale.
    const freeConsultLabel =
      (process.env.NEXT_PUBLIC_GADS_FREE_CONSULT_SEND_TO || "")
        .trim()
        .replace(/^AW-\d+\//, "") || "fH4ZCMHv7ZocEJfU6PxC";
    const [firstName, ...rest] = (customer?.name?.trim() || "").split(/\s+/);
    const lastName = rest.join(" ") || undefined;

    /* The enquirer's cookie answer, kept so a job they later pay by payment
       link can be reported to Google with the consent they gave here. */
    /* The customer's own confirmation, once Nigel has signed it off in the
       CRM. Until then they get Calendly's email only, as before. */
    if (bookedItem?.bookingDate && bookedItem?.bookingSlot && customer?.email) {
      const booked = { date: bookedItem.bookingDate, slot: bookedItem.bookingSlot };
      afterResponse("customer confirmation", AFTER_CEILING.email, () =>
        sendConsultationConfirmation({
          name: customer.name || "",
          email: customer.email.trim(),
          dateIso: booked.date,
          slotValue: booked.slot,
          address: customer.address,
        }),
      );
    }

    afterResponse("consent record", AFTER_CEILING.consent, () =>
      recordEnquiryConsent({ email: customer?.email, phone: customer?.phone, consent, source: "free_consultation" }),
    );

    afterResponse("leads sheet", AFTER_CEILING.sheet, () =>
      logLead(
        {
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
          notes: notesWithFoundUs(undefined, foundUs, foundUsDetail),
        },
        // Nobody is waiting now: room for a cold start inside the first
        // append, and for an append that ended in doubt to settle before the
        // sheet is read and, only if the row is absent, sent once more.
        SHEET_BACKGROUND,
      ),
    );

    const browser = browserContext(request);
    afterResponse("server conversion", AFTER_CEILING.conversion, () =>
      fireServerConversion({
        gadsLabel: freeConsultLabel,
        ga4EventName: "server_lead",
        value: 50, // matches FREE_CONSULTATION_VALUE on the success page
        currency: "EUR",
        transactionId: conversionId,
        gclid: finalAttribution?.gclid || undefined,
        email: customer?.email || undefined,
        phone: customer?.phone || undefined,
        firstName: firstName || undefined,
        lastName,
        extraParams: { lead_source: "free_consultation" },
        adConsent: consentFrom(consent)?.decision ?? null,
        browser,
        openAi: { type: "lead_created", consented: openAiConsented(consentFrom(consent)) },
      }),
    );

    // Mirror to SmartCRM. Previously absent on this path, meant every
    // free-consultation booking was invisible to the CRM, even though the
    // contact form and the paid booking endpoint both mirror correctly.
    afterResponse("crm mirror", AFTER_CEILING.crm, () =>
      sendToCrm({
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
          found_us: foundUs || null,
          found_us_detail: foundUsDetail || null,
        },
      }),
    );

    return NextResponse.json({ success: true, conversionId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Free checkout error:", message);
    return NextResponse.json({ error: `Booking failed: ${message}` }, { status: 500 });
  }
}
