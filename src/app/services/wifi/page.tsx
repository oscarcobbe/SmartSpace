import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Clock, Gauge, Home, Tv, X } from "lucide-react";
import NetworkHouse from "@/components/wifi/NetworkHouse";
import GuideLinks from "@/components/wifi/GuideLinks";
import { ASSESSMENT_EURO, EVIDENCE_EURO, packageBySlug } from "@/data/wifiPackages";

const SITE = "https://smart-space.ie";

/*
 * The network diagnosis hub, in Nigel's words: his trial page of October 2026
 * (try before you buy, who it's for, the usual way against ours, a clear
 * answer either way, how it works, monitoring, questions) on this page's own
 * design. Every section links quietly to the guide or package page that goes
 * deeper, so a visitor from an ad can read around without losing the thread.
 *
 * "Ireland's first", "before you spend a cent" and "usually one day" are
 * Nigel's and kept on Oscar's word (12 October). The sample report is his
 * report template with its example figures, served from
 * public/network-sample-report.html. The €199 broadband evidence service
 * was confirmed by Nigel on 12 October.
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
  description: `Try better Wi-Fi in your own home for 3 days before you buy it. A €${ASSESSMENT_EURO} home network assessment: your broadband and every floor measured, a working trial measured every hour, and a plain-English report. Credited in full against any work. Dublin and Leinster.`,
  alternates: { canonical: "/services/wifi" },
  openGraph: {
    title: "Ireland's First Try-Before-You-Buy Wi-Fi Assessment | Smart Space",
    description: `We measure every floor, leave a working system running for 3 days, and show you the numbers before you decide. €${ASSESSMENT_EURO}, credited in full against any work.`,
    url: `${SITE}/services/wifi`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Smart Space home network diagnosis" }],
  },
};

const assessment = packageBySlug("home-network-assessment")!;
const BOOK = `/services/wifi/${assessment.slug}`;

/* A quiet in-text link: brand colour and semibold, no underline until hover or
   focus, the way the guide links work (Oscar, 30 September and 12 October). */
const QUIET = "font-semibold text-brand-700 hover:text-brand-800 no-underline hover:underline focus-visible:underline underline-offset-4";
const QUIET_DARK = "font-semibold text-brand-400 hover:text-brand-300 no-underline hover:underline focus-visible:underline underline-offset-4";

/* Nigel's list from his trial page of October 2026, each line pointing to the
   guide that answers it. */
const PROBLEMS: { text: string; href: string; label: string }[] = [
  { text: "The TV buffers in the middle of the film", href: "/blog/too-many-devices-slow-wifi-ireland", label: "Why it happens" },
  { text: "Video calls freeze or drop when you're working from home", href: "/blog/working-from-home-wifi-ireland", label: "Working from home" },
  { text: "The Nest thermostat or other smart devices keep going offline", href: "/blog/smart-camera-wifi-drops-irish-homes", label: "Devices dropping off" },
  { text: "Games lag, stutter or disconnect at the worst moment", href: "/blog/why-does-my-wifi-keep-dropping-ireland", label: "Why Wi-Fi drops" },
  { text: "Upstairs or the back bedroom barely gets a signal", href: "/blog/why-wifi-slow-upstairs-irish-homes", label: "Slow upstairs" },
  { text: "It's always worse in the evening when everyone is online", href: "/blog/wifi-slow-in-the-evening-ireland", label: "Evening slowdowns" },
];

/* The cascade from the sample report (public/network-sample-report.html). */
const SAMPLE_REPORT = "/network-sample-report.html";
const CASCADE = [
  { label: "What you pay for", value: 500 },
  { label: "Arriving at the router", value: 486 },
  { label: "Best room, hall", value: 310 },
  { label: "First floor landing", value: 96 },
  { label: "Back bedroom, second floor", value: 14 },
];

const TRIAL_POINTS = [
  {
    icon: Home,
    title: "A trial on your worst floor",
    body: "We set up a working system where your Wi-Fi is weakest, running beside your own network. Nothing of yours is switched off.",
  },
  {
    icon: Clock,
    title: "Measured every hour for 3 days",
    body: "Speed and steadiness are recorded day and night, including the evenings when everyone is online and problems show up.",
  },
  {
    icon: Tv,
    title: "Your problem devices, watched",
    body: "We move up to 3 of the devices that give you the most trouble, like a smart TV or a Nest thermostat, onto the trial and track them for all 3 days. The report shows if they ever dropped off, and when.",
  },
  {
    icon: Gauge,
    title: "You live with it, then decide",
    body: "Stream, work and game as normal. At the end you see the results and choose, with no pressure to buy.",
  },
];

const USUAL_WAY = [
  "Pick a kit from the speed on the box",
  "Find out at home whether it works",
  "Return it, or live with dead spots",
  "Never know if the broadband was the real problem",
];

const STEPS = [
  { title: "Book", body: "Leave your details and we ring you to pick a time." },
  { title: "First visit, about 2 hours", body: "We test your broadband and every floor, set up the trial and move up to 3 problem devices onto it." },
  { title: "3 days of real life", body: "The trial records speed every hour and watches your devices while you carry on as normal." },
  { title: "30-minute call", body: "We go through your report together." },
  { title: "Second visit", body: "We collect the trial kit, or install your new system." },
];

const FAQ: { q: string; a: string; more?: { href: string; label: string } }[] = [
  {
    q: "Why not just buy a mesh system?",
    a: "Mesh works well when the units can reach each other. Thick walls, extensions and older houses often stop that. We test first so you only buy what will work in your home.",
    more: { href: "/blog/wifi-extender-mesh-or-powerline-ireland", label: "Extender, mesh or powerline?" },
  },
  {
    q: "Is it my broadband or my Wi-Fi?",
    a: "That's the first thing we find out, with a wired test at your router. If the broadband is the problem, we tell you, and you don't buy kit you don't need.",
    more: { href: "/blog/broadband-speed-test-ireland-line-or-wifi", label: "How to tell the line from the Wi-Fi" },
  },
  {
    q: "Why is my Wi-Fi worse in the evening?",
    a: "Evenings are when everyone in the house, and often the whole area, is online. The 3-day trial records those hours specifically, so the report shows your evening speed against the rest of the day.",
    more: { href: "/blog/wifi-slow-in-the-evening-ireland", label: "Evening slowdowns explained" },
  },
  {
    q: "My TV or thermostat keeps dropping off. Will this help?",
    a: "During the trial we move up to 3 of your problem devices onto the trial network and watch them for the full 3 days. If they stay connected, you know the fix works for them before you buy.",
    more: { href: "/blog/smart-camera-wifi-drops-irish-homes", label: "Why devices drop off" },
  },
  {
    q: "What is powerline?",
    a: "Adapters that carry your broadband over the electrical wiring already in the house, to an access point on the floor that needs one. How fast it runs depends on the wiring, which is exactly why we measure yours before quoting.",
    more: { href: "/blog/powerline-adapters-ireland", label: "Powerline in Irish houses" },
  },
  {
    q: "Do I have to buy anything after the assessment?",
    a: `No. You get the report either way, and the €${ASSESSMENT_EURO} is credited in full if you go ahead with any work.`,
  },
  {
    q: "What if nothing can be fixed without cables?",
    a: "Then the report says so plainly and shows which floors and rooms need a cable, so you can invest with confidence.",
    more: { href: "/blog/running-ethernet-cable-existing-house-ireland", label: "Running Ethernet in an existing house" },
  },
  {
    q: "Do I need to change broadband provider?",
    a: "No. We test the line you have. If the report shows the line itself is the problem, you have the figures to take to your provider.",
    more: { href: "/services/wifi/broadband-evidence", label: "The €199 broadband evidence service" },
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

      {/* Try before you buy */}
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
                Ireland&apos;s First Try-Before-You-Buy Wi-Fi Assessment
              </div>
              <h1 className="fade-up-delay-1 text-[2rem] sm:text-5xl lg:text-[3rem] font-extrabold text-ink leading-[1.05] tracking-[-0.04em] mb-5 text-balance">
                Try Better Wi-Fi in Your Own Home for 3 Days Before You Spend a Cent on It.
              </h1>
              <p className="fade-up-delay-2 text-ink-soft text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-8">
                You&apos;ve asked why your Wi-Fi keeps buffering. An AI assistant can tell you what usually causes it, but it
                can&apos;t see your house. We measure every floor, leave a working system running for 3 days, and show you the
                numbers before you decide.
              </p>
              <div className="fade-up-delay-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
                <Link href={BOOK} className={PRIMARY}>
                  <span className="relative z-10">Book Your Assessment</span>
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
                €{ASSESSMENT_EURO} incl. VAT, credited in full against any work · No cables through walls
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

      {/* Where your speed goes */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className={EYEBROW}>Where Your Speed Goes</div>
            <h2 className={`${H2} mb-5`}>You Pay for 500 Mbps. The Back Bedroom Gets 14.</h2>
            <p className="text-ink-soft leading-relaxed max-w-xl mx-auto lg:mx-0 mb-4">
              This is from one of our sample reports. We measure every step between what you pay for and the room
              you&apos;re complaining about, so you see exactly where the speed is lost.
            </p>
            <p className="text-ink-soft leading-relaxed max-w-xl mx-auto lg:mx-0 mb-6">
              By the time it reaches the back bedroom, 97% of the speed paid for has been lost inside the house. Almost
              none of it is lost on the line itself: 486 of the 500 Mbps arrives at the router.
            </p>
            <a href={SAMPLE_REPORT} className={`inline-flex items-center gap-1.5 text-sm ${QUIET}`}>
              See a full sample report <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <figure className="rounded-3xl bg-cream border border-gray-100 p-6 sm:p-8">
            <figcaption className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-muted mb-5">
              Example from a sample report · download, Mbps
            </figcaption>
            <ul className="space-y-4">
              {CASCADE.map((c, i) => (
                <li key={c.label}>
                  <div className="flex items-baseline justify-between gap-4 text-sm mb-1.5">
                    <span className="text-ink-soft">{c.label}</span>
                    <span className={`font-extrabold ${i === CASCADE.length - 1 ? "text-red-600" : "text-ink"}`}>{c.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === CASCADE.length - 1 ? "bg-red-500" : i < 2 ? "bg-green-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.max(2, (c.value / CASCADE[0].value) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </figure>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <div className={EYEBROW}>Who It&apos;s For</div>
            <h2 className={H2}>If Any of This Sounds Like Your House, This Is for You.</h2>
          </div>
          <div className="grid lg:grid-cols-5 gap-5 sm:gap-6">
            <div className="lg:col-span-3 rounded-3xl bg-cream border border-gray-100 p-6 sm:p-8">
              <h3 className="text-lg font-bold text-ink mb-4">You&apos;re fed up with Wi-Fi that lets you down</h3>
              <ul className="space-y-3">
                {PROBLEMS.map((p) => (
                  <li key={p.text} className="flex items-start gap-3 text-[15px] text-ink-soft leading-relaxed">
                    <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-brand-500" strokeWidth={3} />
                    </span>
                    <span>
                      {p.text}.{" "}
                      <Link href={p.href} className={`text-sm ${QUIET}`}>
                        {p.label}
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:col-span-2 space-y-5 sm:space-y-6">
              <div className="rounded-3xl bg-cream border border-gray-100 p-6 sm:p-7">
                <h3 className="text-lg font-bold text-ink mb-1.5">You want every option tried before cables</h3>
                <p className="text-sm text-ink-soft leading-relaxed">
                  Chasing cables into walls is messy and costly. You&apos;d rather know for certain that nothing else will work
                  before you go there.
                </p>
              </div>
              <div className="rounded-3xl bg-[#1C1A18] p-6 sm:p-7">
                <h3 className="text-lg font-bold text-white mb-1.5">You want proof that cables are the answer</h3>
                <p className="text-sm text-white/75 leading-relaxed">
                  If running cables is the only real fix, you want measurements that say so, and a report showing which
                  floors and rooms need one.{" "}
                  <Link href="/blog/running-ethernet-cable-existing-house-ireland" className={QUIET_DARK}>
                    Running Ethernet in an existing house
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Try it before you buy it */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="text-center lg:text-left">
            <div className={EYEBROW}>1. Try It Before You Buy It</div>
            <h2 className={`${H2} mb-5`}>Most People Buy a Mesh Kit and Hope. We Do It the Other Way Round.</h2>
            <div className="space-y-4 text-ink-soft leading-relaxed max-w-xl mx-auto lg:mx-0">
              <p>
                The speed printed on a box in a shop was measured in a lab, not in your house. It tells you nothing about
                your thick walls, your old wiring, your extension or your busy evenings. So we bring the solution to your
                home first and let it prove itself there.
              </p>
              <p className="text-sm">
                Weighing up kit yourself?{" "}
                <Link href="/blog/mesh-wifi-explained" className={QUIET}>Mesh explained</Link>
                {" · "}
                <Link href="/blog/wifi-extender-mesh-or-powerline-ireland" className={QUIET}>Extender, mesh or powerline</Link>
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {TRIAL_POINTS.map((t) => (
              <div key={t.title} className="rounded-3xl bg-white border border-gray-100 shadow-premium p-6">
                <div className="w-11 h-11 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center mb-4">
                  <t.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-ink mb-1.5">{t.title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. The usual way, and ours */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <div className={EYEBROW}>2. No Guesswork, No Wasted Kit</div>
            <h2 className={H2}>We Start by Measuring Your Home</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
            <div className="rounded-3xl bg-cream border border-gray-100 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-ink mb-4">The Usual Way</h3>
              <ul className="space-y-3">
                {USUAL_WAY.map((u) => (
                  <li key={u} className="flex items-start gap-3 text-[15px] text-ink-soft leading-relaxed">
                    <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                      <X className="h-3 w-3 text-gray-500" strokeWidth={3} />
                    </span>
                    {u}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-white border-2 border-brand-500 shadow-[0_30px_70px_-20px_rgba(242,100,25,0.3)] p-6 sm:p-8">
              <h3 className="text-xl font-bold text-ink mb-4">The Smart Space Way</h3>
              <ul className="space-y-3 text-[15px] text-ink-soft leading-relaxed">
                {[
                  <>A wired test at your router, so we know what your broadband really delivers</>,
                  <>
                    Measurements{" "}
                    <Link href="/blog/how-to-test-wifi-speed-room-by-room" className={QUIET}>room by room</Link> and floor
                    by floor
                  </>,
                  <>A 3-day trial on the floor that needs it most</>,
                  <>
                    The latest G.hn{" "}
                    <Link href="/services/wifi/powerline-access-points" className={QUIET}>powerline</Link> and tri-band
                    Wi-Fi 6E technology
                  </>,
                  <>A plain-English report: what is slowing you down, what fixes it, and what it costs</>,
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-brand-500/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-brand-500" strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. A clear answer either way */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <div className={EYEBROW}>3. A Clear Answer Either Way</div>
            <h2 className={`${H2} text-balance`}>
              Either We Fix It Without Cables, or You Find Out for Certain That Cables Are the Only Solution.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
            <div className="rounded-3xl bg-white border border-gray-100 shadow-premium p-6 sm:p-8">
              <h3 className="text-xl font-bold text-ink mb-3">If Our No-Cables Solution Works</h3>
              <p className="text-sm sm:text-[15px] text-ink-soft leading-relaxed">
                We use the latest G.hn powerline technology to carry your connection through your home&apos;s existing
                electrical wiring, to a tri-band Wi-Fi 6E access point on each floor. No drilling, no trunking, no mess.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {["No chasing walls", "No floors lifted", "Usually one day"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5 rounded-full bg-cream border border-gray-100 px-3 py-1 text-xs font-semibold text-ink">
                    <Check className="h-3 w-3 text-brand-500" strokeWidth={3} />
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/services/wifi/powerline-access-points" className={`mt-5 inline-flex items-center gap-1.5 text-sm ${QUIET}`}>
                How the fix is quoted <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-3xl bg-white border border-gray-100 shadow-premium p-6 sm:p-8">
              <h3 className="text-xl font-bold text-ink mb-3">If It Won&apos;t Work in Your Home</h3>
              <p className="text-sm sm:text-[15px] text-ink-soft leading-relaxed">
                The measurements prove it, and the report shows which floors and rooms need a cabled connection. You can
                hand it to a cable specialist knowing there is no other option.
              </p>
              <Link
                href="/blog/running-ethernet-cable-existing-house-ireland"
                className={`mt-5 inline-flex items-center gap-1.5 text-sm ${QUIET}`}
              >
                What running cable involves <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How it works */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10 items-start">
          <div className="lg:col-span-2 text-center lg:text-left">
            <div className={EYEBROW}>4. How It Works</div>
            <h2 className={`${H2} mb-4`}>Two Visits, Three Days, One Clear Answer.</h2>
            <p className="text-ink-soft leading-relaxed mb-6">
              €{ASSESSMENT_EURO} incl. VAT, credited in full against any work. See{" "}
              <Link href={BOOK} className={QUIET}>everything the assessment includes</Link>.
            </p>
            <Link href={BOOK} className={PRIMARY}>
              <span className="relative z-10">Book Your Assessment</span>
              <ArrowRight className="relative z-10 w-4 h-4" />
            </Link>
          </div>
          <ol className="lg:col-span-3 space-y-3">
            {STEPS.map((st, i) => (
              <li key={st.title} className="flex items-start gap-4 rounded-2xl bg-white border border-gray-100 shadow-premium px-5 py-4">
                <span className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1C1A18] text-white text-sm font-extrabold">
                  {i + 1}
                </span>
                <span className="pt-1">
                  <span className="block text-[15px] font-bold text-ink">{st.title}</span>
                  <span className="block text-sm text-ink-soft leading-relaxed">{st.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 5. Monitoring, optional */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a1a] via-[#1f1a16] to-[#1a1a1a] p-6 sm:p-10 lg:p-14 shadow-premium-lg">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative grid lg:grid-cols-5 gap-8 items-center">
              <div className="lg:col-span-3 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-green-500/15 text-green-400 text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  5. After We Install It
                </div>
                <h2 className="text-[1.75rem] leading-[1.1] sm:text-4xl font-extrabold text-white tracking-[-0.025em] mb-4">
                  Ongoing Monitoring
                </h2>
                <p className="text-white/75 text-[15px] sm:text-lg leading-relaxed">
                  A small box keeps an eye on your network around the clock, so we often know about a problem before you
                  do. We are alerted when your broadband goes down and when it is back, you hear when something new joins
                  your network, and you get a plain-English report every month.
                </p>
              </div>
              <div className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 p-6 text-center lg:text-left">
                <div className="text-3xl font-extrabold text-white tracking-[-0.03em]">From €39 a month</div>
                <p className="mt-3 text-sm text-white/65 leading-relaxed">
                  Monitored, not managed. We see whether a device is online, not what it does. Your accounts stay in your
                  name.
                </p>
                <Link href="/services/wifi/network-monitoring" className={`mt-5 inline-flex items-center gap-1.5 text-sm ${QUIET_DARK}`}>
                  Network Monitoring Plans <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Broadband evidence, Nigel's other supporting service */}
      <section className="pb-12 lg:pb-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-cream border border-gray-100 p-6 sm:p-10 grid lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3 text-center lg:text-left">
              <div className={EYEBROW}>Broadband Evidence Service</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-[-0.03em] mb-3">
                Think Your Provider Is Letting You Down?
              </h2>
              <p className="text-ink-soft leading-relaxed">
                Get the evidence they need to take you seriously. We post you a small box that logs your line for 7 days,
                then write a one-page report showing every dropout, slowdown and evening speed against what you pay for.
                No assessment needed.
              </p>
            </div>
            <div className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-premium p-6 text-center lg:text-left">
              <div className="text-3xl font-extrabold text-ink tracking-[-0.03em]">€{EVIDENCE_EURO}</div>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">
                Including VAT. We go through the report in your home and collect the box. Dublin and Leinster.
              </p>
              <Link href="/services/wifi/broadband-evidence" className={`mt-4 inline-flex items-center gap-1.5 text-sm ${QUIET}`}>
                Hard numbers, not &ldquo;it feels slow&rdquo; <ArrowRight className="h-4 w-4" />
              </Link>
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
          <p className="mt-5 text-sm text-ink-soft">
            Not sure how to read a speed test?{" "}
            <Link href="/blog/broadband-speed-test-ireland-line-or-wifi" className={QUIET}>Is it the line or the Wi-Fi?</Link>
          </p>
        </div>
      </section>

      {/* 6. Questions */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className={EYEBROW}>6. Questions People Ask</div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-[-0.03em] text-center mb-3">Before You Book</h2>
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
                <p className="mt-3 text-sm text-ink-soft leading-relaxed">
                  {f.a}
                  {f.more && (
                    <>
                      {" "}
                      <Link href={f.more.href} className={QUIET}>{f.more.label}</Link>
                    </>
                  )}
                </p>
              </details>
            ))}
          </div>
          <GuideLinks className="mt-8 text-center" />
        </div>
      </section>

      {/* One last call */}
      <section className="pb-16 lg:pb-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-800 px-6 py-12 sm:px-12 sm:py-14 text-center shadow-premium-lg">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-[-0.03em] mb-3">
              You&apos;ve Done the Research. Now Get the Measurement.
            </h2>
            <p className="text-white/85 mb-8">
              €{ASSESSMENT_EURO} incl. VAT, credited in full against any work we do. Dublin and Leinster.
            </p>
            <Link
              href={BOOK}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-100 text-ink font-bold text-sm px-8 py-3.5 rounded-full transition-colors"
            >
              Book Your Assessment <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-4">
              <a href={SAMPLE_REPORT} className="text-sm font-semibold text-white/90 hover:text-white no-underline hover:underline underline-offset-4">
                See a sample report
              </a>
            </p>
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
