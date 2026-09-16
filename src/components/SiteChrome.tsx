"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { CartProvider } from "@/context/CartContext";
import GclidCapture from "@/components/GclidCapture";
import CookieBanner from "@/components/CookieBanner";
import VisitBeacon from "@/components/VisitBeacon";
import PhoneClickTracker from "@/components/PhoneClickTracker";
import EngagementTracker from "@/components/EngagementTracker";

/**
 * The marketing site's furniture, and where it stops.
 *
 * /crm is an application, not a page on the website. Before this, it inherited
 * the whole root layout: the fixed navbar sat on top of the CRM's own sidebar,
 * the review strip and the footer bracketed a customer database, and the cart
 * drawer was mounted over it. It also inherited every tracker, so Nigel
 * scrolling through his own orders was filing scroll_depth and rage_click
 * events into the same GA4 property the ads are judged by, and VisitBeacon was
 * posting an admin visit to the portal on every page.
 *
 * The alternative was moving twenty route directories into a (site) group so
 * the CRM could have its own root layout. That is the textbook answer and it
 * changes the file that 404s, the file that catches errors, and the static
 * generation of every marketing page. This changes one import and nothing else,
 * and the marketing pages render byte for byte as they did, because usePathname
 * resolves at build time for them exactly as it does at runtime here.
 */
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  if (path?.startsWith("/crm")) return <>{children}</>;

  return (
    <CartProvider>
      {/* Skip-to-content must be the first focusable element in the DOM. It
          jumps past the review strip, the navbar and the cart icon, which is
          fifteen to twenty Tab presses on every page load. It lives here
          rather than in the root layout because its target, #main-content,
          lives here too, and on /crm there is nothing for it to point at. */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <GclidCapture />
      <PhoneClickTracker />
      <EngagementTracker />
      <Navbar />
      <main id="main-content" className="min-h-screen">{children}</main>
      <CartDrawer />
      <Footer />
      <CookieBanner />
      <VisitBeacon />
    </CartProvider>
  );
}
