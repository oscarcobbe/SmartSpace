import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function WholeHomeSection() {
  return (
    <section className="py-16 lg:py-28 bg-gradient-to-b from-white to-surface-1 relative overflow-hidden">
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
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-1 mb-5 leading-[1.08] tracking-[-0.035em]">
              Whole-home security,<br />
              <span className="text-ink-3">one step at a time.</span>
            </h2>
            <p className="text-ink-3 text-base sm:text-lg mb-8 leading-relaxed max-w-md mx-auto">
              Start with a doorbell and expand to cameras, floodlights, and more. Every Ring device works together through the Ring app.
            </p>
            <Link
              href="/services"
              className="btn-sheen focus-ring group inline-flex items-center gap-2 bg-ink-1 hover:bg-black text-white font-semibold text-sm px-8 py-3.5 rounded-full transition-all shadow-premium hover:shadow-premium-lg hover:-translate-y-0.5"
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
