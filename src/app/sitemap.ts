import type { MetadataRoute } from "next";

const BASE = "https://smart-space.ie";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    // Homepage
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },

    // High-intent conversion pages
    { url: `${BASE}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/doorbell`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/camera`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/bundles`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/bundles/driveway`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/bundles/whole-home`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/bundles/eldercare`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/single`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/services/installation-only`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/free-consultation`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },

    // Individual product detail pages (static-generated, one per curated handle)
    { url: `${BASE}/services/plus-video-doorbell`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services/pro-video-doorbell`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services/plus-floodlight-cam`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services/pro-floodlight-cam`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services/plus-driveway-bundle`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services/pro-driveway-bundle`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services/plus-whole-home-bundle`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services/pro-whole-home-bundle`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/services/eldercare-security-bundle`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },

    // Local SEO
    { url: `${BASE}/areas`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },

    // Trust + info
    { url: `${BASE}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },

    // /faq and /blog/* intentionally omitted — pages still accessible by
    // direct link but withheld from search until content is refreshed.
  ];

  return staticRoutes;
}
