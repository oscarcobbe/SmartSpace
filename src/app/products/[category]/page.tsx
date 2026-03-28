"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAllProducts, getProductByHandle, ShopifyProduct } from "@/lib/shopify";
import AddToCartButton from "@/components/AddToCartButton";
import ProductCard from "@/components/ProductCard";
import { getProductImage, getColourImage } from "@/data/productImages";
import { getProductFeatures, getFeatureIcon } from "@/data/productFeatures";
import {
  Star, Shield, Wrench, Award, Check, Phone,
} from "lucide-react";
import BookingCalendar from "@/components/BookingCalendar";

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
    title: "Other Brands",
    description: "Explore our range of smart home products from other leading brands.",
    filter: (p) => (p.productType === "Consultation" || p.productType === "Subscription") && !p.handle.includes("onsite-troubleshoot"),
  },
};

function formatPrice(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currencyCode }).format(parseFloat(amount));
}

const titleRenames: [RegExp, string][] = [
  [/\(Budget\)/gi, "(Plus)"],
  [/\(Premium\)/gi, "(Pro)"],
];

function displayTitle(title: string): string {
  let result = title;
  for (const [pattern, replacement] of titleRenames) {
    result = result.replace(pattern, replacement);
  }
  return result;
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
                    <Link href={`/products/${product.handle}`}>
                      <h3 className="font-bold text-[#1a1a1a] group-hover:text-brand-500 transition-colors mb-2">
                        {displayTitle(product.title)}
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
  const [relatedProducts, setRelatedProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [bookingSelection, setBookingSelection] = useState<{ date: string; timeSlot: string; dateLabel: string; slotLabel: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    setSelectedImage(0);
    setSelectedOptions({});
    Promise.all([getProductByHandle(handle), getAllProducts()])
      .then(([p, all]) => {
        if (!p) {
          setNotFound(true);
          return;
        }
        setProduct(p);
        const related = all
          .filter((r) => r.productType === p.productType && r.handle !== p.handle)
          .slice(0, 4);
        setRelatedProducts(related);
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

  // Images — Ring stock image only; fall back to first Shopify image
  const ringImage = getProductImage(handle, undefined);
  const shopifyImages = product.images.edges.map((e) => e.node.url);

  // Detect category for breadcrumb
  const categoryEntry = Object.entries(categoryConfig).find(([, cfg]) => {
    try { return cfg.filter(product); } catch { return false; }
  });
  const categorySlug = categoryEntry?.[0];
  const categoryTitle = categoryEntry?.[1]?.title;

  // Build selected options with defaults (first value for each option)
  const productOptions = product.options?.filter((o) => {
    if (o.values.length === 1 && o.values[0] === "Default Title") return false;
    // Remove faceplate/colour options for doorbells — customer's choice, not ours
    if (product.productType === "Video Doorbell" && /colou?r|faceplate/i.test(o.name)) return false;
    return true;
  }) ?? [];
  const effectiveOptions = { ...Object.fromEntries(productOptions.map((o) => [o.name, o.values[0]])), ...selectedOptions };

  // Colour-aware image: swap product photo when a camera colour is selected
  const selectedColour = Object.entries(effectiveOptions).find(([key]) => /colou?r/i.test(key))?.[1];
  const colourImage = selectedColour ? getColourImage(handle, selectedColour) : null;
  const baseImage = colourImage || ringImage;
  const allImages = baseImage ? [baseImage] : shopifyImages.slice(0, 1);

  // Find the matching variant based on selected options
  const matchedVariant = product.variants.edges.find((v) =>
    v.node.selectedOptions?.every((so) => effectiveOptions[so.name] === so.value)
  )?.node ?? product.variants.edges[0]?.node;

  const price = matchedVariant?.price ?? product.priceRange.minVariantPrice;
  const comparePrice = matchedVariant?.compareAtPrice ?? product.compareAtPriceRange?.minVariantPrice;
  const hasDiscount = comparePrice && parseFloat(comparePrice.amount) > parseFloat(price.amount);
  const variantId = matchedVariant?.id ?? product.variants.edges[0]?.node.id;
  const isService = product.productType === "Consultation" || product.productType === "Subscription";

  // Curated features
  const features = getProductFeatures(product.handle, product.productType);

  return (
    <div className="pt-40 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-brand-500 transition-colors">Products</Link>
          {categorySlug && categoryTitle && (
            <>
              <span>/</span>
              <Link href={`/products/${categorySlug}`} className="hover:text-brand-500 transition-colors">
                {categoryTitle}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium truncate max-w-[200px]">{displayTitle(product.title)}</span>
        </nav>

        {/* ── Section 1: Hero — Image Gallery + Product Info ── */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
          {/* Left: Image Gallery */}
          <div>
            <div className="bg-transparent rounded-2xl p-6 sm:p-10 flex items-center justify-center aspect-square mb-4">
              {allImages[selectedImage] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={allImages[selectedImage]}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain transition-opacity duration-300"
                />
              ) : (
                <div className="text-gray-300 text-sm">No image available</div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-transparent p-1.5 border-2 transition-all ${
                      selectedImage === i
                        ? "border-brand-500 ring-1 ring-brand-500/30"
                        : "border-transparent hover:border-gray-200"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Info */}
          <div className="flex flex-col">
            {product.productType && (
              <span className="inline-block w-fit bg-brand-500/10 text-brand-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
                {product.productType}
              </span>
            )}

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] leading-tight mb-3">
              {displayTitle(product.title)}
            </h1>

            {/* Social proof */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-sm text-gray-500">5.0</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm text-gray-500">5,000+ installations</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-extrabold text-[#1a1a1a]">
                {formatPrice(price.amount, price.currencyCode)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(comparePrice.amount, comparePrice.currencyCode)}
                  </span>
                  <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    Save {formatPrice((parseFloat(comparePrice.amount) - parseFloat(price.amount)).toString(), price.currencyCode)}
                  </span>
                </>
              )}
            </div>

            {/* Short description */}
            <p className="text-gray-600 leading-relaxed mb-6">
              {features?.shortDescription || product.description}
            </p>

            {/* Variant selector — dropdowns per option */}
            {productOptions.length > 0 && (
              <div className="space-y-4 mb-6">
                {productOptions.map((option) => {
                  const isColour = /colou?r/i.test(option.name);
                  const colourMap: Record<string, string> = {
                    black: "#1a1a1a", white: "#ffffff", bronze: "#CD7F32", silver: "#C0C0C0",
                    "satin nickel": "#B8B8B8", grey: "#808080", gray: "#808080", blue: "#3B82F6",
                  };
                  const selectedVal = effectiveOptions[option.name] ?? option.values[0];

                  return (
                    <div key={option.name}>
                      <label className="block text-sm font-semibold text-[#1a1a1a] mb-1.5">
                        {/accessor/i.test(option.name) && product.productType === "Video Doorbell"
                          ? "Add An Accessory (One Chime Already Included)"
                          : option.name.replace(/\s*\?\s*$/, "")}{isColour && selectedVal ? `: ${selectedVal}` : ""}
                      </label>
                      {isColour ? (
                        <div className="flex flex-wrap gap-3">
                          {option.values.map((val) => {
                            const hex = colourMap[val.toLowerCase()] || "#ccc";
                            const isSelected = selectedVal === val;
                            return (
                              <button
                                key={val}
                                onClick={() => setSelectedOptions((prev) => ({ ...prev, [option.name]: val }))}
                                className={`w-10 h-10 rounded-full border-2 transition-all relative ${
                                  isSelected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-gray-200 hover:border-gray-400"
                                }`}
                                style={{ backgroundColor: hex }}
                                title={val}
                              >
                                {isSelected && (
                                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
                                    val.toLowerCase() === "white" ? "text-gray-800" : "text-white"
                                  }`}>✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : option.values.length <= 4 ? (
                        <div className="flex flex-wrap gap-2">
                          {option.values.map((val) => (
                            <button
                              key={val}
                              onClick={() => setSelectedOptions((prev) => ({ ...prev, [option.name]: val }))}
                              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                                selectedVal === val
                                  ? "border-brand-500 bg-brand-500/5 text-brand-500"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <select
                          value={selectedVal}
                          onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [option.name]: e.target.value }))}
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 focus:border-brand-500 focus:outline-none transition-colors"
                        >
                          {option.values.map((val) => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Booking Calendar */}
            {!isService && (
              <div className="mb-6">
                <BookingCalendar
                  compact
                  onSelectionChange={setBookingSelection}
                />
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3 mb-6">
              {variantId && (
                <AddToCartButton
                  variantId={variantId}
                  size="lg"
                  className="w-full"
                  attributes={bookingSelection ? [
                    { key: "Installation Date", value: bookingSelection.dateLabel },
                    { key: "Installation Time", value: bookingSelection.slotLabel },
                    { key: "_booking_date", value: bookingSelection.date },
                    { key: "_booking_slot", value: bookingSelection.timeSlot },
                  ] : undefined}
                />
              )}
            </div>

            {/* ── Trust Strip ── */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl">
              {[
                { icon: Shield, text: "Dublin's Only 5★ Ring Installer" },
                { icon: Star, text: "5-Star Google Rating" },
                { icon: Wrench, text: "5,000+ Installations" },
                { icon: Award, text: "SME Winner 2025" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <span className="text-xs font-medium text-gray-600">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2: Key Features ── */}
        {features && features.highlights.length > 0 && (
          <section className="mt-16 lg:mt-24">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">Key Features</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.highlights.map((text, i) => {
                const Icon = getFeatureIcon(text);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-[#1a1a1a] leading-snug pt-2">{text}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Section 3: Technical Specs ── */}
        {features && Object.keys(features.specs).length > 0 ? (
          <section className="mt-16 lg:mt-24">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">Technical Specifications</h2>
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              {Object.entries(features.specs).map(([key, value], i) => (
                <div
                  key={key}
                  className={`flex justify-between items-center px-6 py-4 ${
                    i % 2 === 0 ? "bg-gray-50" : "bg-white"
                  }`}
                >
                  <span className="text-sm font-medium text-gray-500">{key}</span>
                  <span className="text-sm font-semibold text-[#1a1a1a] text-right">{value}</span>
                </div>
              ))}
            </div>
          </section>
        ) : product.descriptionHtml ? (
          <section className="mt-16 lg:mt-24">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">Product Details</h2>
            <div
              className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none bg-gray-50 rounded-2xl p-6 sm:p-8"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          </section>
        ) : null}

        {/* ── Section 4: Professional Installation Banner ── */}
        {!isService && (
          <section className="mt-16 lg:mt-24">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-2xl p-8 sm:p-12 text-white">
              <div className="max-w-3xl">
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Supplied &amp; Fitted by Smart Space</h2>
                <p className="text-white/70 mb-6">
                  Let Leinster&apos;s top-rated Ring installer handle everything. Sit back while we set up your new device for optimal performance.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-8">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div>
                    <span className="text-3xl font-extrabold">From &euro;139</span>
                    <span className="text-white/50 text-sm ml-2">per installation</span>
                  </div>
                  <Link
                    href="/installation"
                    className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
                  >
                    Book Installation
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 5: Related Products ── */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 lg:mt-24">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">You may also like</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((rp) => (
                <ProductCard key={rp.id} product={rp} />
              ))}
            </div>
          </section>
        )}

        {/* ── Section 6: Bottom CTA ── */}
        <section className="mt-16 lg:mt-24 text-center bg-gray-50 rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-3">Need help choosing?</h2>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">
            Our Ring experts are here to help you find the perfect security setup for your home. Free, no-obligation consultation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:+35315130424"
              className="inline-flex items-center gap-2 text-[#1a1a1a] font-semibold"
            >
              <Phone className="w-4 h-4" />
              01 513 0424
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
            >
              Book Free Consultation
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
