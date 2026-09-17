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
  /* Clicking a month pins it, so the figures can be read without holding the
     pointer still, and so they survive on a touch screen where there is no
     hover at all. */
  const [pinned, setPinned] = useState<number | null>(null);
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

  const activeIdx = hover ?? pinned;
  const shown = activeIdx !== null ? months[activeIdx] : null;

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

      <dl className="grid grid-cols-3 gap-px border-y border-slate-200 bg-slate-200">
        {[
          { k: "Spent on ads", v: exact(totalSpend), sub: `${months.length} months` },
          { k: basis === "kept" ? "Money kept" : "Attributed to ads", v: exact(totalRev), sub: basis === "kept" ? "all sources" : "Google's figure" },
          { k: "Per euro out", v: `${overall.toFixed(2)}×`, sub: overall >= 1 ? "more in than out" : "less in than out" },
        ].map((c) => (
          <div key={c.k} className="bg-white px-4 py-2.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c.k}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{c.v}</dd>
            <dd className="text-xs text-slate-500">{c.sub}</dd>
          </div>
        ))}
      </dl>

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
                fill={activeIdx === i ? "#0f172a" : "transparent"}
                fillOpacity={activeIdx === i ? 0.05 : 0}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setPinned(pinned === i ? null : i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned(pinned === i ? null : i); } }}
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
                fill={activeIdx === i ? "#0f172a" : "#64748b"} pointerEvents="none">{m.label}</text>
              {/* The ratio printed over every column, because the whole point
                  of the chart is the number and making it hover-only hid it. */}
              {m.spend > 0 && (
                <text x={cx} y={Math.min(y(m.spend), y(rev)) - 6} textAnchor="middle" fontSize="10.5"
                  fontWeight="700" fill={rev / m.spend >= 1 ? "#0f766e" : "#b45309"} pointerEvents="none">
                  {(rev / m.spend).toFixed(1)}×
                </text>
              )}
            </g>
          );
        })}

        {line && <polyline points={line} fill="none" stroke="#0d9488" strokeWidth="2" strokeDasharray="4 3" pointerEvents="none" />}
        {months.map((m, i) => {
          if (m.spend <= 0) return null;
          const cx = PAD.left + slot * i + slot / 2;
          return <circle key={`${uid}-${m.key}`} cx={cx} cy={ry(revenue(m) / m.spend)} r={activeIdx === i ? 5.5 : 3}
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
      <div className="min-h-[5.5rem] border-t border-slate-100 px-4 py-3 text-sm">
        {shown ? (
          <div>
            <p className="font-semibold text-slate-900">
              {shown.label}
              {shown.partial && <span className="font-normal text-slate-500"> · part month so far</span>}
              {pinned !== null && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">pinned, click again to release</span>}
            </p>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
              {[
                ["Spent", exact(shown.spend)],
                [basis === "kept" ? "Kept" : "Attributed", exact(revenue(shown))],
                ["Per euro out", shown.spend > 0 ? `${(revenue(shown) / shown.spend).toFixed(2)}×` : "–"],
                ["Enquiries", shown.conversions > 0 ? `${shown.conversions.toFixed(0)} from ${shown.clicks} clicks` : `none from ${shown.clicks} clicks`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="text-slate-600">
            Hover or tap a month for its own figures. The number over each column is what came back for every euro spent that month.
          </p>
        )}
      </div>
    </div>
  );
}
