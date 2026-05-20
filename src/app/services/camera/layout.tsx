import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Ring Floodlight Camera Installation | Dublin & Leinster | Smart Space",
  description:
    "Ring Floodlight Cam installation in Dublin and Leinster. Professional mounting, wiring, and app setup for driveways, gardens, and rear entrances. From €379.",
  alternates: { canonical: "/services/camera" },
  openGraph: {
    title: "Ring Floodlight Camera Installation | Dublin & Leinster",
    description:
      "Professional Ring Floodlight Cam installation for driveways and gardens. From €379.",
    url: `${SITE}/services/camera`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Ring Floodlight Camera Installation by Smart Space" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ring Floodlight Camera Installation | Dublin & Leinster",
    description:
      "Professional Ring Floodlight Cam installation for driveways and gardens. From €379.",
    images: ["/og-default.png"],
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Ring Floodlight Camera Installation",
  name: "Ring Floodlight Camera Installation Dublin & Leinster",
  description:
    "Professional Ring Floodlight Cam installation for driveways, gardens, and rear entrances. Dublin and all of Leinster.",
  provider: { "@id": `${SITE}/#localbusiness` },
  areaServed: { "@type": "Place", name: "Dublin & Leinster, Ireland" },
  offers: {
    "@type": "Offer",
    price: "379",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    url: `${SITE}/services/camera`,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Floodlight Cameras", item: `${SITE}/services/camera` },
  ],
};

export default function CameraLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
