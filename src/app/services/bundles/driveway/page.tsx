import Image from "next/image";
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

export default async function DrivewayBundlePage() {
  const all = await getAllProducts();
  const products = all.filter((p) => p.handle === "plus-driveway-bundle" || p.handle === "pro-driveway-bundle");

  // Compute price range from the actual products for the AggregateOffer
  // schema. Fallback to known defaults if Shopify data is missing.
  const prices = products
    .map((p) => parseFloat(p.priceRange.minVariantPrice.amount))
    .filter((n) => Number.isFinite(n) && n > 0);
  // Fallbacks must match the user-facing "From €X" on /services/bundles
  // (currently "From €658"). Schema saying "lowPrice: 509" while the
  // bundles index shows "From €658" is exactly the kind of contradiction
  // Google flags as misleading + that erodes trust when a customer
  // refreshes and sees a different price each time.
  const lowPrice = prices.length ? Math.min(...prices).toString() : "658";
  const highPrice = prices.length ? Math.max(...prices).toString() : "989";

  // Service schema describes the bundle as a Local Service offering with a
  // clear price range, areaServed, and provider link to the LocalBusiness
  // already declared in the root layout. This is the single most important
  // signal for "Crawled - currently not indexed" pages: Google needs to
  // understand the page is a distinct commercial offering, not a near-dup
  // of the homepage.
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Ring Driveway Bundle Installation Dublin & Leinster",
    serviceType: "Home Security Installation",
    description:
      "Professional supply and installation of the Ring Driveway Bundle: a Video Doorbell at the front door plus a Floodlight Cam covering the driveway. Installed across Dublin and all of Leinster.",
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
      offerCount: products.length || 3,
      availability: "https://schema.org/InStock",
      url: `${SITE}/services/bundles/driveway`,
    },
    // aggregateRating intentionally omitted: Google's review-snippet
    // policy flags AggregateRating on a generic Service page without
    // per-review markup as self-serving. The site-wide rating lives on
    // the LocalBusiness schema in src/app/layout.tsx, which IS the
    // supported pattern.
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
      { "@type": "ListItem", position: 3, name: "Bundles", item: `${SITE}/services/bundles` },
      { "@type": "ListItem", position: 4, name: "Driveway Bundle", item: `${SITE}/services/bundles/driveway` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/services" className="hover:text-brand-500 transition-colors">Services</Link>
          <span>/</span>
          <Link href="/services/bundles" className="hover:text-brand-500 transition-colors">Bundles</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Driveway / Garden Bundle</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Driveway / Garden Bundle
          </h1>
          <p className="text-gray-500 max-w-2xl">
            Add deterrence to your front driveway or extra protection to your garden.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-20">No driveway bundles found.</p>
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
                        <Image
                          src={image}
                          alt={product.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-300"
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
                        <span className="text-sm text-gray-500 line-through">
                          {formatPrice(comparePrice.amount, comparePrice.currencyCode)}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {[
                        product.handle === "pro-driveway-bundle"
                          ? "4K image & 10x zoom"
                          : "2K Doorbell + 1080p Cam",
                        "Doorbell + Floodlight Cam",
                        "Professional installation",
                        "Ring Chime included",
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
            block to give Google a real signal that this page is distinct
            from the Whole Home and Eldercare bundles. Real install
            specifics from the Smart Space install log. */}
        <section className="mt-16 lg:mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
            Why this bundle for Leinster homes
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              For Leinster homes with off-street parking, the Driveway / Garden
              Bundle is the setup we install most often. The combination of a
              Video Doorbell at the front door and a Floodlight Cam covering the
              driveway gives a clear view of every approach to your home, day or
              night. We install this bundle on around forty Dublin properties
              every month, most often after a near-miss with a car break-in,
              suspicious courier activity, or because a neighbour had something
              taken from their drive.
            </p>
            <p>
              The Floodlight Cam can equally be tasked to protect a back garden
              instead of the front driveway, providing exceptional wide coverage
              that typically protects the full garden boundary.
            </p>
            <p>
              Installation takes around two hours. We position the Floodlight Cam
              at a height and angle that captures plate-readable footage of any
              vehicle pulling onto your drive, and the camera doubles as your
              security light so you can scrap the standalone PIR floodlight at
              the same time. The doorbell is wired to mains-power using your
              existing doorbell wiring, where present, if not we have a number of
              alternative power options available which we can discuss. All
              doorbell installations include Ring&apos;s plug-in anywhere Chime so
              you never miss a delivery.
            </p>
            <p>
              If you live in a semi-detached or detached home in Dublin 4, 6, 6W,
              14, 16, 18 or 24, or anywhere across Wicklow, Kildare, Meath or
              South Dublin, this is the bundle we&apos;d choose for our own homes.
              For terraced houses with on-street parking only, the Single Doorbell
              option is usually a better fit.
            </p>
            <p className="text-sm text-gray-500">
              Related: <Link href="/services/bundles/whole-home" className="text-brand-700 underline hover:text-brand-800">Whole Home Bundle</Link>{" "}for full perimeter coverage,{" "}
              <Link href="/services/doorbell" className="text-brand-700 underline hover:text-brand-800">Video Doorbells</Link>{" "}on their own, or{" "}
              <Link href="/services/free-consultation" className="text-brand-700 underline hover:text-brand-800">Book a free home survey</Link>{" "}if you&apos;re unsure which setup suits your property.
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
