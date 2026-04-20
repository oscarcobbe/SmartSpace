/** @type {import('next').NextConfig} */
const nextConfig = {
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

      // Specific legacy pages → appropriate new pages
      { source: "/pages/contact", destination: "/contact", permanent: true },
      { source: "/pages/reviews", destination: "/reviews", permanent: true },
      { source: "/pages/about", destination: "/about", permanent: true },
      { source: "/pages/privacy-policy", destination: "/", permanent: true },
      { source: "/pages/terms-and-conditions", destination: "/", permanent: true },
      { source: "/pages/disclaimer", destination: "/", permanent: true },

      // Catch-all wildcards for old Shopify URL structures
      // Old product pages → services (we sell installation services now)
      { source: "/products/:slug*", destination: "/services", permanent: true },
      // Old collection pages → services
      { source: "/collections/:slug*", destination: "/services", permanent: true },
      // Any remaining /pages/* → home
      { source: "/pages/:slug*", destination: "/", permanent: true },
      // Legacy blog → SmartCareLiving (they own the blog content now)
      { source: "/blogs/:slug*", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },

      // Old pages -> home page
      { source: "/pages/how-it-works", destination: "/", permanent: true },
      { source: "/pages/about-us", destination: "/", permanent: true },
      { source: "/pages/cost", destination: "/", permanent: true },
      { source: "/pages/client-stories", destination: "/", permanent: true },
      { source: "/pages/mary", destination: "/", permanent: true },
      { source: "/pages/joe", destination: "/", permanent: true },
      { source: "/pages/anne", destination: "/", permanent: true },
      { source: "/pages/contact-us", destination: "/", permanent: true },
      { source: "/pages/your-5-star-rated-all-things-ring-installer", destination: "/", permanent: true },

      // Old products -> home page
      { source: "/products/book-your-consultation-call", destination: "/", permanent: true },
      { source: "/products/onsite-troubleshoot-installation-set-up-of-customer-bought-ring-products", destination: "/", permanent: true },
      { source: "/products/onsite-ring-of-security-consultation", destination: "/", permanent: true },
      { source: "/products/ring-driveway-bundle-premium", destination: "/", permanent: true },
      { source: "/products/ring-video-doorbell-wired", destination: "/", permanent: true },
      { source: "/products/basic-video-doorbell-mains-or-battery-powered", destination: "/", permanent: true },
      { source: "/products/advanced-video-doorbell-pro-wired", destination: "/", permanent: true },
      { source: "/products/security-cam-floodlight-cam-plus", destination: "/", permanent: true },
      { source: "/products/floodlight-cam-pro-mains-powered-copy", destination: "/", permanent: true },
      { source: "/products/whole-house-security-calculator", destination: "/", permanent: true },

      // Old blog index -> smartcareliving
      { source: "/blogs/safe-ageing-powered-by-ai", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },

      // Old blog posts -> smartcareliving individual posts
      { source: "/blogs/safe-ageing-powered-by-ai/having-the-talk-a-crucial-conversation-about-a-future-you-can-all-agree-on", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/a-beacon-of-hope-for-families-smartguardian-offers-a-proactive-alternative-to-care-home-worries", destination: "https://www.smartcareliving.ie/blogs/news/a-beacon-of-hope-for-families-smartguardian-offers-a-proactive-alternative-to-care-home-worries", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/passive-sensors-the-future-of-elderly-home-safety", destination: "https://www.smartcareliving.ie/blogs/news/passive-sensors-the-future-of-elderly-home-safety", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/smartguardian-affordable-home-safety-vs-care-homes", destination: "https://www.smartcareliving.ie/blogs/news/smartguardian-affordable-home-safety-vs-care-homes", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/parents-living-alone-safe-independent-with-tech", destination: "https://www.smartcareliving.ie/blogs/news/parents-living-alone-safe-independent-with-techology", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/simply-raise-your-arm-to-call-new-elderly-home-safety-solution", destination: "https://www.smartcareliving.ie/blogs/news/simply-raise-your-arm-to-call-new-elderly-home-safety-solution", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/smartguardian-a-step-change-in-irish-home-care", destination: "https://www.smartcareliving.ie/blogs/news/smartguardian-a-step-change-in-irish-home-care", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/smartguardian-safe-independent-irish-living", destination: "https://www.smartcareliving.ie/blogs/news/smartguardian-safe-independent-irish-living", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/stay-home-safe-ai-tech-for-irish-seniors", destination: "https://www.smartcareliving.ie/blogs/news/stay-home-safe-technology-for-irish-seniors", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/overcoming-fear-smart-tech-for-independent-living", destination: "https://www.smartcareliving.ie/blogs/news/overcoming-fear-smart-tech-for-independent-living", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/adaptive-care-tech-for-dementia-at-home", destination: "https://www.smartcareliving.ie/blogs/news/adaptive-care-technology-for-dementia-at-home", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/tech-solutions-bridging-irelands-care-gap", destination: "https://www.smartcareliving.ie/blogs/news/technology-solutions-bridging-irelands-care-gap", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/ai-home-care-irelands-solution-to-aging", destination: "https://www.smartcareliving.ie/blogs/news/ai-powered-home-care-irelands-solution-to-ageing", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/privacy-peace-ai-home-monitoring-for-seniors", destination: "https://www.smartcareliving.ie/blogs/news/privacy-peace-ai-home-monitoring-for-seniors", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/smart-home-monitoring-extending-safe-independence", destination: "https://www.smartcareliving.ie/blogs/news/smart-home-monitoring-extending-safe-independence", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/safeguarding-loved-ones-with-dementia-at-home-in-ireland", destination: "https://www.smartcareliving.ie/blogs/news/safeguarding-loved-ones-with-dementia-at-home-in-ireland", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/irelands-smartguardian-global-tech-for-safe-elderly-living", destination: "https://www.smartcareliving.ie/blogs/news/irelands-smartguardian-cutting-edge-technology-for-safe-elderly-living", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/no-wearables-no-worries-smartguardians-freedom", destination: "https://www.smartcareliving.ie/blogs/news/no-wearables-no-worries-smartguardians-freedom", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/our-smartguardian-service-featured-in-senior-times-magazine", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/worry-less-about-loved-ones-during-recent-storms-like-eowyn-and-darragh", destination: "https://www.smartcareliving.ie/blogs/news/worry-less-about-loved-ones-during-recent-storms-like-eowyn-and-darragh", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/tech-for-the-golden-years-safeguarding-our-loved-ones-at-home", destination: "https://www.smartcareliving.ie/blogs/news/tech-for-the-golden-years-safeguarding-our-loved-ones-at-home", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/smartguardian-a-helping-hand-for-early-stage-dementia-patients", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/keeping-it-home-how-ai-technology-is-empowering-irish-seniors-to-age-in-place", destination: "https://www.smartcareliving.ie/blogs/news/keeping-it-home-how-ai-technology-is-empowering-irish-seniors-to-age-in-place", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/an-alternative-to-a-nursing-home-keeping-mum-dad-safe-at-home", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/smartguardian-keeping-mum-dad-safe-at-home-saves-both-000s-per-month-and-emotional-stress", destination: "https://www.smartcareliving.ie/blogs/news/smartguardian-keeping-mum-dad-safe-at-home-saves-both-000s-per-month-and-emotional-stress", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/keeping-mum-safe-why-smartguardian-shines-compared-to-the-rest", destination: "https://www.smartcareliving.ie/blogs/news/keeping-mum-safe-why-smartguardian-shines-compared-to-the-rest", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/beyond-the-button-why-pendant-alarms-are-a-thing-of-the-past", destination: "https://www.smartcareliving.ie/blogs/news/beyond-the-button-why-pendant-alarms-are-a-thing-of-the-past", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/does-mum-still-wear-her-pendant-alarm-heres-why-it-might-not-be-enough", destination: "https://www.smartcareliving.ie/blogs/news/does-mum-or-dad-still-wear-a-pendant-alarm-why-it-may-not-be-enough", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/worried-about-mum-falling-in-the-bathroom-heres-how-to-help", destination: "https://www.smartcareliving.ie/blogs/news/worried-about-mum-falling-in-the-bathroom-heres-how-to-help", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/worried-about-mum-living-alone-at-night-discover-how-smart-lighting-can-help", destination: "https://www.smartcareliving.ie/blogs/news/worried-about-mum-living-alone-at-night-discover-how-smart-lighting-can-help", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/new-technology-shaking-up-fall-detection-in-care-homes", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/worried-about-falls-heres-how-to-keep-your-loved-one-safe-at-home", destination: "https://www.smartcareliving.ie/blogs/news/worried-about-falls-heres-how-to-keep-your-loved-one-safe-at-home", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/latest-irish-elderly-home-monitoring-system-needs-no-wearable", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/hello-ai-safe-ageing-at-home-in-ireland-goodbye-wearables", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
    ];
  },
};

export default nextConfig;
