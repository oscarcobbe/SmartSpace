import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { crmConfigured } from "@/lib/crm/db";
import { PageHeader, Note } from "../../ui";
import NewCustomerForm from "./form";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  requireSession();
  return (
    <>
      <Link href="/crm/contacts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Customers
      </Link>
      <PageHeader
        title="Add a customer"
        sub="For somebody who rang, or who you met on a job. Everything else arrives here on its own."
      />
      {!crmConfigured()
        ? <Note tone="warn">The database is not connected on this deployment yet.</Note>
        : <div className="max-w-xl"><NewCustomerForm /></div>}
    </>
  );
}
