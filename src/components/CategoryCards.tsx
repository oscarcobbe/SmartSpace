import Link from "next/link";
import { Check } from "lucide-react";

const packages = [
  {
    name: "A Single Ring Video Doorbell Or External Camera",
    price: "From €299",
    features: [
      "Professional installation included",
      "Ring Chime included with doorbells",
      "App setup & configuration",
      "Motion zone tuning",
      "Wi-Fi signal check",
    ],
    href: "/services/single",
  },
  {
    name: "Ring Home Bundles",
    price: "From €509",
    popular: true,
    features: [
      "Multiple devices supplied & installed",
      "Full system installation",
      "Network optimisation",
      "Complete app configuration",
      "Linked devices setup",
      "User training session",
    ],
    href: "/services/bundles",
  },
  {
    name: "Installation-Only & Other Brands",
    price: "From €139",
    features: [
      "Your existing device installed",
      "Ring, Eufy, Nest & Tapo supported",
      "Professional mounting & wiring",
      "App setup & configuration",
      "Wi-Fi signal check",
    ],
    href: "/services/installation-only",
  },
];

export default function CategoryCards() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-cream to-white relative overflow-hidden">
      {/* Soft decorative orbs */}
      <div className="absolute top-20 -left-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -right-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">
            Our Packages
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink mb-4 tracking-[-0.035em]">
            Choose Your Installation
          </h2>
          <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto">
            Transparent pricing with no hidden fees
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`card-lift group relative bg-white rounded-3xl p-7 sm:p-9 ${
                pkg.popular
                  ? "shadow-[0_30px_70px_-20px_rgba(242,100,25,0.35)] border-2 border-brand-500 md:-mt-4 md:mb-4"
                  : "shadow-premium hover:shadow-premium-lg border border-gray-100/80"
              }`}
            >
              {pkg.popular && (
                <>
                  {/* Gradient halo on popular card */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-transparent rounded-2xl pointer-events-none" />
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-brand-500/30 tracking-wide uppercase">
                    Most Popular
                  </span>
                </>
              )}
              <div className="relative">
                <h3 className="text-xl font-bold text-ink mb-2 tracking-[-0.02em] leading-snug">{pkg.name}</h3>
                <div className={`text-3xl sm:text-4xl font-extrabold mb-7 tracking-[-0.03em] ${pkg.popular ? "gradient-text-brand" : "text-brand-500"}`}>
                  {pkg.price}
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />
                <ul className="space-y-3.5 mb-8">
                  {pkg.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-[13.5px] text-ink-soft leading-relaxed">
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-brand-500" strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={pkg.href}
                  className={`btn-sheen group/btn flex items-center justify-center gap-2 text-center font-bold py-3.5 rounded-xl transition-all ${
                    pkg.popular
                      ? "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white shadow-lg shadow-brand-500/30"
                      : "bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30"
                  }`}
                >
                  <span className="relative z-10">Get Started</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
