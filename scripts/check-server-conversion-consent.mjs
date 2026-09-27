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
 * Four things have to agree, so four things are checked:
 *
 *   1. The module itself. It is compiled and run with fetch replaced, and
 *      asked to fire with each possible answer. Only "granted" may make a
 *      request, and "granted" must still make both, so this cannot pass by
 *      the module sending nothing at all.
 *   2. Every caller. Each call to fireServerConversion in src/ has to pass
 *      adConsent as consentFrom(...)?.decision (optionally ?? null), built
 *      from the consent field the browser posted. A "granted" anywhere on the
 *      way there fails it: a fallback after ??, a ternary, "granted" as const,
 *      or a local variable set to it. So does null or anything else that
 *      would shut the gate for everybody at one call site.
 *   3. The round trip through Stripe. /api/checkout has to write the answer
 *      as metadata ad_consent and ad_consent_at, and the webhook has to read
 *      those same two keys back into consentFrom.
 *   4. Every browser request that posts an enquiry, a checkout or a phone tap
 *      has to send consent: consentRecord() in its own body, or the server
 *      never has a yes to read and the gate is shut for everybody.
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

/* ── Reading the code ──────────────────────────────────────────── */

/*
 * Parts 2 to 4 read the source rather than grep it, because the regressions
 * that matter hide one step away from the call: a fallback after `??`, a
 * `const` declared ten lines up, a body built in a variable. Every local name
 * an expression uses is followed to what it was set to (its initializer, a
 * destructuring default, and any later assignment), so a "granted" planted
 * anywhere on that path is seen. Anything the reader cannot follow is a
 * problem, not a pass.
 */

function* walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}

const SRC = join(ROOT, "src");
const program = ts.createProgram([...walk(SRC)], {
  noResolve: true,
  noLib: true,
  types: [],
  jsx: ts.JsxEmit.Preserve,
  target: ts.ScriptTarget.ES2022,
});
const checker = program.getTypeChecker();
const sources = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile && resolve(sf.fileName).startsWith(SRC));
const rel = (sf) => relative(ROOT, resolve(sf.fileName));
const where = (node) => {
  const sf = node.getSourceFile();
  return `${rel(sf)}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
};
const text = (node) => node.getText(node.getSourceFile()).replace(/\s+/g, " ");

function strip(e) {
  while (
    e &&
    (ts.isParenthesizedExpression(e) ||
      ts.isAsExpression(e) ||
      ts.isSatisfiesExpression(e) ||
      ts.isNonNullExpression(e) ||
      ts.isTypeAssertionExpression(e) ||
      ts.isAwaitExpression(e))
  ) {
    e = e.expression;
  }
  return e;
}

function each(node, fn) {
  const visit = (n) => {
    if (ts.isTypeNode(n)) return; // `"granted" | "denied"` in a type is not a value
    fn(n);
    ts.forEachChild(n, visit);
  };
  visit(node);
}

function declOf(id) {
  const sym =
    ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id
      ? checker.getShorthandAssignmentValueSymbol(id.parent)
      : checker.getSymbolAtLocation(id);
  const decl = sym?.valueDeclaration ?? sym?.declarations?.[0];
  return sym && decl ? { sym, decl } : null;
}

const assignedIn = new Map();
function assignmentsTo(sym, sf) {
  if (!assignedIn.has(sf)) {
    const bySymbol = new Map();
    each(sf, (n) => {
      if (
        ts.isBinaryExpression(n) &&
        n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        n.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
        ts.isIdentifier(strip(n.left))
      ) {
        const s = checker.getSymbolAtLocation(strip(n.left));
        if (s) bySymbol.set(s, [...(bySymbol.get(s) ?? []), n.right]);
      }
    });
    assignedIn.set(sf, bySymbol);
  }
  return assignedIn.get(sf).get(sym) ?? [];
}

/* Every expression a local name can hold: its initializer, a destructuring
   default and the object it was taken from, and every later assignment. */
function valuesOf(id) {
  const d = declOf(id);
  if (!d) return [];
  const { sym, decl } = d;
  const out = [];
  if ((ts.isVariableDeclaration(decl) || ts.isParameter(decl) || ts.isBindingElement(decl)) && decl.initializer) {
    out.push(decl.initializer);
  }
  if (ts.isBindingElement(decl)) {
    let p = decl.parent;
    while (p && !ts.isVariableDeclaration(p) && !ts.isParameter(p)) p = p.parent;
    if (p?.initializer) out.push(p.initializer);
  }
  return [...out, ...assignmentsTo(sym, decl.getSourceFile())];
}

function isReference(id) {
  const p = id.parent;
  if (ts.isPropertyAccessExpression(p) && p.name === id) return false;
  if ((ts.isPropertyAssignment(p) || ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p)) && p.name === id) return false;
  if (ts.isBindingElement(p) && (p.name === id || p.propertyName === id)) return false;
  return true;
}

/* The expression plus everything its local names were set to. */
function reach(node) {
  const seen = new Set();
  const roots = [];
  const add = (n) => {
    if (!n || seen.has(n)) return;
    seen.add(n);
    roots.push(n);
    each(n, (m) => {
      if (ts.isIdentifier(m) && isReference(m)) valuesOf(m).forEach(add);
    });
  };
  add(node);
  return roots;
}

function grantedIn(node) {
  for (const root of reach(node)) {
    let hit = null;
    each(root, (m) => {
      if (!hit && (ts.isStringLiteral(m) || ts.isNoSubstitutionTemplateLiteral(m)) && m.text === "granted") hit = m;
    });
    if (hit) return hit;
  }
  return null;
}

/* A name that holds exactly one thing, followed to it. */
function single(e) {
  e = strip(e);
  while (e && ts.isIdentifier(e)) {
    const vs = valuesOf(e);
    if (vs.length !== 1) return e;
    e = strip(vs[0]);
  }
  return e;
}

function consentFromCall(e) {
  e = single(e);
  return e && ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "consentFrom" ? e : null;
}

/* The one allowed shape: consentFrom(...)?.decision, optionally `?? null`.
   Returns the consentFrom call, or null for anything else. */
function answerFrom(e) {
  e = single(e);
  if (!e) return null;
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
    const r = strip(e.right);
    const nothing = r.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(r) && r.text === "undefined");
    return nothing ? answerFrom(e.left) : null;
  }
  if (ts.isPropertyAccessExpression(e) && e.name.text === "decision") return consentFromCall(e.expression);
  return null;
}

/* Whether an expression is the `consent` field of what the browser posted. */
function readsPostedConsent(e) {
  e = strip(e);
  if (!e) return false;
  if (ts.isPropertyAccessExpression(e)) return e.name.text === "consent";
  if (ts.isElementAccessExpression(e)) return ts.isStringLiteralLike(e.argumentExpression) && e.argumentExpression.text === "consent";
  if (ts.isIdentifier(e)) {
    const d = declOf(e);
    if (d && ts.isBindingElement(d.decl)) {
      return (d.decl.propertyName ?? d.decl.name).getText() === "consent" && !assignmentsTo(d.sym, d.decl.getSourceFile()).length;
    }
    const vs = valuesOf(e);
    return vs.length === 1 && readsPostedConsent(vs[0]);
  }
  return false;
}

/* The object literals an expression can be. A null in the result means a
   branch this reader could not follow. */
function objectsOf(e, seen = new Set()) {
  e = strip(e);
  if (!e || seen.has(e)) return [null];
  seen.add(e);
  if (ts.isObjectLiteralExpression(e)) return [e];
  if (ts.isIdentifier(e)) {
    const vs = valuesOf(e);
    return vs.length ? vs.flatMap((v) => objectsOf(v, seen)) : [null];
  }
  if (ts.isConditionalExpression(e)) return [...objectsOf(e.whenTrue, seen), ...objectsOf(e.whenFalse, seen)];
  if (ts.isCallExpression(e) && text(e.expression) === "JSON.stringify") return objectsOf(e.arguments[0], seen);
  if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "Blob" && e.arguments?.[0]) {
    return objectsOf(e.arguments[0], seen);
  }
  if (ts.isArrayLiteralExpression(e)) return e.elements.flatMap((el) => objectsOf(el, seen));
  return [null];
}

function propOf(obj, name) {
  const p = obj.properties.find(
    (q) => (ts.isPropertyAssignment(q) || ts.isShorthandPropertyAssignment(q)) && q.name.getText(obj.getSourceFile()) === name,
  );
  if (!p) return null;
  return ts.isPropertyAssignment(p) ? p.initializer : p.name;
}

/* ── 2. Every caller ───────────────────────────────────────────── */

const WEBHOOK = "src/app/api/webhooks/stripe/route.ts";
const CHECKOUT = "src/app/api/checkout/route.ts";
const calls = [];
for (const sf of sources) {
  each(sf, (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "fireServerConversion") calls.push(n);
  });
}

const before = problems.length;
for (const call of calls) {
  const objs = objectsOf(call.arguments[0]);
  if (objs.length !== 1 || !objs[0]) {
    problems.push(`${where(call)} calls fireServerConversion with an argument this check cannot read`);
    continue;
  }
  const value = propOf(objs[0], "adConsent");
  if (!value) {
    problems.push(`${where(call)} calls fireServerConversion without an adConsent it was given`);
    continue;
  }
  const planted = grantedIn(value);
  if (planted) {
    problems.push(`${where(call)} can pass adConsent "granted" (${where(planted)}: ${text(planted.parent)}), a yes nobody gave`);
    continue;
  }
  const from = answerFrom(value);
  if (!from) {
    problems.push(
      `${where(call)} passes adConsent ${text(value)}, not consentFrom(...)?.decision ?? null, so the gate is shut for everybody or opens on something other than the visitor's answer`,
    );
    continue;
  }
  if (rel(call.getSourceFile()) !== WEBHOOK && !readsPostedConsent(from.arguments[0])) {
    problems.push(
      `${where(call)} builds adConsent from ${text(from.arguments[0] ?? from)}, not the consent field the browser posts, so the server never sees a yes`,
    );
  }
}
if (!calls.length) problems.push("found no call to fireServerConversion in src/, so this check is looking in the wrong place");
else if (problems.length === before) ok(`${calls.length} caller(s) of fireServerConversion each pass consentFrom(the answer they were given)?.decision`);

/* ── 3. The round trip through Stripe ──────────────────────────── */

/*
 * A website sale's answer travels by Stripe: /api/checkout writes it on the
 * session as metadata ad_consent and ad_consent_at, and the webhook reads it
 * back when the payment completes. The portal's offline upload reads the same
 * ad_consent key. If either side changes a key, or the webhook stops passing
 * what it read, the gate shuts for every website sale and nothing looks
 * broken, so both ends are pinned to the same two names.
 */
const KEYS = [
  ["ad_consent", "decision", "decision"],
  ["ad_consent_at", "at", "decidedAt"],
];

const before3 = problems.length;
const checkout = sources.find((sf) => rel(sf) === CHECKOUT);
if (!checkout) {
  problems.push(`${CHECKOUT} is missing, so this check is looking in the wrong place`);
} else {
  const writes = new Map();
  each(checkout, (n) => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ["append", "set"].includes(n.expression.name.text) &&
      n.arguments[0] &&
      ts.isStringLiteralLike(n.arguments[0])
    ) {
      const key = n.arguments[0].text.match(/^metadata\[(.+)\]$/)?.[1];
      if (key) writes.set(key, [...(writes.get(key) ?? []), n.arguments[1]]);
    }
  });
  for (const [key, field] of KEYS) {
    const values = writes.get(key) ?? [];
    if (!values.length) {
      problems.push(
        `${CHECKOUT} no longer writes metadata[${key}] on the Stripe session, so the webhook and the portal's upload never see the buyer's answer`,
      );
    }
    for (const v of values) {
      const planted = v && grantedIn(v);
      const e = v && strip(v);
      if (planted) {
        problems.push(`${where(v)} can write metadata[${key}] as "granted" (${where(planted)}), a yes nobody gave`);
      } else if (!e || !ts.isPropertyAccessExpression(e) || e.name.text !== field || !consentFromCall(e.expression)) {
        problems.push(`${where(v ?? checkout)} writes metadata[${key}] from ${v ? text(v) : "nothing"}, not the ${field} of consentFrom(...)`);
      } else if (!readsPostedConsent(consentFromCall(e.expression).arguments[0])) {
        problems.push(`${where(v)} writes metadata[${key}] from something other than the consent field the browser posts`);
      }
    }
  }
}

const webhookCalls = calls.filter((c) => rel(c.getSourceFile()) === WEBHOOK);
if (!webhookCalls.length) problems.push(`found no fireServerConversion call in ${WEBHOOK}, so this check is looking in the wrong place`);
const isMetadata = (e) => {
  e = single(e);
  return !!e && ((ts.isPropertyAccessExpression(e) && e.name.text === "metadata") || (ts.isIdentifier(e) && e.text === "metadata"));
};
for (const call of webhookCalls) {
  const obj = objectsOf(call.arguments[0])[0];
  const from = obj && propOf(obj, "adConsent") && answerFrom(propOf(obj, "adConsent"));
  if (!from) continue; // already a problem in part 2
  const args = objectsOf(from.arguments[0]);
  const arg = args.length === 1 ? args[0] : null;
  for (const [key, , input] of KEYS) {
    const v = arg && propOf(arg, input);
    const read = new Set();
    if (v) {
      for (const root of reach(v)) {
        each(root, (m) => {
          if (ts.isPropertyAccessExpression(m) && isMetadata(m.expression)) read.add(m.name.text);
          if (ts.isElementAccessExpression(m) && isMetadata(m.expression)) {
            read.add(ts.isStringLiteralLike(m.argumentExpression) ? m.argumentExpression.text : `[${text(m.argumentExpression)}]`);
          }
        });
      }
    }
    const keys = [...read];
    if (keys.length !== 1 || keys[0] !== key) {
      problems.push(
        `${where(from)} reads the buyer's ${input} from ${keys.length ? keys.map((k) => `metadata.${k}`).join(" and ") : "no Stripe metadata key"}, but /api/checkout writes it as metadata.${key}, so no website sale can count as a yes`,
      );
    }
  }
}
if (problems.length === before3) ok("/api/checkout writes metadata ad_consent and ad_consent_at, and the Stripe webhook reads those same keys into consentFrom");

/* ── 4. The answer reaches the server ──────────────────────────── */

/*
 * Judged request by request, not file by file: a component that posts twice
 * (CartDrawer sends a free booking to one route and a paid one to another)
 * must send the answer in both bodies.
 */
const ENDPOINTS = new Set(["/api/contact", "/api/checkout", "/api/checkout/free", "/api/booking", "/api/track/phone-click"]);
const endpointOf = (m) => {
  const raw = ts.isStringLiteral(m) || ts.isNoSubstitutionTemplateLiteral(m) ? m.text : ts.isTemplateExpression(m) ? m.head.text : null;
  const path = raw?.split("?")[0];
  return path && ENDPOINTS.has(path) ? path : null;
};

const before4 = problems.length;
let requests = 0;
const senders = new Set();
for (const sf of sources) {
  if (rel(sf).startsWith(join("src", "app", "api"))) continue;
  const named = [];
  each(sf, (m) => {
    if (endpointOf(m)) named.push(m);
  });
  if (!named.length) continue;
  const accounted = new Set();
  each(sf, (n) => {
    if (!ts.isCallExpression(n)) return;
    const callee = strip(n.expression);
    const kind = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : null;
    if (kind !== "fetch" && kind !== "sendBeacon") return;
    const urls = [];
    for (const root of reach(n.arguments[0])) each(root, (m) => endpointOf(m) && urls.push(m));
    if (!urls.length) return;
    urls.forEach((u) => accounted.add(u));
    requests++;
    senders.add(rel(sf));
    const endpoint = endpointOf(urls[0]);
    let body = null;
    if (kind === "sendBeacon") body = n.arguments[1];
    else {
      const inits = n.arguments[1] ? objectsOf(n.arguments[1]) : [];
      body = inits.length === 1 && inits[0] ? propOf(inits[0], "body") : null;
    }
    const payloads = body ? objectsOf(body) : [null];
    if (payloads.includes(null)) {
      problems.push(`${where(n)} posts to ${endpoint} with a body this check cannot read, so it cannot see whether the banner answer goes with it`);
      return;
    }
    for (const payload of payloads) {
      const consent = propOf(payload, "consent");
      const c = consent && strip(consent);
      if (!c || !ts.isCallExpression(c) || !ts.isIdentifier(c.expression) || c.expression.text !== "consentRecord" || c.arguments.length) {
        problems.push(`${where(n)} posts to ${endpoint} without consent: consentRecord() in its body, so the server can never see a yes from it`);
      }
    }
  });
  for (const m of named) {
    if (!accounted.has(m)) {
      problems.push(`${where(m)} names ${endpointOf(m)} outside a fetch or sendBeacon this check can read, so it cannot see whether the banner answer goes with it`);
    }
  }
}
if (!requests) problems.push("found no browser code posting an enquiry, checkout or phone tap, so this check is looking in the wrong place");
else if (problems.length === before4) ok(`${requests} browser request(s) in ${senders.size} file(s) that post an enquiry, checkout or phone tap each send the banner answer`);

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"}:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}
console.log("\nThe server sends identifiers to Google only for a visitor who said yes.\n");
