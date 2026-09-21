#!/usr/bin/env node
/**
 * Are the statutory particulars actually on the site?
 *
 * ── WHY ──────────────────────────────────────────────────────────
 *
 * Section 151 of the Companies Act 2014 requires a company's registered name,
 * its registered number and its registered office on its websites and
 * business letters. smart-space.ie carried none of the three. The footer said
 * "Smart Space", which is a trading name, and the privacy policy named it as
 * the data controller, which is not a legal person and so cannot be one.
 *
 * It is also the public record Google cross-checks during advertiser
 * verification, which SmartCare Living's account is blocked on, so the absence
 * was costing something concrete as well as being a breach.
 *
 * ── WHY IT READS THE LIVE SITE ───────────────────────────────────
 *
 * Because a constant existing in a file proves nothing. This repository's
 * commonest defect is a capability reachable from nothing, and legal text in a
 * module nobody renders is exactly that shape.
 *
 *   node scripts/check-company-details.mjs [origin]
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = (process.argv[2] || "https://smart-space.ie").replace(/\/$/, "");

/* Read from the one file that defines them, so this cannot drift from what
   the site renders. */
const src = readFileSync(join(ROOT, "src/lib/company.ts"), "utf8");
const field = (name) => {
  const m = new RegExp(`${name}:\\s*"([^"]+)"`).exec(src);
  if (!m) throw new Error(`company.ts has no ${name}`);
  return m[1];
};
const legalName = field("legalName");
const number = field("number");
const office = field("registeredOffice");

/* Every page carries the footer, so the particulars belong on all of them.
   Privacy and terms additionally have to name the company as the controller
   and as the counterparty. */
const PAGES = [
  { path: "/", needs: [legalName, number, office] },
  { path: "/privacy", needs: [legalName, number, office] },
  { path: "/terms", needs: [legalName, number, office] },
];

const problems = [];
for (const page of PAGES) {
  let html;
  try {
    const r = await fetch(ORIGIN + page.path, { headers: { "user-agent": "fourwinds-company-check" } });
    if (!r.ok) { problems.push(`${page.path} answered ${r.status}`); continue; }
    html = await r.text();
  } catch (err) {
    console.error(`Could not reach ${ORIGIN}${page.path}: ${err.message}`);
    process.exit(2);
  }
  /* Next escapes apostrophes and may split text across elements, so compare on
     letters and digits alone rather than on exact markup. */
  const flat = html.replace(/<[^>]*>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, " ");
  for (const need of page.needs) {
    if (!flat.includes(need)) problems.push(`${page.path} does not carry "${need}"`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} missing statutory particular${problems.length === 1 ? "" : "s"}:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\n  Section 151 Companies Act 2014 requires the registered name, number and office.\n`);
  process.exit(1);
}
console.log(`${legalName} (${number}) and its registered office appear on all ${PAGES.length} checked pages.`);
