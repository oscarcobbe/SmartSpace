/**
 * The four answers the first screen owes.
 *
 * Each one is its own async component behind its own Suspense boundary,
 * because they read three different services and the slowest of them should
 * not decide when the first one appears. Fetched together in one component,
 * the page sat blank for as long as Google Ads took.
 */
import Link from "next/link";
import { AlertCircle, Inbox } from "lucide-react";
import { fetchLeads, partialFeed, staleFeed, money, moneyExact } from "@/lib/crm/leads";
import { displayName } from "@/lib/crm/diary";
import { plainText, shortDay, slotText } from "@/lib/crm/display";
import { fetchFinance } from "@/lib/crm/stripe-finance";
import { fetchAds, adsSplit } from "@/lib/crm/google-ads";
import { crm, crmConfigured, unlessWrongKey, type Site } from "@/lib/crm/db";
import { fetchDiary } from "@/lib/crm/diary";
import { DiaryToggle, type Row } from "./diary-toggle";
import { Panel, PanelLink, Stat, Note, Empty, Skeleton } from "./ui";
import { SlowNote } from "./slow-note";

const dash = (v: string | undefined) => plainText(v);

export function PanelSkeleton({ title, rows = 3, slow }: { title: string; rows?: number; slow?: string }) {
  return (
    <Panel title={title}>
      {slow && <div className="px-4 pt-3 [&>p]:mb-0"><SlowNote>{slow}</SlowNote></div>}
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

/**
 * The diary, and anything genuinely overdue.
 *
 * This was titled "Needs you" and listed bookings, which are not things that
 * need you, they are places to be. Worse, it rendered them in feed order, so
 * 5 October appeared above 23 September and the panel could not be read as a
 * plan. Overdue tasks are the part that really does need him, so they keep the
 * red strip at the top; the bookings below are now two orderings behind a
 * toggle.
 */
export async function NeedsYou({ site }: { site: Site }) {
  /* Today in Dublin: after midnight UTC and before midnight here, the UTC date
     called tomorrow's steps overdue a day early. */
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const [diary, overdue] = await Promise.all([
    fetchDiary(site),
    (async (): Promise<{ rows: { id: string; what: string; due_on: string | null }[] } | { problem: string }> => {
      if (!crmConfigured()) return { problem: "The database is not connected, so overdue next steps cannot be shown." };
      try {
        const rows = await crm<{ id: string; what: string; due_on: string | null }[]>(
          `crm_tasks?site=eq.${site}&done_at=is.null&due_on=lt.${today}&select=id,what,due_on&order=due_on.asc&limit=5`,
        );
        return { rows: await unlessWrongKey(rows) };
      } catch (err) {
        /* This used to be caught and dropped, so a database hiccup made the
           red "overdue" strip vanish and read as "nothing is late". */
        return { problem: `Overdue next steps could not be read (${err instanceof Error ? err.message.slice(0, 240) : "no answer"}).` };
      }
    })(),
  ]);

  const toRow = (r: (typeof diary.upcoming)[number], i: number): Row => ({
    key: `${r.job.orderId}-${r.on ?? ""}-${i}`,
    name: r.name,
    standIn: r.standIn,
    product: dash(r.job.product) || r.job.type,
    when: r.label,
    slot: slotText(r.job.bookingSlot),
    amount: dash(r.job.amount),
  });

  const late = "rows" in overdue ? overdue.rows : [];
  const notes = [
    diary.problem ? `Bookings are missing here. ${diary.problem}` : null,
    ...diary.warnings,
    "problem" in overdue ? overdue.problem : null,
  ].filter((n): n is string => Boolean(n));

  return (
    <Panel title="Diary" aside={<PanelLink href="/crm/week">Full week</PanelLink>}>
      {notes.length > 0 && (
        <div className={`space-y-2 px-4 pt-4 ${diary.problem ? "pb-4" : ""}`}>
          {notes.map((n) => <Note key={n} tone="warn">{n}</Note>)}
        </div>
      )}

      {late.length > 0 && (
        <ul className="divide-y divide-rose-100 border-b border-rose-100 bg-rose-50/50">
          {late.map((t) => (
            <li key={t.id}>
              <Link href="/crm/tasks" className="flex min-h-[44px] items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-rose-50">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
                <span className="min-w-0 truncate text-slate-800">{t.what}</span>
                <span className="ml-auto shrink-0 text-xs font-medium tabular-nums text-rose-700">
                  {/* Europe/Dublin, not the machine's clock. A date-only column
                      parses as UTC midnight, and on a host set to America/Denver
                      that renders as the previous day: every due date on this
                      panel was showing one day early. */}
                  due {new Date(t.due_on!).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short" })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!diary.problem && (
        <DiaryToggle
          upcoming={diary.upcoming.map(toRow)}
          justBooked={diary.justBooked.map(toRow)}
        />
      )}
    </Panel>
  );
}

/** The last few things that came in, whatever they were. */
export async function LatestIn({ site }: { site: Site }) {
  const feed = await fetchLeads(site);
  const title = "Latest in";
  const all = <PanelLink href="/crm/orders">{site === "smartcareliving" ? "All enquiries" : "All orders"}</PanelLink>;
  if (!feed.ok) {
    return (
      <Panel title={title} aside={all}>
        <div className="px-4 py-4"><Note tone="warn">{feed.reason}</Note></div>
      </Panel>
    );
  }
  const rows = feed.data.leads.slice(0, 6);
  const notes = [staleFeed(feed.data), partialFeed(feed.data)].filter((n): n is string => Boolean(n));
  return (
    <Panel title={title} aside={all}>
      {notes.length > 0 && (
        <div className="space-y-2 px-4 pt-4">{notes.map((n) => <Note key={n} tone="warn">{n}</Note>)}</div>
      )}
      {rows.length === 0 ? (
        <Empty title="Nothing has come in yet" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((l, i) => (
            <li key={`${l.orderId}-${i}`} className="flex items-start gap-2.5 px-4 py-2.5 text-sm">
              <Inbox className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="min-w-0">
                {/* The same fallback the Diary uses, so one customer is not
                    "Unnamed" here and "stackthedrummer" one panel over. */}
                <span className="block truncate text-slate-900">{displayName(l)}</span>
                <span className="block truncate text-xs text-slate-500">{dash(l.product) || dash(l.email) || l.type}</span>
              </span>
              <span className="ml-auto shrink-0 text-right">
                {dash(l.amount) && <span className="block text-sm font-medium tabular-nums text-slate-900">{l.amount}</span>}
                <span className="block text-xs tabular-nums text-slate-500">{shortDay(l.date)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export async function MoneyThisMonth({ site }: { site: Site }) {
  const result = await fetchFinance(2, site);
  if (!result.ok) {
    return (
      <Panel title="Money" aside={<PanelLink href="/crm/finance">Finance</PanelLink>}>
        <div className="px-4 py-4"><Note tone="warn">Stripe could not be read, so this month&rsquo;s money is not shown. {result.reason}</Note></div>
      </Panel>
    );
  }
  const f = result.data;
  const now = f.months[f.months.length - 1];
  const prev = f.months[f.months.length - 2];

  /*
   * Like for like, or not at all.
   *
   * This compared the month so far against the WHOLE of last month, so on the
   * 17th it set seventeen days against thirty-one and read "down 45%". It said
   * that every month, all month, and only came right on the final day. A
   * figure that is wrong in a predictable direction is worse than no figure,
   * because somebody eventually makes a decision on it.
   *
   * So the comparison is against the same span of last month, and the note
   * says which span, because a percentage nobody can see the basis of is the
   * thing that produced the original bug.
   */
  const basis = prev && !prev.completeToDate ? prev.netToDate : prev?.net ?? 0;
  const change = prev && basis > 0 ? ((now.net - basis) / basis) * 100 : null;
  const spanDays = new Date().getUTCDate();
  const against = prev && !prev.completeToDate
    ? `the first ${spanDays} days of ${prev.label}`
    : prev?.label ?? "";

  return (
    <Panel title="Money" aside={<PanelLink href="/crm/finance">Finance</PanelLink>}>
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <Stat
          label={`Kept in ${now.label}`}
          value={money(now.net)}
          note={change === null ? `${now.payments} payments` : `${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% on ${against}`}
          tone={change === null ? "plain" : change >= 0 ? "good" : "warn"}
          /* Straight to the month's own rows rather than to Finance, which
             would only ask him to find the month again when he is already
             looking at it. */
          source={now.payments > 0 ? { href: `/crm/orders?month=${now.key}`, label: "See the payments" } : undefined}
        />
        {f.balanceProblem ? (
          /* Not a zero. The months above were read; the balance was not. */
          <Stat label="Next payout" value="Not read" tone="muted" note={f.balanceProblem} explain="nextPayout" />
        ) : (
          <Stat
            label="Next payout"
            value={moneyExact(f.available + f.pending)}
            note={site === "smartcareliving" ? "At Stripe, one account for both businesses" : "Available and pending at Stripe"} explain="nextPayout"
            source={{ href: "/crm/finance", label: "See the money" }}
          />
        )}
      </div>
    </Panel>
  );
}

export async function AdsThisMonth({ site }: { site: Site }) {
  const result = await fetchAds(site, 2);
  if (!result.ok) {
    return (
      <Panel title="Advertising" aside={<PanelLink href="/crm/marketing">Marketing</PanelLink>}>
        <div className="px-4 py-4"><Note tone="warn">Google Ads could not be read, so this month&rsquo;s spend is not shown. {result.reason}</Note></div>
      </Panel>
    );
  }
  const a = result.data;
  const { own } = adsSplit(a);
  const now = own.months[own.months.length - 1];

  /*
   * This used to divide Google's attributed value by the spend and print the
   * result as a return, in red. On the account it was written against that
   * read "0.1x" off 32 euro against 379, and the client quite reasonably asked
   * why the Marketing page said something completely different.
   *
   * Both were describing real numbers and neither was describing a return. The
   * 32 euro is not sales: it is the sum of the fixed placeholder values sitting
   * on the lead actions, a euro for a call and ten for a form, set when the
   * actions were created. Dividing invented numbers by real spend produces an
   * invented ratio, and putting it in red asserts a failure that has not been
   * measured.
   *
   * So the panel now shows what is actually counted: what was spent, how many
   * enquiries came, and what each cost. The return question lives on Marketing,
   * where the basis is named and switchable, and this says so rather than
   * answering it differently.
   */
  const perEnquiry = now.conversions ? now.cost / now.conversions : null;

  return (
    <Panel title="Advertising" aside={<PanelLink href="/crm/marketing">Marketing</PanelLink>}>
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <Stat
          label={`Spent in ${now.label}`}
          value={money(now.cost)}
          note={`${now.clicks} clicks so far this month`}
          source={{ href: "/crm/marketing", label: "See what came back" }}
        />
        <Stat
          label="Cost per enquiry"
          value={perEnquiry === null ? "None yet" : moneyExact(perEnquiry)}
          note={now.conversions ? `${now.conversions.toFixed(0)} enquiries in ${now.label}` : "No enquiries yet this month"}
          tone={perEnquiry === null ? "muted" : perEnquiry <= 60 ? "good" : perEnquiry <= 100 ? "warn" : "bad"}
          source={{ href: "/crm/marketing", label: "See what came back" }}
        />
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        What came back for this is on{" "}
        <Link href="/crm/marketing" className="font-medium text-slate-700 underline-offset-2 hover:underline">Marketing</Link>,
        where you can choose whether to count every euro Stripe took or only what Google could tie to a click.
      </p>
    </Panel>
  );
}

/** Small, because it is a reassurance rather than a working surface. */
export async function RecentActivity({ site }: { site: Site }) {
  if (!crmConfigured()) return null;
  let rows: { id: string; summary: string; happened_at: string; actor: string | null; contact_id: string | null }[] | null;
  try {
    rows = await unlessWrongKey(await crm<{ id: string; summary: string; happened_at: string; actor: string | null; contact_id: string | null }[]>(
      `crm_activity?site=eq.${site}&select=id,summary,happened_at,actor,contact_id&order=happened_at.desc&limit=8`,
    ));
  } catch (err) {
    /* It used to vanish on a failed read, which looks exactly like a quiet
       week. Say so instead. */
    return (
      <Panel title="Recently">
        <div className="px-4 py-4">
          <Note tone="warn">The history could not be read ({err instanceof Error ? err.message.slice(0, 240) : "no answer"}).</Note>
        </div>
      </Panel>
    );
  }
  if (!rows?.length) return null;

  return (
    <Panel title="Recently">
      <ol className="divide-y divide-slate-100">
        {rows.map((a) => (
          <li key={a.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
            <span className="w-16 shrink-0 text-xs tabular-nums text-slate-500 sm:w-20">
              {new Date(a.happened_at).toLocaleDateString("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short" })}
            </span>
            <span className="min-w-0 flex-1 text-slate-800">
              {a.contact_id ? (
                <Link href={`/crm/contacts/${a.contact_id}`} className="hover:underline hover:underline-offset-2">{plainText(a.summary)}</Link>
              ) : (
                plainText(a.summary)
              )}
            </span>
            {a.actor && <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">{a.actor}</span>}
          </li>
        ))}
      </ol>
    </Panel>
  );
}
