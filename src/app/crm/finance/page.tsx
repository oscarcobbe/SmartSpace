import Link from "next/link";
import { Upload } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { fetchBank } from "@/lib/crm/bank";
import { bankBreakdown, monthName } from "@/lib/crm/bank-insight";
import Findings from "../findings-panel";
import { fetchFinance } from "@/lib/crm/stripe-finance";
import { moneyExact, money } from "@/lib/crm/leads";
import { PageHeader, Panel, Stat, StatRow, Note } from "../ui";
import ExportButton from "../export-button";
import { BarChart, Legend } from "../chart";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const { site } = requireSession();
  const [result, bank] = await Promise.all([fetchFinance(12), fetchBank(site, 12)]);
  /* Cheap, pure, and derived from rows already fetched, so it costs nothing
     beyond the statement that is already on the page. */
  const cut = bankBreakdown(bank?.rows ?? []);

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
    /* What the bar is made of, so the chart can answer the question rather
       than only illustrate the answer. */
    detail: [
      { label: "Customers paid", value: moneyExact(m.gross) },
      { label: "Card fees", value: moneyExact(m.fees) },
      { label: "Refunded", value: moneyExact(m.refunds) },
      { label: "Kept", value: moneyExact(m.net) },
      { label: "Payments", value: String(m.payments) },
    ],
  }));

  const feeRate = f.gross ? (f.fees / f.gross) * 100 : 0;

  /* The current month is only part way through. Without saying so, the last
     bar always looks like a collapse, on the first of the month most of all. */
  const thisMonth = f.months[f.months.length - 1];
  const dayOfMonth = new Date().getDate();

  return (
    <>
      <PageHeader
        title="Finance"
        sub="Everything that has moved through Stripe in the last twelve months, after card fees and refunds."
        aside={
          <Link
            href="/crm/finance/import"
            className="flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Import a statement
          </Link>
        }
      />

      <StatRow>
        <Stat label="Money in" value={money(f.gross)} note="Before fees" explain="moneyIn" />
        <Stat label="Kept" value={money(f.net)} note="After fees and refunds" tone="good" explain="kept" />
        <Stat label="Card fees" value={money(f.fees)} note={`${feeRate.toFixed(1)}% of money in`} />
        <Stat label="Refunded" value={money(f.refunds)} tone={f.refunds > 0 ? "warn" : "plain"} />
        <Stat label="Average order" value={money(f.averageOrder)} note={`${f.payments} payments`} explain="averageOrder" />
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
          <p className="px-4 pb-4 -mt-2 text-xs text-slate-500">
            {thisMonth.label} is {dayOfMonth} {dayOfMonth === 1 ? "day" : "days"} in, so its bar is a part month.
          </p>
        </Panel>

        <Panel title="At Stripe">
          <div className="grid grid-cols-1 divide-slate-200 sm:grid-cols-3 sm:divide-x">
            {/* A negative balance is normal after a refund clears before the
                next payment lands, and "ready to pay out" was the wrong
                sentence to put under minus two euro. */}
            <Stat
              label="Available"
              value={moneyExact(f.available)}
              note={f.available < 0 ? "Owed back to Stripe, cleared by the next payment" : "Stripe is holding this, ready to pay out"}
              tone={f.available < 0 ? "warn" : "plain"}
            />
            <Stat label="Pending" value={moneyExact(f.pending)} note="Cleared soon, not yet available" />
            <Stat
              label="Last payout"
              value={f.lastPayout ? moneyExact(f.lastPayout.amount) : "None yet"}
              note={f.lastPayout ? `${f.lastPayout.arrival}, ${f.lastPayout.status}` : undefined}
            />
          </div>
        </Panel>

        {/* Kept apart from the Stripe figures on purpose. A card payment appears
            in both, once when it is taken and again when it settles into the
            bank, so adding the two together would count every sale twice. */}
        {bank ? (
          <Panel
            title="The bank account"
            aside={<span className="text-xs text-slate-500">{bank.count} imported lines since {bank.latestOn?.slice(0, 7)}</span>}
          >
            {/* Earned is kept apart from moved on purpose. Money transferred
                in from another account is money in, and counting it beside
                customer takings is how an account that is losing money on its
                trading shows a healthy difference. */}
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-4 sm:divide-y-0">
              <Stat label="Customers paid in" value={money(cut.earnedCents / 100)} tone="good" note="card payments" />
              <Stat label="Moved in" value={money(cut.movedInCents / 100)} note="from our own accounts" />
              <Stat label="Out" value={money(bank.outCents / 100)} />
              <Stat
                label="Trading"
                value={money(cut.tradingCents / 100)}
                note="customers in, less everything out"
                tone={cut.tradingCents >= 0 ? "good" : "bad"}
              />
            </div>
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              Balance {bank.latestBalanceCents == null ? "not given" : moneyExact(bank.latestBalanceCents / 100)}
              {bank.latestOn ? ` as at ${bank.latestOn}` : ""}. The difference between money in and money out is{" "}
              {money(bank.netCents / 100)}, which includes money moved between our own accounts.
            </p>
          </Panel>
        ) : (
          <Panel title="The bank account">
            <div className="px-4 py-5">
              <p className="mb-3 text-sm text-slate-600">
                Nothing imported yet. Stripe only knows about card payments, so transfers, standing
                orders and bank fees are missing from everything above.
              </p>
              <Link
                href="/crm/finance/import"
                className="inline-flex min-h-[38px] items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Import a statement
              </Link>
            </div>
          </Panel>
        )}

        {bank && <Findings findings={cut.findings} title="What the bank account says" />}

        {bank && cut.categories.length > 0 && (
          <Panel title="Where the money went">
            <ul className="divide-y divide-slate-100">
              {cut.categories.map((c) => (
                <li key={c.label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-44 flex-none text-sm text-slate-700">{c.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(2, c.share * 100)}%` }} />
                  </span>
                  <span className="w-28 flex-none text-right text-sm font-semibold tabular-nums text-slate-900">
                    {money(c.cents / 100)}
                  </span>
                  <span className="w-12 flex-none text-right text-xs tabular-nums text-slate-500">
                    {(c.share * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {bank && cut.months.length > 1 && (
          <Panel title="The bank account, month by month">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-2 font-semibold">Month</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Customers paid</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Out</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cut.months.map((m) => (
                    <tr key={m.key}>
                      <td className="px-4 py-2 text-slate-700">{monthName(m.key)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">{money(m.earnedCents / 100)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">{money(m.outCents / 100)}</td>
                      <td className={`px-4 py-2 text-right font-semibold tabular-nums ${m.netCents >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {money(m.netCents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        <Panel
          title="Month by month"
          aside={
            <ExportButton
              filename="finance-by-month"
              headers={["Month", "Payments", "Money in", "Card fees", "Refunds", "Kept"]}
              rows={f.months.map((m) => [m.label, m.payments, m.gross.toFixed(2), m.fees.toFixed(2), m.refunds.toFixed(2), m.net.toFixed(2)])}
            />
          }
        >
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
                  <tr key={m.key} className={m.key === thisMonth.key ? "bg-slate-50" : undefined}>
                    <td className="px-4 py-2 text-slate-700">
                      {m.label}
                      {m.key === thisMonth.key && <span className="ml-2 text-xs text-slate-500">so far</span>}
                    </td>
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
