// Product images mapped to Shopify product handles
// Local images in /public/products/ from Website assets folder

// ── New product lineup (from Excel) ──
export const ringStockImages: Record<string, string> = {
  // Single Doorbells
  "plus-video-doorbell": "/products/plus-video-doorbell.png",
  "pro-video-doorbell": "/products/pro-video-doorbell.png",

  // Single Floodlights (default = black)
  "plus-floodlight-cam": "/products/plus-floodlight-black.png",
  "pro-floodlight-cam": "/products/pro-floodlight-black.png",

  // Driveway Bundles (default = black)
  "plus-driveway-bundle": "/products/plus-driveway-black.png",
  "pro-driveway-bundle": "/products/pro-driveway-black.png",

  // Whole Home Bundles (default = both black)
  "plus-whole-home-bundle": "/products/plus-wholehome-black-black.png",
  "pro-whole-home-bundle": "/products/pro-wholehome-black-black.png",

  // Eldercare
  "eldercare-security-bundle": "/products/Eldercare bundle.png",
  "installation-only": "/products/installation.png",
  "onsite-troubleshoot-installation-set-up-of-customer-bought-ring-products":
    "/products/installation.png",

  // Smart Keybox (for reference)
  "smart-keybox": "/products/smart-keybox.jpg",

  // ── Legacy products (kept in Shopify but hidden from new pages) ──
  "basic-video-doorbell-mains-or-battery-powered":
    "https://eu.ring.com/cdn/shop/files/variant-54340225663314-en-eu_b933453b-ed71-4b63-8bf5-2763bd08b28d_860x.png?v=1773731264",
  "advanced-video-doorbell-pro-wired":
    "https://eu.ring.com/cdn/shop/files/product-41968146940242-media-en-eu_0d4fb0a7-cdfb-4b3a-8b74-791fc8399893_860x.png?v=1773731736",
  "ring-video-doorbell-wired":
    "https://eu.ring.com/cdn/shop/files/variant-16702725357591-en-eu_860x.png?v=1759386441",
  "security-cam-spotlight-cam":
    "https://eu.ring.com/cdn/shop/files/variant-29621751513111-en-eu_850c921b-6af4-48ee-821f-c74eaf0c0e7d_1280x1280_crop_center.jpg?v=1773731722",
  "security-cam-floodlight-cam-plus":
    "https://eu.ring.com/cdn/shop/files/variant-28075982946327-en-eu.png?v=1773731654",
  "floodlight-cam-pro-mains-powered-copy":
    "https://eu.ring.com/cdn/shop/files/variant-27953690181655-en-eu_b4dad571-f98e-4646-9d27-37debc690d79.png?v=1773731442",
  "ring-driveway-bundle":
    "https://eu.ring.com/cdn/shop/files/variant-52307160990034-en-eu_31ab8c86-a453-4e7f-a1f9-849fc1d2413e_860x.png?v=1773731141",
  "ring-driveway-bundle-premium":
    "https://eu.ring.com/cdn/shop/files/product-22856112963607-media-en-eu_97181620-a6bd-4a37-9eb8-359c0a8bf46b_860x.jpg?v=1773731198",
  "whole-house-security-calculator":
    "https://images.ctfassets.net/2xsswpd01u70/6oP3FvB0kESCnQarf0aZne/2a1822b84a39ba1bab9f9f36499bd03e/ring_products_build_your_system_mobile_2x.jpg",
  "driveway-bundle-standard":
    "https://eu.ring.com/cdn/shop/files/variant-52307160990034-en-eu_31ab8c86-a453-4e7f-a1f9-849fc1d2413e_860x.png?v=1773731141",
  "driveway-bundle-advanced":
    "https://eu.ring.com/cdn/shop/files/product-22856112963607-media-en-eu_97181620-a6bd-4a37-9eb8-359c0a8bf46b_860x.jpg?v=1773731198",
  "whole-home-bundle-standard":
    "https://images.ctfassets.net/2xsswpd01u70/6oP3FvB0kESCnQarf0aZne/2a1822b84a39ba1bab9f9f36499bd03e/ring_products_build_your_system_mobile_2x.jpg",
  "whole-home-bundle-advanced":
    "https://images.ctfassets.net/2xsswpd01u70/6oP3FvB0kESCnQarf0aZne/2a1822b84a39ba1bab9f9f36499bd03e/ring_products_build_your_system_mobile_2x.jpg",
  "eldercare-bundle":
    "https://eu.ring.com/cdn/shop/files/variant-16702725357591-en-eu_860x.png?v=1759386441",
  "onsite-ring-of-security-consultation":
    "https://images.ctfassets.net/2xsswpd01u70/REgLnOYBXmHlBFx7AQdxb/90e8d42f40c993cf417a2f6b937f32e4/UK_LOS_doorbell_PDP_carousel_02_mobile_375x375_2x.jpg",
  "book-your-consultation-call":
    "https://images.ctfassets.net/2xsswpd01u70/7C9HbC9Av42wYDQ75BLKRU/da8bc0d74a4f3c751ed32c681a34db58/UK_LOS_doorbell_PDP_carousel_03_mobile_375x375_2x.jpg",
  "your-complementary-onsite-consultation":
    "https://images.ctfassets.net/2xsswpd01u70/3ZbW8pE8l0prF6somFOkhV/6100f3ba02bb997fcb8366c73ddfd261/UK_LOS_doorbell_PDP_carousel_04_mobile_375x375_2x.jpg",
  "smartguardian-monthly-subscription":
    "https://images.ctfassets.net/2xsswpd01u70/6oP3FvB0kESCnQarf0aZne/2a1822b84a39ba1bab9f9f36499bd03e/ring_products_build_your_system_mobile_2x.jpg",
};

// Colour-specific images for products with colour variants
export const colourImages: Record<string, Record<string, string>> = {
  // Floodlights
  "plus-floodlight-cam": {
    Black: "/products/plus-floodlight-black.png",
    White: "/products/plus-floodlight-white.png",
  },
  "pro-floodlight-cam": {
    Black: "/products/pro-floodlight-black.png",
    White: "/products/pro-floodlight-white.png",
  },
  // Driveway Bundles
  "plus-driveway-bundle": {
    Black: "/products/plus-driveway-black.png",
    White: "/products/plus-driveway-white.png",
  },
  "pro-driveway-bundle": {
    Black: "/products/pro-driveway-black.png",
    White: "/products/pro-driveway-white.png",
  },
  // Whole Home Bundles (keyed by Floodlight Colours option value)
  "plus-whole-home-bundle": {
    "Both Black": "/products/plus-wholehome-black-black.png",
    "Both White": "/products/plus-wholehome-white-white.png",
    "Mixed (Black & White)": "/products/plus-wholehome-black-white.png",
  },
  "pro-whole-home-bundle": {
    "Both Black": "/products/pro-wholehome-black-black.png",
    "Both White": "/products/pro-wholehome-white-white.png",
    "Mixed (Black & White)": "/products/pro-wholehome-white-black.png",
  },
};

/**
 * Get colour-specific image for a product variant
 */
export function getColourImage(handle: string, colour: string): string | null {
  return colourImages[handle]?.[colour] ?? null;
}

/**
 * Get the Ring stock image for a product, falling back to the Shopify image
 */
export function getProductImage(handle: string, shopifyImageUrl?: string): string {
  return ringStockImages[handle] || shopifyImageUrl || "";
}
