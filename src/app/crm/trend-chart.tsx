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

export type MetricId = "cpa" | "cost" | "conversions" | "value" | "roas" | "clicks" | "ctr";

/*
 * How many enquiries a period needs before a ratio taken over it means
 * anything.
 *
 * Cost per enquiry and return are both a division, and on a twenty euro a day
 * budget the denominator is often one. A week with a single enquiry at EUR 148
 * was drawn as a precise point at the top of the chart and then compared
 * against another single week at the other end, which produced "down 85%" as
 * though it were a trend. It is not a trend, it is two coin flips.
 *
 * Periods under this still appear, drawn hollow, and are kept out of the
 * comparison. Hiding them would be worse: a week with one enquiry is a fact
 * about the week.
 */
const ENOUGH_TO_DIVIDE = 3;

/* The same argument for a rate: a day with nine impressions reads as 0% or as
   11% depending on one click, and neither is a fact about the ads. */
const ENOUGH_IMPRESSIONS = 200;

const METRICS: {
  id: MetricId; label: string; short: string;
  /** Which direction is good news for THIS number. */
  better: "down" | "up" | "neither";
  /** True when the number is a division, so a small period cannot support it. */
  ratio?: boolean;
  /** Does this period have enough behind it to divide? Defaults to enquiries,
      which is right for the money ratios and wrong for a rate over
      impressions. */
  enough?: (p: TrendPoint) => boolean;
  /** What the denominator is, in the reader's words, for the note on screen. */
  denominator?: string;
  get: (p: TrendPoint) => number | null;
  fmt: (n: number) => string;
}[] = [
  { id: "cpa",         label: "Cost per enquiry", short: "Cost each",  better: "down", ratio: true, get: p => p.cpa,  fmt: money },
  { id: "conversions", label: "Enquiries",        short: "Enquiries",  better: "up",      get: p => p.conversions, fmt: n => nf.format(n) },
  { id: "value",       label: "Work won",         short: "Work won",   better: "up",      get: p => p.value,       fmt: money },
  { id: "roas",        label: "Back per €1",      short: "Return",     better: "up",   ratio: true, get: p => p.roas, fmt: n => `${n.toFixed(1)}x` },
  { id: "cost",        label: "Spend",            short: "Spend",      better: "neither", get: p => p.cost,        fmt: money },
  { id: "clicks",      label: "Clicks",           short: "Clicks",     better: "neither", get: p => p.clicks,      fmt: n => nf.format(n) },
  /* A rate, so it needs a denominator worth dividing by in the same way the
     money ratios do: a day with nine impressions can read as 33% or as 0%. */
  { id: "ctr",         label: "Click rate",       short: "Click rate", better: "up",   ratio: true,
    enough: p => p.impressions >= ENOUGH_IMPRESSIONS, denominator: "impressions",
    get: p => (p.impressions ? (p.clicks / p.impressions) * 100 : null), fmt: n => `${n.toFixed(1)}%` },
];

const WINDOWS = [
  { id: "d30", label: "30 days",   grain: "day"   as const, take: 30 },
  { id: "w12", label: "12 weeks",  grain: "week"  as const, take: 12 },
  { id: "w26", label: "6 months",  grain: "week"  as const, take: 26 },
  { id: "m12", label: "12 months", grain: "month" as const, take: 12 },
];

export function TrendChart({
  day, week, month, changeNote, initial = "cpa",
}: { day: TrendPoint[]; week: TrendPoint[]; month: TrendPoint[]; changeNote: string | null;
     /** Which metric the chart opens on. The detail pages open on their own. */
     initial?: MetricId }) {
  const id = useId().replace(/:/g, "");
  const [metricId, setMetricId] = useState<MetricId>(initial);
  const [windowId, setWindowId] = useState("w12");
  const [hover, setHover] = useState<number | null>(null);
  /* Clicking pins, so the figures can be read without holding the pointer
     still and so they survive on a touch screen with no hover at all. */
  const [pinned, setPinned] = useState<number | null>(null);

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

  /* Shorter: this is a supporting chart and was taking the room of the headline one. */
  const W = 720, H = 132, padL = 52, padR = 14, padT = 12, padB = 30;
  const vals = points.map((p) => p.v);
  /* Zero-based, because these are money and counts and a truncated axis turns
     an ordinary wobble into a cliff. */
  const max = Math.max(...vals) * 1.1 || 1;
  const span = max || 1;

  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => H - padB - (v / span) * (H - padT - padB);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${H - padB} L ${x(0).toFixed(1)} ${H - padB} Z`;

  /*
   * Ends against ends, averaged, and only over periods big enough to divide.
   *
   * This used to take the very first point and the very last one. On a ratio
   * that is two single weeks, and it produced sentences like "down 85 per
   * cent" out of a week with one enquiry at the start and one at the end.
   * Comparing the earliest third against the latest third survives one odd
   * week, which is the only kind of movement worth telling somebody about.
   */
  const enough = metric.enough ?? ((p: TrendPoint) => p.conversions >= ENOUGH_TO_DIVIDE);
  const solid = points.filter((p) => !metric.ratio || enough(p));
  const basis = solid.length >= 4 ? solid : points;
  const chunk = Math.max(1, Math.floor(basis.length / 3));
  const mean = (xs: typeof basis) => xs.reduce((n, p) => n + p.v, 0) / xs.length;
  const first = mean(basis.slice(0, chunk));
  const last = mean(basis.slice(-chunk));
  const thin = points.length - solid.length;

  const rose = last > first;
  const good = metric.better === "neither" ? null : metric.better === "up" ? rose : !rose;
  const pct = first > 0 ? Math.abs(((last - first) / first) * 100) : 0;
  const hue = good === null ? "#475569" : good ? "#047857" : "#be123c";

  /* Hover wins over a pin while the pointer is on the chart, so a pinned
     point never blocks reading a neighbour. */
  const activeIdx = hover ?? pinned;
  const active = activeIdx === null ? null : points[activeIdx] ?? null;
  const step = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div>
      {controls}
      <div className="px-4 pb-4 pt-3">
        <p className="mb-2 text-sm text-slate-700">
          {metric.label} averaged{" "}
          <b style={{ color: hue }}>{metric.fmt(last)}</b>{" "}
          over the latest {chunk === 1 ? win.grain : `${chunk} ${win.grain}s`} of this window,
          against {metric.fmt(first)} over the earliest {chunk === 1 ? "one" : chunk}
          {pct > 0 && <>, {rose ? "up" : "down"} {pct.toFixed(0)}%</>}.
          {metric.better !== "neither" && <> {metric.better === "down" ? "Down" : "Up"} is better.</>}
          {metric.ratio && thin > 0 && (
            <span className="text-slate-500">
              {" "}{thin} {thin === 1 ? "period is" : "periods are"} drawn hollow and left out of that
              comparison: too little {metric.denominator ?? "enquiries"} behind {thin === 1 ? "it" : "them"} to divide by.
            </span>
          )}
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
              {/* Hollow where the period had too few enquiries to divide by.
                  A single enquiry at EUR 148 is a fact about that week and not
                  a cost per enquiry, and drawing it solid alongside a week of
                  nine says the two are the same kind of number. */}
              {(() => {
                const thinPoint = Boolean(metric.ratio) && !enough(p);
                const r = activeIdx === i ? 5 : points.length > 40 ? 1.8 : 3;
                return (
                  <circle cx={x(i)} cy={y(p.v)} r={r}
                          fill={thinPoint ? "#ffffff" : p.changes > 0 ? "#0ea5e9" : hue}
                          stroke={thinPoint ? (p.changes > 0 ? "#0ea5e9" : hue) : "none"}
                          strokeWidth={thinPoint ? 1.6 : 0}
                          className="transition-all duration-150" />
                );
              })()}
              {/* A generous invisible target: 3px circles are not hoverable,
                  and a keyboard cannot reach them at all without this. */}
              <rect x={x(i) - (W / points.length) / 2} y={padT} width={W / points.length} height={H - padT - padB}
                    fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                    onClick={() => setPinned(pinned === i ? null : i)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned(pinned === i ? null : i); } }}
                    tabIndex={0} role="button" aria-label={`${p.label}: ${metric.fmt(p.v)}`} />
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
              {pinned !== null && hover === null && (
                <span className="mr-1 rounded bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">pinned</span>
              )}
              {money(active.cost)} spent, {active.conversions % 1 === 0 ? active.conversions : active.conversions.toFixed(1)} enquiries
              {active.cpa !== null && <> at {money(active.cpa)} each</>}, {money(active.value)} of work won
              {active.roas !== null && <>, {active.roas.toFixed(1)}x back</>}.
              {active.changes > 0 && <> We made <b>{active.changes}</b> change{active.changes === 1 ? "" : "s"} that {win.grain}.</>}
            </p>
          ) : (
            <p className="text-slate-500">
              Hover or tap a point for everything behind it. A dashed line marks a {win.grain} we changed something.
              {changeNote && <> {changeNote}</>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
