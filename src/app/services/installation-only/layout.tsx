import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Installation Only, Ring, Eufy, Nest, Tapo & Aosu | Dublin & Leinster | Smart Space",
  description:
    "Already bought a Ring, Eufy, Nest, Tapo or Aosu device? We'll install it across Dublin and Leinster. Mounting, wiring, app setup. From €139.",
  alternates: { canonical: "/services/installation-only" },
  openGraph: {
    title: "Installation Only | Dublin & Leinster | Smart Space",
    description:
      "Professional Ring, Eufy, Nest, Tapo and Aosu installation across Dublin and Leinster. From €139.",
    url: `${SITE}/services/installation-only`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Installation Only, Ring, Eufy, Nest, Tapo, Aosu, Smart Space" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Installation Only | Dublin & Leinster | Smart Space",
    description:
      "Professional Ring, Eufy, Nest, Tapo and Aosu installation across Dublin and Leinster. From €139.",
    images: ["/og-default.png"],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {children}
    </>
  );
}
