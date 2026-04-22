import Hero from "@/components/Hero";
import CategoryCards from "@/components/CategoryCards";
import FeaturedProducts from "@/components/FeaturedProducts";
import PromoBanner from "@/components/PromoBanner";
import WholeHomeSection from "@/components/WholeHomeSection";
import MailingList from "@/components/MailingList";
import ReviewsSurfacing from "@/components/ReviewsSurfacing";

export default function Home() {
  return (
    <>
      <Hero />
      <ReviewsSurfacing />
      <CategoryCards />
      <FeaturedProducts />
      <PromoBanner />
      <WholeHomeSection />
      <MailingList />
    </>
  );
}
