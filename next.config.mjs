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

      // Old /survey page → new /faq
      { source: "/survey", destination: "/faq", permanent: true },

      // Specific legacy pages → appropriate new pages
      { source: "/pages/contact", destination: "/contact", permanent: true },
      { source: "/pages/reviews", destination: "/reviews", permanent: true },
      { source: "/pages/about", destination: "/about", permanent: true },
      { source: "/pages/privacy-policy", destination: "/", permanent: true },
      { source: "/pages/terms-and-conditions", destination: "/", permanent: true },
      { source: "/pages/disclaimer", destination: "/", permanent: true },

      // Catch-all wildcards for old Shopify URL structures
      // IMPORTANT: use [^.]+ so we don't accidentally redirect static files like
      // /products/plus-video-doorbell.png (which must keep serving from /public).
      { source: "/products/:slug([^.]+)", destination: "/services", permanent: true },
      { source: "/collections/:slug([^.]+)", destination: "/services", permanent: true },
      { source: "/pages/:slug([^.]+)", destination: "/", permanent: true },
      { source: "/blogs/:slug([^.]+)", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },

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

      // Old blog index + any old blog post → smartcareliving.ie blog index.
      // Previously this was ~30 per-post redirects pointing at specific
      // smartcareliving.ie URLs; many of those destinations 404'd which was
      // flooding Search Console with "Page with redirect — Failed". Collapsed
      // to a single catch-all to a guaranteed-live destination.
      { source: "/blogs/safe-ageing-powered-by-ai", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
      { source: "/blogs/safe-ageing-powered-by-ai/:slug*", destination: "https://www.smartcareliving.ie/blogs/news", permanent: true },
    ];
  },
};

export default nextConfig;
