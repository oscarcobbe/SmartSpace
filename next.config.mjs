/** @type {import('next').NextConfig} */
const nextConfig = {
  // Default in Next 14 is FALSE. Strict mode catches a class of bugs
  // (double-invocation reveals impure effects, missing useCallback
  // deps, race conditions) BEFORE they hit production. No runtime cost
  // in production builds — strict mode only double-invokes in dev.
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "eu.ring.com",
      },
      {
        protocol: "https",
        hostname: "images.ctfassets.net",
      },
      {
        protocol: "https",
        hostname: "d39xvdj9d5ntm1.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
    ],
  },
  async redirects() {
    return [
      // Bundle shortcut URLs → proper bundle pages
      { source: "/services/driveway-bundle", destination: "/services/bundles/driveway", permanent: true },
      { source: "/services/whole-home-bundle", destination: "/services/bundles/whole-home", permanent: true },

      // /booking was a separate page that required sessionStorage from
      // a flow that no longer exists. It now redirects to the real
      // booking flow (free consultation has the BookingCalendar inline).
      { source: "/booking", destination: "/services/free-consultation", permanent: true },

      // Old /survey page → new /faq
      { source: "/survey", destination: "/faq", permanent: true },

      // /scan was a short-lived QR-code landing page (2026-05-15). The
      // business-card QRs now point straight to /services/installation-only.
      // Defensive redirect kept in case any test prints or shared links
      // still reference /scan — gracefully forwards to the booking page.
      { source: "/scan", destination: "/services/installation-only", permanent: true },

      // Specific legacy pages → appropriate new pages
      { source: "/pages/contact", destination: "/contact", permanent: true },
      { source: "/pages/reviews", destination: "/reviews", permanent: true },
      { source: "/pages/about", destination: "/about", permanent: true },
      // Legacy Shopify pages → real Next.js pages (added 2026-05-04 — were
      // dead-redirecting to home, which left an accessible-privacy-policy
      // gap under GDPR + ePrivacy now that the cookie banner fires
      // ad_storage / ad_user_data signals).
      { source: "/pages/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/pages/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/pages/disclaimer", destination: "/terms", permanent: true },

      // ────────────────────────────────────────────────────────────
      // SPECIFIC LEGACY OVERRIDES — MUST come BEFORE the wildcard
      // catch-alls below. Next.js evaluates redirects top-to-bottom
      // and the FIRST match wins, so anything that needs a custom
      // destination has to be declared before /pages/:slug → /
      // and /products/:slug → /services/:slug catch it.
      //
      // A previous comment in this file claimed "specific dead-product
      // slugs are listed below as explicit overrides that win first" —
      // that was aspirational, not actual. The specifics were below the
      // wildcards, so the wildcards always won and the specific lines
      // were dead code. GSC on 2026-05-14 showed 120 "Page with redirect
      // — Failed" entries, largely caused by mass-collapsing distinct
      // legacy URLs to "/" (low-quality redirect pattern). Re-ordering
      // here is the real fix.
      // ────────────────────────────────────────────────────────────

      // Legacy /pages/* → topically-matching current pages.
      // Point straight at the final destination (not /installation) so this
      // is a single 308 hop, not a 308→/installation→/services/installation-only
      // chain. Redirect chains waste crawl budget and dilute link equity, and
      // GSC flags multi-hop legacy redirects.
      { source: "/pages/how-it-works", destination: "/services/installation-only", permanent: true },
      { source: "/pages/about-us", destination: "/about", permanent: true },
      { source: "/pages/cost", destination: "/services", permanent: true },
      { source: "/pages/client-stories", destination: "/reviews", permanent: true },
      { source: "/pages/mary", destination: "/reviews", permanent: true },
      { source: "/pages/joe", destination: "/reviews", permanent: true },
      { source: "/pages/anne", destination: "/reviews", permanent: true },
      { source: "/pages/contact-us", destination: "/contact", permanent: true },
      { source: "/pages/your-5-star-rated-all-things-ring-installer", destination: "/reviews", permanent: true },

      // Legacy Shopify /products/* → topically-matching service pages.
      // These previously went to "/" — same reason as the /pages/*
      // overrides above.
      { source: "/products/book-your-consultation-call", destination: "/services/free-consultation", permanent: true },
      { source: "/products/onsite-troubleshoot-installation-set-up-of-customer-bought-ring-products", destination: "/services/installation-only", permanent: true },
      { source: "/products/onsite-ring-of-security-consultation", destination: "/services/free-consultation", permanent: true },
      { source: "/products/ring-driveway-bundle-premium", destination: "/services/bundles/driveway", permanent: true },
      { source: "/products/ring-video-doorbell-wired", destination: "/services/plus-video-doorbell", permanent: true },
      { source: "/products/basic-video-doorbell-mains-or-battery-powered", destination: "/services/plus-video-doorbell", permanent: true },
      { source: "/products/advanced-video-doorbell-pro-wired", destination: "/services/pro-video-doorbell", permanent: true },
      { source: "/products/security-cam-floodlight-cam-plus", destination: "/services/plus-floodlight-cam", permanent: true },
      { source: "/products/floodlight-cam-pro-mains-powered-copy", destination: "/services/pro-floodlight-cam", permanent: true },
      { source: "/products/whole-house-security-calculator", destination: "/services/bundles/whole-home", permanent: true },

      // ────────────────────────────────────────────────────────────
      // NO MORE CATCH-ALL WILDCARDS for legacy Shopify URL structures.
      //
      // Removed 2026-05-25 after GSC continued to show 119 "Page with
      // redirect — Failed" entries despite the May 14 fix. Root cause
      // was these four wildcards:
      //
      //   /products/:slug → /services/:slug   — produced 404s for any
      //     legacy product handle not in CURATED_HANDLES
      //   /collections/:slug → /services      — many-to-one collapse
      //   /pages/:slug → /                    — many-to-one collapse
      //     (explicitly called out in the May 14 comment as the
      //     original cause of the problem)
      //   /blogs/:slug → smartcareliving.ie   — external-domain
      //     redirect that Google can't validate from this property
      //
      // Trade-off: anyone with a bookmark to a legacy URL not in the
      // specific override list above will now see a 404 instead of
      // landing on a hub page. Acceptable — these URLs are 2+ years
      // old, traffic is negligible, and the SEO penalty for failed
      // redirects outweighs the rare-bookmark UX hit.
      //
      // Google will gradually move the 119 entries from "Page with
      // redirect — failed" into "Not found (404)" over 4–8 weeks of
      // re-crawl. The 404 bucket is a softer signal that Google
      // eventually drops without penalising the rest of the site.
      // ────────────────────────────────────────────────────────────

      // Keep the legacy /blogs/safe-ageing-powered-by-ai single URL
      // (not the wildcard) because it appears in actual inbound link
      // anchor text from the SmartCareLiving ecosystem. External
      // domain destination is fine for a single explicit redirect —
      // Google handles those normally; the wildcard variant was the
      // problem because it implied any sub-slug was valid.
      { source: "/blogs/safe-ageing-powered-by-ai", destination: "https://www.smartcareliving.ie/", permanent: true },
    ];
  },
};

export default nextConfig;
