import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Checkout — Internal",
  robots: { index: false, follow: false },
};

export default function TestCheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
