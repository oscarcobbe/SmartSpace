import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

import { AGGREGATE_RATING, AGGREGATE_REVIEW_COUNT } from "@/lib/business-constants";

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
              {/*
                Read from the same constant the JSON-LD uses.

                business-constants.ts records that the count was corrected to
                46 on 2026-05-20 because 100 "materially overstated reality and
                risked a Google rich-snippet manual penalty". That correction
                reached the schema and never reached this line, so Google was
                told 46 and the visitor on the homepage was told 100+. Reading
                the constant is what stops the two drifting apart again.
              */}
              <span className="sm:hidden">{AGGREGATE_REVIEW_COUNT} Google reviews</span>
              <span className="hidden sm:inline">
                Rated {AGGREGATE_RATING} on Google by {AGGREGATE_REVIEW_COUNT} customers
              </span>
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
