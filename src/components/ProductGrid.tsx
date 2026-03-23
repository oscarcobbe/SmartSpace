"use client";

import { useState, useEffect } from "react";
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

export default function ProductGrid() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProducts()
      .then((all) => {
        const hardware = all.filter(isHardwareProduct);
        setProducts(hardware);
      })
      .catch((err) => console.error("Failed to load products:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-r-transparent" />
        <p className="mt-4 text-gray-400">Loading products...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Count */}
      <p className="text-sm text-gray-500 mb-6">
        Showing {products.length} product{products.length !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-center text-gray-400 py-12 text-lg">
          No products available. Check back soon!
        </p>
      )}
    </div>
  );
}
