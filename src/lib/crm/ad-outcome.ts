/**
 * Whether Google Ads counted an enquiry, and if not, why, in words.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * Google showed two or three conversions a week while the sheet held more ad
 * enquiries than that, and every time somebody had to work out by hand which
 * were missing and why: Carie and Joan said no to ad cookies, Louise and Lelia
 * came before the site wrote the answer down, Ciara said yes and Google still
 * has nothing. Oscar asked, 6 October 2026, for the CRM to say that itself on
 * each enquiry, so nobody has to reconcile it again.
 *
 * ── WHAT IT CAN AND CANNOT KNOW ──────────────────────────────────
 *
 * Google never says which enquiry a conversion was. It says how many it
 * recorded on a day, per action. So "counted" means: on that Dublin day,
 * Google recorded at least as many lead conversions as there were enquiries
 * that came from an ad and said yes to ad cookies. When it recorded fewer,
 * every such enquiry that day is "not counted", and the sentence says how many
 * of how many, rather than guessing which one Google has. The FourWinds lead
 * check (fourwinds-portal scripts/check-leads-landed.mjs) judges the same way,
 * so the two cannot disagree.
 *
 * The cookie answer is the whole of the consent rule: Google counts nobody in
 * the EEA without an affirmative signal, so an ad enquiry that said no, or
 * never answered, is not a fault anywhere and is said to be expected.
 *
 * Pure, so scripts/check-ad-outcome.mjs can run every branch on made-up rows.
 */
import type { Came } from "./how-they-came";

/**
 * The visitor's answer to the cookie banner, as the enquiry recorded it.
 *
 *   "no-or-none" is SmartCare Living's sheet, which writes "ads: denied" for
 *   a No and for no answer alike (SmartCareliving api/quiz-submit.js). Its CRM
 *   copy keeps them apart, as "denied" and "unset".
 *   null is an enquiry with no answer recorded at all.
 */
export type CookieAnswer = "granted" | "denied" | "unset" | "no-or-none" | null;

export interface AdFacts {
  /** "yyyy-mm-dd hh:mm", Irish time. */
  at: string;
  came: Came;
  consent: CookieAnswer;
  /** A call or voicemail typed in by staff, a paid order, or a website form. */
  kind: "form" | "typed-in" | "order";
}

/** That Dublin day: ad enquiries with a yes, and Google's lead conversions. */
export interface DayTally { needed: number; recorded: number }

export type Verdict =
  | "counted" | "waiting" | "missing" | "unchecked"
  | "said-no" | "no-answer" | "consent-unknown"
  | "not-ad" | "chatgpt" | "origin-unknown" | "not-a-form";

export interface AdOutcome {
  verdict: Verdict;
  /** A few words: what happened. */
  headline: string;
  /** One sentence: why. */
  why: string;
  /** Whether this is something to look into, rather than how it should be. */
  problem: boolean;
}

export interface SiteRules {
  /** The first Dublin day this site's records hold the cookie answer. */
  consentFrom: string;
  /** Whether consented ad leads Google missed are sent again from the server. */
  resends: boolean;
}

/** Days Google may take to show a conversion before its absence means anything. */
export const GRACE_DAYS = 2;

const pretty = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IE", { timeZone: "UTC", day: "numeric", month: "short" });

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * What Google made of one enquiry.
 *
 * day is null when Google could not be read; today is the Dublin day now.
 */
export function adOutcome(f: AdFacts, day: DayTally | null, today: string, rules: SiteRules): AdOutcome | null {
  if (f.kind === "order") return null;
  const date = f.at.slice(0, 10);
  if (f.kind === "typed-in") {
    return {
      verdict: "not-a-form", problem: false,
      headline: "Not something Google can count",
      why: "Entered by hand from a call or voicemail. Google counts website enquiries, and a call only when it is made from the ad itself.",
    };
  }
  if (f.came === "not-ad") {
    return {
      verdict: "not-ad", problem: false,
      headline: "Not from a Google ad",
      why: "No ad click on this enquiry, so there was nothing for Google to count.",
    };
  }
  if (f.came === "chatgpt-ad") {
    return {
      verdict: "chatgpt", problem: false,
      headline: "From a ChatGPT ad, not Google",
      why: "The click came from a ChatGPT ad, so Google Ads has nothing to count.",
    };
  }
  if (f.came === "unknown") {
    return {
      verdict: "origin-unknown", problem: false,
      headline: "Not known whether it came from an ad",
      why: "The site's record of where this visitor arrived from is missing, so it cannot be said either way.",
    };
  }

  /* From an ad. Whether Google may count it is the cookie answer. */
  if (f.consent === "denied") {
    return {
      verdict: "said-no", problem: false,
      headline: "Google cannot count it: they declined cookies",
      why: "They clicked an ad and said no to ad cookies. Google only counts people who say yes, so this is expected.",
    };
  }
  if (f.consent === "unset") {
    return {
      verdict: "no-answer", problem: false,
      headline: "Google cannot count it: no cookie answer",
      why: "They clicked an ad and never answered the cookie banner. Google only counts people who say yes, so this is expected.",
    };
  }
  if (f.consent === "no-or-none") {
    return {
      verdict: "said-no", problem: false,
      headline: "Google cannot count it: no yes to cookies",
      why: "They clicked an ad and either said no to ad cookies or never answered the banner. Google only counts people who say yes, so this is expected.",
    };
  }
  if (f.consent !== "granted") {
    return date < rules.consentFrom
      ? {
          verdict: "consent-unknown", problem: false,
          headline: "Not known whether Google could count it",
          why: `They clicked an ad, but this came before the site recorded cookie answers (from ${pretty(rules.consentFrom)}), so whether Google was allowed to count it is not known.`,
        }
      : {
          verdict: "consent-unknown", problem: true,
          headline: "Not known whether Google could count it",
          why: "They clicked an ad, but their cookie answer was not recorded with the enquiry, which it should have been.",
        };
  }

  /* An ad click and a yes: Google should have it. */
  if (!day) {
    return {
      verdict: "unchecked", problem: false,
      headline: "Should be counted; Google could not be checked",
      why: "They clicked an ad and said yes to cookies, but Google Ads did not answer just now, so whether it recorded this is not known. Refresh to try again.",
    };
  }
  if (day.recorded >= day.needed) {
    return {
      verdict: "counted", problem: false,
      headline: "Counted by Google",
      why: day.needed > 1
        ? `They clicked an ad and said yes to cookies, and Google recorded all ${day.needed} enquiries like this on ${pretty(date)}.`
        : "They clicked an ad and said yes to cookies, and Google recorded the enquiry.",
    };
  }
  if (daysBetween(date, today) <= GRACE_DAYS) {
    return {
      verdict: "waiting", problem: false,
      headline: "Not counted yet",
      why: "They clicked an ad and said yes to cookies. Google can take up to two days to show an enquiry, so it is too soon to say.",
    };
  }
  const got = Number.isInteger(day.recorded) ? String(day.recorded) : day.recorded.toFixed(1);
  return {
    verdict: "missing", problem: true,
    headline: "Not counted by Google, and it should have been",
    why: `They clicked an ad and said yes to cookies, but Google recorded ${got} of the ${day.needed} ${day.needed === 1 ? "enquiry" : "enquiries"} like this on ${pretty(date)}.` +
      (rules.resends ? " It is sent to Google again from the server after two days, so if it is still missing, that send did not land." : ""),
  };
}
