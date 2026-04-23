import Link from "next/link";
import { ArrowRight, Clock, Home, ShieldCheck } from "lucide-react";

export default function FreeConsultationCTA() {
  return (
    <section className="py-12 lg:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1a1a] via-[#1f1a16] to-[#1a1a1a] p-8 sm:p-10 lg:p-14 shadow-premium-lg">
          {/* Ambient glow */}
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-5 gap-8 lg:gap-10 items-center">
            {/* Left: copy */}
            <div className="lg:col-span-3">
              <div className="inline-flex items-center gap-2 bg-green-500/15 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Complimentary · No Obligation
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-extrabold text-white leading-[1.08] tracking-[-0.025em] mb-4">
                Not sure what you need? <br className="hidden sm:block" />
                <span className="gradient-text-brand">Book a free on-site consultation.</span>
              </h2>
              <p className="text-white/70 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
                We&apos;ll come to your home, walk the property with you, identify the right
                setup, and send a written quote the same day. No pressure, no hard sell.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                <Link
                  href="/services/free-consultation"
                  className="btn-sheen group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold text-sm px-8 py-4 rounded-full transition-all shadow-[0_10px_30px_-5px_rgba(242,100,25,0.5)] hover:shadow-[0_20px_40px_-5px_rgba(242,100,25,0.6)] hover:-translate-y-0.5"
                >
                  <span className="relative z-10">Book Free Consultation</span>
                  <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
                </Link>
                <a
                  href="tel:+35315130424"
                  className="text-white/80 hover:text-white text-sm font-semibold transition-colors"
                >
                  or call 01 513 0424
                </a>
              </div>
            </div>

            {/* Right: trust points */}
            <div className="lg:col-span-2 space-y-4">
              {[
                {
                  icon: Home,
                  title: "On-site survey",
                  body: "We walk your home and flag blind spots, Wi-Fi dead zones and wiring constraints before quoting.",
                },
                {
                  icon: Clock,
                  title: "Typically 30 minutes",
                  body: "Quick, professional, and respectful of your time. Same-day written quote to your inbox.",
                },
                {
                  icon: ShieldCheck,
                  title: "Honest recommendations",
                  body: "5,000+ installs means we know what works. We only recommend what your home actually needs.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand-500/20 text-brand-500 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-0.5">{title}</div>
                    <div className="text-xs text-white/60 leading-relaxed">{body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
