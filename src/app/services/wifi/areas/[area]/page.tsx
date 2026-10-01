import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowRight, Phone, Check, Gauge } from "lucide-react";

import GuideLinks from "@/components/wifi/GuideLinks";
import { SYMPTOMS, ASSESSMENT_EURO } from "@/data/wifiPackages";
import { WIFI_AREAS, WIFI_AREA_SLUGS, getWifiAreaBySlug } from "@/data/wifiAreas";

const SITE = "https://smart-space.ie";

export function generateStaticParams() {
  return WIFI_AREA_SLUGS.map((area) => ({ area }));
}

type Params = { area: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { area } = await params;
  const a = getWifiAreaBySlug(area);
  if (!a) return { title: "Not Found | Smart Space" };
  return {
    title: `Home Network & Wi-Fi Survey in ${a.name} | Smart Space`,
    description: `${a.teaser} A €${ASSESSMENT_EURO} home network assessment in ${a.name}: your broadband and every floor measured, a three-day trial, and a written report. Credited in full against any work.`,
    alternates: { canonical: `/services/wifi/areas/${a.slug}` },
    openGraph: {
      title: `Home Network Diagnosis in ${a.name} | Smart Space`,
      description: a.teaser,
      url: `${SITE}/services/wifi/areas/${a.slug}`,
      type: "website",
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: `Home network diagnosis in ${a.name}, Smart Space` }],
    },
  };
}

export default async function WifiAreaPage({ params }: { params: Promise<Params> }) {
  const { area } = await params;
  const a = getWifiAreaBySlug(area);
  if (!a) notFound();

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Home Network Diagnosis in ${a.name}`,
    description: `A measured home network assessment across ${a.name}. ${a.teaser}`,
    provider: {
      "@type": "LocalBusiness",
      "@id": `${SITE}/#localbusiness`,
      name: "Smart Space",
      url: SITE,
      telephone: "+35315130424",
      email: "info@smart-space.ie",
    },
    serviceType: "Home network assessment and diagnosis",
    areaServed: { "@type": "AdministrativeArea", name: `County ${a.name}` },
    offers: { "@type": "Offer", priceCurrency: "EUR", price: String(ASSESSMENT_EURO), url: `${SITE}/services/wifi` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Home Network Diagnosis", item: `${SITE}/services/wifi` },
      { "@type": "ListItem", position: 3, name: a.name, item: `${SITE}/services/wifi/areas/${a.slug}` },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: a.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/services/wifi" className="hover:text-brand-500 transition-colors">Home Network Diagnosis</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">{a.name}</span>
        </nav>

        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
            <MapPin className="w-3.5 h-3.5" />
            Home network diagnosis · {a.name}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-5 leading-tight">
            Home network diagnosis in {a.name}.
          </h1>
          <p className="text-gray-600 text-lg leading-relaxed mb-3">{a.teaser}</p>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Towns covered: {a.towns}</p>
        </div>

        {/* CTA bar */}
        <div className="flex flex-wrap items-center gap-3 mb-12 pb-10 border-b border-gray-100">
          <Link
            href="/services/wifi"
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-7 py-3 rounded-full transition-colors"
          >
            See the €{ASSESSMENT_EURO} assessment
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/wifi-check"
            className="inline-flex items-center gap-2 border border-gray-200 hover:border-brand-500 text-gray-700 hover:text-brand-500 font-semibold px-6 py-3 rounded-full transition-colors"
          >
            <Gauge className="h-4 w-4" />
            Free Wi-Fi check first
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
            What the network problem usually is in {a.name}
          </h2>
          <p className="text-gray-700 leading-relaxed text-[17px]">{a.localContext}</p>
        </section>

        {/* Symptoms */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-5">What it is for</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {SYMPTOMS.map((s) => (
              <div key={s.title} className="bg-white border border-gray-100 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Scenario */}
        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-5">{a.scenario.title}</h2>
          <p className="text-gray-700 leading-relaxed text-[17px]">{a.scenario.body}</p>
        </section>

        {/* What the assessment is + the fix */}
        <section className="mb-12 bg-brand-50/40 border border-brand-100 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-4">
            How the {a.name} assessment works
          </h2>
          <ul className="space-y-2.5 mb-5">
            {[
              "Your broadband tested at the router by cable, so the report can say whether the line itself is the problem",
              "Every floor measured, so it shows where the connection is lost, not where we guess it is",
              "A working trial on the floor that struggles, monitored for three days while you live with it",
              "A written report with the figures, yours to keep even if you take them to your provider",
            ].map((f) => (
              <li key={f} className="flex items-start gap-3">
                <Check className="h-4 w-4 text-brand-500 flex-shrink-0 mt-1" />
                <span className="text-sm text-gray-700 leading-relaxed">{f}</span>
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed text-[15px]">
            If a fix is worth it, it is powerline carrying your connection over the electrical wiring already in the house
            to access points placed where the measurements say, on one network name. The €{ASSESSMENT_EURO} assessment is
            credited in full against it.{" "}
            <Link href="/services/wifi" className="font-semibold text-brand-700 hover:text-brand-800 underline-offset-4 hover:underline">
              See the full assessment
            </Link>
            .
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">
            Home network in {a.name}, frequently asked
          </h2>
          <div className="space-y-5">
            {a.faqs.map((f) => (
              <details key={f.q} className="group bg-white border border-gray-100 rounded-xl p-5">
                <summary className="flex items-center justify-between cursor-pointer font-bold text-gray-900 list-none">
                  <span>{f.q}</span>
                  <span className="text-brand-500 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-gray-700 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Guides */}
        <div className="mb-12">
          <GuideLinks />
        </div>

        {/* Final CTA */}
        <div className="text-center bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Measure your {a.name} home first</h2>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            A €{ASSESSMENT_EURO} home network assessment: broadband and every floor measured, a three-day trial in the room that
            struggles, and a written report. Credited in full against any work.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/services/wifi"
              className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3.5 rounded-full transition-colors"
            >
              See the assessment
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/wifi-check"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-full transition-colors"
            >
              <Gauge className="h-4 w-4" />
              Run the free check
            </Link>
          </div>
        </div>

        {/* Sibling areas */}
        <div className="mt-12 p-6 bg-gray-50 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">We also cover</h3>
          <div className="flex flex-wrap gap-2">
            {WIFI_AREAS.filter((other) => other.slug !== a.slug).map((other) => (
              <Link
                key={other.slug}
                href={`/services/wifi/areas/${other.slug}`}
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
