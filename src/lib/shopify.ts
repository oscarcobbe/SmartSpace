/**
 * Product catalogue API.
 *
 * Site used to fetch from Shopify's Storefront API at runtime. Decoupled
 * 2026-04-24 — product data now lives in src/data/productCatalogue.ts (a
 * frozen snapshot of what was in Shopify). These function signatures stay
 * the same so every existing call-site keeps working.
 *
 * Updating a product price = edit productCatalogue.ts, rebuild, deploy.
 */

// Types preserved from the original Shopify Storefront shape so call-sites
// don't need to change.

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  productType: string;
  tags: string[];
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  compareAtPriceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  options: {
    name: string;
    values: string[];
  }[];
  images: {
    edges: { node: { url: string; altText: string | null; width: number; height: number } }[];
  };
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        price: { amount: string; currencyCode: string };
        compareAtPrice: { amount: string; currencyCode: string } | null;
        selectedOptions: { name: string; value: string }[];
      };
    }[];
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    totalAmount: { amount: string; currencyCode: string };
    subtotalAmount: { amount: string; currencyCode: string };
  };
  lines: {
    edges: {
      node: {
        id: string;
        quantity: number;
        merchandise: {
          id: string;
          title: string;
          product: {
            title: string;
            handle: string;
            images: { edges: { node: { url: string } }[] };
          };
          price: { amount: string; currencyCode: string };
        };
      };
    }[];
  };
}

// Lazy import so any circular dependency with the catalogue stays clean.
import { PRODUCT_CATALOGUE } from "@/data/productCatalogue";

export async function getAllProducts(): Promise<ShopifyProduct[]> {
  return PRODUCT_CATALOGUE;
}

export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  return PRODUCT_CATALOGUE.find((p) => p.handle === handle) ?? null;
}
