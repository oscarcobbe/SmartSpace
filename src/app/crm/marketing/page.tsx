import Link from "next/link";
import { Suspense } from "react";
import { CreditCard, MousePointerClick, Activity, Inbox, Euro, Tag } from "lucide-react";
import { requireSession, SITE_LABEL } from "@/lib/crm/session";
import type { Site } from "@/lib/crm/db";
import { fetchAds, adsSplit, fetchChanges, summariseChanges } from "@/lib/crm/google-ads";
import { fetchFinance } from "@/lib/crm/stripe-finance";
import { money, moneyExact } from "@/lib/crm/leads";
import { STATUS_PILL } from "@/lib/crm/labels";
import { plainText } from "@/lib/crm/display";
import { fetchRoasLive, type RoasLiveResult } from "@/lib/crm/roas-live";
import { marketingFindings } from "@/lib/crm/findings";
import { fetchPeriods, dailyReport } from "@/lib/crm/ads-periods";
import { mondayOf, type Bucket } from "@/lib/crm/period-buckets";
import { fetchOpenAiPeriods, type OpenAiPeriodsResult } from "@/lib/crm/openai-ads";
import { bucketEnquiries, fetchAdEnquiries } from "@/lib/crm/ad-enquiries";
import { withOurEnquiries } from "@/lib/crm/ads-merge";
import { fetchWorking } from "@/lib/crm/ads-working";
import type { AdsData } from "@/lib/crm/google-ads";
import { PageHeader, Panel, Note, Pill, Skeleton } from "../ui";
import ExportButton from "../export-button";
import RoasChart, { type ChartMonth } from "../roas-chart";
import Findings from "../findings-panel";
import { Periods } from "../periods";
import { DailyReport } from "../daily-report";
import { Sparkline } from "../sparkline";
import { TrendChart, type TrendPoint } from "../trend-chart";
import { Kpi, KpiRow, HUE, type Delta } from "../kpi";
import { ChannelTable, WhatsWorking, type ChannelFigures } from "../ads-panels";

export const dynamic = "force-dynamic";
/* Several Google Ads reads, OpenAI, the enquiry record and a Stripe walk,
   streamed. Declared rather than assumed: the platform default is not
   something to find out from a 504. */
export const maxDuration = 60;

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);

/** ChatGPT's spend by bucket key, or null when it is not connected or not read. */
function chatgptBuckets(r: OpenAiPeriodsResult, grain: "day" | "week" | "month"): Map<string, Bucket> | null {
  return r.ok ? new Map(r.data[grain].map((b) => [b.key, b])) : null;
}

/** What the ChatGPT row says when it has nothing to show, and why. */
function chatgptNote(r: OpenAiPeriodsResult, spent: number): string | undefined {
  if (!r.ok) return r.connected ? "Could not be read just now" : "Not connected";
  return spent > 0 ? undefined : "Not running yet: no ChatGPT campaign has served";
}

/** Google's campaigns with Google's own figures, kept for comparison only. */
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
            <th scope="col" className="px-4 py-2 text-right font-semibold">Google&apos;s count</th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">Google&apos;s value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {campaigns.map((c) => (
            <tr key={c.id} className={c.status === "ENABLED" ? undefined : "text-slate-500"}>
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
              <td className="px-4 py-2 text-right tabular-nums text-slate-700">{c.value ? moneyExact(c.value) : "None"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Dublin's yyyy-mm-dd, n days before today. */
const dublinDay = (back = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(new Date(Date.now() - back * 86_400_000));

/** A movement between two windows, in the shape the tiles take. */
function delta(now: number, then: number, better: Delta["better"], fmt: (n: number) => string): Delta {
  if (!(then > 0)) return { pct: null, absolute: null, better, against: "the 28 days before" };
  return { pct: ((now - then) / then) * 100, absolute: fmt(now - then), better, against: "the 28 days before" };
}

/**
 * Everything below the headline chart, which needs Google, OpenAI, the
 * enquiry record and Stripe answering. Split out so a slow source costs these
 * panels and nothing else.
 */
async function LiveSections({ site, roas, chat }: { site: Site; roas: RoasLiveResult; chat: OpenAiPeriodsResult }) {
  const [result, finance, changes, periods, enq, working] = await Promise.all([
    fetchAds(site, 12),
    fetchFinance(12, site),
    fetchChanges(site, 14),
    fetchPeriods(site),
    fetchAdEnquiries(site),
    fetchWorking(site),
  ]);

  if (!periods.ok) {
    return <Note tone="warn">Google Ads could not be read just now, so the figures below the chart are missing. {periods.reason}</Note>;
  }

  /* Our enquiries, bucketed the way Google's periods are. */
  const ours = {
    day: enq.ok ? bucketEnquiries(enq.data, (d) => d) : new Map(),
    week: enq.ok ? bucketEnquiries(enq.data, mondayOf) : new Map(),
    month: enq.ok ? bucketEnquiries(enq.data, (d) => d.slice(0, 7)) : new Map(),
  };
  const merged = {
    day: withOurEnquiries(periods.data.day, chatgptBuckets(chat, "day"), ours.day),
    week: withOurEnquiries(periods.data.week, chatgptBuckets(chat, "week"), ours.week),
    month: withOurEnquiries(periods.data.month, chatgptBuckets(chat, "month"), ours.month),
  };

  /* ── The tiles: the last 28 complete days against the 28 before ── */
  const end = dublinDay(1), start = dublinDay(28), prevEnd = dublinDay(29), prevStart = dublinDay(56);
  const sum = (from: string, to: string, f: (b: Bucket) => number) =>
    merged.day.filter((b) => b.key >= from && b.key <= to).reduce((t, b) => t + f(b), 0);
  const cost = sum(start, end, (b) => b.cost), costPrev = sum(prevStart, prevEnd, (b) => b.cost);
  const clicks = sum(start, end, (b) => b.clicks), clicksPrev = sum(prevStart, prevEnd, (b) => b.clicks);
  const shown = sum(start, end, (b) => b.impressions), shownPrev = sum(prevStart, prevEnd, (b) => b.impressions);
  const enquiries = sum(start, end, (b) => b.conversions), enquiriesPrev = sum(prevStart, prevEnd, (b) => b.conversions);
  const rate = shown ? (clicks / shown) * 100 : 0, ratePrev = shownPrev ? (clicksPrev / shownPrev) * 100 : 0;
  const cpe = enquiries ? cost / enquiries : 0, cpePrev = enquiriesPrev ? costPrev / enquiriesPrev : 0;
  const inDays = (from: string, to: string) => (p: { created: number }) => {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(new Date(p.created * 1000));
    return d >= from && d <= to;
  };
  const backNow = roas.ok ? roas.data.adPayments.filter(inDays(start, end)).reduce((t, p) => t + p.amount, 0) : 0;
  const backPrev = roas.ok ? roas.data.adPayments.filter(inDays(prevStart, prevEnd)).reduce((t, p) => t + p.amount, 0) : 0;
  const salesNow = roas.ok ? roas.data.adPayments.filter(inDays(start, end)).length : 0;

  const weeks = merged.week.slice(-9, -1);
  const weekLabels = weeks.map((w) => w.label);
  const spark = (series: number[], hue: keyof typeof HUE, format: "money" | "count") =>
    series.length > 1 ? <Sparkline series={series} color={HUE[hue]} width={120} height={26} labels={weekLabels} format={format} /> : undefined;

  /* ── The channel table, over the chart's months ── */
  const months = roas.ok ? roas.data.months : [];
  const keys = new Set(months.map((m) => m.key));
  const inChart = (b: Bucket) => keys.has(b.key);
  const chatMonths = chat.ok ? chat.data.month.filter(inChart) : [];
  const googleMonths = periods.data.month.filter(inChart);
  const oursIn = (f: (e: { googleWeb: number; calls: number; chatgpt: number }) => number) =>
    Array.from(ours.month.entries()).filter(([k]) => keys.has(k)).reduce((t, [, e]) => t + f(e), 0);
  const google: ChannelFigures = {
    label: "Google Ads",
    cost: months.reduce((t, m) => t + m.spend, 0),
    clicks: googleMonths.reduce((t, b) => t + b.clicks, 0),
    enquiries: oursIn((e) => e.googleWeb + e.calls),
    enquiriesDetail: `${oursIn((e) => e.googleWeb)} from the website, ${Math.round(oursIn((e) => e.calls))} calls from the ad`,
    sales: months.reduce((t, m) => t + m.tiedSales, 0),
    back: months.reduce((t, m) => t + m.back + m.estimated, 0),
    estimated: months.reduce((t, m) => t + m.estimated, 0),
  };
  const chatCost = chatMonths.reduce((t, b) => t + b.cost, 0);
  const chatgpt: ChannelFigures = {
    label: "ChatGPT ads",
    cost: chatCost,
    clicks: chatMonths.reduce((t, b) => t + b.clicks, 0),
    enquiries: oursIn((e) => e.chatgpt),
    sales: months.reduce((t, m) => t + m.chatgptSales, 0),
    back: months.reduce((t, m) => t + m.chatgptBack, 0),
    estimated: 0,
    note: chatgptNote(chat, chatCost),
    muted: chatCost === 0,
  };
  const total: ChannelFigures = {
    label: "All ads",
    cost: google.cost + chatgpt.cost, clicks: google.clicks + chatgpt.clicks,
    enquiries: google.enquiries + chatgpt.enquiries, sales: google.sales + chatgpt.sales,
    back: google.back + chatgpt.back, estimated: google.estimated,
  };
  const period = months.length ? `${months[0]!.label} to ${months[months.length - 1]!.label}` : "the last twelve months";

  /* ── The trend, the periods and yesterday, with our enquiries ── */
  const changesByKey = { day: new Map<string, number>(), week: new Map<string, number>(), month: new Map<string, number>() };
  if (changes.ok) {
    for (const c of changes.data) {
      const d = new Date(c.at);
      if (Number.isNaN(d.getTime())) continue;
      const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin" }).format(d);
      for (const [grain, key] of [["day", day], ["week", mondayOf(day)], ["month", day.slice(0, 7)]] as const) {
        changesByKey[grain].set(key, (changesByKey[grain].get(key) ?? 0) + 1);
      }
    }
  }
  const points = (rows: Bucket[], counts: Map<string, number>): TrendPoint[] =>
    rows.map((r) => ({ ...r, changes: counts.get(r.key) ?? 0 }));
  const report = dailyReport(merged.day);

  /* ── Findings, on our enquiries and the ad groups' ── */
  const ads = result.ok ? adsSplit(result.data) : null;
  const keptByMonth = new Map<string, number>();
  if (finance.ok) for (const m of finance.data.months) keptByMonth.set(m.key, m.net);
  const nowD = new Date();
  const daysInMonth = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate();
  const changeList = changes.ok ? summariseChanges(changes.data) : [];
  const findings = marketingFindings({
    months: merged.month.slice(-12).map((m) => ({ ...m })),
    campaigns: working.ok
      ? working.data.adGroups.filter((g) => g.cost > 0).map((g) => ({
          name: g.name, status: "ENABLED", cost: g.cost, clicks: g.clicks,
          conversions: g.web + Math.round(g.calls), value: g.back,
        }))
      : [],
    keptByMonth,
    monthElapsed: Math.min(1, nowD.getDate() / daysInMonth),
    changes: changeList,
  });

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">By channel</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {period}. Enquiries are from your own record of every enquiry, not Google&apos;s count; calls from the ad are
            Google&apos;s, because they never touch the website.
          </p>
        </div>
        <ChannelTable rows={[google, chatgpt]} total={total} period={period} />
        {!enq.ok && <div className="px-5 py-3"><Note tone="warn">The enquiries could not be read just now, so they show as none. {enq.reason}</Note></div>}
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">The last 28 days</h2>
        <span className="text-xs text-slate-500">against the 28 days before</span>
      </div>
      <KpiRow>
        <Kpi href="/crm/marketing/spend" label="Spent" hue="orange" icon={<CreditCard className="h-4 w-4" />}
             value={money(cost)} delta={delta(cost, costPrev, "neither", (n) => money(Math.abs(n)))}
             spark={spark(weeks.map((w) => w.cost), "orange", "money")} />
        <Kpi href="/crm/marketing/clicks" label="Clicks" hue="blue" icon={<MousePointerClick className="h-4 w-4" />}
             value={int(clicks)} note={clicks ? `${moneyExact(cost / clicks)} each` : undefined}
             delta={delta(clicks, clicksPrev, "up", (n) => int(Math.abs(n)))}
             spark={spark(weeks.map((w) => w.clicks), "blue", "count")} />
        <Kpi href="/crm/marketing/rate" label="Click rate" hue="violet" icon={<Activity className="h-4 w-4" />}
             value={`${rate.toFixed(1)}%`} note="of the times ads were shown"
             delta={delta(rate, ratePrev, "up", (n) => `${Math.abs(n).toFixed(1)}pt`)} />
        <Kpi href="#working" label="Enquiries from ads" hue="indigo" icon={<Inbox className="h-4 w-4" />}
             value={enq.ok ? int(enquiries) : "Not read"}
             delta={enq.ok ? delta(enquiries, enquiriesPrev, "up", (n) => int(Math.abs(n))) : undefined}
             note={enq.ok ? "website and calls from the ad" : enq.reason}
             spark={enq.ok ? spark(weeks.map((w) => w.conversions), "indigo", "count") : undefined} />
        <Kpi href="#working" label="Cost per enquiry" hue="slate" icon={<Tag className="h-4 w-4" />}
             value={enq.ok && enquiries ? moneyExact(cpe) : enq.ok ? "No enquiries" : "Not read"}
             delta={enq.ok && enquiries && enquiriesPrev ? delta(cpe, cpePrev, "down", (n) => moneyExact(Math.abs(n))) : undefined} />
        <Kpi href="#headline" label="Came back, traced" hue="green" icon={<Euro className="h-4 w-4" />}
             value={roas.ok ? money(backNow) : "Not read"}
             note={roas.ok ? `${salesNow} sale${salesNow === 1 ? "" : "s"} an ad is known to have reached` : roas.reason}
             delta={roas.ok ? delta(backNow, backPrev, "up", (n) => money(Math.abs(n))) : undefined} />
      </KpiRow>

      {report && <DailyReport report={report} />}

      <div className="mb-6">
        {working.ok ? <WhatsWorking data={working.data} siteLabel={SITE_LABEL[site]} /> : (
          <Note tone="warn">Which ad groups and keywords are working could not be read just now. {working.reason}</Note>
        )}
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">How it is moving</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Pick a number and a window. Spend is every channel&apos;s and enquiries are yours; a dashed line marks a period
            we changed something in the account.
          </p>
        </div>
        <TrendChart
          day={points(merged.day.slice(-90), changesByKey.day)}
          week={points(merged.week, changesByKey.week)}
          month={points(merged.month, changesByKey.month)}
          changeNote={changes.ok ? "We ask Google for fourteen days of change history, so only recent weeks can be marked." : null}
        />
      </div>

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
              {changeList.map((c) => <li key={c} className="px-4 py-2 text-sm text-slate-700">{c}</li>)}
            </ul>
          )}
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Straight from the account&apos;s own change log.</p>
        </Panel>

        <details id="every-period" className="group scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 hover:bg-slate-50">
            <h2 className="inline text-sm font-semibold text-slate-900">Every period, and how it moved</h2>
            <span className="ml-2 text-xs text-slate-500 group-open:hidden">open the day by day figures</span>
          </summary>
          <p className="border-b border-slate-100 px-4 pb-3 text-xs text-slate-500">
            Each row is compared with the one before it. Enquiries are yours, from every ad channel.
          </p>
          <Periods day={merged.day} week={merged.week} month={merged.month} />
        </details>

        <details className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 hover:bg-slate-50">
            <h2 className="inline text-sm font-semibold text-slate-900">Google&apos;s own figures</h2>
            <span className="ml-2 text-xs text-slate-500 group-open:hidden">for comparison</span>
          </summary>
          <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
            <p className="max-w-[78ch] text-xs leading-relaxed text-slate-500">
              What Google counts for itself. It sees a website enquiry only from a visitor who accepted cookies, it counts
              payments and calls as conversions alongside enquiries, and its &quot;value&quot; is a set figure per
              conversion type rather than money paid. It is what the bidding works from, so it is kept here, apart.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <Link className="font-medium text-slate-700 underline-offset-2 hover:underline" href="/crm/marketing/enquiries">Google&apos;s conversions</Link>
              <Link className="font-medium text-slate-700 underline-offset-2 hover:underline" href="/crm/marketing/won">Google&apos;s value</Link>
              <Link className="font-medium text-slate-700 underline-offset-2 hover:underline" href="/crm/marketing/back">Google&apos;s return</Link>
            </p>
          </div>
          {ads ? (
            <>
              <div className="flex justify-end px-4 pb-2">
                <ExportButton
                  filename="marketing-by-campaign"
                  headers={["Campaign", "Status", "Spend", "Clicks", "Impressions", "Google's count", "Google's value"]}
                  rows={ads.own.campaigns.map((c) => [c.name, c.status, c.cost.toFixed(2), c.clicks, c.impressions, c.conversions.toFixed(0), c.value.toFixed(2)])}
                />
              </div>
              <CampaignTable campaigns={ads.own.campaigns} />
              {ads.other && (
                <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
                  This Google account also carries {money(ads.other.cost)} of{" "}
                  {site === "smart-space" ? SITE_LABEL.smartcareliving : SITE_LABEL["smart-space"]}&apos;s advertising, from
                  before it had an account of its own. It is counted on that business&apos;s page, not here.
                </p>
              )}
            </>
          ) : (
            <div className="px-4 pb-4"><Note tone="warn">Google&apos;s campaign figures could not be read. {result.ok ? "" : result.reason}</Note></div>
          )}
        </details>
      </div>
    </>
  );
}

function LiveSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the figures from Google Ads">
      <Skeleton className="mb-6 h-56 rounded-xl" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[132px] rounded-xl" />)}
      </div>
      <Skeleton className="mb-6 h-72 rounded-xl" />
    </div>
  );
}

export default async function MarketingPage() {
  const session = requireSession();
  const site = session.site;
  const [roas, chat] = await Promise.all([fetchRoasLive(site), fetchOpenAiPeriods(site)]);
  const chatByMonth = chatgptBuckets(chat, "month");
  const months: ChartMonth[] = roas.ok
    ? roas.data.months.map((m) => ({ ...m, chatgptSpend: chatByMonth?.get(m.key)?.cost ?? 0 }))
    : [];

  return (
    <>
      <PageHeader
        title="Marketing"
        sub={months.length ? `${SITE_LABEL[site]}, ${months[0]!.label} to ${months[months.length - 1]!.label}.` : SITE_LABEL[site]}
      />

      {/* The headline. Nigel's words on the call: this is the chart that
          decides where the money goes, so nothing sits above it. */}
      <div id="headline" className="mb-6 scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">What the ads cost, and what came back</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Google Ads and ChatGPT ads together, by month, live from each and from Stripe. Came back is money from
            customers an ad is known to have reached, with an estimate for customers who cannot be traced.
          </p>
        </div>
        {roas.ok ? (
          <>
            <RoasChart months={months} siteLabel={SITE_LABEL[site]} trailRead={roas.data.trailRead} />
            {roas.data.unnamed.count > 0 && (
              <p className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500">
                {roas.data.unnamed.count} payment{roas.data.unnamed.count === 1 ? "" : "s"} ({money(roas.data.unnamed.amount)}) could
                not be named to either business from what Stripe holds, so {roas.data.unnamed.count === 1 ? "it is" : "they are"} in neither.
              </p>
            )}
          </>
        ) : (
          <div className="px-5 py-4"><Note tone="warn">This chart could not be read. {roas.reason}</Note></div>
        )}
      </div>

      {/* Streamed, so the headline chart is on screen while Google is still
          answering for everything below it. */}
      <Suspense fallback={<LiveSkeleton />}>
        <LiveSections site={site} roas={roas} chat={chat} />
      </Suspense>
    </>
  );
}
