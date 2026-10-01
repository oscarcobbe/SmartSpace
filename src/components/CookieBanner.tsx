"use client";

/**
 * Cookie consent banner, wires up Google Consent Mode v2.
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
 * Storage: `localStorage["ss_consent"]` = {decision, decidedAt, v}. 12-month
 * TTL (re-prompt yearly per ePrivacy guidance). v is the version of the
 * privacy notice the answer was given under (src/lib/consent-version.ts).
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CONSENT_VERSION } from "@/lib/consent-version";

const STORAGE_KEY = "ss_consent";
const TTL_MS = 365 * 24 * 60 * 60 * 1000;

type Decision = "granted" | "denied";
interface StoredConsent {
  decision: Decision;
  decidedAt: number;
  /** Which privacy notice the answer was given under. Absent before 1 October
      2026, which reads as 1: an Accept for Google alone, not for OpenAI. */
  v?: number;
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
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  };

  /*
   * Record the answer itself, before anything else and whichever way it goes.
   *
   * Google Ads only ever sees visitors who press Accept. An unanswered banner
   * produces no conversion ping at all, while GA4 keeps counting the same
   * events through a cookieless one, which is why the two systems have
   * disagreed for months and why a real sale can be invisible in the ad
   * account.
   *
   * Nobody knows what share of visitors answer, so nobody can say how much of
   * that gap is the banner. This makes the rate a number rather than an
   * argument. It carries no identifier and fires under either outcome, so it
   * needs no consent of its own, and it is pushed before the gtag guard below
   * because a page where gtag never loaded is exactly the case worth seeing.
   */
  try {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: "consent_decision", consent_decision: decision, consent_prompt: "banner" });
  } catch { /* a blocked dataLayer is not worth failing the banner over */ }

  if (typeof w.gtag !== "function") return;
  if (decision === "granted") {
    /*
     * Flush anything attribution.ts has been holding in memory. It captures
     * on page load but no longer writes until this point, so the gclid that
     * arrived in the landing URL survives a visitor who accepts two pages
     * later, and is never stored for one who does not.
     */
    try {
      const queued = (window as unknown as { __ssOnConsent?: (() => void)[] }).__ssOnConsent;
      if (Array.isArray(queued)) {
        queued.forEach((fn) => {
          try { fn(); } catch { /* one bad writer must not stop the rest */ }
        });
        queued.length = 0;
      }
    } catch { /* nothing queued */ }

    w.gtag("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
    });

    /*
     * Send the page view again, now that it can actually be recorded.
     *
     * This is the line that was missing, and without it the property
     * recorded essentially nothing for months.
     *
     * The sequence for a first-time visitor: the page loads with consent
     * defaulted to denied, gtag holds the page_view for the two seconds
     * wait_for_update allows, nobody reads and answers a banner in two
     * seconds, so the hit goes out cookieless with gcs=G100. GA4 cannot
     * form a session or count a page view from a cookieless ping. It only
     * feeds behavioural modelling, and modelling needs a traffic
     * threshold this property will never reach.
     *
     * Then the visitor accepts at eight seconds. Consent updates to
     * granted, every later hit is fine, and the page view they came for
     * is already gone. gtag does not resend it. On a site where most
     * visits are a single page, that is the whole visit.
     *
     * Measured on the live site before changing anything: the collect
     * call carried tid=G-N8886QEJ70, en=page_view and gcs=G100, which is
     * the browser confirming it in the request itself. The property showed
     * one to seven users a day, zero sessions and zero page views.
     *
     * This cannot double count. The banner only renders when there is no
     * stored decision, so reaching this line means the page really did
     * load denied and the first hit really was wasted.
     */
    w.gtag("event", "page_view", {
      page_location: window.location.href,
      page_title: document.title,
    });
  } else {
    // Reject = leave everything denied (the default), but explicitly send
    // an update so Google Ads knows the user actively refused (vs. just
    // not having decided yet, improves modeled conversion accuracy).
    w.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  }
}

/**
 * One count per banner shown and per answer, first party, with nothing that
 * identifies anybody (see /api/track/consent). This is how the acceptance
 * rate becomes a number: the dataLayer event above never reached GA4 on this
 * site, because gtag ignores GTM-style events.
 */
function tally(event: "shown" | Decision) {
  try {
    void fetch("/api/track/consent", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ event }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* a count is never worth breaking the banner over */ }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // The privacy policy is the page the banner links to, so it is the one
  // page the banner must not cover: there it sits as a card at the bottom.
  const blocking = !(usePathname() ?? "").startsWith("/privacy");

  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      // A backstop rather than the mechanism. layout.tsx reads the same key
      // synchronously and sets the consent default from it before gtag
      // sends anything, which is the only place it can be applied in time:
      // this effect runs after hydration and the page_view has already
      // gone. It stays because the inline read is inside a try/catch and a
      // browser that refuses localStorage there should still end up with
      // the right state for everything after the first hit.
      fireConsentUpdate(stored.decision);
      return;
    }
    // Shown on the next frame rather than after 600ms. The delay was there
    // to stop the banner flashing before paint, and it cost more than it
    // saved: gtag waits for a consent update and then gives up, so a
    // banner that is not on screen yet is a banner nobody can answer in
    // time.
    const t = window.setTimeout(() => { setVisible(true); tally("shown"); }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /*
   * Oscar, 30 September 2026: in the middle of the screen "with the back
   * blurred out till they make a decision". So it is a real modal: the page
   * behind does not scroll, focus moves into the card and Tab stays inside
   * it (the two buttons and the policy link), and Escape declines, as it
   * does on smartcareliving.ie. Focus goes to the card, not to Accept, so
   * the keyboard is not pointed at either answer.
   */
  useEffect(() => {
    if (!visible || !blocking) return;
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); decide("denied"); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("a[href], button"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      before?.focus?.({ preventScroll: true });
    };
    // decide is stable enough for this: it only writes storage and state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, blocking]);

  function decide(decision: Decision) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ decision, decidedAt: Date.now(), v: CONSENT_VERSION } satisfies StoredConsent)
      );
    } catch {
      // Storage may be blocked, still fire the consent update so it
      // applies for this session at least.
    }
    fireConsentUpdate(decision);
    tally(decision);
    setVisible(false);
  }

  if (!visible) return null;

  const card = (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal={blocking ? true : undefined}
      aria-label="Cookie consent"
      tabIndex={-1}
      className={
        (blocking
          ? "relative w-full max-w-md "
          : "fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:bottom-6 sm:max-w-md z-[1000] ") +
        "bg-gradient-to-b from-brand-50 to-white to-60% border border-brand-200 rounded-3xl shadow-2xl ring-[6px] ring-brand-500/5 p-6 sm:p-8 text-center outline-none motion-safe:animate-[ssConsentIn_0.45s_cubic-bezier(0.2,0.7,0.2,1)_both]"
      }
    >
      <style>{"@keyframes ssConsentIn{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}@keyframes ssConsentFade{from{opacity:0}to{opacity:1}}"}</style>
      <span
        aria-hidden="true"
        className="mx-auto mb-4 w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 shadow-lg shadow-brand-500/40 ring-4 ring-brand-500/10"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
          <path d="M8.5 8.5v.01" />
          <path d="M16 15.5v.01" />
          <path d="M12 12v.01" />
          <path d="M11 17v.01" />
          <path d="M7 14v.01" />
        </svg>
      </span>
      <p className="text-base sm:text-lg font-semibold text-gray-900 leading-snug mb-6">
        We&rsquo;re a small Irish business trying to reach the people who need us.{" "}
        <a href="/privacy" className="text-brand-700 underline hover:text-brand-800">
          Privacy policy
        </a>
      </p>
      {/*
       * Oscar, 30 September 2026: "were gona have to bite the button because
       * no one is accepting them. the accept must be alot bigger than the
       * decline", with a short reason under Accept and a line that we are a
       * small business. Until then the two buttons were the same size,
       * because the DPC's cookie guidance asks for equal prominence; this is
       * his call to depart from it. Decline stays a real, labelled button at
       * least 38px tall, just smaller and quieter.
       */}
      <button
        type="button"
        onClick={() => decide("granted")}
        className="w-full bg-brand-700 hover:bg-brand-800 text-white text-lg font-bold px-6 py-4 rounded-2xl shadow-lg shadow-brand-500/40 hover:-translate-y-px transition"
      >
        Accept cookies
      </button>
      <p className="mt-2 text-[13px] text-gray-500 leading-snug">
        Shows us which of our ads work, so we spend less reaching you.
      </p>
      <button
        type="button"
        onClick={() => decide("denied")}
        className="mt-5 min-h-[38px] bg-white hover:border-gray-500 text-gray-700 text-sm font-semibold px-5 py-2 rounded-xl border border-gray-300 transition-colors"
      >
        Decline
      </button>
    </div>
  );

  if (!blocking) return card;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md motion-safe:animate-[ssConsentFade_0.3s_ease_both]">
      {card}
    </div>
  );
}
