export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  readingTime: string;
  category: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ring-doorbell-installation-ireland-guide",
    title: "Ring Doorbell Installation Ireland: Complete 2026 Guide",
    description:
      "Every Ring Video Doorbell model explained — wiring, weather, pricing, and whether to DIY or hire a professional installer in Ireland.",
    datePublished: "2026-04-01",
    dateModified: "2026-04-22",
    readingTime: "9 min read",
    category: "Buying Guide",
  },
  {
    slug: "home-security-cameras-ireland-buyers-guide",
    title: "Home Security Cameras Ireland: What Actually Works in 2026",
    description:
      "An honest buyer's guide to home security cameras for Irish homes in 2026 — Ring, Nest, Eufy, Tapo compared, insurance implications, and the setups that actually work.",
    datePublished: "2026-03-20",
    dateModified: "2026-04-22",
    readingTime: "10 min read",
    category: "Buying Guide",
  },
  {
    slug: "smart-doorbell-vs-traditional-intercom-ireland",
    title: "Smart Doorbell vs Traditional Intercom in Ireland",
    description:
      "Upgrading from an old wired intercom to a smart doorbell? Costs, wiring, retrofit difficulty, and who this works for in Ireland.",
    datePublished: "2026-03-05",
    dateModified: "2026-04-22",
    readingTime: "8 min read",
    category: "Comparison",
  },
];

export function getPostBySlug(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
