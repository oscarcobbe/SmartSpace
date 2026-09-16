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
          // The CRM holds customer names, addresses and what they paid. It is
          // linked from nowhere, and this is the second lock: a crawler that
          // finds the login page must not put it in results.
          "/crm",
          "/crm/",
          "/api/",
          "/smartspace-payment-success",
          "/smartcareliving-payment-success",
          "/test123-checkout",
          // NOTE: /booking is intentionally NOT disallowed. It is a clean 308
          // redirect to /services/free-consultation (see next.config.mjs).
          // Disallowing a redirecting URL stops Googlebot from following the
          // redirect, so the source lingers in Search Console as "Blocked by
          // robots.txt" instead of cleanly consolidating onto the target.
          // Treated the same as the other legacy 308s (/survey, /scan), which
          // are also crawlable so Google can honour and retire them.
          "/backlink-outreach",
          "/gbp-setup",
          "/ga4-setup",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
