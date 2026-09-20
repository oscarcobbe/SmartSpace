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
import { useId } from "react";

export function Sparkline({
  series,
  tone = "none",
  baseline = null,
  width = 104,
  height = 28,
}: {
  series: number[];
  tone?: "good" | "watch" | "bad" | "none";
  /** The previous period's figure, drawn as a dashed rule. Without it a
      sparkline says where a number has been and not whether that is better
      than last time, which is the only question anybody was asking. */
  baseline?: number | null;
  width?: number;
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  if (series.length < 2) {
    return <div style={{ width, height }} className="text-[10px] leading-7 text-slate-400" aria-hidden="true">not enough history</div>;
  }

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1; // a flat line sits in the middle rather than dividing by zero
  const pad = 2;

  const x = (i: number) => (i / (series.length - 1)) * (width - pad * 2) + pad;
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

  const line = series.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(series.length - 1).toFixed(1)} ${height} L ${x(0).toFixed(1)} ${height} Z`;

  const stroke =
    tone === "good" ? "#047857" : tone === "bad" ? "#be123c" : tone === "watch" ? "#b45309" : "#64748b";

  /* Only inside the plotted range, with a pixel of room at each edge, because
     a rule pinned to the top or bottom reads as the chart's own border. */
  const showBaseline = baseline !== null && baseline > min && baseline < max;

  return (
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
    </svg>
  );
}
