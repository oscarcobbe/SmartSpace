import Link from "next/link";

export default function PromoBanner() {
  return (
    <section className="bg-[#1a1a1a] py-16 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 leading-tight">
          We don&apos;t just sell Ring.<br />We install it.
        </h2>
        <p className="text-[#999] text-base sm:text-lg max-w-xl mx-auto mb-8">
          As Leinster&apos;s top-rated Ring installer, we deliver and professionally set up your entire system.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/services/free-consultation" className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-8 py-3 rounded-full transition-colors">
            Get a Quote
          </Link>
          <Link
            href="/services/installation-only"
            className="inline-block border border-[#444] hover:border-[#666] text-white font-semibold text-sm px-8 py-3 rounded-full transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
