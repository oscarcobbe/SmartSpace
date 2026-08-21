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
import { AGGREGATE_RATING, AGGREGATE_REVIEW_COUNT } from "@/lib/business-constants";

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
  title: "Smart Space | Dublin's #1 Ring Installer",
  description:
    "Dublin's only 5-star Ring installer. Professional Ring doorbell and security camera installation across Dublin and Leinster, and now Eufy supplied and installed with no monthly subscription. 5,000+ installations, SME Winner 2025.",
  keywords:
    "Ring installer Dublin, Ring doorbell installation Dublin, Ring camera Dublin, Ring installer Leinster, Eufy installer Dublin, Eufy supplied and installed Ireland, smart home Dublin, security camera installation Ireland",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Smart Space",
    title: "Smart Space | Dublin's #1 Ring Installer",
    description:
      "Professional Ring doorbell and security camera installation across Dublin and Leinster, plus Eufy supplied and installed. 5,000+ installations, SME Winner 2025.",
    locale: "en_IE",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Smart Space, Dublin's #1 Ring Installer",
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
        {/* Google Ads + GA4 global tag (both use gtag.js).

            Loaded with the GA4 id where one is set, not the Ads id.
            Google's documented order is to load with the measurement id
            and configure the conversion id after it, and this was the
            other way round. Both config calls below are unchanged, so
            Ads conversions are unaffected.

            Worth recording why this was looked at. From 21 July 2026 the
            GA4 property received no browser events at all while
            server-side conversions kept arriving. The cause was at
            Google's end: gtag/js for the measurement id G-JR2WXNSLEL
            returned 404 while the sister site's id returned 508KB of
            container, even though Google's own admin API listed the
            stream as live and unmodified since April. A new data stream
            was created and served immediately. The old one is left in
            place rather than deleted, because sources disagree on
            whether deleting a stream removes its history and there is
            nothing to gain by finding out on a live account. */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID || GTAG_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: [
              "window.dataLayer = window.dataLayer || [];",
              "function gtag(){dataLayer.push(arguments);}",
              "gtag('js', new Date());",
              // ── Consent Mode v2 ADVANCED, the lever that brings denied-
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
              // ── The stored decision, applied before the first hit ──
              // A returning visitor who already accepted was having every
              // subsequent first-page-view counted as a refusal. The banner
              // re-applies their choice, but it is a React component: the
              // effect that does it runs after hydration, and gtag has sent
              // the page_view long before that. So analytics_storage was
              // denied at the only moment that mattered, on every visit, for
              // everybody.
              //
              // What that looked like in the property: 1 to 7 users a day,
              // zero sessions, zero page views, for a site running paid
              // search. GA4 cannot form a session or record a page view from
              // a cookieless ping, and this property will never hit the
              // volume Google needs before it models the gap.
              //
              // Read here, synchronously, before the consent default, so a
              // visitor who consented last week is counted this week.
              "var ssStored = null;",
              "try {",
              "  var ssRaw = localStorage.getItem('ss_consent');",
              "  if (ssRaw) {",
              "    var ssSaved = JSON.parse(ssRaw);",
              // Same twelve month window the banner enforces. Expired means
              // undecided, not granted.
              "    if (ssSaved && Date.now() - ssSaved.decidedAt < 31536000000) ssStored = ssSaved.decision;",
              "  }",
              "} catch (e) {}",
              "var ssGrant = ssStored === 'granted' ? 'granted' : 'denied';",
              // ── Consent Mode v2 default (REQUIRED for EEA/UK ad processing) ──
              // Default everything to denied. CookieBanner.tsx fires
              // gtag('consent','update',…) once the user makes a choice.
              // This MUST run before any gtag('config',…) call.
              "gtag('consent', 'default', {",
              "  ad_storage: ssGrant,",
              "  ad_user_data: ssGrant,",
              "  ad_personalization: ssGrant,",
              "  analytics_storage: ssGrant,",
              // 500ms was shorter than the banner took to appear, so a
              // first-time visitor's page_view was always sent before there
              // was anything on screen to consent to. Two seconds is the
              // upper end of what Google documents and still imperceptible.
              "  wait_for_update: 2000",
              "});",
              // Google Ads
              "gtag('config', " + JSON.stringify(GTAG_ID) + ", { allow_enhanced_conversions: true });",
              // GA4 (only configured when the measurement ID env var is set)
              GA4_ID
                ? "gtag('config', " + JSON.stringify(GA4_ID) + ");"
                : "// GA4 disabled, set NEXT_PUBLIC_GA4_MEASUREMENT_ID to enable",
              // Phone-call conversion (Google Ads call tracking).
              // .trim() is load-bearing: Vercel env vars can carry a
              // trailing \n from copy-paste. Without trimming, gtag was
              // configuring against the literal label "<id>\n" which
              // Google Ads rejects as unknown, silently dropping every
              // phone-call conversion. Discovered 2026-05-14 after a
              // confirmed phone lead didn't register against the account.
              "var callLabel = " + JSON.stringify((process.env.NEXT_PUBLIC_GADS_CALL_LABEL || "").trim()) + ";",
              "if (callLabel) {",
              "  gtag('config', " + JSON.stringify(GTAG_ID) + " + '/' + callLabel, {",
              "    phone_conversion_number: " + JSON.stringify(BUSINESS_PHONE_CALL_TRACKING),
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
        {/*
          Skip-to-content link. Must be the FIRST focusable element in the
          DOM. Invisible until focused (keyboard Tab on desktop, screen-
          reader swipe on mobile via VoiceOver/TalkBack). When activated
          it jumps focus past the sticky review strip + Navbar + cart icon
          to the page content, saves ~15-20 Tab presses on every page
          load for keyboard and assistive-tech users. The styling is in
          globals.css under `.skip-link` and `.skip-link:focus`.
        */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <CartProvider>
          <GclidCapture />
          <PhoneClickTracker />
          <Navbar />
          <main id="main-content" className="min-h-screen">{children}</main>
          <CartDrawer />
          <Footer />
          <CookieBanner />
        </CartProvider>
      </body>
    </html>
  );
}
