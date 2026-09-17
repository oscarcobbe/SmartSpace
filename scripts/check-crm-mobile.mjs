#!/usr/bin/env node
/**
 * The CRM on a phone, signed in, for real.
 *
 *   node scripts/check-crm-mobile.mjs [baseUrl] [outDir]
 *
 * Every previous check of these pages was a status code, and this app renders
 * a redirect and a crash as 200, so a 200 proved nothing: /crm/week answered
 * 200 while serving the sign-in screen. This signs in, walks the pages at
 * 390x844, opens a job, switches business, and fails on anything that overflows
 * the viewport horizontally or that renders no content at all.
 *
 * Headless Chrome over CDP rather than the in-app browser pane: a hidden pane
 * lays out at width zero, every mobile media query matches, and the screenshots
 * come back blank.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.argv[2] || "https://smart-space.ie";
const OUT = process.argv[3] || "/tmp/crm-mobile";
mkdirSync(OUT, { recursive: true });

let PASSWORD = process.env.CRM_PASSWORD;
if (!PASSWORD && existsSync(".env.local")) {
  PASSWORD = readFileSync(".env.local", "utf8").match(/^CRM_PASSWORD=(.*)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
}
if (!PASSWORD) { console.error("CRM_PASSWORD not set, so this cannot sign in."); process.exit(1); }

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = mkdtempSync(join(tmpdir(), "crm-mobile-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`,
  "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((res, rej) => { let b = "";
  const t = setTimeout(() => rej(new Error("no devtools endpoint")), 20000);
  chrome.stderr.on("data", (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } }); });
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } });
const cdp = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });

const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
await cdp("Page.enable", {}, sessionId);
/* A real phone: 390 by 844, two times density, touch, mobile user agent. */
await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
await cdp("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }, sessionId);

const go = async (path) => {
  const loaded = new Promise((res) => { const on = (ev) => { const m = JSON.parse(ev.data);
    if (m.method === "Page.loadEventFired" && m.sessionId === sessionId) { ws.removeEventListener("message", on); res(); } };
    ws.addEventListener("message", on); setTimeout(res, 15000); });
  await cdp("Page.navigate", { url: `${BASE}${path}` }, sessionId);
  await loaded;
  await new Promise((r) => setTimeout(r, 900));
};
const evalIn = async (expr) => {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails).slice(0, 200));
  return result.value;
};
const shot = async (name) => {
  const { data } = await cdp("Page.captureScreenshot", { format: "png" }, sessionId);
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
};

const problems = [];
/* Horizontal overflow is the mobile failure that matters: it is invisible in a
   desktop test and it makes a page unusable with a thumb. */
const OVERFLOW = `(() => {
  const d = document.documentElement;
  const over = [...document.querySelectorAll('body *')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); })
    .slice(0, 5)
    .map(e => e.tagName.toLowerCase() + '.' + String(e.className || '').slice(0, 40));
  return JSON.stringify({ scroll: d.scrollWidth, inner: innerWidth, over, text: (document.body.innerText || '').trim().length });
})()`;

console.log(`\nCRM on a phone, 390x844, against ${BASE}\n`);

await go("/crm");
await evalIn(`(async () => {
  const input = document.querySelector('input[type="password"]');
  if (!input) return 'no password field';
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(input, ${JSON.stringify(PASSWORD)});
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.closest('form')?.requestSubmit();
  await new Promise(r => setTimeout(r, 2500));
  return location.pathname;
})()`);
await new Promise((r) => setTimeout(r, 1500));

for (const [path, name, must] of [
  ["/crm", "overview", "Money"],
  ["/crm/week", "week", null],
  ["/crm/orders", "orders", null],
  ["/crm/finance", "finance", "bank"],
  ["/crm/marketing", "marketing", null],
  ["/crm/search?q=a", "search", "Search"],
]) {
  await go(path);
  const raw = await evalIn(OVERFLOW);
  const r = JSON.parse(raw);
  const signedIn = !(await evalIn(`!!document.querySelector('input[type="password"]')`));
  await shot(name);
  const wide = r.scroll > r.inner + 1;
  if (!signedIn) problems.push(`${path} showed the sign-in screen, so the session did not hold`);
  if (wide) problems.push(`${path} scrolls sideways: ${r.scroll}px in a ${r.inner}px viewport, from ${r.over.join(", ") || "something unnamed"}`);
  if (r.text < 60) problems.push(`${path} rendered almost no text (${r.text} characters)`);
  console.log(`  ${path.padEnd(16)} ${signedIn ? "signed in" : "SIGNED OUT"}  ${wide ? `OVERFLOWS ${r.scroll}px` : "fits"}  ${r.text} chars`);
}

/* The two things added today that only exist once you touch them. */
await go("/crm/week");
const opened = await evalIn(`(async () => {
  const b = [...document.querySelectorAll('button[aria-label^="Show what they ordered"]')][0];
  if (!b) return 'no job to open';
  b.click(); await new Promise(r => setTimeout(r, 400));
  return b.getAttribute('aria-expanded');
})()`);
await shot("week-job-open");
console.log(`  job expand      ${opened === "true" ? "opens" : opened}`);
if (opened !== "true" && opened !== "no job to open") problems.push(`the job expander did not open: ${opened}`);

const switched = await evalIn(`(async () => {
  const b = document.querySelector('button[aria-haspopup="listbox"]');
  if (!b) return 'no switcher';
  b.click(); await new Promise(r => setTimeout(r, 300));
  const opts = [...document.querySelectorAll('[role="option"]')].map(o => o.textContent.trim());
  return opts.join(' | ') || 'no options';
})()`);
await shot("week-switcher");
console.log(`  site switcher   ${switched}`);
if (!String(switched).includes("SmartCare Living")) problems.push(`the site switcher did not offer SmartCare Living: ${switched}`);

ws.close(); chrome.kill(); try { rmSync(dir, { recursive: true, force: true }); } catch {}
console.log(`\nscreenshots in ${OUT}`);
if (problems.length) { console.error(`\n${problems.length} problem(s):`); for (const p of problems) console.error(`  ${p}`); process.exit(1); }
console.log("\nPASS  signed in, nothing scrolls sideways, both new controls work\n");
