/**
 * A sparkline, drawn from the actual series.
 *
 * Ported from the portal's Eurus tile, with its two learned details kept.
 *
 * Tone is good, watch, bad or none rather than a direction, because a metric
 * at zero and a metric doing well both drew in neutral grey when this was a
 * boolean, and the one a business needs to spot from across a room was the one
 * with no colour on it.
 *
 * The gradient id comes from useId and never from the data. Metrics fed by the
 * same source share identical date coverage, so keying on the series produced
 * the same id for every chart on the page, and url(#id) resolves to whichever
 * came first in the document.
 */
"use client";
import { useId, useState } from "react";

export function Sparkline({
  series,
  tone = "none",
  baseline = null,
  width = 104,
  height = 28,
  labels,
  format,
}: {
  series: number[];
  tone?: "good" | "watch" | "bad" | "none";
  /** The previous period's figure, drawn as a dashed rule. Without it a
      sparkline says where a number has been and not whether that is better
      than last time, which is the only question anybody was asking. */
  baseline?: number | null;
  width?: number;
  height?: number;
  /** One per point, for the readout. Falls back to a position if absent. */
  labels?: string[];
  /**
   * How to write the numbers out, named rather than passed as a function.
   * A server component cannot hand a function to a client one: React refuses
   * it at render time with "Functions cannot be passed directly to Client
   * Components", and the whole page falls to the error boundary.
   */
  format?: "money" | "count" | "ratio";
}) {
  const id = useId().replace(/:/g, "");
  /* Even a sparkline has to be able to say what a point is. Without this the
     only readable figure on the card was the last one. */
  const [at, setAt] = useState<number | null>(null);
  if (series.length < 2) {
    return <div style={{ width, height }} className="text-[10px] leading-7 text-slate-400" aria-hidden="true">not enough history</div>;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1; // a flat line sits in the middle rather than dividing by zero
  /*
   * Room for the marker, not just for the line.
   *
   * This was two pixels, which is less than the hovered point's own radius,
   * so the highest and lowest weeks had their dots sliced off by the edge of
   * the box and the line itself ran into the border. The padding has to clear
   * the largest thing drawn at a data point, which is the hover marker: three
   * pixels of radius plus half of its 1.6 stroke.
   */
  const MARKER = 3 + 1.6 / 2;
  const pad = Math.ceil(MARKER);

  const x = (i: number) => (i / (series.length - 1)) * (width - pad * 2) + pad;
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  const line = series.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(series.length - 1).toFixed(1)} ${height} L ${x(0).toFixed(1)} ${height} Z`;

  const stroke =
    tone === "good" ? "#047857" : tone === "bad" ? "#be123c" : tone === "watch" ? "#b45309" : "#64748b";

  /* Only inside the plotted range, with a pixel of room at each edge, because
     a rule pinned to the top or bottom reads as the chart's own border. */
  const showBaseline = baseline !== null && baseline > min && baseline < max;

  const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const fmt = (n: number) =>
    format === "money" ? money.format(n)
      : format === "ratio" ? `${n.toFixed(2)}\u00d7`
      : format === "count" ? n.toFixed(0)
      : Number.isInteger(n) ? String(n) : n.toFixed(1);

  return (
    <div className="relative">
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img"
         aria-label={`Trend, ${series.length} points, ending ${series[series.length - 1]!.toFixed(0)}`}
         className="overflow-visible">
      <defs>
        <linearGradient id={`sp${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity=".18" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp${id})`} />
      {showBaseline && (
        <line x1={pad} x2={width - pad} y1={y(baseline)} y2={y(baseline)}
              stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
      )}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(series.length - 1)} cy={y(series[series.length - 1]!)} r="2.4" fill={stroke} />
      {at !== null && (
        <>
          <line x1={x(at)} x2={x(at)} y1={0} y2={height} stroke="#94a3b8" strokeWidth="1" />
          <circle cx={x(at)} cy={y(series[at]!)} r="3" fill="#fff" stroke={stroke} strokeWidth="1.6" />
        </>
      )}
      {/* One hit area per point. A 1.6px line cannot be hovered, and a
          keyboard could not reach any of this at all. */}
      {series.map((v, i) => (
        <rect key={i} x={x(i) - (width / series.length) / 2} y={0}
              width={width / series.length} height={height} fill="transparent"
              onMouseEnter={() => setAt(i)} onFocus={() => setAt(i)}
              onMouseLeave={() => setAt(null)} onBlur={() => setAt(null)}
              tabIndex={0} role="button"
              aria-label={`${labels?.[i] ?? `Point ${i + 1}`}: ${fmt(v)}`} />
      ))}
    </svg>
    {at !== null && (
      <p className="pointer-events-none absolute -top-5 left-0 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
        {labels?.[at] ? `${labels[at]}: ` : ""}{fmt(series[at]!)}
      </p>
    )}
    </div>
  );
}
