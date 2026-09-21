#!/usr/bin/env node
/**
 * The consent gate must not silently throw the click id away.
 *
 * CookieBanner stores {"decision":"granted","decidedAt":...} under ss_consent.
 * attribution.ts compared that raw string against "granted", so consent read
 * as refused for every visitor on earth, including one who had just pressed
 * Accept. Every capture went into a queue held on window, and window does not
 * survive a full page load, so an ad click followed by any hard navigation
 * lost the gclid. Live from 6 September 2026; the last lead of any kind
 * carrying a click id is 4 September.
 *
 * Structural checks would not have caught it: both files were individually
 * sensible and only disagreed with each other. So this compiles the real
 * modules and runs them against a stub browser.
 *
 *   node scripts/check-consent-attribution.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A browser just real enough for these two modules. */
function browser() {
  const store = (name) => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => m.set(k, String(v)),
      removeItem: (k) => m.delete(k),
      clear: () => m.clear(),
      _name: name,
      _map: m,
    };
  };
  const local = store("local");
  const session = store("session");
  globalThis.localStorage = local;
  globalThis.sessionStorage = session;
  globalThis.document = { referrer: "" };
  globalThis.window = {
    localStorage: local,
    sessionStorage: session,
    location: { pathname: "/services", search: "" },
    document: globalThis.document,
  };
  return { local, session };
}

/** Compile attribution.ts to a module node can import. */
function loadAttribution() {
  const src = readFileSync(join(ROOT, "src/lib/attribution.ts"), "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dir = mkdtempSync(join(tmpdir(), "attr-"));
  const file = join(dir, `attribution.${Date.now()}.mjs`);
  writeFileSync(file, js);
  return { file, dir };
}

/** What the banner really writes, read straight out of CookieBanner.tsx. */
function bannerWrites() {
  const src = readFileSync(join(ROOT, "src/components/CookieBanner.tsx"), "utf8");
  if (!/JSON\.stringify\(\{\s*decision,\s*decidedAt/.test(src)) {
    throw new Error(
      "CookieBanner no longer stores {decision, decidedAt}. This check asserts " +
      "the two modules agree, so update both together.",
    );
  }
  return (decision) => JSON.stringify({ decision, decidedAt: Date.now() });
}

/* Exactly what CookieBanner.tsx does on Accept: run the queued writers and
   empty the queue. Without this the test was asserting against a stub that
   only checks the stored consent shape, and reported a gap that was its own. */
function drainConsentQueue() {
  const q = globalThis.window.__ssOnConsent;
  if (Array.isArray(q)) { q.forEach((fn) => { try { fn(); } catch { /* ignore */ } }); q.length = 0; }
}

const fail = (m) => { console.error(`FAIL  ${m}`); process.exitCode = 1; };
const pass = (m) => console.log(`ok    ${m}`);

const { file, dir } = loadAttribution();
const attribution = await import(pathToFileURL(file).href);
const consentValue = bannerWrites();

try {
  // 1. Accepted on the landing page: the click id is stored immediately.
  {
    const { local } = browser();
    local.setItem("ss_consent", consentValue("granted"));
    window.location.search = "?gclid=TEST_ONE";
    attribution.captureAttribution();
    const got = JSON.parse(local.getItem("ss_attribution") ?? "{}").gclid;
    got === "TEST_ONE"
      ? pass("consent already granted, the click id is written at once")
      : fail(`consent already granted, expected TEST_ONE, stored ${JSON.stringify(got)}`);
  }

  // 2. The failure that actually happened: land on an ad URL without having
  //    decided, navigate, then accept. window is gone by the second page.
  {
    const { local } = browser();
    window.location.search = "?gclid=TEST_TWO";
    attribution.captureAttribution();          // page one, nothing decided

    delete globalThis.window.__ssOnConsent;    // a full page load drops it
    window.location.search = "";
    window.location.pathname = "/contact";
    local.setItem("ss_consent", consentValue("granted"));
    attribution.captureAttribution();          // page two, now accepted

    const got = JSON.parse(local.getItem("ss_attribution") ?? "{}").gclid;
    got === "TEST_TWO"
      ? pass("accepted a page later, the click id from the landing URL survives")
      : fail(`accepted a page later, expected TEST_TWO, stored ${JSON.stringify(got)}`);
  }

  // 2b. The one that was actually costing the money, and that case 2 above
  //     walks straight past because it only reads a single page before
  //     deciding. Real visitors read two or three. The park had no first-touch
  //     guard, so page two overwrote the landing record and the click id was
  //     gone before the banner was ever answered. Reproduced against
  //     production on 21 Sep 2026: land on /?gclid=..., move to /reviews,
  //     accept there, and the stored record is {"landingPage":"/reviews"}
  //     with no gclid on it. Google then has no click to tie the sale to.
  {
    const { local } = browser();
    window.location.search = "?gclid=TEST_JOURNEY";
    attribution.captureAttribution();          // page one, the ad landing

    delete globalThis.window.__ssOnConsent;
    window.location.search = "";
    window.location.pathname = "/reviews";
    attribution.captureAttribution();          // page two, still undecided

    delete globalThis.window.__ssOnConsent;
    window.location.pathname = "/contact";
    local.setItem("ss_consent", consentValue("granted"));
    attribution.captureAttribution();          // page three, accepts here

    const got = JSON.parse(local.getItem("ss_attribution") ?? "{}").gclid;
    got === "TEST_JOURNEY"
      ? pass("two pages read before accepting, the click id still survives")
      : fail(`read two pages then accepted, expected TEST_JOURNEY, stored ${JSON.stringify(got)}`);
  }

  // 2c. Same journey, arriving on a campaign with no gclid. utmCampaign was
  //     missing from one of the three ad-signal checks, so these were dropped.
  {
    const { local } = browser();
    window.location.search = "?utm_campaign=autumn_falls&utm_medium=cpc";
    attribution.captureAttribution();

    delete globalThis.window.__ssOnConsent;
    window.location.search = "";
    window.location.pathname = "/reviews";
    attribution.captureAttribution();

    delete globalThis.window.__ssOnConsent;
    local.setItem("ss_consent", consentValue("granted"));
    attribution.captureAttribution();

    const got = JSON.parse(local.getItem("ss_attribution") ?? "{}").utmCampaign;
    got === "autumn_falls"
      ? pass("a campaign with no click id survives the same journey")
      : fail(`campaign-only visit, expected autumn_falls, stored ${JSON.stringify(got)}`);
  }

  // 2d. Accepts on page two and converts there without navigating again. The
  //     durable record has to exist at that moment, because that is when the
  //     form reads it. It used to appear only on the next page load.
  {
    const { local } = browser();
    window.location.search = "?gclid=TEST_SAME_TICK";
    attribution.captureAttribution();          // landing page, undecided

    delete globalThis.window.__ssOnConsent;
    window.location.search = "";
    window.location.pathname = "/contact";
    attribution.captureAttribution();          // page two, still undecided
    local.setItem("ss_consent", consentValue("granted"));
    drainConsentQueue();                       // what CookieBanner does, no reload

    const got = JSON.parse(local.getItem("ss_attribution") ?? "{}").gclid;
    got === "TEST_SAME_TICK"
      ? pass("accepted and converted on the same page, the click id is there already")
      : fail(`accepted without reloading, expected TEST_SAME_TICK, stored ${JSON.stringify(got)}`);
  }

  // 3. A returning visitor who already has an organic record, then clicks an
  //    ad and accepts a page later. First touch holds against another organic
  //    visit and must not hold against an ad click, which is the rule
  //    captureAttribution itself applies. Found by testing against production,
  //    where a browser holding a stale organic record would have thrown the
  //    new click id away on acceptance.
  {
    const { local } = browser();
    local.setItem("ss_attribution", JSON.stringify({
      landingPage: "/", capturedAt: Date.now() - 86400000, expiresAt: Date.now() + 86400000,
    }));
    window.location.search = "?gclid=TEST_RETURNING";
    attribution.captureAttribution();          // parks, nothing decided yet

    delete globalThis.window.__ssOnConsent;    // a full page load
    window.location.search = "";
    window.location.pathname = "/contact";
    local.setItem("ss_consent", consentValue("granted"));
    attribution.captureAttribution();

    const got = JSON.parse(local.getItem("ss_attribution") ?? "{}").gclid;
    got === "TEST_RETURNING"
      ? pass("a returning visitor's ad click beats the older organic record")
      : fail(`returning visitor, expected TEST_RETURNING, stored ${JSON.stringify(got)}`);
  }

  // 4. The gate still has to hold. Refuse, and nothing durable is written.
  {
    const { local } = browser();
    local.setItem("ss_consent", consentValue("denied"));
    window.location.search = "?gclid=TEST_THREE";
    attribution.captureAttribution();
    local.getItem("ss_attribution") === null
      ? pass("consent refused, nothing is written to the durable store")
      : fail("consent refused and the click id was stored anyway");
  }

  // 5. An undecided visitor is not treated as consent.
  {
    const { local } = browser();
    window.location.search = "?gclid=TEST_FOUR";
    attribution.captureAttribution();
    local.getItem("ss_attribution") === null
      ? pass("no decision yet, nothing is written to the durable store")
      : fail("no decision yet and the click id was stored anyway");
  }

  // 6. An expired decision is not consent.
  {
    const { local } = browser();
    local.setItem("ss_consent", JSON.stringify({
      decision: "granted",
      decidedAt: Date.now() - (366 * 24 * 60 * 60 * 1000),
    }));
    window.location.search = "?gclid=TEST_FIVE";
    attribution.captureAttribution();
    local.getItem("ss_attribution") === null
      ? pass("a decision older than twelve months is not consent")
      : fail("an expired decision was treated as consent");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (process.exitCode) {
  console.error("\nThe consent gate and attribution capture disagree.");
} else {
  console.log("\nConsent and attribution capture agree on all nine cases.");
}
