"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X, ShoppingBag, Star } from "lucide-react";
import { useCart } from "@/context/CartContext";

/** The home network pages are signed off and switched on (Vercel, NEXT_PUBLIC_NETWORK_PAGES_LIVE). */
const NETWORK_LIVE = process.env.NEXT_PUBLIC_NETWORK_PAGES_LIVE === "1";

const navLinks = [
  { href: "/services", label: "Services" },
  /* The home network service under its own name, listed once its pages are
     signed off and switched on, like the footer's links (Footer.tsx). */
  ...(NETWORK_LIVE ? [{ href: "/services/wifi", label: "SmartSpace Networks" }] : []),
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/** The current section. Services stays unlit on the network pages, which have their own item. */
function isActive(href: string, pathname: string): boolean {
  if (href === "/services" && (pathname === "/services/wifi" || pathname.startsWith("/services/wifi/"))) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { totalQuantity, openCart } = useCart();

  const totalItems = totalQuantity;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {!NETWORK_LIVE && (
        /* Review strip, until the network pages are switched on */
        <Link
          href="/reviews"
          className="fixed top-0 left-0 right-0 z-[60] bg-[#1a1a1a] text-white text-center py-1 px-4 text-xs font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
        >
          <span className="inline-flex items-center gap-0.5 text-yellow-400">
            <Star className="w-3 h-3 fill-yellow-400" />
            <Star className="w-3 h-3 fill-yellow-400" />
            <Star className="w-3 h-3 fill-yellow-400" />
            <Star className="w-3 h-3 fill-yellow-400" />
            <Star className="w-3 h-3 fill-yellow-400" />
          </span>
          <span className="font-semibold">on Google</span>
          <span className="hidden sm:inline text-white/60">·</span>
          <span className="hidden sm:inline">5,000+ installations across Dublin &amp; Leinster</span>
        </Link>
      )}

      {/* Nav */}
      <header
        className={`fixed ${NETWORK_LIVE ? "top-0" : "top-[24px]"} left-0 right-0 z-50 transition-all duration-200 bg-white ${
          scrolled || isOpen ? "shadow-sm" : ""
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 88px with the banner under it (88 + 32 = the 120px every page clears), 96px without. */}
          <div className={`flex items-center justify-between ${NETWORK_LIVE ? "h-[88px]" : "h-24"}`}>
            {/* Logo */}
            <Link href="/" aria-label="Smart Space, home">
              <Image
                src="/Logo1.png"
                alt="Smart Space"
                width={653}
                height={504}
                priority
                className="h-16 sm:h-20 w-auto"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive(link.href, pathname)
                      ? "text-brand-500"
                      : "text-[#555] hover:text-[#1a1a1a]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop Cart */}
            <div className="hidden md:flex items-center">
              <button onClick={openCart} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Open cart">
                <ShoppingBag className="w-5 h-5 text-[#1a1a1a]" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile: Cart + toggle */}
            <div className="flex md:hidden items-center gap-2">
              <button onClick={openCart} className="relative p-2" aria-label="Open cart">
                <ShoppingBag className="w-5 h-5 text-[#1a1a1a]" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-[#1a1a1a]"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden border-t border-[#eee] py-4 space-y-1 bg-white">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block py-2.5 px-2 text-sm font-medium text-[#333] hover:text-brand-500"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
        {NETWORK_LIVE && (
          /* "We've expanded" (Oscar, 13 Oct 2026): under the navigation, above every
             page's hero, 32px. The nav row gives up 8px so header and banner stay
             120px, the height every page already clears; the review strip that sat
             above the nav is gone. */
          <Link
            href="/services/wifi"
            aria-label="We've expanded: SmartSpace Networks. Try better Wi-Fi in your own home for 3 days."
            className="group relative flex h-8 items-center justify-center gap-2.5 overflow-hidden bg-[#0d0b09] px-4 text-xs sm:text-[13px] text-white tracking-[0.01em]"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_160%_at_50%_50%,rgba(242,130,34,0.45),rgba(242,130,34,0.10)_45%,transparent_75%)] transition-opacity duration-500 group-hover:opacity-90"
            />
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/70 to-transparent" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
            <span className="relative inline-flex items-center rounded-full bg-brand-500 px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0d0b09] shadow-[0_0_14px_rgba(242,130,34,0.7)]">
              We&apos;ve expanded
            </span>
            <span className="relative font-bold">SmartSpace Networks</span>
            <span className="relative hidden md:inline text-white/70">· Try better Wi-Fi in your own home for 3 days</span>
            <ArrowRight
              aria-hidden="true"
              className="relative h-3.5 w-3.5 text-brand-400 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </Link>
        )}
      </header>
    </>
  );
}
