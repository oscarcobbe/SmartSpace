import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Clock, Shield, Wifi, Check, ArrowRight, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Professional Installation | Smart Space",
  description:
    "Professional Ring installation across Ireland. We mount, wire, connect, and configure your entire Ring system. Book a free consultation today.",
};

const services = [
  {
    icon: Wrench,
    title: "Full Installation",
    description: "We mount and wire every device — doorbells, cameras, floodlights, and alarms. Clean, professional finish every time.",
  },
  {
    icon: Wifi,
    title: "Network Setup",
    description: "We ensure your Wi-Fi covers every device. If needed, we'll install a Ring Chime Pro to extend your signal.",
  },
  {
    icon: Shield,
    title: "App Configuration",
    description: "We set up the Ring app on your phone, configure motion zones, alerts, linked devices, and shared users.",
  },
  {
    icon: Clock,
    title: "Quick & Tidy",
    description: "Most installations take under an hour. We leave your home clean and tidy with everything working perfectly.",
  },
];

const packages = [
  {
    name: "Doorbell Install",
    price: "From €79",
    features: [
      "Ring doorbell mounting",
      "Wiring (if hardwired model)",
      "App setup & configuration",
      "Motion zone setup",
      "Wi-Fi signal check",
    ],
  },
  {
    name: "Camera Package",
    price: "From €99",
    popular: true,
    features: [
      "Up to 2 cameras installed",
      "Indoor or outdoor mounting",
      "Optimal positioning advice",
      "App setup & linked devices",
      "Motion detection tuning",
      "Wi-Fi signal check",
    ],
  },
  {
    name: "Whole Home",
    price: "From €199",
    features: [
      "Doorbell + cameras + alarm",
      "Full system installation",
      "Network optimisation",
      "Complete app configuration",
      "Linked devices setup",
      "User training session",
    ],
  },
];

export default function InstallationPage() {
  return (
    <div className="pt-28 lg:pt-32">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.ctfassets.net/2xsswpd01u70/6oP3FvB0kESCnQarf0aZne/2a1822b84a39ba1bab9f9f36499bd03e/ring_products_build_your_system_mobile_2x.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block bg-brand-500/20 text-brand-400 text-sm font-semibold px-4 py-2 rounded-full mb-6">
            Professional Service
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            We don&apos;t just sell Ring.
            <br />
            <span className="text-brand-400">We install it.</span>
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
            Ireland&apos;s authorised Ring installer. Professional mounting, wiring,
            and configuration for your complete peace of mind.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-4 rounded-full transition-all shadow-lg"
            >
              Book Free Consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="tel:+35315130424"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-10 py-4 rounded-full hover:bg-white/10 transition-all"
            >
              <Phone className="h-4 w-4" />
              Call Us Now
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              What&apos;s included
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Every installation comes with our full professional service
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service) => (
              <div key={service.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-50 text-brand-500 rounded-2xl mb-5">
                  <service.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{service.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Installation Packages
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
                  href="/contact"
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

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Book a free consultation and we&apos;ll recommend the perfect Ring setup and
            installation package for your home.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-4 rounded-full transition-all shadow-lg"
          >
            Book Free Consultation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
