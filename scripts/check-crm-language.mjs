#!/usr/bin/env node
/**
 * The CRM and the site must call the same thing by the same name.
 *
 * Nigel's point, D4 on the list after the call: he reads the site's words all
 * day and then the CRM calls the same thing something else, so he has to
 * translate. The site says installation, consultation, booking, enquiry and
 * customer. Internally we drifted into job, appointment, lead and client.
 *
 * This reads only what a person can see: text between JSX tags, and the
 * attributes that end up on screen. Variable names, imports, comments and
 * class names are left alone, because renaming `leads` in a query changes
 * nothing a customer or Nigel ever reads and churning it would be noise.
 *
 *   node scripts/check-crm-language.mjs
 *
 * Exit 1 on any disagreement, so it can sit in the same check as the rest.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, "src/app/crm");

/** The site's word, and what we drifted into saying instead. */
const AGREED = [
  { use: "installation", insteadOf: /\bjobs?\b/gi },
  { use: "booking", insteadOf: /\bappointments?\b/gi },
  { use: "enquiry", insteadOf: /\bleads?\b/gi },
  { use: "customer", insteadOf: /\bclients?\b/gi },
];

/* Words that are the right word in their own context and must not be flagged.
   "Lead" in "lead time" is English, not our jargon, and Outreach genuinely
   talks about other businesses as clients-to-be. */
const ALLOW = [/lead time/i, /market lead/i];

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx$/.test(p)) files.push(p);
  }
})(DIR);

/** Text a person can actually see: JSX text nodes plus on-screen attributes. */
function visibleStrings(src) {
  const out = [];
  /* Strip comments first, so a paragraph of reasoning about leads is not
     reported as a label saying "leads". */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

  /* Prose only. A TSX file is full of `useState<` and `person.leads[0]`, and
     a naive >...< match reported three of those as copy on the first run.
     Anything carrying code punctuation is not something a person reads. */
  const PROSE = /^[A-Za-z0-9\s,.'\u2019:?!%\u20ac\u00a3+\/&\u2013\u2014-]+$/;
  for (const m of code.matchAll(/>([^<>{}]{2,})</g)) {
    const t = m[1].trim();
    if (t && /[a-z]/i.test(t) && PROSE.test(t)) out.push({ text: t, at: m.index });
  }
  for (const m of code.matchAll(/\b(?:label|title|placeholder|aria-label|alt|sub|heading)=["']([^"']+)["']/g)) {
    out.push({ text: m[1], at: m.index });
  }
  return out;
}

const lineOf = (src, index) => src.slice(0, index).split("\n").length;

let bad = 0;
for (const file of files) {
  const src = readFileSync(file, "utf8");
  for (const { text, at } of visibleStrings(src)) {
    if (ALLOW.some((a) => a.test(text))) continue;
    for (const { use, insteadOf } of AGREED) {
      const hits = text.match(insteadOf);
      if (!hits) continue;
      bad++;
      console.error(
        `${relative(ROOT, file)}:${lineOf(src, at)}  says "${hits[0]}", the site says "${use}"\n    ${text.slice(0, 100)}`,
      );
    }
  }
}

if (bad) {
  console.error(`\n${bad} place${bad === 1 ? "" : "s"} where the CRM and the site disagree on a word.`);
  process.exit(1);
}
console.log(`Language matches the site across ${files.length} CRM files.`);
