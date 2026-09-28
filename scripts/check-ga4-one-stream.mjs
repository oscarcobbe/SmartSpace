#!/usr/bin/env node
/**
 * Every GA4 report the CRM asks for reads one data stream, never the whole
 * property.
 *
 * ── THE FAULT ────────────────────────────────────────────────────
 *
 * Smart Space's GA4 property 534445467 has two web streams, 14510064208
 * (G-JR2WXNSLEL, the original) and 15470580335 (G-N8886QEJ70, the one the
 * site configures). The Google Ads tag still lists G-JR2WXNSLEL as a
 * destination, so every browser event reaches both. From 13 to 26 September
 * 2026 each stream had page_view 524, generate_lead 5 and purchase 4, and the
 * CRM asked GA4 about the property with no stream filter, so at 23:42 on 27
 * September its 7 day view showed 709 page views where the site had 354, 8
 * leads where there were 4, 4 sales where there were 2, and 124 visits where
 * there were 103.
 *
 * A typecheck, a build and a glance at the page cannot catch it: every number
 * is a plausible number. What can be checked is the request itself.
 *
 * ── WHAT THIS DOES ───────────────────────────────────────────────
 *
 *  1. Finds every file under src that talks to the GA4 Data API, and fails
 *     unless the only one is src/lib/crm/ga4.ts, which names the API host
 *     once, inside runReport. A second route to the API would be a second
 *     place to forget the filter.
 *  2. Finds every function in ga4.ts that calls runReport, and fails if one is
 *     not exercised below, so a new report cannot slip past step 3 by being
 *     somewhere this check does not look.
 *  3. Runs those functions for every site with fetch replaced, captures each
 *     request that would have gone to Google, and evaluates its
 *     dimensionFilter against rows from every stream the property has. A
 *     request passes only if rows from any other stream are rejected
 *     whatever the rest of the filter says, and rows from the site's own
 *     stream are not.
 *  4. Does the same for reportRequest given a report that brings its own
 *     filter, which is where a spread in the wrong order would drop the
 *     stream filter.
 *
 * Nothing leaves this machine: the credential is a key generated here and
 * fetch never reaches the network.
 *
 *   node scripts/check-ga4-one-stream.mjs
 */
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateKeyPairSync } from "node:crypto";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GA4_FILE = "src/lib/crm/ga4.ts";

/**
 * The streams each property has, from the GA4 Admin API on 27 September
 * 2026, and the one the CRM must read. This table is the rule. If the site
 * moves to another stream, or a stream is added, it changes here and in
 * GA4_STREAM together, on purpose.
 */
const STREAMS = {
  "534445467": { reads: "15470580335", others: ["14510064208"] },
  "535647893": { reads: "14789055321", others: [] },
};

const fail = [];

/* ── 1. One door to the Data API ─────────────────────────────────── */

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}

const DATA_API = [/analyticsdata\.googleapis\.com/g, /@google-analytics\/data/g, /BetaAnalyticsDataClient/g];
const doors = [];
for (const file of walk(join(ROOT, "src"))) {
  const text = readFileSync(file, "utf8");
  let hits = 0;
  for (const re of DATA_API) hits += (text.match(re) ?? []).length;
  if (hits) doors.push({ file: relative(ROOT, file), hits });
}
if (doors.length === 0) {
  fail.push(`nothing under src talks to the GA4 Data API any more, so this check has nothing to check; if that is deliberate, remove it from the build`);
}
for (const d of doors) {
  if (d.file !== GA4_FILE) {
    fail.push(`${d.file} talks to the GA4 Data API directly. Ask through runReport in ${GA4_FILE}, which applies the stream filter`);
  } else if (d.hits !== 1) {
    fail.push(`${GA4_FILE} names the GA4 Data API ${d.hits} times; it should be once, inside runReport, so every report is filtered in the same place`);
  }
}

/* ── 2. Every function that asks for a report ────────────────────── */

const src = readFileSync(join(ROOT, GA4_FILE), "utf8");
const sf = ts.createSourceFile(GA4_FILE, src, ts.ScriptTarget.ES2022, true);

/** The name of the top-level function a node sits in. */
function topLevelName(node) {
  let n = node;
  let name = null;
  while (n && n.parent) {
    if (ts.isFunctionDeclaration(n) && n.name && ts.isSourceFile(n.parent)) return n.name.text;
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.parent?.parent && ts.isVariableStatement(n.parent.parent) && ts.isSourceFile(n.parent.parent.parent)) name = n.name.text;
    n = n.parent;
  }
  return name ?? "(top level)";
}

const callers = new Map();
let apiIn = null;
(function visit(node) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "runReport") {
    const who = topLevelName(node);
    callers.set(who, (callers.get(who) ?? 0) + 1);
  }
  if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node)) && /analyticsdata\.googleapis\.com/.test(node.text)) {
    apiIn = topLevelName(node);
  }
  ts.forEachChild(node, visit);
})(sf);

if (doors.some((d) => d.file === GA4_FILE) && apiIn !== "runReport") {
  fail.push(`${GA4_FILE} calls the GA4 Data API from ${apiIn ?? "somewhere this check cannot place"}, not from runReport`);
}

/** How this check calls each function that asks GA4 for a report. */
const EXERCISE = {
  fetchInsights: async (m, site) => {
    for (const days of [7, 28, 90]) {
      const r = await m.fetchInsights(site, days);
      if (!r.ok) throw new Error(`fetchInsights("${site}", ${days}) did not succeed: ${r.reason}`);
    }
  },
  probeGa4: async (m, site) => { await m.probeGa4(site); },
};

if (callers.size === 0) fail.push(`nothing in ${GA4_FILE} calls runReport, so there are no reports to check`);
for (const who of callers.keys()) {
  if (!EXERCISE[who]) {
    fail.push(`${who} in ${GA4_FILE} asks GA4 for a report and this check does not run it. Add it to EXERCISE in scripts/check-ga4-one-stream.mjs`);
  }
}

/* ── 3 and 4. What is actually sent ──────────────────────────────── */

/**
 * Whether a GA4 FilterExpression keeps a row, knowing only its streamId and
 * date. Filters on any other field could go either way, so they are unknown
 * (null), and the logic is three-valued: a stream is only counted as shut out
 * if the filter rejects it whatever those other fields turn out to be.
 */
function keeps(expr, row) {
  if (!expr || typeof expr !== "object") return null;
  const all = (xs) => (Array.isArray(xs) ? xs : []).map((x) => keeps(x, row));
  if (expr.andGroup) {
    const r = all(expr.andGroup.expressions);
    return r.includes(false) ? false : r.includes(null) ? null : true;
  }
  if (expr.orGroup) {
    const r = all(expr.orGroup.expressions);
    return r.includes(true) ? true : r.includes(null) ? null : false;
  }
  if (expr.notExpression) {
    const r = keeps(expr.notExpression, row);
    return r === null ? null : !r;
  }
  if (!expr.filter) return null;
  const f = expr.filter;
  if (!(f.fieldName in row)) return null;
  const v = String(row[f.fieldName]);
  if (f.stringFilter) {
    const cs = !!f.stringFilter.caseSensitive;
    const a = cs ? v : v.toLowerCase();
    const b = cs ? String(f.stringFilter.value ?? "") : String(f.stringFilter.value ?? "").toLowerCase();
    switch (f.stringFilter.matchType ?? "EXACT") {
      case "EXACT": case "MATCH_TYPE_UNSPECIFIED": return a === b;
      case "BEGINS_WITH": return a.startsWith(b);
      case "ENDS_WITH": return a.endsWith(b);
      case "CONTAINS": return a.includes(b);
      case "FULL_REGEXP": return new RegExp(`^(?:${f.stringFilter.value})$`, cs ? "" : "i").test(v);
      case "PARTIAL_REGEXP": return new RegExp(f.stringFilter.value, cs ? "" : "i").test(v);
      default: return null;
    }
  }
  if (f.inListFilter) {
    const cs = !!f.inListFilter.caseSensitive;
    const vals = (f.inListFilter.values ?? []).map((x) => (cs ? String(x) : String(x).toLowerCase()));
    return vals.includes(cs ? v : v.toLowerCase());
  }
  const num = (x) => Number(x?.int64Value ?? x?.doubleValue);
  if (f.numericFilter) {
    const n = Number(v);
    const w = num(f.numericFilter.value);
    switch (f.numericFilter.operation) {
      case "EQUAL": return n === w;
      case "LESS_THAN": return n < w;
      case "LESS_THAN_OR_EQUAL": return n <= w;
      case "GREATER_THAN": return n > w;
      case "GREATER_THAN_OR_EQUAL": return n >= w;
      default: return null;
    }
  }
  if (f.betweenFilter) {
    const n = Number(v);
    return n >= num(f.betweenFilter.fromValue) && n <= num(f.betweenFilter.toValue);
  }
  if (f.emptyFilter) return v === "";
  return null;
}

/** Every way one request could read the wrong stream, as a list of faults. */
function judge(where, site, property, body, mod) {
  const out = [];
  const rule = STREAMS[property];
  if (!rule) return [`${where}: asks property ${property}, which this check has no stream table for`];
  const filter = body.dimensionFilter;
  if (!filter) return [...out, `${where}: sent with no dimensionFilter, so it reads every stream in property ${property}`];

  const earlier = mod.GA4_EARLIER_STREAM?.[site];
  const handover = earlier?.before;
  /* Dates on and after the handover, when both streams were receiving. With
     no handover, any date. */
  const bothLive = handover ? [handover, "20260926", "20991231"] : ["20250101", "20260926", "20991231"];
  const shutOut = [...rule.others, "1234567890"];

  for (const date of bothLive) {
    if (keeps(filter, { streamId: rule.reads, date }) === false) {
      out.push(`${where}: rejects its own stream ${rule.reads} on ${date}, so it would report nothing`);
    }
    for (const other of shutOut) {
      const k = keeps(filter, { streamId: other, date });
      if (k !== false) {
        out.push(`${where}: ${k === null ? "may keep" : "keeps"} rows from stream ${other} on ${date}, so the same events can be counted once per stream`);
      }
    }
  }
  if (earlier) {
    const dayBefore = String(Number(handover) - 1);
    for (const date of ["20260101", dayBefore]) {
      if (keeps(filter, { streamId: earlier.stream, date }) === false) {
        out.push(`${where}: rejects ${earlier.stream} on ${date}, before ${rule.reads} recorded anything, so a long window loses those days`);
      }
      for (const other of shutOut.filter((s) => s !== earlier.stream)) {
        if (keeps(filter, { streamId: other, date }) !== false) {
          out.push(`${where}: does not reject stream ${other} on ${date}`);
        }
      }
    }
  }
  return out;
}

let mod = null;
const dir = mkdtempSync(join(tmpdir(), "ga4-stream-"));
try {
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  writeFileSync(join(dir, "ga4.mjs"), js);

  /* A credential that signs, belongs to nobody, and never leaves here. */
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  process.env.GA_SERVICE_ACCOUNT_JSON = Buffer.from(
    JSON.stringify({ client_email: "check@example.invalid", private_key: privateKey }),
  ).toString("base64");

  let sent = [];
  const stray = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "check" }), { status: 200 });
    }
    const m = u.match(/^https:\/\/analyticsdata\.googleapis\.com\/v1beta\/properties\/(\d+):runReport$/);
    if (m) {
      sent.push({ property: m[1], body: JSON.parse(String(init?.body ?? "{}")) });
      return new Response(JSON.stringify({ rows: [] }), { status: 200 });
    }
    stray.push(u);
    throw new Error(`this check does not let ${u} be fetched`);
  };

  mod = await import(pathToFileURL(join(dir, "ga4.mjs")).href);
  const sites = Object.keys(mod.GA4_PROPERTY ?? {});
  if (sites.length === 0) fail.push(`${GA4_FILE} exports no GA4_PROPERTY sites, so there is nothing to run`);
  for (const site of sites) {
    const want = STREAMS[mod.GA4_PROPERTY[site]]?.reads;
    if (mod.GA4_STREAM?.[site] !== want) {
      fail.push(`GA4_STREAM in ${GA4_FILE} says ${mod.GA4_STREAM?.[site]} for ${site}, and the stream the site configures is ${want}`);
    }
  }

  for (const [who, run] of Object.entries(EXERCISE)) {
    if (!callers.has(who)) continue;
    for (const site of sites) {
      sent = [];
      try {
        await run(mod, site);
      } catch (err) {
        fail.push(`${who}("${site}") threw: ${err instanceof Error ? err.message : err}`);
        continue;
      }
      if (sent.length === 0) fail.push(`${who}("${site}") sent no report to GA4, so nothing about it was checked`);
      sent.forEach((req, i) => {
        if (req.property !== mod.GA4_PROPERTY[site]) {
          fail.push(`${who}("${site}") request ${i + 1} went to property ${req.property}, not ${mod.GA4_PROPERTY[site]}`);
        }
        fail.push(...judge(`${who}("${site}") request ${i + 1}`, site, req.property, req.body, mod));
      });
    }
  }

  /* A report with its own filter must still be confined to the stream. */
  if (typeof mod.reportRequest !== "function") {
    fail.push(`${GA4_FILE} no longer exports reportRequest, so a report that brings its own filter cannot be checked`);
  } else {
    const own = { filter: { fieldName: "eventName", inListFilter: { values: ["generate_lead", "purchase"] } } };
    for (const site of sites) {
      const body = mod.reportRequest(site, { dimensions: [{ name: "eventName" }], dimensionFilter: own });
      fail.push(...judge(`reportRequest("${site}") with an eventName filter of its own`, site, mod.GA4_PROPERTY[site], body, mod));
      if (keeps(body.dimensionFilter, { streamId: STREAMS[mod.GA4_PROPERTY[site]]?.reads, date: "20260926", eventName: "page_view" }) !== false) {
        fail.push(`reportRequest("${site}") dropped the report's own eventName filter`);
      }
    }
  }

  if (stray.length) fail.push(`reports tried to reach ${[...new Set(stray)].join(", ")}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fail.length) {
  const unique = [...new Set(fail)];
  console.error(`\n${unique.length} GA4 report problem${unique.length === 1 ? "" : "s"}:\n`);
  for (const f of unique) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(
  `GA4 reports read one stream: ${[...callers.entries()].map(([k, n]) => `${k} (${n} report${n === 1 ? "" : "s"})`).join(", ")}, every site, every request filtered.`,
);
