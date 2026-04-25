import Link from "next/link";
import {
  Home as HomeIcon,
  Cable,
  Smartphone,
  Bell,
  ShieldCheck,
  Camera,
  Star,
  Phone,
  ArrowRight,
  Award,
} from "lucide-react";
import RingBookingForm from "@/components/RingBookingForm";
import MobileBookCTA from "@/components/MobileBookCTA";

const PHONE_DISPLAY = "01 513 0424";
const PHONE_TEL = "+35315130424";

// Three real Google reviews lifted from /reviews. Swap for new ones any time.
const REVIEWS = [
  {
    text: "Fantastic service from start to finish. The lads arrived on time, installed the doorbell and two cameras in under two hours. Everything was set up on my phone before they left. Highly recommend!",
    author: "Sarah M.",
    initials: "SM",
    location: "Dublin",
  },
  {
    text: "Had the driveway bundle installed — doorbell and floodlight cam. Professional job, very tidy cabling, and they took the time to explain how everything works. Great value.",
    author: "James O'Brien",
    initials: "JO",
    location: "Leinster",
  },
  {
    text: "Couldn't be happier. We had a whole home setup done — doorbell, two floodlights. The team were friendly, professional, and left everything spotless. Already recommended to neighbours.",
    author: "Aoife D.",
    initials: "AD",
    location: "Dublin",
  },
];

const INCLUDED = [
  {
    icon: HomeIcon,
    title: "Professional mounting",
    body: "Drilled and fitted on any wall material — render, brick, timber, PVC. Cabling concealed where possible.",
  },
  {
    icon: Cable,
    title: "Hardwired or battery",
    body: "If you want hardwired, we connect to your existing chime wiring. Battery models? Same flat fee.",
  },
  {
    icon: Smartphone,
    title: "App setup & family training",
    body: "We pair the device, configure the app on your phone, add up to 4 family members, and demo every feature.",
  },
  {
    icon: Bell,
    title: "Motion zones & alerts",
    body: "We tune motion detection so you get alerts when a real person walks up, not when a leaf moves.",
  },
  {
    icon: ShieldCheck,
    title: "30-day support",
    body: "Issue with the app or notifications in the first month? We'll come back free of charge.",
  },
  {
    icon: Camera,
    title: "Insured & vetted",
    body: "All installers fully insured. Background-checked. Garda-vetted on request for sensitive installs.",
  },
];

const BRANDS = [
  { name: "Ring", tag: "All models · Wired & battery" },
  { name: "Eufy", tag: "Doorbell & floodlight cams" },
  { name: "Tapo", tag: "Doorbell & cameras" },
  { name: "Nest", tag: "Google Nest doorbells" },
  { name: "Arlo", tag: "Wired & wireless" },
];

const STEPS = [
  { num: "1", title: "Book online", body: "Pick a date, tell us which doorbell you have." },
  { num: "2", title: "We confirm by phone", body: "Quick call within an hour to confirm pricing & address." },
  { num: "3", title: "Installer arrives", body: "Drilled, mounted, app-paired in 60–90 minutes." },
  { num: "4", title: "Family trained", body: "We don't leave until you can use it confidently." },
];

const FAQ = [
  {
    q: "What's the €139 actually cover?",
    a: "Mounting your doorbell on any standard wall material, hardwiring into your existing chime if you want it wired, app setup on up to 4 family phones, motion-zone tuning, and a full demo before we leave. No surprise extras.",
    open: true,
  },
  {
    q: "When would it cost more than €139?",
    a: "Only if there's something unusual: no chime to wire into and you want hardwired (we run an external transformer), unusually difficult wall like granite or thick concrete, or you want multiple cameras at once. We tell you the exact price on the booking call before we book the slot.",
  },
  {
    q: "Do I need to buy the doorbell from you?",
    a: "No — install your own. We install whatever you bought, from Amazon, Currys, Harvey Norman, the brand directly, or even second-hand. The €139 covers the labour.",
  },
  {
    q: "How fast can you come?",
    a: "For Dublin and Leinster, usually next-working-day. Outside of Leinster, within 5 working days. Pick a date in the booking form and we'll confirm by phone within an hour.",
  },
  {
    q: "What if it doesn't work after you leave?",
    a: "First 30 days are covered — we come back free of charge for any setup or app issue. After 30 days, we offer a paid call-out (€60) if there's a setup change you'd like.",
  },
  {
    q: "Are you insured? Garda-vetted?",
    a: "Yes — fully insured, public liability cover. All installers Garda-vetted on request. Just mention it on the booking call.",
  },
  {
    q: "Do you install other things — cameras, alarms, smart locks?",
    a: "Yes. CCTV, floodlight cameras, smart locks, network access, video intercoms — we do all of it. Pick \u201cSomething else\u201d in the booking form and we'll quote on the call.",
  },
];

export default function RingInstallationPage() {
  return (
    <div className="bg-white">
      {/* Mobile-only sticky bottom CTA — appears after scrolling past the hero */}
      <MobileBookCTA />
      {/* ──────────── Sticky utility bar ──────────── */}
      <div className="sticky top-0 z-40 bg-slate-900 text-white text-xs sm:text-sm font-semibold">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <span className="inline-block bg-brand-500 px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-bold">
            From €139
          </span>
          <span className="hidden sm:inline">Same-day quote</span>
          <span className="hidden sm:inline text-white/40">·</span>
          <a
            href={`tel:${PHONE_TEL}`}
            className="inline-flex items-center gap-1.5 hover:text-brand-400 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>{PHONE_DISPLAY}</span>
          </a>
        </div>
      </div>

      {/* ──────────── Hero ──────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-10 sm:pb-14">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-700 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wide mb-5">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-500 text-white text-[10px]">
                  ✓
                </span>
                <span>5,000+ installs · 5★ Google reviews</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-4">
                Ring Doorbell Installation in Ireland —{" "}
                <span className="text-brand-500">From €139</span>
              </h1>

              <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-7 max-w-xl">
                Professional installation by certified Irish installers. Wired or battery, every
                Ring model. Book online in 90 seconds — pick a date that works.
              </p>

              {/* Trust row */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 mb-7 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 tracking-wider">★★★★★</span>
                  <span>5 Star on Google</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-brand-500 font-extrabold">5,000+</span>
                  <span>installs done</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-brand-500 font-extrabold">€139</span>
                  <span>flat-rate from</span>
                </div>
              </div>

              {/* CTA row */}
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <Link
                  href="#book"
                  className="btn-sheen pulse-glow group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold px-8 py-4 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(242,130,34,0.55)] hover:shadow-[0_20px_60px_-5px_rgba(242,130,34,0.7)] hover:-translate-y-0.5"
                >
                  Book Your Install
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900 font-bold px-7 py-4 rounded-full transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call Now
                </a>
              </div>

              {/* Hero meta */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs sm:text-sm text-gray-500 mb-5">
                <span className="inline-flex items-center gap-1.5 before:content-[''] before:w-1.5 before:h-1.5 before:bg-emerald-500 before:rounded-full">
                  Same-day quotes
                </span>
                <span className="inline-flex items-center gap-1.5 before:content-[''] before:w-1.5 before:h-1.5 before:bg-emerald-500 before:rounded-full">
                  Insured installers
                </span>
                <span className="inline-flex items-center gap-1.5 before:content-[''] before:w-1.5 before:h-1.5 before:bg-emerald-500 before:rounded-full">
                  Garda-vetted on request
                </span>
              </div>

              {/* Award badge — strong trust signal */}
              <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Three Ireland SME Winner 2025</span>
              </div>
            </div>

            {/* Right: booking form */}
            <div id="book">
              <RingBookingForm />
            </div>
          </div>
        </div>
      </section>

      {/* ──────────── Trust strip ──────────── */}
      <div className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {[
              { num: "5,000+", label: "Installs completed" },
              { num: "5★", label: "Google rating" },
              { num: "€139", label: "From price" },
              { num: "48h", label: "Average install time" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-extrabold text-brand-500 leading-none mb-1">
                  {s.num}
                </div>
                <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ──────────── What's included ──────────── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              What&apos;s included with every install
            </h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto">
              Flat-rate, no hidden costs. Your install is complete when the doorbell is mounted,
              online, and you&apos;ve been shown how to use it.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {INCLUDED.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-brand-500 hover:-translate-y-0.5 hover:shadow-md transition-all"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 text-brand-500 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-extrabold text-gray-900 mb-1.5">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────── Brands ──────────── */}
      <section className="py-14 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Brands we install
            </h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto">
              Same flat €139 install fee whether you bought from Amazon, Currys, Harvey Norman, or
              directly from the brand.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {BRANDS.map((b) => (
              <div
                key={b.name}
                className="bg-white border border-gray-200 rounded-xl p-5 text-center hover:border-brand-500 hover:-translate-y-0.5 transition-all"
              >
                <div className="font-extrabold text-gray-900 text-base sm:text-lg mb-1">
                  {b.name}
                </div>
                <div className="text-[11px] sm:text-xs text-gray-500">{b.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── How it works ──────────── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              How it works
            </h2>
            <p className="text-sm sm:text-base text-gray-500">
              From booking to &ldquo;all done&rdquo; in under 48 hours, most weeks.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500 text-white font-extrabold text-lg shadow-lg shadow-brand-500/30 mb-4">
                  {s.num}
                </div>
                <h4 className="font-extrabold text-gray-900 mb-1.5">{s.title}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── Reviews ──────────── */}
      <section className="py-14 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              What customers say
            </h2>
            <p className="text-sm sm:text-base text-gray-500">
              5★ on Google. Real reviews from across Dublin and Leinster.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {REVIEWS.map((r) => (
              <div
                key={r.author}
                className="bg-white border border-gray-200 rounded-2xl p-6"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-5">&ldquo;{r.text}&rdquo;</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                    {r.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{r.author}</div>
                    <div className="text-[11px] text-gray-500">{r.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── FAQ ──────────── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">
              Common questions
            </h2>
          </div>

          <div className="flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                open={item.open}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4 text-sm sm:text-base font-bold text-gray-900">
                  <span>{item.q}</span>
                  <span className="text-brand-500 text-xl font-light transition-transform group-open:rotate-45 leading-none">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── Final CTA ──────────── */}
      <section className="relative bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16 sm:py-20 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-24 h-72 bg-gradient-radial from-brand-500/30 to-transparent blur-3xl pointer-events-none"
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-3">
            Pick a date. Call you back in an hour.
          </h2>
          <p className="text-sm sm:text-base text-white/70 mb-7 max-w-xl mx-auto">
            Most installs are booked, confirmed, and finished within 48 hours of the first click.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="#book"
              className="btn-sheen pulse-glow group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold px-8 py-4 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(242,130,34,0.65)] hover:shadow-[0_20px_60px_-5px_rgba(242,130,34,0.8)] hover:-translate-y-0.5"
            >
              Book Your Install
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold px-7 py-4 rounded-full transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
