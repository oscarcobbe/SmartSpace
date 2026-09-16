import { redirect } from "next/navigation";
import { currentSession } from "@/lib/crm/session";
import { THIS_SITE } from "@/lib/crm/db";
import { SITE_LABEL } from "@/lib/crm/session";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  missing: "That link was incomplete. Ask for a new one below.",
  expired: "That link has already been used or has run out. Ask for a new one below.",
};

export default function CrmLogin({ searchParams }: { searchParams: { error?: string } }) {
  if (currentSession()) redirect("/crm/orders");
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
