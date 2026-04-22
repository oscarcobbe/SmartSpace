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

    // Local SEO
    { url: `${BASE}/areas`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },

    // Trust + info
    { url: `${BASE}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },

    // Blog
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/blog/ring-doorbell-installation-ireland-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/blog/home-security-cameras-ireland-buyers-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/blog/smart-doorbell-vs-traditional-intercom-ireland`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  return staticRoutes;
}
