// Every email this site sends to Nigel also goes to FourWinds, as a blind
// copy (business-constants.ts monitorBcc). The site's alerts reached Nigel
// alone for months, and nobody here saw "sheet append failed" until he quoted
// it back. This fails the build if a send addressed to Nigel has no copy.
//
// A send is addressed to Nigel when its `to:` names a variable the same file
// fills from alertTo() or CONTACT_TO_EMAIL. Each such send must carry
// `bcc: monitorBcc()` inside its own call.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "src");
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) files.push(p); } };
walk(ROOT);

const bad = [];
let checked = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  if (!src.includes("emails.send(")) continue;
  const nigelVars = new Set([...src.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*[^;\n]*(?:alertTo\(\)|process\.env\.CONTACT_TO_EMAIL)/g)].map((m) => m[1]));
  if (!nigelVars.size) continue;
  for (const m of src.matchAll(/emails\.send\(\{/g)) {
    /* The call's own object: from its brace to the brace that closes it. */
    let depth = 0, end = m.index + m[0].length - 1;
    for (let i = end; i < src.length; i++) { if (src[i] === "{") depth++; else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } } }
    const call = src.slice(m.index, end + 1);
    const to = /\bto:\s*\[?\s*(\w+)/.exec(call)?.[1];
    if (!to || !nigelVars.has(to)) continue;
    checked++;
    if (!/\bbcc:\s*monitorBcc\(\)/.test(call)) {
      const line = src.slice(0, m.index).split("\n").length;
      bad.push(`${path.relative(path.join(ROOT, ".."), f)}:${line}`);
    }
  }
}
if (!checked) { console.error("check-monitor-copy: found no sends to Nigel at all, so the check is reading the wrong thing"); process.exit(1); }
if (bad.length) { console.error("Emails to Nigel with no copy to FourWinds (add bcc: monitorBcc()):\n  " + bad.join("\n  ")); process.exit(1); }
console.log(`check-monitor-copy: ${checked} sends to Nigel, each copied to FourWinds`);
