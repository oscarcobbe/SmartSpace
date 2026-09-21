#!/usr/bin/env node
/**
 * One page, one row.
 *
 * GA4 reports the homepage under more than one key, so the Visitors list
 * showed "Homepage" twice: 127 visits at 76 per cent engaged, and 23 at
 * nought. The page was normalising the name when it printed it, long after
 * the two had been counted as different pages.
 *
 * Two rows with the same name and different numbers tells a reader the screen
 * does not know what it is counting, and they are right.
 *
 *   node scripts/check-landing-merge.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(ROOT, ".merge-"));

/* ga4.ts imports the CRM database client, which this has no business
   touching. Only the pure function is wanted, so it is lifted out. */
const src = readFileSync(join(ROOT, "src/lib/crm/ga4.ts"), "utf8");
const start = src.indexOf("export function mergeLanding");
if (start < 0) { console.error("mergeLanding is gone from ga4.ts"); rmSync(dir, { recursive: true, force: true }); process.exit(1); }
const close = src.indexOf("\n}", start);
if (close < 0) { console.error("could not find the end of mergeLanding"); process.exit(1); }
const end = close + 2;
const js = ts.transpileModule(src.slice(start, end), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const file = join(dir, "merge.mjs");
writeFileSync(file, js);
const { mergeLanding } = await import(pathToFileURL(file).href);
rmSync(dir, { recursive: true, force: true });

const row = (key, sessions, engaged) => ({ key: [key], values: [sessions, engaged] });
const fail = [];
const check = (what, rows, expect) => {
  const got = mergeLanding(rows);
  const seen = new Set();
  for (const r of got) {
    if (seen.has(r.path)) fail.push(`${what}: "${r.path}" appears twice after merging`);
    seen.add(r.path);
  }
  for (const [path, sessions] of Object.entries(expect)) {
    const f = got.find((r) => r.path === path);
    if (!f) { fail.push(`${what}: expected a row for "${path}" and there is none`); continue; }
    if (f.sessions !== sessions) fail.push(`${what}: "${path}" has ${f.sessions} visits, expected ${sessions}`);
  }
};

/* The real fault: GA4 gives the homepage two keys. */
check("homepage under two keys", [row("/", 127, 96), row("", 23, 0)], { "/": 150 });
/* A trailing slash is the same page. */
check("trailing slash", [row("/services", 48, 43), row("/services/", 5, 4)], { "/services": 53 });
/* A query string is the same page. */
check("query string", [row("/ring-installation", 17, 16), row("/ring-installation?gclid=abc", 4, 4)], { "/ring-installation": 21 });
/* And pages that really are different stay different. */
check("distinct pages stay distinct",
  [row("/services", 48, 43), row("/services/installation-only", 20, 16)],
  { "/services": 48, "/services/installation-only": 20 });
/* Busiest first, so the list reads as a list. */
const order = mergeLanding([row("/a", 5, 5), row("/b", 50, 40), row("/c", 20, 10)]).map((r) => r.path);
if (order.join(",") !== "/b,/c,/a") fail.push(`order: got ${order.join(",")}, expected /b,/c,/a`);

if (fail.length) {
  console.error(`\n${fail.length} problem${fail.length === 1 ? "" : "s"} merging landing pages:\n`);
  for (const f of fail) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log("Landing pages merge before they are counted: one page, one row, busiest first.");
