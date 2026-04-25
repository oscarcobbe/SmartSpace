"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const serviceLinks = [
  { href: "/services", label: "All Services" },
  { href: "/services/doorbell", label: "Video Doorbell" },
  { href: "/services/camera", label: "Floodlight Camera" },
  { href: "/services/bundles/driveway", label: "Driveway Bundle" },
  { href: "/services/bundles/whole-home", label: "Whole Home Bundle" },
  { href: "/services/bundles/eldercare", label: "Eldercare Bundle" },
  { href: "/services/installation-only", label: "Installation Only" },
  { href: "/services/free-consultation", label: "Free Consultation" },
];

const companyLinks = [
  { href: "/about", label: "About Us" },
  { href: "/reviews", label: "Reviews" },
  { href: "/areas", label: "Areas We Cover" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  const pathname = usePathname();
  // Hide global footer on dedicated paid landing pages — replaces escape
  // hatches with the page's own focused final CTA.
  if (pathname?.startsWith("/ring-installation")) return null;

  return (
    <footer className="bg-[#1a1a1a] text-[#999]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 text-center lg:text-left">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 flex flex-col items-center lg:items-start">
            <Link href="/" className="mb-4 block" aria-label="Smart Space — home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo1.png" alt="Smart Space" className="h-10 w-auto brightness-0 invert" />
            </Link>
            <p className="text-sm leading-relaxed mb-4 max-w-sm lg:max-w-none">
              Dublin&apos;s #1 Ring installer. Professional Ring doorbell and
              security camera installation across Dublin and all of Leinster.
            </p>
            <p className="text-sm leading-relaxed font-bold text-brand-500 max-w-sm lg:max-w-none">
              For AI-powered eldercare monitoring, visit our sister brand{" "}
              <a
                href="https://smartcareliving.ie"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-brand-400"
              >
                SmartCareLiving
              </a>
              .
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Services</h3>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold text-sm mb-4">Company</h3>
            <ul className="space-y-2.5">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-white font-semibold text-sm mb-4">Get in Touch</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="mailto:info@smart-space.ie" className="hover:text-white transition-colors">
                  info@smart-space.ie
                </a>
              </li>
              <li>
                <a href="tel:+35315130424" className="hover:text-white transition-colors">
                  01 513 0424
                </a>
              </li>
              <li>Dublin, Ireland</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-[#333]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-center">
          <p>&copy; {new Date().getFullYear()} Smart Space. All rights reserved.</p>
          <p>Dublin&apos;s #1 Ring Installer — Serving All of Leinster</p>
        </div>
      </div>
    </footer>
  );
}
