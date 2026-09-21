#!/usr/bin/env node
/**
 * A chart must know what it is counting.
 *
 * ── THE FAULT ────────────────────────────────────────────────────
 *
 * BarChart put a euro sign on every axis tick and every bar label, whatever
 * it had been handed. "Visits, week by week" drew a euro axis over a count of
 * visits and labelled the tallest bar EUR 66, while its own readout
 * underneath said "VISITS 66". Two contradictory labels on one number, on a
 * screen a client uses to decide where money goes.
 *
 * It is invisible in review because the component is correct, the caller is
 * correct, and the defect only exists in the pairing. So it is checked by
 * pairing: read what the chart says it is drawing, and insist the units match.
 *
 *   node scripts/check-chart-units.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");

/* Words that decide what a series is. Kept explicit rather than clever: a
   list somebody has to extend is better than a heuristic nobody can predict. */
const COUNTS = /\b(visit|visits|click|clicks|session|sessions|scan|scans|lead|leads|enquir|conversion|conversions|order count|people|view|views|impression|impressions|call|calls)\b/i;
const MONEY = /\b(revenue|spend|spent|kept|money|euro|eur|paid|takings|value|cost|bill|invoice|fee|fees|refund|refunds|amount)\b/i;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const problems = [];
let checked = 0;

for (const file of walk(SRC)) {
  const text = readFileSync(file, "utf8");
  /* Each <BarChart ... /> or <BarChart ...> element, opening tag only. */
  const re = /<BarChart\b([\s\S]*?)(\/>|>)/g;
  let m;
  while ((m = re.exec(text))) {
    checked++;
    const attrs = m[1];
    const line = text.slice(0, m.index).split("\n").length;
    const where = `${relative(ROOT, file)}:${line}`;

    const aria = /ariaLabel=(?:\{`([^`]*)`\}|"([^"]*)")/.exec(attrs);
    const label = (aria?.[1] ?? aria?.[2] ?? "").trim();
    if (!label) { problems.push(`${where}: a chart with no ariaLabel, so neither a reader nor this check can tell what it draws`); continue; }

    const units = /units=(?:"([a-z]+)"|\{"([a-z]+)"\})/.exec(attrs);
    const declared = units?.[1] ?? units?.[2] ?? "money";   // the component's default

    const looksCount = COUNTS.test(label);
    const looksMoney = MONEY.test(label);

    if (looksCount && !looksMoney && declared !== "count") {
      problems.push(`${where}: "${label}"\n      draws a count and would be labelled in euro. Pass units="count".`);
    }
    if (looksMoney && !looksCount && declared !== "money") {
      problems.push(`${where}: "${label}"\n      draws money and would be labelled as a plain number. Pass units="money".`);
    }
    if (!looksCount && !looksMoney) {
      problems.push(`${where}: "${label}"\n      says neither money nor a count, so nobody can tell whether its axis is right.\n      Name the thing in the ariaLabel, or extend the word lists in this check.`);
    }
  }
}

if (problems.length) {
  console.error(`\n${problems.length} chart${problems.length === 1 ? "" : "s"} whose units cannot be trusted:\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}
console.log(`${checked} bar chart${checked === 1 ? "" : "s"} checked, every one labelled in the units it actually draws.`);
