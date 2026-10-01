"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { RoasMonth } from "@/lib/crm/roas-live";
import { scaleFor } from "./roas-scale";

/**
 * What the ads cost, and what came back from them. One chart, one meaning.
 *
 * ── WHAT IT SAYS ─────────────────────────────────────────────────
 *
 * Two bars a month, and how many times over written above them. Spend is
 * every ad channel's: Google's and ChatGPT's. Came back is the money from
 * customers an ad is known to have reached, solid, with an estimate in grey
 * for payments whose customer cannot be traced either way (roas-live.ts).
 * Which channel each euro belongs to is in the hover and in the table under
 * the chart, never a second set of bars.
 *
 * ── WHAT WAS HERE BEFORE, AND WHY IT IS GONE ─────────────────────
 *
 * In September it carried six encodings, and the person it is for said it
 * meant nothing; it was cut to two bars and a number. On 1 October he said
 * the cut version looked flat and unprofessional, and it was wrong as well:
 * SmartCare Living's installs were in Smart Space's bars. The data is fixed
 * where it is read. This keeps the two bars and the number and draws them
 * properly: bars no wider than 24px with a gap between them, rounded where
 * the data ends and square at the baseline, hairline gridlines, the multiple
 * as a label in ink on a tinted chip rather than coloured text, and the
 * working in a card beside the month rather than a paragraph under the chart.
 */
/* The drawing is laid out at the width it is shown at, so its text is the
   size it says. Scaled down from a fixed 760 it came out at five pixels on a
   phone. */
const DEFAULT_WIDTH = 760;
const HEIGHT = 300;
const PAD = { top: 46, right: 12, bottom: 34, left: 52 };
const BAR = 24;
const GAP = 2;

export const SPEND_COLOUR = "#dd6b0b";
export const BACK_COLOUR = "#0f9f6e";
export const ESTIMATE_COLOUR = "#cbd5e1";

const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const eurShort = (n: number) => (n >= 1000 ? `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `€${Math.round(n)}`);

/** A bar rounded at its top only, square where it meets the baseline. */
function topRounded(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

export interface ChartMonth extends RoasMonth {
  /** ChatGPT's spend that month. Google's is `spend`. */
  chatgptSpend: number;
}

const totalSpend = (m: ChartMonth) => m.spend + m.chatgptSpend;
const traced = (m: ChartMonth) => m.back + m.chatgptBack;
const cameBack = (m: ChartMonth) => traced(m) + m.estimated;
const multipleOf = (m: ChartMonth) => (totalSpend(m) > 0 ? cameBack(m) / totalSpend(m) : null);
const fmtMultiple = (r: number | null, estimated: boolean, dp = 1) =>
  r === null ? "None" : `${estimated ? "~" : ""}${r.toFixed(dp)}×`;

export default function RoasChart({ months, siteLabel, trailRead = true }: {
  months: ChartMonth[]; siteLabel: string; trailRead?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const active = hover ?? pinned;
  const shown = active !== null ? months[active] : null;
  const box = useRef<HTMLDivElement>(null);
  const [WIDTH, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setWidth(Math.max(320, Math.min(1100, Math.round(el.clientWidth))));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = WIDTH < 560;

  const spend = months.reduce((t, m) => t + totalSpend(m), 0);
  const googleSpend = months.reduce((t, m) => t + m.spend, 0);
  const chatgptSpend = months.reduce((t, m) => t + m.chatgptSpend, 0);
  const tracedAll = months.reduce((t, m) => t + traced(m), 0);
  const estimated = months.reduce((t, m) => t + m.estimated, 0);
  const back = tracedAll + estimated;
  const multiple = spend > 0 ? back / spend : null;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const peak = Math.max(1, ...months.map((m) => Math.max(totalSpend(m), cameBack(m))));
  const scale = scaleFor(peak, 0);
  const y = (v: number) => PAD.top + plotH - (v / scale.top) * plotH;
  const h = (v: number) => (v / scale.top) * plotH;
  const slot = plotW / Math.max(1, months.length);
  const barW = Math.max(8, Math.min(BAR, (slot - 16) / 2));
  const cx = (i: number) => PAD.left + slot * i + slot / 2;
  const base = PAD.top + plotH;
  /* "Sept" under the bar, unless the months cross a new year. */
  const oneYear = new Set(months.map((m) => m.key.slice(0, 4))).size <= 1;

  return (
    <div>
      <dl className="grid grid-cols-1 border-b border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
        <div className="px-5 py-4">
          <dt className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">Spent on ads</dt>
          <dd className="mt-1 text-[30px] font-bold leading-tight tracking-tight text-slate-900">{eur(spend)}</dd>
          <dd className="mt-0.5 text-xs text-slate-500">
            Google {eur(googleSpend)} · ChatGPT {eur(chatgptSpend)}
          </dd>
        </div>
        <div className="border-t border-slate-200 px-5 py-4 sm:border-t-0">
          <dt className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">Came back from ads</dt>
          <dd className="mt-1 text-[30px] font-bold leading-tight tracking-tight text-slate-900">
            {estimated > 0 ? "~" : ""}{eur(back)}
          </dd>
          <dd className="mt-0.5 text-xs text-slate-500">
            {eur(tracedAll)} traced to an ad{estimated > 0 ? `, about ${eur(estimated)} estimated` : ""}
          </dd>
        </div>
        <div className="border-t border-slate-200 px-5 py-4 sm:border-t-0">
          <dt className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">Back for every €1 spent</dt>
          <dd className="mt-1 text-[30px] font-bold leading-tight tracking-tight text-slate-900">
            {multiple === null ? "No spend" : fmtMultiple(multiple, estimated > 0, 2)}
          </dd>
          {multiple !== null && (
            <dd className="mt-1">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                multiple >= 1 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                <span aria-hidden="true">{multiple >= 1 ? "▲" : "▼"}</span>
                {multiple >= 1 ? "More came in than went out" : "Less came in than went out"}
              </span>
            </dd>
          )}
        </div>
      </dl>

      <div ref={box} className="relative pt-2">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img"
          aria-label={`${siteLabel}: what the ads cost against what came back, by month. ${eur(spend)} spent, about ${eur(back)} back${multiple === null ? "." : `, ${multiple.toFixed(2)} euro for every euro spent.`}`}
          onMouseLeave={() => setHover(null)}>
          <style>{`.${uid}-b{transform-box:fill-box;transform-origin:bottom;animation:${uid}-g .55s cubic-bezier(.2,.7,.2,1) both}
@keyframes ${uid}-g{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@media(prefers-reduced-motion:reduce){.${uid}-b{animation:none}}`}</style>

          {scale.ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cbd5e1" : "#eef2f6"} strokeWidth="1" />
              <text x={PAD.left - 10} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b" style={{ fontVariantNumeric: "tabular-nums" }}>
                {eurShort(t)}
              </text>
            </g>
          ))}

          {months.map((m, i) => {
            const on = active === i;
            const s = totalSpend(m);
            const solid = traced(m);
            const r = multipleOf(m);
            const sx = cx(i) - barW - GAP / 2;
            const bx = cx(i) + GAP / 2;
            const solidH = h(solid);
            const estH = h(m.estimated);
            /* A 2px gap in the surface colour between the traced money and
               the estimate on top of it, so the two read as two parts. */
            const estY = base - solidH - (solidH > 0 && estH > 0 ? GAP : 0) - estH;
            const top = Math.min(y(s), estH > 0 ? estY : base - solidH);
            const chipW = Math.max(30, Math.min(46, slot - 4));
            const delay = { animationDelay: `${i * 40}ms` };
            return (
              <g key={m.key} opacity={active === null || on ? 1 : 0.55} style={{ transition: "opacity .15s" }}>
                <rect x={PAD.left + slot * i} y={PAD.top - 40} width={slot} height={plotH + 40}
                  fill={on ? "#f8fafc" : "transparent"}
                  onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  onClick={() => setPinned(pinned === i ? null : i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned(pinned === i ? null : i); } }}
                  tabIndex={0} role="button"
                  aria-label={`${m.label}${m.partial ? ", so far" : ""}: ${eur(s)} spent, ${eur(solid)} traced back${m.estimated > 0 ? ` and about ${eur(m.estimated)} estimated` : ""}${r === null ? "" : `, ${r.toFixed(2)} back per euro`}.`} />

                {s > 0 && <path className={`${uid}-b`} style={delay} d={topRounded(sx, y(s), barW, h(s))} fill={SPEND_COLOUR} pointerEvents="none" />}
                {solidH > 0 && (
                  <path className={`${uid}-b`} style={delay} d={estH > 0 ? `M${bx},${base} L${bx},${base - solidH} L${bx + barW},${base - solidH} L${bx + barW},${base} Z` : topRounded(bx, base - solidH, barW, solidH)}
                    fill={BACK_COLOUR} pointerEvents="none" />
                )}
                {estH > 0 && <path className={`${uid}-b`} style={delay} d={topRounded(bx, estY, barW, estH)} fill={ESTIMATE_COLOUR} pointerEvents="none" />}

                {r !== null && (
                  <g pointerEvents="none">
                    <rect x={cx(i) - chipW / 2} y={top - 26} width={chipW} height={19} rx={9.5}
                      fill={r >= 1 ? "#ecfdf5" : "#fffbeb"} />
                    <text x={cx(i)} y={top - 12.5} textAnchor="middle" fontSize={narrow ? 10 : 11.5} fontWeight="700"
                      fill={r >= 1 ? "#065f46" : "#92400e"}>
                      {fmtMultiple(r, m.estimated > 0)}
                    </text>
                  </g>
                )}

                <text x={cx(i)} y={HEIGHT - 12} textAnchor="middle" fontSize={narrow ? 10.5 : 11.5}
                  fill={on ? "#0f172a" : "#64748b"} fontWeight={on ? 600 : 400} pointerEvents="none">
                  {oneYear || narrow ? m.label.replace(/ \d{4}$/, "") : m.label}{m.partial && !narrow ? " · so far" : m.partial ? "*" : ""}
                </text>
              </g>
            );
          })}
        </svg>

        {shown && (
          <div className="pointer-events-none absolute top-2 z-10 w-[17rem] max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-lg backdrop-blur"
               style={{ left: narrow ? "50%" : `clamp(9rem, ${((cx(active!) / WIDTH) * 100).toFixed(2)}%, calc(100% - 9rem))` }}>
            <p className="text-sm font-semibold text-slate-900">
              {shown.label}{shown.partial && <span className="font-normal text-slate-500"> · so far</span>}
            </p>
            <dl className="mt-2 space-y-1">
              {([
                [SPEND_COLOUR, "Spent", eur(totalSpend(shown)), shown.chatgptSpend > 0 ? `Google ${eur(shown.spend)}, ChatGPT ${eur(shown.chatgptSpend)}` : null],
                [BACK_COLOUR, "Traced to an ad", eur(traced(shown)), shown.chatgptBack > 0 ? `${eur(shown.chatgptBack)} of it from ChatGPT ads` : null],
                [ESTIMATE_COLOUR, "Estimated", shown.estimated > 0 ? `~${eur(shown.estimated)}` : "none", null],
              ] as [string, string, string, string | null][]).map(([c, k, v, sub]) => (
                <div key={k}>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} aria-hidden="true" />{k}
                    </dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{v}</dd>
                  </div>
                  {sub && <p className="pl-4 text-[11px] text-slate-500">{sub}</p>}
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1">
                <dt className="text-slate-600">Back per €1</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{fmtMultiple(multipleOf(shown), shown.estimated > 0, 2)}</dd>
              </div>
            </dl>
            <p className="mt-2 leading-snug text-slate-500">
              {eur(shown.taken)} taken in all.
              {shown.notFromAds > 0 && ` ${eur(shown.notFromAds)} from customers who found you another way.`}
              {shown.unseen > 0
                ? ` ${eur(shown.unseen)} could not be traced; the grey counts ${Math.round(shown.share * 100)}% of it, the share of traceable customers who came through an ad over the three months to here.`
                : " Every customer could be traced, so nothing is estimated."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 pb-3 pt-1 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: SPEND_COLOUR }} />Spent on ads</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: BACK_COLOUR }} />Came back, traced to an ad</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: ESTIMATE_COLOUR }} />Came back, estimated</span>
        <span className="text-slate-400">Hover or tap a month for the working.{narrow && months.some((m) => m.partial) ? " * so far this month." : ""}</span>
      </div>
      {!trailRead && (
        <p className="px-5 pb-3 text-xs text-amber-700">
          The enquiry record could not be read just now, so every payment without a click on it is estimated.
        </p>
      )}

      <details className="group border-t border-slate-100">
        <summary className="cursor-pointer list-none px-5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <span className="group-open:hidden">Show month by month as a table</span>
          <span className="hidden group-open:inline">Hide the table</span>
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-y border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-5 py-2 font-semibold">Month</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Spent</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Traced back</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Estimated</th>
                <th scope="col" className="px-5 py-2 text-right font-semibold">Back per €1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.slice().reverse().map((m) => (
                <tr key={m.key}>
                  <td className="px-5 py-2 text-slate-900">{m.label}{m.partial ? ", so far" : ""}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">{eur(totalSpend(m))}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">{eur(traced(m))}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">{m.estimated > 0 ? `~${eur(m.estimated)}` : "none"}</td>
                  <td className="px-5 py-2 text-right font-semibold tabular-nums text-slate-900">{fmtMultiple(multipleOf(m), m.estimated > 0, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
