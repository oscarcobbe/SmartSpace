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
    price: "From €79",
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
    <section className="py-16 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Choose Your Installation
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Transparent pricing with no hidden fees
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`bg-white rounded-2xl p-8 shadow-sm border-2 ${
                pkg.popular ? "border-brand-500 relative" : "border-transparent"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
              <div className="text-3xl font-extrabold text-brand-500 mb-6">{pkg.price}</div>
              <ul className="space-y-3 mb-8">
                {pkg.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-gray-600">
                    <Check className="h-5 w-5 text-brand-500 flex-shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={pkg.href}
                className={`block text-center font-bold py-3.5 rounded-xl transition-all ${
                  pkg.popular
                    ? "bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
