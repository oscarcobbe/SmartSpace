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

      // Catch-all wildcards for old Shopify URL structures.
      // IMPORTANT: use [^.]+ so we don't accidentally redirect static files
      // like /products/plus-video-doorbell.png (which must keep serving
      // from /public).
      //
      // PRESERVE THE SLUG: the previous version of this rule sent every
      // /products/* URL to a single destination (/services). That collapsed
      // ~90 distinct Shopify product URLs into one canonical, and Google
      // de-duped them all out of the index — visible in GSC as a cliff in
      // Merchant Listings + Product Snippets + HTTPS URLs around 2026-04-20.
      // By piping :slug into the destination, /products/<handle> now
      // redirects to /services/<handle> where the new SSR product page
      // lives (CURATED_HANDLES in src/app/services/[handle]/page.tsx).
      // Slugs without a matching new handle 404, which is correct — those
      // products genuinely don't exist anymore. Specific dead-product
      // slugs are listed below as explicit overrides that win first.
      { source: "/products/:slug([^.]+)", destination: "/services/:slug", permanent: true },
      { source: "/collections/:slug([^.]+)", destination: "/services", permanent: true },
      { source: "/pages/:slug([^.]+)", destination: "/", permanent: true },
      { source: "/blogs/:slug([^.]+)", destination: "https://www.smartcareliving.ie/", permanent: true },

      // Legacy /pages/* → topically-matching current pages.
      // Previously all of these went to "/", which Google flags as
      // "Page with redirect — Failed" because mass-collapsing distinct
      // URLs to one canonical looks like a low-quality redirect pattern.
      // GSC on 2026-05-14 showed 120 such failures across the property.
      // Each mapping below sends the legacy URL to the page that actually
      // satisfies its original intent.
      { source: "/pages/how-it-works", destination: "/installation", permanent: true },
      { source: "/pages/about-us", destination: "/about", permanent: true },
      { source: "/pages/cost", destination: "/services", permanent: true },
      { source: "/pages/client-stories", destination: "/reviews", permanent: true },
      { source: "/pages/mary", destination: "/reviews", permanent: true },
      { source: "/pages/joe", destination: "/reviews", permanent: true },
      { source: "/pages/anne", destination: "/reviews", permanent: true },
      { source: "/pages/contact-us", destination: "/contact", permanent: true },
      { source: "/pages/your-5-star-rated-all-things-ring-installer", destination: "/reviews", permanent: true },

      // Legacy Shopify /products/* → topically-matching service pages.
      // Same root-cause fix as the /pages/* block above — previously these
      // all redirected to "/" which made them look like noise to Google.
      // Each mapping now sends the legacy product URL to the new service
      // page that actually sells the same thing.
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

      // Old blog index + any old blog post → smartcareliving.ie blog index.
      // Previously this was ~30 per-post redirects pointing at specific
      // smartcareliving.ie URLs; many of those destinations 404'd which was
      // flooding Search Console with "Page with redirect — Failed". Collapsed
      // to a single catch-all to a guaranteed-live destination.
      { source: "/blogs/safe-ageing-powered-by-ai", destination: "https://www.smartcareliving.ie/", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/:slug*", destination: "https://www.smartcareliving.ie/", permanent: true },
    ];
  },
};

export default nextConfig;
