import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Ring Eldercare Bundle Installation | Dublin & Leinster | Smart Space",
  description:
    "Ring Eldercare Bundle — Video Doorbell and smart Wi-Fi keybox, professionally installed for elderly relatives and their carers. From €509.",
  alternates: { canonical: "/services/bundles/eldercare" },
  openGraph: {
    title: "Ring Eldercare Bundle | Dublin & Leinster Installation",
    description:
      "Video Doorbell + smart Wi-Fi keybox for elderly relatives. From €509.",
    url: `${SITE}/services/bundles/eldercare`,
    type: "website",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Ring Eldercare Bundle Installation",
  name: "Ring Eldercare Bundle Installation Dublin & Leinster",
  description:
    "Video Doorbell and smart Wi-Fi keybox designed for elderly relatives and carers. Installed across Dublin and Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
  offers: {
    "@type": "Offer",
    price: "509",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/bundles/eldercare`,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Bundles", item: `${SITE}/services/bundles` },
    { "@type": "ListItem", position: 4, name: "Eldercare Bundle", item: `${SITE}/services/bundles/eldercare` },
  ],
};

export default function EldercareBundleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
