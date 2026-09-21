"use client";

/**
 * The headline chart: money out against money back.
 *
 * ── WHAT THIS REPLACED, AND WHY ──────────────────────────────────
 *
 * The old version read Google live, drew one revenue series, and buried
 * itself under four other panels. It showed September falling off a cliff.
 * September did not fall off a cliff: no payment since 12 August has carried
 * a Google click id, so nothing in that period can be tied back to an ad
 * whatever caused it. A chart that draws "not known" as zero reports a blind
 * instrument as a business collapse.
 *
 * Note the wording. An earlier version of this file asserted that the click
 * id "stopped being written on 12 August", which was a guess dressed as a
 * finding and was wrong: capture kept working into September, and roughly
 * half the unattributed money is on payment links made by hand in the Stripe
 * dashboard, which never carried a click id and never could. 12 August is
 * the last attributed purchase, not the day anything broke.
 *
 * So: three bases, named plainly, with the gap between them drawn rather
 * than described; the period where nothing can be attributed shaded and
 * labelled instead of plotted as nought; and the whole thing reading from
 * the daily store, so the history stops changing shape between two loads.
 */

import { useEffect, useId, useMemo, useState } from "react";
import type { RoasBucket, RoasTotals, Grain } from "@/lib/crm/roas";
import { scaleFor } from "./roas-scale";

export type { RoasBucket };

export interface RoasChartProps {
  day: RoasBucket[];
  week: RoasBucket[];
  month: RoasBucket[];
  /** Totals over days, so the headline does not move when the grain does. */
  counted: RoasTotals;
  excluded: RoasTotals;
  /** Last day a payment carried a Google click id. */
  lastAttributed: string | null;
  /** False for a business whose work is invoiced off-platform. */
  revenueKnown: boolean;
  capturedAt: string | null;
  siteLabel: string;
}

/** Which money to set against the spend. See lib/crm/roas.ts for why three. */
type Basis = "ad" | "all" | "google";

const BASIS: Record<Basis, { label: string; short: string; blurb: string }> = {
  ad: {
    label: "Money from an ad",
    short: "from an ad",
    blurb: "Euro Stripe took on a checkout that carried a Google click id. Real money, counted strictly, so it can only understate.",
  },
  all: {
    label: "All money taken",
    short: "taken",
    blurb: "Every euro Stripe took, including work that came from the van or a phone call. Real money, counted loosely, so it can only overstate.",
  },
  google: {
    label: "Google's own figure",
    short: "Google's figure",
    blurb: "What Google recorded against the ads. Mostly placeholder values set per conversion type, not prices anyone paid.",
  },
};

/*
 * Two panels, one x axis, and no second y axis over the bars.
 *
 * ── WHY IT WAS CHANGED ───────────────────────────────────────────
 *
 * Money was drawn on the left scale and euro-back-per-euro on the right, both
 * inside the same box. Even with the two axes sharing gridlines the line had
 * nothing to do with the bars underneath it: it sat high across the top while
 * the columns sat low, crossing them at heights that meant nothing, and it
 * read exactly as it was described, a floating line that joins up with
 * nothing.
 *
 * That is not a bug in the drawing, it is what a dual axis does. Two
 * quantities in one box invite a reader to compare heights that are not
 * comparable. So the bars keep the box and the ratio moves to a strip
 * underneath, sharing the same columns and the same x positions. Nothing
 * overlaps, every point still lines up with its month, and the break-even
 * rule at one times is drawn in the strip, which is the only line on the
 * chart a reader actually needs to judge a ratio against.
 */
const PAD = { top: 22, right: 58, bottom: 30, left: 56 };
const WIDTH = 760;
/** The ratio strip under the bars, and the gap that separates them. */
const STRIP = 74;
const GUTTER = 16;

const eur = (n: number) =>
  Math.abs(n) >= 1000 ? `€${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}k` : `€${Math.round(n)}`;

const exact = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const int = (n: number) => new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 }).format(n);

/** Day number for a yyyy-mm-dd, in UTC, so a machine set to Denver cannot shift it. */
const dayNum = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000;

export default function RoasChart({
  day, week, month, counted, excluded, lastAttributed, revenueKnown, capturedAt, siteLabel,
}: RoasChartProps) {
  const [grain, setGrain] = useState<Grain>("month");
  /* A business with no takings of its own has nothing real to set against the
     spend, so Google's figure is all there is and the toggle would offer two
     empty series. */
  const [basis, setBasis] = useState<Basis>(revenueKnown ? "ad" : "google");
  const [hover, setHover] = useState<number | null>(null);
  /* Clicking pins, so the figures can be read without holding the pointer
     still and so they survive on a touch screen with no hover at all. */
  const [pinned, setPinned] = useState<number | null>(null);
  const uid = useId();

  const buckets = grain === "day" ? day : grain === "week" ? week : month;
  const height = 340;
  const plotW = WIDTH - PAD.left - PAD.right;
  /* The bars own everything above the strip; the strip owns the ratio. */
  const plotH = height - PAD.top - PAD.bottom - STRIP - GUTTER;
  const stripTop = PAD.top + plotH + GUTTER;

  const revenue = (b: RoasBucket) =>
    basis === "ad" ? b.adRevenue : basis === "all" ? b.allRevenue : b.googleValue;

  /* A bucket is blind when nothing in it could have been attributed, and part
     blind when the click id stopped part way through it. */
  const blindness = (b: RoasBucket): "none" | "part" | "all" => {
    if (!revenueKnown || basis !== "ad" || !lastAttributed) return "none";
    if (b.start > lastAttributed) return "all";
    if (b.end > lastAttributed) return "part";
    return "none";
  };

  const view = useMemo(() => {
    const peak = Math.max(1, ...buckets.map((b) => Math.max(b.spend, revenue(b))));
    const ratios = buckets
      .filter((b) => blindness(b) !== "all" && (basis !== "all" ? b.spend - b.spendBlind : b.spend) > 0)
      .map((b) => revenue(b) / (basis !== "all" ? b.spend - b.spendBlind : b.spend));
    return scaleFor(peak, Math.max(0, ...ratios));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, basis, lastAttributed, revenueKnown]);

  const y = (v: number) => PAD.top + plotH - (v / view.top) * plotH;
  /* Inside the strip, on its own floor, so a ratio is never drawn at a height
     that could be mistaken for an amount of money. */
  const ry = (v: number) => stripTop + STRIP - (Math.min(v, view.rTop) / view.rTop) * STRIP;

  const slot = plotW / Math.max(1, buckets.length);
  /* One label per this many columns. 58px is the widest label these formats
     produce plus a gap. */
  const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(1, Math.floor(plotW / 58))));
  const barW = Math.max(2, Math.min(18, slot * 0.32));

  /* Totals come from the day-level summary rather than from whatever buckets
     are on screen, so switching grain redraws the shape and never moves the
     headline. Where attribution is what is being measured, the blind run is
     left out entirely: adding a period whose money cannot be tied to an ad to
     a total labelled "from an ad" is the same lie in one number that the old
     chart told in a shape. */
  /*
   * Google's own figure goes blind with the rest of it.
   *
   * This used to treat the blind run as a problem only for "money from an
   * ad", on the reasoning that Google's number is Google's business. It is
   * not: Google records a sale when our tag fires carrying a click id, so when
   * the click id stopped on 12 August, Google's figure stopped with it. Drawn
   * without the shading it reads as a business falling off a cliff, and it was
   * read that way. What actually happened is that August was the best month of
   * the year, sixteen sales and EUR 6,167 through Stripe, while Google
   * recorded EUR 492 of it and September EUR 33 of EUR 4,386.
   *
   * "All money taken" is the one basis that survives, because Stripe knows
   * what it took whether or not anything was ever tied to an ad.
   */
  const attributing = revenueKnown && basis !== "all" && Boolean(lastAttributed);
  const pick = (t: typeof counted) =>
    basis === "ad" ? t.adRevenue : basis === "all" ? t.allRevenue : t.googleValue;
  const totalSpend = attributing ? counted.spend : counted.spend + excluded.spend;
  const totalRev = attributing ? pick(counted) : pick(counted) + pick(excluded);
  const overall = totalSpend > 0 ? totalRev / totalSpend : 0;
  const excludedSpend = excluded.spend;
  const blindBuckets = buckets.filter((b) => blindness(b) === "all");

  const cx = (i: number) => PAD.left + slot * i + slot / 2;

  /*
   * One definition of the ratio for the label, the dot and the line.
   *
   * There were three. The label divided by spend-less-blind on every basis,
   * the dot divided by the full spend unless the basis was "ad", and the line
   * used a third rule again. On Google's basis the dot and its own label
   * disagreed, which is the fastest way to lose a reader: if the one number
   * printed on the chart is not where the chart drew it, nothing else on it
   * is worth reading either.
   *
   * Null means there is no ratio to draw, which is not the same as nought.
   * A period where no payment could be attributed has no ratio; so does one
   * with no takings recorded at all. Drawing either as 0.0x is the mistake
   * this whole chart exists to stop, and it was doing it at the left-hand
   * edge, which is why the line ran into the corner of the plot.
   */
  const ratioOf = (b: RoasBucket): number | null => {
    if (blindness(b) === "all") return null;
    const spend = basis !== "all" ? b.spend - b.spendBlind : b.spend;
    if (spend <= 0) return null;
    /* No takings and no orders is an absence of evidence. A month with money
       through the till and none of it from an ad is a real nought and is
       drawn as one. */
    if (b.allRevenue <= 0 && b.orders <= 0) return null;
    /* Nor on a part period. The window starts on a date rather than the first
       of a month, so the earliest bucket is a fortnight of April sitting
       beside five whole months, and its ratio is not the same measurement.
       Drawn anyway it put an amber 0.0x at the left edge with the line diving
       into the floor beneath it, which is the first thing anybody saw. */
    if (b.partial) return null;
    return revenue(b) / spend;
  };

  /* Segments, not one polyline. A gap in the middle joined across it, which
     drew a straight line through a period we are saying nothing about. */
  const segments: string[] = [];
  {
    let run: string[] = [];
    buckets.forEach((b, i) => {
      const r = ratioOf(b);
      if (r === null) { if (run.length > 1) segments.push(run.join(" ")); run = []; return; }
      run.push(`${cx(i)},${ry(r)}`);
    });
    if (run.length > 1) segments.push(run.join(" "));
  }

  const activeIdx = hover ?? pinned;
  const shown = activeIdx !== null ? buckets[activeIdx] : null;

  /* Where Google and the till disagree, over the part of the window that can
     be attributed at all. This is the whole reason both are on screen. */
  const googleSaid = counted.googleValue;
  const tillSaid = counted.adRevenue;
  const gap = tillSaid - googleSaid;

  /*
   * Until React has hydrated, these buttons are painted and dead.
   *
   * Marketing takes a couple of seconds to become interactive, and the server
   * render puts a full set of toggles on screen the whole time. Anybody who
   * clicks in that window gets nothing at all and concludes the chart is
   * broken, which is exactly what happened: "the Google's own figure buttons
   * don't work, they just get stuck".
   *
   * They work. They were not listening yet. Saying so is one line and a
   * cursor, and is the difference between "slow" and "broken".
   */
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const toggle = (on: boolean) =>
    `min-h-[34px] rounded-md px-3 text-xs font-semibold transition-colors duration-150 ${
      on ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"
    } ${ready ? "" : "cursor-wait opacity-50"}`;

  return (
    <div>
      <style>{`
        .roas-bar { transition: y .35s cubic-bezier(.4,0,.2,1), height .35s cubic-bezier(.4,0,.2,1); }
        .roas-line { transition: d .35s cubic-bezier(.4,0,.2,1); }
        .roas-hit:focus-visible { outline: 2px solid #0f172a; outline-offset: -2px; }
        @media (prefers-reduced-motion: reduce) { .roas-bar, .roas-line { transition: none } }
      `}</style>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Time period">
          {(["day", "week", "month"] as Grain[]).map((g) => (
            <button key={g} type="button" disabled={!ready} onClick={() => { setGrain(g); setPinned(null); setHover(null); }}
              aria-pressed={grain === g} className={toggle(grain === g)}>
              {g === "day" ? "Daily" : g === "week" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="What counts as money back">
          {(Object.keys(BASIS) as Basis[])
            .filter((b) => revenueKnown || b === "google")
            .map((b) => (
              <button key={b} type="button" disabled={!ready} onClick={() => setBasis(b)} aria-pressed={basis === b}
                className={toggle(basis === b)}>
                {BASIS[b].label}
              </button>
            ))}
        </div>
        {capturedAt && (
          <p className="ml-auto text-xs text-slate-400">
            Recorded {new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(capturedAt))}
          </p>
        )}
      </div>

      <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs leading-relaxed text-slate-600">
        {BASIS[basis].blurb}
      </p>

      <dl className="grid grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
        {[
          { k: "Spent on ads", v: exact(totalSpend), sub: attributing ? `${counted.days} days up to ${lastAttributed}` : `${counted.days + excluded.days} days` },
          { k: `Money ${BASIS[basis].short}`, v: exact(totalRev), sub: basis === "google" ? "Google's own figure" : "real euro through Stripe" },
          {
            k: "Back per euro out",
            v: totalSpend > 0 ? `${overall.toFixed(2)}×` : "–",
            sub: overall >= 1 ? "more came in than went out" : "less came in than went out",
            tone: overall >= 1 ? "text-teal-700" : "text-amber-700",
          },
        ].map((c) => (
          <div key={c.k} className="bg-white px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c.k}</dt>
            <dd className={`mt-0.5 text-2xl font-bold tabular-nums ${c.tone ?? "text-slate-900"}`}>{c.v}</dd>
            <dd className="text-xs text-slate-500">{c.sub}</dd>
          </div>
        ))}
      </dl>

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          `Ad spend against ${BASIS[basis].label.toLowerCase()}, by ${grain}. ` +
          `${exact(totalSpend)} of advertising sits against ${exact(totalRev)}, ` +
          `which is ${overall.toFixed(2)} euro back for every euro out.` +
          (attributing && excluded.days ? ` A further ${exact(excludedSpend)} was spent in a period where nothing can be attributed, and is left out.` : "")
        }
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <pattern id={`${uid}-blind`} width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="#f8fafc" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#cbd5e1" strokeWidth="2" />
          </pattern>
          {/* Spend and return keep the hues they already had. The ramp is what
              separates the pair of columns in a bucket from the flat blocks
              they were, without adding a third colour to a chart that is
              already carrying two scales. */}
          <linearGradient id={`${uid}-spend`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0a32a" />
            <stop offset="100%" stopColor="#c2670a" />
          </linearGradient>
          <linearGradient id={`${uid}-rev`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#19a99b" />
            <stop offset="100%" stopColor="#0b7168" />
          </linearGradient>
          <filter id={`${uid}-lift`} x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* The run where the click id was not recorded, shaded rather than
            plotted as zero. The period it stopped in is shaded only across the
            part of itself that came after, so a month that is two thirds blind
            does not read as wholly excluded when it is still counted. */}
        {buckets.map((b, i) => {
          const state = blindness(b);
          if (state === "none") return null;
          const span = dayNum(b.end) - dayNum(b.start) + 1;
          const after = lastAttributed ? dayNum(b.end) - dayNum(lastAttributed) : span;
          const frac = state === "all" ? 1 : Math.max(0, Math.min(1, after / span));
          return (
            <rect key={`b-${b.key}`} x={PAD.left + slot * (i + 1 - frac)} y={PAD.top}
              width={slot * frac} height={stripTop + STRIP - PAD.top} fill={`url(#${uid}-blind)`}
              fillOpacity={state === "all" ? 1 : 0.55} pointerEvents="none" />
          );
        })}

        {view.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">{eur(t)}</text>
          </g>
        ))}

        {/* The strip. Its own floor, its own top, and the break-even rule,
            which is the only height on a ratio chart worth reading against:
            above it the advertising paid for itself and below it did not. */}
        <line x1={PAD.left} x2={WIDTH - PAD.right} y1={stripTop + STRIP} y2={stripTop + STRIP}
          stroke="#cbd5e1" strokeWidth="1" />
        <text x={PAD.left - 8} y={stripTop + STRIP + 4} textAnchor="end" fontSize="10.5" fill="#94a3b8">0×</text>
        <text x={PAD.left - 8} y={stripTop + 8} textAnchor="end" fontSize="10.5" fill="#0d9488">
          {view.rTop.toFixed(view.rTop < 10 ? 1 : 0)}×
        </text>
        {view.rTop > 1 && (
          <g>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={ry(1)} y2={ry(1)}
              stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
            <text x={WIDTH - PAD.right} y={ry(1) - 4} textAnchor="end" fontSize="9.5" fill="#64748b"
              stroke="#fff" strokeWidth="3" paintOrder="stroke">break even, 1× back</text>
          </g>
        )}

        {buckets.map((b, i) => {
          const rev = revenue(b);
          const blind = blindness(b) === "all";
          const centre = cx(i);
          const ratio = ratioOf(b);
          return (
            <g key={b.key}>
              <rect className="roas-hit" x={PAD.left + slot * i} y={PAD.top} width={slot}
                height={stripTop + STRIP - PAD.top}
                fill="transparent"
                stroke={activeIdx === i ? "#0f172a" : "transparent"} strokeWidth="1" strokeDasharray="3 3"
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={() => setPinned(pinned === i ? null : i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned(pinned === i ? null : i); } }}
                tabIndex={0} role="button"
                aria-label={
                  `${b.label}: spent ${exact(b.spend)}. ` +
                  (blind
                    ? "Nothing here can be tied back to an ad: no payment in this period carried a Google click id."
                    : ratio === null
                      ? `${exact(rev)} ${BASIS[basis].short}. Nothing was recorded through the till in this period, so there is no figure for euro back per euro out.`
                      : `${exact(rev)} ${BASIS[basis].short}, ${ratio.toFixed(2)} euro back per euro out.`) +
                  (b.partial ? " A part period so far." : "")
                }
              />
              <rect className="roas-bar" x={centre - barW - 1} y={y(b.spend)} width={barW}
                height={Math.max(0, PAD.top + plotH - y(b.spend))} rx="2"
                fill={`url(#${uid}-spend)`} fillOpacity={b.partial ? 0.5 : 1} pointerEvents="none"
                filter={activeIdx === i ? `url(#${uid}-lift)` : undefined} />
              {/* The top slice of the spend bar is money spent after the click
                  id stopped being written, drawn paler so it is visible that
                  it was really spent and still left out of the return. */}
              {basis !== "all" && b.spendBlind > 0 && b.spendBlind < b.spend && (
                <rect className="roas-bar" x={centre - barW - 1} y={y(b.spend)} width={barW}
                  height={Math.max(0, y(b.spend - b.spendBlind) - y(b.spend))} rx="2"
                  fill="#fde68a" stroke="#d97706" strokeWidth="1" pointerEvents="none" />
              )}
              {!blind && (
                <rect className="roas-bar" x={centre + 1} y={y(rev)} width={barW}
                  height={Math.max(0, PAD.top + plotH - y(rev))} rx="2"
                  fill={`url(#${uid}-rev)`} fillOpacity={b.partial ? 0.5 : 1} pointerEvents="none"
                  filter={activeIdx === i ? `url(#${uid}-lift)` : undefined} />
              )}
              {/* Where Google's figure sits against the real one, drawn on the
                  same bar so the disagreement is visible without a second
                  chart. */}
              {/* Only where there is a bar to mark. Drawn against a
                  zero-height bar it was a dash floating in clear space, which
                  reads as debris rather than as a comparison. */}
              {!blind && basis !== "google" && b.googleValue > 0 && rev > 0 && (
                <line x1={centre + 1} x2={centre + 1 + barW} y1={y(b.googleValue)} y2={y(b.googleValue)}
                  stroke="#1e293b" strokeWidth="2" strokeDasharray="3 2" pointerEvents="none" />
              )}
              {/* Only as many labels as will fit without touching. Twenty-four
                  weekly labels drawn in full overlapped into an unreadable
                  band, which is the first thing anyone notices. */}
              {(i % labelEvery === 0 || activeIdx === i) && (
                <text x={centre} y={height - 8} textAnchor="middle" fontSize="10.5"
                  fill={activeIdx === i ? "#0f172a" : "#64748b"} pointerEvents="none"
                  stroke="#fff" strokeWidth="3" paintOrder="stroke">
                  {b.label}
                </text>
              )}
              {ratio !== null && slot > 34 && (
                <text x={centre} y={Math.min(y(b.spend), y(rev)) - 7} textAnchor="middle" fontSize="10.5"
                  fontWeight="700" fill={ratio >= 1 ? "#0f766e" : "#b45309"} pointerEvents="none"
                  stroke="#fff" strokeWidth="3" paintOrder="stroke">
                  {ratio.toFixed(1)}×
                </text>
              )}
            </g>
          );
        })}

        {segments.map((pts) => (
          <polyline key={pts} className="roas-line" pathLength={1} points={pts} fill="none" stroke="#0d9488"
            strokeWidth="2" strokeDasharray="4 3" pointerEvents="none" />
        ))}
        {buckets.map((b, i) => {
          const r = ratioOf(b);
          return r === null ? null : (
            <circle key={`p-${b.key}`} cx={cx(i)} cy={ry(r)} r={activeIdx === i ? 5.5 : 3}
              fill="#0d9488" stroke="#fff" strokeWidth="1.5" pointerEvents="none" />
          );
        })}

        {/* Anchored to the right edge of the plot rather than to the start of
            the blind run, which ran the text off the chart whenever the run
            was short. */}
        {blindBuckets.length > 0 && (
          <text x={WIDTH - PAD.right} y={PAD.top - 9} textAnchor="end" fontSize="10.5" fontWeight="700"
            fill="#64748b" pointerEvents="none">
            no click id on any payment
          </text>
        )}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-600" />Ad spend</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />Money {BASIS[basis].short}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-teal-600" />Back per euro out</span>
        {basis !== "google" && (
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed border-slate-800" />What Google recorded</span>
        )}
      </div>

      {/* Reads as a caption when nothing is hovered, so the panel never blanks
          and never jumps in height when the pointer moves. */}
      <div className="min-h-[6rem] border-t border-slate-100 px-4 py-3 text-sm">
        {shown ? (
          <div>
            <p className="font-semibold text-slate-900">
              {shown.label}
              {shown.partial && <span className="font-normal text-slate-500"> · still running, so it reads low</span>}
              {pinned !== null && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">pinned, click again to release</span>}
            </p>
            {blindness(shown) === "all" ? (
              <p className="mt-1.5 text-slate-600">
                {exact(shown.spend)} spent, {int(shown.clicks)} clicks. Nothing here can be tied back to an ad:
                no payment since {lastAttributed} has carried a Google click id, so
                {shown.allRevenue > 0 ? ` the ${exact(shown.allRevenue)} taken in this period` : " any money taken"}
                {" "}cannot be credited to an ad whatever caused it. This is a blind gauge, not a bad period. Part of
                it never could be credited: a payment link made by hand in the Stripe dashboard carries no click id.
              </p>
            ) : (
              <dl className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                {[
                  ["Spent", shown.spendBlind > 0 && basis === "ad"
                    ? `${exact(shown.spend)}, ${exact(shown.spend - shown.spendBlind)} of it attributable`
                    : exact(shown.spend)],
                  [`Money ${BASIS[basis].short}`, exact(revenue(shown))],
                  ["Back per euro", (basis === "ad" ? shown.spend - shown.spendBlind : shown.spend) > 0
                    ? `${(revenue(shown) / (basis === "ad" ? shown.spend - shown.spendBlind : shown.spend)).toFixed(2)}×`
                    : "–"],
                  ["Enquiries", shown.conversions > 0 ? `${shown.conversions.toFixed(0)} from ${int(shown.clicks)} clicks` : `none from ${int(shown.clicks)} clicks`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ) : (
          <p className="text-slate-600">
            {siteLabel}. Hover or tap any column for its own figures. The number above each pair is what came back
            for every euro spent in that period.
            {buckets.some((b) => b.partial) &&
              " A period the window only partly covers is drawn paler and carries no figure, because a fortnight cannot be set against a whole month."}
            {attributing && excluded.days > 0 && ` The shaded run at the end is left out of the totals above: ${exact(excludedSpend)} was spent there and nothing can be attributed to it.`}
          </p>
        )}
      </div>

      {revenueKnown && basis !== "google" && Math.abs(gap) > 1 && (
        <p className="border-t border-slate-100 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900">
          <strong className="font-semibold">Google and the till disagree.</strong>{" "}
          Over the periods that can be attributed, Google recorded {exact(googleSaid)} against these ads while
          Stripe actually took {exact(tillSaid)} on checkouts carrying a click id, a difference
          of {exact(Math.abs(gap))} {gap > 0 ? "in reality's favour" : "in Google's favour"}. Google is counting
          placeholder values per conversion type rather than prices anyone paid, which is why its figure should not
          be used to decide budget.
        </p>
      )}
    </div>
  );
}
