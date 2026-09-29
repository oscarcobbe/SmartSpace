import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Studio from "@/components/email-studio/Studio";

/**
 * The email studio without the CRM, for designing under next dev. The same
 * component Nigel reads at /crm/emails. A production build answers 404 here
 * and in middleware.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email studio | Smart Space",
  robots: { index: false, follow: false },
};

export default function DevEmailStudio({ searchParams }: { searchParams: { e?: string; v?: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-6">
          <span className="font-semibold">Smart Space · Email studio</span>
          <span className="ml-auto text-xs text-white/60">Local design copy. Nigel reads and signs these off in the CRM.</span>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <Studio basePath="/dev/emails" entryId={searchParams.e} view={searchParams.v} />
      </main>
    </div>
  );
}
