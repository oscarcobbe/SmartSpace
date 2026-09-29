import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Gauge, MonitorSmartphone, BellRing, UserPlus, FileText, ShieldCheck, Tv, WifiOff, DoorOpen } from "lucide-react";
import NetworkHouse from "@/components/wifi/NetworkHouse";
import TrafficLight from "@/components/wifi/TrafficLight";
import { WIFI_PACKAGES, MONITOR_POINTS, SYMPTOMS, ASSESSMENT_EURO, packageBySlug, priceLabel, priceNote } from "@/data/wifiPackages";
import type { Light } from "@/lib/wifi-check/grade";

const SITE = "https://smart-space.ie";

/*
 * The network diagnosis hub. Built to the market-entry briefing of 28
 * September 2026: the trial is the proposition, so it leads; the three
 * symptoms come next; then what the assessment includes, as a numbered list.
 * Never "Wi-Fi installation" anywhere on it, "powerline" said plainly, and
 * "monitored" rather than "managed". The briefing's worked example with real
 * figures waits for the first job: there are no figures yet to show.
 */

export const metadata: Metadata = {
  title: "Home Network Diagnosis | Wi-Fi Survey Dublin & Leinster | Smart Space",
  description: `We test your broadband, measure every floor, and leave a working trial system for three days before you buy anything. A €${ASSESSMENT_EURO} home network assessment, credited in full against the work. Dublin and Leinster.`,
  alternates: { canonical: "/services/wifi" },
  openGraph: {
    title: "Home Network Diagnosis | Smart Space",
    description: "Measured, trialled, then fixed. Your broadband and every floor measured, and a working trial system in place for three days, before you spend anything on a fix.",
    url: `${SITE}/services/wifi`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Smart Space home network diagnosis" }],
  },
};

const SYMPTOM_ICONS = [Tv, WifiOff, DoorOpen];
const MONITOR_ICONS = [Gauge, MonitorSmartphone, BellRing, UserPlus, FileText, ShieldCheck];

const assessment = packageBySlug("home-network-assessment")!;

const STEPS = [
  {
    n: "1",
    title: "Check",
    body: "Optional and free: run the Wi-Fi check beside your router and in the room that struggles. It grades the result green, amber or red.",
  },
  {
    n: "2",
    title: "Assess",
    body: `The €${ASSESSMENT_EURO} assessment: we measure the house, leave a trial on the worst floor for three days, and send you the figures.`,
  },
  {
    n: "3",
    title: "Fix",
    body: "If you want the fix, powerline carries the connection to access points placed where the measurements say. Quoted from the figures.",
  },
  {
    n: "4",
    title: "Monitor",
    body: "Optional: a monitoring unit stays on your router and we're alerted when the broadband, or a device that matters, drops.",
  },
];

const LIGHTS: { light: Light; title: string; means: string; next: string }[] = [
  {
    light: "green",
    title: "Green",
    means: "Your connection covers what your home needs in every place you tested.",
    next: "Nothing to fix. Your report sets your upload against Ring's figures for smart cameras.",
  },
  {
    light: "amber",
    title: "Amber",
    means: "A room, the upload or the response falls short, or drop-outs come and go.",
    next: "The assessment finds which, with three days of data.",
  },
  {
    light: "red",
    title: "Red",
    means: "Your home needs more than the Wi-Fi delivers, in speed, reach or both.",
    next: "The assessment measures every floor and tests a fix in your house before you buy it.",
  },
];

const FAQ = [
  {
    q: `Why pay €${ASSESSMENT_EURO} when a survey elsewhere is free?`,
    a: "A free survey is a walk-around that ends in a quote. The assessment is a wired test of your broadband, measurements on every floor, and a working trial in your house for three days, with a written report of the figures. It is credited in full against any work you go ahead with.",
  },
  {
    q: "What is powerline?",
    a: "Adapters that carry your broadband over the electrical wiring already in the house, to an access point on the floor that needs one. How fast it runs depends on the wiring, which is why we measure it in your house before we quote.",
  },
  {
    q: "Do I need to change my broadband provider?",
    a: "No. We test the line you have. If the report shows the line itself is the problem, you have the figures to take to your provider.",
  },
  {
    q: "What if the trial doesn't work in my house?",
    a: "We'll tell you, in the report, with the measurements. You keep them either way.",
  },
  {
    q: "Which areas do you cover?",
    a: "Dublin and the rest of Leinster, the same area as our smart security installations.",
  },
];

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Home Network Diagnosis", item: `${SITE}/services/wifi` },
  ],
};

const SERVICE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Home network assessment",
  serviceType: "Home network diagnosis",
  provider: { "@id": `${SITE}/#organization` },
  areaServed: { "@type": "AdministrativeArea", name: "Leinster, Ireland" },
  url: `${SITE}/services/wifi`,
  offers: { "@type": "Offer", price: String(ASSESSMENT_EURO), priceCurrency: "EUR" },
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function NetworkDiagnosisPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SERVICE_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />

      {/* The trial promise */}
      <section className="pt-32 lg:pt-36 pb-16 lg:pb-24 bg-gradient-to-b from-cream to-white relative overflow-clip">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 -right-40 w-80 h-80 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <nav className="flex items-center justify-center lg:justify-start gap-2 text-sm text-gray-500 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-brand-500 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-brand-500 transition-colors">Services</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">Home Network Diagnosis</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="text-center lg:text-left">
              <div className="fade-up inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">
                Home Network Diagnosis
              </div>
              <h1 className="fade-up-delay-1 text-[2rem] sm:text-5xl lg:text-[3.25rem] font-extrabold text-ink leading-[1.04] tracking-[-0.04em] mb-5 text-balance">
                Measured. Trialled. Then Fixed.
              </h1>
              <p className="fade-up-delay-2 text-ink-soft text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-4">
                We test your broadband at the router, measure every floor, and leave a working trial system on the worst
                floor for three days. Then you get a written report with the figures, before you spend anything on a fix.
              </p>
              <p className="fade-up-delay-2 text-ink font-semibold max-w-xl mx-auto lg:mx-0 mb-8">
                If it doesn&apos;t work in your house, we&apos;ll tell you.
              </p>
              <div className="fade-up-delay-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                <Link
                  href={`/services/wifi/${assessment.slug}`}
                  className="btn-sheen group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold text-sm px-7 py-3.5 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(242,130,34,0.55)] hover:-translate-y-0.5"
                >
                  <span className="relative z-10">Book an Assessment, €{ASSESSMENT_EURO}</span>
                  <ArrowRight className="relative z-10 w-4 h-4" />
                </Link>
                <Link
                  href="/wifi-check"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-100 text-ink font-semibold text-sm px-7 py-3.5 rounded-full border border-gray-200 transition-colors"
                >
                  Run the Free Wi-Fi Check First
                </Link>
              </div>
              <p className="mt-6 text-xs text-ink-muted">
                Credited in full against any work · Uses your existing wiring · Dublin and Leinster
              </p>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] bg-white border border-gray-100 shadow-premium-lg p-3 sm:p-6">
                <NetworkHouse />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The three symptoms */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">What We Diagnose</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-[-0.035em]">When the Connected Things Stop Working</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {SYMPTOMS.map((s, i) => {
              const Icon = SYMPTOM_ICONS[i] ?? Tv;
              return (
                <div key={s.title} className="rounded-3xl bg-cream border border-gray-100 p-6 sm:p-7">
                  <div className="w-11 h-11 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-1.5">{s.title}</h3>
                  <p className="text-sm text-ink-soft leading-relaxed">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What the assessment includes */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-white to-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10 items-start">
          <div className="lg:col-span-2 text-center lg:text-left">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">The Assessment</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-[-0.035em] mb-4">
              What €{ASSESSMENT_EURO} Includes
            </h2>
            <p className="text-ink-soft leading-relaxed mb-2">{priceNote(assessment)}</p>
            <p className="text-ink-soft leading-relaxed">Three days of evidence, not an hour of opinion.</p>
          </div>
          <ol className="lg:col-span-3 space-y-3">
            {assessment.features.map((f, i) => (
              <li key={f} className="flex items-start gap-4 rounded-2xl bg-white border border-gray-100 shadow-premium px-5 py-4">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1C1A18] text-white text-sm font-extrabold">
                  {i + 1}
                </span>
                <span className="text-[15px] text-ink leading-relaxed pt-1">{f}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">How It Works</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-[-0.035em]">Check, Assess, Fix, Monitor</h2>
          </div>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-3xl bg-cream border border-gray-100 p-6">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#1C1A18] text-white font-extrabold mb-4">
                  {s.n}
                </span>
                <h3 className="text-lg font-bold text-ink mb-1.5">{s.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The free check's traffic light */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-white to-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-3">The Free Wi-Fi Check</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-[-0.035em] mb-3">Green, Amber or Red</h2>
            <p className="text-ink-soft max-w-2xl mx-auto">
              Not sure you need an assessment? The free check tests your speed and grades the result like a traffic light.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {LIGHTS.map((l) => (
              <div key={l.light} className="rounded-3xl bg-white border border-gray-100 shadow-premium p-6 sm:p-7 flex items-start gap-5">
                <TrafficLight light={l.light} size="sm" />
                <div>
                  <h3 className="text-lg font-bold text-ink mb-1">{l.title}</h3>
                  <p className="text-sm text-ink-soft leading-relaxed mb-3">{l.means}</p>
                  <p className="text-sm text-ink leading-relaxed font-medium">{l.next}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/wifi-check"
              className="btn-sheen inline-flex items-center justify-center gap-2 bg-[#1C1A18] hover:bg-black text-white font-bold text-sm px-7 py-3.5 rounded-full transition-colors"
            >
              <span className="relative z-10">Run the Free Wi-Fi Check</span>
              <ArrowRight className="relative z-10 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* The three services */}
      <section id="services" className="py-20 lg:py-28 bg-gradient-to-b from-cream to-white relative overflow-clip scroll-mt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">Diagnose, Fix, Monitor</div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink mb-4 tracking-[-0.035em]">Three Stages, In That Order</h2>
            <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto">We measure before we promise, and quote only what we measured.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {WIFI_PACKAGES.map((pkg) => (
              <div
                key={pkg.slug}
                className={`card-lift group relative bg-white rounded-3xl p-7 sm:p-9 flex flex-col ${
                  pkg.popular
                    ? "shadow-[0_30px_70px_-20px_rgba(242,100,25,0.35)] border-2 border-brand-500 md:-mt-4 md:mb-4"
                    : "shadow-premium hover:shadow-premium-lg border border-gray-100/80"
                }`}
              >
                {pkg.popular && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-transparent rounded-2xl pointer-events-none" />
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-brand-500/30 tracking-wide uppercase whitespace-nowrap">
                      Start Here
                    </span>
                  </>
                )}
                <div className="relative flex flex-col flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-bold text-ink mb-2 tracking-[-0.02em] leading-snug min-h-[3.5rem]">{pkg.name}</h3>
                  <p className="text-sm text-ink-muted mb-4">{pkg.forWho}</p>
                  <div className={`font-extrabold tracking-[-0.03em] ${pkg.price.kind === "quote" ? "text-lg text-brand-600" : "text-3xl text-brand-500"}`}>
                    {priceLabel(pkg)}
                  </div>
                  <p className="text-xs text-ink-muted mt-1.5 mb-6">{priceNote(pkg)}</p>
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />
                  <ul className="space-y-3.5 mb-8 flex-1">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start justify-center sm:justify-start gap-3 text-[13.5px] text-ink-soft leading-relaxed">
                        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center">
                          <Check className="h-3 w-3 text-brand-500" strokeWidth={3} />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/services/wifi/${pkg.slug}`}
                    className={`btn-sheen group/btn flex items-center justify-center gap-2 text-center font-bold py-3.5 rounded-xl transition-all text-white ${
                      pkg.popular
                        ? "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 shadow-lg shadow-brand-500/30"
                        : "bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30"
                    }`}
                  >
                    <span className="relative z-10">{pkg.popular ? "Book an Assessment" : "Find Out More"}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The monitoring unit */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a1a] via-[#1f1a16] to-[#1a1a1a] p-6 sm:p-10 lg:p-14 shadow-premium-lg">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="max-w-2xl mb-8 sm:mb-10 text-center lg:text-left mx-auto lg:mx-0">
                <div className="inline-flex items-center gap-2 bg-green-500/15 text-green-400 text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  After the Fix, Optional
                </div>
                <h2 className="text-[1.75rem] leading-[1.1] sm:text-4xl font-extrabold text-white tracking-[-0.025em] mb-4">
                  A monitoring unit on your network
                </h2>
                <p className="text-white/70 text-[15px] sm:text-lg leading-relaxed">
                  It stays connected to your router and keeps a record of how your connection performs, day and night.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MONITOR_POINTS.map((m, i) => {
                  const Icon = MONITOR_ICONS[i] ?? Gauge;
                  return (
                    <div key={m.title} className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-500/20 text-brand-500 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white mb-0.5">{m.title}</div>
                        <div className="text-xs text-white/60 leading-relaxed">{m.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 text-center lg:text-left">
                <Link href="/services/wifi/network-monitoring" className="inline-flex items-center gap-1.5 text-brand-400 font-semibold text-sm hover:text-brand-300">
                  Network monitoring plans <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-[-0.03em] text-center mb-8">Questions</h2>
          <div className="divide-y divide-gray-100 rounded-3xl border border-gray-100 bg-white shadow-premium">
            {FAQ.map((f) => (
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
      </section>
    </>
  );
}
