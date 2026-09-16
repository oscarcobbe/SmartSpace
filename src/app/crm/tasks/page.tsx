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
  iso ? new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "numeric" }) : "No date";

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

  /* Three buckets, because a flat list sorted by date buries the overdue ones
     among everything due next month. Undated steps go last rather than first,
     which is where a plain ascending sort on a null column puts them. */
  const overdue = rows.filter((t) => t.due_on && t.due_on < today);
  const todayOrSoon = rows.filter((t) => t.due_on && t.due_on >= today);
  const undated = rows.filter((t) => !t.due_on);

  const Group = ({ title, items, tone }: { title: string; items: Row[]; tone?: "bad" }) =>
    items.length === 0 ? null : (
      <Panel title={title}>
        <ul className="divide-y divide-slate-100">
          {items.map((t) => (
            <li key={t.id} className="flex items-center gap-2 px-2 py-1 text-sm">
              <form action={completeTask} className="shrink-0">
                <input type="hidden" name="taskId" value={t.id} />
                <input type="hidden" name="undo" value="0" />
                <button
                  type="submit"
                  aria-label={`Mark done: ${t.what}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100"
                >
                  <span className="h-[18px] w-[18px] rounded border border-slate-400" />
                </button>
              </form>
              <span className="py-2 text-slate-800">{t.what}</span>
              <span className={`ml-auto shrink-0 pr-3 text-xs tabular-nums ${tone === "bad" ? "font-medium text-rose-700" : "text-slate-500"}`}>
                {day(t.due_on)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    );

  return (
    <>
      <PageHeader
        title="Next steps"
        sub={rows.length ? `${rows.length} still to do.` : undefined}
      />

      {rows.length === 0 ? (
        <Panel>
          <Empty
            title="Nothing outstanding"
            detail="Add a next step from a customer's page and it appears here, soonest first."
          />
        </Panel>
      ) : (
        <div className="space-y-6">
          <Group title="Overdue" items={overdue} tone="bad" />
          <Group title="Coming up" items={todayOrSoon} />
          <Group title="No date" items={undated} />
        </div>
      )}

      <p className="mt-4 text-sm text-slate-600">
        Add a next step from a customer&rsquo;s page under{" "}
        <Link href="/crm/contacts" className="underline underline-offset-2">Customers</Link>.
      </p>
    </>
  );
}
