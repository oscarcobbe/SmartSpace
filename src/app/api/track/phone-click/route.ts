/**
 * Phone-click logging endpoint.
 *
 * PhoneClickTracker.tsx posts here with sendBeacon on every tap of the phone
 * number, and this writes the tap to the `Smart Space Leads` Google Sheet as a
 * "Contact Enquiry" row, so Nigel can see who's been tapping the number in
 * /admin/leads, previously totally invisible unless the caller also filled
 * the form.
 *
 * It used to fire the tap to Google as well, as the "SS - Call" conversion
 * through the Google Ads pixel and as a generate_lead through GA4's
 * Measurement Protocol, doubling the browser's own fires. A tap is now its
 * own secondary conversion, "SS - Phone tap", sent from the browser only (see PhoneClickTracker.tsx for why), so nothing here reaches
 * Google. Calls that connect are still counted by Google's forwarding number
 * against "SS - Call".
 *
 * Endpoint contract:
 *   POST /api/track/phone-click
 *   Body: {
 *     phone?: string,         // E.164 dialed; defaults to +35315130424
 *     page?: string,          // pathname where the tap happened
 *     attribution?: {         // from localStorage (ss_attribution)
 *       gclid?: string,
 *       landingPage?: string,
 *       referrer?: string,
 *       utmSource?: string,
 *       utmMedium?: string,
 *       utmCampaign?: string,
 *       utmContent?: string,
 *       utmTerm?: string,
 *     },
 *   }
 *   Returns: 204 (no body, no caching), designed to be ignored by the
 *   client because the caller used sendBeacon and isn't waiting for a
 *   response.
 *
 * Designed to NEVER throw. Lead-log failures are logged but the endpoint
 * always returns 204 so the client doesn't show errors.
 */

import { NextResponse } from "next/server";
import { logLead, type AttributionRecord } from "@/lib/leads";
import { BUSINESS_PHONE_E164 } from "@/lib/business-constants";

// Force dynamic, never cache, every phone click is its own sheet row.
export const dynamic = "force-dynamic";

interface PhoneClickBody {
  phone?: string;
  page?: string;
  attribution?: AttributionRecord;
}

export async function POST(request: Request) {
  let body: PhoneClickBody = {};
  try {
    // sendBeacon sends Blob with text/plain by default; JSON.parse handles it.
    const raw = await request.text();
    if (raw) body = JSON.parse(raw) as PhoneClickBody;
  } catch (parseErr) {
    // sendBeacon failures land here. Don't 4xx, the user already started
    // a phone call. Just log and move on.
    console.warn("[phone-click] body parse failed:", parseErr);
  }

  const phone = (body.phone || BUSINESS_PHONE_E164).trim();
  const page = (body.page || "/").trim();
  const attribution = body.attribution;

  // Log to the leads sheet so phone taps appear in /admin/leads alongside
  // form submits + bookings. Without this, phone taps are invisible to
  // Nigel's day-to-day dashboard.
  await logLead({
    type: "Contact Enquiry",
    phone,
    notes: `Phone tap on ${page}, caller has NOT yet completed a form. Watch the call log on the office line for the matching incoming number.`,
    source: "phone_click",
    attribution,
  });

  // 204 No Content, sendBeacon doesn't read the response, but returning
  // 204 (rather than 200) makes any accidental fetch+await callers also
  // happy to not see a body. Cache-Control: no-store stops CDNs from
  // collapsing repeated calls into one (every tap is a real row).
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// Reject non-POST methods, phone clicks always POST.
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed, POST /api/track/phone-click with JSON body" },
    { status: 405 }
  );
}
