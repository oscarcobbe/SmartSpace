"use client";

/**
 * Thin top bar shown on every /admin/* sub-page (but NOT on the /admin
 * hub itself). Single purpose: a back-link to the hub so you don't have
 * to remember sub-page URLs. Hidden on /admin to avoid the empty-back
 * link stutter.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminBackBar() {
  const pathname = usePathname();

  // Don't render on the hub itself
  if (pathname === "/admin" || pathname === "/admin/") return null;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span aria-hidden>←</span> Admin home
        </Link>
        <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
          Smart Space Admin
        </span>
      </div>
    </div>
  );
}
