import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { listPeople, type Person } from "@/lib/crm/people";
import { STATUS_PILL, STATUS_LABEL } from "@/lib/crm/labels";
import { money } from "@/lib/crm/leads";
import { PageHeader, Panel, Note, Empty, Stat, StatRow, Pill } from "../ui";
import ExportButton from "../export-button";
import { fullAddress } from "@/lib/crm/people";

export const dynamic = "force-dynamic";
/* SmartCare Living's sheet can take most of a minute to wake. */
export const maxDuration = 60;

const matches = (p: Person, needle: string) =>
  [p.name, p.email, p.phone, p.address, p.city, p.county, p.eircode]
    .some((v) => String(v ?? "").toLowerCase().includes(needle));

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short", year: "2-digit" }) : "Never";

export default async function ContactsPage({ searchParams }: { searchParams: { q?: string } }) {
  const { site } = requireSession();
  const q = (searchParams.q ?? "").trim();

  const { people, problems, feedRead } = await listPeople(site);
  const rows = q ? people.filter((p) => matches(p, q.toLowerCase())) : people;

  const customers = people.filter((p) => p.paid > 0);
  const paid = customers.reduce((s, p) => s + p.paid, 0);
  const open = people.filter((p) => p.status && !["won", "lost", "spam"].includes(p.status)).length;

  const exportRows = rows.map((p) => [
    p.name, p.email, p.phone, fullAddress(p), p.status ?? (p.orders ? "customer" : "enquiry"),
    p.orders, p.paid ? p.paid.toFixed(2) : "", p.lastActivity ? p.lastActivity.slice(0, 10) : "", p.notes ?? "",
  ]);

  const search = (
    <form method="get" className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <label htmlFor="contact-search" className="sr-only">Search customers</label>
        <input
          id="contact-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search customers"
          className="min-h-[44px] w-full min-w-0 rounded-lg border border-slate-300 pl-8 pr-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:min-h-[36px] sm:w-64 sm:text-sm"
        />
      </div>
      <button type="submit" className="min-h-[44px] shrink-0 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-[36px]">
        Search
      </button>
    </form>
  );

  return (
    <>
      <PageHeader
        title="Customers"
        sub="Everyone who has ordered, booked or been in touch, with what they bought and what was said."
        aside={
          <Link
            href="/crm/contacts/new"
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 sm:min-h-[38px] sm:px-3"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add a customer
          </Link>
        }
      />

      {/* Paying customers, spend and average all come from the orders feed. When
          it did not answer they are not zero, they are unknown, and they say so. */}
      <StatRow>
        <Stat label="People" value={String(people.length)} explain="people" note={feedRead ? undefined : "From the database only"} />
        <Stat label="Paying customers" value={feedRead ? String(customers.length) : "Not read"} tone={feedRead ? "good" : "muted"} />
        <Stat label="Spent with you" value={feedRead ? money(paid) : "Not read"} tone={feedRead ? "plain" : "muted"} />
        <Stat label="Open" value={String(open)} note="Not yet won or lost" tone={open ? "warn" : "plain"} />
        <Stat
          label="Average order"
          value={!feedRead ? "Not read" : customers.length ? money(paid / customers.length) : "None yet"}
          tone={feedRead && customers.length ? "plain" : "muted"}
          explain="averageOrder"
        />
      </StatRow>

      {problems.length > 0 && (
        <div className="mb-6 space-y-2">
          {problems.map((p) => <Note key={p} tone="warn">{p}</Note>)}
        </div>
      )}

      <Panel
        title="Customers"
        aside={
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
            {search}
            <ExportButton
              filename="customers"
              headers={["Name", "Email", "Phone", "Address", "Status", "Orders", "Spent", "Last seen", "Notes"]}
              rows={exportRows}
            />
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty
            title={q ? "Nobody matches that" : "No customers yet"}
            detail={q ? "Try part of a name, an email, a phone number or an Eircode." : "People appear here as orders, bookings and enquiries come in."}
          />
        ) : (
          <>
            <ul className="divide-y divide-slate-100 sm:hidden">
              {rows.map((p) => (
                <li key={p.id}>
                  <Link href={`/crm/contacts/${encodeURIComponent(p.id)}`} className="flex items-start gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{p.email ?? p.phone ?? ""}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {[p.city, p.county].filter(Boolean).join(", ") || p.address || ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {p.paid > 0 && <p className="text-sm font-medium tabular-nums text-slate-900">{money(p.paid)}</p>}
                      {p.status && <Pill className={STATUS_PILL[p.status]}>{STATUS_LABEL[p.status]}</Pill>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-2 font-semibold">Name</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Contact</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Where</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Orders</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Spent</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => (
                    <tr key={p.id} className="group hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/crm/contacts/${encodeURIComponent(p.id)}`}
                          className="block font-medium text-slate-900 group-hover:underline group-hover:underline-offset-2"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        <span className="block">{p.email ?? <span className="text-slate-400">No email</span>}</span>
                        {p.phone && <span className="block text-xs tabular-nums text-slate-500">{p.phone}</span>}
                      </td>
                      <td className="max-w-[16rem] px-4 py-2.5 text-slate-600">
                        <span className="block truncate" title={p.address ?? undefined}>
                          {[p.city, p.county].filter(Boolean).join(", ") || p.address || <span className="text-slate-400">No address</span>}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {p.status ? (
                          <Pill className={STATUS_PILL[p.status]}>{STATUS_LABEL[p.status]}</Pill>
                        ) : p.paid > 0 ? (
                          <Pill className={STATUS_PILL.won}>Customer</Pill>
                        ) : (
                          <Pill className={STATUS_PILL.new}>Enquiry</Pill>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{p.orders || <span className="text-slate-400">0</span>}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-900">
                        {p.paid > 0 ? money(p.paid) : ""}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{when(p.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
              Showing {rows.length} of {people.length}
            </p>
          </>
        )}
      </Panel>
    </>
  );
}
