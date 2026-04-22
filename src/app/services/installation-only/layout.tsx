import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Installation Only — Ring, Eufy, Nest & Tapo | Dublin & Leinster | Smart Space",
  description:
    "Already bought a Ring, Eufy, Nest or Tapo device? We'll install it for you across Dublin and Leinster. Professional mounting, wiring, and app setup. From €139.",
  alternates: { canonical: "/services/installation-only" },
  openGraph: {
    title: "Installation Only | Dublin & Leinster | Smart Space",
    description:
      "Professional Ring, Eufy, Nest and Tapo installation across Dublin and Leinster. From €139.",
    url: `${SITE}/services/installation-only`,
    type: "website",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Smart Home Device Installation",
  name: "Ring / Eufy / Nest / Tapo Installation Only — Dublin & Leinster",
  description:
    "Professional installation for customer-supplied Ring, Eufy, Nest and Tapo doorbells and cameras. Dublin and all of Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
  offers: {
    "@type": "Offer",
    price: "139",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/installation-only`,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Installation Only", item: `${SITE}/services/installation-only` },
  ],
};

export default function InstallationOnlyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
