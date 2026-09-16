import { requireSession } from "@/lib/crm/session";
import { fetchAds } from "@/lib/crm/google-ads";
import { money, moneyExact } from "@/lib/crm/leads";
import { PageHeader, Panel, Stat, StatRow, Note, Pill } from "../ui";
import { STATUS_PILL } from "@/lib/crm/labels";
import { BarChart, Legend } from "../chart";

export const dynamic = "force-dynamic";

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);

export default async function MarketingPage() {
  const session = requireSession();
  const result = await fetchAds(session.site, 12);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Marketing" />
        <Note tone="warn">Google Ads could not be loaded. {result.reason}</Note>
      </>
    );
  }

  const a = result.data;
  const roas = a.cost ? a.value / a.cost : 0;
  const cpc = a.clicks ? a.cost / a.clicks : 0;
  const cpa = a.conversions ? a.cost / a.conversions : 0;
  const ctr = a.impressions ? (a.clicks / a.impressions) * 100 : 0;

  const thisMonth = a.months[a.months.length - 1];
  const dayOfMonth = new Date().getDate();

  const bars = a.months.map((m) => ({
    label: m.label,
    value: m.cost,
    title: `${m.label}: ${moneyExact(m.cost)} spent, ${m.conversions.toFixed(1)} conversions, ${moneyExact(m.value)} of work won`,
  }));

  return (
    <>
      <PageHeader
        title="Marketing"
        sub={`Google Ads, ${a.window.from} to ${a.window.to}.`}
      />

      <StatRow>
        <Stat label="Spend" value={money(a.cost)} note="Last twelve months" />
        <Stat label="Work won" value={money(a.value)} note="Value recorded against ads" tone={a.value > 0 ? "good" : "plain"} />
        <Stat
          label="Return on spend"
          value={a.cost ? `${roas.toFixed(1)}x` : "–"}
          note={a.cost ? `${money(a.value)} back on ${money(a.cost)}` : undefined}
          tone={roas >= 3 ? "good" : roas >= 1 ? "warn" : "bad"}
        />
        <Stat label="Enquiries" value={a.conversions.toFixed(0)} note={a.conversions ? `${moneyExact(cpa)} each` : undefined} />
        <Stat label="Clicks" value={int(a.clicks)} note={`${moneyExact(cpc)} each, ${ctr.toFixed(1)}% of views`} />
      </StatRow>

      {a.value === 0 && a.cost > 0 && (
        <div className="mb-6">
          <Note tone="warn">
            No revenue is recorded against these ads yet, so return on spend cannot be worked out. That figure
            appears once completed jobs are sent back to Google, which is what the nightly upload does.
          </Note>
        </div>
      )}

      <div className="space-y-6">
        <Panel title="What was spent, month by month">
          <div className="px-4 pt-4">
            <BarChart bars={bars} ariaLabel="Google Ads spend by month over the last twelve months" />
          </div>
          <Legend items={[{ color: "#f48222", label: "Spend" }]} />
          <p className="px-4 pb-4 -mt-2 text-xs text-slate-500">
            {thisMonth.label} is {dayOfMonth} {dayOfMonth === 1 ? "day" : "days"} in, so its bar is a part month.
          </p>
        </Panel>

        <Panel title="By campaign">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-2 font-medium">Campaign</th>
                  <th scope="col" className="px-4 py-2 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Spend</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Clicks</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Enquiries</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Cost each</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Work won</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {a.campaigns.map((c) => (
                  <tr key={c.name} className={c.status === "ENABLED" ? undefined : "text-slate-500"}>
                    {/* Campaign names are internal and long, "RETIRED - do not
                        enable - ..." among them. Truncated with the full name
                        on hover, so one of them cannot push the numbers off
                        the right of the table. */}
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
        </Panel>
      </div>
    </>
  );
}
