import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { crmConfigured } from "@/lib/crm/db";
import { listAssessments, listPis, STAGES, type Assessment, type Pi } from "@/lib/network/store";
import { PageHeader, Panel, Note, Pill, Empty } from "../../ui";
import { online, piWorries } from "./parts";
import { ago, when, STAGE_TONE } from "./format";

export const dynamic = "force-dynamic";

/**
 * Every home network assessment, newest visit first, with what happens next.
 *
 * Each row opens the assessment, which is laid out in the order of Nigel's
 * capture sheet. The Pis are summarised at the top because the first question
 * on site is whether they are on.
 */

function next(a: Assessment): string {
  switch (a.stage) {
    case "booked":
      if (!a.drive?.folderId) return "Make the Drive folder";
      return a.visit_at ? `Visit ${when(a.visit_at)}` : "Set the visit date";
    case "visit": return "Socket hunt and trial install";
    case "trial": {
      const h = a.trial_started_at ? (Date.now() - Date.parse(a.trial_started_at)) / 3_600_000 : 0;
      return `Trial running, day ${Math.min(4, Math.floor(h / 24) + 1)}${a.collection_at ? `. Collection ${when(a.collection_at)}` : ""}`;
    }
    case "collected": return "Write and approve the report";
    case "reported": return "Report approved. Send it, then close";
    default: return "";
  }
}

function PiCard({ pi }: { pi: Pi }) {
  const up = online(pi);
  const worries = up ? piWorries(pi) : [];
  return (
    <Link href={`/crm/network/pis#pi-${pi.id}`} className="flex min-h-[56px] items-center gap-3 px-4 py-3 hover:bg-slate-50">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${up ? (worries.length ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-300"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{pi.name}</span>
        <span className="block text-xs text-slate-600">
          {pi.role === "node" ? "On the trial floor" : "At the router"}, {up ? `called in ${ago(pi.last_seen_at)}` : pi.last_seen_at ? `offline since ${ago(pi.last_seen_at)}` : "never called in"}
          {worries.length ? `. ${worries.join(", ")}` : ""}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
    </Link>
  );
}

export default async function Assessments() {
  const session = requireSession();
  if (session.site !== "smart-space") {
    return (
      <>
        <PageHeader title="Home network assessments" />
        <Note tone="warn">The network service is Smart Space&apos;s. Switch to Smart Space at the top of the menu.</Note>
      </>
    );
  }
  let rows: Assessment[] = [], pis: Pi[] = [], problem: string | null = null;
  if (!crmConfigured()) problem = "The database is not connected on this deployment.";
  else {
    try {
      [rows, pis] = await Promise.all([listAssessments(), listPis()]);
    } catch (err) {
      problem = `The assessments could not be read (${err instanceof Error ? err.message.slice(0, 160) : "no answer"}).`;
    }
  }
  const live = pis.filter((p) => !p.revoked_at);
  const open = rows.filter((r) => !["closed", "cancelled"].includes(r.stage));
  const done = rows.filter((r) => ["closed", "cancelled"].includes(r.stage));

  return (
    <>
      <PageHeader
        title="Home network assessments"
        sub="Booking to report, in the order of the capture sheet. The Pis are run from here: they call in, so nothing has to reach into the customer's house."
        aside={
          <Link href="/crm/network/assessments/new" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800">
            <Plus className="h-4 w-4" aria-hidden="true" /> Book an assessment
          </Link>
        }
      />
      {problem && <div className="mb-6"><Note tone="warn">{problem}</Note></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="Under way">
            {open.length === 0 ? (
              <Empty title="No assessments under way" detail="Book one when the €395 is paid." />
            ) : (
              <ul className="divide-y divide-slate-200">
                {open.map((a) => (
                  <li key={a.id}>
                    <Link href={`/crm/network/assessments/${a.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-slate-900">{a.customer_name}</span>
                          <Pill className={STAGE_TONE[a.stage]}>{STAGES.find((s) => s.value === a.stage)?.label ?? a.stage}</Pill>
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-600">{[a.address, next(a)].filter(Boolean).join(". ")}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {done.length > 0 && (
            <Panel title="Closed" tone="quiet">
              <ul className="divide-y divide-slate-200/80">
                {done.map((a) => (
                  <li key={a.id}>
                    <Link href={`/crm/network/assessments/${a.id}`} className="flex min-h-[52px] items-center gap-3 px-4 py-2.5 hover:bg-white">
                      <span className="min-w-0 flex-1 text-sm text-slate-700"><span className="font-medium text-slate-900">{a.customer_name}</span>{a.visit_at ? `, visited ${when(a.visit_at)}` : ""}</span>
                      <Pill className={STAGE_TONE[a.stage]}>{STAGES.find((s) => s.value === a.stage)?.label ?? a.stage}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <Panel title="Pis" aside={<Link href="/crm/network/pis" className="text-xs font-medium text-slate-600 underline">Set up</Link>}>
          {live.length === 0 ? (
            <Empty title="No Pis set up" detail="Add each Pi under Pis, then run the installer from the Mac." />
          ) : (
            <div className="divide-y divide-slate-200">{live.map((p) => <PiCard key={p.id} pi={p} />)}</div>
          )}
        </Panel>
      </div>
    </>
  );
}
