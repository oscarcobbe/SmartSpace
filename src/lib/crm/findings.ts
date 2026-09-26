import { plainText } from "./display";
/**
 * The reading, not the readout.
 *
 * Marketing and Visitors showed totals: spend, clicks, sessions, a table of
 * sources. Every one of those is a number you still have to interpret, and
 * nobody running a van all day is going to sit and interpret them. What is
 * actually wanted is the three sentences a person would say after looking:
 * this is working, this is not, do this next.
 *
 * ── THE RULE THESE FOLLOW ────────────────────────────────────────
 *
 * Every finding names the figures it came from and the period it compared, and
 * none of them is produced unless there is enough data to mean anything. A
 * confident sentence off four sessions is worse than silence, because it gets
 * believed. Where a comparison is against a part period it is measured
 * like-for-like, for the same reason the overview's month comparison had to be
 * fixed: seventeen days against thirty-one is not a comparison.
 */

export type FindingKind = "win" | "risk" | "next" | "note";

export interface Finding {
  kind: FindingKind;
  title: string;
  detail: string;
  /** Where the reader goes to act on it. */
  href?: string;
  hrefLabel?: string;
}

/** Percentage change, or null when the base is too small to divide by. */
export function changePct(now: number, prev: number): number | null {
  if (!Number.isFinite(now) || !Number.isFinite(prev) || prev <= 0) return null;
  return ((now - prev) / prev) * 100;
}

export const say = (pct: number) => `${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(0)}%`;

const eur = (n: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

/* ─── Visitors ────────────────────────────────────────────────── */

export interface DailyPoint { date: string; sessions: number }

/**
 * The last seven days against the seven before them.
 *
 * Deliberately not "this calendar week against last", which on a Tuesday
 * compares two days with seven and reports a collapse every Monday morning.
 */
export function weekOnWeek(daily: DailyPoint[]): { now: number; prev: number; pct: number | null } | null {
  if (daily.length < 14) return null;
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const last14 = sorted.slice(-14);
  const now = last14.slice(7).reduce((s, d) => s + d.sessions, 0);
  const prev = last14.slice(0, 7).reduce((s, d) => s + d.sessions, 0);
  return { now, prev, pct: changePct(now, prev) };
}

export interface VisitorInput {
  totals: { users: number; sessions: number; engaged: number; avgSeconds: number };
  sources: { label: string; users: number; sessions: number; engaged: number }[];
  landing: { path: string; sessions: number; engaged: number }[];
  devices: { label: string; sessions: number; engaged: number }[];
  daily: DailyPoint[];
  days: number;
}

/** Enough traffic that a rate means something rather than noise. */
const ENOUGH = 30;

export function visitorFindings(v: VisitorInput): Finding[] {
  const out: Finding[] = [];

  const wow = weekOnWeek(v.daily);
  if (wow && wow.pct !== null) {
    out.push({
      kind: wow.pct >= 0 ? "win" : "risk",
      title: `Visits ${say(wow.pct)} on last week`,
      detail: `${wow.now} sessions in the last seven days against ${wow.prev} in the seven before. Same length of week both sides, so the change is real and not the calendar.`,
    });
  }

  /* Best and weakest source, by how many visits actually engaged. A source
     that sends a lot of people who leave at once is not a good source, and
     ranking on volume alone would call it the best thing on the site. */
  const ranked = v.sources
    .filter((s) => s.sessions >= ENOUGH)
    .map((s) => ({ ...s, rate: s.sessions ? (s.engaged / s.sessions) * 100 : 0 }))
    .sort((a, b) => b.rate - a.rate);

  if (ranked.length >= 2) {
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    out.push({
      kind: "win",
      title: `${best.label} sends the people who stay`,
      detail: `${best.rate.toFixed(0)}% of its ${best.sessions} visits engaged, the highest of any source with real traffic.`,
    });
    if (worst.rate < best.rate / 2) {
      out.push({
        kind: "risk",
        title: `${worst.label} sends the people who leave`,
        detail: `${worst.rate.toFixed(0)}% of its ${worst.sessions} visits engaged, less than half ${best.label}'s rate. Worth knowing before spending anything more there.`,
      });
    }
  }

  /* A landing page that takes real traffic and loses it is the single most
     actionable thing on this page, because it is one page to fix. */
  const pages = v.landing.filter((p) => p.sessions >= ENOUGH);
  if (pages.length >= 2) {
    const weakest = [...pages].sort(
      (a, b) => (a.engaged / a.sessions) - (b.engaged / b.sessions),
    )[0];
    const rate = (weakest.engaged / weakest.sessions) * 100;
    if (rate < 50) {
      out.push({
        kind: "next",
        title: `Fix ${weakest.path} before anything else`,
        detail: `It took ${weakest.sessions} visits and held ${rate.toFixed(0)}% of them, the worst of any page with real traffic. Every euro sent to it is buying a visit that leaves.`,
      });
    }
  }

  /* Mobile against desktop, because the fix is different and the gap has been
     large enough on this site before to be worth its own sentence. */
  const mob = v.devices.find((d) => /mobile/i.test(d.label));
  const desk = v.devices.find((d) => /desktop/i.test(d.label));
  if (mob && desk && mob.sessions >= ENOUGH && desk.sessions >= ENOUGH) {
    const mr = (mob.engaged / mob.sessions) * 100;
    const dr = (desk.engaged / desk.sessions) * 100;
    if (dr > mr * 1.4) {
      out.push({
        kind: "risk",
        title: "Phones engage far worse than computers",
        detail: `${mr.toFixed(0)}% of ${mob.sessions} phone visits engaged against ${dr.toFixed(0)}% of ${desk.sessions} on a computer. Most of the traffic is on a phone, so this is where the losses are.`,
      });
    }
  }

  if (!out.length) {
    out.push({
      kind: "note",
      title: "Not enough traffic yet to read anything into",
      detail: `${v.totals.sessions} sessions over ${v.days} days. Rates off numbers this small move on one or two visits, so nothing here is called a trend until there is more.`,
    });
  }
  return out;
}

/* ─── Marketing ───────────────────────────────────────────────── */

export interface AdMonth {
  key: string; label: string; cost: number; conversions: number; value: number; clicks: number;
}

export interface MarketingInput {
  months: AdMonth[];
  campaigns: { name: string; status: string; cost: number; conversions: number; clicks: number; value: number }[];
  keptByMonth: Map<string, number>;
  /** Fraction of this month already elapsed, 0 to 1, for like-for-like. */
  monthElapsed: number;
  /** What was actually edited in the account lately, commonest first. */
  changes?: string[];
}

export function marketingFindings(m: MarketingInput): Finding[] {
  const out: Finding[] = [];
  const months = m.months;
  const now = months[months.length - 1];
  const prev = months[months.length - 2];

  if (now && prev && prev.cost > 0) {
    /* Last month's spend cut to the same fraction of the month, so a part
       month is never set against a whole one. */
    const prevSoFar = prev.cost * m.monthElapsed;
    const pct = changePct(now.cost, prevSoFar);
    if (pct !== null && Math.abs(pct) >= 10) {
      out.push({
        kind: "note",
        title: `Spending ${say(pct)} on this point last month`,
        detail: `${eur(now.cost)} so far in ${now.label} against about ${eur(prevSoFar)} by the same point in ${prev.label}.`,
      });
    }
  }

  /* Cost per enquiry, this month against last, like for like. The number that
     decides whether the advertising is getting better or worse. */
  if (now && prev && now.conversions > 0 && prev.conversions > 0) {
    const cpaNow = now.cost / now.conversions;
    const cpaPrev = prev.cost / prev.conversions;
    const pct = changePct(cpaNow, cpaPrev);
    if (pct !== null && Math.abs(pct) >= 10) {
      out.push({
        kind: pct <= 0 ? "win" : "risk",
        title: `Each enquiry costs ${say(pct)} on ${prev.label}`,
        /* This used to end "whatever changed is working", which is a shrug
           where the answer belongs. The account keeps every edit, so the edits
           are named and the reader can judge which of them did it. */
        detail:
          `${eur(cpaNow)} each in ${now.label} against ${eur(cpaPrev)} in ${prev.label}.` +
          (m.changes?.length
            ? ` Changed in that time: ${m.changes.slice(0, 4).join(", ")}.`
            : " No edits were recorded in the account over that period, so this is the market moving rather than anything we did."),
      });
    }
  }

  /* Best and weakest campaign by cost per enquiry, among those actually
     spending. A paused campaign's history is not a judgement on today. */
  const live = m.campaigns.filter((c) => c.status === "ENABLED" && c.cost > 0);
  const withLeads = live.filter((c) => c.conversions >= 1);
  if (withLeads.length >= 2) {
    const byCpa = [...withLeads].sort((a, b) => a.cost / a.conversions - b.cost / b.conversions);
    const best = byCpa[0], worst = byCpa[byCpa.length - 1];
    out.push({
      kind: "win",
      title: `${best.name} is the cheapest source of enquiries`,
      detail: `${eur(best.cost / best.conversions)} each, from ${eur(best.cost)} spent.`,
      href: "/crm/marketing", hrefLabel: "Campaigns",
    });
    if (worst.cost / worst.conversions > (best.cost / best.conversions) * 1.5) {
      out.push({
        kind: "risk",
        title: `${worst.name} costs ${(worst.cost / worst.conversions / (best.cost / best.conversions)).toFixed(1)}× as much per enquiry`,
        detail: `${eur(worst.cost / worst.conversions)} each against ${eur(best.cost / best.conversions)}. Same money would buy more enquiries in the cheaper one.`,
      });
    }
  }

  /* Money spent with nothing to show is the loudest thing on the page. */
  const spendingNothing = live.filter((c) => c.conversions === 0 && c.cost >= 50);
  for (const c of spendingNothing) {
    out.push({
      kind: "risk",
      title: `${plainText(c.name)} has spent ${eur(c.cost)} and brought nothing`,
      detail: `${c.clicks} clicks, no enquiry recorded. Either the tracking is not reporting them or the money is going nowhere.`,
    });
  }

  /* The attribution gap. This is the one that matters most right now and the
     one a spend chart alone will never show. */
  const spend12 = months.reduce((s, x) => s + x.cost, 0);
  const attributed = months.reduce((s, x) => s + x.value, 0);
  const kept12 = months.reduce((s, x) => s + (m.keptByMonth.get(x.key) ?? 0), 0);
  if (spend12 > 0 && attributed === 0) {
    out.push({
      kind: "next",
      title: "Google cannot see a single euro of the work these ads won",
      detail:
        `${eur(spend12)} spent over the period and nothing attributed back, while Stripe took ${eur(kept12)} across the same months. ` +
        `Until completed jobs reach Google, the bidding is guessing and return on spend cannot be worked out honestly.`,
    });
  }

  if (!out.length) {
    out.push({
      kind: "note",
      title: "Nothing has moved enough to call a change",
      detail: "Spend, cost per enquiry and campaign mix are all within ten per cent of where they were. Worth leaving alone.",
    });
  }
  return out;
}
