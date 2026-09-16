import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { crmConfigured } from "@/lib/crm/db";
import { PageHeader, Note } from "../../ui";
import ImportForm from "./form";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  requireSession();

  return (
    <>
      <Link href="/crm/finance" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Finance
      </Link>

      <PageHeader
        title="Import a bank statement"
        sub="Finance reads Stripe, which is card payments and nothing else. This is for the rest: transfers in, money out, and the fees."
      />

      {!crmConfigured() ? (
        <Note tone="warn">The database is not connected on this deployment, so nothing can be imported yet.</Note>
      ) : (
        <div className="max-w-2xl space-y-6">
          <Note>
            In Revolut Business, open the account, choose Statement, pick the dates and export as
            CSV. Upload it here and you will be shown what was read before anything is saved.
          </Note>
          <ImportForm />
        </div>
      )}
    </>
  );
}
