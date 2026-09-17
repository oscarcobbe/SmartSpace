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
