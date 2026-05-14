import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowRight, Phone, Mail, Check } from "lucide-react";

import {
  COUNTIES,
  DETAIL_COUNTY_SLUGS,
  getCountyBySlug,
} from "@/data/counties";

const SITE = "https://smart-space.ie";

// Statically generate one page per detail county at build time.
export function generateStaticParams() {
  return DETAIL_COUNTY_SLUGS.map((slug) => ({ county: slug }));
}

type Params = { county: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { county } = await params;
  const c = getCountyBySlug(county);
  if (!c || !c.extended) {
    return { title: "Not Found | Smart Space" };
  }
  return {
    title: `Ring Installer ${c.name} · Doorbell & Camera Installation | Smart Space`,
    description: `Professional Ring doorbell and security camera installation across County ${c.name}. Brand-agnostic (Ring, Eufy, Nest, Tapo), flat from €139, no contract. Free home consultation.`,
    alternates: { canonical: `/areas/${c.slug}` },
    openGraph: {
      title: `Ring Installer ${c.name} | Smart Space`,
      description: `${c.extended.teaser} Free home consultation, written quote, fitted within the week.`,
      url: `${SITE}/areas/${c.slug}`,
      type: "website",
    },
  };
}

export default async function CountyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { county } = await params;
  const c = getCountyBySlug(county);
  if (!c || !c.extended) {
    notFound();
  }
  const ext = c.extended;

  // Service + LocalBusiness areaServed + Breadcrumb + FAQ schema.
  // Each surfaces a different rich-result class in Google.
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Ring Doorbell & Camera Installation in ${c.name}`,
    description: `Professional Ring installation across County ${c.name}. ${ext.teaser}`,
    provider: {
      "@type": "LocalBusiness",
      "@id": `${SITE}/#localbusiness`,
      name: "Smart Space",
      url: SITE,
      telephone: "+35315130424",
      email: "info@smart-space.ie",
    },
    serviceType: "Smart home security installation",
    areaServed: {
      "@type": "AdministrativeArea",
      name: `County ${c.name}`,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: "139",
      url: `${SITE}/services/installation-only`,
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Areas We Cover",
        item: `${SITE}/areas`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `County ${c.name}`,
        item: `${SITE}/areas/${c.slug}`,
      },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ext.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8 flex-wrap">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/areas" className="hover:text-brand-500 transition-colors">Areas We Cover</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">County {c.name}</span>
        </nav>

        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
            <MapPin className="w-3.5 h-3.5" />
            Ring Installer · County {c.name}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            Ring &amp; smart-doorbell installation in {c.name}.
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed mb-3">
            {ext.teaser}
          </p>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Towns covered: {c.towns}
          </p>
        </div>

        {/* CTA bar */}
        <div className="flex flex-wrap items-center gap-3 mb-12 pb-12 border-b border-gray-100">
          <Link
            href="/services/free-consultation"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-7 py-3 rounded-full transition-colors"
          >
            Book free {c.name} consultation
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="tel:+35315130424"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-brand-500 transition-colors"
          >
            <Phone className="h-4 w-4" />
            01 513 0424
          </a>
        </div>

        {/* Local context */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-5">
            What makes {c.name} installs different
          </h2>
          <p className="text-gray-700 leading-relaxed text-[17px]">
            {ext.localContext}
          </p>
        </section>

        {/* Original short copy block — keeps the page rich on county-named keywords */}
        <section className="mb-12 bg-brand-50/40 border border-brand-100 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-4">
            Smart Space in {c.name} — the short version
          </h2>
          <p className="text-gray-700 leading-relaxed">{c.copy}</p>
        </section>

        {/* Scenario */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-5">
            {ext.scenario.title}
          </h2>
          <p className="text-gray-700 leading-relaxed text-[17px]">
            {ext.scenario.body}
          </p>
        </section>

        {/* Services we install here */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-5">
            What we install in {c.name}
          </h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {[
              { href: "/services/doorbell", label: "Ring Video Doorbells (Plus & Pro)" },
              { href: "/services/camera", label: "Ring Floodlight Cams (Plus & Pro)" },
              { href: "/services/bundles/driveway", label: "Driveway Bundle — doorbell + floodlight" },
              { href: "/services/bundles/whole-home", label: "Whole Home Bundle — multi-camera" },
              { href: "/services/bundles/eldercare", label: "Eldercare Bundle — doorbell + lockbox" },
              { href: "/services/installation-only", label: "Installation-only · €139 · Ring, Eufy, Nest, Tapo" },
            ].map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="flex items-center gap-3 p-4 bg-white border border-gray-100 hover:border-brand-500 rounded-xl transition-colors group"
                >
                  <Check className="h-4 w-4 text-brand-500 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-600">
                    {s.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">
            {c.name} Ring installation — frequently asked
          </h2>
          <div className="space-y-5">
            {ext.faqs.map((f) => (
              <details
                key={f.q}
                className="group bg-white border border-gray-100 rounded-xl p-5"
              >
                <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 list-none">
                  <span>{f.q}</span>
                  <span className="text-brand-500 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-gray-700 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <div className="text-center bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
            Book a Ring install in {c.name}
          </h2>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            Complimentary consultation, written quote on the day, fitted within the week. Flat from €139. No contract.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/services/free-consultation"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-full transition-colors"
            >
              Book free consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="mailto:info@smart-space.ie"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-full transition-colors"
            >
              <Mail className="h-4 w-4" />
              Email us
            </a>
          </div>
        </div>

        {/* Cross-links to sibling counties */}
        <div className="mt-12 p-6 bg-gray-50 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            We also cover
          </h3>
          <div className="flex flex-wrap gap-2">
            {COUNTIES.filter((other) => other.slug !== c.slug).map((other) => (
              <Link
                key={other.slug}
                href={
                  (DETAIL_COUNTY_SLUGS as readonly string[]).includes(other.slug)
                    ? `/areas/${other.slug}`
                    : `/areas#${other.slug}`
                }
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700 hover:border-brand-500 hover:text-brand-500 transition-colors"
              >
                {other.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
