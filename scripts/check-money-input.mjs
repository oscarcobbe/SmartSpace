#!/usr/bin/env node
/**
 * The amount somebody types becomes the amount the customer is charged.
 *
 * Every case below is one a review actually caught, or one the fix has to keep
 * working. A payment link goes out by email the moment this is wrong, and
 * Stripe links stay payable, so there is no undo that the customer does not
 * see.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

/* The module is TypeScript, so it is transpiled the cheap way: strip the types
   this file uses and evaluate it. Keeps the check dependency-free. */
const src = readFileSync(new URL("../src/lib/crm/money-input.ts", import.meta.url), "utf8")
  .replace(/^export type MoneyParse[\s\S]*?\n\n/m, "")
  .replace(/: MoneyParse/g, "")
  .replace(/export function/g, "function")
  .replace(/raw: unknown/g, "raw")
  .replace(/let whole: string;/g, "let whole;")
  + "\nmodule.exports = { parseMoney };";
const require_ = createRequire(import.meta.url);
const Module = require_("node:module");
const m = new Module("money-input");
m._compile(src, "money-input.js");
const { parseMoney } = m.exports;

const CASES = [
  // [typed, expected cents, why it matters]
  ["479", 47900, "a whole number of euro"],
  ["479.00", 47900, "the ordinary way"],
  ["199.50", 19950, "cents with a dot"],
  ["199,50", 19950, "cents with a comma, the bug that charged 100x"],
  ["1,479.00", 147900, "thousands with a comma, cents with a dot"],
  ["1.479,00", 147900, "thousands with a dot, cents with a comma"],
  ["1479", 147900, "no separators at all"],
  ["1,479", 147900, "a thousands group and no cents"],
  ["€479.00", 47900, "pasted with the symbol"],
  [" 479.00 ", 47900, "pasted with spaces"],
  ["0.50", 50, "fifty cent"],
  ["199.5", 19950, "one digit of cents"],
  /* Not a mistake this can catch: "479.123" is the same grammar as "1.479"
     meaning one thousand four hundred and seventy nine, so refusing one would
     refuse the other. It parses as four hundred and seventy nine thousand,
     and the ceiling in payment-link.ts is what stops it: a job is not
     EUR 479,123. Asserted here so nobody "fixes" it into inconsistency. */
  ["479.123", 47912300, "a dot group of three is thousands, not cents"],
];

const REFUSED = [
  ["1.2.3", "two decimal points"],
  ["1e3", "scientific notation is not a price"],
  ["-50", "a negative amount"],
  ["", "nothing typed"],
  ["abc", "not a number"],
  ["0", "nothing is not an amount"],
  ["0.00", "nor is nothing with cents"],
  ["1,2,3.00", "nonsense grouping"],
];

const bad = [];
for (const [typed, cents, why] of CASES) {
  const r = parseMoney(typed);
  if (!r.ok) { bad.push(`"${typed}" (${why}) was refused: ${r.reason}`); continue; }
  if (r.cents !== cents) {
    bad.push(`"${typed}" (${why}) should be ${cents} cents, got ${r.cents} (${r.formatted})`);
  }
}
for (const [typed, why] of REFUSED) {
  const r = parseMoney(typed);
  if (r.ok) bad.push(`"${typed}" (${why}) should be refused, but it charges ${r.formatted}`);
}

if (bad.length) {
  console.error(`\n${bad.length} amount(s) this till would get wrong:\n`);
  for (const b of bad) console.error(`  ${b}`);
  console.error("");
  process.exit(1);
}
/* And the one that parses but must never reach Stripe. */
const MAX_CENTS = 2_000_000;
const huge = parseMoney("479.123");
if (!huge.ok || huge.cents <= MAX_CENTS) {
  console.error(`\n"479.123" must parse above the ceiling so createPaymentLink refuses it. Got ${JSON.stringify(huge)}\n`);
  process.exit(1);
}

console.log(`${CASES.length + REFUSED.length} amounts checked: every one charges what it says, or is refused.`);
console.log(`  and "479.123" parses to ${huge.formatted}, which the EUR 20,000 ceiling then refuses.`);
