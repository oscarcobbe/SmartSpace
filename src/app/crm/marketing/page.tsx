import { requireSession, SITE_LABEL } from "@/lib/crm/session";
import type { Site } from "@/lib/crm/db";
import { fetchAds, adsSplit, fetchChanges, summariseChanges } from "@/lib/crm/google-ads";
import { fetchFinance } from "@/lib/crm/stripe-finance";
import { money, moneyExact } from "@/lib/crm/leads";
import { STATUS_PILL } from "@/lib/crm/labels";
import { PageHeader, Panel, Note, Pill } from "../ui";
import ExportButton from "../export-button";
import RoasChart from "../roas-chart";
import { fetchRoas } from "@/lib/crm/roas";
import Findings from "../findings-panel";
import { marketingFindings } from "@/lib/crm/findings";
import { fetchPeriods, dailyReport } from "@/lib/crm/ads-periods";
import { Periods } from "../periods";
import { DailyReport } from "../daily-report";
import { Sparkline } from "../sparkline";
import { TrendChart, type TrendPoint } from "../trend-chart";
import type { AdsData } from "@/lib/crm/google-ads";
import { Kpi, KpiRow, compareTail } from "../kpi";
import { CreditCard, MousePointerClick, Activity, Inbox, Euro, TrendingUp } from "lucide-react";

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

/**
 * Everything that needs Google Ads answering right now.
 *
 * Split out from the page so a live API failure costs these panels and nothing
 * else. It used to blank the whole page, headline chart included, which meant
 * a minute of Google being slow looked identical to a business with no
 * history, sitting on top of a stored history that was fine.
 */
async function LiveSections({ site }: { site: Site }) {
  /* All three at once: fetching them in series would add a second of latency
     for nothing. */
  const [result, finance, changes] = await Promise.all([
    fetchAds(site, 12),
    fetchFinance(12, site),
    fetchChanges(site, 14),
  ]);

  if (!result.ok) {
    return <Note tone="warn">Google Ads could not be read just now, so the panels below the chart are missing. {result.reason}</Note>;
  }

  /* The headline figures are this business's campaigns, not the account's.
     SmartCare Living ran from the Smart Space account before it had its own,
     and counting its €926 as Smart Space spend pushed Smart Space's return on
     spend down by about a fifth for work it never won. The other business's
     spend is still shown, below, rather than quietly dropped. */
  const { own, other } = adsSplit(result.data);
  const otherLabel = site === "smart-space" ? SITE_LABEL.smartcareliving : SITE_LABEL["smart-space"];

  const roas = own.cost ? own.value / own.cost : 0;
  const cpc = own.clicks ? own.cost / own.clicks : 0;
  const cpa = own.conversions ? own.cost / own.conversions : 0;
  const ctr = own.impressions ? (own.clicks / own.impressions) * 100 : 0;

  /* Ad spend and money taken, on the same months, for the findings below.
     Stripe is joined by the month key rather than by position, because the two
     feeds do not always start at the same month and lining them up by index
     would silently set one month's spend against another's takings. */
  const keptByMonth = new Map<string, number>();
  if (finance.ok) for (const m of finance.data.months) keptByMonth.set(m.key, m.net);

  /* How far into this month we are, so a part month is compared against the
     same fraction of the last one rather than against the whole of it. */
  const nowD = new Date();
  const daysInMonth = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate();
  /* Day, week and month come from one query segmented by date, so yesterday
     and last year arrive in the same round trip. */
  const periods = await fetchPeriods(site);
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
    clicks: sparkWeeks.map((w) => w.clicks),
    roas: sparkWeeks.map((w) => w.roas ?? 0),
  };
  /* So a point on a sparkline can say which week it is, not just its height. */
  const sparkLabels = sparkWeeks.map((w) => w.label);

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
      <p className="mb-4 text-xs text-slate-500">
        Live from Google Ads, {own.window.from} to {own.window.to}.
      </p>

      {/* The headline row, in the shape the client asked for: a colour per
          tile so the row is scannable, and a change indicator on every one of
          them, because a figure with nothing to compare it against is the
          reason this page read as flat. Four weeks against the four before,
          never the latest week against the first: on this budget a single
          week can be one enquiry. */}
      <KpiRow>
        <Kpi label="Spend" hue="orange" icon={<CreditCard className="h-4.5 w-4.5" />}
             value={money(own.cost)} note="Last twelve months"
             delta={compareTail(spark.cost, "neither", (n) => money(Math.abs(n)))}
             spark={sparkWeeks.length > 1 ? <Sparkline series={spark.cost} tone="light" width={120} height={26} labels={sparkLabels} format="money" /> : undefined} />
        <Kpi label="Clicks" hue="blue" icon={<MousePointerClick className="h-4.5 w-4.5" />}
             value={int(own.clicks)} note={`${moneyExact(cpc)} each`}
             delta={compareTail(spark.clicks, "up", (n) => int(Math.abs(n)))}
             spark={sparkWeeks.length > 1 ? <Sparkline series={spark.clicks} tone="light" width={120} height={26} labels={sparkLabels} format="count" /> : undefined} />
        <Kpi label="Click rate" hue="violet" icon={<Activity className="h-4.5 w-4.5" />}
             value={`${ctr.toFixed(1)}%`} note="of the times ads were shown"
             delta={compareTail(sparkWeeks.map((w) => (w.impressions ? (w.clicks / w.impressions) * 100 : 0)), "up",
                                (n) => `${Math.abs(n).toFixed(1)}pt`)} />
        <Kpi label="Enquiries" hue="indigo" icon={<Inbox className="h-4.5 w-4.5" />}
             value={own.conversions.toFixed(0)} note={own.conversions ? `${moneyExact(cpa)} each` : undefined}
             delta={compareTail(spark.conversions, "up", (n) => Math.abs(n).toFixed(1))}
             spark={sparkWeeks.length > 1 ? <Sparkline series={spark.conversions} tone="light" width={120} height={26} labels={sparkLabels} format="count" /> : undefined} />
        <Kpi label="Work won" hue="green" icon={<Euro className="h-4.5 w-4.5" />}
             value={money(own.value)} note="Value recorded against ads"
             delta={compareTail(spark.value, "up", (n) => money(Math.abs(n)))}
             spark={sparkWeeks.length > 1 ? <Sparkline series={spark.value} tone="light" width={120} height={26} labels={sparkLabels} format="money" /> : undefined} />
        <Kpi label="Back per €1" hue="red" icon={<TrendingUp className="h-4.5 w-4.5" />}
             value={own.cost ? `${roas.toFixed(1)}x` : "–"}
             note={own.cost ? `${money(own.value)} on ${money(own.cost)}` : undefined}
             delta={compareTail(spark.roas, "up", (n) => `${Math.abs(n).toFixed(1)}x`)}
             spark={sparkWeeks.length > 1 ? <Sparkline series={spark.roas} tone="light" width={120} height={26} labels={sparkLabels} format="ratio" /> : undefined} />
      </KpiRow>

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

      <div id="every-period" className="mb-6 scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
            appears once completed installations are sent back to Google, which is what the nightly upload does.
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
                real spend on this account and it is kept out of the figures above, because it is not {SITE_LABEL[site]}
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

export default async function MarketingPage() {
  const session = requireSession();
  /* The headline reads the daily record, which is one short database query and
     cannot be held up by Google. */
  const roasStore = await fetchRoas(session.site);

  return (
    <>
      <PageHeader
        title="Marketing"
        sub={
          roasStore.ok
            ? `${SITE_LABEL[session.site]}, ${roasStore.data.from} to ${roasStore.data.to}.`
            : SITE_LABEL[session.site]
        }
      />

      {/* The headline. Nigel's words on the call: this is the chart that
          decides where the money goes, so nothing sits above it. */}
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">What the advertising cost, and what came back</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Read from the daily record rather than live, so the history does not change shape between two loads of
            this page.
          </p>
        </div>
        {roasStore.ok ? (
          <RoasChart
            day={roasStore.data.day}
            week={roasStore.data.week}
            month={roasStore.data.month}
            counted={roasStore.data.counted}
            excluded={roasStore.data.excluded}
            lastAttributed={roasStore.data.lastAttributed}
            revenueKnown={roasStore.data.revenueKnown}
            capturedAt={roasStore.data.capturedAt}
            siteLabel={SITE_LABEL[session.site]}
          />
        ) : (
          <div className="px-4 py-4">
            <Note tone="warn">The daily record could not be read, so this chart is empty. {roasStore.reason}</Note>
          </div>
        )}
      </div>

      <LiveSections site={session.site} />
    </>
  );
}
