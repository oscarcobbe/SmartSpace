import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Single Ring Device Installation | Dublin & Leinster | Smart Space",
  description:
    "Choose a Ring Video Doorbell (from €329) or External Camera (from €299) — professionally supplied and installed across Dublin and Leinster.",
  alternates: { canonical: "/services/single" },
  openGraph: {
    title: "Single Ring Device Installation | Dublin & Leinster",
    description:
      "Choose a Ring Video Doorbell from €329, or an External Camera from €299. Supplied and installed.",
    url: `${SITE}/services/single`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Single Ring Device Installation by Smart Space" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Single Ring Device Installation | Dublin & Leinster",
    description:
      "Choose a Ring Video Doorbell from €329, or an External Camera from €299. Supplied and installed.",
    images: ["/og-default.png"],
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
