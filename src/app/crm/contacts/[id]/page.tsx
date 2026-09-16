import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/crm/session";
import { getContact, displayName, STATUSES, STATUS_TONE } from "@/lib/crm/contacts";
import { moneyExact } from "@/lib/crm/leads";
import { PageHeader, Panel, Empty } from "../../ui";
import { saveNote, setLeadStatus, addTask, completeTask } from "../actions";

export const dynamic = "force-dynamic";

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IE", {
        timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : "–";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "numeric" }) : "–";

export default async function ContactPage({ params }: { params: { id: string } }) {
  const { site } = requireSession();
  const found = await getContact(site, params.id);
  if (!found) notFound();
  const { contact, leads, activity, tasks } = found;

  const address = [contact.address_line1, contact.address_line2, contact.city, contact.county, contact.eircode]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={displayName(contact)}
        sub={address || undefined}
        aside={
          <Link href="/crm/contacts" className="text-sm text-slate-600 underline-offset-2 hover:underline">
            Back to contacts
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Panel title="Enquiries">
            {leads.length === 0 ? (
              <Empty title="Nothing filed yet" detail="Enquiries and orders appear here as they arrive." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {leads.map((l) => (
                  <li key={l.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {l.source ?? "Enquiry"}
                          {l.source_detail && <span className="font-normal text-slate-500"> · {l.source_detail}</span>}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{when(l.created_at)}</p>
                        {l.message && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{l.message}</p>}
                      </div>
                      <div className="text-right">
                        {l.value_cents != null && (
                          <p className="text-sm font-medium tabular-nums text-slate-900">{moneyExact(l.value_cents / 100)}</p>
                        )}
                        <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_TONE[l.status]}`}>
                          {l.status}
                        </span>
                      </div>
                    </div>

                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                      {l.utm_campaign && <div><dt className="inline">Campaign: </dt><dd className="inline text-slate-700">{l.utm_campaign}</dd></div>}
                      {l.utm_source && <div><dt className="inline">Source: </dt><dd className="inline text-slate-700">{l.utm_source}</dd></div>}
                      {l.gclid && <div><dt className="inline">From a Google ad</dt></div>}
                      {l.booked_for && <div><dt className="inline">Booked for: </dt><dd className="inline text-slate-700">{day(l.booked_for)}</dd></div>}
                      {l.installed_at && <div><dt className="inline">Installed: </dt><dd className="inline text-slate-700">{day(l.installed_at)}</dd></div>}
                    </dl>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <form action={setLeadStatus} className="flex items-center gap-2">
                        <input type="hidden" name="leadId" value={l.id} />
                        <input type="hidden" name="contactId" value={contact.id} />
                        <label htmlFor={`status-${l.id}`} className="sr-only">Status</label>
                        <select
                          id={`status-${l.id}`}
                          name="status"
                          defaultValue={l.status}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Save
                        </button>
                      </form>

                      <form action={addTask} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="leadId" value={l.id} />
                        <input type="hidden" name="contactId" value={contact.id} />
                        <label htmlFor={`task-${l.id}`} className="sr-only">Next step</label>
                        <input
                          id={`task-${l.id}`}
                          name="what"
                          placeholder="Next step"
                          className="w-40 rounded-md border border-slate-300 px-2 py-1 text-xs"
                        />
                        <label htmlFor={`due-${l.id}`} className="sr-only">Due</label>
                        <input id={`due-${l.id}`} name="dueOn" type="date" className="rounded-md border border-slate-300 px-2 py-1 text-xs" />
                        <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Add
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="History">
            {activity.length === 0 ? (
              <Empty title="Nothing recorded yet" />
            ) : (
              <ol className="divide-y divide-slate-100">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-baseline gap-3 px-4 py-2 text-sm">
                    <span className="w-36 shrink-0 tabular-nums text-xs text-slate-500">{when(a.happened_at)}</span>
                    <span className="text-slate-800">{a.summary}</span>
                    {a.actor && <span className="ml-auto text-xs text-slate-400">{a.actor}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Details">
            <dl className="space-y-2 px-4 py-4 text-sm">
              {([
                ["Email", contact.email],
                ["Phone", contact.phone],
                ["Address", address],
                ["Added", day(contact.created_at)],
              ] as [string, string | null][])
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[4.5rem_1fr] gap-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="break-words text-slate-900">{v}</dd>
                  </div>
                ))}
            </dl>
          </Panel>

          <Panel title="Next steps">
            {tasks.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-500">Nothing outstanding.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 px-4 py-2 text-sm">
                    <form action={completeTask}>
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="contactId" value={contact.id} />
                      <input type="hidden" name="undo" value={t.done_at ? "1" : "0"} />
                      <button
                        type="submit"
                        aria-label={t.done_at ? `Reopen: ${t.what}` : `Mark done: ${t.what}`}
                        className="mt-0.5 h-4 w-4 rounded border border-slate-400 text-xs leading-none text-slate-700"
                      >
                        {t.done_at ? "✓" : ""}
                      </button>
                    </form>
                    <span className={t.done_at ? "text-slate-400 line-through" : "text-slate-800"}>
                      {t.what}
                      {t.due_on && <span className="block text-xs text-slate-500">due {day(t.due_on)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Notes">
            <form action={saveNote} className="space-y-2 px-4 py-4">
              <input type="hidden" name="contactId" value={contact.id} />
              <label htmlFor="notes" className="sr-only">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={6}
                defaultValue={contact.notes ?? ""}
                placeholder="Anything worth remembering about this customer."
                className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              <button type="submit" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
                Save note
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
