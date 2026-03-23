"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllProducts, ShopifyProduct } from "@/lib/shopify";
import ProductCard from "./ProductCard";

function isHardwareProduct(product: ShopifyProduct): boolean {
  const price = parseFloat(product.priceRange.minVariantPrice.amount);
  if (price === 0) return false;
  if (product.productType === "Consultation") return false;
  const titleLower = product.title.toLowerCase();
  if (titleLower.includes("consultation")) return false;
  if (titleLower.includes("subscription")) return false;
  if (titleLower.includes("installation service")) return false;
  return true;
}

export default function FeaturedProducts() {
  const [featured, setFeatured] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProducts()
      .then((all) => {
        const hardware = all.filter(isHardwareProduct);
        setFeatured(hardware.slice(0, 4));
      })
      .catch((err) => console.error("Failed to load featured products:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">
            Featured Products
          </h2>
          <div className="py-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-r-transparent" />
            <p className="mt-4 text-gray-400">Loading products...</p>
          </div>
        </div>
      </section>
    );
  }

  if (featured.length === 0) return null;

  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a]">
            Featured Products
          </h2>
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors hidden sm:block"
          >
            View All
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="text-center mt-8 sm:hidden">
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-500"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}
