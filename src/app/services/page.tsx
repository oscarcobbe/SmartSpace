"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAllProducts, ShopifyProduct } from "@/lib/shopify";
import { getProductImage } from "@/data/productImages";
import { ArrowRight } from "lucide-react";

const serviceCategories = [
  {
    title: "Video Doorbells",
    description: "See, hear, and speak to anyone at your door. Professionally installed.",
    href: "/services/doorbell",
    filter: (p: ShopifyProduct) => ["plus-video-doorbell", "pro-video-doorbell"].includes(p.handle),
  },
  {
    title: "Floodlight Cameras",
    description: "Powerful floodlight cameras for driveways, gardens, and entrances.",
    href: "/services/camera",
    filter: (p: ShopifyProduct) => ["plus-floodlight-cam", "pro-floodlight-cam"].includes(p.handle),
  },
  {
    title: "Driveway Bundle",
    description: "Video Doorbell + Floodlight Cam — protect your front entrance.",
    href: "/services/bundles/driveway",
    filter: (p: ShopifyProduct) => p.handle === "plus-driveway-bundle" || p.handle === "pro-driveway-bundle",
  },
  {
    title: "Whole Home Bundle",
    description: "Video Doorbell + 2x Floodlights — complete home coverage.",
    href: "/services/bundles/whole-home",
    filter: (p: ShopifyProduct) => p.handle === "plus-whole-home-bundle" || p.handle === "pro-whole-home-bundle",
    imageClass: "max-h-[70%] max-w-[70%]",
  },
  {
    title: "Installation Only",
    description: "Already have a Ring, Eufy, Nest or Tapo device? We'll install it.",
    href: "/services/installation-only",
    filter: () => false,
    staticImage: "/products/installation.png",
  },
  {
    title: "Free Consultation",
    description: "Not sure what you need? Book a free home visit — no obligation.",
    href: "/services/free-consultation",
    filter: () => false,
    staticImage: "/products/consultation.png",
  },
];

export default function ServicesPage() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProducts()
      .then(setProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Our Services
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Everything supplied, professionally installed, and configured. Choose the service that fits your home.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCategories.map((cat) => {
              const matchingProduct = products.find(cat.filter);
              const image = cat.staticImage
                || (matchingProduct
                  ? getProductImage(matchingProduct.handle, matchingProduct.images.edges[0]?.node.url)
                  : null);

              return (
                <Link
                  key={cat.title}
                  href={cat.href}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative bg-transparent aspect-[4/3] flex items-center justify-center p-4 overflow-hidden rounded-t-2xl">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={cat.title}
                        className={`${cat.imageClass || "max-h-full max-w-full"} object-cover rounded-xl group-hover:scale-105 transition-transform duration-300`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-gray-300 text-sm">No image</div>
                    )}
                  </div>
                  <div className="p-6">
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-brand-500 transition-colors mb-2">
                      {cat.title}
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">{cat.description}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500">
                      View Options <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
