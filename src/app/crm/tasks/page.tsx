import Link from "next/link";
import { requireSession } from "@/lib/crm/session";
import { crm, crmConfigured, unlessWrongKey, type Site } from "@/lib/crm/db";
import { PageHeader, Panel, Note, Empty } from "../ui";
import { completeTask } from "../contacts/actions";
import { ActionForm, SubmitButton } from "../action-form";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  what: string;
  due_on: string | null;
  done_at: string | null;
  lead_id: string | null;
}

interface Who { id: string; name: string }

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short", year: "numeric" }) : "No date";

const todayDublin = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

/**
 * Who each step is for.
 *
 * The list used to say "Ring back about the quote" and nothing else, so a
 * step was only useful to whoever wrote it that afternoon. A step belongs to
 * an enquiry and an enquiry to a person, read here as two small queries rather
 * than an embed, for the reason given in contacts.ts.
 */
async function ownersOf(site: Site, rows: Row[]): Promise<Map<string, Who>> {
  const out = new Map<string, Who>();
  const leadIds = Array.from(new Set(rows.map((r) => r.lead_id).filter((x): x is string => Boolean(x))));
  if (!leadIds.length) return out;
  const leads = (await crm<{ id: string; contact_id: string | null }[]>(
    `crm_leads?site=eq.${site}&id=in.(${leadIds.join(",")})&select=id,contact_id`,
  )) ?? [];
  const contactIds = Array.from(new Set(leads.map((l) => l.contact_id).filter((x): x is string => Boolean(x))));
  if (!contactIds.length) return out;
  const contacts = (await crm<{ id: string; name: string | null; first_name: string | null; last_name: string | null; email: string | null; phone: string | null }[]>(
    `crm_contacts?site=eq.${site}&id=in.(${contactIds.join(",")})&select=id,name,first_name,last_name,email,phone`,
  )) ?? [];
  const byId = new Map(contacts.map((c) => [c.id, {
    id: c.id,
    name: c.name?.trim() || [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || c.email || c.phone || "Unnamed customer",
  }]));
  for (const l of leads) {
    const who = l.contact_id ? byId.get(l.contact_id) : undefined;
    if (who) out.set(l.id, who);
  }
  return out;
}

export default async function TasksPage() {
  const { site } = requireSession();
  if (!crmConfigured()) {
    return (
      <>
        <PageHeader title="Next steps" />
        <Note tone="warn">The database is not connected on this deployment, so next steps cannot be shown.</Note>
      </>
    );
  }

  let rows: Row[];
  let owners = new Map<string, Who>();
  let ownersProblem: string | null = null;
  try {
    rows = await unlessWrongKey(await crm<Row[]>(`crm_tasks?site=eq.${site}&done_at=is.null&select=id,what,due_on,done_at,lead_id&order=due_on.asc&limit=200`));
  } catch (err) {
    /* This threw straight through to an error page. A failed read is a
       sentence, not a crash, and never "Nothing outstanding". */
    return (
      <>
        <PageHeader title="Next steps" />
        <Note tone="warn">
          Next steps could not be read, so none are shown. ({err instanceof Error ? err.message.slice(0, 140) : "no answer"})
        </Note>
      </>
    );
  }
  try {
    owners = await ownersOf(site, rows);
  } catch (err) {
    ownersProblem = `Who each step is for could not be read (${err instanceof Error ? err.message.slice(0, 100) : "no answer"}).`;
  }

  const today = todayDublin();

  /* Three buckets, because a flat list sorted by date buries the overdue ones
     among everything due next month. Undated steps go last rather than first,
     which is where a plain ascending sort on a null column puts them. */
  const overdue = rows.filter((t) => t.due_on && t.due_on < today);
  const todayOrSoon = rows.filter((t) => t.due_on && t.due_on >= today);
  const undated = rows.filter((t) => !t.due_on);

  const Group = ({ title, items, tone }: { title: string; items: Row[]; tone?: "bad" }) =>
    items.length === 0 ? null : (
      <Panel title={title} aside={<span className="text-xs tabular-nums text-slate-500">{items.length}</span>}>
        <ul className="divide-y divide-slate-100">
          {items.map((t) => {
            const who = t.lead_id ? owners.get(t.lead_id) : undefined;
            return (
              <li key={t.id} className="flex items-center gap-1 py-1 pl-1.5 pr-4 text-sm">
                <ActionForm action={completeTask} quiet className="flex shrink-0 flex-wrap items-center">
                  <input type="hidden" name="taskId" value={t.id} />
                  {who && <input type="hidden" name="contactId" value={who.id} />}
                  <input type="hidden" name="undo" value="0" />
                  <SubmitButton
                    ariaLabel={`Mark done: ${t.what}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100"
                  >
                    <span className="h-[18px] w-[18px] rounded border border-slate-400 bg-white" />
                  </SubmitButton>
                </ActionForm>
                <span className="min-w-0 flex-1 py-1.5">
                  <span className="block text-slate-800">{t.what}</span>
                  {who && (
                    <Link href={`/crm/contacts/${who.id}`} className="mt-0.5 inline-block text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
                      {who.name}
                    </Link>
                  )}
                </span>
                <span className={`shrink-0 text-xs tabular-nums ${tone === "bad" ? "font-medium text-rose-700" : "text-slate-500"}`}>
                  {day(t.due_on)}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>
    );

  return (
    <>
      <PageHeader
        title="Next steps"
        sub={rows.length ? `${rows.length} still to do.` : undefined}
      />

      {ownersProblem && <div className="mb-6"><Note tone="warn">{ownersProblem}</Note></div>}

      {rows.length === 0 ? (
        <Panel>
          <Empty
            title="Nothing outstanding"
            detail="Add a next step from a customer's page and it appears here, soonest first."
          />
        </Panel>
      ) : (
        <div className="space-y-4 sm:space-y-6">
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
