import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/context/CartContext";
import GclidCapture from "@/components/GclidCapture";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.smart-space.ie"),
  title: "Smart Space | Ring Doorbells & Security Cameras Leinster",
  description:
    "Leinster's trusted Ring installer. Shop Ring doorbells, security cameras and smart home bundles. Professional installation available.",
  keywords:
    "Ring doorbell Leinster, Ring camera Leinster, Ring security, smart home Leinster, Ring installer Dublin",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Smart Space | Ring Doorbells & Security Cameras Leinster",
    description:
      "Shop Ring doorbells and security cameras. Professional installation across Leinster.",
    type: "website",
    url: "https://www.smart-space.ie",
    siteName: "Smart Space",
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
// Business phone number shown on the site — Google Ads replaces this with a
// tracked forwarding number for website call reporting (configured in Goals →
// Conversions → Phone calls → Calls from a phone number on your website).
const BUSINESS_PHONE = "+35315130424";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
