"use client";

/**
 * Cost per enquiry over time, with the weeks we changed something marked.
 *
 * This exists because of a question the client actually asked. He read that
 * advertising had produced 32 euro of sales on 300 of spend in one section and
 * something much better in another, and wanted to know what had changed. The
 * numbers were both right and neither answered him: one was a placeholder
 * conversion value, the other was real money, and nothing on the page showed
 * whether the account was getting better or worse over time.
 *
 * So this is one line, cost per enquiry by week, which is the number that says
 * whether the money is working harder than it used to. Down is good.
 *
 * Google retains change history for fourteen days and no longer. Markers
 * therefore only ever appear on recent weeks, and the panel says so rather
 * than letting an unmarked week look like a week nobody touched.
 */
import { useId, useState } from "react";

export interface TrendWeek {
  key: string;
  label: string;
  cost: number;
  conversions: number;
  cpa: number | null;
  changes: number;
}

/* Intl.NumberFormat rather than Number.toLocaleString, which the date guard
   cannot tell apart from a date formatted without a timezone. This is money. */
const eur = new Intl.NumberFormat("en-IE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const money = (n: number) => `€${eur.format(n)}`;

export function TrendChart({ weeks, changeNote }: { weeks: TrendWeek[]; changeNote: string | null }) {
  const id = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  /* Weeks with no enquiry have no cost per enquiry. They are a real fact and
     they are not a point on this line: drawing them as zero would show the
     best possible week where in truth nothing converted at all. */
  const points = weeks.map((w, i) => ({ ...w, i })).filter((w) => w.cpa !== null);
  if (points.length < 3) {
    return <p className="px-4 py-8 text-center text-sm text-slate-500">Not enough weeks with an enquiry to draw a trend yet.</p>;
  }

  const W = 720, H = 190, padL = 46, padR = 14, padT = 16, padB = 34;
  const vals = points.map((p) => p.cpa!);
  const max = Math.max(...vals) * 1.1;
  const min = 0; // cost per enquiry is money; a truncated axis exaggerates every wobble
  const span = max - min || 1;

  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => H - padB - ((v - min) / span) * (H - padT - padB);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.cpa!).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`;

  const first = points[0]!.cpa!;
  const last = points[points.length - 1]!.cpa!;
  const better = last < first;
  const pct = first > 0 ? Math.abs(((last - first) / first) * 100) : 0;

  const ticks = [0, 0.5, 1].map((f) => min + f * span);
  const active = hover === null ? null : points[hover] ?? null;

  return (
    <div className="px-4 pb-4 pt-3">
      <p className="mb-2 text-sm text-slate-700">
        Each enquiry cost{" "}
        <b className={better ? "text-emerald-700" : "text-rose-700"}>
          {money(last)} {better ? "now" : "now"}
        </b>{" "}
        against {money(first)} at the start of this window, {better ? "down" : "up"} {pct.toFixed(0)}%.
        {" "}Down is better.
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
           aria-label={`Cost per enquiry by week, from ${money(first)} to ${money(last)}`}>
        <defs>
          <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={better ? "#047857" : "#be123c"} stopOpacity=".16" />
            <stop offset="1" stopColor={better ? "#047857" : "#be123c"} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">{money(t)}</text>
          </g>
        ))}

        {/* A week we touched the account. Drawn behind the line so it never
            hides the value it is meant to explain. */}
        {points.map((p, i) => p.changes > 0 && (
          <line key={`c${p.key}`} x1={x(i)} x2={x(i)} y1={padT} y2={H - padB}
                stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 3" opacity=".5" />
        ))}

        <path d={area} fill={`url(#t${id})`} />
        <path d={line} fill="none" stroke={better ? "#047857" : "#be123c"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={p.key}>
            <circle cx={x(i)} cy={y(p.cpa!)} r={hover === i ? 5 : 3}
                    fill={p.changes > 0 ? "#0ea5e9" : better ? "#047857" : "#be123c"}
                    className="transition-all duration-150" />
            {/* A generous invisible target, because 3px circles are not hoverable. */}
            <rect x={x(i) - 16} y={padT} width="32" height={H - padT - padB} fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          </g>
        ))}

        {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((p) => (
          <text key={`x${p.key}`} x={x(points.indexOf(p))} y={H - 12} textAnchor="middle"
                className="fill-slate-400 text-[10px]">{p.label.replace("Week of ", "")}</text>
        ))}
      </svg>

      <div className="mt-1 min-h-[3rem] rounded-lg bg-slate-50 px-3 py-2 text-xs">
        {active ? (
          <p className="text-slate-700">
            <b className="text-slate-900">{active.label}.</b>{" "}
            {money(active.cost)} spent, {active.conversions % 1 === 0 ? active.conversions : active.conversions.toFixed(1)} enquiries,{" "}
            {money(active.cpa!)} each.
            {active.changes > 0 && <> We made <b>{active.changes}</b> change{active.changes === 1 ? "" : "s"} to the account that week.</>}
          </p>
        ) : (
          <p className="text-slate-500">
            Hover a week for the figures behind it. A dashed line marks a week we changed something.
            {changeNote && <> {changeNote}</>}
          </p>
        )}
      </div>
    </div>
  );
}
