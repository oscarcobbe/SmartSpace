import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";

/**
 * "Installer, not reseller" banner. Two-column on desktop:
 *   - Left: headline + short paragraph + single CTA
 *   - Right: a real customer quote pulled from Google reviews
 *
 * The quote replaces the previous glass-card secondary button. Glass
 * cards are an absolute-ban anti-pattern in the impeccable rules; a
 * verbatim review is more persuasive and grounds the brand voice.
 *
 * To swap the quote: edit QUOTE below. Keep it under 200 chars, keep
 * the postcode (D14, D6W, K67 etc.) for local credibility, and link
 * the card itself to /reviews so curious visitors can read more.
 */
const QUOTE = {
  body: "Nigel arrived early, finished the install in 45 minutes, then sat with my mam to teach her the app. €350 all in. He's the real deal.",
  name: "Aoife M.",
  postcode: "D14",
};

export default function PromoBanner() {
  return (
    <section className="relative bg-surface-dark py-16 lg:py-24 overflow-hidden grain">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
          {/* Left: headline + CTA — 3/5 columns on desktop */}
          <div className="lg:col-span-3 text-center lg:text-left">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-[1.05] tracking-[-0.035em]">
              We don&apos;t just sell Ring.<br />
              <span className="text-brand-400">We install it.</span>
            </h2>
            <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Dublin&apos;s top-rated Ring installer. We deliver and professionally set up your entire system. No box-shipping, no DIY.
            </p>
            <Link
              href="/services/free-consultation"
              className="btn-sheen focus-ring-light group inline-flex items-center justify-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-all shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)] hover:-translate-y-0.5"
            >
              <span className="relative z-10">Get a Quote</span>
              <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Right: customer quote card — 2/5 columns on desktop. The
              entire card is a link to /reviews so the secondary affordance
              still works without needing a separate ghost button. */}
          <Link
            href="/reviews"
            className="focus-ring-light lg:col-span-2 block rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/20 transition-colors p-6 sm:p-7"
          >
            <div className="flex items-center gap-1 mb-4" aria-label="Five star Google review">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-white/85 text-[15px] sm:text-base leading-relaxed mb-5">
              &ldquo;{QUOTE.body}&rdquo;
            </blockquote>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-semibold text-white">{QUOTE.name}</div>
                <div className="text-white/50 text-xs mt-0.5">{QUOTE.postcode} · Verified Google review</div>
              </div>
              <span className="text-xs font-semibold text-brand-400 inline-flex items-center gap-1">
                Read more
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
