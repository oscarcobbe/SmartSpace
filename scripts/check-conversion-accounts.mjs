#!/usr/bin/env node
/**
 * A page belonging to one business may not record its sales into another's
 * Google Ads account.
 *
 * ── THE FAULT ────────────────────────────────────────────────────
 *
 * /smartcareliving-payment-success fired AW-17978501655, which is Smart
 * Space's account, so every SmartCare Living sale through it was credited to
 * the wrong business and SCL's own account showed nothing. The GTM container
 * had the identical fault and was repointed in September; this page was
 * missed, because nothing links to it and nobody went looking.
 *
 * It is invisible to a typecheck, a build and a test, because a conversion id
 * is a string and every string is valid. The only thing that can catch it is a
 * rule about which id belongs where.
 *
 *   node scripts/check-conversion-accounts.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Which account each business owns. The whole check is this table. */
const OWNS = [
  { who: "SmartCare Living", path: /smartcareliving/i, account: "18445485417" },
  { who: "Smart Space", path: /smartspace|smart-space/i, account: "17978501655" },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

const problems = [];
let checked = 0;

for (const file of walk(join(ROOT, "src"))) {
  const rel = relative(ROOT, file);
  /* Only files whose path names a business. A shared component carrying both
     ids is a different question and is not this check's business. */
  const owner = OWNS.find((o) => o.path.test(rel));
  if (!owner) continue;

  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/AW-(\d{9,})\/[A-Za-z0-9_-]+/g)) {
    checked++;
    if (m[1] !== owner.account) {
      const line = text.slice(0, m.index).split("\n").length;
      const other = OWNS.find((o) => o.account === m[1]);
      problems.push(
        `${rel}:${line}\n      belongs to ${owner.who} and records into AW-${m[1]}` +
        (other ? `, which is ${other.who}'s account.` : ", which is not an account this check knows.") +
        `\n      ${owner.who}'s account is AW-${owner.account}.`);
    }
  }
}

if (problems.length) {
  console.error(`\n${problems.length} conversion${problems.length === 1 ? "" : "s"} recorded into the wrong business:\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}
console.log(`${checked} conversion id${checked === 1 ? "" : "s"} checked, each one recording into the business that owns the page.`);
