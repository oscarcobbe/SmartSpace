"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield, Wifi, Camera, Home, ClipboardCheck, ChevronDown, ChevronUp,
  Star, ArrowRight, Phone, Mail, MapPin, Download,
} from "lucide-react";

const FAQS = [
  {
    q: "Do you install alarms?",
    a: "No — we install Ring doorbells, cameras, smart lighting and smart locks. If you specifically need a monitored alarm system, we'll point you to a trusted partner.",
  },
  {
    q: "How long does a typical install take?",
    a: "Most installations take anywhere from 30 minutes to 3 hours, depending on the size of the job and how many devices are being fitted.",
  },
  {
    q: "Is there a monthly subscription?",
    a: "The hardware install is a one-off cost. Ring's optional cloud recording (Ring Protect) is a separate subscription paid directly to Ring — we'll walk you through your options during the consultation.",
  },
  {
    q: "Can you work with cameras I already bought?",
    a: "Usually yes, if they're within the Ring range. We'll let you know at the consultation whether we'd recommend keeping them or replacing.",
  },
  {
    q: "Will having this affect my home insurance?",
    a: "Several Irish insurers offer premium reductions for properly installed home security. We'd recommend checking with your provider — happy to supply an install specification if they ask.",
  },
  {
    q: "What if something stops working after you leave?",
    a: "We include support with every package. If any camera, doorbell or device goes offline in the covered period, we come back.",
  },
];

const INCLUDES = [
  {
    icon: ClipboardCheck,
    title: "A proper on-site consultation",
    body: "Our installer walks the property with you. Identifies blind spots, Wi-Fi dead zones, doorbell-placement constraints, and lighting gaps. You get an honest written quote, not a hard sell.",
  },
  {
    icon: Home,
    title: "A full, clean install",
    body: "Drilling, cabling where needed, power, mounting, weatherproofing, pairing, configuration, motion zones set up, notifications tuned, and a live walk-through of every camera on your phone before we leave.",
  },
  {
    icon: Wifi,
    title: "Your network, actually working",
    body: "Cameras are only as good as the Wi-Fi behind them. We check coverage, add extenders if needed, and make sure every device stays online.",
  },
  {
    icon: Camera,
    title: "Handover you'll actually understand",
    body: "We set up your Ring app, show you how to use it, and leave you with a simple one-pager. If anything stops working, we come back.",
  },
];

const PAIN_POINTS = [
  "You're wondering if you locked the back door while queueing for a flight.",
  "A delivery vanished off the porch and you've nothing on camera.",
  "You bought two cameras from Amazon two years ago and they're still in the box.",
  "The Wi-Fi doesn't reach the back garden — where it'd actually matter.",
  "You've just moved in, or you're about to, and you want to get it right this time.",
];

const HOW_IT_WORKS = [
  { n: 1, title: "Book a complimentary consultation online or on the phone." },
  { n: 2, title: "We visit for a complimentary consultation, walk the house with you, and send a written quote the same day." },
  { n: 3, title: "You approve. We book the install — usually within a week." },
  { n: 4, title: "We install, configure and hand over — typically in 30 minutes to 3 hours." },
  { n: 5, title: "You get a follow-up call at 30 days to make sure everything's perfect." },
];

export default function SurveyLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-white">
      {/* ── HERO ── */}
      <section className="relative pt-32 lg:pt-40 pb-16 lg:pb-24 bg-gradient-to-b from-brand-50/40 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
              <Shield className="w-3.5 h-3.5" />
              Ring Home Security Installers — Ireland
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a1a1a] leading-[1.05] mb-5">
              See your front door from anywhere.
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
              Properly installed Ring doorbells, cameras and smart lighting for Irish homeowners. Consultation, install and handover — most jobs take 30 minutes to 3 hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <Link
                href="/services/free-consultation"
                className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-base px-8 py-4 rounded-full transition-all shadow-lg shadow-brand-500/30"
              >
                Book Complimentary Consultation
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              No obligation &nbsp;•&nbsp; 30-minute visit &nbsp;•&nbsp; Honest quote, same day
            </p>
          </div>

          {/* Trust strip */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { label: "5,000+ installations" },
              { label: "5.0 Google rating" },
              { label: "SME Winner 2025" },
              { label: "Dublin, Wicklow, Kildare" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 text-center">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY HOMEOWNERS CALL US ── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] mb-4">
              Why homeowners call us
            </h2>
            <p className="text-gray-500 text-lg">
              Most Irish homes don&apos;t have a security problem.
              <br />
              They have a peace-of-mind problem.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {PAIN_POINTS.map((pain, i) => (
              <div key={i} className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {i + 1}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed pt-1">{pain}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-10 text-xl font-bold text-[#1a1a1a]">That&apos;s what we fix.</p>
        </div>
      </section>

      {/* ── WHAT SMART-SPACE DOES ── */}
      <section className="py-16 lg:py-20 bg-[#1a1a1a] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-6">
            What Smart-Space does
          </h2>
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed mb-6">
            We install the full Ring range for Irish homes: video doorbells, indoor and outdoor cameras, smart lighting, smart locks, and the network reliability that makes them all actually work.
          </p>
          <p className="text-base text-white/60 leading-relaxed">
            We don&apos;t install alarm systems. We don&apos;t sell what you don&apos;t need. We do one thing properly — a clean, planned, working Ring setup that lives entirely in one app on your phone.
          </p>
        </div>
      </section>

      {/* ── WHAT AN INSTALL INCLUDES ── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] mb-4">
              What a Smart-Space install includes
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {INCLUDES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-11 h-11 bg-brand-50 text-brand-500 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FREE CHECKLIST LEAD MAGNET ── */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-[1fr,auto] items-center gap-8">
            <div>
              <div className="inline-block bg-white/15 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
                Free Guide
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
                The Irish Homeowner&apos;s Home Security Checklist
              </h2>
              <p className="text-white/90 leading-relaxed mb-6 max-w-xl">
                10 things our installers walk through on every consultation. Use it to sanity-check your own home in about 20 minutes — no sign-up needed.
              </p>
              <a
                href="/downloads/home-security-checklist.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-brand-600 hover:bg-gray-100 font-bold text-sm px-6 py-3.5 rounded-full transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Free Checklist (PDF)
              </a>
            </div>
            <div className="hidden md:flex items-center justify-center">
              <div className="w-40 h-52 bg-white/10 border-2 border-dashed border-white/30 rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-16 h-16 text-white/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] text-center mb-12">
            How it works
          </h2>
          <div className="space-y-4">
            {HOW_IT_WORKS.map(({ n, title }) => (
              <div key={n} className="flex items-center gap-5 bg-white rounded-2xl p-5 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-brand-500 text-white flex items-center justify-center flex-shrink-0 font-extrabold text-lg">
                  {n}
                </div>
                <p className="text-gray-800 font-medium">{title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQS ── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1a1a] text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between text-left p-5 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-[#1a1a1a] pr-4">{f.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-4">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Stop wondering.</h2>
          <p className="text-white/70 text-lg mb-8">
            Book a complimentary consultation. Pick a time that works for you — we&apos;ll take it from there.
          </p>
          <Link
            href="/services/free-consultation"
            className="inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-base px-8 py-4 rounded-full transition-all shadow-lg shadow-brand-500/30"
          >
            Book My Complimentary Consultation
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-white/50 mt-4">
            No obligation &nbsp;•&nbsp; No hard sell &nbsp;•&nbsp; Honest quote, same day
          </p>
        </div>
      </section>

      {/* ── FOOTER CONTACT ── */}
      <section className="py-10 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
            <Link href="/" className="flex items-center gap-2 hover:text-brand-500 transition-colors">
              <Home className="w-4 h-4" />
              smart-space.ie
            </Link>
            <a href="tel:+35315130424" className="flex items-center gap-2 hover:text-brand-500 transition-colors">
              <Phone className="w-4 h-4" />
              01 513 0424
            </a>
            <a href="mailto:info@smart-space.ie" className="flex items-center gap-2 hover:text-brand-500 transition-colors">
              <Mail className="w-4 h-4" />
              info@smart-space.ie
            </a>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Dublin, Wicklow, Kildare &amp; nationwide
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
