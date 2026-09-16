import { Suspense } from "react";
import { currentSession, SITE_LABEL } from "@/lib/crm/session";
import { THIS_SITE } from "@/lib/crm/db";
import LoginForm from "./login-form";
import { PageHeader } from "./ui";
import { NeedsYou, LatestIn, MoneyThisMonth, AdsThisMonth, RecentActivity, PanelSkeleton } from "./overview-panels";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  missing: "That link was incomplete. Ask for a new one below.",
  expired: "That link has already been used or has run out. Ask for a new one below.",
};

/** "Good morning" at nine, not at nine at night. Dublin, because the machine
 *  this renders on is not in Ireland and has said so before. */
function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function CrmHome({ searchParams }: { searchParams: { error?: string } }) {
  const session = currentSession();

  if (session) {
    const today = new Intl.DateTimeFormat("en-IE", {
      timeZone: "Europe/Dublin", weekday: "long", day: "numeric", month: "long",
    }).format(new Date());

    return (
      <>
        <PageHeader
          title={greeting()}
          sub={`${SITE_LABEL[session.site]}, ${today}.`}
        />

        {/* Four reads of three different services. Each panel streams in on its
            own, so the fastest is on screen while Google Ads is still
            answering, instead of the page waiting for the slowest. */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<PanelSkeleton title="Needs you" rows={4} />}>
            <NeedsYou site={session.site} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Latest in" rows={4} />}>
            <LatestIn site={session.site} />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Money" rows={2} />}>
            <MoneyThisMonth />
          </Suspense>
          <Suspense fallback={<PanelSkeleton title="Advertising" rows={2} />}>
            <AdsThisMonth site={session.site} />
          </Suspense>
          <div className="lg:col-span-2">
            <Suspense fallback={null}>
              <RecentActivity site={session.site} />
            </Suspense>
          </div>
        </div>
      </>
    );
  }

  const message = searchParams.error ? MESSAGES[searchParams.error] ?? MESSAGES.expired : null;

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
        <p className="mt-1.5 text-sm text-slate-600">
          Enter your email address and we will send you a link. There is no password to remember.
        </p>
        {message && (
          <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {message}
          </p>
        )}
        <LoginForm site={THIS_SITE} />
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Orders, finance and marketing for {SITE_LABEL[THIS_SITE]}.
      </p>
    </div>
  );
}
