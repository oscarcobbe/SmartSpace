"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAllProducts, getProductByHandle, ShopifyProduct } from "@/lib/shopify";
import AddToCartButton from "@/components/AddToCartButton";
import { getProductImage } from "@/data/productImages";

const categoryConfig: Record<string, { title: string; description: string; filter: (p: ShopifyProduct) => boolean }> = {
  doorbells: {
    title: "Video Doorbells",
    description: "See, hear, and speak to anyone at your door from anywhere with Ring Video Doorbells.",
    filter: (p) => p.productType === "Video Doorbell" && !p.title.toLowerCase().includes("bundle"),
  },
  cameras: {
    title: "Security Cameras",
    description: "Keep watch over your home inside and out with Ring Security Cameras.",
    filter: (p) => p.productType === "Security Cam",
  },
  bundles: {
    title: "Bundles & Packs",
    description: "Save more with Ring bundles. Complete home security packages at great prices.",
    filter: (p) => {
      const isBundleTag = p.tags.includes("Bundle");
      const isBundleTitle = p.title.toLowerCase().includes("bundle") || p.title.toLowerCase().includes("calculator");
      return (isBundleTag || isBundleTitle) && p.productType !== "Consultation";
    },
  },
  services: {
    title: "Services",
    description: "Professional installation, consultations, and monitoring subscriptions.",
    filter: (p) => p.productType === "Consultation" || p.productType === "Subscription",
  },
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currencyCode }).format(parseFloat(amount));
}

export default function CategoryPage() {
  const params = useParams();
  const category = params.category as string;
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const config = categoryConfig[category] ?? null;

  useEffect(() => {
    if (!config) {
      setLoading(false);
      return;
    }
    const filterFn = config.filter;
    getAllProducts()
      .then((all) => {
        setProducts(all.filter(filterFn));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // If not a category, this might be a product handle - redirect logic handled by checking config
  if (!config) {
    return <ProductByHandle handle={category} />;
  }

  return (
    <div className="pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-brand-500">Home</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-brand-500">Products</Link>
            <span>/</span>
            <span className="text-[#1a1a1a] font-medium">{config.title}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] mb-3">{config.title}</h1>
          <p className="text-gray-500 max-w-2xl">{config.description}</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Products Grid */}
        {!loading && products.length === 0 && (
          <p className="text-gray-500 text-center py-20">No products found in this category.</p>
        )}

        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const image = getProductImage(product.handle, product.images.edges[0]?.node.url);
              const price = product.priceRange.minVariantPrice;
              const comparePrice = product.compareAtPriceRange?.minVariantPrice;
              const hasDiscount = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount);
              const variantId = product.variants.edges[0]?.node.id;

              return (
                <div key={product.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/products/${product.handle}`}>
                    <div className="relative bg-[#f8f8f8] aspect-square p-6 flex items-center justify-center">
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
                    <Link href={`/products/${product.handle}`}>
                      <h3 className="font-bold text-[#1a1a1a] group-hover:text-brand-500 transition-colors mb-2">
                        {product.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl font-extrabold text-[#1a1a1a]">
                        {formatPrice(price.amount, price.currencyCode)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm text-gray-400 line-through">
                          {formatPrice(comparePrice.amount, comparePrice.currencyCode)}
                        </span>
                      )}
                    </div>
                    {variantId && <AddToCartButton variantId={variantId} size="sm" className="w-full" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Fallback: if the URL isn't a known category, treat it as a product handle
function ProductByHandle({ handle }: { handle: string }) {
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getProductByHandle(handle)
      .then((p) => {
        if (!p) setNotFound(true);
        else setProduct(p);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) {
    return (
      <div className="pt-40 flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="pt-40 text-center py-20">
        <h1 className="text-2xl font-bold text-[#1a1a1a] mb-4">Product not found</h1>
        <Link href="/products" className="text-brand-500 hover:underline">Back to Products</Link>
      </div>
    );
  }

  const image = product.images.edges[0]?.node.url;
  const price = product.priceRange.minVariantPrice;
  const comparePrice = product.compareAtPriceRange?.minVariantPrice;
  const hasDiscount = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount);
  const variantId = product.variants.edges[0]?.node.id;

  return (
    <div className="pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-brand-500">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-500">Products</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">{product.title}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <div className="bg-[#f8f8f8] rounded-2xl p-8 flex items-center justify-center aspect-square">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={product.title} className="max-h-full max-w-full object-contain" />
            )}
          </div>

          {/* Details */}
          <div>
            {product.productType && (
              <span className="inline-block bg-brand-500/10 text-brand-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                {product.productType}
              </span>
            )}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] mb-4">{product.title}</h1>
            <p className="text-gray-500 leading-relaxed mb-6">{product.description}</p>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-extrabold text-[#1a1a1a]">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(comparePrice.amount, comparePrice.currencyCode)}
                  </span>
                  <span className="text-sm font-bold text-green-600">
                    Save {formatPrice((parseFloat(comparePrice.amount) - parseFloat(price.amount)).toString(), price.currencyCode)}
                  </span>
                </>
              )}
            </div>

            <div className="flex gap-3 mb-8">
              {variantId && <AddToCartButton variantId={variantId} size="lg" className="flex-1" />}
              <Link
                href="/contact"
                className="inline-flex items-center justify-center border-2 border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
              >
                Book Installation
              </Link>
            </div>

            {product.descriptionHtml && (
              <div className="border-t pt-6">
                <h3 className="font-bold text-[#1a1a1a] mb-3">Product Details</h3>
                <div
                  className="text-gray-500 text-sm leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
