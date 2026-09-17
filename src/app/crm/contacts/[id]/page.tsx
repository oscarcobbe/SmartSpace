import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { getPerson, fullAddress, distinctLeads } from "@/lib/crm/people";
import { getContact, STATUSES, type ActivityRow, type TaskRow } from "@/lib/crm/contacts";
import { STATUS_PILL, STATUS_LABEL, sourceLabel, kindLabel, telHref } from "@/lib/crm/labels";
import { moneyExact, money } from "@/lib/crm/leads";
import { PageHeader, Panel, Empty, Pill, Note } from "../../ui";
import { saveNote, setLeadStatus, addTask, completeTask } from "../actions";

export const dynamic = "force-dynamic";

const stamp = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IE", {
        timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : "–";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "numeric" }) : "–";

const dash = (v: string | null | undefined) => (!v || v === "-" ? null : v);

export default async function ContactPage({ params }: { params: { id: string } }) {
  const { site } = requireSession();
  const id = decodeURIComponent(params.id);
  const person = await getPerson(site, id);
  if (!person) notFound();

  /* Notes, next steps and the history trail only exist once somebody has typed
     something, which is the moment the contact row is created. Until then this
     is a customer assembled from Stripe and Calendly and those panels are
     empty rather than missing. */
  let activity: ActivityRow[] = [];
  let tasks: TaskRow[] = [];
  if (person.inDatabase) {
    const record = await getContact(site, person.id);
    activity = record?.activity ?? [];
    tasks = record?.tasks ?? [];
  }

  const address = fullAddress(person);
  const leads = distinctLeads(person);
  const tel = telHref(person.phone);
  const openTasks = tasks.filter((t) => !t.done_at);
  const doneTasks = tasks.filter((t) => t.done_at);
  const newestLead = person.leads[0];

  return (
    <>
      <Link href="/crm/contacts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Customers
      </Link>

      <PageHeader
        title={person.name}
        sub={address || undefined}
        aside={
          /* A CRM you cannot ring from is a spreadsheet. These are the two
             things Nigel actually does with a customer. */
          <div className="flex gap-2">
            {tel && (
              <a href={tel} className="flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Call
              </a>
            )}
            {person.email && (
              <a href={`mailto:${person.email}`} className="flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Email
              </a>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Panel title="Orders and enquiries">
            {person.feed.length === 0 && leads.length === 0 ? (
              <Empty title="Nothing filed yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {person.feed.map((row, i) => (
                  <li key={`feed-${i}`} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{row.type}</p>
                        {dash(row.product) && <p className="text-sm text-slate-600">{row.product}</p>}
                        <p className="mt-0.5 text-xs text-slate-500">{dash(row.date) ?? ""}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {dash(row.amount) && (
                          <span className="text-sm font-semibold tabular-nums text-slate-900">{row.amount}</span>
                        )}
                        {dash(row.status) && <Pill className={STATUS_PILL.contacted}>{row.status}</Pill>}
                      </div>
                    </div>

                    {dash(row.bookingDate) && (
                      <p className="mt-2 text-sm text-slate-700">
                        Booked for {row.bookingDate}
                        {dash(row.bookingSlot) && <span className="text-slate-500">, {row.bookingSlot}</span>}
                      </p>
                    )}

                    {row.details?.length ? (
                      <dl className="mt-2.5 space-y-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                        {row.details.map((d, j) => (
                          <div key={j}>
                            <dt className="text-xs text-slate-500">{d.question}</dt>
                            <dd className="whitespace-pre-wrap break-words text-slate-800">{d.answer}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </li>
                ))}

                {leads.map((l) => (
                  <li key={l.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{sourceLabel(l.source)}</p>
                        {l.source_detail && <p className="text-sm text-slate-600">{l.source_detail}</p>}
                        <p className="mt-0.5 text-xs text-slate-500">{stamp(l.created_at)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {l.value_cents != null && (
                          <span className="text-sm font-semibold tabular-nums text-slate-900">{moneyExact(l.value_cents / 100)}</span>
                        )}
                        <Pill className={STATUS_PILL[l.status]}>{STATUS_LABEL[l.status]}</Pill>
                      </div>
                    </div>

                    {l.message && (
                      <p className="mt-2.5 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                        {l.message}
                      </p>
                    )}

                    {(l.utm_campaign || l.gclid || l.booked_for || l.installed_at) && (
                      <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        {l.gclid && <div><dt className="inline">Came from a Google ad</dt></div>}
                        {l.utm_campaign && <div><dt className="inline">Campaign: </dt><dd className="inline text-slate-700">{l.utm_campaign}</dd></div>}
                        {l.booked_for && <div><dt className="inline">Booked for: </dt><dd className="inline text-slate-700">{day(l.booked_for)}</dd></div>}
                        {l.installed_at && <div><dt className="inline">Installed: </dt><dd className="inline text-slate-700">{day(l.installed_at)}</dd></div>}
                      </dl>
                    )}

                    <form action={setLeadStatus} className="mt-3 flex items-center gap-2">
                      <input type="hidden" name="leadId" value={l.id} />
                      <input type="hidden" name="contactId" value={person.id} />
                      <label htmlFor={`status-${l.id}`} className="text-xs text-slate-500">Move to</label>
                      <select
                        id={`status-${l.id}`}
                        name="status"
                        defaultValue={l.status}
                        className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2 text-sm"
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                      </select>
                      <button type="submit" className="min-h-[36px] rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Save
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="History">
            {activity.length === 0 ? (
              <Empty
                title="Nothing recorded yet"
                detail="Notes, status changes and next steps appear here once you start using them."
              />
            ) : (
              <ol className="divide-y divide-slate-100">
                {activity.map((a) => (
                  <li key={a.id} className="px-4 py-2.5 text-sm sm:flex sm:items-baseline sm:gap-4">
                    {/* Stacked on a phone. Side by side, a fixed timestamp
                        column squeezed "Moved to contacted" into three lines
                        and broke the actor's email mid-word. */}
                    <span className="block shrink-0 text-xs tabular-nums text-slate-500 sm:w-36">{stamp(a.happened_at)}</span>
                    <span className="mt-0.5 block text-slate-800 sm:mt-0">
                      {a.summary}
                      <span className="ml-2 text-xs text-slate-400">{kindLabel(a.kind)}</span>
                    </span>
                    {a.actor && <span className="mt-0.5 block text-xs text-slate-400 sm:ml-auto sm:mt-0">{a.actor}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Details">
            <dl className="space-y-2.5 px-4 py-4 text-sm">
              {person.email && (
                <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <dt className="text-slate-500">Email</dt>
                  <dd><a href={`mailto:${person.email}`} className="break-all text-slate-900 underline underline-offset-2">{person.email}</a></dd>
                </div>
              )}
              {person.phone && (
                <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <dt className="text-slate-500">Phone</dt>
                  <dd>{tel ? <a href={tel} className="tabular-nums text-slate-900 underline underline-offset-2">{person.phone}</a> : person.phone}</dd>
                </div>
              )}
              {address && (
                <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <dt className="text-slate-500">Address</dt>
                  <dd className="text-slate-900">{address}</dd>
                </div>
              )}
              {person.paid > 0 && (
                <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                  <dt className="text-slate-500">Spent</dt>
                  <dd className="font-medium tabular-nums text-slate-900">{money(person.paid)}</dd>
                </div>
              )}
              <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                <dt className="text-slate-500">Last seen</dt>
                <dd className="text-slate-900">{day(person.lastActivity)}</dd>
              </div>
            </dl>

            {/* Same reason as on Orders: half the question about a customer is
                where they are. No API key needed and maps.google.com is already
                in the site's frame-src. */}
            {address && (
              <div className="border-t border-slate-200 p-3">
                <iframe
                  title={`Map of ${address}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=14&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-44 w-full rounded-lg border border-slate-200"
                />
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Directions
                </a>
              </div>
            )}
          </Panel>

          <Panel title="Next steps">
            {openTasks.length === 0 && doneTasks.length === 0 ? (
              <p className="px-4 pt-4 text-sm text-slate-500">Nothing outstanding.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {[...openTasks, ...doneTasks].map((t) => (
                  <li key={t.id} className="flex items-start gap-2 px-2 py-1.5 text-sm">
                    <form action={completeTask} className="shrink-0">
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="contactId" value={person.id} />
                      <input type="hidden" name="undo" value={t.done_at ? "1" : "0"} />
                      {/* Forty by forty. The old target was an eighteen pixel
                          square, which is a miss on a phone more often than a
                          hit. */}
                      <button
                        type="submit"
                        aria-label={t.done_at ? `Reopen: ${t.what}` : `Mark done: ${t.what}`}
                        className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-slate-100"
                      >
                        <span className={`flex h-[18px] w-[18px] items-center justify-center rounded border text-[11px] leading-none ${t.done_at ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-400"}`}>
                          {t.done_at ? "✓" : ""}
                        </span>
                      </button>
                    </form>
                    <span className={`py-2.5 ${t.done_at ? "text-slate-400 line-through" : "text-slate-800"}`}>
                      {t.what}
                      {t.due_on && !t.done_at && <span className="block text-xs text-slate-500">due {day(t.due_on)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <form action={addTask} className="space-y-2 border-t border-slate-200 px-4 py-3">
              <input type="hidden" name="contactId" value={person.id} />
              <label htmlFor="new-task" className="sr-only">Next step</label>
              <input
                id="new-task"
                name="what"
                required
                placeholder="Add a next step"
                className="min-h-[38px] w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              <div className="flex gap-2">
                <label htmlFor="new-task-due" className="sr-only">Due date</label>
                <input id="new-task-due" name="dueOn" type="date" className="min-h-[38px] flex-1 rounded-lg border border-slate-300 px-2 text-sm" />
                {person.leads.length > 1 ? (
                  <>
                    <label htmlFor="new-task-lead" className="sr-only">Against which enquiry</label>
                    <select id="new-task-lead" name="leadId" className="min-h-[38px] flex-1 rounded-lg border border-slate-300 px-2 text-sm">
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>{sourceLabel(l.source)}, {day(l.created_at)}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <input type="hidden" name="leadId" value={newestLead?.id ?? ""} />
                )}
                <button type="submit" className="min-h-[38px] rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800">
                  Add
                </button>
              </div>
            </form>
          </Panel>

          <Panel title="Notes">
            <form action={saveNote} className="space-y-2 px-4 py-4">
              <input type="hidden" name="contactId" value={person.id} />
              <label htmlFor="notes" className="sr-only">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={7}
                defaultValue={person.notes ?? ""}
                placeholder="Gate codes, access, who to ask for, anything worth remembering."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              <button type="submit" className="min-h-[38px] rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800">
                Save note
              </button>
            </form>
          </Panel>

          {!person.inDatabase && (
            <Note>
              This customer came from Stripe and Calendly. Saving a note or a next step files them properly and
              starts their history.
            </Note>
          )}
        </div>
      </div>
    </>
  );
}
