// Ring stock images from eu.ring.com mapped to Shopify product handles
// These override Shopify product images with clean Ring product shots

export const ringStockImages: Record<string, string> = {
  // Video Doorbells
  "basic-video-doorbell-mains-or-battery-powered":
    "https://eu.ring.com/cdn/shop/files/variant-54340225663314-en-eu_b933453b-ed71-4b63-8bf5-2763bd08b28d_860x.png?v=1773731264",
  "advanced-video-doorbell-pro-wired":
    "https://eu.ring.com/cdn/shop/files/product-41968146940242-media-en-eu_0d4fb0a7-cdfb-4b3a-8b74-791fc8399893_860x.png?v=1773731736",
  "ring-video-doorbell-wired":
    "https://eu.ring.com/cdn/shop/files/variant-16702725357591-en-eu_860x.png?v=1759386441",

  // Security Cameras
  "security-cam-spotlight-cam":
    "https://eu.ring.com/cdn/shop/files/variant-29621751513111-en-eu_850c921b-6af4-48ee-821f-c74eaf0c0e7d_1280x1280_crop_center.jpg?v=1773731722",
  "security-cam-floodlight-cam-plus":
    "https://eu.ring.com/cdn/shop/files/variant-28075982946327-en-eu.png?v=1773731654",
  "floodlight-cam-pro-mains-powered-copy":
    "https://eu.ring.com/cdn/shop/files/variant-27953690181655-en-eu_b4dad571-f98e-4646-9d27-37debc690d79.png?v=1773731442",

  // Bundles - use a composite/doorbell image
  "ring-driveway-bundle":
    "https://eu.ring.com/cdn/shop/files/variant-52307160990034-en-eu_31ab8c86-a453-4e7f-a1f9-849fc1d2413e_860x.png?v=1773731141",
  "ring-driveway-bundle-premium":
    "https://eu.ring.com/cdn/shop/files/product-22856112963607-media-en-eu_97181620-a6bd-4a37-9eb8-359c0a8bf46b_860x.jpg?v=1773731198",

  // Whole home calculator
  "whole-house-security-calculator":
    "https://images.ctfassets.net/2xsswpd01u70/6oP3FvB0kESCnQarf0aZne/2a1822b84a39ba1bab9f9f36499bd03e/ring_products_build_your_system_mobile_2x.jpg",

  // Services / Consultations - use Ring app/lifestyle images
  "onsite-ring-of-security-consultation":
    "https://images.ctfassets.net/2xsswpd01u70/REgLnOYBXmHlBFx7AQdxb/90e8d42f40c993cf417a2f6b937f32e4/UK_LOS_doorbell_PDP_carousel_02_mobile_375x375_2x.jpg",
  "book-your-consultation-call":
    "https://images.ctfassets.net/2xsswpd01u70/7C9HbC9Av42wYDQ75BLKRU/da8bc0d74a4f3c751ed32c681a34db58/UK_LOS_doorbell_PDP_carousel_03_mobile_375x375_2x.jpg",
  "your-complementary-onsite-consultation":
    "https://images.ctfassets.net/2xsswpd01u70/3ZbW8pE8l0prF6somFOkhV/6100f3ba02bb997fcb8366c73ddfd261/UK_LOS_doorbell_PDP_carousel_04_mobile_375x375_2x.jpg",
  "smartguardian-monthly-subscription":
    "https://images.ctfassets.net/2xsswpd01u70/6oP3FvB0kESCnQarf0aZne/2a1822b84a39ba1bab9f9f36499bd03e/ring_products_build_your_system_mobile_2x.jpg",
};

// Colour-specific images for cameras (Black/White variants)
export const colourImages: Record<string, Record<string, string>> = {
  "security-cam-spotlight-cam": {
    White: "https://images.ctfassets.net/2xsswpd01u70/variant-29621751513111-en-eu/578f2cdbd3e7a49cb728063cd33b5916/variant-29621751513111-en-eu.jpg",
    Black: "https://images.ctfassets.net/2xsswpd01u70/variant-29621751676951-en-eu/297a49412bd534682fd6445e302f6120/variant-29621751676951-en-eu.jpg",
  },
  "security-cam-floodlight-cam-plus": {
    White: "https://images.ctfassets.net/2xsswpd01u70/variant-28075982946327-en-eu/e19341cec67feccd048794376c80287d/variant-28075982946327-en-eu.png",
    Black: "https://images.ctfassets.net/2xsswpd01u70/variant-28075983011863-en-eu/760b7fcb29154d357c5200e60d80169d/variant-28075983011863-en-eu.png",
  },
  "floodlight-cam-pro-mains-powered-copy": {
    White: "https://images.ctfassets.net/2xsswpd01u70/variant-27953690181655-en-eu/aa0401f9965e1c40923bc2ac2edbee2a/variant-27953690181655-en-eu.png",
    Black: "https://images.ctfassets.net/2xsswpd01u70/variant-27953690247191-en-eu/4aac054e5b3696ce179ca1b329c50bcb/variant-27953690247191-en-eu.png",
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
