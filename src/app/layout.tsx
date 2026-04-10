import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/context/CartContext";
import GclidCapture from "@/components/GclidCapture";

export const metadata: Metadata = {
  title: "Smart Space | Ring Doorbells & Security Cameras Leinster",
  description:
    "Leinster's trusted Ring installer. Shop Ring doorbells, security cameras and smart home bundles. Professional installation available.",
  keywords:
    "Ring doorbell Leinster, Ring camera Leinster, Ring security, smart home Leinster, Ring installer Dublin",
  openGraph: {
    title: "Smart Space | Ring Doorbells & Security Cameras Leinster",
    description:
      "Shop Ring doorbells and security cameras. Professional installation across Leinster.",
    type: "website",
  },
};

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
        {/* Google Ads tag */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17978501655" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-17978501655');
        `}} />
      </head>
      <body className="antialiased bg-white text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
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
