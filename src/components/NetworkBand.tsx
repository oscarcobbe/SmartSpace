import Link from "next/link";
import { ArrowRight } from "lucide-react";
import NetworkHouse from "@/components/wifi/NetworkHouse";
import { ASSESSMENT_EURO } from "@/data/wifiPackages";

/**
 * The home page's way into the network service: its own section, not a card
 * among the Ring packages, because it is a separate Smart Space line and the
 * Ring copy about checking Wi-Fi during an install is about something else.
 *
 * Shown only once NEXT_PUBLIC_NETWORK_PAGES_LIVE is on, like every other
 * public link to these pages (scripts/check-signoff.mjs fails the build if one
 * links early).
 */
export default function NetworkBand() {
  const live = process.env.NEXT_PUBLIC_NETWORK_PAGES_LIVE === "1";
  if (!live) return null;
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-cream relative overflow-clip">
      <div className="absolute top-10 -right-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.2em] mb-4">
              Home Network Diagnosis
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink leading-[1.05] tracking-[-0.035em] mb-5 text-balance">
              Measured. Trialled. Then Fixed.
            </h2>
            <p className="text-ink-soft text-base sm:text-lg max-w-xl mx-auto lg:mx-0 mb-4">
              Broadband fine downstairs but slow upstairs? The TV buffering in the evening, or a camera dropping
              offline? We test your broadband at the router, measure every floor, and leave a working trial system in
              place for three days. Then you get a written report with the figures, before you spend anything on a fix.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mt-7">
              <Link
                href="/wifi-check"
                className="btn-sheen group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-bold text-sm px-7 py-3.5 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(242,130,34,0.55)] hover:-translate-y-0.5"
              >
                <span className="relative z-10">Run the Free Wi-Fi Check</span>
                <ArrowRight className="relative z-10 w-4 h-4" />
              </Link>
              <Link
                href="/services/wifi"
                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-cream-100 text-ink font-semibold text-sm px-7 py-3.5 rounded-full border border-gray-200 transition-colors"
              >
                How It Works
              </Link>
            </div>
            <p className="mt-6 text-xs text-ink-muted">
              €{ASSESSMENT_EURO} assessment, credited in full against any work · Uses your existing wiring · Dublin and Leinster
            </p>
          </div>
          <div className="rounded-[2rem] bg-white border border-gray-100 shadow-premium-lg p-3 sm:p-6">
            <NetworkHouse />
          </div>
        </div>
      </div>
    </section>
  );
}
