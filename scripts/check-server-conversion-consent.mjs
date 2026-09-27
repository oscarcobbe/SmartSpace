#!/usr/bin/env node
/**
 * The server must not send a visitor's identifiers to Google without a
 * recorded yes to ad cookies.
 *
 * fireServerConversion sends the click id and a hashed email and phone to the
 * Google Ads pixel, and a hashed email to GA4 as user_id. It used to do that
 * for every enquiry, phone tap and sale whatever the visitor chose on the
 * banner, while /privacy says Google receives hashed email and phone "when you
 * consent". Nothing looked broken: the forms worked and the pixels answered
 * 200. The only way to see it was to read what left the server.
 *
 * Three things have to agree, so three things are checked:
 *
 *   1. The module itself. It is compiled and run with fetch replaced, and
 *      asked to fire with each possible answer. Only "granted" may make a
 *      request, and "granted" must still make both, so this cannot pass by
 *      the module sending nothing at all.
 *   2. Every caller. Each call to fireServerConversion in src/ has to pass
 *      adConsent from something it was given, never a literal "granted".
 *   3. Every browser component that posts an enquiry, a checkout or a phone
 *      tap has to send the banner answer, or the server never has a yes to
 *      read and the gate is shut for everybody.
 *
 *   node scripts/check-server-conversion-consent.mjs
 */
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const ok = (s) => console.log(`ok    ${s}`);

/* ── 1. The module ─────────────────────────────────────────────── */

process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID = "G-CHECK000";
process.env.GA4_API_SECRET = "check-secret";

const src = readFileSync(join(ROOT, "src/lib/server-conversions.ts"), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dir = mkdtempSync(join(tmpdir(), "server-consent-"));
const file = join(dir, `server-conversions.${Date.now()}.mjs`);
writeFileSync(file, js);

const sent = [];
globalThis.fetch = async (url) => {
  sent.push(String(url));
  return new Response("", { status: 200 });
};
const quiet = { log: console.log, warn: console.warn, error: console.error };
console.log = console.warn = console.error = () => {};

let fireServerConversion;
try {
  ({ fireServerConversion } = await import(pathToFileURL(file).href));
} finally {
  Object.assign(console, quiet);
}

const lead = {
  gadsLabel: "CheckLabel",
  ga4EventName: "generate_lead",
  value: 10,
  currency: "EUR",
  transactionId: "check-1",
  gclid: "CheckClickId",
  email: "someone@example.com",
  phone: "0850000000",
};

async function fire(adConsent) {
  sent.length = 0;
  console.log = console.warn = console.error = () => {};
  try {
    await fireServerConversion(adConsent === "omitted" ? { ...lead } : { ...lead, adConsent });
  } finally {
    Object.assign(console, quiet);
  }
  return [...sent];
}

for (const answer of ["denied", null, undefined, "omitted", "yes", true]) {
  const requests = await fire(answer);
  const what = answer === "omitted" ? "no adConsent at all" : `adConsent ${JSON.stringify(answer) ?? "undefined"}`;
  if (requests.length) {
    problems.push(`with ${what} the server still sent ${requests.length} request(s) to Google: ${requests.map((u) => new URL(u).host).join(", ")}`);
  } else {
    ok(`${what}: nothing leaves the server`);
  }
}

const granted = await fire("granted");
const ads = granted.find((u) => u.includes("googleadservices.com/pagead/conversion/"));
const ga4 = granted.find((u) => u.includes("google-analytics.com/mp/collect"));
if (!ads || !ga4) {
  problems.push(`with adConsent "granted" the server should send to both Google Ads and GA4, and sent: ${granted.join(", ") || "nothing"}`);
} else if (!new URL(ads).searchParams.get("em") || new URL(ads).searchParams.get("gclid") !== "CheckClickId") {
  problems.push(`with adConsent "granted" the Ads pixel lost its click id or hashed email: ${ads}`);
} else {
  ok(`adConsent "granted": the Ads pixel and the GA4 event are both sent, with the click id`);
}

rmSync(dir, { recursive: true, force: true });

/* ── 2. Every caller ───────────────────────────────────────────── */

function* walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}

let callers = 0;
for (const path of walk(join(ROOT, "src"))) {
  const text = readFileSync(path, "utf8");
  if (!text.includes("fireServerConversion(")) continue;
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "fireServerConversion") {
      callers++;
      const where = `${relative(ROOT, path)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
      const arg = node.arguments[0];
      const prop = arg && ts.isObjectLiteralExpression(arg)
        ? arg.properties.find((p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name.getText(sf) === "adConsent")
        : undefined;
      if (!prop) {
        problems.push(`${where} calls fireServerConversion without an adConsent it was given`);
      } else if (ts.isPropertyAssignment(prop) && /^["'`]granted["'`]$/.test(prop.initializer.getText(sf).trim())) {
        problems.push(`${where} hard-codes adConsent "granted", which claims a yes nobody gave`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
if (!callers) problems.push("found no call to fireServerConversion in src/, so this check is looking in the wrong place");
else ok(`${callers} caller(s) of fireServerConversion each pass the answer they were given`);

/* ── 3. The answer reaches the server ──────────────────────────── */

const POSTS = /["'`]\/api\/(contact|checkout|checkout\/free|booking|track\/phone-click)["'`]/;
let senders = 0;
for (const path of walk(join(ROOT, "src"))) {
  if (path.includes(`${join("src", "app", "api")}`)) continue;
  const text = readFileSync(path, "utf8");
  if (!POSTS.test(text)) continue;
  senders++;
  if (!/consent:\s*consentRecord\(\)/.test(text)) {
    problems.push(`${relative(ROOT, path)} posts to ${text.match(POSTS)[0]} without consent: consentRecord(), so the server can never see a yes from it`);
  }
}
if (!senders) problems.push("found no browser code posting an enquiry, checkout or phone tap, so this check is looking in the wrong place");
else ok(`${senders} browser file(s) that post an enquiry, checkout or phone tap each send the banner answer`);

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}
console.log("\nThe server sends identifiers to Google only for a visitor who said yes.\n");
