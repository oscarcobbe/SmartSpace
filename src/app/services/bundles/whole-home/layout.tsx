import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Ring Whole Home Bundle Installation | Dublin & Leinster | Smart Space",
  description:
    "Ring Whole Home Bundle — Video Doorbell plus 2x Floodlight Cams, professionally installed across Dublin and Leinster. Save €100. From €987.",
  alternates: { canonical: "/services/bundles/whole-home" },
  openGraph: {
    title: "Ring Whole Home Bundle | Dublin & Leinster Installation",
    description:
      "Video Doorbell + 2x Floodlight Cams supplied and installed. From €987. Save €100.",
    url: `${SITE}/services/bundles/whole-home`,
    type: "website",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Ring Whole Home Bundle Installation",
  name: "Ring Whole Home Bundle Installation Dublin & Leinster",
  description:
    "Video Doorbell + 2x Floodlight Cams (front & rear) supplied and professionally installed. Dublin and all of Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
  offers: {
    "@type": "Offer",
    price: "987",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/bundles/whole-home`,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Bundles", item: `${SITE}/services/bundles` },
    { "@type": "ListItem", position: 4, name: "Whole Home Bundle", item: `${SITE}/services/bundles/whole-home` },
  ],
};

export default function WholeHomeBundleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
