import Image from "next/image";
import Link from "next/link";
import { Check, Info } from "lucide-react";
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

export default async function DoorbellServicePage() {
  const all = await getAllProducts();
  const newHandles = ["plus-video-doorbell", "pro-video-doorbell"];
  const products = all.filter((p) => newHandles.includes(p.handle));

  // Schema.org Service describing this category page so Google indexes
  // it as a distinct commercial service offering, not a near-duplicate
  // of /services/camera or the homepage.
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Ring Video Doorbell Installation Dublin & Leinster",
    serviceType: "Home Security Installation",
    description:
      "Professional installation of Ring Video Doorbells across Dublin and all of Leinster. Supplied, fitted, app-configured and walked-through with the homeowner. Ring Chime included with every install.",
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
      { "@type": "ListItem", position: 3, name: "Video Doorbells", item: `${SITE}/services/doorbell` },
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
          <span className="text-[#1a1a1a] font-medium">Video Doorbells</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
            Video Doorbells
          </h1>
          <p className="text-gray-500 max-w-2xl">
            See, hear, and speak to anyone at your door from anywhere. All our doorbells are professionally supplied and installed.
          </p>
        </div>

        {/* Chime notice */}
        <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-xl p-4 mb-10">
          <Info className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            <strong>All doorbell installations include the supply and setup of a Ring Chime</strong> — so you never miss a visitor, even when you&apos;re away from your phone.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="text-gray-500 text-center py-20">No doorbells found.</p>
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
                        product.handle === "pro-video-doorbell"
                          ? "4K image & 10x zoom"
                          : "2K image & 6x zoom",
                        "Professional installation",
                        "Ring Chime included",
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
            Don&apos;t see what you need? Contact us
          </Link>
        </div>

        {/* Long-form content for SEO + decision support */}
        <section className="mt-20 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">
            Why a Ring Doorbell for Leinster homes
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              The Ring Video Doorbell is the single most-installed smart device
              in Irish homes, and we install several every working day across
              Dublin and Leinster. The reason for its popularity is practical:
              An Post, DPD, FedEx and the major couriers all leave packages at
              the front door. Being able to see and speak to a delivery driver
              from the kitchen, the back garden, or away from the house solves
              an everyday inconvenience as much as a security concern.
            </p>
            <p>
              We supply two tiers. Our Plus model gives you 2K video with
              colour night vision, 6x zoom and is the right choice for most
              Dublin terraced and semi-D properties where the doorbell is
              well-lit. Our Pro model adds sharp 4K video, 10x zoom, 3D motion
              detection (which ignores cars on the street and only alerts on
              people approaching the door), and pre-roll buffering - meaning
              the four seconds before a motion event are also captured, so you
              don&apos;t miss the start of an incident.
            </p>
            <p>
              Every doorbell installation we do includes a Ring Chime so you
              hear the bell anywhere in the house without needing to be tied to
              your phone. We also re-use your existing wiring if a working
              wired doorbell is present, which can save almost €100 vs. running
              new mains cabling. Installation can take as little as an hour and
              we walk you through the Ring app before we leave.
            </p>
            <p className="text-sm text-gray-500">
              Related: <Link href="/services/camera" className="text-brand-700 underline hover:text-brand-800">Floodlight Cameras</Link>{" "}for areas the doorbell doesn&apos;t cover,{" "}
              <Link href="/services/bundles/driveway" className="text-brand-700 underline hover:text-brand-800">Driveway Bundle</Link>{" "}to add a driveway camera at a discount, or{" "}
              <Link href="/services/free-consultation" className="text-brand-700 underline hover:text-brand-800">Book a free home survey</Link>.
            </p>
          </div>
        </section>
      </div>
    </div>
    </>
  );
}
