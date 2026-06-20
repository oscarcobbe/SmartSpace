import Link from "next/link";
import Hero from "@/components/Hero";
import CategoryCards from "@/components/CategoryCards";
import FeaturedProducts from "@/components/FeaturedProducts";
import PromoBanner from "@/components/PromoBanner";
import WholeHomeSection from "@/components/WholeHomeSection";
import MailingList from "@/components/MailingList";
import ReviewsSurfacing from "@/components/ReviewsSurfacing";
import FreeConsultationCTA from "@/components/FreeConsultationCTA";

export default function Home() {
  return (
    <>
      <Hero />
      <ReviewsSurfacing />
      {/* Mobile-only CTAs (block sm:hidden). On desktop these three buttons
          live in the hero; on mobile they were too large there, so they render
          here, after the reviews section and before "Our Packages"
          (CategoryCards). Same three links and button styles as the hero. */}
      <div className="block sm:hidden px-4 py-8">
        <div className="flex flex-col items-stretch gap-3 max-w-md mx-auto">
          <Link
            href="/services/free-consultation"
            className="btn-sheen group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-600 text-white font-semibold text-sm px-6 py-3 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(242,130,34,0.55)] hover:shadow-[0_20px_60px_-5px_rgba(242,130,34,0.7)] hover:-translate-y-0.5 pulse-glow whitespace-nowrap"
          >
            <span className="relative z-10">Book Complimentary Consultation</span>
          </Link>
          <Link
            href="/services/installation-only"
            className="group inline-flex items-center justify-center gap-2 bg-white/90 backdrop-blur-sm hover:bg-white text-[#1C1A18] font-semibold text-sm px-6 py-3 rounded-full border border-white/60 transition-all hover:-translate-y-0.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] whitespace-nowrap"
          >
            <span>Got A Device To Install?</span>
          </Link>
          <Link
            href="/services/eufy"
            className="btn-sheen group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#0a6ea3] to-[#005d8e] hover:from-[#005d8e] hover:to-[#004c75] text-white font-semibold text-sm px-6 py-3 rounded-full transition-all shadow-[0_10px_40px_-5px_rgba(0,93,142,0.55)] hover:shadow-[0_20px_60px_-5px_rgba(0,93,142,0.7)] hover:-translate-y-0.5 whitespace-nowrap"
          >
            <span className="relative z-10">Eufy Options</span>
          </Link>
        </div>
      </div>
      <CategoryCards />
      <FreeConsultationCTA />
      <FeaturedProducts />
      <PromoBanner />
      <WholeHomeSection />
      <MailingList />
    </>
  );
}
