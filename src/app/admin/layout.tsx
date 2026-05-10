"use client";

/**
 * Persistent admin shell — auth gate + sidebar that stays visible on
 * every /admin/* page so the menu is always one click away. No more
 * navigating back to a hub to switch tools.
 *
 * Auth lives at the layout level (sessionStorage["admin_key"]). When
 * empty, the layout renders a full-screen password form INSTEAD of the
 * children, so no admin sub-page ever shows its content unauthenticated.
 * Sub-pages can therefore drop their own auth gates and assume access.
 *
 * Adding a tool? Drop an entry into NAV_ITEMS below. Anything under
 * /admin/* is already excluded from indexing via robots.ts.
 */

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; blurb: string }[] = [
  { href: "/admin/leads", label: "Leads dashboard", blurb: "Bookings, contacts, revenue" },
  { href: "/admin/conversion-test", label: "Conversion test", blurb: "Verify Google Ads pipeline" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    const stored = sessionStorage.getItem("admin_key");
    setAuthed(!!stored);
  }, []);

  function handleAuth(e: FormEvent) {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError("Enter the admin key");
      return;
    }
    sessionStorage.setItem("admin_key", keyInput.trim());
    setAuthed(true);
    setError("");
    // Force a full re-render of children so they pick up the key from
    // sessionStorage on their next mount cycle. setAuthed(true) alone
    // doesn't unmount/remount children — they'd still see no key in
    // their initial useEffect. window.location.reload guarantees a
    // clean state.
    window.location.reload();
  }

  function clearKey() {
    sessionStorage.removeItem("admin_key");
    setAuthed(false);
    setKeyInput("");
    window.location.reload();
  }

  // Hide the public-site chrome on every admin page (header, footer,
  // promo bar). Inlined as a <style> tag because the alternative —
  // conditional rendering of Navbar/Footer based on the URL — would
  // require lifting state into the root layout, which is server-only.
  const hideSiteChrome = (
    <style>{`header, footer, header + div, .fixed.top-0.bg-brand-500 { display: none !important; }`}</style>
  );

  // Initial mount before sessionStorage read
  if (authed === null) {
    return (
      <>
        {hideSiteChrome}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
        </div>
      </>
    );
  }

  // Pre-auth: full-screen form
  if (!authed) {
    return (
      <>
        {hideSiteChrome}
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <form onSubmit={handleAuth} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Smart Space Admin</h1>
            <p className="text-xs text-gray-500 mb-4">Enter the admin key to access internal tools.</p>
            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Admin key"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            />
            <button
              type="submit"
              className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </>
    );
  }

  // Authed: sidebar + content shell
  return (
    <>
      {hideSiteChrome}
      <div className="min-h-screen bg-gray-50 lg:flex">
        {/* Sidebar — visible on every authed admin page. Mobile: stacked
            top bar with horizontal-scrolling tabs. Desktop: fixed left
            rail with full menu. */}
        <aside className="lg:w-60 lg:min-h-screen lg:fixed lg:inset-y-0 lg:left-0 bg-gray-900 text-gray-100">
          <div className="px-5 py-4 lg:py-6 border-b border-white/10 flex items-center justify-between lg:block">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold">Smart Space</div>
              <div className="text-base font-bold text-white mt-0.5">Admin</div>
            </div>
            <button
              onClick={clearKey}
              className="lg:hidden text-[11px] text-gray-400 hover:text-white"
            >
              Sign out
            </button>
          </div>

          {/* Nav */}
          <nav className="px-3 py-3 lg:py-4 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-shrink-0 lg:flex-shrink rounded-lg px-3 py-2 lg:py-2.5 transition-colors text-sm whitespace-nowrap lg:whitespace-normal ${
                    active
                      ? "bg-white text-gray-900 font-semibold"
                      : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="font-semibold">{item.label}</div>
                  <div className={`text-[11px] hidden lg:block ${active ? "text-gray-500" : "text-gray-500"}`}>
                    {item.blurb}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Sign-out (desktop) — pinned to bottom of sidebar */}
          <div className="hidden lg:block lg:absolute lg:bottom-0 lg:inset-x-0 px-5 py-4 border-t border-white/10">
            <button
              onClick={clearKey}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Content area — offset on desktop to account for fixed sidebar */}
        <main className="flex-1 lg:ml-60 min-h-screen">
          {children}
        </main>
      </div>
    </>
  );
}
