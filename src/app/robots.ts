import type { MetadataRoute } from "next";

const BASE = "https://smart-space.ie";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/smartspace-payment-success",
          "/smartcareliving-payment-success",
          "/test123-checkout",
          // /booking is now a 308 redirect (see next.config.mjs) — no
          // page to crawl, but kept disallowed so legacy bookmarks
          // bouncing through the redirect aren't double-crawled.
          "/booking",
          "/backlink-outreach",
          "/gbp-setup",
          "/ga4-setup",
          // /scan is the QR-code landing for business cards and other print
          // assets. It's noindex'd at the page level too — both signals so
          // it stays cleanly separated from /services/free-consultation in
          // organic search and so analytics can isolate scan traffic.
          "/scan",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
