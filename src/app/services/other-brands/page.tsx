import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Phone } from "lucide-react";
import FreeConsultationCTA from "@/components/FreeConsultationCTA";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Eufy Doorbells, Cameras & Bundles, Supplied + Installed | Dublin & Leinster | Smart Space",
  description:
    "Eufy video doorbells, floodlight cameras and security bundles, supplied and professionally installed across Dublin and Leinster. No monthly subscription. From €359.",
  alternates: { canonical: "/services/other-brands" },
  openGraph: {
    title: "Eufy, Supplied + Installed | Smart Space",
    description:
      "Eufy doorbells, cameras and security bundles, supplied and professionally installed across Dublin and Leinster. No subscription. From €359.",
    url: `${SITE}/services/other-brands`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Eufy, Supplied + Installed, Smart Space" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eufy, Supplied + Installed | Smart Space",
    description:
      "Eufy doorbells, cameras and security bundles, supplied and professionally installed across Dublin and Leinster. No subscription. From €359.",
    images: ["/og-default.png"],
  },
};

/**
 * Pricing: Eufy "Installation Price List (Eufy Website)", June 2026, the
 * mains-powered, existing-power configuration (the cheapest, real "From"
 * entry point). Source of truth: Oscar's Eufy Pricing June 2026 sheet.
 *
 *   Video Doorbell E340 + Chime ............ €359  (new VD power €449)
 *   Floodlight Cam E340 .................... €369  (new power €459)
 *   Driveway / Garden Bundle .............. €853  (up to €1,013 w/ new power)
 *   Whole Home Bundle ..................... €1,198 (up to €1,428 w/ new power)
 *   Eldercare Bundle (E340 + Chime + Screen) €519 (new VD power €609)
 *
 * New cabling / new power feed adds €70–€90, quoted at the consultation.
 * Installation-only on a customer-supplied Eufy = same as Ring (€139), see
 * /services/installation-only. Solar units are quoted individually.
 */
type EufyProduct = {
  name: string;
  tagline: string;
  image: string;
  badge: string;
  price: number | null; // null = quote-only (solar)
  cta: string;
  ctaHref: string;
  features: string[];
};

const eufyProducts: EufyProduct[] = [
  {
    name: "Eufy Video Doorbell E340",
    tagline: "Dual camera. Sees the face at the door and the parcel on the ground.",
    image: "/products/eufy-doorbell-e340-with-chime.png",
    badge: "Eufy",
    price: 359,
    cta: "View Options",
    ctaHref: "/services/eufy-video-doorbell-e340",
    features: [
      "2K HDR with a second camera watching deliveries at the doorstep",
      "Mains-powered, wired to your existing doorbell feed",
      "Eufy Chime included so it rings inside the house",
      "No monthly subscription, recordings stored locally",
    ],
  },
  {
    name: "Eufy Floodlight Cam E340",
    tagline: "Light up and track movement across the whole drive.",
    image: "/products/eufy-floodlight-e340.png",
    badge: "Eufy",
    price: 369,
    cta: "View Options",
    ctaHref: "/services/eufy-floodlight-cam-e340",
    features: [
      "Dual 3K cameras with 360° pan-tilt and auto-tracking",
      "2,000-lumen motion-activated floodlights",
      "Mains-powered, replaces an existing outdoor light point",
      "No monthly subscription, recordings stored locally",
    ],
  },
  {
    name: "Driveway / Garden Bundle",
    tagline: "Front door and driveway, fully covered.",
    image: "/products/eufy-bundle-driveway.png",
    badge: "Eufy Bundle",
    price: 853,
    cta: "View Options",
    ctaHref: "/services/eufy-driveway-bundle",
    features: [
      "Video Doorbell E340 at the door plus a Floodlight Cam on the drive",
      "Eufy S380 HomeBase for local recording and storage",
      "Driveway / Garden coverage, professionally installed",
      "No monthly subscription",
    ],
  },
  {
    name: "Whole Home Bundle",
    tagline: "Front, drive and rear. The full perimeter.",
    image: "/products/eufy-bundle-wholehome.png",
    badge: "Eufy Bundle",
    price: 1198,
    cta: "View Options",
    ctaHref: "/services/eufy-whole-home-bundle",
    features: [
      "Video Doorbell E340 plus two Floodlight Cams (front and rear)",
      "Eufy S380 HomeBase for local recording and storage",
      "Whole-perimeter coverage in one visit",
      "No monthly subscription",
    ],
  },
  {
    name: "Eldercare Bundle",
    tagline: "A loud plug-in chime indoors, with everything stored locally.",
    image: "/products/eufy-eldercare-bundle.png",
    badge: "Eufy Bundle",
    price: 519,
    cta: "View Options",
    ctaHref: "/services/eufy-eldercare-bundle",
    features: [
      "Video Doorbell E340 with a plug-in Chime and the S380 HomeBase",
      "Loud indoor Chime rings the moment someone is at the door",
      "Built for older relatives and the family who help them",
      "Recordings stored locally on the HomeBase, no monthly subscription",
    ],
  },
];

function priceLabel(p: number) {
  return "From €" + p.toLocaleString("en-IE");
}

const SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Smart Home Device Supply & Installation",
  name: "Eufy Doorbell, Camera & Bundle Supply + Installation, Dublin & Leinster",
  description:
    "Eufy video doorbells, floodlight cameras, solar cameras and security bundles supplied and professionally installed across Dublin and all of Leinster. No monthly subscription.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Dublin" },
    { "@type": "AdministrativeArea", name: "Leinster" },
  ],
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "359",
    highPrice: "1198",
    priceCurrency: "EUR",
    offerCount: eufyProducts.length,
  },
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Other Brands", item: `${SITE}/services/other-brands` },
  ],
};

export default function OtherBrandsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-semibold tracking-wider uppercase mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Other Brands
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              Eufy, Supplied &amp; Installed
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              The most popular Eufy doorbells, cameras and security bundles, supplied by us and
              fitted by the same installers behind 5,000+ Ring installations. No monthly
              subscription on any of them, every recording stays local.
            </p>
          </div>

          {/* Product cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {eufyProducts.map((p) => (
              <div
                key={p.name}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="relative bg-[#faf7f2] aspect-[4/3] flex items-center justify-center overflow-hidden">
                  <span className="absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full bg-gray-900/90 text-white text-[10px] font-bold tracking-wider uppercase">
                    {p.badge}
                  </span>
                  <Image
                    src={p.image}
                    alt={p.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-contain p-8 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{p.name}</h2>
                  <p className="text-sm text-gray-500 mb-4">{p.tagline}</p>
                  <ul className="space-y-2 mb-6">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <div className="flex items-baseline gap-2 mb-4">
                      {p.price === null ? (
                        <span className="text-2xl font-extrabold text-gray-900">Solar quote</span>
                      ) : (
                        <>
                          <span className="text-2xl font-extrabold text-gray-900">{priceLabel(p.price)}</span>
                          <span className="text-xs text-gray-400 font-medium">supplied + installed</span>
                        </>
                      )}
                    </div>
                    <Link
                      href={p.ctaHref}
                      className="inline-flex w-full items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl px-5 py-3 transition-colors"
                    >
                      {p.cta} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing honesty note + phone */}
          <div className="mt-10 max-w-2xl mx-auto text-center">
            <p className="text-sm text-gray-400">
              Prices shown are the mains-powered, existing-power setup. If a new power feed or
              cabling is needed it&apos;s quoted up front (typically €70 to €90), in writing,
              before any work starts. Solar cameras are quoted individually to your property.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Prefer to talk it through?{" "}
              <a href="tel:+35315130424" className="inline-flex items-center gap-1 text-brand-500 font-semibold hover:underline">
                <Phone className="h-3.5 w-3.5" /> 01 513 0424
              </a>
            </p>
          </div>

          {/* Cross-links */}
          <div className="mt-12 grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <Link
              href="/services/installation-only"
              className="flex items-center justify-between gap-3 p-5 bg-white border border-gray-100 hover:border-brand-500 rounded-xl transition-colors group"
            >
              <div>
                <div className="font-bold text-gray-900 group-hover:text-brand-500 transition-colors">Already own a Eufy?</div>
                <div className="text-sm text-gray-500">Installation-only from €139, same as Ring.</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
            </Link>
            <Link
              href="/services"
              className="flex items-center justify-between gap-3 p-5 bg-white border border-gray-100 hover:border-brand-500 rounded-xl transition-colors group"
            >
              <div>
                <div className="font-bold text-gray-900 group-hover:text-brand-500 transition-colors">Prefer Ring?</div>
                <div className="text-sm text-gray-500">See our full Ring range and bundles.</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
            </Link>
          </div>
        </div>

        {/* Complimentary consultation */}
        <div className="mt-8">
          <FreeConsultationCTA />
        </div>
      </div>
    </>
  );
}
