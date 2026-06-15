import Image from "next/image";
import Link from "next/link";
import { Check, Shield, Star, Wrench, Award, Info } from "lucide-react";
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

export default async function EldercareBundlePage() {
  const all = await getAllProducts();
  const products = all.filter((p) => p.handle === "eldercare-security-bundle");

  const prices = products
    .map((p) => parseFloat(p.priceRange.minVariantPrice.amount))
    .filter((n) => Number.isFinite(n) && n > 0);
  // Fallback price aligned to the displayed "From €509" on
  // /services/bundles (was 499 — schema lying about a €10 cheaper
  // price than the index page advertised).
  const lowPrice = prices.length ? Math.min(...prices).toString() : "509";
  const highPrice = prices.length ? Math.max(...prices).toString() : "509";

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Ring Eldercare Bundle Installation Dublin & Leinster",
    serviceType: "Home Security Installation",
    description:
      "Ring Video Doorbell plus a digital lockbox: built for elderly relatives who want to stay independent at home and the family members or carers who help look after them. Professionally installed across Dublin and all of Leinster.",
    provider: { "@id": `${SITE}/#localbusiness` },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Dublin" },
      { "@type": "AdministrativeArea", name: "Leinster" },
    ],
    audience: {
      "@type": "PeopleAudience",
      audienceType: "Elderly homeowners and their families",
    },
    offers: {
      "@type": "AggregateOffer",
      lowPrice,
      highPrice,
      priceCurrency: "EUR",
      offerCount: products.length || 1,
      availability: "https://schema.org/InStock",
      url: `${SITE}/services/bundles/eldercare`,
    },
    // aggregateRating intentionally omitted: see driveway/page.tsx.
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />

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
          <span className="text-[#1a1a1a] font-medium">Eldercare Bundle</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Eldercare Bundle
          </h1>
          <p className="text-gray-700 max-w-2xl">
            Our Plus Video Doorbell + Digital Lockbox — designed for elderly relatives and their carers. See who&apos;s at the door and provide secure key access.
          </p>
        </div>

        {/* What's included */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6 mb-10">
          <div className="flex items-start gap-3 mb-4">
            <Info className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
            <h3 className="font-bold text-gray-900">What&apos;s included in this bundle</h3>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2">
            {[
              "Basic Video Doorbell Plus supplied and installed",
              "Digital Lockbox for carer access",
              "Ring Chime included",
              "App setup for family members",
              "Motion zone & alert configuration",
              "Professional mounting & wiring",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-brand-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {products.length > 0 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Choose your doorbell</h2>
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
                        {["+ Digital Lockbox", "Ring Chime included", "Full installation"].map((f) => (
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
          </>
        )}

        {/* Why this bundle for Dublin homes — unique long-form content
            block; this is the most-different-from-the-others bundle so
            the audience-specific framing matters most here. */}
        <section className="mt-16 lg:mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
            Built for elderly relatives and their families
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              This bundle is for older parents who want to stay independent at
              home, and the family members or carers who help look after them. A
              Ring Video Doorbell with two-way audio means your parent can see
              who&apos;s at the door without having to get up, and a digital
              lockbox by the front door gives carers, district nurses or a trusted
              neighbour secure key access without you leaving a key under a
              flowerpot.
            </p>
            <p>
              We&apos;ve installed this exact setup for over four hundred Dublin
              and Leinster households where an elderly relative wanted to stay in
              their own home. Installation usually takes an hour. We walk through
              the Ring app with the family member who&apos;ll be the primary
              contact, not the elderly homeowner: most parents won&apos;t use the
              app themselves, but they appreciate that someone in the family can
              see who&apos;s calling and check in on them.
            </p>
            <p>
              The lockbox is fitted in a discreet but accessible spot, with a
              four-digit code you can change anytime. The bundle pairs well with
              an HSE home-care package or a private carer rota: you can change
              the lockbox code when staff change without anyone needing to be at
              the property. We can also add an additional Ring Chime upstairs so
              your parent hears the doorbell from their bedroom. We can pair the
              system to an 8 inch smart screen located in the living room, beside
              their favourite chair. They can see and talk to visitors (if they
              want to), so no more rushing to get to the front door and
              increasing the risk of a fall.
            </p>
            <p className="text-sm text-gray-500">
              Related: <Link href="/services/bundles/driveway" className="text-brand-700 underline hover:text-brand-800">Driveway Bundle</Link>{" "}for full security coverage,{" "}
              <Link href="/services/doorbell" className="text-brand-700 underline hover:text-brand-800">Single Video Doorbell</Link>{" "}without the lockbox, or{" "}
              <Link href="/services/free-consultation" className="text-brand-700 underline hover:text-brand-800">Book a free home survey</Link>{" "}so we can assess the property with you.
            </p>
          </div>
        </section>

        {/* Supplied & Fitted */}
        <section className="mt-16 lg:mt-24">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#333] rounded-2xl p-8 sm:p-12 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">Supplied &amp; Fitted by Smart Space</h2>
              <p className="text-white/70 mb-6">
                We understand the importance of keeping elderly relatives safe. Our installation is quick, tidy, and we&apos;ll walk family members through the setup.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 max-w-xl mx-auto">
                {[
                  "Professional mounting & wiring",
                  "Lockbox positioned for easy access",
                  "Ring app setup for family members",
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

        {/* Contact CTA */}
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
