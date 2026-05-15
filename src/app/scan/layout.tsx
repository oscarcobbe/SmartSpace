import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

/**
 * /scan is the QR-code landing page printed on every Smart Space business
 * card and (potentially) marketing piece going forward. It's NOT meant to
 * rank organically — the page exists purely to be the destination for
 * scanned QR codes and pasted print URLs.
 *
 *   - robots: noindex, follow   — keep it out of Google's index but allow
 *     link equity to flow to /services/free-consultation etc.
 *   - canonical: /scan          — paid/print canonical, distinct from the
 *     organic /services/free-consultation page so analytics can isolate
 *     "scan traffic" cleanly.
 *
 * If we ever add UTM-tagged variants like /scan?src=flyer-v5 we won't need
 * separate routes — just inspect attribution via existing
 * src/lib/attribution.ts on submit.
 */
export const metadata: Metadata = {
  title: "Smart Space — Welcome",
  description:
    "Welcome from Smart Space — Dublin's #1 Ring installer. Free home consultation, flat install from €139, no monthly contract. Book online or call 01 513 0424.",
  alternates: { canonical: "/scan" },
  robots: { index: false, follow: true },
  openGraph: {
    title: "Smart Space — Welcome",
    description:
      "Free home consultation, flat install from €139, no monthly contract.",
    url: `${SITE}/scan`,
    type: "website",
  },
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
