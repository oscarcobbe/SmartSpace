import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/context/CartContext";
import GclidCapture from "@/components/GclidCapture";
import CookieBanner from "@/components/CookieBanner";
import PhoneClickTracker from "@/components/PhoneClickTracker";

// next/font self-hosts the font, eliminates the render-blocking
// `<link href="fonts.googleapis.com/...">` request, removes the need for
// preconnect tags, and ships ONLY the weights actually used. Single
// biggest LCP improvement available — Google PSI was waiting 300-500ms
// on mobile for the external font CSS to download before first paint.
// The font and its visual character are identical to the previous setup.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  // Homepage title only; each page below sets its own complete title.
  title: "Smart Space | Dublin's #1 Ring Installer",
  description:
    "Dublin's only 5-star Ring installer. Professional Ring doorbell and security camera installation across Dublin and Leinster. 5,000+ installations, SME Winner 2025.",
  keywords:
    "Ring installer Dublin, Ring doorbell installation Dublin, Ring camera Dublin, Ring installer Leinster, smart home Dublin, security camera installation Ireland",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Smart Space",
    title: "Smart Space | Dublin's #1 Ring Installer",
    description:
      "Professional Ring doorbell and security camera installation across Dublin and Leinster. 5,000+ installations, SME Winner 2025.",
    locale: "en_IE",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Smart Space — Dublin's #1 Ring Installer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Space | Dublin's #1 Ring Installer",
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
// Google Analytics 4 measurement ID. Set NEXT_PUBLIC_GA4_MEASUREMENT_ID
// in Vercel env to enable GA4 pageview + event tracking. Falls back to
// Ads-only when the env var isn't set.
const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";

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
      // sameAs intentionally omitted (empty array triggers a non-critical
      // "missing field" warning in Google's Rich Results Test). Re-add
      // when you have at least one canonical social profile to link to,
      // e.g. ["https://www.google.com/maps/...", "https://www.facebook.com/..."].
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
        ratingValue: "5",
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
        {/* Font is now loaded via next/font (self-hosted, no render-blocking
            external CSS, no preconnect needed). See `jakarta` constant. */}
        {/* Google Ads + GA4 global tag (both use gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GTAG_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: [
              "window.dataLayer = window.dataLayer || [];",
              "function gtag(){dataLayer.push(arguments);}",
              "gtag('js', new Date());",
              // ── Consent Mode v2 ADVANCED — the lever that brings denied-
              // consent conversions back from /dev/null. ──
              //   url_passthrough: true   → preserves the gclid query param
              //     across internal navigation even when ad_storage='denied',
              //     so the sequence "ad click → /ring-installation → /contact
              //     → submit" still has the gclid attached on the final fire.
              //     Without this, every Irish/EU paid click that doesn't
              //     accept cookies loses its attribution after the first nav.
              //   ads_data_redaction: true → when ad_storage='denied', send
              //     anonymised conversion pings (no IP, no cookie id) instead
              //     of dropping the ping entirely. Google then statistically
              //     MODELS the conversion in Ads. Without this setting, ALL
              //     denied-consent conversions are silently lost.
              // These two MUST be set BEFORE the consent default below.
              "gtag('set', 'url_passthrough', true);",
              "gtag('set', 'ads_data_redaction', true);",
              // ── Consent Mode v2 default (REQUIRED for EEA/UK ad processing) ──
              // Default everything to denied. CookieBanner.tsx fires
              // gtag('consent','update',…) once the user makes a choice.
              // This MUST run before any gtag('config',…) call.
              "gtag('consent', 'default', {",
              "  ad_storage: 'denied',",
              "  ad_user_data: 'denied',",
              "  ad_personalization: 'denied',",
              "  analytics_storage: 'denied',",
              "  wait_for_update: 500",
              "});",
              // Google Ads
              "gtag('config', " + JSON.stringify(GTAG_ID) + ", { allow_enhanced_conversions: true });",
              // GA4 (only configured when the measurement ID env var is set)
              GA4_ID
                ? "gtag('config', " + JSON.stringify(GA4_ID) + ");"
                : "// GA4 disabled — set NEXT_PUBLIC_GA4_MEASUREMENT_ID to enable",
              // Phone-call conversion (Google Ads call tracking)
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
      <body className={`${jakarta.className} antialiased bg-white text-gray-900`}>
        <CartProvider>
          <GclidCapture />
          <PhoneClickTracker />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <CartDrawer />
          <Footer />
          <CookieBanner />
        </CartProvider>
      </body>
    </html>
  );
}
