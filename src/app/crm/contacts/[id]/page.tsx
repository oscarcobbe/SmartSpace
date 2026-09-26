import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Mail, MapPin, Phone } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { getPerson, fullAddress, distinctLeads } from "@/lib/crm/people";
import { getContact, STATUSES, type ActivityRow, type TaskRow } from "@/lib/crm/contacts";
import { STATUS_PILL, STATUS_LABEL, sourceLabel, kindLabel, telHref, FOUND_US, foundUsOf } from "@/lib/crm/labels";
import { moneyExact, money } from "@/lib/crm/leads";
import { PageHeader, Panel, Empty, Pill, Note } from "../../ui";
import { saveNote, setLeadStatus, addTask, completeTask } from "../actions";
import PaymentLinkForm from "../payment-link-form";
import { ActionForm, SubmitButton } from "../../action-form";
import { plainText, slotText } from "@/lib/crm/display";

export const dynamic = "force-dynamic";
/* The person is assembled from the orders feed, and SmartCare Living's sheet
   can take most of a minute to wake. */
export const maxDuration = 60;

const stamp = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IE", {
        timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : "Not recorded";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short", year: "numeric" }) : "Never";

const dash = (v: string | null | undefined) => plainText(v) || null;

export default async function ContactPage({ params }: { params: { id: string } }) {
  const { site } = requireSession();
  const id = decodeURIComponent(params.id);
  const { person, problems } = await getPerson(site, id);
  if (!person) {
    /* Not "not found" when the reason is that a source did not answer: the
       customer may well exist, and a 404 would say they do not. */
    if (problems.length) {
      return (
        <>
          <Link href="/crm/contacts" className="mb-4 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 sm:min-h-0">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Customers
          </Link>
          <PageHeader title="This customer could not be loaded" />
          <div className="space-y-2">{problems.map((p) => <Note key={p} tone="warn">{p}</Note>)}</div>
        </>
      );
    }
    notFound();
  }

  /* Notes, next steps and the history trail only exist once somebody has typed
     something, which is the moment the contact row is created. Until then this
     is a customer assembled from Stripe and Calendly and those panels are
     empty rather than missing. */
  let activity: ActivityRow[] = [];
  let tasks: TaskRow[] = [];
  let recordProblem: string | null = null;
  if (person.inDatabase) {
    try {
      const record = await getContact(site, person.id);
      activity = record?.activity ?? [];
      tasks = record?.tasks ?? [];
    } catch (err) {
      /* This crashed the whole page. The orders and details above are still
         worth showing; the history and next steps say they were not read
         rather than looking empty. */
      recordProblem = `The history and next steps could not be read (${err instanceof Error ? err.message.slice(0, 240) : "no answer"}), so they are not shown. Nothing has been lost.`;
    }
  }

  const address = fullAddress(person);
  const leads = distinctLeads(person);
  const tel = telHref(person.phone);
  const openTasks = tasks.filter((t) => !t.done_at);
  const doneTasks = tasks.filter((t) => t.done_at);
  const newestLead = person.leads[0];
  /*
   * The newest enquiry that actually carries a click id, not simply the newest.
   *
   * Leads arrive created_at.desc, so leads[0] is the latest, and the latest is
   * often a phone call or a repeat visit with nothing on it. Somebody who
   * clicked an ad in July and rang in September has their click on the July
   * row, and that is the click the September payment belongs to. The offline
   * feed applies the same rule when it joins an enquiry to a payment, so the
   * two cannot credit different clicks for the same sale.
   */
  const clickedLead = person.leads.find((l) => (l.gclid ?? "").trim().length > 0);

  return (
    <>
      <Link href="/crm/contacts" className="mb-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 sm:mb-3 sm:min-h-0">
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
              <a href={tel} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[38px] sm:px-3">
                <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Call
              </a>
            )}
            {person.email && (
              <a href={`mailto:${person.email}`} className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[38px] sm:px-3">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Email
              </a>
            )}
          </div>
        }
      />

      {(problems.length > 0 || recordProblem) && (
        <div className="mb-6 space-y-2">
          {problems.map((p) => <Note key={p} tone="warn">{p}</Note>)}
          {recordProblem && <Note tone="warn">{recordProblem}</Note>}
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
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
                        {dash(row.product) && <p className="text-sm text-slate-600">{dash(row.product)}</p>}
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
                        {slotText(row.bookingSlot) && <span className="text-slate-500">, {slotText(row.bookingSlot)}</span>}
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

                    <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <div><dt className="inline">Found us: </dt><dd className="inline text-slate-700">{FOUND_US[foundUsOf(l)]}{l.gclid ? " (the click was recorded)" : ""}</dd></div>
                        {l.utm_campaign && <div><dt className="inline">Campaign: </dt><dd className="inline text-slate-700">{l.utm_campaign}</dd></div>}
                        {l.booked_for && <div><dt className="inline">Booked for: </dt><dd className="inline text-slate-700">{day(l.booked_for)}</dd></div>}
                        {l.installed_at && <div><dt className="inline">Installed: </dt><dd className="inline text-slate-700">{day(l.installed_at)}</dd></div>}
                    </dl>

                    <ActionForm action={setLeadStatus} className="mt-3 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="leadId" value={l.id} />
                      <input type="hidden" name="contactId" value={person.id} />
                      <div className="min-w-0 flex-1 sm:flex-none">
                        <label htmlFor={`status-${l.id}`} className="mb-1 block text-xs text-slate-500">Where it stands</label>
                        <select
                          id={`status-${l.id}`}
                          name="status"
                          defaultValue={l.status}
                          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-base sm:min-h-[36px] sm:w-auto sm:text-sm"
                        >
                          {STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABEL[st]}</option>)}
                        </select>
                      </div>
                      <div className="min-w-0 flex-1 sm:flex-none">
                        <label htmlFor={`found-${l.id}`} className="mb-1 block text-xs text-slate-500">How they found us</label>
                        <select
                          id={`found-${l.id}`}
                          name="found_us"
                          defaultValue={foundUsOf(l)}
                          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-2 text-base sm:min-h-[36px] sm:w-auto sm:text-sm"
                        >
                          {Object.entries(FOUND_US).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                      <SubmitButton
                        pendingLabel="Saving"
                        className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[36px] sm:w-auto sm:px-3"
                      >
                        Save
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* The two things Nigel does on this page, next to the enquiry they
              are about rather than at the bottom of the side column, under
              the map. The reference details sit on the right. */}
          <Panel title="Next steps">
            {recordProblem ? (
              <div className="px-4 pt-4"><Note tone="warn">Next steps were not read, so the list is not shown.</Note></div>
            ) : openTasks.length === 0 && doneTasks.length === 0 ? (
              <p className="px-4 pt-4 text-sm text-slate-500">Nothing outstanding.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {[...openTasks, ...doneTasks].map((t) => (
                  <li key={t.id} className="flex items-start gap-1 px-1.5 py-1 text-sm">
                    <ActionForm action={completeTask} quiet className="flex shrink-0 flex-wrap">
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="contactId" value={person.id} />
                      <input type="hidden" name="undo" value={t.done_at ? "1" : "0"} />
                      {/* Forty-four square. The old target was an eighteen pixel
                          square, which is a miss on a phone more often than a
                          hit. */}
                      <SubmitButton
                        ariaLabel={t.done_at ? `Reopen: ${t.what}` : `Mark done: ${t.what}`}
                        className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-slate-100"
                      >
                        <span className={`flex h-[18px] w-[18px] items-center justify-center rounded border ${t.done_at ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-400 bg-white"}`}>
                          {t.done_at ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                        </span>
                      </SubmitButton>
                    </ActionForm>
                    <span className={`min-w-0 py-2.5 ${t.done_at ? "text-slate-400 line-through" : "text-slate-800"}`}>
                      {t.what}
                      {t.due_on && !t.done_at && <span className="block text-xs text-slate-500">due {day(t.due_on)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <ActionForm action={addTask} resetOnSuccess className="flex flex-wrap gap-2 border-t border-slate-200 px-4 pb-1 pt-3">
              <input type="hidden" name="contactId" value={person.id} />
              <label htmlFor="new-task" className="sr-only">Next step</label>
              <input
                id="new-task"
                name="what"
                required
                maxLength={500}
                placeholder="Add a next step"
                className="min-h-[44px] w-full basis-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:min-h-[38px] sm:text-sm"
              />
              <label htmlFor="new-task-due" className="sr-only">Due date</label>
              <input id="new-task-due" name="dueOn" type="date" className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-base sm:min-h-[38px] sm:text-sm" />
              {leads.length > 1 ? (
                <>
                  <label htmlFor="new-task-lead" className="sr-only">Against which enquiry</label>
                  <select id="new-task-lead" name="leadId" className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-base sm:min-h-[38px] sm:text-sm">
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>{sourceLabel(l.source)}, {day(l.created_at)}</option>
                    ))}
                  </select>
                </>
              ) : (
                <input type="hidden" name="leadId" value={newestLead?.id ?? ""} />
              )}
              <SubmitButton pendingLabel="Adding" className="min-h-[44px] rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 sm:min-h-[38px] sm:px-3">
                Add
              </SubmitButton>
            </ActionForm>
          </Panel>

          <Panel title="Notes">
            <ActionForm action={saveNote} className="space-y-2 px-4 pb-2 pt-4">
              <input type="hidden" name="contactId" value={person.id} />
              <label htmlFor="notes" className="sr-only">Notes</label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                maxLength={8000}
                defaultValue={person.notes ?? ""}
                placeholder="Gate codes, access, who to ask for, anything worth remembering."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:text-sm"
              />
              <SubmitButton pendingLabel="Saving" className="min-h-[44px] rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 sm:min-h-[38px] sm:px-3">
                Save note
              </SubmitButton>
            </ActionForm>
          </Panel>

          <Panel title="History">
            {recordProblem ? (
              <div className="px-4 py-4"><Note tone="warn">Not read. {recordProblem}</Note></div>
            ) : activity.length === 0 ? (
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
                      {plainText(a.summary)}
                      <span className="ml-2 text-xs text-slate-400">{kindLabel(a.kind)}</span>
                    </span>
                    {a.actor && <span className="mt-0.5 block text-xs text-slate-400 sm:ml-auto sm:mt-0">{a.actor}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-4 sm:space-y-6">
          {/*
            * Above Details on purpose.
            *
            * This is the one action on this page that decides whether a sale
            * can ever be credited to the advertising that produced it. Every
            * Smart Space charge in September carried empty Stripe metadata,
            * because every one of them was a link made by hand, and a
            * hand-made link has no browser behind it and no click id on it.
            */}
          {site === "smart-space" && person.email && (
            <Panel title={clickedLead ? "Send a payment link, traced to their ad" : "Send a payment link"}>
              <PaymentLinkForm
                contactId={person.id}
                email={person.email}
                name={person.name ?? ""}
                gclid={clickedLead?.gclid ?? null}
              />
            </Panel>
          )}

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
                  className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 sm:min-h-0 sm:mt-2"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Directions
                </a>
              </div>
            )}
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
