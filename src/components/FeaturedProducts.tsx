"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAllProducts, ShopifyProduct } from "@/lib/shopify";
import ProductCard from "./ProductCard";

const NEW_SINGLES = ["plus-video-doorbell", "pro-video-doorbell", "plus-floodlight-cam", "pro-floodlight-cam"];
const NEW_BUNDLES = ["plus-driveway-bundle", "pro-driveway-bundle", "plus-whole-home-bundle", "pro-whole-home-bundle", "eldercare-security-bundle"];

function isSingleProduct(product: ShopifyProduct): boolean {
  return NEW_SINGLES.includes(product.handle);
}

function isBundleProduct(product: ShopifyProduct): boolean {
  return NEW_BUNDLES.includes(product.handle);
}

type Tab = "singles" | "bundles";

export default function FeaturedProducts() {
  const [allProducts, setAllProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("singles");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllProducts()
      .then(setAllProducts)
      .catch((err) => console.error("Failed to load featured products:", err))
      .finally(() => setLoading(false));
  }, []);

  // Reset scroll when switching tabs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0 });
    }
  }, [activeTab]);

  const singles = allProducts.filter(isSingleProduct);
  const bundles = allProducts.filter(isBundleProduct);
  const featured = activeTab === "singles" ? singles : bundles;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

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

  if (singles.length === 0 && bundles.length === 0) return null;

  return (
    <section className="py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with toggle */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-4">
              Featured Products
            </h2>
            {/* Toggle */}
            <div className="inline-flex bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setActiveTab("singles")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === "singles"
                    ? "bg-white text-[#1a1a1a] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Single Products
              </button>
              <button
                onClick={() => setActiveTab("bundles")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeTab === "bundles"
                    ? "bg-white text-[#1a1a1a] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Bundles
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full border border-gray-200 hover:border-gray-400 transition-colors hidden sm:block"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full border border-gray-200 hover:border-gray-400 transition-colors hidden sm:block"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <Link
              href={activeTab === "singles" ? "/services" : "/services/bundles"}
              className="text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors hidden sm:block ml-2"
            >
              View All
            </Link>
          </div>
        </div>

        {/* Product carousel */}
        {featured.length > 0 ? (
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4"
          >
            {featured.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-[220px] sm:w-[280px] snap-start"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-12">No {activeTab === "singles" ? "single products" : "bundles"} found.</p>
        )}

        <div className="text-center mt-6 sm:hidden">
          <Link
            href={activeTab === "singles" ? "/services" : "/services/bundles"}
            className="text-sm font-semibold text-brand-500"
          >
            View All {activeTab === "singles" ? "Products" : "Bundles"}
          </Link>
        </div>
      </div>
    </section>
  );
}
