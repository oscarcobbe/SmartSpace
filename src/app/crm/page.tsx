import { redirect } from "next/navigation";
import { currentSession } from "@/lib/crm/session";
import { THIS_SITE } from "@/lib/crm/db";
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
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Enter your email address and we will send you a link. There is no password to remember.
      </p>
      {message && (
        <p role="status" className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </p>
      )}
      <LoginForm site={THIS_SITE} />
    </div>
  );
}
