import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/context/CartContext";
import GclidCapture from "@/components/GclidCapture";

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  // Homepage title only; each page below sets its own complete title.
  title: "Smart Space | Dublin's #1 5-Star Ring Installer",
  description:
    "Dublin's only 5-star Ring installer. Professional Ring doorbell and security camera installation across Dublin and Leinster. 5,000+ installations, SME Winner 2025.",
  keywords:
    "Ring installer Dublin, Ring doorbell installation Dublin, Ring camera Dublin, Ring installer Leinster, smart home Dublin, security camera installation Ireland",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Smart Space",
    title: "Smart Space | Dublin's #1 5-Star Ring Installer",
    description:
      "Professional Ring doorbell and security camera installation across Dublin and Leinster. 5,000+ installations, SME Winner 2025.",
    locale: "en_IE",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Smart Space — Dublin's #1 5-Star Ring Installer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Space | Dublin's #1 5-Star Ring Installer",
    description:
      "Professional Ring doorbell and security camera installation across Dublin and Leinster.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const GTAG_ID = "AW-17978501655";
const BUSINESS_PHONE = "+35315130424";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Smart Space",
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/Logo1.png`,
      },
      slogan: "Expertly Installed. Perfectly Secured.",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: BUSINESS_PHONE,
        email: "info@smart-space.ie",
        contactType: "customer service",
        areaServed: "IE",
        availableLanguage: "en",
      },
      sameAs: [],
    },
    {
      "@type": "LocalBusiness",
      "@id": `${SITE}/#localbusiness`,
      name: "Smart Space",
      url: SITE,
      image: `${SITE}/og-default.png`,
      logo: `${SITE}/Logo1.png`,
      telephone: BUSINESS_PHONE,
      email: "info@smart-space.ie",
      priceRange: "€€",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Dublin",
        addressRegion: "Leinster",
        addressCountry: "IE",
      },
      areaServed: [
        { "@type": "AdministrativeArea", name: "Dublin" },
        { "@type": "AdministrativeArea", name: "Wicklow" },
        { "@type": "AdministrativeArea", name: "Kildare" },
        { "@type": "AdministrativeArea", name: "Meath" },
        { "@type": "AdministrativeArea", name: "Louth" },
        { "@type": "AdministrativeArea", name: "Wexford" },
        { "@type": "AdministrativeArea", name: "Carlow" },
        { "@type": "AdministrativeArea", name: "Kilkenny" },
        { "@type": "AdministrativeArea", name: "Laois" },
        { "@type": "AdministrativeArea", name: "Offaly" },
        { "@type": "AdministrativeArea", name: "Westmeath" },
        { "@type": "AdministrativeArea", name: "Longford" },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5.0",
        bestRating: "5",
        reviewCount: "100",
      },
      award: "Three Ireland SME Business Winner 2025",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "Smart Space",
      publisher: { "@id": `${SITE}/#organization` },
      inLanguage: "en-IE",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IE">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        {/* Google Ads global tag */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: [
              "window.dataLayer = window.dataLayer || [];",
              "function gtag(){dataLayer.push(arguments);}",
              "gtag('js', new Date());",
              "gtag('config', " + JSON.stringify(GTAG_ID) + ", { allow_enhanced_conversions: true });",
              "var callLabel = " + JSON.stringify(process.env.NEXT_PUBLIC_GADS_CALL_LABEL || "") + ";",
              "if (callLabel) {",
              "  gtag('config', " + JSON.stringify(GTAG_ID) + " + '/' + callLabel, {",
              "    phone_conversion_number: " + JSON.stringify(BUSINESS_PHONE),
              "  });",
              "}",
            ].join("\n"),
          }}
        />
        {/* LocalBusiness + Organization + WebSite schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="antialiased bg-white text-gray-900"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <CartProvider>
          <GclidCapture />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <CartDrawer />
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
