import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FreeConsultationCTA from "@/components/FreeConsultationCTA";

const SITE = "https://smart-space.ie";
const BLUE = "#005d8e";

export const metadata: Metadata = {
  title: "Single Eufy Device Installation | Dublin & Leinster | Smart Space",
  description:
    "Choose a Eufy Video Doorbell (from €359) or an external camera (from €369), supplied and professionally installed across Dublin and Leinster. No subscription.",
  alternates: { canonical: "/services/eufy/single" },
  openGraph: {
    title: "Single Eufy Device Installation | Smart Space",
    description: "Choose a Eufy Video Doorbell or an external camera, supplied and installed across Dublin and Leinster.",
    url: `${SITE}/services/eufy/single`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Single Eufy Device Installation, Smart Space" }],
  },
};

const choices = [
  {
    title: "Eufy Video Doorbell",
    description: "See, hear, and speak to anyone at your door, plus a second camera watching the doorstep.",
    price: "From €359",
    image: "/products/eufy-doorbell-e340.png",
    href: "/services/eufy-video-doorbell-e340",
  },
  {
    title: "Eufy External Camera",
    description: "Dual-camera floodlight on a 360° pan-tilt head for full driveway, garden and side-passage coverage.",
    price: "From €369",
    image: "/products/eufy-floodlight-e340.png",
    href: "/services/eufy-floodlight-cam-e340",
  },
];

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Eufy", item: `${SITE}/services/eufy` },
    { "@type": "ListItem", position: 4, name: "Single Device", item: `${SITE}/services/eufy/single` },
  ],
};

export default function EufySinglePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-[#005d8e] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services/eufy" className="hover:text-[#005d8e] transition-colors">Eufy</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Single Device</span>
          </nav>

          <div className="text-center mb-12">
            <div className="inline-block text-[#005d8e] text-xs font-bold uppercase tracking-[0.2em] mb-4">
              Step 1 of 2
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
              What would you like installed?
            </h1>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Pick a Eufy video doorbell or an external camera. You&apos;ll choose the exact model and options next.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {choices.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#005d8e] transition-all flex flex-col"
              >
                <div className="relative bg-white aspect-[4/3] flex items-center justify-center p-8 overflow-hidden border-b border-gray-100">
                  <span className="absolute top-3 left-3 z-10 inline-flex items-center px-2.5 py-1 rounded-full bg-gray-900/90 text-white text-[10px] font-bold tracking-wider uppercase">
                    Eufy
                  </span>
                  <Image src={c.image} alt={c.title} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-contain group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{c.title}</h2>
                  <p className="text-sm text-gray-500 mb-4 flex-1">{c.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold" style={{ color: BLUE }}>{c.price}</span>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#005d8e]">
                      Choose <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-gray-400">
            Looking for a full bundle instead?{" "}
            <Link href="/services/eufy/bundles" className="text-[#005d8e] font-semibold hover:underline">See Eufy home bundles</Link>.
          </p>
        </div>
        <FreeConsultationCTA />
      </div>
    </>
  );
}
