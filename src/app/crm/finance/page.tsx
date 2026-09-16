import { requireSession } from "@/lib/crm/session";
import { fetchFinance } from "@/lib/crm/stripe-finance";
import { moneyExact, money } from "@/lib/crm/leads";
import { PageHeader, Panel, Stat, StatRow, Note } from "../ui";
import { BarChart, Legend } from "../chart";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  requireSession();
  const result = await fetchFinance(12);

  if (!result.ok) {
    return (
      <>
        <PageHeader title="Finance" />
        <Note tone="warn">Finance could not be loaded. {result.reason}</Note>
      </>
    );
  }

  const f = result.data;
  const bars = f.months.map((m) => ({
    label: m.label,
    value: m.net,
    secondary: m.fees + m.refunds,
    title: `${m.label}: ${moneyExact(m.net)} kept from ${moneyExact(m.gross)}, ${m.payments} payment${m.payments === 1 ? "" : "s"}`,
  }));

  const feeRate = f.gross ? (f.fees / f.gross) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Finance"
        sub="Everything that has moved through Stripe in the last twelve months, after card fees and refunds."
      />

      <StatRow>
        <Stat label="Money in" value={money(f.gross)} note="Before fees" />
        <Stat label="Kept" value={money(f.net)} note="After fees and refunds" tone="good" />
        <Stat label="Card fees" value={money(f.fees)} note={`${feeRate.toFixed(1)}% of money in`} />
        <Stat label="Refunded" value={money(f.refunds)} tone={f.refunds > 0 ? "warn" : "plain"} />
        <Stat label="Average order" value={money(f.averageOrder)} note={`${f.payments} payments`} />
      </StatRow>

      <div className="space-y-6">
        <Panel title="What was kept, month by month">
          <div className="px-4 pt-4">
            <BarChart
              bars={bars}
              ariaLabel="Monthly amount kept after card fees and refunds, over the last twelve months"
            />
          </div>
          <Legend
            items={[
              { color: "#f48222", label: "Kept after fees and refunds" },
              { color: "#fcd9b6", label: "Card fees and refunds" },
            ]}
          />
        </Panel>

        <Panel title="In the bank">
          <div className="grid grid-cols-1 divide-slate-200 sm:grid-cols-3 sm:divide-x">
            <Stat label="Available" value={moneyExact(f.available)} note="Stripe is holding this, ready to pay out" />
            <Stat label="Pending" value={moneyExact(f.pending)} note="Cleared soon, not yet available" />
            <Stat
              label="Last payout"
              value={f.lastPayout ? moneyExact(f.lastPayout.amount) : "None yet"}
              note={f.lastPayout ? `${f.lastPayout.arrival}, ${f.lastPayout.status}` : undefined}
            />
          </div>
        </Panel>

        <Panel title="Month by month">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-4 py-2 font-medium">Month</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Payments</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Money in</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Fees</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Refunds</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Kept</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {f.months.map((m) => (
                  <tr key={m.key}>
                    <td className="px-4 py-2 text-slate-700">{m.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{m.payments}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{moneyExact(m.gross)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{moneyExact(m.fees)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">{moneyExact(m.refunds)}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-900">{moneyExact(m.net)}</td>
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
