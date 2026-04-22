import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Single Ring Device Installation | Dublin & Leinster | Smart Space",
  description:
    "Choose a Ring Video Doorbell or External Camera — professionally supplied and installed across Dublin and Leinster. From €299.",
  alternates: { canonical: "/services/single" },
  openGraph: {
    title: "Single Ring Device Installation | Dublin & Leinster",
    description:
      "Choose a Ring Video Doorbell or External Camera. Supplied and installed from €299.",
    url: `${SITE}/services/single`,
    type: "website",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE },
    { "@type": "ListItem", position: 2, name: "Services", item: `${SITE}/services` },
    { "@type": "ListItem", position: 3, name: "Single Device", item: `${SITE}/services/single` },
  ],
};

export default function SingleLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
