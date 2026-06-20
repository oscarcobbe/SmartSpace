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
      <CategoryCards />
      <FreeConsultationCTA />
      <FeaturedProducts />
      <PromoBanner />
      <WholeHomeSection />
      <MailingList />
    </>
  );
}
