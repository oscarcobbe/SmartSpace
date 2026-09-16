import type { Metadata } from "next";
import Link from "next/link";
import { currentSession, SITE_LABEL } from "@/lib/crm/session";
import CrmNav from "./nav";

export const metadata: Metadata = {
  title: "CRM",
  /* The CRM must never be indexed. The login page is linked from nowhere, but
     a crawler that finds it would otherwise put a customer database's front
     door into search results. */
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = currentSession();

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight">{SITE_LABEL[session.site]}</span>
          </div>
          <CrmNav site={session.site} />
          <div className="mt-auto border-t border-slate-200 px-5 py-4">
            <p className="truncate text-xs text-slate-500" title={session.email}>{session.email}</p>
            <form action="/api/crm/logout" method="post">
              <button type="submit" className="mt-1 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 lg:hidden">
            <Link href="/crm/orders" className="text-sm font-semibold tracking-tight">
              {SITE_LABEL[session.site]} CRM
            </Link>
            <form action="/api/crm/logout" method="post">
              <button type="submit" className="text-xs font-medium text-slate-600">Sign out</button>
            </form>
          </header>
          <div className="border-b border-slate-200 bg-white px-2 lg:hidden">
            <CrmNav site={session.site} horizontal />
          </div>
          <main className="min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
