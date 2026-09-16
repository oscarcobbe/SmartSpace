import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { currentSession, SITE_LABEL } from "@/lib/crm/session";
import CrmNav from "./nav";

export const metadata: Metadata = {
  title: "CRM",
  /* The CRM must never be indexed. The login page is linked from nowhere, but
     a crawler that found it would otherwise put a customer database's front
     door into search results. */
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = currentSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <main id="crm-main" className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-16">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <a href="#crm-main" className="skip-link">Skip to content</a>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-5">
            {/* The brand mark is the only orange in the chrome, so the eye has
                one place to learn which of the two businesses this is. */}
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden="true" />
            <span className="truncate text-sm font-semibold tracking-tight">{SITE_LABEL[session.site]}</span>
          </div>
          <CrmNav site={session.site} />
          <div className="mt-auto border-t border-slate-200 p-3">
            <p className="truncate px-3 pb-1 text-xs text-slate-500" title={session.email}>{session.email}</p>
            <form action="/api/crm/logout" method="post">
              <button
                type="submit"
                className="flex min-h-[38px] w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
            <header className="flex h-14 items-center justify-between gap-4 px-4">
              <Link href="/crm" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden="true" />
                {SITE_LABEL[session.site]}
              </Link>
              <form action="/api/crm/logout" method="post">
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            </header>
            <div className="px-3">
              <CrmNav site={session.site} horizontal />
            </div>
          </div>
          <main id="crm-main" className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 py-6 sm:px-5 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
