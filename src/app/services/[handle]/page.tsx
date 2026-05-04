import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Info, Phone } from "lucide-react";
import { getAllProducts, getProductByHandle } from "@/lib/shopify";
import { getProductFeatures, getFeatureIcon } from "@/data/productFeatures";
import ProductHero from "@/components/ProductHero";
import ProductCard from "@/components/ProductCard";

const SITE = "https://smart-space.ie";

const CURATED_HANDLES = [
  "plus-video-doorbell",
  "pro-video-doorbell",
  "plus-floodlight-cam",
  "pro-floodlight-cam",
  "plus-driveway-bundle",
  "pro-driveway-bundle",
  "plus-whole-home-bundle",
  "pro-whole-home-bundle",
  "eldercare-security-bundle",
];

export function generateStaticParams() {
  return CURATED_HANDLES.map((handle) => ({ handle }));
}

const titleRenames: [RegExp, string][] = [
  [/\(Premium\)/gi, "(Pro)"],
];

function displayTitle(title: string): string {
  let result = title;
  for (const [pattern, replacement] of titleRenames) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

const categoryBreadcrumbs: Record<string, { href: string; title: string }> = {
  "Video Doorbell": { href: "/services/doorbell", title: "Video Doorbells" },
  "Security Cam": { href: "/services/camera", title: "Floodlight Cameras" },
};

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const product = await getProductByHandle(params.handle);
  if (!product) {
    return { title: "Product not found" };
  }
  const title = displayTitle(product.title);
  const features = getProductFeatures(product.handle, product.productType);
  const description = features?.shortDescription
    ? features.shortDescription.slice(0, 160)
    : `Professional ${title} installation across Dublin and all of Leinster. Supplied, fitted, and configured by Smart Space.`;
  const url = `${SITE}/services/${product.handle}`;
  const minPrice = product.priceRange.minVariantPrice.amount;
  return {
    title: `${title} | Smart Space`,
    description,
    alternates: { canonical: `/services/${product.handle}` },
    openGraph: {
      title: `${title} | Smart Space`,
      description,
      url,
      type: "website",
      images: [{ url: `${SITE}/og-default.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Smart Space`,
      description,
      images: [`${SITE}/og-default.png`],
    },
    other: {
      "product:price:amount": minPrice,
      "product:price:currency": "EUR",
    },
  };
}

export default async function ServiceDetailPage({ params }: { params: { handle: string } }) {
  const [product, all] = await Promise.all([
    getProductByHandle(params.handle),
    getAllProducts(),
  ]);

  if (!product) notFound();

  const title = displayTitle(product.title);
  const features = getProductFeatures(product.handle, product.productType);
  const isService = product.productType === "Consultation" || product.productType === "Subscription";
  const isBundle = product.tags.includes("Bundle") || product.title.toLowerCase().includes("bundle");
  const categoryBreadcrumb = isBundle
    ? { href: "/services/bundles", title: "Bundles" }
    : categoryBreadcrumbs[product.productType] ?? null;

  const curatedSet = new Set(CURATED_HANDLES);
  const relatedProducts = all
    .filter((r) => r.productType === product.productType && r.handle !== product.handle)
    .filter((r) => curatedSet.has(r.handle))
    .slice(0, 4);

  // Service JSON-LD schema
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: title,
    name: `${title} Installation Dublin & Leinster`,
    description: features?.shortDescription ?? product.description,
    provider: { "@id": `${SITE}/#localbusiness` },
    areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
    offers: {
      "@type": "Offer",
      price: product.priceRange.minVariantPrice.amount,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: `${SITE}/services/${product.handle}`,
    },
  };

  // Product JSON-LD — same data as Service but Product/Offer schema gets
  // richer SERP treatment (price chip, availability, ratings) for product
  // pages. Both schemas can coexist on the same page.
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: features?.shortDescription ?? product.description,
    image: product.images.edges[0]?.node.url || `${SITE}/og-default.png`,
    brand: { "@type": "Brand", name: "Smart Space" },
    sku: product.handle,
    offers: {
      "@type": "Offer",
      url: `${SITE}/services/${product.handle}`,
      priceCurrency: "EUR",
      price: product.priceRange.minVariantPrice.amount,
      availability: "https://schema.org/InStock",
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      seller: { "@id": `${SITE}/#localbusiness` },
      areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      bestRating: "5",
      reviewCount: "100",
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
      ...(categoryBreadcrumb
        ? [{ "@type": "ListItem", position: 3, name: categoryBreadcrumb.title, item: `${SITE}${categoryBreadcrumb.href}` }]
        : []),
      {
        "@type": "ListItem",
        position: categoryBreadcrumb ? 4 : 3,
        name: title,
        item: `${SITE}/services/${product.handle}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="pt-28 sm:pt-40 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-brand-500 transition-colors">Services</Link>
            {categoryBreadcrumb && (
              <>
                <span>/</span>
                <Link href={categoryBreadcrumb.href} className="hover:text-brand-500 transition-colors">
                  {categoryBreadcrumb.title}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-[#1a1a1a] font-medium">{title}</span>
          </nav>

          {/* Chime notice */}
          {!(product.productType === "Security Cam" && !isBundle) && !isService && (
            <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-xl p-4 mb-10">
              <Info className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                <strong>All doorbell installations include the supply and setup of a Ring Chime</strong> — so you never miss a visitor, even when you&apos;re away from your phone.
              </p>
            </div>
          )}

          {/* Hero — passes product to client component for interactive variant/cart state */}
          <ProductHero product={product} shortDescription={features?.shortDescription} />

          {/* Key Features */}
          {features && features.highlights.length > 0 && (
            <section className="mt-16 lg:mt-24 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">Key Features</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {features.highlights.map((text, i) => {
                  const Icon = getFeatureIcon(text);
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-3 p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-semibold text-[#1a1a1a] leading-snug">{text}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Technical Specs */}
          {features && Object.keys(features.specs).length > 0 ? (
            <section className="mt-16 lg:mt-24 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">Technical Specifications</h2>
              <div className="rounded-2xl border border-gray-100 overflow-hidden max-w-2xl mx-auto text-left">
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
          ) : !features && product.descriptionHtml ? (
            <section className="mt-16 lg:mt-24 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">Product Details</h2>
              <div
                className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none bg-gray-50 rounded-2xl p-6 sm:p-8 text-left"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </section>
          ) : null}

          {/* Supplied & Fitted */}
          {!isService && (
            <section className="mt-16 lg:mt-24">
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-2xl p-8 sm:p-12 text-white text-center">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Supplied &amp; Fitted by Smart Space</h2>
                  <p className="text-white/70 mb-6">
                    Let Dublin&apos;s #1 Ring installer handle everything — we serve all of Leinster and set up your new device for optimal performance.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                    {[
                      "Professional mounting & wiring",
                      "Wi-Fi signal optimisation",
                      "Ring app setup & configuration",
                      "Motion zone tuning & walkthrough",
                    ].map((item) => (
                      <div key={item} className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-brand-500 flex-shrink-0" />
                        <span className="text-sm text-white/90">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-16 lg:mt-24 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] mb-8">You may also like</h2>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                {relatedProducts.map((rp) => (
                  <div key={rp.id} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)] max-w-xs">
                    <ProductCard product={rp} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Bottom CTA */}
          <section className="mt-16 lg:mt-24 text-center bg-gray-50 rounded-2xl p-8 sm:p-12">
            <h2 className="text-2xl font-extrabold text-[#1a1a1a] mb-3">Need help choosing?</h2>
            <p className="text-gray-500 mb-6 max-w-lg mx-auto">
              Our Ring experts are here to help you find the perfect security setup for your home.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="tel:+35315130424"
                className="inline-flex items-center gap-2 text-[#1a1a1a] font-semibold"
              >
                <Phone className="w-4 h-4" />
                01 513 0424
              </a>
              <Link href="/contact" className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors">
                Have a Question?
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
