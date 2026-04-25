import Link from "next/link";
import {
  Wrench,
  Cable,
  Smartphone,
  Bell,
  Star,
  Shield,
  Award,
  CheckCircle2,
} from "lucide-react";
import RingBookingForm from "@/components/RingBookingForm";
import FeaturedProducts from "@/components/FeaturedProducts";

const PHONE_DISPLAY = "01 513 0424";
const PHONE_TEL = "+35315130424";

// Three real Google reviews lifted from /reviews
const REVIEWS = [
  {
    text: "Fantastic service from start to finish. The lads arrived on time, installed the doorbell and two cameras in under two hours. Everything was set up on my phone before they left. Highly recommend!",
    author: "Sarah M.",
    date: "2 weeks ago",
  },
  {
    text: "Had the driveway bundle installed — doorbell and floodlight cam. Professional job, very tidy cabling, and they took the time to explain how everything works. Great value.",
    author: "James O'Brien",
    date: "1 month ago",
  },
  {
    text: "Couldn't be happier. We had a whole home setup done — doorbell, two floodlights. The team were friendly, professional, and left everything spotless. Already recommended to neighbours.",
    author: "Aoife D.",
    date: "2 months ago",
  },
];

const INCLUDED = [
  {
    icon: Wrench,
    title: "Professional Mounting",
    body: "Drilled and fitted on any wall material — render, brick, timber, PVC. Cabling concealed where possible.",
  },
  {
    icon: Cable,
    title: "Hardwired or Battery",
    body: "If you want hardwired, we connect to your existing chime wiring. Battery models? Same flat fee.",
  },
  {
    icon: Smartphone,
    title: "App Setup & Training",
    body: "We pair the device, configure the app on your phone, add up to 4 family members, and demo every feature.",
  },
  {
    icon: Bell,
    title: "Motion Zones & Alerts",
    body: "We tune motion detection so you get alerts when a real person walks up, not when a leaf moves.",
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
  { num: "1", title: "Book Online", body: "Pick a date, tell us which doorbell you have." },
  { num: "2", title: "We Confirm by Phone", body: "Quick call within an hour to confirm pricing & address." },
  { num: "3", title: "Installer Arrives", body: "Drilled, mounted, app-paired in 60–90 minutes." },
  { num: "4", title: "Family Trained", body: "We don't leave until you can use it confidently." },
];

const FAQ = [
  {
    q: "What's the €139 actually cover?",
    a: "Mounting your doorbell on any standard wall material, hardwiring into your existing chime if you want it wired, app setup on up to 4 family phones, motion-zone tuning, and a full demo before we leave. No surprise extras.",
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
    q: "Do you install other things — cameras, alarms, smart locks?",
    a: "Yes. CCTV, floodlight cameras, smart locks, network access, video intercoms — we do all of it. Pick \u201cSomething else\u201d in the booking form and we'll quote on the call.",
  },
];

export default function RingInstallationPage() {
  return (
    <div className="pt-32 lg:pt-36">
      {/* ──────────── Hero / header ──────────── */}
      <section className="py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            Dublin&apos;s #1 Ring Installer
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 leading-[1.08] tracking-tight">
            Ring Doorbell Installation in Ireland —{" "}
            <span className="text-brand-500">From €139</span>
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Professional installation by certified Irish installers. Wired or battery, every Ring
            model. Book online in 90 seconds — pick a date that works.
          </p>
        </div>
      </section>

      {/* ──────────── Booking ──────────── */}
      <section id="book" className="pb-12 lg:pb-20 scroll-mt-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <RingBookingForm />
        </div>
      </section>

      {/* ──────────── What's Included ──────────── */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              What&apos;s Included
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Flat-rate, no hidden costs. Your install is complete when the doorbell is mounted,
              online, and you&apos;ve been shown how to use it.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {INCLUDED.map((item) => (
              <div key={item.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-brand-500 rounded-2xl mb-5 shadow-sm">
                  <item.icon className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── Brands We Install ──────────── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Brands We Install
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Same flat €139 install fee whatever brand you bought.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {BRANDS.map((b) => (
              <div
                key={b.name}
                className="bg-white border border-gray-200 rounded-xl p-5 text-center hover:border-brand-500 transition-colors"
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

      {/* ──────────── How It Works ──────────── */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-gray-500 text-lg">
              From booking to &ldquo;all done&rdquo; in under 48 hours, most weeks.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-500 text-white font-extrabold text-lg shadow-lg shadow-brand-500/30 mb-4">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── Reviews ──────────── */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              What Customers Say
            </h2>
            <p className="text-gray-500 text-lg">5 Star on Google · Real reviews from Dublin and Leinster.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {REVIEWS.map((r) => (
              <div
                key={r.author}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5">&ldquo;{r.text}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{r.author}</span>
                  <span className="text-xs text-gray-400">{r.date}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-500 hover:text-brand-600"
            >
              See all reviews →
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────── Featured Products / Bundles ──────────── */}
      <FeaturedProducts />

      {/* ──────────── FAQ ──────────── */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Common Questions
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {FAQ.map((item, i) => (
              <details
                key={item.q}
                open={i === 0}
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

      {/* ──────────── Trust strip ──────────── */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, text: "Dublin's #1 Ring Installer" },
              { icon: Star, text: "5 Star Google Rating" },
              { icon: Wrench, text: "5,000+ Installations" },
              { icon: Award, text: "SME Winner 2025" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center text-center gap-2">
                <Icon className="h-6 w-6 text-brand-500" />
                <span className="text-xs font-semibold text-gray-600">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────── Bottom CTA — link out to other site sections ──────────── */}
      <section className="py-16 lg:py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
            Looking for something else?
          </h2>
          <p className="text-gray-500 mb-7 max-w-xl mx-auto">
            Browse our full range of installation packages, security camera bundles, and free home
            consultations.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-brand-500 text-gray-900 font-semibold text-sm px-6 py-3 rounded-full transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-brand-500" />
              All Services
            </Link>
            <Link
              href="/services/bundles"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-brand-500 text-gray-900 font-semibold text-sm px-6 py-3 rounded-full transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-brand-500" />
              View Bundles
            </Link>
            <Link
              href="/services/free-consultation"
              className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-brand-500 text-gray-900 font-semibold text-sm px-6 py-3 rounded-full transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-brand-500" />
              Free Consultation
            </Link>
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full transition-colors"
            >
              Call {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
