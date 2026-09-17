import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { listPeople, fullAddress } from "@/lib/crm/people";
import { money } from "@/lib/crm/leads";
import { STATUS_PILL, STATUS_LABEL, telHref } from "@/lib/crm/labels";
import { PageHeader, Panel, Empty, Pill, Note } from "../ui";

export const dynamic = "force-dynamic";

/** Digits only, so 087 123 4567 finds 0871234567 and +353871234567. */
const digits = (v: string) => v.replace(/[^\d]/g, "");

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const { site } = requireSession();
  const q = (searchParams.q ?? "").trim();

  const box = (
    <form method="get" action="/crm/search" className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <label htmlFor="q" className="sr-only">Search everything</label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={q}
        autoFocus
        placeholder="Name, phone, email, Eircode, town, order number"
        className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
    </form>
  );

  if (!q) {
    return (
      <>
        <PageHeader title="Search" sub="Everyone and everything, in one box." />
        <div className="max-w-2xl">{box}</div>
        <p className="mt-4 max-w-2xl text-sm text-slate-500">
          Part of a name is enough. So is the last four digits of a phone number, an Eircode, a
          town, or the order number off a Stripe receipt.
        </p>
      </>
    );
  }

  const { people, problems } = await listPeople(site);
  const needle = q.toLowerCase();
  const needleDigits = digits(q);

  const hits = people
    .map((p) => {
      const haystack = [p.name, p.email, p.phone, p.address, p.city, p.county, p.eircode, p.notes]
        .filter(Boolean).join(" ").toLowerCase();
      const orderMatch = p.feed.some((f) => (f.orderId ?? "").toLowerCase().includes(needle));
      /* A phone match is done on digits so the way it was typed does not
         matter: 087 123 4567, 0871234567 and +353871234567 are one number. */
      const phoneMatch = needleDigits.length >= 4 && digits(p.phone ?? "").includes(needleDigits);
      if (!haystack.includes(needle) && !orderMatch && !phoneMatch) return null;
      /* Name matches first, then the rest. Somebody searching "byrne" wants
         the Byrnes, not everyone who lives on Byrne Road. */
      const rank = (p.name ?? "").toLowerCase().includes(needle) ? 0 : 1;
      return { p, rank };
    })
    .filter((x): x is { p: (typeof people)[number]; rank: number } => x !== null)
    .sort((a, b) => a.rank - b.rank || (b.p.lastActivity ?? "").localeCompare(a.p.lastActivity ?? ""))
    .slice(0, 50);

  return (
    <>
      <PageHeader title="Search" sub={`${hits.length === 50 ? "First 50 matches" : `${hits.length} ${hits.length === 1 ? "match" : "matches"}`} for "${q}".`} />
      <div className="mb-6 max-w-2xl">{box}</div>

      {problems.length > 0 && (
        <div className="mb-6 space-y-2">{problems.map((p) => <Note key={p} tone="warn">{p}</Note>)}</div>
      )}

      <Panel>
        {hits.length === 0 ? (
          <Empty
            title="Nothing matches that"
            detail="Try less of it. Part of a surname, or the last four digits of the number."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {hits.map(({ p }) => {
              const tel = telHref(p.phone);
              return (
                <li key={p.id} className="flex items-start gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/crm/contacts/${encodeURIComponent(p.id)}`}
                      className="font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {[p.email, p.phone].filter(Boolean).join("  ·  ") || "No contact details"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{fullAddress(p) || "No address"}</p>
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    {p.paid > 0 && <p className="text-sm font-medium tabular-nums text-slate-900">{money(p.paid)}</p>}
                    {p.status && <Pill className={STATUS_PILL[p.status]}>{STATUS_LABEL[p.status]}</Pill>}
                    {tel && (
                      <a href={tel} className="block text-xs font-medium text-slate-600 hover:text-slate-900">Ring</a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
