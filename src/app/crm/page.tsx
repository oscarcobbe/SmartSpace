import { Suspense } from "react";
import { notFound } from "next/navigation";
import { currentSession, SITE_LABEL } from "@/lib/crm/session";
import { THIS_SITE, crmConfigured } from "@/lib/crm/db";
import LoginForm from "./login-form";
import { PageHeader } from "./ui";
import { NeedsYou, LatestIn, MoneyThisMonth, AdsThisMonth, RecentActivity, PanelSkeleton } from "./overview-panels";
import { greeting, slowNote, todayLine } from "./loading-copy";

export const dynamic = "force-dynamic";
/* SmartCare Living's enquiry sheet can take most of a minute to wake. The
   panels stream, so the page is on screen long before that; this is the
   budget for the last panel to arrive rather than a wait anybody sits
   through. Declared, not assumed: the platform default is not something to
   find out from a 504. */
export const maxDuration = 60;

export default function CrmHome() {
  const session = currentSession();

  /* Until the database is wired up there is no CRM, so it does not exist.
     A sign-in form on a public domain that cannot possibly sign anybody in is
     an invitation to probe it and a thing a customer might find and ask about.
     Setting SMARTCRM_URL, SMARTCRM_ANON_KEY and SMARTCRM_KEY brings it into being. */
  if (!session && !crmConfigured()) notFound();

  if (session) {
    const slow = slowNote(session.site, "orders");
    return (
      <>
        <PageHeader title={greeting()} sub={todayLine(SITE_LABEL[session.site])} />

        {/* Four reads of three different services. Each panel streams in on its
            own, so the fastest is on screen while Google Ads is still
            answering, instead of the page waiting for the slowest. */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Suspense fallback={<PanelSkeleton title="Diary" rows={4} slow={slow} />}>
            <NeedsYou site={session.site} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Latest in" rows={4} slow={slow} />}>
            <LatestIn site={session.site} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Money" rows={2} />}>
            <MoneyThisMonth site={session.site} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Advertising" rows={2} />}>
            <AdsThisMonth site={session.site} />
          </Suspense>
          <div className="lg:col-span-2">
            <Suspense fallback={<PanelSkeleton title="Recently" rows={3} />}>
              <RecentActivity site={session.site} />
            </Suspense>
          </div>
        </div>
      </>
    );
  }

  return (
    <div>
      {/* Named, because the first thing a person sees should tell them what
          they are signing into. The page carried no brand at all. */}
      <div className="mb-6 flex items-center gap-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-tight text-slate-900">{SITE_LABEL[THIS_SITE]}</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p className="mt-1.5 text-sm text-slate-600">Enter the password to continue.</p>
        <LoginForm />
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Orders, finance and marketing for {SITE_LABEL[THIS_SITE]}.
      </p>
    </div>
  );
}
