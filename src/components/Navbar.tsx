"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";

const navLinks = [
  { href: "/products", label: "Products" },
  { href: "/installation", label: "Installation" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "https://smartcareliving.ie", label: "SmartGuardian", external: true },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { cart, openCart } = useCart();

  const totalItems = cart?.totalQuantity ?? 0;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Promo strip */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-brand-500 text-white text-center py-2 px-4 text-sm font-medium">
        Save up to 58% on Ring Camera Bundles.{" "}
        <Link href="/products" className="underline font-bold">
          Shop Deals
        </Link>
      </div>

      {/* Nav */}
      <header
        className={`fixed top-[36px] left-0 right-0 z-50 transition-all duration-200 ${
          scrolled || isOpen
            ? "bg-white/95 backdrop-blur-md shadow-sm"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            {/* Logo */}
            <Link href="/">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo1.png" alt="Smart Space" className="h-20 w-auto" />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium transition-colors text-[#555] hover:text-[#1a1a1a]"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium transition-colors ${
                      pathname === link.href
                        ? "text-brand-500"
                        : "text-[#555] hover:text-[#1a1a1a]"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>

            {/* Desktop CTA + Cart */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/products"
                className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-colors"
              >
                Shop Now
              </Link>
              <button onClick={openCart} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
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
              <button onClick={openCart} className="relative p-2">
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
              {navLinks.map((link) =>
                link.external ? (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="block py-2.5 px-2 text-sm font-medium text-[#333] hover:text-brand-500"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block py-2.5 px-2 text-sm font-medium text-[#333] hover:text-brand-500"
                  >
                    {link.label}
                  </Link>
                )
              )}
              <Link
                href="/products"
                onClick={() => setIsOpen(false)}
                className="block mt-3 text-center bg-brand-500 text-white font-semibold text-sm py-3 rounded-full"
              >
                Shop Now
              </Link>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
