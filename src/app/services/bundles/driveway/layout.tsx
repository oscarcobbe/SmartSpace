import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Ring Driveway Bundle Installation | Dublin & Leinster | Smart Space",
  description:
    "Ring Driveway Bundle — Video Doorbell plus Floodlight Cam, installed across Dublin and Leinster. Save €50. From €658.",
  alternates: { canonical: "/services/bundles/driveway" },
  openGraph: {
    title: "Ring Driveway Bundle | Dublin & Leinster Installation",
    description:
      "Video Doorbell + Floodlight Cam supplied and installed. From €658. Save €50.",
    url: `${SITE}/services/bundles/driveway`,
    type: "website",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Ring Driveway Bundle Installation",
  name: "Ring Driveway Bundle Installation Dublin & Leinster",
  description:
    "Video Doorbell + Floodlight Cam supplied and professionally installed. Dublin and all of Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
  offers: {
    "@type": "Offer",
    price: "658",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/bundles/driveway`,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Bundles", item: `${SITE}/services/bundles` },
    { "@type": "ListItem", position: 4, name: "Driveway Bundle", item: `${SITE}/services/bundles/driveway` },
  ],
};

export default function DrivewayBundleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
