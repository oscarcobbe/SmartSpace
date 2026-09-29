/**
 * The dial on the Wi-Fi check.
 *
 * Log scale, because the homes this reads run from 5 Mbps on a poor line to
 * 1,000 on fibre, and on a straight scale everything under 100 would sit in
 * the first tenth of the arc. The arc moves by stroke-dashoffset alone, which
 * is a paint of one path and no layout, four times a second while a test runs.
 */

const MAX = 1000;
const CX = 120;
const CY = 124;
const R = 100;
const LEN = Math.PI * R;
const TICKS = [0, 10, 50, 100, 500, 1000];

export const gaugeFraction = (v: number) =>
  Math.max(0, Math.min(1, Math.log10(1 + Math.max(0, v)) / Math.log10(1 + MAX)));

/* Rounded to two places. Math.cos differs in the last digit between Node and
   the browser, and an unrounded coordinate made the server's markup and the
   client's disagree, which React reports as a hydration mismatch. */
const at = (f: number, r: number) => {
  const a = Math.PI * (1 - f);
  return { x: Math.round((CX + r * Math.cos(a)) * 100) / 100, y: Math.round((CY - r * Math.sin(a)) * 100) / 100 };
};

export default function SpeedGauge({
  value,
  tone = "download",
  label,
}: {
  value: number | null;
  tone?: "download" | "upload";
  label: string;
}) {
  const f = gaugeFraction(value ?? 0);
  const shown = value == null ? "-" : value >= 10 ? String(Math.round(value)) : value.toFixed(1);
  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <svg viewBox="0 0 240 150" className="w-full max-w-[320px] mx-auto" role="img" aria-label={`${label}: ${shown} megabits per second`}>
      <defs>
        <linearGradient id="gauge-down" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#FF7A1A" />
          <stop offset="100%" stopColor="#F26419" />
        </linearGradient>
        <linearGradient id="gauge-up" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#5A524C" />
          <stop offset="100%" stopColor="#1C1A18" />
        </linearGradient>
      </defs>
      <path d={arc} fill="none" stroke="#EDEAE3" strokeWidth={14} strokeLinecap="round" />
      <path
        d={arc}
        fill="none"
        stroke={`url(#${tone === "upload" ? "gauge-up" : "gauge-down"})`}
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={LEN}
        strokeDashoffset={LEN * (1 - f)}
        className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
      />
      {TICKS.map((t) => {
        const tf = gaugeFraction(t);
        const a = at(tf, 84);
        const p1 = at(tf, 91);
        const p2 = at(tf, 95);
        return (
          <g key={t}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#C9C3BA" strokeWidth={1.5} />
            <text x={a.x} y={a.y + 3} textAnchor="middle" fontSize={9} fill="#8A817A" fontWeight={600}>
              {t === 1000 ? "1G" : t}
            </text>
          </g>
        );
      })}
      <text x={CX} y={CY - 18} textAnchor="middle" fontSize={40} fontWeight={800} fill="#1C1A18" letterSpacing="-1.5">
        {shown}
      </text>
      <text x={CX} y={CY + 2} textAnchor="middle" fontSize={11} fontWeight={600} fill="#8A817A">
        Mbps
      </text>
    </svg>
  );
}
