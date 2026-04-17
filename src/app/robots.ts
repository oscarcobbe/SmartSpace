import type { MetadataRoute } from "next";

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
          "/booking",
        ],
      },
    ],
    sitemap: "https://www.smart-space.ie/sitemap.xml",
    host: "https://www.smart-space.ie",
  };
}
