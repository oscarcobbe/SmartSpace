import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Ring Home Bundles | Smart Space",
  description:
    "Save more with Ring bundles. Driveway, Whole Home, and Eldercare packages — all professionally supplied and installed across Leinster.",
};

const bundles = [
  {
    name: "Driveway Bundle",
    description: "Video Doorbell + Floodlight Cam",
    price: "From €658",
    image: "/products/plus-driveway-black.png",
    features: [
      "Ring Video Doorbell supplied & installed",
      "Ring Floodlight Cam supplied & installed",
      "Ring Chime included",
      "Plus & Pro tiers available",
      "Bundle saves €50",
      "Full app setup & configuration",
    ],
    href: "/services/bundles/driveway",
  },
  {
    name: "Whole Home Bundle",
    description: "Video Doorbell + 2x Floodlight Cams",
    price: "From €987",
    popular: true,
    image: "/products/plus-wholehome-black-black.png",
    features: [
      "Ring Video Doorbell supplied & installed",
      "2x Ring Floodlight Cams (front & rear)",
      "Ring Chime included",
      "Plus & Pro tiers available",
      "Bundle saves €100",
      "Mix & match floodlight colours",
    ],
    href: "/services/bundles/whole-home",
  },
  {
    name: "Eldercare Security Bundle",
    description: "Video Doorbell + Smart Wi-Fi Keybox",
    price: "From €509",
    image: "/products/smart-keybox.jpg",
    features: [
      "Ring Video Doorbell supplied & installed",
      "Smart Wi-Fi Keybox for carer access",
      "Ring Chime included",
      "Fingerprint, code & RFID access",
      "Remote carer management via app",
      "Ideal for elderly relatives",
    ],
    href: "/services/bundles/eldercare",
  },
];

export default function BundlesPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/services" className="hover:text-brand-500 transition-colors">
            Services
          </Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Bundles</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Ring Home Bundles
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Save more with our professionally installed Ring bundles. Everything
            supplied, fitted, and configured — ready to protect your home.
          </p>
        </div>

        {/* Bundle Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {bundles.map((bundle) => (
            <div
              key={bundle.name}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 flex flex-col ${
                bundle.popular
                  ? "border-brand-500 relative"
                  : "border-transparent"
              }`}
            >
              {bundle.popular && (
                <span className="absolute top-4 right-4 z-10 bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  Most Popular
                </span>
              )}

              {/* Image */}
              <div className="relative aspect-[4/3] bg-transparent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bundle.image}
                  alt={bundle.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 flex flex-col flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {bundle.name}
                </h2>
                <p className="text-sm text-gray-500 mb-3">{bundle.description}</p>
                <div className="text-2xl font-extrabold text-brand-500 mb-5">
                  {bundle.price}
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {bundle.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-gray-600"
                    >
                      <Check className="h-4 w-4 text-brand-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={bundle.href}
                  className={`flex items-center justify-center gap-2 font-bold py-3.5 rounded-xl transition-all ${
                    bundle.popular
                      ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  Configure Bundle
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-gray-50 rounded-2xl p-8 sm:p-12 max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">
            Need a custom bundle?
          </h2>
          <p className="text-gray-500 mb-6 max-w-lg mx-auto">
            If you need something different, get in touch and we&apos;ll put
            together a package tailored to your home.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
