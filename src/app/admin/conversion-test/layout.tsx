import type { Metadata } from "next";

// Server-component layout for /admin/conversion-test — its sibling page.tsx
// is a Client Component and cannot export metadata directly. Without this
// the page would inherit the root metadata (robots: index, follow), which
// means a stray inbound link could get Google to index an internal-only
// diagnostic page. robots.txt already disallows /admin/, but explicit
// noindex is defence-in-depth.
export const metadata: Metadata = {
  title: "Admin — Conversion Test",
  robots: { index: false, follow: false },
};

export default function AdminConversionTestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
