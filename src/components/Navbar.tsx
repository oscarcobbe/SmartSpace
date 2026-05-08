"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag, Star } from "lucide-react";
import { useCart } from "@/context/CartContext";

const navLinks = [
  { href: "/services", label: "Services" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

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
      {/* Review strip */}
      <Link
        href="/reviews"
        className="focus-ring-light fixed top-0 left-0 right-0 z-[60] bg-surface-dark text-white text-center py-1 px-4 text-xs font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
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

      {/* Nav */}
      <header
        className={`fixed top-[24px] left-0 right-0 z-50 transition-all duration-200 bg-white ${
          scrolled || isOpen ? "shadow-sm" : ""
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            {/* Logo */}
            <Link href="/" className="focus-ring rounded-md" aria-label="Smart Space, home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo1.png" alt="Smart Space" className="h-16 sm:h-20 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`focus-ring text-sm font-medium transition-colors ${
                    pathname === link.href || pathname.startsWith(link.href + "/")
                      ? "text-brand-700"
                      : "text-ink-3 hover:text-ink-1"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop Cart */}
            <div className="hidden md:flex items-center">
              <button onClick={openCart} className="focus-ring relative p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Open cart">
                <ShoppingBag className="w-5 h-5 text-ink-1" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-brand-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile: Cart + toggle. p-3 lifts the touch area to ≥44×44
                (icon 20px + 12px×2 padding = 44px) per WCAG 2.5.5 AA. */}
            <div className="flex md:hidden items-center gap-1">
              <button onClick={openCart} className="focus-ring relative p-3 rounded-full" aria-label="Open cart">
                <ShoppingBag className="w-5 h-5 text-ink-1" />
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 bg-brand-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="focus-ring p-3 rounded-full text-ink-1"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isOpen && (
            <div className="md:hidden border-t border-gray-100 py-4 space-y-1 bg-white">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="focus-ring block py-2.5 px-2 text-sm font-medium text-ink-2 hover:text-brand-700"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
