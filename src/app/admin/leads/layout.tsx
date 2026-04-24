import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Leads",
  robots: { index: false, follow: false },
};

export default function AdminLeadsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
