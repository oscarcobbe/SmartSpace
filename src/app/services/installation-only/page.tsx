import type { Metadata } from "next";
import Link from "next/link";
import { Wrench, Clock, Shield, Wifi, ArrowRight, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Installation Only & Other Brands | Smart Space",
  description:
    "Professional installation for Ring, Eufy, Nest, and Tapo devices across Leinster. Same price for all brands.",
};

const services = [
  {
    icon: Wrench,
    title: "Full Installation",
    description: "We mount and wire every device — doorbells, cameras, and floodlights. Clean, professional finish every time.",
  },
  {
    icon: Wifi,
    title: "Network Setup",
    description: "We ensure your Wi-Fi covers every device. If needed, we'll install a Ring Chime Pro to extend your signal.",
  },
  {
    icon: Shield,
    title: "Tailored Configuration",
    description: "We set up the app on your phone, configure motion zones, alerts, linked devices, and shared users.",
  },
  {
    icon: Clock,
    title: "Quick & Tidy",
    description: "Most installations take under an hour. We leave your home clean and tidy with everything working perfectly.",
  },
];


const brands = [
  { name: "Ring", logo: "/Ring.png" },
  { name: "Eufy", logo: "/Eufy.png" },
  { name: "Nest", logo: "/Nest_logo.png" },
  { name: "Tapo", logo: "/Tapo.png", className: "h-28" },
];

export default function InstallationOnlyPage() {
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
            Installation Only
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            Already have a device?
            <br />
            <span className="text-brand-400">We&apos;ll install it.</span>
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8 leading-relaxed">
            Professional installation for all major smart home brands — same expert service, same price.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-4 rounded-full transition-all shadow-lg"
            >
              Book Installation
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

      {/* Supported Brands */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
            We install all major brands at the same price
          </p>
          <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap">
            {brands.map((brand) => (
              <div key={brand.name} className="flex items-center justify-center">
                {brand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo} alt={brand.name} className={`${brand.className || "h-14"} opacity-60`} />
                ) : (
                  <span className="text-xl font-bold text-gray-400">{brand.name}</span>
                )}
              </div>
            ))}
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

      {/* CTA */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Book an installation and we&apos;ll have your device professionally set up in no time.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-4 rounded-full transition-all shadow-lg"
          >
            Book Installation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
