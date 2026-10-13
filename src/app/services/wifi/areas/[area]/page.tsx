import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ArrowRight, Phone, Check, Gauge } from "lucide-react";

import GuideLinks from "@/components/wifi/GuideLinks";
import { ASSESSMENT_EURO, NIGEL_FAQ, NIGEL_PROBLEMS, NIGEL_STEPS } from "@/data/wifiPackages";
import { WIFI_AREA_SLUGS, getWifiAreaBySlug } from "@/data/wifiAreas";

/*
 * A local page for SmartSpace Networks in Nigel's words (src/data/wifiAreas.ts
 * says why): his headline, who it's for, how it works, a clear answer either
 * way and his questions, with the area's name and towns.
 */

const SITE = "https://smart-space.ie";
const BOOK = "/services/wifi/home-network-assessment#book";
const QUIET = "font-semibold text-brand-700 hover:text-brand-800 no-underline hover:underline focus-visible:underline underline-offset-4";
const LEDE =
  "We measure every floor, leave a working system running for 3 days, and show you the numbers before you decide.";

export function generateStaticParams() {
  return WIFI_AREA_SLUGS.map((area) => ({ area }));
}

type Params = { area: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { area } = await params;
  const a = getWifiAreaBySlug(area);
  if (!a) return { title: "Not Found | Smart Space" };
  return {
    title: `Try-Before-You-Buy Wi-Fi Assessment in ${a.name} | SmartSpace Networks`,
    description: `Try better Wi-Fi in your own home in ${a.name} for 3 days before you spend a cent on it. ${LEDE} €${ASSESSMENT_EURO} incl. VAT, credited in full against any work.`,
    alternates: { canonical: `/services/wifi/areas/${a.slug}` },
    openGraph: {
      title: `Try Better Wi-Fi in Your Own Home, ${a.name} | SmartSpace Networks`,
      description: LEDE,
      url: `${SITE}/services/wifi/areas/${a.slug}`,
      type: "website",
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: `SmartSpace Networks in ${a.name}` }],
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
    name: `Home Network Assessment in ${a.name}`,
    description: LEDE,
    provider: { "@id": `${SITE}/#organization` },
    serviceType: "Home network assessment",
    areaServed: { "@type": "AdministrativeArea", name: `County ${a.name}` },
    offers: { "@type": "Offer", priceCurrency: "EUR", price: String(ASSESSMENT_EURO), url: `${SITE}/services/wifi/home-network-assessment` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "SmartSpace Networks", item: `${SITE}/services/wifi` },
      { "@type": "ListItem", position: 3, name: a.name, item: `${SITE}/services/wifi/areas/${a.slug}` },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: NIGEL_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <div className="pt-32 lg:pt-36 pb-16 lg:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/services/wifi" className="hover:text-brand-500 transition-colors">SmartSpace Networks</Link>
          <span>/</span>
          <span className="text-[#1a1a1a] font-medium">{a.name}</span>
        </nav>

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-600 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
            <MapPin className="w-3.5 h-3.5" />
            Ireland&apos;s first try-before-you-buy Wi-Fi assessment · {a.name}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink mb-5 leading-tight tracking-[-0.035em] text-balance">
            Try Better Wi-Fi in Your Own Home for 3 Days Before You Spend a Cent on It.
          </h1>
          <p className="text-ink-soft text-lg leading-relaxed mb-3">
            You&apos;ve asked why your Wi-Fi keeps buffering. An AI assistant can tell you what usually causes it, but it
            can&apos;t see your house. {LEDE}
          </p>
          <p className="text-sm font-medium text-ink-muted">Covering {a.towns}.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-12 pb-10 border-b border-gray-100">
          <Link
            href={BOOK}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold px-7 py-3 rounded-full shadow-[0_10px_40px_-5px_rgba(242,130,34,0.55)]"
          >
            Book your assessment <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/wifi-check"
            className="inline-flex items-center gap-2 border border-gray-200 hover:border-brand-500 text-ink font-semibold px-6 py-3 rounded-full transition-colors"
          >
            <Gauge className="h-4 w-4" /> Run the free Wi-Fi check first
          </Link>
          <a href="tel:+35315130424" className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:text-brand-600">
            <Phone className="h-4 w-4" /> 01 513 0424
          </a>
          <p className="w-full text-xs text-ink-muted">€{ASSESSMENT_EURO} incl. VAT, credited in full against any work.</p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-5 tracking-[-0.03em]">
            If Any of This Sounds Like Your House, This Is for You.
          </h2>
          <ul className="space-y-3">
            {NIGEL_PROBLEMS.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-[15px] text-ink-soft leading-relaxed">
                <Check className="h-4 w-4 text-brand-500 flex-shrink-0 mt-1" strokeWidth={3} />
                <span>
                  {p.text}.{" "}
                  <Link href={p.href} className={`text-sm ${QUIET}`}>{p.label}</Link>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12 rounded-2xl bg-cream border border-gray-100 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink mb-5 tracking-[-0.03em]">Two Visits, Three Days, One Clear Answer.</h2>
          <ol className="space-y-3">
            {NIGEL_STEPS.map((st, i) => (
              <li key={st.title} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1C1A18] text-xs font-extrabold text-white">{i + 1}</span>
                <span className="text-[15px] text-ink-soft leading-relaxed">
                  <strong className="text-ink">{st.title}.</strong> {st.body}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-12 grid sm:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-premium p-6">
            <h3 className="font-bold text-ink mb-2">If our no-cables solution works</h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              We use the latest G.hn powerline technology to carry your connection through your home&apos;s existing
              electrical wiring, to a tri-band Wi-Fi 6E access point on each floor. No drilling, no trunking, no mess.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white shadow-premium p-6">
            <h3 className="font-bold text-ink mb-2">If it won&apos;t work in your home</h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              The measurements prove it, and the report shows which floors and rooms need a cabled connection. You can
              hand it to a cable specialist with the knowledge that there is no other option.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink mb-6 tracking-[-0.03em]">Questions People Ask</h2>
          <div className="space-y-4">
            {NIGEL_FAQ.map((f) => (
              <details key={f.q} className="group bg-white border border-gray-100 rounded-xl p-5">
                <summary className="flex items-center justify-between cursor-pointer font-bold text-ink list-none">
                  <span>{f.q}</span>
                  <span className="text-brand-500 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-ink-soft leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <GuideLinks className="mt-8" />
        </section>

        <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 px-6 py-10 sm:px-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-[-0.03em] mb-2">
            You&apos;ve Done the Research. Now Get the Measurement.
          </h2>
          <p className="text-white/85 mb-6">€{ASSESSMENT_EURO} incl. VAT · credited in full against any work we do</p>
          <Link href={BOOK} className="inline-flex items-center gap-2 bg-white text-ink font-bold text-sm px-8 py-3.5 rounded-full">
            Book your assessment <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
