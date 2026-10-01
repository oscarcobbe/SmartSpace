/**
 * The two tables under the headline chart on Marketing.
 *
 * ChannelTable answers "which channel": Google's ads and ChatGPT's, each with
 * what it cost, the enquiries and sales it brought and what came back, and
 * the two together. Each channel's money is its own, never the other's
 * (roas-months.ts).
 *
 * WhatsWorking answers "which ad groups, which keywords", from our own record
 * of enquiries and payments joined to the click that brought them
 * (ads-working.ts), not from Google's consent-limited conversion count.
 */
import { money, moneyExact } from "@/lib/crm/leads";
import type { Working, WorkingRow } from "@/lib/crm/ads-working";
import ExportButton from "./export-button";
import { Note } from "./ui";

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);
const ratio = (back: number, cost: number) => (cost > 0 ? `${(back / cost).toFixed(2)}×` : "-");
const each = (cost: number, n: number) => (n > 0 ? moneyExact(cost / n) : "-");

export interface ChannelFigures {
  label: string;
  cost: number;
  clicks: number;
  enquiries: number;
  /** "4 from the website, 4 calls", for the cell's title. */
  enquiriesDetail?: string;
  sales: number;
  /** Traced, plus the estimate where there is one. */
  back: number;
  estimated: number;
  /** Shown under the channel's name: "Not running yet". */
  note?: string;
  muted?: boolean;
}

export function ChannelTable({ rows, total, period }: { rows: ChannelFigures[]; total: ChannelFigures; period: string }) {
  const cell = "px-3 py-2.5 text-right tabular-nums";
  const line = (r: ChannelFigures, strong = false) => (
    <tr key={r.label} className={strong ? "bg-slate-50 font-semibold text-slate-900" : r.muted ? "text-slate-400" : "text-slate-700"}>
      <th scope="row" className="px-5 py-2.5 text-left font-medium text-slate-900">
        {r.label}
        {r.note && <span className="block text-[11.5px] font-normal text-slate-500">{r.note}</span>}
      </th>
      <td className={cell}>{money(r.cost)}</td>
      <td className={cell}>{int(r.clicks)}</td>
      <td className={cell} title={r.enquiriesDetail}>{int(r.enquiries)}</td>
      <td className={cell}>{each(r.cost, r.enquiries)}</td>
      <td className={cell}>{int(r.sales)}</td>
      <td className={cell}>{r.estimated > 0 ? "~" : ""}{money(r.back)}</td>
      <td className={`${cell} pr-5 font-semibold text-slate-900`}>{r.muted && r.cost === 0 ? "-" : `${r.estimated > 0 ? "~" : ""}${ratio(r.back, r.cost)}`}</td>
    </tr>
  );
  /* Under sm a table of eight columns is a sideways scroll nobody reads, so
     each channel is a card with its figures in a grid. */
  const card = (r: ChannelFigures, strong = false) => (
    <li key={r.label} className={`px-4 py-3 ${strong ? "bg-slate-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-slate-900">{r.label}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">
          {r.muted && r.cost === 0 ? "-" : `${r.estimated > 0 ? "~" : ""}${ratio(r.back, r.cost)} back per €1`}
        </span>
      </div>
      {r.note && <p className="text-[11.5px] text-slate-500">{r.note}</p>}
      <dl className={`mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs ${r.muted ? "text-slate-400" : "text-slate-600"}`}>
        {([["Spent", money(r.cost)], ["Enquiries", int(r.enquiries)], ["Each", each(r.cost, r.enquiries)],
           ["Clicks", int(r.clicks)], ["Sales", int(r.sales)], ["Came back", `${r.estimated > 0 ? "~" : ""}${money(r.back)}`]] as const).map(([k, v]) => (
          <div key={k}><dt className="text-[10.5px] uppercase tracking-wider text-slate-500">{k}</dt><dd className="font-semibold tabular-nums text-slate-900">{v}</dd></div>
        ))}
      </dl>
    </li>
  );
  return (
    <>
    <ul className="divide-y divide-slate-100 sm:hidden">
      {rows.map((r) => card(r))}
      {card(total, true)}
    </ul>
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[44rem] text-sm">
        <caption className="sr-only">Each ad channel over {period}</caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th scope="col" className="px-5 py-2 font-semibold">Channel</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Spent</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Clicks</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Enquiries</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Cost per enquiry</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Sales</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Came back</th>
            <th scope="col" className="px-5 py-2 text-right font-semibold">Back per €1</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => line(r))}
          {line(total, true)}
        </tbody>
      </table>
    </div>
    </>
  );
}

/* ─── What's working ──────────────────────────────────────────── */

const enquiriesOf = (r: WorkingRow) => r.web + Math.round(r.calls);

/** Money first, then enquiries, then the cheaper of two that tie. */
function rank(a: WorkingRow, b: WorkingRow) {
  return b.back - a.back || enquiriesOf(b) - enquiriesOf(a) || a.cost - b.cost;
}

function Best({ rows, what }: { rows: WorkingRow[]; what: string }) {
  const withEnq = rows.filter((r) => enquiriesOf(r) > 0);
  if (!withEnq.length) return null;
  const most = [...withEnq].sort((a, b) => enquiriesOf(b) - enquiriesOf(a) || a.cost - b.cost)[0]!;
  const cheapest = [...withEnq].filter((r) => r.cost > 0).sort((a, b) => a.cost / enquiriesOf(a) - b.cost / enquiriesOf(b))[0];
  const earner = [...rows].filter((r) => r.back > 0).sort((a, b) => b.back - a.back)[0];
  const cards: { k: string; name: string; v: string }[] = [
    { k: `Most enquiries, by ${what}`, name: most.name, v: `${enquiriesOf(most)} enquir${enquiriesOf(most) === 1 ? "y" : "ies"} on ${money(most.cost)}` },
  ];
  if (cheapest && cheapest !== most) cards.push({ k: "Cheapest enquiry", name: cheapest.name, v: `${each(cheapest.cost, enquiriesOf(cheapest))} each` });
  if (earner) cards.push({ k: "Most money back", name: earner.name, v: `${money(earner.back)} on ${money(earner.cost)}` });
  return (
    <div className="grid gap-3 px-5 pt-4 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.k} className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">{c.k}</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-900" title={c.name}>{c.name}</div>
          <div className="text-xs text-slate-600">{c.v}</div>
        </div>
      ))}
    </div>
  );
}

function RowsTable({ rows, keyword, maxEnq }: { rows: WorkingRow[]; keyword: boolean; maxEnq: number }) {
  const cell = "px-3 py-2 text-right tabular-nums text-slate-700";
  return (
    <>
    <ul className="divide-y divide-slate-100 border-t border-slate-200 sm:hidden">
      {rows.map((r) => {
        const n = enquiriesOf(r);
        return (
          <li key={r.key} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-medium text-slate-900" title={r.name}>{r.name}</span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-900">
                {n} enquir{n === 1 ? "y" : "ies"}{r.back ? ` · ${money(r.back)}` : ""}
              </span>
            </div>
            <p className="mt-0.5 text-xs tabular-nums text-slate-500">
              {moneyExact(r.cost)} spent, {int(r.clicks)} clicks{n ? `, ${each(r.cost, n)} each` : ""}
              {r.sales ? `, ${r.sales} sale${r.sales === 1 ? "" : "s"}, ${ratio(r.back, r.cost)} back` : ""}
            </p>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${maxEnq ? (n / maxEnq) * 100 : 0}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
    <div className="hidden overflow-x-auto sm:block">
      <table className="w-full min-w-[46rem] text-sm">
        <thead>
          <tr className="border-y border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th scope="col" className="px-5 py-2 font-semibold">{keyword ? "Keyword" : "Ad group"}</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Spent</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Clicks</th>
            <th scope="col" className="px-3 py-2 font-semibold">Enquiries</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Cost per enquiry</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Sales</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Came back</th>
            <th scope="col" className="px-5 py-2 text-right font-semibold">Back per €1</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const n = enquiriesOf(r);
            return (
              <tr key={r.key} className={n === 0 && r.sales === 0 ? "text-slate-500" : undefined}>
                <td className="max-w-[20rem] px-5 py-2">
                  <span className="block truncate font-medium text-slate-900" title={r.name}>{r.name}</span>
                  {keyword && (
                    <span className="block truncate text-[11.5px] text-slate-500" title={r.adGroup}>
                      {r.matchType ? `${r.matchType.toLowerCase()} match · ` : ""}{r.adGroup}
                    </span>
                  )}
                </td>
                <td className={cell}>{moneyExact(r.cost)}</td>
                <td className={cell}>{int(r.clicks)}</td>
                <td className="px-3 py-2" title={`${r.web} from the website, ${Math.round(r.calls)} call${Math.round(r.calls) === 1 ? "" : "s"} from the ad. Google's own count: ${r.googleConversions.toFixed(0)}.`}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-right font-semibold tabular-nums text-slate-900">{n}</span>
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                      <span className="block h-full rounded-full bg-indigo-500" style={{ width: `${maxEnq ? (n / maxEnq) * 100 : 0}%` }} />
                    </span>
                  </div>
                </td>
                <td className={cell}>{each(r.cost, n)}</td>
                <td className={cell}>{r.sales || "-"}</td>
                <td className={cell}>{r.back ? money(r.back) : "-"}</td>
                <td className="px-5 py-2 text-right font-semibold tabular-nums text-slate-900">{r.back ? ratio(r.back, r.cost) : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

export function WhatsWorking({ data, siteLabel }: { data: Working; siteLabel: string }) {
  const show = (r: WorkingRow) => r.cost > 0 || enquiriesOf(r) > 0 || r.sales > 0;
  const groups = data.adGroups.filter(show).sort(rank);
  const keywords = data.keywords.filter(show).sort(rank);
  /* Ad groups lead when there is more than one that spent; with one, every
     row would be the same ad group, and the keywords are the answer. */
  const spendingGroups = groups.filter((g) => g.cost > 0).length;
  const byGroup = spendingGroups > 1;
  const lead = byGroup ? groups : keywords;
  const maxEnq = Math.max(1, ...lead.map(enquiriesOf), ...keywords.map(enquiriesOf));
  const nothing = keywords.filter((r) => r.cost >= 20 && enquiriesOf(r) === 0 && r.sales === 0).sort((a, b) => b.cost - a.cost);
  /* Every ad group is shown. Keywords are shown when they brought something
     or cost €20 or more; a long tail of one-click keywords at a euro each is
     folded away, because it pushed the answer off the screen. */
  const matters = (r: WorkingRow) => enquiriesOf(r) > 0 || r.sales > 0 || r.cost >= 20;
  const top = byGroup ? groups : keywords.filter(matters);
  const rest = byGroup ? keywords : keywords.filter((r) => !matters(r));
  const unknownAll = data.unknown.web + data.unknown.sales;

  return (
    <div id="working" className="scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">What&apos;s working</h2>
          <p className="mt-0.5 max-w-[70ch] text-xs text-slate-500">
            {siteLabel}, the last 90 days. Each enquiry and payment is traced by its ad click to the
            {byGroup ? " ad group and keyword" : " keyword"} it came from. Spend and clicks are Google&apos;s; calls from the
            ad are counted as Google credits them.
            {!byGroup && " The ads run as one ad group, so this goes by keyword."}
          </p>
        </div>
        <ExportButton
          filename="whats-working"
          headers={["Kind", "Name", "Ad group", "Match", "Spent", "Clicks", "Website enquiries", "Calls", "Google's count", "Sales", "Came back"]}
          rows={[
            ...groups.map((r) => ["Ad group", r.name, "", "", r.cost.toFixed(2), r.clicks, r.web, Math.round(r.calls), r.googleConversions.toFixed(0), r.sales, r.back.toFixed(2)]),
            ...keywords.map((r) => ["Keyword", r.name, r.adGroup, r.matchType, r.cost.toFixed(2), r.clicks, r.web, Math.round(r.calls), r.googleConversions.toFixed(0), r.sales, r.back.toFixed(2)]),
          ]}
        />
      </div>

      {data.partial && <div className="px-5 pt-4"><Note tone="warn">{data.partial}</Note></div>}

      <Best rows={lead} what={byGroup ? "ad group" : "keyword"} />

      <div className="mt-4">
        {top.length ? <RowsTable rows={top} keyword={!byGroup} maxEnq={maxEnq} /> : (
          <div className="px-5 pb-4"><Note>No ad spend in the last 90 days.</Note></div>
        )}
      </div>

      {rest.length > 0 && (
        <details className="group border-t border-slate-100">
          <summary className="cursor-pointer list-none px-5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <span className="group-open:hidden">
              {byGroup ? `Show every keyword (${rest.length})` : `Show ${rest.length} more keyword${rest.length === 1 ? "" : "s"}, each under €20 with nothing back`}
            </span>
            <span className="hidden group-open:inline">Hide them</span>
          </summary>
          <RowsTable rows={rest} keyword maxEnq={maxEnq} />
        </details>
      )}

      {nothing.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">Spending with nothing back yet</h3>
          <p className="mt-0.5 text-xs text-slate-500">Keywords that cost €20 or more in 90 days and brought no enquiry, call or sale.</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {nothing.slice(0, 12).map((r) => (
              <li key={r.key} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
                <span className="font-medium">{r.name}</span> · {money(r.cost)}, {int(r.clicks)} clicks
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
        {unknownAll > 0
          ? `${data.unknown.web} enquir${data.unknown.web === 1 ? "y" : "ies"} and ${data.unknown.sales} sale${data.unknown.sales === 1 ? "" : "s"} (${money(data.unknown.back)}) came from a Google ad whose keyword is not known yet: an iPhone click, which Google does not name; a click from today, which is filed overnight; or one from before 4 July 2026, when the record starts. They are in the totals above and on no row.`
          : "Every enquiry and sale from a Google ad in these 90 days is on a row."}
      </p>
    </div>
  );
}
