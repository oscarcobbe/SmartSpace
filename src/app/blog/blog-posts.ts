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
    slug: "eufy-video-doorbell-e340-fitted-ireland",
    title: "The Eufy Video Doorbell E340, Fitted: An Irish Installer's Take",
    description:
      "We supply and fit the Eufy Video Doorbell E340 across Dublin and Leinster. Here is what the dual camera, the local storage and the no-subscription promise actually mean once it is on your wall, and the two power situations that decide your price.",
    datePublished: "2026-06-17",
    dateModified: "2026-06-17",
    readingTime: "8 min read",
    category: "Specialist Opinion",
  },
  {
    slug: "eufy-home-bundles-driveway-garden-ireland",
    title: "Covering the Whole Property with Eufy: Driveway, Garden and the Bits People Forget",
    description:
      "A doorbell covers the front door and nothing else. Here is how we cover a whole Irish property with Eufy, the Floodlight Cam, the S380 HomeBase and the three bundles we fit most, all with footage kept at home and no monthly fee.",
    datePublished: "2026-06-17",
    dateModified: "2026-06-17",
    readingTime: "9 min read",
    category: "Buying Guide",
  },
  {
    slug: "ring-vs-eufy-doorbell-ireland",
    title: "Ring vs Eufy: An Irish Installer's Honest Take in 2026",
    description:
      "We've installed thousands of both across Dublin and Leinster. Here's what we tell homeowners when they ask, including why we get asked to swap Eufy for Ring but never the other way around, and why our install price is the same either way.",
    datePublished: "2026-05-25",
    dateModified: "2026-05-25",
    readingTime: "8 min read",
    category: "Specialist Opinion",
  },
  {
    slug: "smart-camera-wifi-drops-irish-homes",
    title: "Why Your Smart Camera Keeps Dropping the Signal",
    description:
      "Nine times out of ten it isn't the camera. It's the foil-backed insulation in your wall, or your modem sitting two rooms away behind a thermal-insulated chimney breast. What we actually find on a survey.",
    datePublished: "2026-05-25",
    dateModified: "2026-05-25",
    readingTime: "7 min read",
    category: "Specialist Opinion",
  },
  {
    slug: "tapo-vs-eufy-vs-ring-budget-doorbell-ireland",
    title: "Tapo, Eufy, Ring: Is the Cheap Option Actually Cheap?",
    description:
      "Tapo doorbells turn up on the same shelves as Ring and Eufy at half the price. They're not always the wrong buy, but here's what we've seen come down off Irish walls after eighteen months that helps you decide.",
    datePublished: "2026-05-25",
    dateModified: "2026-05-25",
    readingTime: "7 min read",
    category: "Specialist Opinion",
  },
  {
    slug: "whole-home-security-beyond-front-door-ireland",
    title: "The Front Door Is the Easy Bit: Side Gates, Extensions and Garden Offices",
    description:
      "Most people stop thinking about security once the doorbell is up. The break-ins we hear about don't happen at the front door, they happen at the side gate of a semi-D, the patio door on a rear extension, or the garden office with a laptop in it.",
    datePublished: "2026-05-25",
    dateModified: "2026-05-25",
    readingTime: "8 min read",
    category: "Specialist Opinion",
  },
  {
    slug: "battery-vs-hardwired-smart-doorbell-ireland",
    title: "Battery or Hardwired? What Actually Works on an Irish Doorbell",
    description:
      "Charging the doorbell every three months is most people's idea of hell. But your old 8V chime probably can't power a modern smart doorbell without help. Here's what we do on a hardwire conversion, and when battery is genuinely the right call.",
    datePublished: "2026-05-25",
    dateModified: "2026-05-25",
    readingTime: "8 min read",
    category: "Specialist Opinion",
  },
  {
    slug: "ring-doorbell-installation-ireland-guide",
    title: "Ring Doorbell Installation Ireland: Complete 2026 Guide",
    description:
      "Every Ring Video Doorbell model explained, wiring, weather, pricing, and whether to DIY or hire a professional installer in Ireland.",
    datePublished: "2026-04-01",
    dateModified: "2026-04-22",
    readingTime: "9 min read",
    category: "Buying Guide",
  },
  {
    slug: "home-security-cameras-ireland-buyers-guide",
    title: "Home Security Cameras Ireland: What Actually Works in 2026",
    description:
      "An honest buyer's guide to home security cameras for Irish homes in 2026, Ring, Nest, Eufy, Tapo compared, insurance implications, and the setups that actually work.",
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
