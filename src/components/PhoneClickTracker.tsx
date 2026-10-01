"use client";

/**
 * Sitewide tel: link click tracker.
 *
 * Why this exists: paid users frequently click-to-call instead of
 * submitting forms, and a tap is the only trace most of them leave.
 *
 * ── A TAP IS NOT A CALL ──────────────────────────────────────────
 *
 * Until now every tap was sent as the "SS - Call (01 513 0424)" conversion,
 * worth EUR 30, from the browser and again from the server, and to GA4 as a
 * generate_lead. That action is the one Google's forwarding number feeds with
 * calls that actually connected, so a tap that never became a call was counted
 * beside the calls that did, at the same value, and the bidding learnt from
 * both as if they were equal. GA4's lead count took every tap as a lead.
 *
 * Now a tap goes to its own secondary action, "SS - Phone tap" (EUR 10), which
 * is reported but not bid on, from the browser only; GA4 gets a plain
 * phone_call_click with no value; and ChatGPT ads gets a custom event, not a
 * lead. The call action is untouched: layout.tsx still configures Google's
 * forwarding number with NEXT_PUBLIC_GADS_CALL_LABEL, and real calls are
 * counted there.
 *
 * The tap still reaches /api/track/phone-click by sendBeacon, which logs it
 * to the leads sheet so Nigel sees taps in /admin/leads. That route no longer
 * sends anything to Google.
 *
 * A visitor who refused or never answered the banner gets the browser's
 * cookieless Consent Mode ping, which is what /privacy says.
 *
 * Mount once in the root layout. Listens for clicks on any anchor
 * with an href starting `tel:` anywhere in the document.
 */

import { useEffect } from "react";
import { getAttribution } from "@/lib/attribution";
import { oaiPhoneTap } from "@/lib/chatgpt-pixel";

// .trim() guards against a trailing newline in the Vercel env var,
// a copy-paste artefact that previously made Google Ads reject every
// phone-click conversion as an unknown label. See matching trim in
// src/app/layout.tsx for the full story.
const GADS_PHONE_TAP_SEND_TO =
  process.env.NEXT_PUBLIC_GADS_PHONE_TAP_SEND_TO?.trim() ||
  "AW-17978501655/nA6TCOaaoYwdEJfU6PxC";
const PHONE_TAP_VALUE = 10;
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

      // Snapshot the page path BEFORE the dialer takes over, sendBeacon
      // payload travels with the unload event.
      const page = window.location.pathname + window.location.search;
      const attribution = getAttribution() ?? undefined;

      // ── The sheet log, via /api/track/phone-click ──
      // Fire this FIRST and synchronously. sendBeacon is fire-and-forget
      // but the browser guarantees the request reaches the server even
      // if the page is unloading (`tel:` link follow does count as an
      // unload on iOS). If sendBeacon isn't available (e.g. very old
      // browsers), fall back to fetch with keepalive, same guarantee.
      /*
       * One id per tap, minted here, for the tap conversion and the ChatGPT
       * ads event. Nothing on the server fires for a tap any more, so there is
       * nothing to share it with there; it still has to be unique, because a
       * conversion without one lets Google fold two taps into one.
       *
       * crypto.randomUUID is available in every browser that supports
       * sendBeacon; the fallback keeps a tap from being lost on an old one.
       */
      const conversionId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `pc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
          // Supported in Chromium/WebKit/Firefox, same semantic as
          // sendBeacon for our purposes.
          void fetch("/api/track/phone-click", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch((err) => {
            // Best-effort, the client gtag fires below are independent.
            // Logged (not swallowed silently) so we can see if every tap
            // is failing on a given browser / network path.
            console.warn("[phone-tracker] fetch fallback failed:", err);
          });
        }
        console.log("[phone-tracker] sheet log dispatched for", href);
      } catch (err) {
        // Never let a tracking failure intercept the call itself.
        console.warn("[phone-tracker] sheet log failed:", err);
      }

      // ChatGPT ads: a custom event, not a lead. Nothing until that pixel
      // exists and the visitor has accepted.
      oaiPhoneTap(conversionId);

      // ── Google Ads (the tap action) and GA4 ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (typeof w.gtag !== "function") {
        console.warn("[phone-tracker] gtag not loaded, tap not sent to Google");
        return;
      }

      w.gtag("event", "conversion", {
        send_to: GADS_PHONE_TAP_SEND_TO,
        value: PHONE_TAP_VALUE,
        currency: "EUR",
        transaction_id: conversionId,
        transport_type: "beacon",
        event_callback: () => console.log("[gtag] phone-tap conversion ack"),
      });

      // A plain event, no value: GA4's lead count is for enquiries.
      w.gtag("event", "phone_call_click", { transport_type: "beacon" });
      console.log("[gtag] phone tap tracked client-side:", href);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
