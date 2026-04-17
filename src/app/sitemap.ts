import type { MetadataRoute } from "next";

const BASE = "https://www.smart-space.ie";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/services`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/doorbell`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/camera`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/bundles`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/services/bundles/whole-home`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/services/bundles/driveway`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/services/bundles/eldercare`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/services/single`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/services/installation-only`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/services/free-consultation`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/survey`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/reviews`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/installation`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  return staticRoutes;
}
