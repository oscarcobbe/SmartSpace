import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

/**
 * The headline tiles, in the shape the client asked for.
 *
 * ── WHY A DELTA IS NOT OPTIONAL ──────────────────────────────────
 *
 * A card like this is mostly its change indicator. "Spend 3,091" is a fact
 * nobody can act on; "3,091, down 9 per cent on the four weeks before" is a
 * sentence. Neither of these pages had a prior period at all, so every figure
 * was presented without the one thing that makes it mean something, and that
 * is most of why they read as flat.
 *
 * The comparison is four periods against the four before, never the latest
 * point against the first. On this budget a single week can be one enquiry,
 * and comparing two of those produces confident nonsense. Same reasoning as
 * the trend chart.
 *
 * ── WHITE TILES, A COLOURED EDGE ─────────────────────────────────
 *
 * The tiles were solid blocks of six saturated colours. Read on a screen
 * with a chart under them they were the loudest thing on the page, and the
 * red one held a 4.2x return, which is good news in the colour of bad news.
 * Oscar, 1 October 2026: white tiles. Each keeps its hue as a thin top edge
 * and on its sparkline, so the row is still scannable and a reader still
 * learns where Spend sits, and the figures are ink on white.
 *
 * Whether a movement is good or bad is carried by the chip beside it, green
 * or rose with an arrow, and never by the tile.
 */

export type KpiHue = "blue" | "red" | "violet" | "green" | "orange" | "indigo" | "slate";

export const HUE: Record<KpiHue, string> = {
  blue: "#1d4ed8",
  red: "#b91c1c",
  violet: "#6d28d9",
  green: "#15803d",
  orange: "#c2410c",
  indigo: "#4338ca",
  slate: "#334155",
};

export interface Delta {
  /** Percentage movement, already signed. Null when there is nothing to compare. */
  pct: number | null;
  /** The movement in the metric's own units, already formatted. */
  absolute: string | null;
  /** Which direction is good news for this number. */
  better: "up" | "down" | "neither";
  /** What it is being compared against, for the title attribute. */
  against: string;
}

/**
 * Four periods against the four before them.
 *
 * Returns null rather than a zero when there is not enough history, so the
 * card can say nothing instead of implying the number has held steady.
 */
export function compareTail(
  series: number[],
  better: Delta["better"],
  fmt: (n: number) => string,
  against = "the four weeks before",
): Delta {
  const clean = series.filter((n) => Number.isFinite(n));
  if (clean.length < 4) return { pct: null, absolute: null, better, against };
  const take = Math.min(4, Math.floor(clean.length / 2));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const now = mean(clean.slice(-take));
  const then = mean(clean.slice(-take * 2, -take));
  if (!Number.isFinite(then) || then === 0) return { pct: null, absolute: null, better, against };
  return {
    pct: ((now - then) / then) * 100,
    absolute: fmt(now - then),
    better,
    against,
  };
}

function Movement({ delta }: { delta: Delta }) {
  if (delta.pct === null) {
    return <span className="text-[11.5px] text-slate-400">not enough history to compare</span>;
  }
  const flat = Math.abs(delta.pct) < 0.5;
  const rose = delta.pct > 0;
  const good = delta.better === "neither" ? null : delta.better === "up" ? rose : !rose;
  const Icon = flat ? Minus : rose ? ArrowUp : ArrowDown;
  const chip = flat || good === null
    ? "bg-slate-100 text-slate-700"
    : good ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[12px]" title={`Against ${delta.against}`}>
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${chip}`}>
        <Icon className="h-3 w-3" aria-hidden="true" />
        {flat ? "level" : `${Math.abs(delta.pct).toFixed(0)}%`}
      </span>
      {delta.absolute && !flat && <span className="text-slate-500">{delta.absolute}</span>}
    </span>
  );
}

/**
 * ── WHY A TILE IS A LINK ─────────────────────────────────────────
 *
 * The row answers "what is the number". It cannot answer "why", and six tiles
 * of numbers with nowhere to go is the thing that read as a poster rather than
 * a dashboard. Each tile now opens the one metric on its own page: its full
 * history, the periods behind it, which campaigns made it and what we changed
 * while it moved.
 *
 * A tile without an href stays a plain div rather than a link that goes
 * nowhere, because a cursor that changes over something unclickable is worse
 * than no affordance at all.
 */
export function Kpi({
  label, value, hue = "slate", icon, delta, note, spark, href,
}: {
  label: string;
  value: string;
  hue?: KpiHue;
  icon?: ReactNode;
  delta?: Delta;
  note?: string;
  /** A sparkline, in the tile's own hue (Sparkline's color). */
  spark?: ReactNode;
  /** Where the tile opens. Omit and it is not clickable. */
  href?: string;
}) {
  const inner = (
    <>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ background: HUE[hue] }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
          {/* A long value steps down a size rather than running off the
              tile. "~€13,959" clipped its last digit at six tiles across,
              and a figure missing a digit is a different figure. */}
          <div className={`mt-1.5 font-bold leading-none tracking-tight text-slate-900 ${
            value.length > 7 ? "text-[22px]" : "text-[28px]"}`}>
            {value}
          </div>
        </div>
        {icon && (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" aria-hidden="true"
               style={{ background: `${HUE[hue]}14`, color: HUE[hue] }}>
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 min-h-[20px]">
        {delta ? <Movement delta={delta} /> : note ? <span className="text-[11.5px] text-slate-500">{note}</span> : null}
      </div>
      {note && delta && <div className="mt-1 text-[11.5px] text-slate-500">{note}</div>}
      {spark && <div className="mt-2 -mb-1">{spark}</div>}
    </>
  );

  const shell = "kpi-tile relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";

  if (!href) return <div className={shell}>{inner}</div>;

  return (
    <Link
      href={href}
      className={`${shell} kpi-open transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2`}
      aria-label={`${label}: ${value}. Open the detail.`}
    >
      {inner}
      <span aria-hidden="true"
            className="kpi-chev pointer-events-none absolute bottom-3 right-3 text-[11px] font-semibold text-transparent">
        Open &rsaquo;
      </span>
    </Link>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">{children}</div>
  );
}
