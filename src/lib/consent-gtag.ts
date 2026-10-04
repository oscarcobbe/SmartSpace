/**
 * What a cookie-banner decision does to Google's tag, in two parts that must
 * not be confused.
 *
 *   applyConsent   a decision already made: consent update, nothing sent.
 *                  CookieBanner runs it on every load for a stored decision.
 *   recordAnswer   a decision made just now, on a button: everything
 *                  applyConsent does, and on Accept the page view again.
 *
 * Until 4 October 2026 both were one function, and the stored-decision path
 * on every page load ran the Accept path, page view included. A returning
 * visitor who had accepted sent page_view twice on every hard load and every
 * reload, once from the GA4 config call in the <head> and once from here,
 * to each GA4 stream, since 24 August (PR #10). A client-side route change
 * sent one, because the banner does not remount.
 *
 * scripts/check-gtag-bootstrap.mjs runs this module after the <head> script
 * and fails unless a hard load with a stored decision sends exactly one page
 * view and an Accept sends exactly one more; check-tracking-browser.mjs does
 * the same against the built site.
 *
 * Kept free of imports: the build checks load it.
 */

export type Decision = "granted" | "denied";

type Win = {
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  __ssOnConsent?: (() => void)[];
  location: { href: string };
};

const win = () => window as unknown as Win;

/** A decision applied to the tag. Sends no event of its own. */
export function applyConsent(decision: Decision): void {
  const w = win();
  if (typeof w.gtag !== "function") return;
  if (decision === "granted") {
    /*
     * Flush anything attribution.ts and the ChatGPT ads pixel have been
     * holding in memory. They capture on page load but do not write until
     * consent is known, so the gclid that arrived in the landing URL survives
     * a visitor who accepts two pages later, and is never stored for one who
     * does not.
     */
    try {
      const queued = w.__ssOnConsent;
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
  } else {
    // Explicitly denied rather than left at the default, so Google Ads knows
    // the visitor refused rather than never decided.
    w.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  }
}

/** The visitor has just pressed Accept or Decline. */
export function recordAnswer(decision: Decision): void {
  const w = win();

  /*
   * The answer itself, before anything else and whichever way it goes. It
   * carries no identifier and is pushed before the gtag guard, because a page
   * where gtag never loaded is exactly the case worth seeing. (gtag.js ignores
   * GTM-style objects, so the count that is actually read is the first-party
   * tally in CookieBanner, /api/track/consent.)
   */
  try {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: "consent_decision", consent_decision: decision, consent_prompt: "banner" });
  } catch { /* a blocked dataLayer is not worth failing the banner over */ }

  applyConsent(decision);

  if (decision !== "granted" || typeof w.gtag !== "function") return;
  /*
   * The page view again, now that it can be recorded.
   *
   * A first-time visitor's page loads with consent denied. gtag holds the
   * page_view for the two seconds wait_for_update allows, nobody answers a
   * banner that fast, and the hit goes out cookieless (gcs=G100), which GA4
   * cannot turn into a session or a page view. Consent then updates to
   * granted and gtag does not resend it. On a site where most visits are one
   * page, that was the whole visit.
   *
   * Only here, on the button. A stored decision is applied before the first
   * hit by the <head> script, so that load's own page view already counted.
   */
  w.gtag("event", "page_view", {
    page_location: window.location.href,
    page_title: document.title,
  });
}
