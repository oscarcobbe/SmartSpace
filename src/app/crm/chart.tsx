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

const PAD = { top: 12, right: 8, bottom: 28, left: 46 };

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
}

export function BarChart({ bars, height = 220, ariaLabel }: { bars: Bar[]; height?: number; ariaLabel: string }) {
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

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
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
        const hSec = b.secondary ? ((b.secondary / top) * plotH) : 0;
        return (
          <g key={b.label}>
            {hSec > 0 && (
              <rect x={x} y={y(b.value + b.secondary!)} width={barW} height={hSec} fill="#fcd9b6" rx="2" />
            )}
            <rect x={x} y={y(b.value)} width={barW} height={hMain} fill="#f48222" rx="2">
              <title>{b.title ?? `${b.label}: ${short(b.value)}`}</title>
            </rect>
            <text x={cx} y={height - 9} textAnchor="middle" fontSize="11" fill="#64748b">{b.label}</text>
          </g>
        );
      })}
      <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="#cbd5e1" strokeWidth="1" />
    </svg>
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
