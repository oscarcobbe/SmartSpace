import Link from "next/link";
import { requireSession } from "@/lib/crm/session";
import { crm, crmConfigured } from "@/lib/crm/db";
import { PageHeader, Panel, Note, Empty } from "../ui";
import { completeTask } from "../contacts/actions";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  what: string;
  due_on: string | null;
  done_at: string | null;
  lead_id: string | null;
}

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "numeric" }) : "no date";

export default async function TasksPage() {
  const { site } = requireSession();
  if (!crmConfigured()) {
    return (
      <>
        <PageHeader title="Next steps" />
        <Note tone="warn">The contact database is not connected on this deployment yet.</Note>
      </>
    );
  }

  const rows = (await crm<Row[]>(`crm_tasks?site=eq.${site}&done_at=is.null&select=*&order=due_on.asc&limit=200`)) ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Next steps" sub="Everything still to do, soonest first." />
      <Panel>
        {rows.length === 0 ? (
          <Empty title="Nothing outstanding" detail="Next steps added against an enquiry appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((t) => {
              const overdue = t.due_on != null && t.due_on < today;
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <form action={completeTask}>
                    <input type="hidden" name="taskId" value={t.id} />
                    <input type="hidden" name="undo" value="0" />
                    <button
                      type="submit"
                      aria-label={`Mark done: ${t.what}`}
                      className="h-4 w-4 rounded border border-slate-400"
                    />
                  </form>
                  <span className="text-slate-800">{t.what}</span>
                  <span className={`ml-auto text-xs tabular-nums ${overdue ? "font-medium text-rose-700" : "text-slate-500"}`}>
                    {day(t.due_on)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <p className="mt-4 text-sm text-slate-600">
        Add a next step from a customer&rsquo;s page under <Link href="/crm/contacts" className="underline underline-offset-2">Contacts</Link>.
      </p>
    </>
  );
}
