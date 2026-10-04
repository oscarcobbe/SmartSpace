import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { AGGREGATE_RATING, AGGREGATE_REVIEW_COUNT } from "@/lib/business-constants";
import { COMPANY } from "@/lib/company";
import { gtagBootstrap } from "@/lib/gtag-bootstrap";

// next/font self-hosts the font, eliminates the render-blocking
// `<link href="fonts.googleapis.com/...">` request, removes the need for
// preconnect tags, and ships ONLY the weights actually used. Single
// biggest LCP improvement available, Google PSI was waiting 300-500ms
// on mobile for the external font CSS to download before first paint.
// The font and its visual character are identical to the previous setup.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

const SITE = "https://smart-space.ie";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  // Homepage title only; each page below sets its own complete title.
  title: "Smart Space | Ring Installation, Dublin and Leinster",
  description:
    "a 5-star rated Ring installer. Professional Ring doorbell and security camera installation across Dublin and Leinster, and now Eufy supplied and installed with no monthly subscription. 5,000+ installations, SME Winner 2025.",
  keywords:
    "Ring installer Dublin, Ring doorbell installation Dublin, Ring camera Dublin, Ring installer Leinster, Eufy installer Dublin, Eufy supplied and installed Ireland, smart home Dublin, security camera installation Ireland",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Smart Space",
    title: "Smart Space | Ring Installation, Dublin and Leinster",
    description:
      "Professional Ring doorbell and security camera installation across Dublin and Leinster, plus Eufy supplied and installed. 5,000+ installations, SME Winner 2025.",
    locale: "en_IE",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Smart Space, Ring installation in Dublin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smart Space | Ring Installation, Dublin and Leinster",
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
// E.164 form used by schema.org JSON-LD (Google's structured-data
// validator prefers the international format). Keep separate from the
// call-tracking format below, Google rejects E.164 in
// phone_conversion_number unless the displayed page text also uses E.164.
const BUSINESS_PHONE = "+35315130424";
// Local-format used ONLY by the Google Ads call-tracking number-swap.
// Must match the EXACT string the conversion action "SS - Call
// (01 513 0424)" expects (verified 18 May 2026 from the action's
// "Use Google tag" snippet, Google said `'01 513 0424'`). With the
// previous `+35315130424` value, Google's swap couldn't find the
// displayed number on the page (because the page renders "01 513 0424"
// in text and only uses `+35315130424` in tel: hrefs), so the
// forwarding-number-swap never engaged and paid-click manual dials
// went untracked.
const BUSINESS_PHONE_CALL_TRACKING = "01 513 0424";
// Google Analytics 4 measurement ID. Set NEXT_PUBLIC_GA4_MEASUREMENT_ID
// in Vercel env to enable GA4 pageview + event tracking. Falls back to
// Ads-only when the env var isn't set. Production: G-N8886QEJ70, stream
// 15470580335 "SmartSpace Web" of property 534445467.
const GA4_ID = (process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "").trim();

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Smart Space",
      /* The registered particulars, the same ones section 151 puts in the
         footer. Google cross-checks a business against the public register
         during advertiser verification, and an Organization that names no
         legal entity gives it nothing to match against. */
      legalName: COMPANY.legalName,
      identifier: {
        "@type": "PropertyValue",
        name: "CRO",
        value: COMPANY.number,
      },
      foundingDate: "2018-04-20",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Fourwinds Cottage, Cuckoo Corner",
        addressLocality: "Ballymerrigan",
        addressRegion: "Co. Wicklow",
        addressCountry: "IE",
      },
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
      /*
       * Where the business actually is, which is Wicklow.
       *
       * This said Dublin with no street and no postcode. The business serves
       * Dublin, it is not in it, and naming a city you are not in is the
       * thing Google penalises a local listing for. areaServed below is the
       * right place to say where the work is done, and it already does.
       */
      address: {
        "@type": "PostalAddress",
        streetAddress: "Fourwinds Cottage, Cuckoo Corner",
        addressLocality: "Ballymerrigan",
        addressRegion: "Co. Wicklow",
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
        ratingValue: AGGREGATE_RATING,
        bestRating: "5",
        reviewCount: AGGREGATE_REVIEW_COUNT,
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
        {/* Google Ads + GA4 (both gtag.js), consent default, and the call
            tracking number swap. The script, and why each line is there,
            is in src/lib/gtag-bootstrap.ts. It loads gtag.js itself, so that
            staff pages (src/lib/staff-paths.ts) never request it at all. */}
        <script
          dangerouslySetInnerHTML={{
            __html: gtagBootstrap({
              ads: GTAG_ID,
              ga4: GA4_ID,
              // .trim() is load-bearing: Vercel env vars can carry a trailing
              // \n from copy-paste, and Google Ads rejects "<id>\n" as an
              // unknown label, silently dropping every phone-call conversion.
              // Discovered 2026-05-14 after a confirmed phone lead didn't
              // register against the account.
              callLabel: (process.env.NEXT_PUBLIC_GADS_CALL_LABEL || "").trim(),
              callNumber: BUSINESS_PHONE_CALL_TRACKING,
            }),
          }}
        />
        {/* LocalBusiness + Organization + WebSite schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${jakarta.className} antialiased bg-white text-gray-900`}>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
