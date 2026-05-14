"use client";

/**
 * Sitewide tel: link click tracker.
 *
 * Why this exists: paid users frequently click-to-call instead of
 * submitting forms. Without this, every phone-call conversion that
 * starts with an ad click + a tel: tap on the site is invisible to
 * Google Ads. The site-wide gtag config in src/app/layout.tsx already
 * registers a `phone_conversion_number` (gated by NEXT_PUBLIC_GADS_CALL_LABEL)
 * for Google's automatic phone-tracking — but that uses Google's
 * forwarding-number swap, which only works on indexed pages and is
 * defeated by tab-switching. This component is the explicit fallback:
 * every tel: click also fires a `generate_lead` GA4 event AND a
 * Google Ads conversion ping.
 *
 * Mount once in the root layout. Listens for clicks on any anchor
 * with an href starting `tel:` anywhere in the document.
 */

import { useEffect } from "react";

// .trim() guards against a trailing newline in the Vercel env var —
// a copy-paste artefact that previously made Google Ads reject every
// phone-click conversion as an unknown label. See matching trim in
// src/app/layout.tsx for the full story.
const GADS_CALL_LABEL = process.env.NEXT_PUBLIC_GADS_CALL_LABEL?.trim();
const GADS_ACCOUNT = "AW-17978501655";
const PHONE = "+35315130424";

export default function PhoneClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (!href.startsWith("tel:")) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (typeof w.gtag !== "function") {
        console.warn("[phone-tracker] gtag not loaded — phone click NOT tracked");
        return;
      }

      // Fire the Google Ads phone-call conversion if the env var is set.
      if (GADS_CALL_LABEL) {
        w.gtag("event", "conversion", {
          send_to: `${GADS_ACCOUNT}/${GADS_CALL_LABEL}`,
          value: 30,
          currency: "EUR",
          transport_type: "beacon",
          event_callback: () => console.log("[gtag] phone-call conversion ack"),
        });
      }

      // GA4 recommended event so the call shows up in GA4's lead-gen
      // funnel even if the Google Ads side isn't configured yet.
      w.gtag("event", "generate_lead", {
        currency: "EUR",
        value: 30,
        lead_source: "phone_click",
        phone_number: PHONE,
        transport_type: "beacon",
      });
      console.log("[gtag] phone click tracked:", href);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
