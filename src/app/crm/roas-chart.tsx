"use client";

/**
 * Ad spend against what came in, month by month, with the return on top.
 *
 * ── WHY THERE IS A CHOICE OF REVENUE ─────────────────────────────
 *
 * "Return on ad spend" sounds like one number and is really two, and picking
 * one silently would mislead in opposite directions.
 *
 * Google only knows what it could attribute: a click it saw, followed by a
 * conversion it was told about. Right now the offline paid jobs are not
 * reaching it at all, so its figure is close to zero and a chart drawn from it
 * would say the advertising earns nothing, which is false.
 *
 * Stripe knows every euro taken, including work that came from the van, a
 * neighbour or a phone call that never touched an ad. A chart drawn from that
 * alone would credit the advertising with all of it, which is equally false.
 *
 * So both are offered, the reader chooses, and the label says which is on
 * screen. Neither is called ROAS without qualification, because one of them
 * is not.
 */

import { useId, useState } from "react";

export interface RoasMonth {
  key: string;
  label: string;
  spend: number;
  /** What Google could attribute to the ads. */
  attributed: number;
  /** Everything Stripe took that month, after fees and refunds. */
  kept: number;
  conversions: number;
  clicks: number;
  /** True for the month still running, whose bars are a part month. */
  partial?: boolean;
}

const PAD = { top: 16, right: 52, bottom: 30, left: 52 };
const WIDTH = 720;

function niceStep(max: number, targetTicks = 4): number {
  if (max <= 0) return 1;
  const raw = max / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
}

const eur = (n: number) =>
  Math.abs(n) >= 1000 ? `€${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}k` : `€${Math.round(n)}`;

const exact = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

type Basis = "kept" | "attributed";

export default function RoasChart({ months, height = 260 }: { months: RoasMonth[]; height?: number }) {
  const [basis, setBasis] = useState<Basis>("kept");
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId();

  const revenue = (m: RoasMonth) => (basis === "kept" ? m.kept : m.attributed);
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const peak = Math.max(1, ...months.map((m) => Math.max(m.spend, revenue(m))));
  const step = niceStep(peak);
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;

  /* The return line has its own scale, capped so one freak month cannot
     flatten every other into the axis. */
  const ratios = months.map((m) => (m.spend > 0 ? revenue(m) / m.spend : 0));
  const rTop = Math.max(2, Math.ceil(Math.max(...ratios, 0)));
  const ry = (v: number) => PAD.top + plotH - (Math.min(v, rTop) / rTop) * plotH;

  const slot = plotW / Math.max(1, months.length);
  const barW = Math.min(16, slot * 0.3);

  const totalSpend = months.reduce((s, m) => s + m.spend, 0);
  const totalRev = months.reduce((s, m) => s + revenue(m), 0);
  const overall = totalSpend > 0 ? totalRev / totalSpend : 0;

  const line = months
    .map((m, i) => {
      if (m.spend <= 0) return null;
      const cx = PAD.left + slot * i + slot / 2;
      return `${cx},${ry(revenue(m) / m.spend)}`;
    })
    .filter(Boolean)
    .join(" ");

  const shown = hover !== null ? months[hover] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-3">
        <div className="inline-flex rounded-lg border border-slate-300 p-0.5" role="group" aria-label="What to count as money in">
          {(["kept", "attributed"] as Basis[]).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBasis(b)}
              aria-pressed={basis === b}
              className={`min-h-[32px] rounded-md px-3 text-xs font-semibold transition ${
                basis === b ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {b === "kept" ? "All money kept" : "Attributed to ads"}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {basis === "kept"
            ? "Everything Stripe took, including work the ads never touched."
            : "Only what Google could tie back to a click."}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          `Ad spend against ${basis === "kept" ? "all money kept" : "revenue attributed to ads"}, by month. ` +
          `Over the whole period, ${exact(totalSpend)} of advertising sits against ${exact(totalRev)}, ` +
          `which is ${overall.toFixed(2)} euro in for every euro out.`
        }
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">{eur(t)}</text>
          </g>
        ))}
        {[0, rTop / 2, rTop].map((r) => (
          <text key={r} x={WIDTH - PAD.right + 8} y={ry(r) + 4} fontSize="11" fill="#0d9488">{r.toFixed(1)}×</text>
        ))}

        {months.map((m, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const rev = revenue(m);
          return (
            <g key={m.key}>
              {/* One hit area per month, so the pointer never has to find a
                  6px bar, and a keyboard can tab through the same targets. */}
              <rect
                x={PAD.left + slot * i}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill={hover === i ? "#0f172a" : "transparent"}
                fillOpacity={hover === i ? 0.04 : 0}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                role="button"
                aria-label={
                  `${m.label}: spent ${exact(m.spend)}, ${basis === "kept" ? "kept" : "attributed"} ${exact(rev)}` +
                  `${m.spend > 0 ? `, ${(rev / m.spend).toFixed(2)} euro in per euro out` : ""}` +
                  `${m.partial ? ", a part month so far" : ""}`
                }
              />
              <rect x={cx - barW - 1} y={y(m.spend)} width={barW} height={Math.max(0, PAD.top + plotH - y(m.spend))}
                rx="2" fill="#d97706" fillOpacity={m.partial ? 0.55 : 1} pointerEvents="none" />
              <rect x={cx + 1} y={y(rev)} width={barW} height={Math.max(0, PAD.top + plotH - y(rev))}
                rx="2" fill="#0d9488" fillOpacity={m.partial ? 0.55 : 1} pointerEvents="none" />
              <text x={cx} y={height - 10} textAnchor="middle" fontSize="11"
                fill={hover === i ? "#0f172a" : "#64748b"} pointerEvents="none">{m.label}</text>
            </g>
          );
        })}

        {line && <polyline points={line} fill="none" stroke="#0d9488" strokeWidth="2" strokeDasharray="4 3" pointerEvents="none" />}
        {months.map((m, i) => {
          if (m.spend <= 0) return null;
          const cx = PAD.left + slot * i + slot / 2;
          return <circle key={`${uid}-${m.key}`} cx={cx} cy={ry(revenue(m) / m.spend)} r={hover === i ? 5 : 3}
            fill="#0d9488" stroke="#fff" strokeWidth="1.5" pointerEvents="none" />;
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-4 px-4 pb-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-600" />Ad spend</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />{basis === "kept" ? "Money kept" : "Attributed"}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-teal-600" />Euro in per euro out</span>
      </div>

      {/* Reads as a caption when nothing is hovered, so the panel is never
          blank and never jumps in height when the pointer moves. */}
      <div className="min-h-[3.25rem] border-t border-slate-100 px-4 py-2 text-sm">
        {shown ? (
          <p className="text-slate-700">
            <span className="font-semibold text-slate-900">{shown.label}</span>
            {shown.partial && <span className="text-slate-500"> (part month)</span>}
            {" · "}spent <span className="font-medium">{exact(shown.spend)}</span>
            {" · "}{basis === "kept" ? "kept" : "attributed"} <span className="font-medium">{exact(revenue(shown))}</span>
            {shown.spend > 0 && <> {" · "}<span className="font-semibold text-teal-700">{(revenue(shown) / shown.spend).toFixed(2)}× </span>in per euro out</>}
            {shown.conversions > 0 && <> {" · "}{shown.conversions.toFixed(0)} enquiries from {shown.clicks} clicks</>}
          </p>
        ) : (
          <p className="text-slate-600">
            Over the whole period, <span className="font-medium text-slate-900">{exact(totalSpend)}</span> of advertising sits
            against <span className="font-medium text-slate-900">{exact(totalRev)}</span>, which is{" "}
            <span className="font-semibold text-teal-700">{overall.toFixed(2)}×</span> in for every euro out. Hover a month for its own figures.
          </p>
        )}
      </div>
    </div>
  );
}
