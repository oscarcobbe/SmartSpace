/**
 * The four answers the first screen owes.
 *
 * Each one is its own async component behind its own Suspense boundary,
 * because they read three different services and the slowest of them should
 * not decide when the first one appears. Fetched together in one component,
 * the page sat blank for as long as Google Ads took.
 */
import Link from "next/link";
import { AlertCircle, CalendarClock, Inbox } from "lucide-react";
import { fetchLeads, money, moneyExact, type Lead } from "@/lib/crm/leads";
import { fetchFinance } from "@/lib/crm/stripe-finance";
import { fetchAds, adsSplit } from "@/lib/crm/google-ads";
import { crm, crmConfigured, type Site } from "@/lib/crm/db";
import { Panel, Stat, Note, Empty, Skeleton } from "./ui";

const dash = (v: string | undefined) => (!v || v === "-" ? "" : v);
const dayOnly = (v: string) => dash(v).split(",")[0] ?? "";

export function PanelSkeleton({ title, rows = 3 }: { title: string; rows?: number }) {
  return (
    <Panel title={title}>
      <div className="space-y-3 px-4 py-4" aria-busy="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-24 shrink-0" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** What is booked in, and what is overdue. */
export async function NeedsYou({ site }: { site: Site }) {
  const [feed, overdue] = await Promise.all([
    fetchLeads(),
    crmConfigured()
      ? crm<{ id: string; what: string; due_on: string | null }[]>(
          `crm_tasks?site=eq.${site}&done_at=is.null&due_on=lt.${new Date().toISOString().slice(0, 10)}&select=id,what,due_on&order=due_on.asc&limit=5`,
        ).catch(() => null)
      : Promise.resolve(null),
  ]);

  const upcoming: Lead[] = feed.ok ? feed.data.leads.filter((l) => l.upcoming).slice(0, 6) : [];

  return (
    <Panel
      title="Needs you"
      aside={<Link href="/crm/tasks" className="text-xs font-medium text-slate-600 hover:text-slate-900">All next steps</Link>}
    >
      {!feed.ok && (
        <div className="px-4 pt-4">
          <Note tone="warn">The orders feed could not be read, so bookings are missing here. {feed.reason}</Note>
        </div>
      )}

      {(overdue?.length ?? 0) > 0 && (
        <ul className="divide-y divide-slate-100 border-b border-slate-200 bg-rose-50/40">
          {overdue!.map((t) => (
            <li key={t.id} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
              <span className="text-slate-800">{t.what}</span>
              <span className="ml-auto shrink-0 text-xs font-medium tabular-nums text-rose-700">
                {/* Europe/Dublin, not the machine's clock. A date-only column
                    parses as UTC midnight, and on a host set to America/Denver
                    that renders as the previous day: every due date on this
                    panel was showing one day early. */}
                due {new Date(t.due_on!).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short" })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {upcoming.length === 0 && (overdue?.length ?? 0) === 0 ? (
        <Empty title="Nothing booked and nothing overdue" detail="Upcoming installs and calls appear here." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {upcoming.map((l, i) => (
            <li key={`${l.orderId}-${i}`} className="flex items-start gap-2.5 px-4 py-2.5 text-sm">
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-slate-900">{dash(l.name) || "Unnamed"}</span>
                <span className="block truncate text-xs text-slate-500">{dash(l.product) || l.type}</span>
              </span>
              <span className="ml-auto shrink-0 text-right">
                <span className="block text-xs tabular-nums text-slate-700">{dayOnly(l.bookingDate) || dayOnly(l.date)}</span>
                {dash(l.bookingSlot) && <span className="block text-xs text-slate-500">{l.bookingSlot}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** The last few things that came in, whatever they were. */
export async function LatestIn() {
  const feed = await fetchLeads();
  if (!feed.ok) {
    return (
      <Panel title="Latest in">
        <div className="px-4 py-4"><Note tone="warn">{feed.reason}</Note></div>
      </Panel>
    );
  }
  const rows = feed.data.leads.slice(0, 6);
  return (
    <Panel
      title="Latest in"
      aside={<Link href="/crm/orders" className="text-xs font-medium text-slate-600 hover:text-slate-900">All orders</Link>}
    >
      {rows.length === 0 ? (
        <Empty title="Nothing yet today" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((l, i) => (
            <li key={`${l.orderId}-${i}`} className="flex items-start gap-2.5 px-4 py-2.5 text-sm">
              <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate text-slate-900">{dash(l.name) || "Unnamed"}</span>
                <span className="block truncate text-xs text-slate-500">{dash(l.product) || dash(l.email) || l.type}</span>
              </span>
              <span className="ml-auto shrink-0 text-right">
                {dash(l.amount) && <span className="block text-sm font-medium tabular-nums text-slate-900">{l.amount}</span>}
                <span className="block text-xs tabular-nums text-slate-500">{dayOnly(l.date)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export async function MoneyThisMonth() {
  const result = await fetchFinance(2);
  if (!result.ok) {
    return (
      <Panel title="Money">
        <div className="px-4 py-4"><Note tone="warn">Stripe could not be read. {result.reason}</Note></div>
      </Panel>
    );
  }
  const f = result.data;
  const now = f.months[f.months.length - 1];
  const prev = f.months[f.months.length - 2];
  const change = prev && prev.net > 0 ? ((now.net - prev.net) / prev.net) * 100 : null;

  return (
    <Panel
      title="Money"
      aside={<Link href="/crm/finance" className="text-xs font-medium text-slate-600 hover:text-slate-900">Finance</Link>}
    >
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <Stat
          label={`Kept in ${now.label}`}
          value={money(now.net)}
          note={change === null ? `${now.payments} payments` : `${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% on ${prev.label}`}
          tone={change === null ? "plain" : change >= 0 ? "good" : "warn"}
        />
        <Stat
          label="Next payout"
          value={moneyExact(f.available + f.pending)}
          note="Available and pending at Stripe"
        />
      </div>
    </Panel>
  );
}

export async function AdsThisMonth({ site }: { site: Site }) {
  const result = await fetchAds(site, 2);
  if (!result.ok) {
    return (
      <Panel title="Advertising">
        <div className="px-4 py-4"><Note tone="warn">Google Ads could not be read. {result.reason}</Note></div>
      </Panel>
    );
  }
  const a = result.data;
  const { own } = adsSplit(a);
  const now = own.months[own.months.length - 1];
  const roas = now.cost ? now.value / now.cost : 0;

  return (
    <Panel
      title="Advertising"
      aside={<Link href="/crm/marketing" className="text-xs font-medium text-slate-600 hover:text-slate-900">Marketing</Link>}
    >
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <Stat
          label={`Spent in ${now.label}`}
          value={money(now.cost)}
          note={now.conversions ? `${now.conversions.toFixed(0)} enquiries, ${moneyExact(now.cost / now.conversions)} each` : "No enquiries yet"}
        />
        <Stat
          label="Back on that"
          value={now.cost ? `${roas.toFixed(1)}x` : "–"}
          note={now.value ? money(now.value) + " of work won" : "Nothing recorded yet"}
          tone={roas >= 3 ? "good" : roas >= 1 ? "warn" : now.cost ? "bad" : "plain"}
        />
      </div>
    </Panel>
  );
}

/** Small, because it is a reassurance rather than a working surface. */
export async function RecentActivity({ site }: { site: Site }) {
  if (!crmConfigured()) return null;
  const rows = await crm<{ id: string; summary: string; happened_at: string; actor: string | null; contact_id: string | null }[]>(
    `crm_activity?site=eq.${site}&select=id,summary,happened_at,actor,contact_id&order=happened_at.desc&limit=8`,
  ).catch(() => null);
  if (!rows?.length) return null;

  return (
    <Panel title="Recently">
      <ol className="divide-y divide-slate-100">
        {rows.map((a) => (
          <li key={a.id} className="flex items-baseline gap-3 px-4 py-2 text-sm">
            <span className="w-24 shrink-0 text-xs tabular-nums text-slate-500">
              {new Date(a.happened_at).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "2-digit", month: "short" })}
            </span>
            <span className="min-w-0 text-slate-800">
              {a.contact_id ? (
                <Link href={`/crm/contacts/${a.contact_id}`} className="hover:underline hover:underline-offset-2">{a.summary}</Link>
              ) : (
                a.summary
              )}
            </span>
            {a.actor && <span className="ml-auto shrink-0 text-xs text-slate-400">{a.actor}</span>}
          </li>
        ))}
      </ol>
    </Panel>
  );
}


