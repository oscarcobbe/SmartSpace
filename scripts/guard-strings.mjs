#!/usr/bin/env node
/**
 * Build-time string guard.
 *
 * Exists because a sitewide em-dash (—) -> ", " mechanical find/replace once
 * corrupted placeholder VALUES in display + logic code, and a stray ", "
 * shipped to production (the "Total price: ," bug on /services/installation-only).
 *
 * This runs in `npm run build` (so it also runs on Vercel) and FAILS the build
 * if it finds either class of problem in src/:
 *   1. an em-dash U+2014 (—) anywhere  — the no-em-dash house rule, and the
 *      thing the bad replace was trying to remove in the first place.
 *   2. a ", " used as a value/placeholder sentinel: `|| ", "`, `?? ", "`,
 *      `= / == / === / != / !== ", "`, `: ", "`, or a standalone `", ",` line.
 *      These are the corrupted form of the old "—" placeholder. Use "-" for an
 *      empty value, or a real word ("Quote required") for a label.
 *
 * Legitimate ", " (`.join(", ")`, string arrays like ["a", "b"], gtag args,
 * JSON like "a": "b", "c") is NOT matched by these patterns.
 *
 * Escape hatch: add a trailing  // guard-ignore  to a line that genuinely needs
 * one of these (should be vanishingly rare).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(fileURLToPath(new URL(".", import.meta.url)), "..", "src");
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const RULES = [
  { name: "em-dash U+2014 (banned sitewide)", re: /—/ },
  {
    name: 'corrupted ", " placeholder (use "-" or a real label)',
    re: /(\|\||\?\?|=+|:)\s*", "|^\s*", ",?\s*$/,
  },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (CODE_EXT.test(entry)) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(SRC)) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("guard-ignore")) return;
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        violations.push({
          file: file.slice(file.indexOf("src")),
          line: i + 1,
          rule: rule.name,
          text: line.trim().slice(0, 110),
        });
      }
    }
  });
}

/*
 * No en dashes on the CRM's screens either.
 *
 * Oscar's rule for the CRM is no em or en dashes in any text. The em dash was
 * already banned sitewide; the en dash was not, and it had become the CRM's
 * placeholder for an empty value in thirty places ("–" in a table cell, "–"
 * for a cost per enquiry with no enquiries). Comments are left alone, because
 * several explain the feed's own slot formats by quoting them. Parsing code
 * that has to match a dash in incoming data spells it "\u2013".
 */
const CRM_DIRS = ["app/crm", "lib/crm", "app/api/crm"].map((d) => join(SRC, d));
for (const file of walk(SRC).filter((f) => CRM_DIRS.some((d) => f.startsWith(d)))) {
  const src = readFileSync(file, "utf8");
  /* Blank out comments but keep line numbers, so a finding points at its line. */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/.*$/gm, (m, lead) => lead + " ".repeat(m.length - lead.length));
  code.split("\n").forEach((line, i) => {
    if (!line.includes("\u2013")) return;
    const original = src.split("\n")[i] ?? "";
    if (original.includes("guard-ignore")) return;
    violations.push({
      file: file.slice(file.indexOf("src")),
      line: i + 1,
      rule: "en-dash U+2013 (banned on CRM screens)",
      text: original.trim().slice(0, 110),
    });
  });
}

if (violations.length) {
  console.error(`\n✗ string-guard: ${violations.length} issue(s) found\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.rule}]`);
    console.error(`      ${v.text}\n`);
  }
  console.error('Fix it (use "-" for empty, a real word for a label), or add a trailing "// guard-ignore" if truly intentional.\n');
  process.exit(1);
}
console.log("✓ string-guard: no em-dashes or corrupted comma placeholders in src");
