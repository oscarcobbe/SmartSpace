#!/usr/bin/env node
/**
 * The "Google Ads:" line on each enquiry (src/lib/crm/ad-outcome.ts), run on
 * SmartCare Living's real September and October enquiries, names made up.
 *
 * On 6 October 2026 Google showed four conversions against eleven sheet rows,
 * and it took a person to say which were missing and why. Each case below is
 * one of those rows with what was found by hand, so the CRM has to reach the
 * same answer:
 *
 *   27 Sep, ad, yes, Google recorded 1         -> counted
 *   1 Oct, ad, No (CRM "denied")              -> declined cookies, not a problem
 *   28 Sep, ad, never answered (CRM "unset")  -> no answer, not a problem
 *   20 Sep, ad, before answers were written   -> not known, not a problem
 *   23 Sep, ad, yes, Google recorded 0        -> missing, a problem, resent
 *   5 Oct, no click, arrived direct           -> not from an ad
 *
 *   node scripts/check-ad-outcome.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require_ = createRequire(import.meta.url);
const ts = require_("typescript");
const dir = mkdtempSync(join(tmpdir(), "ad-outcome-"));
const load = async (names) => {
  for (const n of names) {
    const js = ts.transpileModule(readFileSync(new URL(`../src/lib/crm/${n}.ts`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from\s+"\.\/([\w-]+)"/g, 'from "./$1.mjs"');
    writeFileSync(join(dir, `${n}.mjs`), js);
  }
  return Promise.all(names.map((n) => import(pathToFileURL(join(dir, `${n}.mjs`)).href)));
};

let failed = 0;
const expect = (got, want, why) => {
  if (JSON.stringify(got) === JSON.stringify(want)) return;
  failed++;
  console.error(`FAIL  ${why}\n      got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};

try {
  const [{ adOutcome }, { readVisit }] = await load(["ad-outcome", "how-they-came"]);
  const SCL = { consentFrom: "2026-09-23", resends: true };
  const SS = { consentFrom: "2026-09-22", resends: false };
  const TODAY = "2026-10-06";
  const form = (at, came, consent) => ({ at, came, consent, kind: "form" });
  const v = (o) => o && [o.verdict, o.problem];

  expect(v(adOutcome(form("2026-09-27 19:10", "ad", "granted"), { needed: 1, recorded: 1 }, TODAY, SCL)), ["counted", false],
    "an ad click with a yes on a day Google recorded one is counted");
  expect(v(adOutcome(form("2026-10-01 17:47", "ad", "denied"), { needed: 1, recorded: 1 }, TODAY, SCL)), ["said-no", false],
    "a No to ad cookies is why Google has nothing, and is how it should be");
  expect(v(adOutcome(form("2026-09-28 23:18", "ad", "unset"), null, TODAY, SCL)), ["no-answer", false],
    "no answer to the banner is told apart from a No, and is not a problem");
  expect(v(adOutcome(form("2026-10-01 17:47", "ad", "no-or-none"), null, TODAY, SCL)), ["said-no", false],
    "the sheet's 'ads: denied', a No or no answer, is not a problem");
  expect(v(adOutcome(form("2026-09-20 08:14", "ad", null), null, TODAY, SCL)), ["consent-unknown", false],
    "an ad enquiry from before the site wrote the answer down is not known, and nobody's fault");
  expect(v(adOutcome(form("2026-10-03 10:00", "ad", null), null, TODAY, SCL)), ["consent-unknown", true],
    "an ad enquiry after that with no answer recorded is a fault in the recording");

  const ciara = adOutcome(form("2026-09-23 18:19", "ad", "granted"), { needed: 1, recorded: 0 }, TODAY, SCL);
  expect(v(ciara), ["missing", true], "an ad click with a yes and nothing in Google after two days is missing, and a problem");
  expect(/recorded 0 of the 1 enquiry/.test(ciara.why) && /sent to Google again/.test(ciara.why), true,
    "the missing line says how many Google has and that SmartCare Living resends");
  expect(/sent to Google again/.test(adOutcome(form("2026-09-23 18:19", "ad", "granted"), { needed: 1, recorded: 0 }, TODAY, SS).why), false,
    "Smart Space has no resend, so its line does not promise one");
  expect(v(adOutcome(form("2026-09-23 18:19", "ad", "granted"), { needed: 2, recorded: 1 }, TODAY, SCL)), ["missing", true],
    "two ad enquiries with a yes and one recorded is a shortfall for both, not a guess at which");
  expect(v(adOutcome(form("2026-10-05 10:58", "ad", "granted"), { needed: 1, recorded: 0 }, TODAY, SCL)), ["waiting", false],
    "inside two days, Google not having it yet is not missing");
  expect(v(adOutcome(form("2026-10-03 10:58", "ad", "granted"), { needed: 1, recorded: 0 }, TODAY, SCL)), ["missing", true],
    "three days on, it is");
  expect(v(adOutcome(form("2026-09-23 18:19", "ad", "granted"), null, TODAY, SCL)), ["unchecked", false],
    "Google not answering is 'could not be checked', never 'not counted'");

  expect(v(adOutcome(form("2026-10-05 10:58", "not-ad", "granted"), null, TODAY, SCL)), ["not-ad", false], "no ad click is not from an ad");
  expect(v(adOutcome(form("2026-10-05 10:58", "chatgpt-ad", "granted"), null, TODAY, SS)), ["chatgpt", false], "a ChatGPT ad is not Google's");
  expect(v(adOutcome(form("2026-09-15 10:58", "unknown", null), null, TODAY, SS)), ["origin-unknown", false], "no record of the arrival is not known");
  expect(v(adOutcome({ at: "2026-09-25 18:38", came: "unknown", consent: null, kind: "typed-in" }, null, TODAY, SCL)), ["not-a-form", false],
    "a call typed in by staff is not something Google can count");
  expect(adOutcome({ at: "2026-09-25 18:38", came: "ad", consent: "granted", kind: "order" }, null, TODAY, SS), null,
    "a paid order gets no line here; the offline upload check judges sales");

  /* The facts as the sheet gives them reach the right reading of where they came from. */
  expect(readVisit({ at: "2026-10-05 10:58", landingPage: "/smartguardian", referrer: "direct/none" }, "smartcareliving"), "not-ad",
    "a direct arrival after 1 October, no click, is not from an ad");
  expect(readVisit({ at: "2026-09-27 19:10", gbraid: "0AAAABEtvxWn", referrer: "google.com" }, "smartcareliving"), "ad",
    "an iPhone click (gbraid in Notes) is an ad");

  /* Copy for Nigel: no dashes standing in for punctuation, no jargon. */
  const every = [
    adOutcome(form("2026-09-27 19:10", "ad", "granted"), { needed: 2, recorded: 2 }, TODAY, SCL), ciara,
    adOutcome(form("2026-10-01 17:47", "ad", "denied"), null, TODAY, SCL), adOutcome(form("2026-09-20 08:14", "ad", null), null, TODAY, SCL),
  ];
  for (const o of every) {
    expect(/[—–]|gclid|consent_state|conversion action/i.test(`${o.headline} ${o.why}`), false, `plain words in "${o.headline}"`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log("ad-outcome: every enquiry reads as it was found by hand on 6 October");
