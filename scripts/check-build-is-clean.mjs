#!/usr/bin/env node
/**
 * The build exits zero and still tells you it is broken. Read what it said.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * A form on the customer page imported useActionState, which is React 19 and
 * this app is React 18. `tsc --noEmit` was clean. `next build` printed
 *
 *   ⚠ Compiled with warnings
 *   Attempted import error: 'useActionState' is not exported from 'react'
 *   ✓ Compiled successfully
 *
 * and exited zero, so every check in this repo passed and the page would have
 * thrown the first time Nigel opened a customer.
 *
 * The obvious guard is a list of React 19 APIs, and it was written and thrown
 * away: it reported useFormState from react-dom as missing, which webpack
 * resolves fine because Next vendors its own react-dom for the app router. A
 * hardcoded list of what exists is a second opinion about somebody else's
 * package, and it was wrong within a minute.
 *
 * So this asks the bundler. It is the only thing that actually knows which
 * module resolves to what, and it already says so.
 *
 *   node scripts/check-build-is-clean.mjs
 */
import { spawnSync } from "node:child_process";

/* Lines the build prints without failing, that mean the app is broken.
   Each is a real thing that shipped past a green build. */
const FATAL = [
  { re: /Attempted import error:.*/g, why: "an import that does not resolve at runtime" },
  { re: /Module not found:.*/g, why: "a module that is not there" },
  { re: /export .* was not found in.*/g, why: "an export that does not exist" },
];

console.log("building, which takes about a minute...");
const r = spawnSync("npx", ["next", "build"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;

if (r.status !== 0) {
  console.error("\nThe build failed outright:\n");
  console.error(out.split("\n").filter((l) => /error|Error|failed/i.test(l)).slice(0, 20).join("\n"));
  process.exit(1);
}

const found = [];
for (const f of FATAL) {
  for (const m of out.matchAll(f.re)) found.push({ line: m[0].trim(), why: f.why });
}

if (found.length) {
  console.error(`\nThe build exited zero and said ${found.length} thing(s) that mean it is broken:\n`);
  for (const f of found) {
    console.error(`  ${f.line}`);
    console.error(`    ${f.why}\n`);
  }
  process.exit(1);
}
console.log("The build is clean, including the things it only warns about.");
