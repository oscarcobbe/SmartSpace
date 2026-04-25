import type { Metadata } from "next";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  title: "Ring Doorbell Installation in Ireland — From €139 | Smart Space",
  description:
    "Professional Ring doorbell installation in Dublin and across Leinster. From €139, same-day quote, 5,000+ installs done, 5★ Google reviews. Book online — we confirm by phone within 1 hour.",
  alternates: { canonical: `${SITE}/ring-installation` },
  // Paid-only landing page — keep out of organic search to avoid
  // cannibalising /services/installation-only.
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    url: `${SITE}/ring-installation`,
    siteName: "Smart Space",
    title: "Ring Doorbell Installation in Ireland — From €139",
    description:
      "Professional installation by certified Irish installers. Wired or battery, every Ring model. Book online in 90 seconds.",
    locale: "en_IE",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${SITE}/ring-installation#service`,
      name: "Ring Doorbell Installation",
      serviceType: "Smart doorbell installation",
      provider: { "@id": `${SITE}/#localbusiness` },
      areaServed: [
        { "@type": "AdministrativeArea", name: "Dublin" },
        { "@type": "AdministrativeArea", name: "Leinster" },
        { "@type": "Country", name: "Ireland" },
      ],
      description:
        "Professional installation of Ring, Eufy, Tapo, Nest, and Arlo video doorbells and security cameras across Ireland. Wired or battery, same-week installation.",
      offers: {
        "@type": "Offer",
        price: "139",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: `${SITE}/ring-installation`,
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What does the €139 cover?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Mounting your doorbell on any standard wall material, hardwiring into your existing chime if you want it wired, app setup on up to 4 family phones, motion-zone tuning, and a full demo before we leave. No surprise extras.",
          },
        },
        {
          "@type": "Question",
          name: "When would it cost more than €139?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Only if there's something unusual: no chime to wire into and you want hardwired (we run an external transformer), unusually difficult wall like granite or thick concrete, or you want multiple cameras at once. We tell you the exact price on the booking call before we book the slot.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need to buy the doorbell from you?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No — install your own. We install whatever you bought, from Amazon, Currys, Harvey Norman, the brand directly, or even second-hand. The €139 covers the labour.",
          },
        },
        {
          "@type": "Question",
          name: "How fast can you come?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "For Dublin and Leinster, usually next-working-day. Outside of Leinster, within 5 working days. Pick a date in the booking form and we'll confirm by phone within an hour.",
          },
        },
        {
          "@type": "Question",
          name: "What if it doesn't work after you leave?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "First 30 days are covered — we come back free of charge for any setup or app issue. After 30 days, we offer a paid call-out (€60) if there's a setup change you'd like.",
          },
        },
        {
          "@type": "Question",
          name: "Are you insured? Garda-vetted?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes — fully insured, public liability cover. All installers Garda-vetted on request. Just mention it on the booking call.",
          },
        },
      ],
    },
  ],
};

export default function RingInstallationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
