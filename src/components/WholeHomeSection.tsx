import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function WholeHomeSection() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-white to-cream relative overflow-hidden">
      <div className="absolute top-1/2 -translate-y-1/2 -left-40 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <div className="rounded-3xl overflow-hidden shadow-premium-lg order-2 lg:order-1">
            <video
              src="/products/Ring.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-auto"
            />
          </div>
          <div className="order-1 lg:order-2 text-center">
            <div className="inline-block text-brand-500 text-xs font-bold uppercase tracking-[0.25em] mb-4">
              Built to Grow with You
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink mb-5 leading-[1.08] tracking-[-0.035em]">
              Whole-home security,<br />
              <span className="text-ink-soft">one step at a time.</span>
            </h2>
            <p className="text-ink-soft text-base sm:text-lg mb-8 leading-relaxed max-w-md mx-auto">
              Start with a doorbell and expand to cameras, floodlights, and more. Every Ring device works together through the Ring app.
            </p>
            <Link
              href="/services"
              className="btn-sheen group inline-flex items-center gap-2 bg-[#1C1A18] hover:bg-black text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-all shadow-premium hover:shadow-premium-lg hover:-translate-y-0.5"
            >
              <span className="relative z-10">Browse All Services</span>
              <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
