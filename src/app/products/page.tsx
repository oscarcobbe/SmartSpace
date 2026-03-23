"use client";

import { Suspense } from "react";
import ProductGrid from "@/components/ProductGrid";

export default function ProductsPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            All Products
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl">
            Browse our complete range of Ring security products. All products come with
            optional professional installation across Ireland.
          </p>
        </div>

        <Suspense fallback={<div className="py-12 text-center text-gray-400">Loading products...</div>}>
          <ProductGrid />
        </Suspense>
      </div>
    </div>
  );
}
