import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function PromoBanner() {
  return (
    <section className="relative bg-[#1C1A18] py-20 lg:py-28 overflow-hidden grain">
      {/* Soft ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-brand-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.25em] mb-5">
          Installer, not Reseller
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-[1.05] tracking-[-0.035em]">
          We don&apos;t just sell Ring.<br />
          <span className="gradient-text-brand">We install it.</span>
        </h2>
        <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          As Dublin&apos;s top-rated Ring installer — serving all of Leinster — we deliver and professionally set up your entire system, not just ship you a box.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/services/free-consultation"
            className="btn-sheen group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-all shadow-[0_10px_30px_-5px_rgba(242,100,25,0.5)] hover:shadow-[0_20px_40px_-5px_rgba(242,100,25,0.6)] hover:-translate-y-0.5"
          >
            <span className="relative z-10">Get a Quote</span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
          </Link>
          <Link
            href="/reviews"
            className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/15 hover:border-white/25 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-all"
          >
            Reviews
          </Link>
        </div>
      </div>
    </section>
  );
}
