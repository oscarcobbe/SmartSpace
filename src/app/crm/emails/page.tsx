import Link from "next/link";
import { requireSession } from "@/lib/crm/session";
import Studio, { type SignoffBadge } from "@/components/email-studio/Studio";
import { ENTRIES } from "@/lib/email/catalogue";
import { sclCatalogue } from "@/lib/email/scl-catalogue";
import { itemForStudioEntry } from "@/lib/signoff/items";
import { allApprovals } from "@/lib/signoff/state";
import { PageHeader, Note } from "../ui";
import { SIGNOFF_BADGE } from "../signoff/badges";

export const dynamic = "force-dynamic";

/**
 * Every email and text a customer gets, inside the CRM, so Nigel reads them
 * where he signs them off. Rendered from the same functions that send them;
 * the examples use an invented customer. Signed in as SmartCare Living, the
 * list is SmartCare Living's, fetched from that site (lib/email/scl-catalogue).
 */
export default async function EmailsPage({ searchParams }: { searchParams: { e?: string; v?: string } }) {
  const { site } = requireSession();
  const isScl = site !== "smart-space";
  const scl = isScl ? await sclCatalogue() : null;
  const showScl = Boolean(scl && scl.entries.length);
  const { states, problem } = await allApprovals();

  const signoff: Record<string, SignoffBadge> = {};
  for (const e of ENTRIES) {
    const item = itemForStudioEntry(e.id);
    const state = item ? states.get(item.id) : undefined;
    if (!item || !state) continue;
    signoff[e.id] = { ...SIGNOFF_BADGE[state.state], href: `/crm/signoff#${item.id}` };
  }

  return (
    <>
      <PageHeader
        title="Emails and texts"
        sub={`Every message a customer gets from ${showScl ? "SmartCare Living" : "Smart Space"}, in the order they get it, shown exactly as it is sent. The examples use a made-up customer.`}
        aside={
          <Link href="/crm/signoff" className="inline-flex min-h-[40px] items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800">
            Go to Sign-off
          </Link>
        }
      />
      <div className="mb-5 space-y-3">
        {isScl && !showScl && <Note tone="warn">{scl?.problem ?? "SmartCare Living's emails could not be loaded."} Showing Smart Space&apos;s messages instead.</Note>}
        {showScl && <Note>SmartCare Living&apos;s emails are not in Sign-off yet: the four quiz follow-ups are designs, and nothing sends them until they are.</Note>}
        {problem && <Note tone="warn">{problem}</Note>}
      </div>
      {showScl && scl ? (
        <Studio basePath="/crm/emails" entryId={searchParams.e} view={searchParams.v} entries={scl.entries} stages={scl.stages} />
      ) : (
        <Studio basePath="/crm/emails" entryId={searchParams.e} view={searchParams.v} signoff={signoff} />
      )}
    </>
  );
}
