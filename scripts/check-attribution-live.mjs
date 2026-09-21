#!/usr/bin/env node
/**
 * Walk a real ad click through a real browser against the live sites.
 *
 * ── WHY A SECOND CHECK ───────────────────────────────────────────
 *
 * check-consent-attribution.mjs tests the module. It passed all the way
 * through August while production discarded every click id, because the fault
 * was never in the logic on its own: it was the banner storing
 * {"decision":"granted"} while attribution compared the raw string against
 * "granted", and later the parked record being overwritten by the second page
 * someone read. Both are agreements between two files, and both looked fine
 * from inside either one.
 *
 * Nothing threw. No page broke. The sites stayed up, the forms kept working,
 * and the only symptom was an ad account quietly recording fewer sales than
 * the business was making, which nobody can see without going and looking.
 *
 * So this does what a customer does: arrives on an ad URL, reads another page,
 * accepts the banner there, and then checks that the click id is still on
 * them. If it is not, the money is already leaking and this says so.
 *
 *   node scripts/check-attribution-live.mjs
 *   node scripts/check-attribution-live.mjs --site=https://smart-space.ie
 */
import { spawn } from "node:child_process";
import fs from "node:fs";

const CHROME =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** Each site, with a second page to read and the key its click id lands under. */
const SITES = [
  { name: "Smart Space", url: "https://smart-space.ie", second: "/reviews", key: "ss_attribution", read: (v) => JSON.parse(v).gclid },
  { name: "SmartCare Living", url: "https://www.smartcareliving.ie", second: "/about.html", key: "scl_gclid", read: (v) => v },
];

const only = process.argv.find((a) => a.startsWith("--site="))?.split("=")[1];

async function browser() {
  const dir = fs.mkdtempSync("/tmp/attrlive-");
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0",
    "--user-data-dir=" + dir, "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank"],
    { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((res, rej) => {
    let b = ""; const t = setTimeout(() => rej(new Error("Chrome did not start")), 25000);
    chrome.stderr.on("data", (d) => { b += d;
      const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let seq = 0; const pending = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id);
      m.error ? rej(new Error(m.error.message)) : res(m.result); } });
  const cdp = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const id = ++seq; pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params, sessionId })); });
  const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
  for (const m of ["Page.enable", "Runtime.enable", "Network.enable"]) await cdp(m, {}, sessionId);
  await cdp("Emulation.setDeviceMetricsOverride",
    { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  return {
    go: (url) => cdp("Page.navigate", { url }, sessionId),
    eval: async (expr) => (await cdp("Runtime.evaluate",
      { expression: expr, returnByValue: true }, sessionId)).result.value,
    close: () => { try { ws.close(); chrome.kill(); fs.rmSync(dir, { recursive: true, force: true }); } catch {} },
  };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;

for (const site of SITES) {
  if (only && site.url !== only) continue;
  const b = await browser();
  try {
    const gclid = "LIVECHECK" + Date.now();
    await b.go(`${site.url}/?gclid=${gclid}&utm_source=google&utm_medium=cpc`);
    await wait(7000);
    await b.go(site.url + site.second);          // reads a second page first, like a person
    await wait(7000);

    const clicked = await b.eval(`(() => { const x = [...document.querySelectorAll('button,a')]
      .find(e => /accept all|accept|allow/i.test(e.textContent || '')); if (x) { x.click(); return x.textContent.trim().slice(0,30); } return null; })()`);
    if (!clicked) { console.error(`FAIL  ${site.name}: no cookie banner to accept`); bad++; continue; }
    await wait(6000);

    const stored = await b.eval(`String(localStorage.getItem(${JSON.stringify(site.key)}) ?? '')`);
    let found = null;
    try { found = stored ? site.read(stored) : null; } catch { found = null; }

    if (found === gclid) {
      console.log(`ok    ${site.name}: clicked an ad, read ${site.second}, accepted there, click id survived`);
    } else {
      console.error(`FAIL  ${site.name}: the click id was lost. Expected ${gclid}, ${site.key} holds ${JSON.stringify(stored).slice(0, 120)}`);
      console.error(`      Paid traffic is arriving and cannot be tied back to the ad. Google will not record these sales.`);
      bad++;
    }
  } catch (e) {
    console.error(`FAIL  ${site.name}: ${e.message}`);
    bad++;
  } finally { b.close(); }
}

if (bad) { console.error(`\n${bad} site(s) are losing the click id.`); process.exit(1); }
console.log("\nBoth sites carry the click id through to consent.");
