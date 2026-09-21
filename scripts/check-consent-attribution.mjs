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

  // 3. The gate still has to hold. Refuse, and nothing durable is written.
  {
    const { local } = browser();
    local.setItem("ss_consent", consentValue("denied"));
    window.location.search = "?gclid=TEST_THREE";
    attribution.captureAttribution();
    local.getItem("ss_attribution") === null
      ? pass("consent refused, nothing is written to the durable store")
      : fail("consent refused and the click id was stored anyway");
  }

  // 4. An undecided visitor is not treated as consent.
  {
    const { local } = browser();
    window.location.search = "?gclid=TEST_FOUR";
    attribution.captureAttribution();
    local.getItem("ss_attribution") === null
      ? pass("no decision yet, nothing is written to the durable store")
      : fail("no decision yet and the click id was stored anyway");
  }

  // 5. An expired decision is not consent.
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
  console.log("\nConsent and attribution capture agree on all five cases.");
}
