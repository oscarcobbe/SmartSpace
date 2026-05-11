import Link from "next/link";
import { Check } from "lucide-react";
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

export default async function CameraServicePage() {
  const all = await getAllProducts();
  const newHandles = ["plus-floodlight-cam", "pro-floodlight-cam"];
  const products = all.filter((p) => newHandles.includes(p.handle));

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Ring Floodlight Camera Installation Dublin & Leinster",
    serviceType: "Home Security Installation",
    description:
      "Professional installation of Ring Floodlight Cams across Dublin and all of Leinster. We mount, wire, configure and walk through motion zones with the homeowner. Suitable for driveways, gardens, side passages and rear entrances.",
    provider: { "@id": `${SITE}/#localbusiness` },
    areaServed: [
      { "@type": "AdministrativeArea", name: "Dublin" },
      { "@type": "AdministrativeArea", name: "Leinster" },
    ],
    // aggregateRating intentionally omitted: see bundles/driveway/page.tsx.
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
      { "@type": "ListItem", position: 3, name: "Floodlight Cameras", item: `${SITE}/services/camera` },
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
          <span className="text-[#1a1a1a] font-medium">Floodlight Cameras</span>
        </nav>

        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Floodlight Cameras
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Powerful floodlight cameras for driveways, gardens, and rear entrances. All professionally supplied and installed.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-20">No cameras found.</p>
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
                        product.handle === "pro-floodlight-cam"
                          ? "4K image & 10x zoom"
                          : "1080p image",
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

        {/* Long-form content for SEO + decision support */}
        <section className="mt-20 max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
            Why a Ring Floodlight Camera for Dublin and Leinster homes
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              The Ring Floodlight Cam is the device we install when a customer
              wants to cover an area the doorbell can&apos;t see — typically a
              driveway, side passage, rear garden, or detached shed or garage.
              Because it doubles as a security floodlight, most installs replace
              an existing PIR floodlight rather than add to your fittings, so
              the wiring is usually already where it needs to be.
            </p>
            <p>
              We install two tiers. The Floodlight Cam Wired Plus gives you
              1080p HD video with Colour Night Vision, Two-Way Talk, a 105dB
              siren, and 2,000 lumens of floodlighting. Right choice for
              standard Dublin gardens and shorter driveways. The Floodlight
              Cam Pro steps up to 4K (3840×2160) with Audio+ two-way talk,
              radar-powered 3D Motion Detection, and an aerial-view map of
              exactly where motion was detected. For longer driveways with
              parked cars, the Pro&apos;s 4K resolution is the difference
              between catching a number plate and not.
            </p>
            <p>
              Installation typically takes between an hour and two hours
              depending on whether new mains cabling is needed. We position the
              camera at a height and angle that captures usable footage in low
              light, and we configure the motion zones so the camera ignores
              the road and the next-door driveway and only alerts on motion
              within your boundary. Every install includes a walkthrough of the
              Ring app and the Smart Lighting integration if you have other
              Ring lights on the property.
            </p>
            <p className="text-sm text-gray-500">
              Related: <Link href="/services/doorbell" className="text-brand-700 underline hover:text-brand-800">Video Doorbells</Link>{" "}for the front door,{" "}
              <Link href="/services/bundles/whole-home" className="text-brand-700 underline hover:text-brand-800">Whole Home Bundle</Link>{" "}for full perimeter coverage at a discount, or{" "}
              <Link href="/services/free-consultation" className="text-brand-700 underline hover:text-brand-800">Book a free home survey</Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}
