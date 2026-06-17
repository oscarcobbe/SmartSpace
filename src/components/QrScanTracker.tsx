"use client";

/**
 * QR scan landing tracker, fires a one-shot sendBeacon to
 * /api/track/qr-scan when the current URL has the `?ref=` query param
 * matching one of our tracked QR codes.
 *
 * Mount this on any landing page that has a QR pointing at it. The
 * component does nothing visible, the only customer-side effect is
 * one tiny beacon POST on mount.
 *
 * Currently tracked refs:
 *   ?ref=card   , installer business card QR
 *
 * Why sendBeacon (vs fetch): browsers guarantee delivery even if the
 * customer immediately leaves the page or backgrounds the tab. Fetch
 * can be cancelled mid-flight; sendBeacon cannot.
 *
 * Idempotency: a sessionStorage flag prevents double-counting if the
 * customer refreshes the page or React strict-mode runs the effect
 * twice in dev.
 */

import { useEffect } from "react";

const REF_TO_SOURCE: Record<string, string> = {
  card: "business-card:installer",
};

export default function QrScanTracker() {
  useEffect(() => {
    // Guard: only run in the browser.
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    const source = REF_TO_SOURCE[ref];
    if (!source) return; // unknown ref, ignore so random ?ref=x doesn't log

    // Same-tab dedupe: if the customer reloads the page, we don't
    // re-count. Cleared when the tab closes (sessionStorage scope).
    const dedupeKey = `qr-scan-fired:${ref}`;
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");

    const payload = JSON.stringify({
      source,
      page: window.location.pathname + window.location.search,
    });

    // sendBeacon is keep-alive, survives even if the customer
    // immediately navigates away or closes the tab.
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track/qr-scan", blob);
    } else {
      // Fallback for older browsers, fire-and-forget fetch.
      fetch("/api/track/qr-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Never let a tracking failure bubble up to the customer.
      });
    }
  }, []);

  return null;
}
