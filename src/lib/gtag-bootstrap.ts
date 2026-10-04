import { STAFF_PATH } from "./staff-paths";

/**
 * The inline script in <head> that loads Google's tag and configures it.
 *
 * It lives here rather than inline in src/app/layout.tsx so that
 * scripts/check-gtag-bootstrap.mjs can run the exact string the page ships,
 * once per path, and count what it configures: one page view per load, and
 * nothing at all on a staff page.
 *
 * Kept free of imports beyond staff-paths.ts: the build checks load it.
 */
export interface GtagIds {
  /** Google Ads, AW-... */
  ads: string;
  /** GA4 measurement id, G-..., or "" to run Ads alone. */
  ga4: string;
  /** The SS - Call conversion label, for Google's forwarding-number swap, or "". */
  callLabel: string;
  /** The number exactly as the page displays it, for the swap to find. */
  callNumber: string;
}

export function gtagBootstrap({ ads, ga4, callLabel, callNumber }: GtagIds): string {
  const q = JSON.stringify;
  return [
    "(function () {",
    // ── Staff tools are not the website ──
    // /admin, /crm, the internal hand-off pages and the rest of
    // src/lib/staff-paths.ts get no tag at all: gtag.js is never requested,
    // window.gtag is never defined, nothing is queued. Before this only /crm
    // was spared, and only its config calls; /admin sent page_view, scroll
    // and form_begin to GA4, Google Ads and remarketing.
    //
    // Checked at load time. Nothing on the website links to a staff page, so
    // a staff page is always a fresh document; one reached by a client-side
    // route change from the website would inherit that document's tag.
    "  if (" + STAFF_PATH.toString() + ".test(location.pathname)) return;",
    // Loaded with the GA4 id where one is set, then the Ads id is configured
    // after it, which is Google's documented order.
    //
    // Never with G-JR2WXNSLEL, the property's original stream: its own
    // gtag/js answers 404. That 404 is not why the property went quiet from
    // 21 July to 24 August 2026, though it was taken for the cause at the
    // time (PR #10). The cause was this site's own Content Security Policy,
    // which refused region1.analytics.google.com, where GA4 had started
    // sending; PR #11 fixed it on 25 August (see connect-src in
    // src/middleware.ts). The old stream was alive throughout and still
    // receives every event, because the Google Ads tag lists it as a
    // destination; scripts/check-google-tag-destinations.mjs reports that.
    // Keep that stream: the CRM reads its days before 25 August
    // (GA4_EARLIER_STREAM in src/lib/crm/ga4.ts).
    "  var s = document.createElement('script');",
    "  s.async = true;",
    "  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + " + q(ga4 || ads) + ";",
    "  document.head.appendChild(s);",
    "  var dataLayer = window.dataLayer = window.dataLayer || [];",
    "  var gtag = window.gtag = function () { dataLayer.push(arguments); };",
    "  gtag('js', new Date());",
    // ── Consent Mode v2 ADVANCED ──
    //   url_passthrough: true   → preserves the gclid query param across
    //     internal navigation even when ad_storage='denied', so "ad click →
    //     /ring-installation → /contact → submit" still has the gclid on the
    //     final fire.
    //   ads_data_redaction: true → when ad_storage='denied', send anonymised
    //     conversion pings (no IP, no cookie id) instead of dropping them, so
    //     Google can model the conversion.
    // Both MUST be set BEFORE the consent default below.
    "  gtag('set', 'url_passthrough', true);",
    "  gtag('set', 'ads_data_redaction', true);",
    // ── The stored decision, applied before the first hit ──
    // A returning visitor who already accepted must be counted on this page.
    // The banner is a React component whose effect runs after hydration, long
    // after the config calls below have sent the page view, so the decision
    // is read here, synchronously, and becomes the consent default. That is
    // the only place it can take effect in time, which is also why the
    // banner must not send a page view of its own for a stored decision: the
    // config call below has already sent this page's one.
    "  var ssStored = null;",
    "  try {",
    "    var ssRaw = localStorage.getItem('ss_consent');",
    "    if (ssRaw) {",
    "      var ssSaved = JSON.parse(ssRaw);",
    // Same twelve month window the banner enforces. Expired means
    // undecided, not granted.
    "      if (ssSaved && Date.now() - ssSaved.decidedAt < 31536000000) ssStored = ssSaved.decision;",
    "    }",
    "  } catch (e) {}",
    "  var ssGrant = ssStored === 'granted' ? 'granted' : 'denied';",
    // ── Consent Mode v2 default (REQUIRED for EEA/UK ad processing) ──
    // Denied unless stored as granted. CookieBanner.tsx sends
    // gtag('consent','update',…) when the visitor answers. MUST run before
    // any config call.
    "  gtag('consent', 'default', {",
    "    ad_storage: ssGrant,",
    "    ad_user_data: ssGrant,",
    "    ad_personalization: ssGrant,",
    "    analytics_storage: ssGrant,",
    // Two seconds: 500ms was shorter than the banner took to appear.
    "    wait_for_update: 2000",
    "  });",
    // Google Ads
    "  gtag('config', " + q(ads) + ", { allow_enhanced_conversions: true });",
    // GA4. Its config call sends this page's page view, the only one a
    // stored decision gets.
    ga4 ? "  gtag('config', " + q(ga4) + ");" : "  // GA4 disabled, set NEXT_PUBLIC_GA4_MEASUREMENT_ID to enable",
    // Phone-call conversion (Google Ads call tracking, the forwarding-number
    // swap). The label is trimmed by the caller: a trailing newline in the
    // Vercel env var once made Google reject it and drop every call
    // conversion (found 14 May 2026).
    callLabel
      ? "  gtag('config', " + q(`${ads}/${callLabel}`) + ", { phone_conversion_number: " + q(callNumber) + " });"
      : "",
    "})();",
  ]
    .filter(Boolean)
    .join("\n");
}
