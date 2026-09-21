#!/usr/bin/env node
/**
 * Everything in the CRM that points at something, and whether it is there.
 *
 * Three ways a screen quietly stops joining up, none of which a typecheck or a
 * build will ever notice:
 *
 *   an anchor to a section id that no longer exists, so "See it day by day"
 *   scrolls nowhere and the reader concludes the link is broken
 *
 *   a link to a CRM page that was renamed or never built, which renders a 404
 *   inside the shell and looks like the app falling over
 *
 *   a Stat with explain="x" where the glossary has no x, so the one control
 *   that answers "what is this number" opens an empty box
 *
 *   node scripts/check-crm-links.mjs
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CRM = join(ROOT, "src/app/crm");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(CRM);
const ids = new Set();
const problems = [];

/* Every id the CRM defines, wherever it defines it. */
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(/\bid="([a-zA-Z0-9_-]+)"/g)) ids.add(m[1]);
}

/* The glossary's keys, which is what explain= has to name. */
const glossaryPath = join(ROOT, "src/lib/crm/glossary.ts");
const terms = new Set();
if (existsSync(glossaryPath)) {
  const g = readFileSync(glossaryPath, "utf8");
  for (const m of g.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*\{/gm)) terms.add(m[1]);
  for (const m of g.matchAll(/^\s{2}"([^"]+)"\s*:\s*\{/gm)) terms.add(m[1]);
}

const seen = { anchors: 0, pages: 0, explains: 0 };

for (const f of files) {
  const text = readFileSync(f, "utf8");
  const where = (i) => `${relative(ROOT, f)}:${text.slice(0, i).split("\n").length}`;

  for (const m of text.matchAll(/href[=:]\s*"#([a-zA-Z0-9_-]+)"/g)) {
    seen.anchors++;
    if (!ids.has(m[1])) problems.push(`${where(m.index)}: link to #${m[1]}, which nothing defines`);
  }

  for (const m of text.matchAll(/href[=:]\s*"(\/crm\/[a-zA-Z0-9/_-]*)"/g)) {
    seen.pages++;
    const rel = m[1].replace(/^\/crm\/?/, "");
    const dir = rel ? join(CRM, rel) : CRM;
    const ok = existsSync(join(dir, "page.tsx")) || existsSync(`${dir}.tsx`);
    if (!ok) problems.push(`${where(m.index)}: link to ${m[1]}, which has no page`);
  }

  for (const m of text.matchAll(/\bexplain="([a-zA-Z0-9_]+)"/g)) {
    seen.explains++;
    if (terms.size && !terms.has(m[1])) {
      problems.push(`${where(m.index)}: explain="${m[1]}", which the glossary does not define`);
    }
  }
}

if (problems.length) {
  console.error(`\n${problems.length} thing${problems.length === 1 ? "" : "s"} in the CRM that point nowhere:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}
console.log(
  `CRM links check out: ${seen.anchors} anchors, ${seen.pages} page links, ` +
  `${seen.explains} glossary references, ${ids.size} ids and ${terms.size} terms defined.`);
