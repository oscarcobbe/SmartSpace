import { requireSession, SITE_LABEL } from "@/lib/crm/session";
import { fetchAds, adsSplit, fetchChanges, summariseChanges } from "@/lib/crm/google-ads";
import { fetchFinance } from "@/lib/crm/stripe-finance";
import { money, moneyExact } from "@/lib/crm/leads";
import { STATUS_PILL } from "@/lib/crm/labels";
import { PageHeader, Panel, Stat, StatRow, Note, Pill } from "../ui";
import ExportButton from "../export-button";
import RoasChart, { type RoasMonth } from "../roas-chart";
import Findings from "../findings-panel";
import { marketingFindings } from "@/lib/crm/findings";
import { fetchPeriods, dailyReport } from "@/lib/crm/ads-periods";
import { Periods } from "../periods";
import { DailyReport } from "../daily-report";
import { Sparkline } from "../sparkline";
import { TrendChart, type TrendPoint } from "../trend-chart";
import type { AdsData } from "@/lib/crm/google-ads";

export const dynamic = "force-dynamic";

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);

function CampaignTable({ campaigns }: { campaigns: AdsData["campaigns"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[42rem] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th scope="col" className="px-4 py-2 font-semibold">Campaign</th>
            <th scope="col" className="px-4 py-2 font-semibold">Status</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Spend</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Clicks</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Enquiries</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Cost each</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Work won</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {campaigns.map((c) => (
            <tr key={c.id} className={c.status === "ENABLED" ? undefined : "text-slate-500"}>
              {/* Campaign names are internal and long, "RETIRED - do not
                  enable - ..." among them. Truncated with the full name on
                  hover, so one of them cannot push the numbers off the table. */}
              <td className="max-w-[18rem] px-4 py-2">
                <span className="block truncate text-slate-900" title={c.name}>{c.name}</span>
              </td>
              <td className="px-4 py-2">
                <Pill className={c.status === "ENABLED" ? STATUS_PILL.won : STATUS_PILL.contacted}>
                  {c.status === "ENABLED" ? "Running" : c.status === "PAUSED" ? "Paused" : c.status}
                </Pill>
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-700">{moneyExact(c.cost)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-700">{int(c.clicks)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-700">{c.conversions.toFixed(0)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                {c.conversions ? moneyExact(c.cost / c.conversions) : "–"}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-900">{c.value ? moneyExact(c.value) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function MarketingPage() {
  const session = requireSession();
  /* Both feeds at once: the chart sets one against the other, and fetching
     them in series would add a second of latency for nothing. */
  const [result, finance, changes] = await Promise.all([
    fetchAds(session.site, 12),
    fetchFinance(12),
    fetchChanges(session.site, 14),
  ]);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Marketing" />
        <Note tone="warn">Google Ads could not be loaded. {result.reason}</Note>
      </>
    );
  }

  /* The headline figures are this business's campaigns, not the account's.
     SmartCare Living ran from the Smart Space account before it had its own,
     and counting its €926 as Smart Space spend pushed Smart Space's return on
     spend down by about a fifth for work it never won. The other business's
     spend is still shown, below, rather than quietly dropped. */
  const { own, other } = adsSplit(result.data);
  const otherLabel = session.site === "smart-space" ? SITE_LABEL.smartcareliving : SITE_LABEL["smart-space"];

  const roas = own.cost ? own.value / own.cost : 0;
  const cpc = own.clicks ? own.cost / own.clicks : 0;
  const cpa = own.conversions ? own.cost / own.conversions : 0;
  const ctr = own.impressions ? (own.clicks / own.impressions) * 100 : 0;

  const thisMonth = own.months[own.months.length - 1];
  const dayOfMonth = new Date().getDate();

  /* Ad spend and money taken, on the same months. Stripe is joined by the
     month key rather than by position, because the two feeds do not always
     start at the same month and lining them up by index would silently set
     one month's spend against another's takings. */
  const keptByMonth = new Map<string, number>();
  if (finance.ok) for (const m of finance.data.months) keptByMonth.set(m.key, m.net);

  const roasMonths: RoasMonth[] = own.months.map((m) => ({
    key: m.key,
    label: m.label,
    spend: m.cost,
    attributed: m.value,
    kept: keptByMonth.get(m.key) ?? 0,
    conversions: m.conversions,
    clicks: m.clicks,
    partial: m.key === thisMonth.key,
  }));

  /* How far into this month we are, so a part month is compared against the
     same fraction of the last one rather than against the whole of it. */
  const nowD = new Date();
  const daysInMonth = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate();
  /* Day, week and month come from one query segmented by date, so yesterday
     and last year arrive in the same round trip. */
  const periods = await fetchPeriods(session.site);
  const report = periods.ok ? dailyReport(periods.data.day) : null;

  /* Weeks for the trend, with our own account changes counted against the week
     they happened in. Google retains change history for fourteen days, so
     markers only ever land on recent weeks and the note below says so. */
  const changesByDay = new Map<string, number>();
  const changesByWeek = new Map<string, number>();
  const changesByMonth = new Map<string, number>();
  if (changes.ok) {
    for (const c of changes.data) {
      const d = new Date(c.at);
      if (Number.isNaN(d.getTime())) continue;
      const iso = d.toISOString().slice(0, 10);
      const [yy, mm, dd] = iso.split("-").map(Number);
      const utc = Date.UTC(yy!, mm! - 1, dd!);
      const dow = new Date(utc).getUTCDay();
      const monday = new Date(utc - (dow === 0 ? 6 : dow - 1) * 86_400_000).toISOString().slice(0, 10);
      changesByDay.set(iso, (changesByDay.get(iso) ?? 0) + 1);
      changesByWeek.set(monday, (changesByWeek.get(monday) ?? 0) + 1);
      changesByMonth.set(iso.slice(0, 7), (changesByMonth.get(iso.slice(0, 7)) ?? 0) + 1);
    }
  }

  /* One shape for all three grains, so the chart can switch between them
     without the page refetching anything. Changes are counted against the
     bucket they happened in, at whichever grain is being viewed. */
  const toPoints = (rows: { key: string; label: string; cost: number; clicks: number; impressions: number;
                            conversions: number; value: number; cpa: number | null; roas: number | null }[],
                    counts: Map<string, number>): TrendPoint[] =>
    rows.map((r) => ({ ...r, changes: counts.get(r.key) ?? 0 }));

  const trend = periods.ok
    ? {
        day: toPoints(periods.data.day.slice(-90), changesByDay),
        week: toPoints(periods.data.week, changesByWeek),
        month: toPoints(periods.data.month, changesByMonth),
      }
    : { day: [], week: [], month: [] };

  /* Sparkline series, from the same daily rows. Last eight weeks so the shape
     is readable rather than a year of noise squeezed into 104 pixels. */
  const sparkWeeks = periods.ok ? periods.data.week.slice(-8) : [];
  const spark = {
    cost: sparkWeeks.map((w) => w.cost),
    conversions: sparkWeeks.map((w) => w.conversions),
    cpa: sparkWeeks.map((w) => w.cpa ?? 0),
    value: sparkWeeks.map((w) => w.value),
  };
  const prior = (xs: number[]) => (xs.length > 1 ? xs[xs.length - 2]! : null);

  const changeList = changes.ok ? summariseChanges(changes.data) : [];
  const findings = marketingFindings({
    months: own.months,
    campaigns: own.campaigns,
    keptByMonth,
    monthElapsed: Math.min(1, nowD.getDate() / daysInMonth),
    changes: changeList,
  });

  return (
    <>
      <PageHeader
        title="Marketing"
        sub={`Google Ads for ${SITE_LABEL[session.site]}, ${own.window.from} to ${own.window.to}.`}
      />

      {sparkWeeks.length > 1 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ["Spend", spark.cost, "none" as const],
            ["Enquiries", spark.conversions, "good" as const],
            ["Cost each", spark.cpa, "bad" as const],
            ["Work won", spark.value, "good" as const],
          ]).map(([label, series, tone]) => (
            <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow duration-200 hover:shadow-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label as string}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Last eight weeks</p>
              <div className="mt-1.5">
                <Sparkline series={series as number[]} tone={tone as "good" | "bad" | "none"} baseline={prior(series as number[])} />
              </div>
            </div>
          ))}
        </div>
      )}

      <StatRow>
        <Stat label="Spend" value={money(own.cost)} note="Last twelve months" />
        <Stat label="Work won" value={money(own.value)} note="Value recorded against ads" tone={own.value > 0 ? "good" : "plain"} />
        <Stat
          label="Return on spend"
          value={own.cost ? `${roas.toFixed(1)}x` : "–"}
          note={own.cost ? `${money(own.value)} back on ${money(own.cost)}` : undefined}
          tone={roas >= 3 ? "good" : roas >= 1 ? "warn" : "bad"}
        />
        <Stat label="Enquiries" value={own.conversions.toFixed(0)} note={own.conversions ? `${moneyExact(cpa)} each` : undefined} />
        <Stat label="Clicks" value={int(own.clicks)} note={`${moneyExact(cpc)} each, ${ctr.toFixed(1)}% of views`} />
      </StatRow>

      {report && <DailyReport report={report} />}

      {trend.week.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">How it is moving</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pick a number and a window. Each point is marked where we changed something in the account.
            </p>
          </div>
          <TrendChart
            day={trend.day}
            week={trend.week}
            month={trend.month}
            changeNote={changes.ok
              ? "Google keeps change history for fourteen days, so only recent weeks can be marked."
              : null}
          />
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Every period, and how it moved</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Each row is compared with the one before it, so a day is measured against the day before and a month
            against the month before. Click a row for the clicks behind it.
          </p>
        </div>
        {periods.ok ? (
          <Periods day={periods.data.day} week={periods.data.week} month={periods.data.month} />
        ) : (
          <div className="px-4 py-4"><Note tone="warn">The day by day figures could not be read. {periods.reason}</Note></div>
        )}
      </div>

      {own.value === 0 && own.cost > 0 && (
        <div className="mb-6">
          <Note tone="warn">
            No revenue is recorded against these ads yet, so return on spend cannot be worked out. That figure
            appears once completed jobs are sent back to Google, which is what the nightly upload does.
          </Note>
        </div>
      )}

      <div className="space-y-6">
        <Findings findings={findings} title="What this says, and what to do" />

        <Panel title="What we changed, last fourteen days">
          {changeList.length === 0 ? (
            <div className="px-4 py-4">
              <Note tone="info">
                {changes.ok
                  ? "Nothing was edited in the account over the last fourteen days, so any movement in the figures above is the market rather than us."
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
            Straight from the account&apos;s own change log. Google keeps thirty days of it.
          </p>
        </Panel>

        <Panel title="What the advertising cost, and what came in">
          <RoasChart months={roasMonths} />
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            {thisMonth.label} is {dayOfMonth} {dayOfMonth === 1 ? "day" : "days"} in, so its bars are a part month and read low.
            {!finance.ok && " Stripe could not be read, so \u2018all money kept\u2019 is empty on this chart."}
          </p>
        </Panel>

        <Panel
          title="By campaign"
          aside={
            <ExportButton
              filename="marketing-by-campaign"
              headers={["Campaign", "Status", "Spend", "Clicks", "Impressions", "Enquiries", "Cost each", "Work won"]}
              rows={own.campaigns.map((c) => [
                c.name, c.status, c.cost.toFixed(2), c.clicks, c.impressions,
                c.conversions.toFixed(0), c.conversions ? (c.cost / c.conversions).toFixed(2) : "", c.value.toFixed(2),
              ])}
            />
          }
        >
          <CampaignTable campaigns={own.campaigns} />
        </Panel>

        {other && (
          <Panel title={`${otherLabel} on this account`}>
            <div className="border-b border-slate-200 px-4 py-3">
              <Note>
                {otherLabel} ran from this Google account before it had one of its own. The {money(other.cost)} below is
                real spend on this account and it is kept out of the figures above, because it is not {SITE_LABEL[session.site]}
                {" "}performance.
              </Note>
            </div>
            <CampaignTable campaigns={other.campaigns} />
          </Panel>
        )}
      </div>
    </>
  );
}
