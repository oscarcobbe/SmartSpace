import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Free Home Security Consultation | Dublin & Leinster | Smart Space",
  description:
    "Book a complimentary in-home security consultation with Smart Space. Honest advice, no obligation, written quote the same day. Dublin and all of Leinster.",
  alternates: { canonical: "/services/free-consultation" },
  openGraph: {
    title: "Free Home Security Consultation | Dublin & Leinster",
    description:
      "Free in-home consultation, no obligation. Dublin and all of Leinster.",
    url: `${SITE}/services/free-consultation`,
    type: "website",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Home Security Consultation",
  name: "Free Home Security Consultation — Dublin & Leinster",
  description:
    "Complimentary in-home security consultation with written quote. Dublin and all of Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/free-consultation`,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Free Consultation", item: `${SITE}/services/free-consultation` },
  ],
};

export default function FreeConsultationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
