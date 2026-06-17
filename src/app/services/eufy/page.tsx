import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import FreeConsultationCTA from "@/components/FreeConsultationCTA";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Eufy Installation Packages | Dublin & Leinster | Smart Space",
  description:
    "Choose your Eufy installation: a single video doorbell or camera, a full home bundle, or installation-only. Supplied and professionally installed across Dublin and Leinster. No monthly subscription. From €139.",
  alternates: { canonical: "/services/eufy" },
  openGraph: {
    title: "Eufy Installation Packages | Smart Space",
    description:
      "A single Eufy doorbell or camera, a full home bundle, or installation-only. Supplied and installed across Dublin and Leinster. No subscription.",
    url: `${SITE}/services/eufy`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Eufy Installation Packages, Smart Space" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eufy Installation Packages | Smart Space",
    description:
      "A single Eufy doorbell or camera, a full home bundle, or installation-only. Supplied and installed across Dublin and Leinster.",
    images: ["/og-default.png"],
  },
};

// Eufy mirror of the homepage "Our Packages" cards (src/components/CategoryCards.tsx),
// same layout, Eufy language + Eufy-Website pricing (June 2026). Accents use
// Eufy's brand blue (#005D8E) rather than the orange Ring brand colour.
const packages = [
  {
    name: "A Single Eufy Video Doorbell Or Camera",
    price: "From €359",
    features: [
      "Professional installation included",
      "Eufy Chime included with doorbells",
      "App setup & configuration",
      "Motion zone tuning",
      "No monthly subscription, storage stays local",
    ],
    href: "/services/eufy/single",
  },
  {
    name: "Eufy Home Bundles",
    price: "From €519",
    popular: true,
    features: [
      "Multiple Eufy devices supplied & installed",
      "Eufy S380 HomeBase for local storage",
      "Full system installation & network optimisation",
      "Complete app configuration & linked devices",
      "User walkthrough on the day",
      "No monthly subscription",
    ],
    href: "/services/eufy/bundles",
  },
  {
    name: "Installation-Only of Ring & Other Smart Brands",
    price: "From €139",
    features: [
      "Your existing device installed",
      "Ring, Eufy, Nest, Tapo & Aosu supported",
      "Professional mounting & wiring",
      "App setup & configuration",
      "Wi-Fi signal check",
    ],
    href: "/services/installation-only",
  },
];

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Eufy Packages", item: `${SITE}/services/eufy` },
  ],
};

export default function EufyPackagesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />

      <section className="pt-28 lg:pt-32 pb-20 lg:pb-28 bg-gradient-to-b from-cream to-white relative overflow-hidden">
        {/* Soft decorative orbs, Eufy-blue tint */}
        <div className="absolute top-20 -left-40 w-80 h-80 bg-[#005d8e]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -right-40 w-80 h-80 bg-[#005d8e]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Breadcrumb */}
          <nav className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-[#005d8e] transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-[#005d8e] transition-colors">Services</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Eufy</span>
          </nav>

          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block text-[#005d8e] text-xs font-bold uppercase tracking-[0.2em] mb-4">
              Eufy Packages
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink mb-4 tracking-[-0.035em]">
              Choose Your Eufy Installation
            </h1>
            <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto">
              Supplied, professionally installed, and configured. No monthly subscription, every recording stays local.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`card-lift group relative bg-white rounded-3xl p-7 sm:p-9 flex flex-col ${
                  pkg.popular
                    ? "shadow-[0_30px_70px_-20px_rgba(0,93,142,0.35)] border-2 border-[#005d8e] md:-mt-4 md:mb-4"
                    : "shadow-premium hover:shadow-premium-lg border border-gray-100/80"
                }`}
              >
                {pkg.popular && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#005d8e]/5 via-transparent to-transparent rounded-2xl pointer-events-none" />
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#0a6ea3] to-[#005d8e] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-[#005d8e]/30 tracking-wide uppercase">
                      Most Popular
                    </span>
                  </>
                )}
                <div className="relative flex flex-col flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-bold text-ink mb-2 tracking-[-0.02em] leading-snug min-h-[3.5rem]">{pkg.name}</h2>
                  <div className="text-3xl sm:text-4xl font-extrabold mb-7 tracking-[-0.03em] text-[#005d8e]">
                    {pkg.price}
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />
                  <ul className="space-y-3.5 mb-8 flex-1">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start justify-center sm:justify-start gap-3 text-[13.5px] text-ink-soft leading-relaxed">
                        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#005d8e]/10 flex items-center justify-center">
                          <Check className="h-3 w-3 text-[#005d8e]" strokeWidth={3} />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={pkg.href}
                    className={`btn-sheen group/btn flex items-center justify-center gap-2 text-center font-bold py-3.5 rounded-xl transition-all text-white ${
                      pkg.popular
                        ? "bg-gradient-to-r from-[#0a6ea3] to-[#005d8e] hover:from-[#005d8e] hover:to-[#004c75] shadow-lg shadow-[#005d8e]/30"
                        : "bg-[#005d8e] hover:bg-[#004c75] shadow-md shadow-[#005d8e]/20 hover:shadow-lg hover:shadow-[#005d8e]/30"
                    }`}
                  >
                    <span className="relative z-10">Get Started</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Solar note + browse-all link */}
          <div className="mt-10 max-w-2xl mx-auto text-center">
            <p className="text-sm text-gray-500">
              For solar powered installations,{" "}
              <Link href="/contact" className="text-[#005d8e] font-semibold hover:underline">contact us directly</Link>
              {" "}or call{" "}
              <a href="tel:+35315130424" className="text-[#005d8e] font-semibold hover:underline">01 513 0424</a>.
            </p>
            <Link
              href="/services/other-brands"
              className="mt-5 inline-flex items-center gap-1.5 text-[#005d8e] font-semibold text-sm hover:underline"
            >
              See every Eufy product, price and spec <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <FreeConsultationCTA />
    </>
  );
}
