import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight, Phone, Mail } from "lucide-react";

import { COUNTIES, DETAIL_COUNTY_SLUGS } from "@/data/counties";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Areas We Cover | Ring Installation Across Leinster | Smart Space",
  description:
    "Smart Space installs Ring doorbells and cameras across all 12 counties of Leinster — Dublin, Wicklow, Kildare, Meath, Louth, Wexford and more.",
  alternates: { canonical: "/areas" },
  openGraph: {
    title: "Ring Installation Across Leinster | Smart Space",
    description:
      "We cover all 12 counties of Leinster with professional Ring doorbell and camera installation.",
    url: `${SITE}/areas`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Ring Installation Areas — Smart Space (Leinster)" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ring Installation Across Leinster | Smart Space",
    description:
      "We cover all 12 counties of Leinster with professional Ring doorbell and camera installation.",
    images: ["/og-default.png"],
  },
};

const DETAIL_SLUG_SET = new Set<string>(DETAIL_COUNTY_SLUGS);

export default function AreasPage() {
  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">Areas We Cover</span>
        </nav>

        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
            <MapPin className="w-3.5 h-3.5" />
            Ring Installation Across Leinster
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4">
            Areas We Cover
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Smart Space is based in Dublin and covers all 12 counties of Leinster.
            Same professional Ring installation, same 5-star service, wherever you are.
          </p>
        </div>

        {/* Counties */}
        <div className="space-y-8">
          {COUNTIES.map((c) => {
            const hasDetail = DETAIL_SLUG_SET.has(c.slug);
            return (
              <article
                key={c.slug}
                id={c.slug}
                className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 lg:p-10 scroll-mt-32"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-4 mb-4">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                    Ring Installation in {c.name}
                  </h2>
                  <div className="text-sm text-brand-500 font-semibold">
                    County {c.name}
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                  Towns: {c.towns}
                </p>
                {/* Teaser for counties with a dedicated detail page (avoids
                    duplicating the same paragraph on the hub + detail page,
                    which trips Google's duplicate-content signal). The full
                    paragraph lives on /areas/<slug>. */}
                {hasDetail && c.extended ? (
                  <p className="text-gray-600 leading-relaxed">
                    {c.extended.teaser}
                  </p>
                ) : (
                  <p className="text-gray-600 leading-relaxed">{c.copy}</p>
                )}
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {hasDetail ? (
                    <Link
                      href={`/areas/${c.slug}`}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors"
                    >
                      Read more about Ring installs in {c.name}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/services/free-consultation"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors"
                    >
                      Book Free {c.name} Consultation
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                  <span className="text-gray-300">·</span>
                  <a
                    href="tel:+35315130424"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-brand-500 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    01 513 0424
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {/* Jump-nav */}
        <div className="mt-12 p-6 sm:p-8 bg-gray-50 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            Jump to county
          </h3>
          <div className="flex flex-wrap gap-2">
            {COUNTIES.map((c) => (
              <a
                key={c.slug}
                href={DETAIL_SLUG_SET.has(c.slug) ? `/areas/${c.slug}` : `#${c.slug}`}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {c.name}
              </a>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white rounded-2xl p-8 sm:p-12 max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Ready to book a Ring install?
          </h2>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            Complimentary consultation, honest written quote, professional installation.
            Anywhere in Leinster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/services/free-consultation"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-full transition-colors"
            >
              Book Free Consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:info@smart-space.ie"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-full transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
