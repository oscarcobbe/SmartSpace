/**
 * Phone-click tracking endpoint.
 *
 * Why this exists: client-side gtag.js misses 20-40% of phone-click
 * conversions in production for the same reasons every other client-side
 * tracking pixel does:
 *
 *   1. Ad blockers / privacy extensions silently drop the gtag ping.
 *   2. Consent Mode v2 default-deny: until the user accepts cookies
 *      `ad_storage` is "denied", so gtag fires anonymised pings that
 *      Google statistically models — at low call volume (we see ~10
 *      calls / month) the modelled count is effectively zero.
 *   3. The tap on a `tel:` link starts the dialer immediately. On many
 *      mobile browsers the page is suspended before the gtag ping has
 *      time to flush, even with `transport_type: "beacon"`.
 *   4. iOS Safari's link-handling sometimes navigates away before the
 *      `event_callback` resolves.
 *
 * THIS endpoint is the server-side backstop. PhoneClickTracker.tsx POSTs
 * here with sendBeacon() in parallel with the gtag fire. Server-side:
 *   - No cookies needed (gclid is passed explicitly from localStorage).
 *   - Adblockers can't intercept (same-origin POST to our own API).
 *   - The fetch survives the page navigating to the dialer because we
 *     POST via navigator.sendBeacon — keep-alive even on unload.
 *   - We then fire to BOTH GA4 Measurement Protocol AND the Google Ads
 *     conversion pixel from the server, giving Google two chances to
 *     attribute the call back to the original paid click.
 *
 * Side benefit: every phone tap also lands in the `Smart Space Leads`
 * Google Sheet as a "Contact Enquiry" row, so Nigel can see who's
 * been tapping the number in /admin/leads — previously totally invisible
 * unless the caller also filled the form.
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
 *     }
 *   }
 *   Returns: 204 (no body, no caching) — designed to be ignored by the
 *   client because the caller used sendBeacon and isn't waiting for a
 *   response.
 *
 * Designed to NEVER throw. Conversion + lead-log failures are logged but
 * the endpoint always returns 204 so the client doesn't show errors.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { fireServerConversion } from "@/lib/server-conversions";
import { logLead, type AttributionRecord } from "@/lib/leads";
import { BUSINESS_PHONE_E164 } from "@/lib/business-constants";

// Force dynamic — never cache, every phone click is a unique conversion fire.
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
    // sendBeacon failures land here. Don't 4xx — the user already started
    // a phone call. Just log and move on.
    console.warn("[phone-click] body parse failed:", parseErr);
  }

  const phone = (body.phone || BUSINESS_PHONE_E164).trim();
  const page = (body.page || "/").trim();
  const attribution = body.attribution;

  // Conversion label pulled from env so it can be rotated in Vercel without
  // a code redeploy. .trim() defends against trailing-newline copy-paste
  // contamination (see src/app/layout.tsx for the post-mortem).
  const callLabel = (process.env.NEXT_PUBLIC_GADS_CALL_LABEL || "")
    .trim()
    .replace(/^AW-\d+\//, "")
    .replace(/\s+/g, "");

  // Stable transaction ID — Google Ads + GA4 dedupe by this, so even if
  // client-side gtag AND this server fire both arrive, only one conversion
  // counts. The client-side PhoneClickTracker.tsx does NOT currently pass
  // a transaction_id — TODO add one if we see double-counting in Ads.
  const conversionId = randomUUID();

  // Fire both server-side channels (GA4 MP + Google Ads pixel). Best-effort,
  // 4s ceiling enforced inside fireServerConversion. Never throws.
  if (callLabel) {
    await fireServerConversion({
      gadsLabel: callLabel,
      ga4EventName: "generate_lead",
      value: 30,
      currency: "EUR",
      transactionId: conversionId,
      gclid: attribution?.gclid,
      // No email/phone yet — phone clicks happen before the user enters
      // identifying details. Enhanced Conversions matching will use the
      // gclid alone.
      extraParams: {
        lead_source: "phone_click",
        clicked_page: page,
        phone_number: phone,
      },
    });
  } else {
    console.warn(
      "[phone-click] NEXT_PUBLIC_GADS_CALL_LABEL not set — skipping conversion fire (lead-log still happens)"
    );
  }

  // Log to the leads sheet so phone taps appear in /admin/leads alongside
  // form submits + bookings. Without this, phone-tap conversions are
  // counted by Google Ads but invisible to Nigel's day-to-day dashboard.
  await logLead({
    type: "Contact Enquiry",
    phone,
    notes: `Phone tap on ${page} — caller has NOT yet completed a form. Watch the call log on the office line for the matching incoming number.`,
    source: "phone_click",
    attribution,
  });

  // 204 No Content — sendBeacon doesn't read the response, but returning
  // 204 (rather than 200) makes any accidental fetch+await callers also
  // happy to not see a body. Cache-Control: no-store stops CDNs from
  // collapsing repeated calls into one (every tap is a real conversion).
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

// Reject non-POST methods — phone clicks always POST.
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed — POST /api/track/phone-click with JSON body" },
    { status: 405 }
  );
}
