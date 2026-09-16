import Link from "next/link";
import { requireSession } from "@/lib/crm/session";
import { crmConfigured } from "@/lib/crm/db";
import { listContacts, displayName, STATUS_TONE } from "@/lib/crm/contacts";
import { money } from "@/lib/crm/leads";
import { PageHeader, Panel, Note, Empty, Stat, StatRow } from "../ui";

export const dynamic = "force-dynamic";

export default async function ContactsPage({ searchParams }: { searchParams: { q?: string } }) {
  const { site } = requireSession();
  const q = searchParams.q ?? "";

  if (!crmConfigured()) {
    return (
      <>
        <PageHeader title="Contacts" />
        <Note tone="warn">
          The contact database is not connected on this deployment yet, so nothing is being recorded here. Orders,
          Finance and Marketing read from Stripe, Calendly and Google directly and are unaffected.
        </Note>
      </>
    );
  }

  const data = await listContacts(site, q);
  if (!data) {
    return (
      <>
        <PageHeader title="Contacts" />
        <Note tone="warn">The contact database did not answer.</Note>
      </>
    );
  }

  const { contacts, leads } = data;
  const byContact = new Map<string, typeof leads>();
  for (const l of leads) {
    if (!l.contact_id) continue;
    const list = byContact.get(l.contact_id) ?? [];
    list.push(l);
    byContact.set(l.contact_id, list);
  }

  const won = leads.filter((l) => l.status === "won" || l.status === "installed");
  const wonValue = won.reduce((s, l) => s + (l.value_cents ?? 0) / 100, 0);
  const openLeads = leads.filter((l) => !["won", "lost", "spam"].includes(l.status)).length;

  const when = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short", year: "2-digit" });

  return (
    <>
      <PageHeader title="Contacts" sub="Everyone who has been in touch, and what came of it." />

      <StatRow>
        <Stat label="People" value={String(contacts.length)} />
        <Stat label="Enquiries" value={String(leads.length)} />
        <Stat label="Still open" value={String(openLeads)} tone={openLeads ? "warn" : "plain"} />
        <Stat label="Won" value={String(won.length)} tone="good" />
        <Stat label="Value won" value={money(wonValue)} />
      </StatRow>

      <Panel
        aside={
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="contact-search" className="sr-only">Search contacts</label>
            <input
              id="contact-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Name, email, phone, Eircode"
              className="w-56 rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
            <button type="submit" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Search
            </button>
          </form>
        }
        title="People"
      >
        {contacts.length === 0 ? (
          <Empty
            title={q ? "Nobody matches that" : "No contacts yet"}
            detail={q ? "Try part of a name, an email or a phone number." : "People appear here as enquiries and orders come in."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-2 font-medium">Name</th>
                  <th scope="col" className="px-4 py-2 font-medium">Contact</th>
                  <th scope="col" className="px-4 py-2 font-medium">Where</th>
                  <th scope="col" className="px-4 py-2 font-medium">Latest</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Enquiries</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map((c) => {
                  const mine = byContact.get(c.id) ?? [];
                  const latest = mine[0];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <Link href={`/crm/contacts/${c.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
                          {displayName(c)}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        <span className="block">{c.email ?? "–"}</span>
                        {c.phone && <span className="block text-xs text-slate-500">{c.phone}</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{[c.city, c.county].filter(Boolean).join(", ") || "–"}</td>
                      <td className="px-4 py-2">
                        {latest ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_TONE[latest.status]}`}>
                            {latest.status}
                          </span>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">{mine.length}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-500">{when(c.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
