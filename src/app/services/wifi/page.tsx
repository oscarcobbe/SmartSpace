import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Gauge, Tv, WifiOff, DoorOpen } from "lucide-react";
import NetworkHouse from "@/components/wifi/NetworkHouse";
import { SYMPTOMS, ASSESSMENT_EURO, packageBySlug } from "@/data/wifiPackages";

const SITE = "https://smart-space.ie";

/*
 * The network diagnosis hub, in Nigel's words (his mockup of 29 September
 * 2026) on the page's own design: the trial leads, then how it compares with
 * a survey, the symptoms, what the assessment includes, the fix, monitoring,
 * the free check, questions, and one last call to book.
 *
 * Held to the briefing and Oscar's copy rules: never "Wi-Fi installation",
 * powerline said plainly, "monitored" rather than "managed". Three lines of
 * the mockup are not here, because nothing supports them: "First in Ireland",
 * "the only ones in Ireland doing it this way", and "€395 instead of
 * thousands". "It usually isn't the device" became "the network is the first
 * thing to check". The mockup's customer quote waits for a real one.
 */

export const metadata: Metadata = {
  title: "Home Network Diagnosis | Wi-Fi Survey Dublin & Leinster | Smart Space",
  description: `Trial the fix in your own house, then decide whether to buy it. A €${ASSESSMENT_EURO} home network assessment: your broadband and every floor measured, a working trial for three days, and a written report. Credited in full against the work. Dublin and Leinster.`,
  alternates: { canonical: "/services/wifi" },
  openGraph: {
    title: "Trial the Fix in Your Own House | Smart Space",
    description: `A real system installed in the room that struggles, left for three days, with the measurements handed to you first. €${ASSESSMENT_EURO}, credited in full against the work.`,
    url: `${SITE}/services/wifi`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Smart Space home network diagnosis" }],
  },
};

const SYMPTOM_ICONS = [Tv, WifiOff, DoorOpen];

const assessment = packageBySlug("home-network-assessment")!;
const BOOK = `/services/wifi/${assessment.slug}`;

const OUTCOMES = [
  { title: "If It Worked", body: "You know exactly what you would be buying, because you have already lived with it." },
  { title: "If It Didn't", body: `We say so in the report, with the measurements. You spent €${ASSESSMENT_EURO} rather than paying for the wrong fix.` },
  { title: "Either Way", body: "The figures are yours to keep, including if you take them to your broadband provider." },
];

const FAQ = [
  {
    q: `Why pay €${ASSESSMENT_EURO} when a survey elsewhere is free?`,
    a: "A free survey gives you an experienced opinion and a quote, which is a perfectly reasonable way to buy. This is different in kind: a wired test of your broadband, measurements on every floor, and a working trial in your house for three days, with a written report. It is credited in full against any work.",
  },
  {
    q: "What is powerline?",
    a: "Adapters that carry your broadband over the electrical wiring already in the house, to an access point on the floor that needs one. How fast it runs depends on the wiring, which is exactly why we measure yours before quoting.",
  },
  {
    q: "What if the trial doesn't work in my house?",
    a: `We tell you, in the report, with the measurements. You keep them either way, and you have spent €${ASSESSMENT_EURO} rather than committing to a system that was never going to fix it.`,
  },
  {
    q: "Do I need to change broadband provider?",
    a: "No. We test the line you have. If the report shows the line itself is the problem, you have the figures to take to your provider.",
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

const EYEBROW = "inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-3";
const H2 = "text-3xl sm:text-4xl font-extrabold text-ink tracking-[-0.035em]";
const PRIMARY =
  "btn-sheen group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold text-sm px-7 py-3.5 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(242,130,34,0.55)] hover:-translate-y-0.5";

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
                Home Network Diagnosis · Dublin &amp; Leinster
              </div>
              <h1 className="fade-up-delay-1 text-[2rem] sm:text-5xl lg:text-[3rem] font-extrabold text-ink leading-[1.05] tracking-[-0.04em] mb-5 text-balance">
                Trial the Fix in Your Own House. Then Decide Whether to Buy It.
              </h1>
              <p className="fade-up-delay-2 text-ink-soft text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-4">
                A survey usually ends in a quote, and you find out whether it worked after you have paid for it. We do it
                the other way round: a real system installed in the room that struggles, left for three days, with the
                measurements handed to you first.
              </p>
              <p className="fade-up-delay-2 text-ink font-semibold max-w-xl mx-auto lg:mx-0 mb-8">
                €{ASSESSMENT_EURO} to know, before you commit to anything larger.
              </p>
              <div className="fade-up-delay-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                <Link href={BOOK} className={PRIMARY}>
                  <span className="relative z-10">Book an Assessment, €{ASSESSMENT_EURO}</span>
                  <ArrowRight className="relative z-10 w-4 h-4" />
                </Link>
                <Link
                  href="/wifi-check"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-100 text-ink font-semibold text-sm px-7 py-3.5 rounded-full border border-gray-200 transition-colors"
                >
                  Or Run the Free Wi-Fi Check First
                </Link>
              </div>
              <p className="mt-6 text-xs text-ink-muted">
                Credited in full against any work · Uses your existing wiring · No cables through walls
              </p>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] bg-white border border-gray-100 shadow-premium-lg p-3 sm:p-6">
                <NetworkHouse />
              </div>
              <p className="mt-3 text-center text-xs text-ink-muted">
                Figures shown are an example, not a promise. Yours are measured in your house.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three days with it working */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className={EYEBROW}>The Trial</div>
            <h2 className={`${H2} mb-5`}>Three Days With It Working. Then You Decide.</h2>
            <div className="space-y-4 text-ink-soft leading-relaxed max-w-xl mx-auto lg:mx-0">
              <p>
                On the assessment visit we install a real system on the floor that struggles. Not a demonstration unit, not
                a leaflet. Access points fed over your existing electrical wiring, set up and working properly.
              </p>
              <p>
                Your current Wi-Fi stays switched on beside it. For three days you can move between the two and judge for
                yourself, in your own rooms, on your own devices, at the times of day it usually goes wrong.
              </p>
              <p className="text-ink font-semibold">Then we take it away.</p>
            </div>
          </div>
          <div className="space-y-4">
            {OUTCOMES.map((o, i) => (
              <div
                key={o.title}
                className={`rounded-3xl p-6 sm:p-7 ${i === 2 ? "bg-[#1C1A18] text-white" : "bg-cream border border-gray-100"}`}
              >
                <h3 className={`text-lg font-bold mb-1.5 ${i === 2 ? "text-white" : "text-ink"}`}>{o.title}</h3>
                <p className={`text-sm leading-relaxed ${i === 2 ? "text-white/75" : "text-ink-soft"}`}>{o.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Two ways to go about it */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <div className={EYEBROW}>Survey or Trial</div>
            <h2 className={H2}>Two Ways to Go About It</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
            <div className="rounded-3xl bg-white border border-gray-100 p-6 sm:p-8 flex flex-col">
              <h3 className="text-xl font-bold text-ink mb-3">Survey, Then Install</h3>
              <p className="text-sm sm:text-[15px] text-ink-soft leading-relaxed flex-1">
                The established approach, and plenty of good installers work this way. A survey visit, a recommendation,
                then equipment or cabling. It often works well. The catch is that you find out how well after the work is
                done and the money is spent.
              </p>
              <p className="mt-5 pt-4 border-t border-gray-100 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Decided before anything is measured over time
              </p>
            </div>
            <div className="rounded-3xl bg-white border-2 border-brand-500 shadow-[0_30px_70px_-20px_rgba(242,100,25,0.3)] p-6 sm:p-8 flex flex-col">
              <h3 className="text-xl font-bold text-ink mb-3">Measure, Trial, Then Decide</h3>
              <p className="text-sm sm:text-[15px] text-ink-soft leading-relaxed flex-1">
                We measure the line and every floor, install the actual fix in the worst room, and leave it running for
                three days while you use it. You get the figures in writing. Then you choose, knowing what you are buying
                and what it does in your house.
              </p>
              <p className="mt-5 pt-4 border-t border-brand-100 text-xs font-semibold uppercase tracking-wider text-brand-700">
                €{ASSESSMENT_EURO}, credited in full against the work
              </p>
            </div>
          </div>
          <p className="mt-8 text-center text-ink-soft leading-relaxed max-w-3xl mx-auto">
            Worst case, you spend €{ASSESSMENT_EURO} and learn that your house really does need cabling. You will have the
            measurements to hand to whoever does it, and you will not have paid for the wrong fix first.
          </p>
        </div>
      </section>

      {/* The three symptoms */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className={EYEBROW}>What We Diagnose</div>
            <h2 className={H2}>When the Connected Things Stop Working</h2>
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
            <div className={EYEBROW}>The Assessment</div>
            <h2 className={`${H2} mb-4`}>What €{ASSESSMENT_EURO} Includes</h2>
            <p className="text-ink font-semibold leading-relaxed mb-2">Three days of evidence, not an hour of opinion.</p>
            <p className="text-ink-soft leading-relaxed mb-2">Credited in full against any work you go ahead with.</p>
            <p className="text-ink-soft leading-relaxed mb-6">
              A free survey gives you a recommendation. This gives you measurements, and a system you have already lived
              with.
            </p>
            <Link href={BOOK} className={PRIMARY}>
              <span className="relative z-10">Book an Assessment</span>
              <ArrowRight className="relative z-10 w-4 h-4" />
            </Link>
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

      {/* Then the fix */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <div className={EYEBROW}>We Measure Before We Promise</div>
            <h2 className={H2}>Then the Fix, Quoted From Your Own Figures</h2>
          </div>
          <div className="rounded-3xl bg-cream border border-gray-100 p-6 sm:p-10 grid md:grid-cols-5 gap-8 items-center">
            <div className="md:col-span-3">
              <h3 className="text-2xl font-extrabold text-ink tracking-[-0.02em] mb-3">Powerline and Access Points</h3>
              <p className="text-ink-soft leading-relaxed">
                Your connection carried over the electrical wiring already in the house, to access points placed where the
                measurements say they should go. One network name throughout, tested floor by floor before we leave.
              </p>
              <Link
                href="/services/wifi/powerline-access-points"
                className="mt-6 inline-flex items-center gap-1.5 text-brand-700 font-semibold text-sm hover:text-brand-800"
              >
                See How the Fix Is Quoted <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="md:col-span-2 space-y-3">
              {["No chasing walls", "No floors lifted", "Usually one day"].map((t) => (
                <li key={t} className="flex items-center gap-3 rounded-2xl bg-white border border-gray-100 px-4 py-3 text-[15px] font-semibold text-ink">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-brand-500" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Monitoring, optional */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a1a] via-[#1f1a16] to-[#1a1a1a] p-6 sm:p-10 lg:p-14 shadow-premium-lg">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative grid lg:grid-cols-5 gap-8 items-center">
              <div className="lg:col-span-3 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-green-500/15 text-green-400 text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Optional, Afterwards
                </div>
                <h2 className="text-[1.75rem] leading-[1.1] sm:text-4xl font-extrabold text-white tracking-[-0.025em] mb-4">
                  We Ring You Before You Ring Us
                </h2>
                <p className="text-white/75 text-[15px] sm:text-lg leading-relaxed">
                  A small unit stays on your router. We are alerted when your broadband fails, and when a device you named
                  goes offline. A short plain-English report each month.
                </p>
              </div>
              <div className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-6 text-center lg:text-left">
                <div className="text-3xl font-extrabold text-white tracking-[-0.03em]">From €39 a month</div>
                <p className="mt-3 text-sm text-white/65 leading-relaxed">
                  Monitored, not managed. We see whether a device is online, not what it does. Your accounts stay in your
                  name.
                </p>
                <Link
                  href="/services/wifi/network-monitoring"
                  className="mt-5 inline-flex items-center gap-1.5 text-brand-400 font-semibold text-sm hover:text-brand-300"
                >
                  Network Monitoring Plans <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The free check */}
      <section className="py-16 lg:py-20 bg-gradient-to-b from-white to-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mx-auto mb-5 w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
            <Gauge className="w-6 h-6" />
          </div>
          <h2 className={`${H2} mb-4`}>Not Sure You Need an Assessment?</h2>
          <p className="text-ink-soft leading-relaxed mb-8">
            Run the free check beside your router and again in the room that struggles. It grades the result green, amber
            or red, and tells you whether it is worth going further.
          </p>
          <Link
            href="/wifi-check"
            className="btn-sheen inline-flex items-center justify-center gap-2 bg-[#1C1A18] hover:bg-black text-white font-bold text-sm px-7 py-3.5 rounded-full transition-colors"
          >
            <span className="relative z-10">Run the Free Wi-Fi Check</span>
            <ArrowRight className="relative z-10 w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Questions */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-[-0.03em] text-center mb-3">Questions</h2>
          <p className="text-center text-ink-soft mb-8">
            Dublin and the rest of Leinster, the same area as our security installations. Over 5,000 installs behind us.
          </p>
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

      {/* One last call */}
      <section className="pb-16 lg:pb-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 px-6 py-12 sm:px-12 sm:py-14 text-center shadow-premium-lg">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-[-0.03em] mb-3">
              Find Out What Is Actually Wrong.
            </h2>
            <p className="text-white/85 mb-8">
              €{ASSESSMENT_EURO} including VAT, credited in full against the fix. Dublin and Leinster.
            </p>
            <Link
              href={BOOK}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-100 text-ink font-bold text-sm px-8 py-3.5 rounded-full transition-colors"
            >
              Book an Assessment <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-6 text-sm text-white/85">
              <a href="tel:+35315130424" className="font-semibold hover:text-white">01 513 0424</a>
              {" · "}
              <a href="mailto:info@smart-space.ie" className="font-semibold hover:text-white">info@smart-space.ie</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
