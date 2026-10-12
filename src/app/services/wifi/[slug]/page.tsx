import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Phone } from "lucide-react";
import TrafficLight, { LIGHT_WORD } from "@/components/wifi/TrafficLight";
import WifiEnquiryForm from "@/components/wifi/WifiEnquiryForm";
import NetworkPayButton from "@/components/wifi/NetworkPayButton";
import {
  WIFI_PACKAGES,
  MONITOR_POINTS,
  MONITOR_UNIT,
  NETWORK_PAYABLE,
  packageBySlug,
  priceLabel,
  priceNote,
  type NetworkPayable,
} from "@/data/wifiPackages";
import { BUSINESS_PHONE_DISPLAY, BUSINESS_PHONE_E164 } from "@/lib/business-constants";

const SITE = "https://smart-space.ie";

/* Three packages, all known at build time. Any other slug is a real 404. */

/* A quiet link, the same as the hub's and the guides': no underline until hover or focus. */
const QUIET = "font-semibold text-brand-700 hover:text-brand-800 no-underline hover:underline focus-visible:underline underline-offset-4";
export const dynamicParams = false;
export const generateStaticParams = () => WIFI_PACKAGES.map((p) => ({ slug: p.slug }));

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const pkg = packageBySlug(params.slug);
  if (!pkg) return {};
  const title = `${pkg.name} | Dublin & Leinster | Smart Space`;
  return {
    title,
    description: `${pkg.forWho} ${pkg.intro}`.slice(0, 300),
    alternates: { canonical: `/services/wifi/${pkg.slug}` },
    openGraph: {
      title,
      description: pkg.forWho,
      url: `${SITE}/services/wifi/${pkg.slug}`,
      type: "website",
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: pkg.name }],
    },
  };
}

export default function WifiPackagePage({ params }: { params: { slug: string } }) {
  const pkg = packageBySlug(params.slug);
  if (!pkg) notFound();
  const others = WIFI_PACKAGES.filter((p) => p.slug !== pkg.slug);
  const isMonitoring = pkg.slug === "network-monitoring";
  const isAssessment = pkg.slug === "home-network-assessment";
  const isEvidence = pkg.slug === "broadband-evidence";
  const payable = NETWORK_PAYABLE.includes(pkg.slug as NetworkPayable) && pkg.price.kind === "fixed" ? pkg.price.euro : null;
  const eyebrow = isMonitoring
    ? "Network Monitoring"
    : isAssessment
      ? "Home Network Diagnosis"
      : isEvidence
        ? "Broadband Evidence · Dublin & Leinster"
        : "The Fix";

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
      { "@type": "ListItem", position: 3, name: "Home Network Diagnosis", item: `${SITE}/services/wifi` },
      { "@type": "ListItem", position: 4, name: pkg.name, item: `${SITE}/services/wifi/${pkg.slug}` },
    ],
  };
  /* What is sold, where, and at what price when it is fixed: rich results and AI answers read this. */
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: pkg.name,
    description: pkg.forWho,
    serviceType: "Home network diagnosis",
    provider: { "@id": "https://smart-space.ie/#organization" },
    areaServed: { "@type": "AdministrativeArea", name: "Dublin and Leinster, Ireland" },
    url: `https://smart-space.ie/services/wifi/${pkg.slug}`,
    ...(pkg.price.kind === "quote"
      ? {}
      : {
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: String(pkg.price.euro),
            ...(pkg.price.kind === "monthly"
              ? { priceSpecification: { "@type": "UnitPriceSpecification", price: String(pkg.price.euro), priceCurrency: "EUR", unitCode: "MON" } }
              : {}),
          },
        }),
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pkg.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />

      <section className="pt-32 lg:pt-36 pb-14 lg:pb-20 bg-gradient-to-b from-cream to-white relative overflow-clip">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <nav className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-sm text-gray-500 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-brand-500 transition-colors">Services</Link>
            <span>/</span>
            <Link href="/services/wifi" className="hover:text-brand-500 transition-colors">Home Network Diagnosis</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{pkg.name}</span>
          </nav>

          <div className="grid lg:grid-cols-5 gap-10 items-start">
            <div className="lg:col-span-3 text-center lg:text-left">
              <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">
                {eyebrow}
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink mb-4 tracking-[-0.035em]">{pkg.name}</h1>
              <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto lg:mx-0">{pkg.forWho}</p>
              <p className="mt-5 text-ink-soft leading-relaxed max-w-2xl mx-auto lg:mx-0">{pkg.intro}</p>
              {!isAssessment && !isEvidence && (
                <p className="mt-3 text-sm text-ink-soft max-w-2xl mx-auto lg:mx-0">
                  Starts with the{" "}
                  <Link href="/services/wifi/home-network-assessment" className={QUIET}>
                    €395 assessment
                  </Link>
                  , a working trial in your home for 3 days, credited in full against the work.
                </p>
              )}
              <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                <a
                  href="#book"
                  className="btn-sheen inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold text-sm px-7 py-3.5 rounded-full shadow-[0_10px_40px_-5px_rgba(242,130,34,0.55)] transition-all"
                >
                  <span className="relative z-10">{isAssessment ? "Book an Assessment" : isEvidence ? "Book the Evidence Service" : "Ask About This"}</span>
                  <ArrowRight className="relative z-10 w-4 h-4" />
                </a>
                <a
                  href={`tel:${BUSINESS_PHONE_E164}`}
                  className="inline-flex items-center justify-center gap-2 bg-white text-ink font-semibold text-sm px-7 py-3.5 rounded-full border border-gray-200 hover:bg-cream-100 transition-colors"
                >
                  <Phone className="w-4 h-4" /> {BUSINESS_PHONE_DISPLAY}
                </a>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-3xl bg-white border-2 border-brand-500 shadow-[0_30px_70px_-20px_rgba(242,100,25,0.35)] p-6 sm:p-8">
                <div className={`font-extrabold tracking-[-0.03em] ${pkg.price.kind === "quote" ? "text-lg text-brand-600" : "text-3xl text-brand-500"}`}>
                  {priceLabel(pkg)}
                </div>
                <p className="mt-1.5 text-xs text-ink-muted">{priceNote(pkg)}</p>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-5" />
                <ul className="space-y-3">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[13.5px] text-ink-soft leading-relaxed">
                      <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center">
                        <Check className="h-3 w-3 text-brand-500" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-cream px-4 py-3">
                  <div className="flex gap-1.5">
                    {pkg.lights.map((l) => (
                      <TrafficLight key={l} light={l} size="sm" />
                    ))}
                  </div>
                  <p className="text-xs text-ink-soft leading-snug">
                    Recommended when your Wi-Fi report shows {pkg.lights.map((l) => LIGHT_WORD[l].toLowerCase()).join(" or ")}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What it involves */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-5">
            {pkg.details.map((d) => (
              <div key={d.title} className="rounded-3xl bg-cream border border-gray-100 p-6 sm:p-7">
                <h2 className="text-lg font-bold text-ink mb-1.5">{d.title}</h2>
                <p className="text-sm text-ink-soft leading-relaxed">{d.body}</p>
              </div>
            ))}
          </div>

          {pkg.related.length > 0 && (
            <p className="mt-6 text-sm text-ink-soft text-center sm:text-left">
              Read around it:{" "}
              {pkg.related.map((r, i) => (
                <span key={r.href}>
                  {i > 0 && " · "}
                  {/* A static file (the sample report) needs a plain link, not client navigation. */}
                  {r.href.endsWith(".html") ? (
                    <a href={r.href} className={QUIET}>
                      {r.label}
                    </a>
                  ) : (
                    <Link href={r.href} className={QUIET}>
                      {r.label}
                    </Link>
                  )}
                </span>
              ))}
            </p>
          )}

          {isMonitoring && (
            <div className="mt-10">
              <h2 className="text-2xl font-extrabold text-ink tracking-[-0.03em] mb-5">What the unit does</h2>
              <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {MONITOR_POINTS.map((m) => (
                  <li key={m.title} className="rounded-2xl border border-gray-100 bg-white shadow-premium p-5">
                    <div className="font-bold text-ink mb-1">{m.title}</div>
                    <div className="text-sm text-ink-soft leading-relaxed">{m.body}</div>
                  </li>
                ))}
              </ul>

              <div className="mt-10 grid lg:grid-cols-2 gap-6">
                <div className="rounded-3xl bg-[#1C1A18] text-white p-6 sm:p-8">
                  <h2 className="text-2xl font-extrabold tracking-[-0.03em] mb-5">The unit</h2>
                  <dl className="divide-y divide-white/10">
                    {MONITOR_UNIT.specs.map((s) => (
                      <div key={s.label} className="flex items-start justify-between gap-6 py-3 text-sm">
                        <dt className="text-white/60 shrink-0">{s.label}</dt>
                        <dd className="font-semibold text-right">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="rounded-3xl bg-cream border border-gray-100 p-6 sm:p-8">
                  <h2 className="text-2xl font-extrabold text-ink tracking-[-0.03em] mb-5">Good to know</h2>
                  <ul className="space-y-3.5">
                    {MONITOR_UNIT.tips.map((t) => (
                      <li key={t} className="flex items-start gap-3 text-sm text-ink-soft leading-relaxed">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Questions and the form */}
      <section id="book" className="py-14 lg:py-20 bg-gradient-to-b from-white to-cream scroll-mt-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-[-0.03em] mb-6">Questions</h2>
            <div className="divide-y divide-gray-100 rounded-3xl border border-gray-100 bg-white shadow-premium">
              {pkg.faq.map((f) => (
                <details key={f.q} className="group px-5 sm:px-7 py-5">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-bold text-ink">
                    {f.q}
                    <span className="text-brand-500 text-xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-ink-soft leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            {payable !== null && (
              <div className="rounded-3xl bg-white border-2 border-brand-500 shadow-premium p-6 sm:p-8">
                <h2 className="text-2xl font-extrabold text-ink tracking-[-0.03em] mb-1.5">
                  {isEvidence ? "Book the evidence service" : "Book your assessment"}
                </h2>
                <p className="text-sm text-ink-soft leading-relaxed mb-5">
                  Pay €{payable} securely now and we ring you within one working day to{" "}
                  {isEvidence ? "confirm your speed and post the box" : "pick a time for the first visit"}.
                  {isAssessment && " Credited in full against any work."}
                </p>
                <NetworkPayButton slug={pkg.slug} name={pkg.name} euro={payable} />
              </div>
            )}
            <WifiEnquiryForm
              pkg={pkg.slug}
              title={payable ? "Or ask us to ring you first" : `Ask about ${pkg.name}`}
              blurb={
                payable
                  ? "Prefer to talk it through first? Leave your details and we'll ring you, and take payment by a secure link."
                  : "Leave your details and we'll ring you to talk it through."
              }
              button="Request a callback"
            />
          </div>
        </div>
      </section>

      {/* The other services */}
      <section className="py-12 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {others.map((o) => (
              <Link
                key={o.slug}
                href={`/services/wifi/${o.slug}`}
                className="group rounded-3xl bg-white border border-gray-100 shadow-premium hover:shadow-premium-lg transition-shadow p-6"
              >
                <div className="text-lg font-bold text-ink group-hover:text-brand-500 transition-colors">{o.name}</div>
                <p className="text-sm text-ink-muted mt-1 mb-3">{o.forWho}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-500">
                  View package <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
