import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession, SITE_LABEL } from "@/lib/crm/session";
import { fetchAds, adsSplit, fetchChanges, summariseChanges } from "@/lib/crm/google-ads";
import { fetchPeriods } from "@/lib/crm/ads-periods";
import { money, moneyExact } from "@/lib/crm/leads";
import { PageHeader, Panel, Note } from "../../ui";
import { TrendChart, type TrendPoint, type MetricId } from "../../trend-chart";
import { Periods } from "../../periods";
import ExportButton from "../../export-button";
import { compareTail, type Delta } from "../../kpi";

export const dynamic = "force-dynamic";

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);

/**
 * One number, on its own page.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * The tiles at the top of /crm/marketing answer "what is the figure" and
 * cannot answer "why". Six figures with nowhere to go is a poster. Each tile
 * now opens here, and this page owes the reader four things the row cannot
 * give them: the full history rather than eight weeks of sparkline, every
 * period behind the figure, which campaigns made it, and what we changed in
 * the account while it moved.
 *
 * One route rather than six pages. The metric is the only thing that differs
 * and six copies of this file would drift apart inside a month.
 */
/* The account total, a campaign and a weekly bucket all carry the five raw
   counters and only the buckets carry the two ratios, so the ratios are
   optional here and every metric works them out from the counters rather than
   reading a field that may not exist. */
interface Row {
  cost: number; clicks: number; impressions: number; conversions: number; value: number;
}

interface Metric {
  /** Which chart series this opens on. */
  chart: MetricId;
  label: string;
  /** The tile's own colour, so arriving here feels like the tile opening. */
  hue: string;
  better: Delta["better"];
  of: (r: Row) => number | null;
  fmt: (n: number) => string;
  /** What the number is, in the reader's words. */
  what: string;
  /** What it is made of, so nobody has to guess the denominator. */
  basis: (r: Row) => string;
  /** What to do about it. Not a band: there is no published one for a single
      account, so this says how to read a movement rather than judging it. */
  reading: string;
  /** How to rank campaigns on this page. Null means the ranking is not
      meaningful for this metric and the table keeps the account's own order. */
  rank: ((c: Row) => number) | null;
}

const METRICS: Record<string, Metric> = {
  spend: {
    chart: "cost", label: "Spend", hue: "#c2410c", better: "neither",
    of: (r) => r.cost, fmt: money,
    what: "What the advertising cost, before anything came back.",
    basis: (r) => `${int(r.clicks)} clicks at ${r.clicks ? moneyExact(r.cost / r.clicks) : "–"} each`,
    reading: "Spend on its own is neither good nor bad news. It is the denominator of every other figure on this page, so read it beside enquiries and work won rather than on its own. A rise with no rise in enquiries is the thing to act on.",
    rank: (c) => c.cost,
  },
  clicks: {
    chart: "clicks", label: "Clicks", hue: "#1d4ed8", better: "neither",
    of: (r) => r.clicks, fmt: (n) => int(n),
    what: "How many people came through to the site from an ad.",
    basis: (r) => `${moneyExact(r.clicks ? r.cost / r.clicks : 0)} each, from ${int(r.impressions)} times the ads were shown`,
    reading: "Clicks are what the money buys. They are not the point: a click that leaves in four seconds cost the same as one that books. Read this against enquiries, and if clicks hold while enquiries fall the problem is on the site, not in the account.",
    rank: (c) => c.clicks,
  },
  rate: {
    chart: "ctr", label: "Click rate", hue: "#6d28d9", better: "up",
    of: (r) => (r.impressions ? (r.clicks / r.impressions) * 100 : null),
    fmt: (n) => `${n.toFixed(1)}%`,
    what: "How often somebody who saw an ad clicked it.",
    basis: (r) => `${int(r.clicks)} clicks from ${int(r.impressions)} times the ads were shown`,
    reading: "This is the ads and the keywords being judged by the people searching. A fall usually means the ads are being shown for searches they do not answer, which is a keyword problem rather than a copy one. It moves slowly, so a single day means very little.",
    rank: (c) => (c.impressions ? c.clicks / c.impressions : 0),
  },
  enquiries: {
    chart: "conversions", label: "Enquiries", hue: "#4338ca", better: "up",
    of: (r) => r.conversions, fmt: (n) => n.toFixed(0),
    what: "How many people got in touch after an ad.",
    basis: (r) => `${moneyExact(r.conversions ? r.cost / r.conversions : 0)} each`,
    reading: "The figure the account is bid to produce. It counts what Google was told about, so it can only be as complete as the tracking underneath it: an enquiry Google never heard about is not here and is not being bid for either.",
    rank: (c) => c.conversions,
  },
  won: {
    chart: "value", label: "Work won", hue: "#15803d", better: "up",
    of: (r) => r.value, fmt: money,
    what: "The value recorded back against the ads.",
    basis: (r) => `against ${money(r.cost)} spent`,
    reading: "Mostly placeholder values set per conversion action rather than real prices, mixed with a few real Stripe amounts, so treat the shape as the signal and not the total. The real euro figure lives on the money page.",
    rank: (c) => c.value,
  },
  back: {
    chart: "roas", label: "Back per €1", hue: "#b91c1c", better: "up",
    of: (r) => (r.cost ? r.value / r.cost : null), fmt: (n) => `${n.toFixed(1)}x`,
    what: "What came back for every euro that went out.",
    basis: (r) => `${money(r.value)} recorded against ${money(r.cost)} spent`,
    reading: "A division, so a period with one or two enquiries cannot support it and is drawn hollow on the chart rather than compared. It is built from the value recorded against the ads, which is not the same as money Stripe took.",
    rank: (c) => (c.cost ? c.value / c.cost : 0),
  },
};

export default async function MetricPage({ params }: { params: Promise<{ metric: string }> }) {
  const { metric: key } = await params;
  const m = METRICS[key];
  if (!m) notFound();

  const session = await requireSession();
  const site = session.site;

  const [ads, periods, changes] = await Promise.all([
    fetchAds(site), fetchPeriods(site), fetchChanges(site),
  ]);
  if (!ads.ok) {
    return (
      <>
        <Back />
        <PageHeader title={m.label} sub={SITE_LABEL[site]} />
        <Note tone="warn">Google Ads could not be read. {ads.reason}</Note>
      </>
    );
  }
  const { own } = adsSplit(ads.data);

  const now = m.of(own);
  const weeks = periods.ok ? periods.data.week : [];
  /* The same four against four the tile uses, so the movement here and the
     movement on the row can never disagree. */
  const series = weeks.map((w) => m.of(w) ?? 0);
  const delta = compareTail(series, m.better, (n) => m.fmt(Math.abs(n)));

  const points = (rows: typeof weeks): TrendPoint[] => rows.map((r) => ({ ...r, changes: 0 }));
  const trend = periods.ok
    ? { day: points(periods.data.day.slice(-90)), week: points(periods.data.week), month: points(periods.data.month) }
    : { day: [], week: [], month: [] };

  const campaigns = m.rank
    ? [...own.campaigns].sort((a, b) => m.rank!(b) - m.rank!(a))
    : own.campaigns;
  const changeList = changes.ok ? summariseChanges(changes.data) : [];

  return (
    <>
      <Back />
      <PageHeader title={m.label} sub={`${SITE_LABEL[site]} · ${own.window.from} to ${own.window.to}`} />

      <div className="mb-6 overflow-hidden rounded-xl p-5 sm:p-6" style={{ background: m.hue }}>
        <div className="text-[12.5px] font-semibold uppercase tracking-wide text-white/85">{m.label}</div>
        <div className="mt-2 text-[44px] font-bold leading-none tracking-tight tabular-nums text-white">
          {now === null ? "–" : m.fmt(now)}
        </div>
        <p className="mt-2 text-[13px] text-white/80">{m.basis(own)}</p>
        <p className="mt-3 max-w-[70ch] text-[13.5px] leading-relaxed text-white/90">{m.what}</p>
        <p className="mt-1.5 text-[12.5px] text-white/75">
          {delta.pct === null
            ? "Not enough history to compare against the four weeks before."
            : `${Math.abs(delta.pct) < 0.5 ? "Level" : delta.pct > 0 ? "Up" : "Down"} ${
                Math.abs(delta.pct) < 0.5 ? "" : `${Math.abs(delta.pct).toFixed(0)}% `
              }on the four weeks before${delta.absolute && Math.abs(delta.pct) >= 0.5 ? `, ${delta.absolute}` : ""}.`}
        </p>
      </div>

      <Panel title="How to read this one">
        <p className="max-w-[78ch] px-4 py-3 text-sm leading-relaxed text-slate-700">{m.reading}</p>
      </Panel>

      {trend.week.length > 0 && (
        <div className="my-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">The whole history</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Opens on {m.label.toLowerCase()}. Every other number is one click away, so a movement here can be
              checked against the one beside it without leaving the page.
            </p>
          </div>
          <TrendChart day={trend.day} week={trend.week} month={trend.month} initial={m.chart} changeNote={null} />
        </div>
      )}

      <details className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50">
          Every period behind it
          <span className="ml-2 font-normal text-slate-500">day, week and month</span>
        </summary>
        {periods.ok ? (
          <Periods day={periods.data.day} week={periods.data.week} month={periods.data.month} />
        ) : (
          <div className="px-4 py-4"><Note tone="warn">The day by day figures could not be read. {periods.reason}</Note></div>
        )}
      </details>

      <Panel
        title={m.rank ? `Which campaigns made it, most ${m.label.toLowerCase()} first` : "By campaign"}
        aside={
          <ExportButton
            filename={`marketing-${key}`}
            headers={["Campaign", "Status", m.label, "Spend", "Clicks", "Enquiries", "Work won"]}
            rows={campaigns.map((c) => {
              const v = m.of(c);
              return [c.name, c.status, v === null ? "" : String(v), c.cost.toFixed(2), c.clicks,
                      c.conversions.toFixed(0), c.value.toFixed(2)];
            })}
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-4 py-2 font-semibold">Campaign</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">{m.label}</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Spend</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Enquiries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((c) => {
                const v = m.of(c);
                return (
                  <tr key={c.id} className={c.status === "ENABLED" ? undefined : "text-slate-500"}>
                    <td className="max-w-[20rem] px-4 py-2">
                      <span className="block truncate text-slate-900" title={c.name}>{c.name}</span>
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums" style={{ color: m.hue }}>
                      {v === null ? "–" : m.fmt(v)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{moneyExact(c.cost)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{c.conversions.toFixed(0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-6">
        <Panel title="What we changed while it moved">
          {changeList.length === 0 ? (
            <div className="px-4 py-4">
              <Note tone="info">
                {changes.ok
                  ? "Nothing was edited in the account over the last fourteen days, so any movement above is the market rather than us."
                  : `The change history could not be read. ${changes.reason}`}
              </Note>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {changeList.map((c) => (
                <li key={c} className="px-4 py-2 text-sm text-slate-700">{c}</li>
              ))}
            </ul>
          )}
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            Straight from the account&apos;s own change log. Google keeps fourteen days of it, so this cannot
            explain anything older than that.
          </p>
        </Panel>
      </div>
    </>
  );
}

function Back() {
  return (
    <Link href="/crm/marketing"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to the advertising
    </Link>
  );
}
