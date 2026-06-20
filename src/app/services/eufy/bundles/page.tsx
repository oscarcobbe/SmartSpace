import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import FreeConsultationCTA from "@/components/FreeConsultationCTA";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Eufy Home Bundles | Dublin & Leinster | Smart Space",
  description:
    "Eufy security bundles supplied and professionally installed across Dublin and Leinster: Driveway / Garden from €903, Whole Home from €1,248, Eldercare from €554. No monthly subscription.",
  alternates: { canonical: "/services/eufy/bundles" },
  openGraph: {
    title: "Eufy Home Bundles | Smart Space",
    description: "Eufy Driveway / Garden, Whole Home and Eldercare bundles, supplied and installed across Dublin and Leinster.",
    url: `${SITE}/services/eufy/bundles`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Eufy Home Bundles, Smart Space" }],
  },
};

// Eufy-Website install pricing (June 2026), mains-powered, existing-power.
const bundles = [
  {
    name: "Driveway / Garden Bundle",
    tagline: "Front door and driveway, fully covered.",
    image: "/products/eufy-bundle-driveway.png",
    href: "/services/eufy-driveway-bundle",
    price: 903,
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
    href: "/services/eufy-whole-home-bundle",
    price: 1248,
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
    href: "/services/eufy-eldercare-bundle",
    price: 554,
    features: [
      "Video Doorbell E340 with a plug-in Chime and the S380 HomeBase",
      "Loud indoor Chime rings the moment someone is at the door",
      "Built for older relatives and the family who help them",
      "Recordings stored locally on the HomeBase, no monthly subscription",
    ],
  },
];

const SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Eufy Security Bundle Supply & Installation",
  name: "Eufy Home Bundle Supply + Installation, Dublin & Leinster",
  description: "Eufy Driveway / Garden, Whole Home and Eldercare security bundles supplied and professionally installed across Dublin and Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Dublin" },
    { "@type": "AdministrativeArea", name: "Leinster" },
  ],
  offers: { "@type": "AggregateOffer", lowPrice: "554", highPrice: "1248", priceCurrency: "EUR", offerCount: bundles.length },
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Eufy", item: `${SITE}/services/eufy` },
    { "@type": "ListItem", position: 4, name: "Home Bundles", item: `${SITE}/services/eufy/bundles` },
  ],
};

export default function EufyBundlesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-[#005d8e] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services/eufy" className="hover:text-[#005d8e] transition-colors">Eufy</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Home Bundles</span>
          </nav>

          <div className="text-center mb-12">
            <div className="inline-block text-[#005d8e] text-xs font-bold uppercase tracking-[0.2em] mb-4">Eufy Home Bundles</div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">Eufy Home Bundles</h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Multiple Eufy devices supplied, installed and linked in one visit, with a HomeBase for local storage. No monthly subscription.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((b) => (
              <div key={b.name} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                <div className="relative bg-white aspect-[4/3] flex items-center justify-center p-6 overflow-hidden border-b border-gray-100">
                  <span className="absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full bg-gray-900/90 text-white text-[10px] font-bold tracking-wider uppercase">Eufy Bundle</span>
                  <Image src={b.image} alt={b.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-contain group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">{b.name}</h2>
                  <p className="text-sm text-gray-500 mb-4">{b.tagline}</p>
                  <ul className="space-y-2 mb-6">
                    {b.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-[#005d8e] mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-2xl font-extrabold text-gray-900">From €{b.price.toLocaleString("en-IE")}</span>
                      <span className="text-xs text-gray-400 font-medium">supplied + installed</span>
                    </div>
                    <Link href={b.href} className="inline-flex w-full items-center justify-center gap-2 bg-[#005d8e] hover:bg-[#004c75] text-white font-semibold text-sm rounded-xl px-5 py-3 transition-colors">
                      Configure Bundle <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 max-w-2xl mx-auto text-center">
            <p className="text-sm text-gray-500">
              For solar powered installations,{" "}
              <Link href="/contact" className="text-[#005d8e] font-semibold hover:underline">contact us directly</Link>
              {" "}or call{" "}
              <a href="tel:+35315130424" className="text-[#005d8e] font-semibold hover:underline">01 513 0424</a>.
            </p>
            <p className="mt-3 text-sm text-gray-400">
              Want a single device instead?{" "}
              <Link href="/services/eufy/single" className="text-[#005d8e] font-semibold hover:underline">Choose a doorbell or camera</Link>.
            </p>
          </div>
        </div>
        <FreeConsultationCTA />
      </div>
    </>
  );
}
