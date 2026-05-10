import Link from "next/link";
import { Check, Shield, Star, Wrench, Award } from "lucide-react";
import { getAllProducts } from "@/lib/shopify";
import { getProductImage } from "@/data/productImages";

const SITE = "https://smart-space.ie";

function formatPrice(amount: string, currencyCode: string) {
  // Drop `.00` on whole-euro prices sitewide; keep cents otherwise.
  const n = parseFloat(amount);
  const isWhole = Math.round(n * 100) % 100 === 0;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(n);
}

export default async function WholeHomeBundlePage() {
  const all = await getAllProducts();
  const products = all.filter(
    (p) => p.handle === "plus-whole-home-bundle" || p.handle === "pro-whole-home-bundle"
  );

  const prices = products
    .map((p) => parseFloat(p.priceRange.minVariantPrice.amount))
    .filter((n) => Number.isFinite(n) && n > 0);
  const lowPrice = prices.length ? Math.min(...prices).toString() : "987";
  const highPrice = prices.length ? Math.max(...prices).toString() : "1499";

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Ring Whole Home Bundle Installation Dublin & Leinster",
    serviceType: "Home Security Installation",
    description:
      "Professional supply and installation of the Ring Whole Home Bundle: a Video Doorbell at the front, plus Floodlight Cams covering both the driveway and the rear of the property. Full perimeter coverage installed across Dublin and all of Leinster.",
    provider: { "@id": `${SITE}/#localbusiness` },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Dublin" },
      { "@type": "AdministrativeArea", name: "Leinster" },
    ],
    offers: {
      "@type": "AggregateOffer",
      lowPrice,
      highPrice,
      priceCurrency: "EUR",
      offerCount: products.length || 2,
      availability: "https://schema.org/InStock",
      url: `${SITE}/services/bundles/whole-home`,
    },
    // aggregateRating intentionally omitted: see driveway/page.tsx
    // for the rationale. Site-wide rating lives on LocalBusiness.
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
      { "@type": "ListItem", position: 3, name: "Bundles", item: `${SITE}/services/bundles` },
      { "@type": "ListItem", position: 4, name: "Whole Home Bundle", item: `${SITE}/services/bundles/whole-home` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

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
          <span className="text-[#1a1a1a] font-medium">Whole Home Bundle</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Whole Home Bundle
          </h1>
          <p className="text-gray-500 max-w-2xl">
            Video Doorbell + 2x Floodlight Cams (front &amp; rear) — complete coverage for your entire home. Available in Basic, Popular, and Premium tiers.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-20">No whole home bundles found.</p>
        ) : (
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
                        product.handle === "pro-whole-home-bundle"
                          ? "Pro-tier HDR image quality"
                          : "2K & 1080p image quality",
                        "Doorbell + 2x Floodlights",
                        "Full professional installation",
                        "Network optimisation",
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

        {/* Why this bundle for Dublin homes — unique long-form content
            block to differentiate from Driveway and Eldercare. */}
        <section className="mt-16 lg:mt-20 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
            Why this bundle for Dublin homes
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              The Whole Home Bundle is what we install when a customer wants their
              entire property covered, not just the front door. A Video Doorbell
              out front, a Floodlight Cam on the driveway, and a second Floodlight
              Cam at the rear of the house gives full perimeter coverage with no
              blind spots. This is the most common upgrade for larger Dublin
              homes: four-bed semis in Castleknock, Sandyford and Stillorgan, and
              detached properties out in Wicklow, Meath and Kildare.
            </p>
            <p>
              Installation typically takes a half day. We run all the cabling
              discreetly behind external trim or through the roof space so the
              system looks built-in rather than retrofitted. We&apos;ll also set
              up linked notifications across the cameras, so a person spotted at
              the back triggers the doorbell to record at the same time. That&apos;s
              the bit most DIY installs miss.
            </p>
            <p>
              If you&apos;ve already got one Ring device and want to expand to full
              coverage, we can usually upgrade you to this bundle at a discount
              over starting from scratch. We&apos;ll match your existing camera
              tier where possible (so all your devices use the same image
              quality and app behaviour).
            </p>
            <p className="text-sm text-gray-500">
              Related: <Link href="/services/bundles/driveway" className="text-brand-700 underline hover:text-brand-800">Driveway Bundle</Link>{" "}for front-only coverage,{" "}
              <Link href="/services/installation-only" className="text-brand-700 underline hover:text-brand-800">Installation Only</Link>{" "}if you already own the gear, or{" "}
              <Link href="/services/free-consultation" className="text-brand-700 underline hover:text-brand-800">Book a free home survey</Link>{" "}for a tailored quote.
            </p>
          </div>
        </section>

        {/* Supplied & Fitted */}
        <section className="mt-16 lg:mt-24">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-2xl p-8 sm:p-12 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Supplied &amp; Fitted by Smart Space</h2>
              <p className="text-white/70 mb-6">
                Let Dublin&apos;s #1 Ring installer handle everything — we serve all of Leinster and set up your new system for optimal performance.
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

        {/* Trust Strip */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-2xl">
          {[
            { icon: Shield, text: "Dublin's #1 Ring Installer" },
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
    </>
  );
}
