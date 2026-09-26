"use client";

/**
 * Day, week and month, from one set of rows.
 *
 * The page answered "how did the last twelve months go", which is the only
 * question nobody has on a Tuesday morning. Switching grain is client side
 * because all three are already rendered by the server, so it is instant and
 * nothing refetches.
 *
 * Movement is shown against the previous period of the same kind. A day is
 * compared with the day before, a month with the month before, never a day
 * with a twelfth of a month.
 */
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export interface Row {
  key: string;
  label: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
  cpa: number | null;
  roas: number | null;
  deltaCost: number | null;
  deltaConversions: number | null;
  deltaValue: number | null;
}

/* Intl.NumberFormat rather than Number.toLocaleString, which the date guard
   reads as an unlocalised date format. These are money and counts; they carry
   no timezone. Same constructor the rest of the CRM already uses. */
const eur0 = new Intl.NumberFormat("en-IE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
const money = (n: number) => `€${(n < 100 ? eur2 : eur0).format(n)}`;
const int = (n: number) => nf.format(n);
const conv = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1));

/**
 * A movement, coloured by whether it is good news rather than by its sign.
 *
 * More enquiries is good and more spend is not, so the two cannot share a
 * rule. A dashboard that paints "cost up 40%" green because the number rose
 * is worse than one that shows no colour at all.
 */
function Delta({ pct, goodWhen = "up" }: { pct: number | null; goodWhen?: "up" | "down" }) {
  if (pct === null) {
    return <span className="text-slate-300" aria-label="no comparison available">None</span>;
  }
  const flat = Math.abs(pct) < 5;
  const good = goodWhen === "up" ? pct > 0 : pct < 0;
  const tone = flat ? "text-slate-500" : good ? "text-emerald-700" : "text-rose-700";
  const Icon = flat ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums ${tone}`}>
      <Icon className="h-3 w-3 shrink-0 transition-transform duration-200 group-hover/row:scale-110" aria-hidden="true" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

/** A bar behind the number, so the shape of the period reads without a chart. */
function Spark({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <span className="pointer-events-none absolute inset-y-1 left-1 -z-10 rounded-sm bg-slate-100/80 group-hover/row:bg-sky-100"
          style={{ width: `${w}%` }} aria-hidden="true" />
  );
}

const GRAINS = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
] as const;

export function Periods({ day, week, month }: { day: Row[]; week: Row[]; month: Row[] }) {
  const [grain, setGrain] = useState<"day" | "week" | "month">("day");
  const [open, setOpen] = useState<string | null>(null);

  const all = grain === "day" ? day : grain === "week" ? week : month;
  /* Newest first, and a day view of 400 rows is unreadable. */
  const rows = [...all].reverse().slice(0, grain === "day" ? 30 : grain === "week" ? 26 : 24);
  const maxCost = Math.max(1, ...rows.map((r) => r.cost));

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
        {GRAINS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => { setGrain(g.id); setOpen(null); }}
            aria-pressed={grain === g.id}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-transform duration-200 ${
              grain === g.id
                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
            }`}
          >
            {g.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">{rows.length} shown</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th scope="col" className="px-4 py-2 font-semibold">Period</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Spend</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">vs before</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Enquiries</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">vs before</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Cost each</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Google&apos;s value</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Back per €1</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr
                key={r.key}
                onClick={() => setOpen(open === r.key ? null : r.key)}
                className="group/row relative cursor-pointer hover:bg-sky-50/60"
              >
                <td className="relative isolate px-4 py-2 text-slate-900">
                  <Spark value={r.cost} max={maxCost} />
                  {r.label}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-900">{money(r.cost)}</td>
                <td className="px-4 py-2 text-right text-xs"><Delta pct={r.deltaCost} goodWhen="down" /></td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-900">{conv(r.conversions)}</td>
                <td className="px-4 py-2 text-right text-xs"><Delta pct={r.deltaConversions} goodWhen="up" /></td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-700">{r.cpa === null ? "None" : money(r.cpa)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-900">{money(r.value)}</td>
                <td className="px-4 py-2 text-right tabular-nums font-medium text-slate-900">
                  {r.roas === null ? "None" : `${r.roas.toFixed(1)}x`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Nothing spent in this window.</p>
      )}

      {open && (() => {
        const r = rows.find((x) => x.key === open);
        if (!r) return null;
        return (
          <div className="animate-[fadeIn_200ms_ease-out] border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm">
            <p className="font-medium text-slate-900">{r.label}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
              <div><dt className="inline text-slate-500">Shown </dt><dd className="inline tabular-nums text-slate-900">{int(r.impressions)} times</dd></div>
              <div><dt className="inline text-slate-500">Clicked </dt><dd className="inline tabular-nums text-slate-900">{int(r.clicks)} times</dd></div>
              <div><dt className="inline text-slate-500">Click rate </dt><dd className="inline tabular-nums text-slate-900">{r.impressions > 0 ? `${((r.clicks / r.impressions) * 100).toFixed(1)}%` : "None"}</dd></div>
              <div><dt className="inline text-slate-500">Per click </dt><dd className="inline tabular-nums text-slate-900">{r.clicks > 0 ? money(r.cost / r.clicks) : "None"}</dd></div>
            </dl>
          </div>
        );
      })()}
    </div>
  );
}
