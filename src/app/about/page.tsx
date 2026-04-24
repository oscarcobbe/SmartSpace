import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Award, Users, MapPin, ArrowRight } from "lucide-react";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "About Smart Space | Dublin's #1 Ring Installer",
  description:
    "Smart Space is Dublin's only 5-star Ring installer, serving all of Leinster. SME Business Winner 2025 with 5,000+ installations.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Smart Space | Dublin's #1 5-Star Ring Installer",
    description:
      "Dublin's only 5-star Ring installer. 5,000+ installations across Dublin and Leinster.",
    url: `${SITE}/about`,
    type: "website",
  },
};

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE}/about`,
  name: "About Smart Space",
  description:
    "Smart Space is Dublin's only 5-star Ring installer, serving all of Leinster with 5,000+ professional installations.",
  mainEntity: { "@id": `${SITE}/#localbusiness` },
  publisher: { "@id": `${SITE}/#organization` },
};

export default function AboutPage() {
  return (
    <div className="pt-28 lg:pt-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6">
            We&apos;re Smart Space
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            Dublin&apos;s #1 5-star Ring installer, bringing professional smart home
            security to homes across Dublin and all of Leinster.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <span className="text-brand-500 font-semibold text-sm uppercase tracking-widest">Our Story</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3 mb-6">
                Making homes safer, one Ring at a time
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Smart Space started with a simple belief: every home in Ireland deserves
                  professional-grade security that&apos;s easy to use and beautifully designed.
                </p>
                <p>
                  As Dublin&apos;s #1 Ring installer — now serving all of Leinster — we don&apos;t just
                  sell products. We deliver a complete service: helping you choose the right
                  setup for your home, professional installation, and ongoing support.
                </p>
                <p>
                  Based in Dublin, we cover all 12 counties of Leinster with the same commitment
                  to quality and care that earned us recognition as Three Ireland SME
                  Business Winner 2025.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {[
                { icon: ShieldCheck, number: "5,000+", label: "Installations" },
                { icon: Award, number: "2025", label: "SME Award Winner" },
                { icon: Users, number: "100%", label: "Customer Satisfaction" },
                { icon: MapPin, number: "12", label: "Counties Covered" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-gray-50 rounded-2xl p-6 text-center"
                >
                  <stat.icon className="h-8 w-8 text-brand-500 mx-auto mb-3" />
                  <div className="text-2xl font-extrabold text-gray-900 mb-1">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Why Choose Smart Space
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Expert Knowledge",
                description:
                  "Our team are trained Ring specialists who understand every product inside and out. We'll recommend the perfect setup for your home.",
              },
              {
                title: "Professional Installation",
                description:
                  "We handle everything — from mounting and wiring to Wi-Fi setup and app configuration. Your Ring system, installed right the first time.",
              },
              {
                title: "Ongoing Support",
                description:
                  "Our relationship doesn't end at installation. We provide ongoing support, troubleshooting, and advice whenever you need it.",
              },
            ].map((value) => (
              <div key={value.title} className="bg-white rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {value.description}
                </p>
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
            Get in touch and we&apos;ll help you find the perfect Ring setup for your home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/services"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-4 rounded-full transition-all shadow-lg"
            >
              Browse Services
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 font-semibold px-10 py-4 rounded-full hover:border-brand-500 hover:text-brand-500 transition-all">
              Have a Question?
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
