import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

export default function ReviewsSurfacing() {
  return (
    <section className="py-3 sm:py-10 bg-white border-t border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          href="/reviews"
          className="flex flex-row flex-wrap items-center justify-center gap-2 sm:gap-8 text-center sm:text-left group"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-base sm:text-2xl font-extrabold text-[#1a1a1a] ml-0.5 sm:ml-1">5</span>
          </div>
          <div className="h-4 sm:h-8 w-px bg-gray-200" />
          <div>
            <div className="text-xs sm:text-sm font-bold text-[#1a1a1a]">
              <span className="sm:hidden">100+ Google reviews</span>
              <span className="hidden sm:inline">Rated 5 on Google by 100+ customers</span>
            </div>
            <div className="hidden sm:block text-xs text-gray-500">
              5,000+ Ring installations across Dublin &amp; Leinster
            </div>
          </div>
          <div className="h-4 sm:h-8 w-px bg-gray-200 hidden sm:block" />
          <div className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-semibold text-brand-500 group-hover:text-brand-600">
            Read reviews
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>
    </section>
  );
}
