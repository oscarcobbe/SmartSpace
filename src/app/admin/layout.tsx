"use client";

/**
 * Persistent admin shell, auth gate + sidebar that stays visible on
 * every /admin/* page so the menu is always one click away. No more
 * navigating back to a hub to switch tools.
 *
 * Auth lives at the layout level: sessionStorage["admin_key"], or the CRM
 * session cookie from the dashboard password (see crmSessionFrom). When
 * empty, the layout renders a full-screen password form INSTEAD of the
 * children, so no admin sub-page ever shows its content unauthenticated.
 * Sub-pages can therefore drop their own auth gates and assume access.
 *
 * Adding a tool? Drop an entry into NAV_ITEMS below. Anything under
 * /admin/* is already excluded from indexing via robots.ts.
 */

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS: { href: string; label: string; blurb: string }[] = [
  { href: "/admin/leads", label: "Leads dashboard", blurb: "Bookings, contacts, revenue" },
  { href: "/admin/conversion-test", label: "Conversion test", blurb: "Verify Google Ads pipeline" },
];

/* Signed in with the dashboard password, the leads dashboard works and the
   conversion test does not: that one still takes the admin key. */
const DASHBOARD_ONLY = ["/admin/leads"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [withKey, setWithKey] = useState(false);
  const router = useRouter();
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // If a page kicked us back here because the key stopped working mid
    // session, say so instead of silently showing a blank login.
    if (sessionStorage.getItem("admin_key_expired")) {
      sessionStorage.removeItem("admin_key_expired");
      setError("Your session expired, please sign in again.");
    }
    if (sessionStorage.getItem("admin_key")) {
      setWithKey(true);
      setAuthed(true);
      return;
    }
    // No key: already signed in with the dashboard password? The cookie lasts
    // thirty days, so he types it once a month, here or at /crm.
    fetch("/api/admin/leads?verify=1", { cache: "no-store" })
      .then((r) => setAuthed(r.ok))
      .catch(() => setAuthed(false));
  }, []);

  useEffect(() => {
    if (authed && !withKey && !DASHBOARD_ONLY.some((p) => pathname.startsWith(p))) {
      router.replace("/admin/leads");
    }
  }, [authed, withKey, pathname, router]);

  async function handleAuth(e: FormEvent) {
    e.preventDefault();
    const k = keyInput.trim();
    if (!k) {
      setError("Enter the admin key");
      return;
    }
    setChecking(true);
    setError("");
    try {
      // Verify the key BEFORE storing it, so a wrong key shows an error
      // here instead of storing junk, loading the dashboard, hitting a 401
      // and bouncing back (the old "lag out"). ?verify=1 is a fast check.
      const res = await fetch("/api/admin/leads?verify=1", {
        headers: { Authorization: `Bearer ${k}` },
        cache: "no-store",
      });
      if (res.status === 401) {
        /* Not the admin key, so try it as the dashboard password.
           Since 17 September the admin key and the dashboard password are
           two different things: ADMIN_KEY was rotated to 64 characters
           because the customer feed it guards is also read by other systems.
           The dashboard password is still the short one Nigel was given, and
           he types it here, where it used to work, and was told "Incorrect
           admin key". The value goes to the CRM's own sign-in, which checks
           it exactly as /crm does (same compare, same rate limit, same thirty
           day session). If it is the dashboard password he lands in the CRM
           signed in, and since 24 September that session opens the leads
           dashboard here as well. The admin key itself does not change. */
        const crm = await fetch("/api/crm/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: k }),
        }).catch(() => null);
        if (crm?.ok) {
          window.location.href = "/admin/leads";
          return;
        }
        setError("Incorrect admin key.");
        setChecking(false);
        return;
      }
      if (res.status === 429) {
        setError("Too many attempts, wait a minute and try again.");
        setChecking(false);
        return;
      }
      if (!res.ok) {
        setError("Something went wrong, please try again.");
        setChecking(false);
        return;
      }
      // Verified. Store it and reload so the admin pages mount with the key.
      sessionStorage.setItem("admin_key", k);
      setAuthed(true);
      window.location.reload();
    } catch {
      setError("Could not reach the server, check your connection.");
      setChecking(false);
    }
  }

  async function clearKey() {
    sessionStorage.removeItem("admin_key");
    // Signed in with the dashboard password, signing out ends that session,
    // which is also the /crm one.
    if (!withKey) await fetch("/api/crm/logout", { method: "POST" }).catch(() => null);
    setAuthed(false);
    setKeyInput("");
    window.location.reload();
  }

  // Hide the public-site chrome on every admin page (header, footer,
  // promo bar). Inlined as a <style> tag because the alternative,
  // conditional rendering of Navbar/Footer based on the URL, would
  // require lifting state into the root layout, which is server-only.
  const hideSiteChrome = (
    <style>{`header, footer, header + div, .fixed.top-0.bg-brand-500 { display: none !important; }`}</style>
  );

  // Initial mount before the sign-in is known, or a key-only page about to be
  // swapped for the leads dashboard.
  const leaving = !!authed && !withKey && !DASHBOARD_ONLY.some((p) => pathname.startsWith(p));
  if (authed === null || leaving) {
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
            {/* Hidden username so the browser / iCloud Keychain saves this as a
                proper credential and can autofill it behind Face ID or Touch ID
                on the next visit. */}
            <input type="text" name="username" autoComplete="username" value="smartspace-admin" readOnly hidden />
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Admin key"
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            />
            <button
              type="submit"
              disabled={checking}
              className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {checking ? "Checking..." : "Continue"}
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
        {/* Sidebar, visible on every authed admin page. Mobile: stacked
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
            {NAV_ITEMS.filter((item) => withKey || DASHBOARD_ONLY.includes(item.href)).map((item) => {
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

          {/* Sign-out (desktop), pinned to bottom of sidebar */}
          <div className="hidden lg:block lg:absolute lg:bottom-0 lg:inset-x-0 px-5 py-4 border-t border-white/10">
            <button
              onClick={clearKey}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Content area, offset on desktop to account for fixed sidebar */}
        <main className="flex-1 lg:ml-60 min-h-screen">
          {children}
        </main>
      </div>
    </>
  );
}
