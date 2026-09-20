"use client";

/**
 * Any of six numbers, over any of four windows, with the weeks we changed
 * something marked on the line.
 *
 * This exists because of a question the client actually asked. He read that
 * advertising had produced 32 euro of sales on 300 of spend in one section and
 * something much better in another, and wanted to know what had changed. Both
 * numbers were right and neither answered him, and nothing on the page said
 * whether the account was getting better or worse over time.
 *
 * Direction is per metric, not global. Cost per enquiry falling is good news
 * and spend falling is not, so each metric carries its own idea of which way
 * is up and the colour follows that rather than the sign.
 *
 * Google retains change history for fourteen days and no longer, so markers
 * only ever land on recent points. The footer says so rather than letting an
 * unmarked week read as a week nobody touched.
 */
import { useId, useMemo, useState } from "react";

export interface TrendPoint {
  key: string;
  label: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
  cpa: number | null;
  roas: number | null;
  changes: number;
}

const eur = new Intl.NumberFormat("en-IE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const nf = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
const money = (n: number) => `€${eur.format(n)}`;

type MetricId = "cpa" | "cost" | "conversions" | "value" | "roas" | "clicks";

const METRICS: {
  id: MetricId; label: string; short: string;
  /** Which direction is good news for THIS number. */
  better: "down" | "up" | "neither";
  get: (p: TrendPoint) => number | null;
  fmt: (n: number) => string;
}[] = [
  { id: "cpa",         label: "Cost per enquiry", short: "Cost each",  better: "down",    get: p => p.cpa,         fmt: money },
  { id: "conversions", label: "Enquiries",        short: "Enquiries",  better: "up",      get: p => p.conversions, fmt: n => nf.format(n) },
  { id: "value",       label: "Work won",         short: "Work won",   better: "up",      get: p => p.value,       fmt: money },
  { id: "roas",        label: "Back per €1",      short: "Return",     better: "up",      get: p => p.roas,        fmt: n => `${n.toFixed(1)}x` },
  { id: "cost",        label: "Spend",            short: "Spend",      better: "neither", get: p => p.cost,        fmt: money },
  { id: "clicks",      label: "Clicks",           short: "Clicks",     better: "neither", get: p => p.clicks,      fmt: n => nf.format(n) },
];

const WINDOWS = [
  { id: "d30", label: "30 days",   grain: "day"   as const, take: 30 },
  { id: "w12", label: "12 weeks",  grain: "week"  as const, take: 12 },
  { id: "w26", label: "6 months",  grain: "week"  as const, take: 26 },
  { id: "m12", label: "12 months", grain: "month" as const, take: 12 },
];

export function TrendChart({
  day, week, month, changeNote,
}: { day: TrendPoint[]; week: TrendPoint[]; month: TrendPoint[]; changeNote: string | null }) {
  const id = useId().replace(/:/g, "");
  const [metricId, setMetricId] = useState<MetricId>("cpa");
  const [windowId, setWindowId] = useState("w12");
  const [hover, setHover] = useState<number | null>(null);

  const metric = METRICS.find((m) => m.id === metricId)!;
  const win = WINDOWS.find((w) => w.id === windowId)!;
  const source = win.grain === "day" ? day : win.grain === "week" ? week : month;

  /* A point with no value for this metric is left off rather than drawn as
     zero. A week with no enquiry has no cost per enquiry, and a zero would
     render as the best week on the chart when in truth nothing converted. */
  const points = useMemo(
    () => source.slice(-win.take).map((p) => ({ ...p, v: metric.get(p) })).filter((p): p is TrendPoint & { v: number } => p.v !== null),
    [source, win.take, metric],
  );

  const chip = (on: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
      on ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
    }`;

  const controls = (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-slate-200 bg-slate-50/80 px-3 py-2">
      {METRICS.map((m) => (
        <button key={m.id} type="button" onClick={() => { setMetricId(m.id); setHover(null); }}
                aria-pressed={metricId === m.id} className={chip(metricId === m.id)}>
          {m.short}
        </button>
      ))}
      <span className="mx-1 hidden h-4 w-px bg-slate-300 sm:block" aria-hidden="true" />
      {WINDOWS.map((w) => (
        <button key={w.id} type="button" onClick={() => { setWindowId(w.id); setHover(null); }}
                aria-pressed={windowId === w.id} className={chip(windowId === w.id)}>
          {w.label}
        </button>
      ))}
    </div>
  );

  if (points.length < 3) {
    return (
      <div>
        {controls}
        <p className="px-4 py-10 text-center text-sm text-slate-500">
          Not enough {win.grain === "day" ? "days" : win.grain === "week" ? "weeks" : "months"} with a figure for {metric.label.toLowerCase()} to draw a line.
        </p>
      </div>
    );
  }

  const W = 720, H = 190, padL = 52, padR = 14, padT = 16, padB = 34;
  const vals = points.map((p) => p.v);
  /* Zero-based, because these are money and counts and a truncated axis turns
     an ordinary wobble into a cliff. */
  const max = Math.max(...vals) * 1.1 || 1;
  const span = max || 1;

  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => H - padB - (v / span) * (H - padT - padB);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`;

  const first = points[0]!.v, last = points[points.length - 1]!.v;
  const rose = last > first;
  const good = metric.better === "neither" ? null : metric.better === "up" ? rose : !rose;
  const pct = first > 0 ? Math.abs(((last - first) / first) * 100) : 0;
  const hue = good === null ? "#475569" : good ? "#047857" : "#be123c";

  const active = hover === null ? null : points[hover] ?? null;
  const step = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div>
      {controls}
      <div className="px-4 pb-4 pt-3">
        <p className="mb-2 text-sm text-slate-700">
          {metric.label} is{" "}
          <b style={{ color: hue }}>{metric.fmt(last)}</b>{" "}
          against {metric.fmt(first)} at the start of this window
          {pct > 0 && <>, {rose ? "up" : "down"} {pct.toFixed(0)}%</>}.
          {metric.better !== "neither" && <> {metric.better === "down" ? "Down" : "Up"} is better.</>}
        </p>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
             aria-label={`${metric.label} by ${win.grain}, from ${metric.fmt(first)} to ${metric.fmt(last)}`}>
          <defs>
            <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={hue} stopOpacity=".16" />
              <stop offset="1" stopColor={hue} stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((f, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y(f * span)} y2={y(f * span)} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL - 8} y={y(f * span) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                {metric.fmt(f * span)}
              </text>
            </g>
          ))}

          {/* Behind the line, so a marker never hides the value it explains. */}
          {points.map((p, i) => p.changes > 0 && (
            <line key={`c${p.key}`} x1={x(i)} x2={x(i)} y1={padT} y2={H - padB}
                  stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 3" opacity=".5" />
          ))}

          <path d={area} fill={`url(#t${id})`} />
          <path d={line} fill="none" stroke={hue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <g key={p.key}>
              <circle cx={x(i)} cy={y(p.v)} r={hover === i ? 5 : points.length > 40 ? 1.8 : 3}
                      fill={p.changes > 0 ? "#0ea5e9" : hue} className="transition-all duration-150" />
              {/* A generous invisible target: 3px circles are not hoverable. */}
              <rect x={x(i) - (W / points.length) / 2} y={padT} width={W / points.length} height={H - padT - padB}
                    fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          ))}

          {points.map((p, i) => i % step === 0 && (
            <text key={`x${p.key}`} x={x(i)} y={H - 12} textAnchor="middle" className="fill-slate-400 text-[10px]">
              {p.label.replace("Week of ", "")}
            </text>
          ))}
        </svg>

        <div className="mt-1 min-h-[3rem] rounded-lg bg-slate-50 px-3 py-2 text-xs">
          {active ? (
            <p className="text-slate-700">
              <b className="text-slate-900">{active.label}.</b>{" "}
              {money(active.cost)} spent, {active.conversions % 1 === 0 ? active.conversions : active.conversions.toFixed(1)} enquiries
              {active.cpa !== null && <> at {money(active.cpa)} each</>}, {money(active.value)} of work won
              {active.roas !== null && <>, {active.roas.toFixed(1)}x back</>}.
              {active.changes > 0 && <> We made <b>{active.changes}</b> change{active.changes === 1 ? "" : "s"} that {win.grain}.</>}
            </p>
          ) : (
            <p className="text-slate-500">
              Hover a point for everything behind it. A dashed line marks a {win.grain} we changed something.
              {changeNote && <> {changeNote}</>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
