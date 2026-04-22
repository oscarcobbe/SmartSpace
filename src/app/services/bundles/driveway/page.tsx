"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllProducts, ShopifyProduct } from "@/lib/shopify";
import { getProductImage } from "@/data/productImages";
import { Check, Shield, Star, Wrench, Award } from "lucide-react";

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currencyCode }).format(parseFloat(amount));
}

export default function DrivewayBundlePage() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProducts()
      .then((all) => {
        const driveway = all.filter((p) => p.handle === "plus-driveway-bundle" || p.handle === "pro-driveway-bundle");
        setProducts(driveway);
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
          <Link href="/services/bundles" className="hover:text-brand-500 transition-colors">Bundles</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Driveway Bundle</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Driveway Bundle
          </h1>
          <p className="text-gray-500 max-w-2xl">
            Video Doorbell + Floodlight Cam — protect your front entrance with a complete Ring system. Available in Basic, Popular, and Premium tiers.
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
          <p className="text-gray-500 text-center py-20">No driveway bundles found.</p>
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
                  <div className="p-5">
                    <Link href={`/services/${product.handle}`}>
                      <h3 className="font-bold text-[#1a1a1a] group-hover:text-brand-500 transition-colors mb-2">
                        {product.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-3">
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
                      {["Doorbell + Floodlight Cam", "Professional installation", "Ring Chime included"].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
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

        {/* Supplied & Fitted */}
        <section className="mt-16 lg:mt-24">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-2xl p-8 sm:p-12 text-white">
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Supplied &amp; Fitted by Smart Space</h2>
              <p className="text-white/70 mb-6">
                Let Dublin&apos;s #1 Ring installer handle everything — we serve all of Leinster and set up your new system for optimal performance.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "Professional mounting & wiring",
                  "Wi-Fi signal optimisation",
                  "Ring app setup & configuration",
                  "Motion zone tuning & walkthrough",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    <span className="text-sm text-white/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-2xl">
          {[
            { icon: Shield, text: "Dublin's #1 5★ Ring Installer" },
            { icon: Star, text: "5-Star Google Rating" },
            { icon: Wrench, text: "5,000+ Installations" },
            { icon: Award, text: "SME Winner 2025" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 justify-center">
              <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
              <span className="text-xs font-medium text-gray-600">{text}</span>
            </div>
          ))}
        </div>

        {/* Consultation CTA */}
        <div className="mt-12 text-center">
          <Link href="/contact" className="inline-flex items-center gap-2 text-brand-500 hover:text-brand-600 font-semibold transition-colors">
            Have questions? Get a free quote
          </Link>
        </div>
      </div>
    </div>
  );
}
