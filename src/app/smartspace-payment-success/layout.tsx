import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thank You | Smart Space",
  robots: { index: false, follow: false },
};

export default function PaymentSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
