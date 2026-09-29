#!/usr/bin/env node
/**
 * The speed test's moving parts agree with each other.
 *
 * The Wi-Fi check runs M-Lab's ndt7 client from the npm package, but the two
 * Web Workers that do the measuring cannot be bundled: the browser loads them
 * by URL, from public/ndt7. So there are two copies of the same code, and an
 * upgrade of the package that forgets the copies leaves a new client driving
 * old workers. And the test only runs if the page's Content Security Policy
 * lets it reach M-Lab: a CSP that drops a host kills the test silently, the
 * same way it once killed thirty days of ad conversions on this site.
 *
 * Fails the build when:
 *   - a worker in public/ndt7 differs by one byte from the installed package;
 *   - the paths the page asks for are not the files that exist;
 *   - the CSP stops allowing M-Lab's locate service or its WebSocket servers,
 *     or stops allowing workers from this site;
 *   - package.json stops pinning the exact version that is installed.
 *
 *   node scripts/check-ndt7.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const fail = [];

const pkgDir = "node_modules/@m-lab/ndt7";
if (!existsSync(join(ROOT, pkgDir))) {
  console.error("check-ndt7: @m-lab/ndt7 is not installed, run npm install");
  process.exit(1);
}
const installed = JSON.parse(read(`${pkgDir}/package.json`)).version;
const pinned = JSON.parse(read("package.json")).dependencies?.["@m-lab/ndt7"];
if (pinned !== installed) fail.push(`package.json pins @m-lab/ndt7 at "${pinned}" but ${installed} is installed; pin the exact version`);

const client = read("src/lib/wifi-check/speed-test.ts");
for (const kind of ["download", "upload"]) {
  const name = `ndt7-${kind}-worker.js`;
  const pub = `public/ndt7/${name}`;
  if (!existsSync(join(ROOT, pub))) {
    fail.push(`${pub} is missing`);
    continue;
  }
  if (read(pub) !== read(`${pkgDir}/src/${name}`)) {
    fail.push(`${pub} differs from ${pkgDir}/src/${name} (${installed}); copy it again`);
  }
  if (!client.includes(`"/ndt7/${name}"`)) fail.push(`speed-test.ts does not load /ndt7/${name}`);
}

const mw = read("src/middleware.ts");
/* The policy's own string, not the comment above it that quotes a browser
   error as "connect-src ...": the real one starts with 'self'. */
const connect = [...mw.matchAll(/"connect-src ('self'[^"]*)"/g)].map((m) => m[1]).join(" ");
for (const host of ["https://locate.measurementlab.net", "wss://*.measurement-lab.org"]) {
  if (!connect.split(/\s+/).includes(host)) fail.push(`the CSP connect-src no longer allows ${host}`);
}
if (!/"worker-src 'self'"/.test(mw)) fail.push("the CSP no longer allows workers from this site (worker-src 'self')");

if (!/userAcceptedDataPolicy:\s*true/.test(client)) fail.push("speed-test.ts no longer declares M-Lab's data policy accepted, so every test would refuse to start");

if (fail.length) {
  console.error(`\ncheck-ndt7: ${fail.length} problem${fail.length === 1 ? "" : "s"} with the speed test:\n`);
  for (const f of fail) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`check-ndt7: workers match @m-lab/ndt7 ${installed}, and the CSP lets the test reach M-Lab`);
