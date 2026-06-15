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
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Ring Eldercare Bundle by Smart Space" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ring Eldercare Bundle | Dublin & Leinster Installation",
    description:
      "Video Doorbell + smart Wi-Fi keybox for elderly relatives. From €509.",
    images: ["/og-default.png"],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
