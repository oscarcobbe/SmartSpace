"use client";

/**
 * Charts drawn as plain SVG, with no charting library.
 *
 * The pages need one bar chart and one line, both over twelve buckets. A
 * library for that would be more kilobytes than the rest of the CRM and would
 * have to be loaded from a CDN, which is a third party sitting in front of a
 * customer database for the sake of a rectangle.
 *
 * Everything is laid out from one scale, and the axis labels name values the
 * bars actually reach, so the picture and the numbers cannot disagree.
 */

import { useState } from "react";

const PAD = { top: 22, right: 8, bottom: 28, left: 46 };

/** A tick step that lands on a round number: 1, 2, 2.5 or 5 times a power of ten. */
function niceStep(max: number, targetTicks = 4): number {
  if (max <= 0) return 1;
  const raw = max / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * mag;
}

const short = (n: number) =>
  Math.abs(n) >= 1000 ? `€${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}k` : `€${Math.round(n)}`;

export interface Bar {
  label: string;
  /** Drawn solid, bottom up. */
  value: number;
  /** Drawn faint, stacked on top of value. Use for the part that is not kept. */
  secondary?: number;
  title?: string;
  /**
   * What the bar is made of, shown under the chart while it is hovered.
   * Nigel's test for a chart is whether it can answer "what is this number",
   * and a native SVG title tooltip cannot: it takes a second to appear, it
   * cannot be reached with a keyboard and it holds one line of unstyled text.
   */
  detail?: { label: string; value: string }[];
}

export function BarChart({ bars, height = 220, ariaLabel }: { bars: Bar[]; height?: number; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const width = 720;
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const peak = Math.max(1, ...bars.map((b) => b.value + (b.secondary ?? 0)));
  const step = niceStep(peak);
  const top = Math.ceil(peak / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

  const slot = plotW / Math.max(1, bars.length);
  const barW = Math.min(46, slot * 0.62);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;

  const active = hover ?? pinned;
  const shown = active !== null ? bars[active] : null;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="h-auto w-full"
        onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">{short(t)}</text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = PAD.left + slot * i + slot / 2;
          const x = cx - barW / 2;
          const hMain = Math.max(0, plotH - (y(b.value) - PAD.top));
          const hSec = b.secondary ? (b.secondary / top) * plotH : 0;
          const on = active === i;
          return (
            <g key={b.label}>
              {/* One hit area per bucket, so the pointer never has to find the
                  bar and a keyboard can tab through the same targets. */}
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH}
                fill={on ? "#0f172a" : "transparent"} fillOpacity={on ? 0.05 : 0}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={() => setPinned(pinned === i ? null : i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned(pinned === i ? null : i); } }}
                tabIndex={0} role="button" aria-label={b.title ?? `${b.label}: ${short(b.value)}`} />
              {hSec > 0 && (
                <rect x={x} y={y(b.value + b.secondary!)} width={barW} height={hSec} fill="#fcd9b6" rx="2"
                  pointerEvents="none" />
              )}
              <rect x={x} y={y(b.value)} width={barW} height={hMain} rx="2" pointerEvents="none"
                fill={on ? "#d96d0c" : "#f48222"} />
              {on && (
                <text x={cx} y={y(b.value + (b.secondary ?? 0)) - 7} textAnchor="middle" fontSize="11"
                  fontWeight="700" fill="#0f172a" pointerEvents="none"
                  stroke="#fff" strokeWidth="3" paintOrder="stroke">
                  {short(b.value)}
                </text>
              )}
              <text x={cx} y={height - 9} textAnchor="middle" fontSize="11"
                fill={on ? "#0f172a" : "#64748b"} pointerEvents="none">{b.label}</text>
            </g>
          );
        })}
        <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="#cbd5e1" strokeWidth="1" />
      </svg>

      {/* Reserved height rather than conditional, so the panel never jumps as
          the pointer moves across the chart. */}
      <div className="min-h-[3.25rem] border-t border-slate-100 px-4 py-2 text-sm">
        {shown ? (
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {shown.label}
              {pinned !== null && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">pinned</span>}
            </p>
            <dl className="mt-0.5 flex flex-wrap gap-x-6 gap-y-0.5">
              {(shown.detail ?? [{ label: "Value", value: short(shown.value) }]).map((d) => (
                <div key={d.label} className="flex items-baseline gap-1.5">
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">{d.label}</dt>
                  <dd className="text-xs font-semibold tabular-nums text-slate-900">{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Hover or tap a bar for the figures behind it.</p>
        )}
      </div>
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-4 px-4 pb-4 text-xs text-slate-600">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: i.color }} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
