import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Ring Video Doorbell Installation | Dublin & Leinster | Smart Space",
  description:
    "Ring Video Doorbell installation in Dublin and Leinster. Every install includes the Ring Chime, app setup, and motion zone tuning. From €299.",
  alternates: { canonical: "/services/doorbell" },
  openGraph: {
    title: "Ring Video Doorbell Installation | Dublin & Leinster",
    description:
      "Professional Ring Video Doorbell installation. Chime included. From €299.",
    url: `${SITE}/services/doorbell`,
    type: "website",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Ring Video Doorbell Installation",
  name: "Ring Video Doorbell Installation Dublin & Leinster",
  description:
    "Professional Ring Video Doorbell installation including Ring Chime, app setup, and motion zone tuning. Dublin and all of Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
  offers: {
    "@type": "Offer",
    price: "299",
    priceCurrency: "EUR",
    priceSpecification: {
      "@type": "PriceSpecification",
      price: "299",
      priceCurrency: "EUR",
      valueAddedTaxIncluded: true,
    },
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/doorbell`,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Video Doorbells", item: `${SITE}/services/doorbell` },
  ],
};

export default function DoorbellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
