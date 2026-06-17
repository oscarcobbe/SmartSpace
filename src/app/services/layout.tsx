import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Ring Installation Services | Dublin & Leinster | Smart Space",
  description:
    "Professional Ring doorbell and security camera installation across Dublin and Leinster. Video doorbells, floodlight cameras, bundles and installation-only services.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Ring Installation Services | Dublin & Leinster | Smart Space",
    description:
      "Professional Ring installation across Dublin and all of Leinster. Doorbells, cameras, and bundles.",
    url: `${SITE}/services`,
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Smart Space, Ring Installation Services" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ring Installation Services | Dublin & Leinster | Smart Space",
    description:
      "Professional Ring installation across Dublin and all of Leinster. Doorbells, cameras, and bundles.",
    images: ["/og-default.png"],
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
