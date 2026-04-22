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
  },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
