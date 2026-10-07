/**
 * What Google Ads made of each of one customer's enquiries, read live.
 *
 * The rules are in ad-outcome.ts; this gathers what they need:
 *
 *   Google's lead conversions per Dublin day, by the day each happened
 *   (metrics.all_conversions_by_conversion_date), on the same lead actions
 *   the FourWinds lead check compares against (fourwinds-portal
 *   scripts/lib/lead-sites.mjs). A change there belongs here too.
 *
 *   Per day, how many enquiries came from an ad with a yes to ad cookies.
 *   SmartCare Living's from its sheet, which holds every enquiry and its
 *   answer. Smart Space's from crm_leads, with the answer from
 *   crm_ad_consent, matched by the same hashes the site wrote it under.
 *
 * Every read can fail on its own. A failed Google read makes the ad-and-yes
 * enquiries "could not be checked", never "not counted"; a failed count of
 * the day's enquiries does the same, because a shortfall measured against a
 * number we do not have is not a shortfall.
 */
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { search, ADS_ACCOUNT } from "./google-ads";
import { crm, type Site } from "./db";
import { readVisit, type Came } from "./how-they-came";
import { sclEnquiriesShared } from "./leads-scl";
import { adOutcome, type AdFacts, type AdOutcome, type CookieAnswer, type DayTally, type SiteRules } from "./ad-outcome";
import type { LeadRow } from "./contacts";
import type { Lead } from "./leads";

/** The primary website lead actions, as fourwinds-portal scripts/lib/lead-sites.mjs has them. */
const LEAD_ACTIONS: Record<Site, string[]> = {
  smartcareliving: [
    "7760468050", // SCL - Quiz complete
    "7760345708", // SCL - Contact form submitted
    "7760345702", // SCL - Consultation booked
    "7760345705", // SCL - Callback requested
    "7798489829", // SCL - Lead (server upload): consented ad leads the browser missed
  ],
  "smart-space": [
    "7571329372", // SS- Contact us form submitted
    "7572518849", // SS- Onsite consultation booked
  ],
};

/*
 * The first day each site's records carry the cookie answer. SmartCare
 * Living's sheet Notes from 23 September (Lelia's row on the 22nd has none,
 * Ciara's on the 23rd has "ads: granted"). Smart Space's crm_ad_consent from
 * 22 September (src/lib/ad-consent.ts).
 */
const RULES: Record<Site, SiteRules> = {
  smartcareliving: { consentFrom: "2026-09-23", resends: true },
  "smart-space": { consentFrom: "2026-09-22", resends: false },
};

/* Sources staff type in by hand from a call; the site never wrote them. */
const TYPED_IN = new Set(["phone", "voicemail", "manual", "walk_in", "referral", "other"]);

const WINDOW_DAYS = 120;

function dublinWall(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}
const todayDublin = () => dublinWall(new Date().toISOString()).slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/** Google's lead conversions per day, or null when Google did not answer. */
async function googleByDay(site: Site): Promise<Map<string, number> | null> {
  try {
    const rows = await unstable_cache(
      async () => {
        const ids = new Set(LEAD_ACTIONS[site]);
        const res = await search(
          ADS_ACCOUNT[site],
          `SELECT segments.conversion_action, segments.date, metrics.all_conversions_by_conversion_date
             FROM customer WHERE segments.date BETWEEN '${daysAgo(WINDOW_DAYS)}' AND '${daysAgo(0)}'`,
        );
        const out: [string, number][] = [];
        for (const r of res as Record<string, Record<string, unknown>>[]) {
          const id = String(r.segments?.conversionAction ?? "").split("/").pop() ?? "";
          if (!ids.has(id)) continue;
          out.push([String(r.segments?.date ?? ""), Number(r.metrics?.allConversionsByConversionDate ?? 0)]);
        }
        return out;
      },
      ["crm-ad-outcome-google", site, "v1"],
      { revalidate: 600, tags: ["crm-leads", `crm-leads:${site}`] },
    )();
    const byDay = new Map<string, number>();
    for (const [d, n] of rows) byDay.set(d, (byDay.get(d) ?? 0) + n);
    return byDay;
  } catch (err) {
    console.error("[ad-outcome] Google Ads:", err instanceof Error ? err.message : err);
    return null;
  }
}

const hashEmail = (e: string | null | undefined) => {
  const v = (e ?? "").trim().toLowerCase();
  return v ? createHash("sha256").update(v).digest("hex") : null;
};
const hashPhone = (p: string | null | undefined) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.length >= 9 ? createHash("sha256").update(d.slice(-9)).digest("hex") : null;
};

interface ConsentRow { email_hash: string | null; phone_hash: string | null; decision: "granted" | "denied"; decided_at: string }

/**
 * Smart Space: the banner answer given by the time of this enquiry, matched
 * by the person's email or phone. The latest answer up to an hour after the
 * enquiry, because the site writes it as the form is sent.
 */
function answerFor(rows: ConsentRow[], email: string | null, phone: string | null, at: string): CookieAnswer {
  const e = hashEmail(email), p = hashPhone(phone);
  const limit = Date.parse(at) + 3_600_000;
  const mine = rows
    .filter((r) => (e && r.email_hash === e) || (p && r.phone_hash === p))
    .filter((r) => Date.parse(r.decided_at) <= limit)
    .sort((a, b) => b.decided_at.localeCompare(a.decided_at));
  return mine[0]?.decision ?? null;
}

/** One CRM lead row's facts. consent is read by the caller for Smart Space. */
function crmFacts(site: Site, l: LeadRow, consent: CookieAnswer): AdFacts {
  const at = dublinWall(l.created_at);
  if (l.stripe_session_id || l.source === "paid_order") return { at, came: "unknown", consent, kind: "order" };
  if (TYPED_IN.has(String(l.source ?? ""))) return { at, came: "unknown", consent, kind: "typed-in" };
  const c = (l.custom ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const came: Came = readVisit({
    at, gclid: l.gclid ?? "", gbraid: s(c.gbraid), wbraid: s(c.wbraid), oppref: s(c.oppref),
    referrer: l.referrer ?? "", utmSource: l.utm_source ?? "", utmMedium: l.utm_medium ?? "",
  }, site);
  return { at, came, consent, kind: "form" };
}

/** SmartCare Living's CRM copy keeps "granted", "denied" and "unset" apart. */
function sclCrmAnswer(l: LeadRow): CookieAnswer {
  const v = String((l.custom as Record<string, unknown> | null)?.consent_state ?? "").toLowerCase();
  return v === "granted" ? "granted" : v === "denied" ? "denied" : v === "unset" ? "unset" : null;
}

/**
 * Per day, how many enquiries came from an ad with a yes to ad cookies.
 * Null when the records could not be read.
 */
async function consentedAdByDay(site: Site, consentRows: ConsentRow[] | null): Promise<Map<string, number> | null> {
  const byDay = new Map<string, number>();
  const add = (at: string) => byDay.set(at.slice(0, 10), (byDay.get(at.slice(0, 10)) ?? 0) + 1);
  if (site === "smartcareliving") {
    const read = await sclEnquiriesShared();
    if (!read.ok) return null;
    for (const e of read.rows) {
      if (e.cookie === "granted" && readVisit(e, site) === "ad") add(e.at);
    }
    return byDay;
  }
  if (!consentRows) return null;
  try {
    const rows = await crm<(LeadRow & { crm_contacts: { email: string | null; phone: string | null } | null })[]>(
      `crm_leads?site=eq.smart-space&created_at=gte.${daysAgo(WINDOW_DAYS)}&stripe_session_id=is.null` +
      `&select=*,crm_contacts(email,phone)&limit=2000`,
    );
    if (!rows) return null;
    for (const l of rows) {
      const answer = answerFor(consentRows, l.crm_contacts?.email ?? null, l.crm_contacts?.phone ?? null, l.created_at);
      const f = crmFacts(site, l, answer);
      if (f.kind === "form" && f.came === "ad" && f.consent === "granted") add(f.at);
    }
    return byDay;
  } catch (err) {
    console.error("[ad-outcome] Smart Space enquiries:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function readConsent(): Promise<ConsentRow[] | null> {
  try {
    return (await crm<ConsentRow[]>(
      `crm_ad_consent?site=eq.smart-space&select=email_hash,phone_hash,decision,decided_at&limit=5000`,
    )) ?? null;
  } catch (err) {
    console.error("[ad-outcome] crm_ad_consent:", err instanceof Error ? err.message : err);
    return null;
  }
}

export interface PersonAdOutcomes {
  /** By crm_leads id. */
  leads: Map<string, AdOutcome>;
  /** By position in person.feed. */
  feed: Map<number, AdOutcome>;
}

/**
 * Every enquiry of one customer, judged. Only reads Google and the day counts
 * when the customer has an ad enquiry with a yes, which most do not.
 */
export async function adOutcomesFor(
  site: Site,
  person: { email: string | null; phone: string | null; leads: LeadRow[]; feed: Lead[] },
): Promise<PersonAdOutcomes> {
  const consentRows = site === "smart-space" ? await readConsent() : null;

  const feedFacts: [number, AdFacts][] = person.feed.flatMap((f, i): [number, AdFacts][] => (f.ad ? [[i, f.ad]] : []));

  const leadFacts = person.leads.map((l) => {
    if (site !== "smartcareliving") {
      const answer = consentRows ? answerFor(consentRows, person.email, person.phone, l.created_at) : null;
      return [l.id, crmFacts(site, l, answer)] as const;
    }
    /*
     * SmartCare Living's CRM copy carries the click id but not the landing
     * page, the referrer or an iPhone click, so on its own it reads most
     * enquiries as "not known". The sheet row written by the same submission
     * has them. The CRM's answer is kept, because it tells a No from no answer
     * where the sheet cannot.
     */
    const own = crmFacts(site, l, sclCrmAnswer(l));
    if (own.kind !== "form") return [l.id, own] as const;
    const t = Date.parse(own.at.replace(" ", "T") + ":00Z");
    const twin = feedFacts.map(([, f]) => f).find((f) => Math.abs(Date.parse(f.at.replace(" ", "T") + ":00Z") - t) <= 10 * 60_000);
    if (!twin) return [l.id, own] as const;
    const came: Came = own.came === "ad" || twin.came === "ad" ? "ad" : twin.came;
    return [l.id, { ...own, came, consent: own.consent ?? twin.consent }] as const;
  });

  /* And the other way: the sheet row's "no yes" becomes the CRM copy's No or
     no answer, so one enquiry does not read two ways on the same page. */
  const at = (f: AdFacts) => Date.parse(f.at.replace(" ", "T") + ":00Z");
  for (const pair of feedFacts) {
    const f = pair[1];
    if (site !== "smartcareliving" || f.consent !== "no-or-none") continue;
    const twin = leadFacts.map(([, x]) => x).find((x) => x.kind === "form" && Math.abs(at(x) - at(f)) <= 10 * 60_000);
    if (twin?.consent === "denied" || twin?.consent === "unset") pair[1] = { ...f, consent: twin.consent };
  }

  const needsGoogle = [...leadFacts, ...feedFacts].some(([, f]) => f.kind === "form" && f.came === "ad" && f.consent === "granted");
  const [google, needed] = needsGoogle
    ? await Promise.all([googleByDay(site), consentedAdByDay(site, consentRows)])
    : [null, null];

  const today = todayDublin();
  const judge = (f: AdFacts) => {
    const d = f.at.slice(0, 10);
    /* At least this enquiry itself, should a count miss it (a sheet row the
       CRM holds and the sheet read did not yet). */
    const tally: DayTally | null = google && needed
      ? { needed: Math.max(needed.get(d) ?? 0, 1), recorded: google.get(d) ?? 0 }
      : null;
    return adOutcome(f, tally, today, RULES[site]);
  };

  const out: PersonAdOutcomes = { leads: new Map(), feed: new Map() };
  for (const [id, f] of leadFacts) { const o = judge(f); if (o) out.leads.set(id, o); }
  for (const [i, f] of feedFacts) { const o = judge(f); if (o) out.feed.set(i, o); }
  return out;
}
