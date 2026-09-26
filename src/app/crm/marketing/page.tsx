import { requireSession, SITE_LABEL } from "@/lib/crm/session";
import type { Site } from "@/lib/crm/db";
import { fetchAds, adsSplit, fetchChanges, summariseChanges } from "@/lib/crm/google-ads";
import { fetchFinance } from "@/lib/crm/stripe-finance";
import { money, moneyExact } from "@/lib/crm/leads";
import { STATUS_PILL } from "@/lib/crm/labels";
import { plainText } from "@/lib/crm/display";
import { PageHeader, Panel, Note, Pill, Skeleton } from "../ui";
import { Suspense } from "react";
import ExportButton from "../export-button";
import RoasChart from "../roas-chart";
import { fetchRoasLive } from "@/lib/crm/roas-live";
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
/* Several Google Ads reads and a Stripe walk, streamed. Declared rather than
   assumed: the platform default is not something to find out from a 504. */
export const maxDuration = 60;

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
            <th scope="col" className="px-4 py-2 text-right font-semibold">Google&apos;s value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {campaigns.map((c) => (
            <tr key={c.id} className={c.status === "ENABLED" ? undefined : "text-slate-500"}>
              {/* Campaign names are internal and long, "RETIRED - do not
                  enable - ..." among them. Truncated with the full name on
                  hover, so one of them cannot push the numbers off the table. */}
              <td className="max-w-[18rem] px-4 py-2">
                <span className="block truncate text-slate-900" title={plainText(c.name)}>{plainText(c.name)}</span>
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
                {c.conversions ? moneyExact(c.cost / c.conversions) : <span className="text-slate-400">None</span>}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-slate-900">{c.value ? moneyExact(c.value) : <span className="text-slate-400">None</span>}</td>
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

  /*
   * The two money tiles read what the chart reads, not what Google recorded.
   *
   * The chart said 2.01x and the tile under it said 1.4x, on the same screen,
   * both labelled "back per euro". The tile was Google's own figure, which is
   * placeholder values per conversion type rather than prices anyone paid; the
   * chart is Stripe money on a payment tied to an ad click. Two numbers for
   * one question is worse than either alone. Both tiles now come from the
   * same live read the chart is drawn from, and the answer is the same
   * wherever the eye lands.
   */
  const live = await fetchRoasLive(site);
  /* Money back is read only for Smart Space; see RoasChart's measured prop. */
  const measured = site === "smart-space";
  /* Traced plus the grey estimate, the same total the chart writes over its
     bars. The traced part alone is still in the note, so the known and the
     estimated are never blended without saying so. */
  const traced = live.ok ? live.data.back : 0;
  const back = live.ok ? live.data.back + live.data.estimated : 0;
  const roas = live.ok && live.data.spend > 0 ? back / live.data.spend : 0;
  const backByMonth = live.ok ? live.data.months.map((m) => m.back + m.estimated) : [];
  const roasByMonth = live.ok ? live.data.months.map((m) => (m.spend > 0 ? (m.back + m.estimated) / m.spend : 0)) : [];
  const monthLabels = live.ok ? live.data.months.map((m) => m.label) : [];
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
        <Kpi href="/crm/marketing/spend" label="Spend" hue="orange" icon={<CreditCard className="h-4.5 w-4.5" />}
             value={money(own.cost)} note="Last twelve months"
             delta={compareTail(spark.cost, "neither", (n) => money(Math.abs(n)))}
             spark={sparkWeeks.length > 1 ? <Sparkline series={spark.cost} tone="light" width={120} height={26} labels={sparkLabels} format="money" /> : undefined} />
        <Kpi href="/crm/marketing/clicks" label="Clicks" hue="blue" icon={<MousePointerClick className="h-4.5 w-4.5" />}
             value={int(own.clicks)} note={`${moneyExact(cpc)} each`}
             delta={compareTail(spark.clicks, "up", (n) => int(Math.abs(n)))}
             spark={sparkWeeks.length > 1 ? <Sparkline series={spark.clicks} tone="light" width={120} height={26} labels={sparkLabels} format="count" /> : undefined} />
        <Kpi href="/crm/marketing/rate" label="Click rate" hue="violet" icon={<Activity className="h-4.5 w-4.5" />}
             value={`${ctr.toFixed(1)}%`} note="of the times ads were shown"
             delta={compareTail(sparkWeeks.map((w) => (w.impressions ? (w.clicks / w.impressions) * 100 : 0)), "up",
                                (n) => `${Math.abs(n).toFixed(1)}pt`)} />
        <Kpi href="/crm/marketing/enquiries" label="Enquiries" hue="indigo" icon={<Inbox className="h-4.5 w-4.5" />}
             value={own.conversions.toFixed(0)} note={own.conversions ? `${moneyExact(cpa)} each` : undefined}
             delta={compareTail(spark.conversions, "up", (n) => Math.abs(n).toFixed(1))}
             spark={sparkWeeks.length > 1 ? <Sparkline series={spark.conversions} tone="light" width={120} height={26} labels={sparkLabels} format="count" /> : undefined} />
        {/* When the live read failed these two were "~€0" and "0 traced",
            which is a claim that the ads brought nothing back. They are not
            zero, they are unread, and they say so. */}
        <Kpi href="/crm/marketing/won" label="Back from ads" hue="green" icon={<Euro className="h-4.5 w-4.5" />}
             value={!measured ? "Not measured" : live.ok ? `~${money(back)}` : "Not read"}
             note={!measured ? "Sales are not traced to ads for this business" : live.ok ? `${money(traced)} traced to an ad, the rest estimated` : live.reason}
             delta={compareTail(backByMonth, "up", (n) => money(Math.abs(n)), "the three months before")}
             spark={backByMonth.length > 1 ? <Sparkline series={backByMonth} tone="light" width={120} height={26} labels={monthLabels} format="money" /> : undefined} />
        <Kpi href="/crm/marketing/back" label="Back per €1" hue="red" icon={<TrendingUp className="h-4.5 w-4.5" />}
             value={!measured ? "Not measured" : !live.ok ? "Not read" : live.data.spend > 0 ? `~${roas.toFixed(1)}x` : "No spend"}
             note={!measured ? "Enquiries are the measure here" : !live.ok ? "The return could not be worked out" : live.data.spend > 0 ? `${money(back)} on ${money(live.data.spend)}` : undefined}
             delta={compareTail(roasByMonth, "up", (n) => `${Math.abs(n).toFixed(1)}x`, "the three months before")}
             spark={roasByMonth.length > 1 ? <Sparkline series={roasByMonth} tone="light" width={120} height={26} labels={monthLabels} format="ratio" /> : undefined} />
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
              ? "We ask Google for fourteen days of change history, so only recent weeks can be marked."
              : null}
          />
        </div>
      )}

      <details id="every-period" className="group mb-6 scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 hover:bg-slate-50">
          <h2 className="inline text-sm font-semibold text-slate-900">Every period, and how it moved</h2>
          <span className="ml-2 text-xs text-slate-500 group-open:hidden">open the day by day figures</span>
        </summary>
        <p className="border-b border-slate-100 px-4 pb-3 text-xs text-slate-500">
          Each row is compared with the one before it, so a day is measured against the day before and a month
          against the month before. Click a row for the clicks behind it.
        </p>
        {periods.ok ? (
          <Periods day={periods.data.day} week={periods.data.week} month={periods.data.month} />
        ) : (
          <div className="px-4 py-4"><Note tone="warn">The day by day figures could not be read. {periods.reason}</Note></div>
        )}
      </details>

      {own.value === 0 && own.cost > 0 && (
        <div className="mb-6">
          <Note tone="warn">
            {site === "smartcareliving"
              ? "Google has no value recorded against these ads, so its own return figure is empty. SmartCare Living takes enquiries rather than payments online, so the enquiries above are the measure; what each one became is on Enquiries."
              : "No revenue is recorded against these ads yet, so return on spend cannot be worked out. That figure appears once completed installations are sent back to Google, which is what the nightly upload does."}
          </Note>
        </div>
      )}

      <div className="space-y-6">
        <Findings findings={findings} title="What this says, and what to do" />

        <Panel title="What we changed, last fourteen days">
          {changeList.length === 0 ? (
            <div className="px-4 py-4">
              <Note tone={changes.ok ? "info" : "warn"}>
                {changes.ok
                  ? "Nothing was edited in the account over the last fourteen days, so any movement in the figures above is the market rather than us."
                  : `The change history could not be read, so this does not mean nothing changed. ${changes.reason}`}
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
              headers={["Campaign", "Status", "Spend", "Clicks", "Impressions", "Enquiries", "Cost each", "Google's value"]}
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

function LiveSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the figures from Google Ads">
      <Skeleton className="mb-4 h-3 w-56" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-xl" />)}
      </div>
      <Skeleton className="mb-6 h-72 rounded-xl" />
    </div>
  );
}

export default async function MarketingPage() {
  const session = requireSession();
  /* The headline reads the daily record, which is one short database query and
     cannot be held up by Google. */
  const roas = await fetchRoasLive(session.site);

  return (
    <>
      <PageHeader
        title="Marketing"
        sub={
          roas.ok && roas.data.months.length
            ? `${SITE_LABEL[session.site]}, ${roas.data.from} to ${roas.data.to}.`
            : SITE_LABEL[session.site]
        }
      />

      {/* The headline. Nigel's words on the call: this is the chart that
          decides where the money goes, so nothing sits above it. */}
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">What the advertising cost, and what came back</h2>
          <p className="mt-0.5 text-xs text-slate-500">Live from Google Ads, Stripe and the enquiry log, by month.</p>
        </div>
        {roas.ok ? (
          <RoasChart months={roas.data.months} spend={roas.data.spend} back={roas.data.back}
                     estimated={roas.data.estimated} trailRead={roas.data.trailRead}
                     siteLabel={SITE_LABEL[session.site]} measured={session.site === "smart-space"} />
        ) : (
          <div className="px-4 py-4">
            <Note tone="warn">This chart could not be read. {roas.reason}</Note>
          </div>
        )}
      </div>

      {/* Streamed, so the headline chart is on screen while Google is still
          answering for the tiles and tables below it. */}
      <Suspense fallback={<LiveSkeleton />}>
        <LiveSections site={session.site} />
      </Suspense>
    </>
  );
}
