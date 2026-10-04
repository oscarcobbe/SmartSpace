#!/usr/bin/env node
/**
 * One page view per page load, and no Google tag on a staff page.
 *
 * ── THE FAULTS ───────────────────────────────────────────────────
 *
 * 1. From 24 August to 4 October 2026 (PR #10) a returning visitor who had
 *    accepted cookies sent page_view twice on every hard load and reload, to
 *    each GA4 stream: once from the GA4 config call in the <head>, and once
 *    from CookieBanner, whose mount effect applied the stored decision with
 *    the same function as the Accept button, page view included. A comment
 *    beside that page view said "This cannot double count".
 *
 * 2. Only /crm was spared the tag. /admin/leads filed page views in GA4 and
 *    sent scroll and form_begin to Google Ads and remarketing whenever Nigel
 *    read his own leads, and the internal hand-off pages were tracked too.
 *
 * Neither shows in a typecheck, a build or a look at the page.
 *
 * ── WHAT THIS DOES ───────────────────────────────────────────────
 *
 *  1. Compiles src/lib/gtag-bootstrap.ts, the <head> script, and runs the
 *     exact string it returns in a sandbox, once per path and per stored
 *     decision, then runs src/lib/consent-gtag.ts the way CookieBanner does:
 *     applyConsent for a stored decision on load, recordAnswer for a press.
 *     It counts the page views that reach GA4 from what gtag was told (a GA4
 *     config call sends one unless send_page_view is false, and so does a
 *     page_view event), and the consent state each went out under.
 *       - a hard load with a stored Accept: exactly one, granted
 *       - a hard load with a stored Decline: exactly one, denied
 *       - a first visit, then Accept: one denied and exactly one granted
 *       - a first visit, then Decline: exactly one, denied
 *  2. Every staff path in src/lib/staff-paths.ts, and its subpages: no
 *     script requested, no window.gtag, nothing in a dataLayer. Lookalike
 *     public paths (/crmsomething, /administration) are tracked as normal.
 *  3. Reads the wiring the sandbox cannot see: layout.tsx renders the
 *     bootstrap and nothing else of gtag's; CookieBanner's mount effect
 *     calls applyConsent and never recordAnswer, and recordAnswer is called
 *     only from the button handler; SiteChrome mounts every tracker and the
 *     banner only behind !staff.
 *  4. Refuses G-JR2WXNSLEL as the configured GA4 id: its gtag/js is a 404.
 *
 *   node scripts/check-gtag-bootstrap.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ADS = "AW-17978501655";
const GA4 = "G-N8886QEJ70";
const CALL = "HWS2CL2y4ZgcEJfU6PxC";
const DEAD_GA4 = "G-JR2WXNSLEL";

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const fail = (m) => { bad++; console.error(`FAIL  ${m}`); };
const check = (cond, good, wrong) => (cond ? ok(good) : fail(wrong));

/* ── Compile the three modules ───────────────────────────────────── */
const dir = mkdtempSync(join(tmpdir(), "gtag-bootstrap-"));
process.on("exit", () => rmSync(dir, { recursive: true, force: true }));
for (const name of ["staff-paths", "gtag-bootstrap", "consent-gtag"]) {
  const js = ts.transpileModule(readFileSync(join(ROOT, "src/lib", `${name}.ts`), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from "\.\/([\w-]+)"/g, 'from "./$1.mjs"');
  writeFileSync(join(dir, `${name}.mjs`), js);
}
const { STAFF_PATH } = await import(pathToFileURL(join(dir, "staff-paths.mjs")).href);
const { gtagBootstrap } = await import(pathToFileURL(join(dir, "gtag-bootstrap.mjs")).href);
const consent = await import(pathToFileURL(join(dir, "consent-gtag.mjs")).href);

const code = gtagBootstrap({ ads: ADS, ga4: GA4, callLabel: CALL, callNumber: "01 513 0424" });

/** A fresh document at `pathname`, with the <head> script run in it. */
function load(pathname, stored) {
  const store = new Map();
  if (stored) store.set("ss_consent", JSON.stringify({ decision: stored, decidedAt: Date.now(), v: 2 }));
  const appended = [];
  const sandbox = {
    location: { pathname, href: `https://smart-space.ie${pathname}` },
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null) },
    document: {
      title: "page",
      createElement: (tag) => ({ tagName: tag }),
      head: { appendChild: (el) => appended.push(el) },
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  /* consent-gtag.ts reads the browser's globals; point them at this page. */
  globalThis.window = sandbox;
  globalThis.document = sandbox.document;
  return { page: sandbox, appended };
}

/** What gtag was told, as plain arrays, in order. */
const calls = (page) => (page.dataLayer ?? []).filter((a) => a && typeof a === "object" && typeof a.length === "number").map((a) => Array.from(a));

/** The page views GA4 receives, with the analytics consent each went out under. */
function pageViews(page) {
  let analytics;
  const out = [];
  for (const c of calls(page)) {
    if (c[0] === "consent") analytics = c[2]?.analytics_storage ?? analytics;
    if (c[0] === "config" && String(c[1]).startsWith("G-") && c[2]?.send_page_view !== false) out.push({ via: "config", analytics });
    if (c[0] === "event" && c[1] === "page_view") {
      const to = c[2]?.send_to;
      if (to === undefined || [].concat(to).includes(GA4)) out.push({ via: "event", analytics });
    }
  }
  return out;
}
const show = (pv) => JSON.stringify(pv.map((p) => `${p.via}:${p.analytics}`));

/* ── 1. One page view per load ───────────────────────────────────── */
{
  const { page, appended } = load("/about", "granted");
  check(appended.length === 1 && appended[0].src === `https://www.googletagmanager.com/gtag/js?id=${GA4}` && appended[0].async === true,
    "a website page requests gtag.js once, async, with the GA4 id",
    `a website page requested ${JSON.stringify(appended)}`);
  const order = calls(page).filter((c) => c[0] === "consent" || c[0] === "config").map((c) => `${c[0]} ${c[1]}`);
  check(order[0] === "consent default" && JSON.stringify(order.slice(1)) === JSON.stringify([`config ${ADS}`, `config ${GA4}`, `config ${ADS}/${CALL}`]),
    "the consent default comes first, then Google Ads, GA4 and the call label are configured",
    `consent and config calls in order: ${JSON.stringify(order)}`);
  consent.applyConsent("granted");
  const pv = pageViews(page);
  check(pv.length === 1 && pv[0].analytics === "granted",
    "a hard load with a stored Accept sends exactly one page view, granted",
    `a hard load with a stored Accept sends ${pv.length} page views: ${show(pv)}`);
}
{
  const { page } = load("/contact", "denied");
  consent.applyConsent("denied");
  const pv = pageViews(page);
  check(pv.length === 1 && pv[0].analytics === "denied",
    "a hard load with a stored Decline sends exactly one page view, denied",
    `a hard load with a stored Decline sends ${pv.length} page views: ${show(pv)}`);
}
{
  const { page } = load("/", null);
  consent.recordAnswer("granted");
  const pv = pageViews(page);
  check(pv.length === 2 && pv[0].analytics === "denied" && pv.filter((p) => p.analytics === "granted").length === 1,
    "a first visit then Accept: the denied page view, and exactly one more once granted",
    `a first visit then Accept sends ${show(pv)}`);
  const granted = calls(page).find((c) => c[0] === "consent" && c[1] === "update");
  check(granted?.[2]?.ad_storage === "granted" && granted[2].analytics_storage === "granted",
    "Accept updates consent to granted", `Accept sent ${JSON.stringify(granted)}`);
}
{
  const { page } = load("/", null);
  consent.recordAnswer("denied");
  const pv = pageViews(page);
  check(pv.length === 1 && pv[0].analytics === "denied",
    "a first visit then Decline sends exactly one page view, denied",
    `a first visit then Decline sends ${show(pv)}`);
}

/* ── 2. Staff pages get nothing ──────────────────────────────────── */
{
  const roots = STAFF_PATH.source.match(/\(\?:([^)]*)\)/)?.[1]?.split("|") ?? [];
  check(["admin", "crm", "ga4-setup", "gbp-setup"].every((r) => roots.includes(r)),
    `the staff list covers /admin, /crm, /ga4-setup and /gbp-setup (${roots.length} in all)`,
    `the staff list in src/lib/staff-paths.ts is ${JSON.stringify(roots)}`);
  for (const root of roots) {
    for (const path of [`/${root}`, `/${root}/`, `/${root}/x/y`]) {
      for (const stored of [null, "granted"]) {
        const { page, appended } = load(path, stored);
        const quiet = appended.length === 0 && page.gtag === undefined && page.dataLayer === undefined;
        if (!quiet) fail(`${path} (stored ${stored}): requested ${JSON.stringify(appended.map((a) => a.src))}, gtag ${typeof page.gtag}, dataLayer ${JSON.stringify(calls(page))}`);
      }
    }
  }
  ok(`no script, no gtag and no dataLayer on ${roots.length * 3} staff paths, answered or not`);
  for (const path of ["/crmsomething", "/administration", "/ga4-setup-guide", "/services/admin", "/"]) {
    const { page, appended } = load(path, "granted");
    if (appended.length !== 1 || !calls(page).some((c) => c[0] === "config" && c[1] === GA4)) fail(`${path} is a website page and was not tracked`);
  }
  ok("lookalike website paths (/crmsomething, /administration, /services/admin) are tracked as normal");
}

/* ── 3. The wiring ───────────────────────────────────────────────── */
const source = (rel) => {
  const text = readFileSync(join(ROOT, rel), "utf8");
  return { text, sf: ts.createSourceFile(rel, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX) };
};
const walk = (node, fn) => { fn(node); ts.forEachChild(node, (n) => walk(n, fn)); };
const calledName = (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) ? n.expression.text : null;
const enclosing = (node, test) => { for (let n = node.parent; n; n = n.parent) if (test(n)) return n; return null; };

{
  const { text } = source("src/app/layout.tsx");
  check(/gtagBootstrap\(/.test(text) && !/gtag\/js|gtag\(/.test(text.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "")),
    "layout.tsx renders the bootstrap and no gtag script or call of its own",
    "layout.tsx no longer renders gtagBootstrap, or loads or calls gtag itself; the staff rule and the page-view count would be bypassed");
}
{
  const { sf } = source("src/components/CookieBanner.tsx");
  const found = [];
  walk(sf, (n) => {
    const name = calledName(n);
    if (!name) return;
    if (name === "recordAnswer" || name === "applyConsent" || name === "decide") {
      const fn = enclosing(n, (p) => ts.isFunctionDeclaration(p) && p.name);
      const effect = enclosing(n, (p) => ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === "useEffect");
      const loadsStored = !!effect && /\bloadStored\(\)/.test(effect.getText());
      found.push({ name, inFn: fn?.name?.text, inStoredEffect: loadsStored });
    }
  });
  const record = found.filter((f) => f.name === "recordAnswer");
  const applyOnLoad = found.filter((f) => f.name === "applyConsent" && f.inStoredEffect);
  const pressOnLoad = found.filter((f) => (f.name === "recordAnswer" || f.name === "decide") && f.inStoredEffect);
  check(record.length === 1 && record[0].inFn === "decide" && applyOnLoad.length === 1 && pressOnLoad.length === 0,
    "CookieBanner applies a stored decision with applyConsent, and calls recordAnswer only from decide()",
    `CookieBanner wiring: ${JSON.stringify(found)}; a stored decision must go through applyConsent alone`);
}
{
  const { sf } = source("src/components/SiteChrome.tsx");
  const TRACKERS = ["GclidCapture", "PhoneClickTracker", "EngagementTracker", "ChatGptPixel", "CookieBanner", "VisitBeacon"];
  const seen = new Map();
  let staffFromRule = false;
  walk(sf, (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === "staff" && n.initializer && calledName(n.initializer) === "isStaffPath") staffFromRule = true;
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && TRACKERS.includes(n.tagName.getText())) {
      const guard = enclosing(n, (p) => ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
        ts.isPrefixUnaryExpression(p.left) && p.left.operator === ts.SyntaxKind.ExclamationToken && p.left.operand.getText() === "staff");
      seen.set(n.tagName.getText(), [...(seen.get(n.tagName.getText()) ?? []), !!guard]);
    }
  });
  const unguarded = TRACKERS.filter((t) => !seen.has(t) || seen.get(t).some((g) => !g));
  check(staffFromRule && unguarded.length === 0,
    `SiteChrome mounts ${TRACKERS.join(", ")} only behind !staff, from isStaffPath`,
    `SiteChrome: staff from isStaffPath ${staffFromRule}; mounted without the !staff guard, or missing: ${unguarded.join(", ")}`);
}

/* ── 4. Never the dead stream's id ───────────────────────────────── */
{
  const env = (process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "").trim();
  check(env !== DEAD_GA4,
    env ? `the build's GA4 id is ${env}, not ${DEAD_GA4}` : "no GA4 id in this build's environment to check (Vercel provides it)",
    `NEXT_PUBLIC_GA4_MEASUREMENT_ID is ${DEAD_GA4}, whose gtag/js answers 404; the site configures G-N8886QEJ70`);
}

if (bad) {
  console.error(`\n${bad} problem${bad === 1 ? "" : "s"} with the Google tag bootstrap.\n`);
  process.exit(1);
}
console.log("\nOne page view per load, one more on Accept, and no Google tag on a staff page.\n");
