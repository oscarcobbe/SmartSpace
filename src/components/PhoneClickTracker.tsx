"use client";

/**
 * Sitewide tel: link click tracker — DUAL CHANNEL (client + server).
 *
 * Why this exists: paid users frequently click-to-call instead of
 * submitting forms. Without this, every phone-call conversion that
 * starts with an ad click + a tel: tap on the site is invisible to
 * Google Ads.
 *
 * As of 2026-05-18, this component fires THREE pings on every tel: tap:
 *
 *   1. gtag('event', 'conversion', …) → client-side Google Ads pixel.
 *      Works perfectly when the user has accepted cookies (ad_storage
 *      granted) and has no blocker. Misses ~20-40% of taps otherwise.
 *
 *   2. gtag('event', 'generate_lead', …) → client-side GA4 event so
 *      the tap also lands in GA4's lead-gen funnel.
 *
 *   3. navigator.sendBeacon('/api/track/phone-click', …) → server-side
 *      backstop. POSTs the stored attribution (gclid + utm) to our own
 *      API, which then fires BOTH GA4 Measurement Protocol AND the
 *      Google Ads conversion pixel from the server. Bypasses adblockers
 *      (same-origin), bypasses ad_storage=denied (explicit gclid not
 *      cookie-based), and survives the immediate `location = tel:…`
 *      navigation (sendBeacon is keep-alive).
 *
 * The result: every tap reaches Google through at least one channel,
 * regardless of consent state, browser, or adblocker. Google Ads dedupes
 * the gtag-side fire and the server-side pixel by `transaction_id`,
 * so we don't double-count.
 *
 * Mount once in the root layout. Listens for clicks on any anchor
 * with an href starting `tel:` anywhere in the document.
 */

import { useEffect } from "react";
import { getAttribution } from "@/lib/attribution";

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

      // Snapshot the page path BEFORE the dialer takes over — sendBeacon
      // payload travels with the unload event.
      const page = window.location.pathname + window.location.search;
      const attribution = getAttribution() ?? undefined;

      // ── CHANNEL 3: server-side fire via /api/track/phone-click ──
      // Fire this FIRST and synchronously. sendBeacon is fire-and-forget
      // but the browser guarantees the request reaches the server even
      // if the page is unloading (`tel:` link follow does count as an
      // unload on iOS). If sendBeacon isn't available (e.g. very old
      // browsers), fall back to fetch with keepalive — same guarantee.
      const body = JSON.stringify({ phone: PHONE, page, attribution });
      try {
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          // sendBeacon uses Content-Type: text/plain by default. Our API
          // accepts that fine (it just JSON.parses the raw text). Using
          // a Blob lets us be explicit about the encoding.
          const blob = new Blob([body], { type: "application/json" });
          navigator.sendBeacon("/api/track/phone-click", blob);
        } else {
          // Fallback: fetch with keepalive: true tells the browser to
          // keep the request alive even after the document unloads.
          // Supported in Chromium/WebKit/Firefox — same semantic as
          // sendBeacon for our purposes.
          void fetch("/api/track/phone-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch((err) => {
            // Best-effort — the client gtag fires below are independent.
            // Logged (not swallowed silently) so we can see if every tap
            // is failing on a given browser / network path.
            console.warn("[phone-tracker] fetch fallback failed:", err);
          });
        }
        console.log("[phone-tracker] server-side fire dispatched for", href);
      } catch (err) {
        // Never let a tracking failure intercept the call itself.
        console.warn("[phone-tracker] server fire failed:", err);
      }

      // ── CHANNELS 1 + 2: client-side gtag fires (Google Ads + GA4) ──
      // These ride alongside the server fire. If the user accepted
      // cookies and isn't running a blocker, gtag wins on speed and
      // includes the Google-managed _gcl_aw cookie which makes the
      // Enhanced Conversions match richer than the server-side gclid
      // alone. Google Ads dedupes against the server fire by
      // transaction_id (the server fire generates one; client fire
      // currently doesn't — Google falls back to its own cookie-based
      // dedupe, which is good enough).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (typeof w.gtag !== "function") {
        console.warn("[phone-tracker] gtag not loaded — client fire skipped (server fire still went)");
        return;
      }

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
      console.log("[gtag] phone click tracked client-side:", href);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
