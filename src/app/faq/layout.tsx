import type { Metadata } from "next";
import { FAQS } from "./faq-data";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Ring Installation FAQ | Smart Space Dublin",
  description:
    "Answers to the most common questions about Ring doorbell and camera installation in Ireland. Pricing, install times, Wi-Fi, insurance, and more.",
  alternates: { canonical: "/faq" },
  // Re-indexed 2026-05-04 after content refresh — long-tail intent page
  // ("how does ring doorbell installation work", "what's needed for ring
  // chime", etc.). Now in sitemap.
  robots: { index: true, follow: true },
  openGraph: {
    title: "Ring Installation FAQ | Smart Space Dublin",
    description:
      "Common questions about Ring doorbell and camera installation in Ireland, answered by Dublin's #1 Ring installer.",
    url: `${SITE}/faq`,
    type: "website",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
