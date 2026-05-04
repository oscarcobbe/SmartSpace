"use client";

/**
 * Cookie consent banner — wires up Google Consent Mode v2.
 *
 * Why this exists: Smart Space serves Ireland (EU/EEA). Without Consent
 * Mode v2 the Google Ads + GA4 tags collect zero ad-personalisation
 * signals from EEA users, which means Smart Bidding can't optimise on
 * that traffic and our enhanced-conversion data is rejected.
 *
 * The default-deny `gtag('consent','default',...)` call lives in
 * `src/app/layout.tsx` and runs BEFORE the gtag.js bootstrap so that the
 * very first page load is consent-compliant. This component then prompts
 * the user and fires `gtag('consent','update',...)` to either grant or
 * keep-denying once they choose.
 *
 * Storage: `localStorage["ss_consent"]` = "granted" | "denied". 12-month
 * TTL (re-prompt yearly per ePrivacy guidance).
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "ss_consent";
const TTL_MS = 365 * 24 * 60 * 60 * 1000;

type Decision = "granted" | "denied";
interface StoredConsent {
  decision: Decision;
  decidedAt: number;
}

function loadStored(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (Date.now() - parsed.decidedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function fireConsentUpdate(decision: Decision) {
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  if (decision === "granted") {
    w.gtag("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
    });
  } else {
    // Reject = leave everything denied (the default), but explicitly send
    // an update so Google Ads knows the user actively refused (vs. just
    // not having decided yet — improves modeled conversion accuracy).
    w.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      // Re-apply the stored decision on every page load so consent state
      // survives the gtag.js re-bootstrap that happens on hard navigations.
      fireConsentUpdate(stored.decision);
      return;
    }
    // Small delay so the banner doesn't flash before the page paints
    const t = window.setTimeout(() => setVisible(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  function decide(decision: Decision) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ decision, decidedAt: Date.now() } satisfies StoredConsent)
      );
    } catch {
      // Storage may be blocked — still fire the consent update so it
      // applies for this session at least.
    }
    fireConsentUpdate(decision);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-md z-[1000] bg-white border border-gray-200 rounded-2xl shadow-xl p-5 sm:p-6"
    >
      <h2 className="text-sm font-bold text-gray-900 mb-2">Cookies on Smart Space</h2>
      <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
        We use cookies to measure ad performance and understand how visitors use the site. You can
        accept all, or only essential cookies. You can change your choice anytime. See our{" "}
        <a href="/privacy" className="text-brand-500 hover:underline">privacy policy</a> for details.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={() => decide("granted")}
          className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-full transition-colors"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => decide("denied")}
          className="flex-1 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-full border border-gray-200 transition-colors"
        >
          Essential only
        </button>
      </div>
    </div>
  );
}
