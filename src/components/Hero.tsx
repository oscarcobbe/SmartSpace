import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="w-full bg-surface-2 h-[70vh] sm:h-screen relative overflow-hidden">
      {/* Full-bleed desktop hero image. next/image handles sizing,
          AVIF/WebP conversion, and responsive srcset; `priority` flags
          this as the LCP element so Next preloads it. The remote
          ctfassets.net hostname is whitelisted in next.config.mjs. */}
      <Image
        src="https://images.ctfassets.net/2xsswpd01u70/2NWGNqdYfFotIijt96Zb9n/cd6be1445272e247f685b2d4eba888d5/H1_Hero_HP_desktop_1366x768_V5.png"
        alt="Ring security cameras and video doorbells on display"
        fill
        priority
        sizes="100vw"
        className="object-cover object-bottom"
      />

      {/* Gradient vignettes. Mobile uses a much stronger, taller top gradient
          so the subhead sits on a readable surface. Desktop keeps the
          original subtle fade. */}
      <div className="absolute inset-x-0 top-0 h-[72%] sm:h-48 bg-gradient-to-b from-white/95 via-white/85 to-transparent sm:from-white/70 sm:via-white/20 pointer-events-none z-[5]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/40 to-transparent pointer-events-none z-[5]" />

      {/* Text — upper area */}
      <div className="absolute z-10 top-[25%] sm:top-[16%] left-0 right-0 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="fade-up-delay-1 font-display text-3xl sm:text-5xl lg:text-[3.75rem] font-extrabold text-ink-1 leading-[1.02] tracking-[-0.04em] mb-3 sm:mb-5">
            Expertly Installed.<br className="hidden sm:block" /> Perfectly Secured.
          </h1>
          <p className="fade-up-delay-2 text-ink-3 text-sm sm:text-lg max-w-lg mx-auto font-medium leading-relaxed">
            Dublin&apos;s #1 Ring installer. Professional smart doorbell and security camera installation across Dublin and all of Leinster. 5,000 installs done.
          </p>
        </div>
      </div>

      {/* Button — lower area */}
      <div className="fade-up-delay-3 absolute z-10 bottom-16 sm:bottom-32 lg:bottom-36 left-0 right-0 px-4 text-center">
        <Link
          href="/services/bundles"
          className="btn-sheen focus-ring group inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold text-sm px-9 py-3.5 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(38,34,30,0.25)] hover:shadow-[0_20px_60px_-5px_rgba(38,34,30,0.35)] hover:-translate-y-0.5"
        >
          <span className="relative z-10">View Popular Bundles</span>
          <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
