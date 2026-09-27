#!/usr/bin/env node
/**
 * The leads sheet gets each lead once: never twice, and not silently lost.
 *
 * logLead retried an append that timed out, after a 1.5 s pause. A timeout is
 * not a missing row: the Apps Script keeps running after the site stops
 * listening and can still append the row, and google-apps-script.js doPost
 * dedupes only Stripe order ids (cs_live_ / cs_test_). So the retry could
 * write a contact or free consultation twice. When read on 27 September 2026
 * the sheet held five pairs of identical same-minute rows, which is what that
 * retry produces (whether each pair came from it cannot now be told).
 *
 * Now a second append for anything but a Stripe order goes out only after
 * the sheet has been read back and the row is absent, once the first append
 * can no longer be running (SHEET_SETTLE_MS). A caller that cannot wait that
 * long gets no second append and an alert that says the row may be there.
 *
 * This compiles the real src/lib/leads.ts and runs it against a fake sheet
 * that behaves as the real one was read to behave (Date column in Dublin
 * minutes from the payload's timestamp, phones turned into numbers), on a fake
 * clock, through the outages that matter. It fails if any scenario ends with
 * the row on the sheet twice, or absent without an alert, or if the alert
 * reaches anyone but FourWinds (Oscar's decision, 27 September 2026), or if a
 * route that runs logLead in the background declares a maxDuration too short
 * for it.
 *
 *   node scripts/check-sheet-retry.mjs
 *   CHECK_ROOT=/path/to/another/checkout node scripts/check-sheet-retry.mjs
 */
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(process.env.CHECK_ROOT || join(dirname(fileURLToPath(import.meta.url)), ".."));
const FOURWINDS = "oscar@fourwindsdigital.com";
const problems = [];

/* ── Compile the real modules ───────────────────────────────────────────── */
const dir = mkdtempSync(join(tmpdir(), "sheet-retry-"));
const compile = (rel) =>
  ts.transpileModule(readFileSync(join(ROOT, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;

const leadsSrc = readFileSync(join(ROOT, "src/lib/leads.ts"), "utf8");
if (/\balertTo\b/.test(leadsSrc)) problems.push("src/lib/leads.ts uses alertTo(): the sheet alert goes to FourWinds only, never Nigel");
let leadsJs = compile("src/lib/leads.ts");
const importsBefore = leadsJs;
leadsJs = leadsJs
  .replace(/from\s+["']@\/lib\/business-constants["']/g, 'from "./business-constants.mjs"')
  .replace(/import\(\s*["']resend["']\s*\)/g, 'import("./resend.mjs")');
if (leadsJs === importsBefore) problems.push("src/lib/leads.ts: found neither its business-constants import nor its resend import, so this check is reading the wrong thing");
writeFileSync(join(dir, "leads.mjs"), leadsJs);
writeFileSync(join(dir, "business-constants.mjs"), compile("src/lib/business-constants.ts"));
writeFileSync(
  join(dir, "resend.mjs"),
  `export class Resend { constructor() { this.emails = { send: async (m) => { globalThis.__sent.push(m); return { data: { id: "stub" }, error: null }; } }; } }`,
);

/* ── A fake clock that also drives setTimeout ───────────────────────────── */
const real = { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout, setImmediate: globalThis.setImmediate };
/* A real date, so the Dublin minute the sheet shows is a 2026 one. */
const BASE = Date.parse("2026-09-27T10:05:30Z");
const clock = { t: BASE, seq: 0, timers: [] };
const fakeSetTimeout = (fn, ms) => {
  const id = ++clock.seq;
  clock.timers.push({ id, at: clock.t + Math.max(0, Number(ms) || 0), fn });
  return id;
};
const fakeClearTimeout = (id) => { clock.timers = clock.timers.filter((x) => x.id !== id); };
const deps = { now: () => clock.t, sleep: (ms) => new Promise((r) => fakeSetTimeout(r, ms)) };

/** Run a promise to completion, moving the clock to the next timer whenever nothing else can happen. */
async function drive(promise) {
  let done = false, value, error;
  promise.then((v) => { done = true; value = v; }, (e) => { done = true; error = e; });
  for (let guard = 0; guard < 100_000; guard++) {
    for (let i = 0; i < 20 && !done; i++) await new Promise((r) => real.setImmediate(r));
    if (done) break;
    clock.timers.sort((a, b) => a.at - b.at || a.id - b.id);
    const next = clock.timers.shift();
    if (!next) throw new Error("stalled: waiting on something no timer will ever finish");
    clock.t = Math.max(clock.t, next.at);
    next.fn();
  }
  if (!done) throw new Error("did not finish");
  if (error) throw error;
  return value;
}

/* ── The fake sheet ─────────────────────────────────────────────────────── */
/** "yyyy-MM-dd HH:mm" in Dublin, computed independently of leads.ts. */
const dublin = (iso) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Dublin" }).slice(0, 16);

function sheetFor(plan) {
  const sheet = { rows: [], appends: [], reads: 0 };
  const fetch = (url, init = {}) =>
    new Promise((resolveFetch, reject) => {
      if ((init.method || "GET") === "POST") {
        const payload = JSON.parse(init.body);
        const n = sheet.appends.length;
        sheet.appends.push(clock.t);
        const step = plan.appends[Math.min(n, plan.appends.length - 1)];
        /* The script runs to the end whether or not anyone is still listening.
           Like doPost, it skips a Stripe order id it already has. */
        if (step.writes) {
          fakeSetTimeout(() => {
            if (/^cs_(live|test)_/.test(String(payload.orderId || "")) && sheet.rows.some((r) => r.orderId === payload.orderId)) return;
            sheet.rows.push(payload);
          }, step.writeAfter ?? step.answerAfter);
        }
        let answer = null;
        if (Number.isFinite(step.answerAfter)) {
          answer = fakeSetTimeout(
            () => {
              const status = step.status ?? 200;
              resolveFetch(new Response(status === 200 ? JSON.stringify({ success: true }) : "Internal error", { status }));
            },
            step.answerAfter,
          );
        }
        init.signal?.addEventListener("abort", () => {
          if (answer) fakeClearTimeout(answer);
          const e = new Error("This operation was aborted");
          e.name = "AbortError";
          reject(e);
        });
        return;
      }
      sheet.reads++;
      const read = plan.read ?? { ok: true };
      fakeSetTimeout(() => {
        if (!read.ok) return resolveFetch(new Response("Service unavailable", { status: 503 }));
        const type = new URL(url).searchParams.get("type");
        /* doGet: Date back as Dublin minutes, phone as the number Sheets made of it. */
        const rows = sheet.rows
          .filter((p) => !type || p.type === type)
          .map((p) => ({
            ...p,
            date: dublin(p.timestamp),
            phone: p.phone ? Number(String(p.phone).replace(/\D/g, "")) : "",
            email: p.email ?? "",
            name: p.name ?? "",
            notes: p.notes ?? "",
          }))
          .reverse();
        resolveFetch(new Response(JSON.stringify({ rows, count: rows.length }), { status: 200 }));
      }, read.after ?? 2_000);
    });
  return { sheet, fetch };
}

/* ── Scenarios ──────────────────────────────────────────────────────────── */
process.env.GOOGLE_SHEET_WEBHOOK_URL = "https://sheet.invalid/exec";
process.env.GOOGLE_SHEET_READ_TOKEN = "check-token";
process.env.RESEND_API_KEY = "re_check";
process.env.RESEND_FROM_EMAIL = "site@check.invalid";
process.env.CONTACT_TO_EMAIL = "nigel@check.invalid";

const leads = await import(pathToFileURL(join(dir, "leads.mjs")).href);
const constants = await import(pathToFileURL(join(dir, "business-constants.mjs")).href);
if (constants.SHEET_ALERT_TO !== FOURWINDS) problems.push(`business-constants SHEET_ALERT_TO is ${JSON.stringify(constants.SHEET_ALERT_TO)}, not ${FOURWINDS}`);
if (!leads.SHEET_BACKGROUND || !leads.SHEET_SETTLE_MS) problems.push("src/lib/leads.ts does not export SHEET_BACKGROUND and SHEET_SETTLE_MS");
/* Without them, run the scenarios anyway with the values this was written
   for, so a missing export still shows what the code does to the sheet. */
const BG = leads.SHEET_BACKGROUND ?? { firstAttemptMs: 30_000, budgetMs: 8 * 60_000 };
const SETTLE = leads.SHEET_SETTLE_MS ?? 6.5 * 60_000;

const contact = {
  type: "Contact Enquiry",
  name: "Check Person",
  email: "check@example.invalid",
  phone: "087 123 4567",
  notes: "General Enquiry: a check",
  source: "smart-space.ie",
};
const stripeOrder = { ...contact, type: "Paid Order", orderId: "cs_live_check123", amount: 199, notes: undefined };
const HANG = { answerAfter: Infinity, writes: false };

const scenarios = [
  // name, record, options, plan, expected
  ["background: the sheet answers in 15 s", contact, BG,
    { appends: [{ answerAfter: 15_000, writes: true }] }, { rows: 1, appends: 1, ok: true, alert: false }],
  ["background: the append times out but the row lands at 45 s", contact, BG,
    { appends: [{ answerAfter: Infinity, writes: true, writeAfter: 45_000 }] }, { rows: 1, appends: 1, ok: true, alert: false }],
  ["background: the row lands five minutes late", contact, BG,
    { appends: [{ answerAfter: Infinity, writes: true, writeAfter: 5 * 60_000 }] }, { rows: 1, appends: 1, ok: true, alert: false }],
  ["background: the first append never lands, the second does", contact, BG,
    { appends: [HANG, { answerAfter: 2_000, writes: true }] }, { rows: 1, appends: 2, ok: true, alert: false, secondAfterSettle: true }],
  ["background: the sheet cannot be read and the row did land", contact, BG,
    { appends: [{ answerAfter: Infinity, writes: true, writeAfter: 40_000 }], read: { ok: false } }, { rows: 1, appends: 1, ok: false, alert: true }],
  ["background: the sheet cannot be read and the row never lands", contact, BG,
    { appends: [HANG], read: { ok: false } }, { rows: 0, appends: 1, ok: false, alert: true }],
  ["background: both appends hang and neither lands", contact, BG,
    { appends: [HANG, HANG] }, { rows: 0, appends: 2, ok: false, alert: true, secondAfterSettle: true }],
  ["background: the script answers HTTP 500", contact, BG,
    { appends: [{ answerAfter: 3_000, writes: false, status: 500 }] }, { rows: 0, appends: 1, ok: false, alert: true }],
  ["waiting caller: the sheet answers in 3 s", contact, {},
    { appends: [{ answerAfter: 3_000, writes: true }] }, { rows: 1, appends: 1, ok: true, alert: false }],
  ["waiting caller: the append times out and the row lands at 20 s", contact, {},
    { appends: [{ answerAfter: Infinity, writes: true, writeAfter: 20_000 }] }, { rows: 1, appends: 1, ok: false, alert: true }],
  ["waiting caller: the append times out and the row lands at 13 s", contact, {},
    { appends: [{ answerAfter: Infinity, writes: true, writeAfter: 13_000 }] }, { rows: 1, appends: 1, ok: true, alert: false }],
  ["waiting caller: a Stripe order is sent again at once, and the script skips the repeat", stripeOrder, {},
    { appends: [{ answerAfter: Infinity, writes: true, writeAfter: 14_000 }, { answerAfter: 1_000, writes: true }] }, { rows: 1, appends: 2, ok: true, alert: false }],
];

let ran = 0;
globalThis.setTimeout = fakeSetTimeout;
globalThis.clearTimeout = fakeClearTimeout;
/* logLead narrates every outage; the scenarios below say what matters. */
const quiet = { log: console.log, warn: console.warn, error: console.error };
console.log = console.warn = console.error = () => {};
try {
  for (const [name, record, options, plan, want] of scenarios) {
    clock.t = BASE; clock.timers = []; globalThis.__sent = [];
    const { sheet, fetch } = sheetFor(plan);
    globalThis.fetch = fetch;
    const budget = options.budgetMs ?? 24_000;
    let result;
    try {
      result = await drive(leads.logLead({ ...record }, { ...options, deps }));
    } catch (e) {
      problems.push(`${name}: logLead threw or stalled: ${e.message}`);
      continue;
    }
    ran++;
    const took = clock.t - BASE;
    // Let every write the script was still doing finish, then count rows.
    while (clock.timers.length) { clock.timers.sort((a, b) => a.at - b.at); const n = clock.timers.shift(); clock.t = Math.max(clock.t, n.at); n.fn(); }
    const alerts = globalThis.__sent;
    const fail = (why) => problems.push(`${name}: ${why} (result: ${JSON.stringify(result)})`);
    if (sheet.rows.length > 1) fail(`the lead is on the sheet ${sheet.rows.length} times`);
    if (sheet.rows.length !== want.rows) fail(`expected ${want.rows} row(s) on the sheet, found ${sheet.rows.length}`);
    if (sheet.appends.length !== want.appends) fail(`expected ${want.appends} append(s), saw ${sheet.appends.length}`);
    if (!result || result.ok !== want.ok) fail(`expected ok=${want.ok}`);
    if (want.alert && alerts.length !== 1) fail(`expected one alert, saw ${alerts.length}`);
    if (!want.alert && alerts.length) fail(`expected no alert, saw ${alerts.length}`);
    if (sheet.rows.length === 0 && !alerts.length) fail("the lead is not on the sheet and nobody was told");
    for (const a of alerts) {
      const to = [a.to, a.cc, a.bcc].flat().filter(Boolean).map(String);
      if (to.length !== 1 || to[0] !== FOURWINDS) fail(`the alert went to ${JSON.stringify(to)}, not ${FOURWINDS} alone`);
    }
    if (took > budget) fail(`took ${took} ms, past its ${budget} ms budget`);
    if (want.secondAfterSettle && !(sheet.appends[1] - sheet.appends[0] >= SETTLE)) {
      fail(`the second append went out ${Math.round((sheet.appends[1] - sheet.appends[0]) / 1000)} s after the first, before it could have settled (${SETTLE / 1000} s)`);
    }
  }
} finally {
  Object.assign(console, quiet);
  globalThis.setTimeout = real.setTimeout;
  globalThis.clearTimeout = real.clearTimeout;
  rmSync(dir, { recursive: true, force: true });
}
if (ran !== scenarios.length && !problems.length) problems.push("not every scenario ran");

/* ── Routes that run the sheet in the background must live long enough ──── */
const routes = [];
const collect = (d) => {
  if (!existsSync(d)) return;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) collect(p);
    else if (e.name === "route.ts") routes.push(p);
  }
};
collect(join(ROOT, "src/app"));
let backgroundRoutes = 0;
for (const abs of routes) {
  const src = readFileSync(abs, "utf8");
  if (!/\bSHEET_BACKGROUND\b/.test(src)) continue;
  backgroundRoutes++;
  const m = /export\s+const\s+maxDuration\s*=\s*(\d+)/.exec(src);
  const need = Math.ceil(((BG?.budgetMs ?? 0) + 60_000) / 1000);
  if (!m || Number(m[1]) < need) {
    problems.push(`${relative(ROOT, abs)}: runs logLead with SHEET_BACKGROUND but declares maxDuration ${m ? m[1] : "(none)"}; it needs at least ${need} s or the platform stops the sheet work part way`);
  }
}
if (!backgroundRoutes) problems.push("no route runs logLead with SHEET_BACKGROUND, so the lead routes changed or this check is reading the wrong thing");

if (problems.length) {
  console.error("check-sheet-retry: the leads sheet must get each lead once, never twice, and a lead it cannot confirm must reach FourWinds:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`check-sheet-retry: ${ran} sheet outages, each lead on the sheet at most once and never lost without an alert to FourWinds; ${backgroundRoutes} background routes live long enough`);
