"use client";

/**
 * Mobile-only sticky bottom CTA for /ring-installation.
 *
 * Appears once the user has scrolled past the hero (~600px) and
 * jumps them back to the booking form (#book) on tap. Hidden on
 * larger screens where the hero form stays visible.
 *
 * Z-index 40 so the cookie consent banner (z-1000) wins.
 */

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const SHOW_AFTER_PX = 600;

export default function MobileBookCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    onScroll(); // initial check
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-white via-white to-white/0 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
      aria-hidden={!visible}
    >
      <a
        href="#book"
        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold px-6 py-4 rounded-full shadow-[0_10px_30px_-5px_rgba(242,130,34,0.55)]"
      >
        Book Your Install — From €139
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
