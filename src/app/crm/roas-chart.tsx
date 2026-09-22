"use client";

import { useId, useState } from "react";
import type { RoasMonth } from "@/lib/crm/roas-live";
import { scaleFor } from "./roas-scale";

/**
 * What the ads cost, and what came back from them. One chart, one meaning.
 *
 * ── WHAT WAS HERE BEFORE, AND WHY IT IS GONE ─────────────────────
 *
 * Six encodings on one plot: two bars, a rate line with an area under it on a
 * second axis, a dashed mark for Google's own figure, hatching for the months
 * where attribution had broken, a paler slice stacked on one spend bar for the
 * money spent after the click id stopped, and pale bars for part periods. Plus
 * a break-even line and a three-way toggle over what "back" meant. The person
 * it was for looked at it and said it meant nothing, and he was right. Every
 * one of those was added to be honest about an edge, and together they buried
 * the one sentence the chart exists to say.
 *
 * This is two bars a month and a number written over them. Spend, money back
 * from an ad, and how many times over. The edges go in the hover text, where
 * they belong.
 *
 * The back bar has two shades, because the owner asked for exactly that:
 * solid for money from customers an ad is known to have reached, read from
 * the payment or from the customer's own enquiry; grey on top for the money
 * whose customer cannot be traced either way, estimated. Without the grey, September read 0.0x and
 * looked like the ads had stopped working; with every euro counted instead, it
 * would have read about 13x and credited organic search to the ads. The grey is
 * the honest middle, worked out in src/lib/crm/roas-live.ts.
 */
const WIDTH = 760;
const HEIGHT = 250;
const PAD = { top: 34, right: 16, bottom: 32, left: 56 };

const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const eurShort = (n: number) => (n >= 1000 ? `€${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `€${Math.round(n)}`);

const GREY = "#cbd5e1";

export default function RoasChart({
  months, spend, back, estimated = 0, trailRead = true, siteLabel,
}: { months: RoasMonth[]; spend: number; back: number; estimated?: number; trailRead?: boolean; siteLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");
  const active = hover ?? pinned;
  const shown = active !== null ? months[active] : null;

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const peak = Math.max(1, ...months.map((m) => Math.max(m.spend, m.back + m.estimated)));
  const scale = scaleFor(peak, 0);
  const y = (v: number) => PAD.top + plotH - (v / scale.top) * plotH;
  const slot = plotW / Math.max(1, months.length);
  const barW = Math.max(6, Math.min(30, slot * 0.34));
  const cx = (i: number) => PAD.left + slot * i + slot / 2;
  const total = back + estimated;
  const multiple = spend > 0 ? total / spend : null;

  /* Traced plus estimated, over spend. Written with a "~" whenever any of it is
     the estimate, so a figure that is partly a guess never reads as a count. */
  const ratioOf = (m: RoasMonth) => (m.spend > 0 ? (m.back + m.estimated) / m.spend : null);
  const fmtRatio = (m: RoasMonth, dp = 1) => {
    const r = ratioOf(m);
    return r === null ? "–" : `${m.estimated > 0 ? "~" : ""}${r.toFixed(dp)}×`;
  };

  return (
    <div>
      <dl className="grid grid-cols-1 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-3">
        {[
          { k: "Spent on ads", v: eur(spend), sub: `${months[0]?.label ?? ""} to ${months[months.length - 1]?.label ?? ""}` },
          { k: "Back from ads", v: estimated > 0 ? `~${eur(total)}` : eur(total),
            sub: estimated > 0 ? `${eur(back)} traced, ${eur(estimated)} estimated` : "real euro through Stripe, tied to an ad click" },
          {
            k: "Back per euro out",
            v: multiple === null ? "–" : `${estimated > 0 ? "~" : ""}${multiple.toFixed(2)}×`,
            sub: multiple === null ? "" : multiple >= 1 ? "more came in than went out" : "less came in than went out",
            tone: multiple !== null && multiple >= 1 ? "text-teal-700" : "text-amber-700",
          },
        ].map((c) => (
          <div key={c.k} className="bg-white px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{c.k}</dt>
            <dd className={`mt-0.5 text-2xl font-bold tabular-nums ${c.tone ?? "text-slate-900"}`}>{c.v}</dd>
            <dd className="text-xs text-slate-500">{c.sub}</dd>
          </div>
        ))}
      </dl>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img"
        aria-label={`Ad spend against money back from ads, by month. ${eur(spend)} spent, ${eur(back)} traced back and about ${eur(estimated)} more estimated, ${multiple === null ? "" : `about ${multiple.toFixed(2)} euro back for every euro out.`}`}
        onMouseLeave={() => setHover(null)}>
        <style>{`.${uid}-bar{transition:y .3s cubic-bezier(.4,0,.2,1),height .3s cubic-bezier(.4,0,.2,1)} @media(prefers-reduced-motion:reduce){.${uid}-bar{transition:none}}`}</style>

        {scale.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">{eurShort(t)}</text>
          </g>
        ))}

        {months.map((m, i) => {
          const r = ratioOf(m);
          const on = active === i;
          const top = Math.min(y(m.spend), y(m.back + m.estimated));
          /* The grey sits on the solid, so the rounded corners belong to
             whichever of the two is on top. */
          const greyOnTop = m.estimated > 0;
          return (
            <g key={m.key}>
              <rect x={PAD.left + slot * i} y={PAD.top - 6} width={slot} height={plotH + 6}
                fill={on ? "#f8fafc" : "transparent"}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                onClick={() => setPinned(pinned === i ? null : i)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPinned(pinned === i ? null : i); } }}
                tabIndex={0} role="button"
                aria-label={`${m.label}${m.partial ? ", so far" : ""}: ${eur(m.spend)} spent, ${eur(m.back)} traced back from ads${m.estimated > 0 ? ` and about ${eur(m.estimated)} more estimated` : ""}${r === null ? "" : `, ${fmtRatio(m, 2)} back per euro`}.`} />

              <rect className={`${uid}-bar`} x={cx(i) - barW - 2} y={y(m.spend)} width={barW}
                height={Math.max(0, PAD.top + plotH - y(m.spend))} rx="3" fill="#d97706" pointerEvents="none" />
              <rect className={`${uid}-bar`} x={cx(i) + 2} y={y(m.back)} width={barW}
                height={Math.max(0, PAD.top + plotH - y(m.back))} rx={greyOnTop ? 0 : 3} fill="#0d9488" pointerEvents="none" />
              {greyOnTop && (
                <rect className={`${uid}-bar`} x={cx(i) + 2} y={y(m.back + m.estimated)} width={barW}
                  height={Math.max(0, y(m.back) - y(m.back + m.estimated))} rx="3" fill={GREY} pointerEvents="none" />
              )}

              {/* The one number. Written, not plotted on a second axis. */}
              {r !== null && (
                <text x={cx(i)} y={top - 8} textAnchor="middle" fontSize="12" fontWeight="700"
                  fill={r >= 1 ? "#0f766e" : "#b45309"} pointerEvents="none">
                  {fmtRatio(m)}
                </text>
              )}

              <text x={cx(i)} y={HEIGHT - 10} textAnchor="middle" fontSize="11"
                fill={on ? "#0f172a" : "#64748b"} pointerEvents="none">
                {m.label}{m.partial ? " · so far" : ""}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-600" />Spent on ads</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />Traced to an ad</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GREY }} />Probably from ads, estimated</span>
      </div>

      <div className="min-h-[4.5rem] border-t border-slate-100 px-4 py-3 text-sm">
        {shown ? (
          <div>
            <p className="font-semibold text-slate-900">
              {shown.label}
              {shown.partial && <span className="font-normal text-slate-500"> · still running</span>}
              {pinned !== null && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">pinned, click again to release</span>}
            </p>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
              {[
                ["Spent", eur(shown.spend)],
                ["Traced to an ad", shown.back > 0 ? eur(shown.back) : "none"],
                ["Estimated, grey", shown.estimated > 0 ? `~${eur(shown.estimated)}` : "none"],
                ["Back per euro", fmtRatio(shown, 2)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
                  <dd className="font-semibold tabular-nums text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-1.5 text-xs text-slate-500">
              {eur(shown.taken)} taken in all.{" "}
              {shown.backViaEnquiry > 0 &&
                `${eur(shown.backViaEnquiry)} of the traced money was paid by link or invoice and traced through the customer's own enquiry. `}
              {shown.notFromAds > 0 &&
                `${eur(shown.notFromAds)} came from customers who found you another way: search, a referral, a business card or typing the address in. `}
              {shown.unseen > 0
                ? `${eur(shown.unseen)} could not be traced either way. The grey counts ${Math.round(shown.share * 100)}% of it, the share of traceable customers who came through an ad over the three months to here.`
                : "Every customer this month could be traced, so nothing is estimated."}
            </p>
          </div>
        ) : (
          <p className="text-slate-600">
            {siteLabel}. Green is money from customers an ad reached before they paid, read from the payment or from
            the customer&apos;s own enquiry. Grey is an estimate for payments whose customer cannot be traced either
            way. Hover a month to see the working.
            {!trailRead && " The enquiry log could not be read just now, so every payment without a click id is estimated."}
          </p>
        )}
      </div>
    </div>
  );
}
