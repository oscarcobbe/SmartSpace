"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllProducts, ShopifyProduct } from "@/lib/shopify";
import { getProductImage } from "@/data/productImages";
import { Check } from "lucide-react";

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currencyCode }).format(parseFloat(amount));
}

export default function CameraServicePage() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProducts()
      .then((all) => {
        const newHandles = ["plus-floodlight-cam", "pro-floodlight-cam"];
        const cameras = all.filter((p) => newHandles.includes(p.handle));
        setProducts(cameras);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/services" className="hover:text-brand-500 transition-colors">Services</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Floodlight Cameras</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Floodlight Cameras
          </h1>
          <p className="text-gray-500 max-w-2xl">
            Powerful floodlight cameras for driveways, gardens, and rear entrances. All professionally supplied and installed.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Products */}
        {!loading && products.length === 0 && (
          <p className="text-gray-500 text-center py-20">No cameras found.</p>
        )}

        {!loading && products.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6">
            {products.map((product) => {
              const image = getProductImage(product.handle, product.images.edges[0]?.node.url);
              const price = product.priceRange.minVariantPrice;
              const comparePrice = product.compareAtPriceRange?.minVariantPrice;
              const hasDiscount = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount);
              return (
                <div key={product.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                  <Link href={`/services/${product.handle}`}>
                    <div className="relative bg-transparent aspect-square p-6 flex items-center justify-center">
                      {image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={product.title}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      )}
                      {hasDiscount && (
                        <span className="absolute top-4 left-4 bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Save {formatPrice((parseFloat(comparePrice.amount) - parseFloat(price.amount)).toString(), price.currencyCode)}
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="p-5 text-center sm:text-left">
                    <Link href={`/services/${product.handle}`}>
                      <h3 className="font-bold text-[#1a1a1a] group-hover:text-brand-500 transition-colors mb-2">
                        {product.title}
                      </h3>
                    </Link>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-3">
                      <span className="text-xl font-extrabold text-[#1a1a1a]">
                        {formatPrice(price.amount, price.currencyCode)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(comparePrice.amount, comparePrice.currencyCode)}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {[
                        product.handle === "pro-floodlight-cam"
                          ? "Retinal 4K image quality"
                          : "1080p image quality",
                        "Professional installation",
                        "Optimal positioning",
                        "App setup & config",
                      ].map((f) => (
                        <li key={f} className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-500">
                          <Check className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href={`/services/${product.handle}`} className="block text-center bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">
                      View Options
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Don't see what you need */}
        <div className="mt-12 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 font-semibold transition-colors"
          >
            Don&apos;t see what you need? Click here to contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
