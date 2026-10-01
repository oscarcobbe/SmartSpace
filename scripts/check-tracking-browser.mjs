#!/usr/bin/env node
/**
 * The site's tags in a real browser, with nothing leaving it.
 *
 * check-chatgpt-pixel.mjs runs the modules against a stub. This runs the
 * built site in headless Chrome against a local `next start`, and answers
 * every request that would leave the machine itself: Google's tags, Google
 * Ads, GA4, doubleclick, OpenAI, Facebook, the FourWinds portal and the
 * site's own /api routes. Chrome is also started unable to resolve any host
 * but localhost, so a request this script failed to catch would fail rather
 * than reach anybody. gtag.js is answered with an empty script, so every
 * gtag() call stays in window.dataLayer, where this reads it.
 *
 *   npx next build && npx next start -p 3107
 *   node scripts/check-tracking-browser.mjs --base http://localhost:3107
 *
 * Build with NEXT_PUBLIC_OAI_PIXEL_ID set to any dummy value to exercise the
 * ChatGPT ads pixel (OpenAI's SDK is answered with a recording stub); without
 * it the script checks that nothing of OpenAI's happens at all.
 *
 * What it checks:
 *   - the pixel: nothing before Accept; after Accept the SDK is requested
 *     with page_viewed queued, pixel-config is answered 404 inside the page,
 *     the ad click becomes __oppref, and client-side route changes send
 *     page_viewed. Or, without a pixel id, nothing at all.
 *   - a phone tap: the SS - Phone tap label, not the call label, no
 *     generate_lead, a plain phone_call_click.
 *   - the contact form, now on the shared lead helper: the lead label, the
 *     id the route answered, E.164 phone, generate_lead contact_form.
 *   - the Wi-Fi form, on a package page and on a check's report: SS -
 *     SmartNet enquiry once, with the id /api/wifi-check answered, E.164
 *     phone, generate_lead with lead_source wifi_enquiry or wifi_check.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const args = process.argv.slice(2);
const val = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const BASE = val("--base", "http://localhost:3107");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SDK = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
const TAP = "AW-17978501655/nA6TCOaaoYwdEJfU6PxC";
const SMARTNET = "AW-17978501655/aFHQCOOaoYwdEJfU6PxC";
const CALL = "HWS2CL2y4ZgcEJfU6PxC";
const sha = (s) => createHash("sha256").update(s).digest("hex");

/* A real report link, written by the site's own codec. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportParam = await (async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tagcheck-codec-"));
  for (const name of ["grade", "codec"]) {
    const js = ts.transpileModule(fs.readFileSync(path.join(ROOT, "src/lib/wifi-check", `${name}.ts`), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from "\.\/grade"/g, 'from "./grade.mjs"');
    fs.writeFileSync(path.join(tmp, `${name}.mjs`), js);
  }
  const C = await import(pathToFileURL(path.join(tmp, "codec.mjs")).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const R = (place, down, up) => ({ place, down, up, ping: 12, busy: 30, at: 1759000000000 });
  return C.encodeCheck({
    answers: { home: "semi", floors: 2, people: 3, trouble: ["upstairs"], everywhere: false, drops: "often", cameras: 0 },
    readings: [R("router", 300, 40), R("trouble", 20, 8)],
  });
})();

/* Stands in for OpenAI's SDK: records the queue it found, asks for the pixel's
   settings the way the SDK does, and records every call after it loaded. */
const SDK_STUB = `(function(){
  var found = window.oaiq && window.oaiq.q ? Array.prototype.map.call(window.oaiq.q, function(a){ return JSON.parse(JSON.stringify(Array.prototype.slice.call(a))); }) : null;
  window.__oaiStub = { found: found, after: [], configStatus: null };
  fetch('https://bzrcdn.openai.com/pixel-config/stub.json').then(function(r){ window.__oaiStub.configStatus = r.status; }, function(e){ window.__oaiStub.configStatus = 'error ' + e.message; });
  window.oaiq = function(){ window.__oaiStub.after.push(JSON.parse(JSON.stringify(Array.prototype.slice.call(arguments)))); };
})();`;

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const fail = (m) => { bad++; console.error(`FAIL  ${m}`); };
const check = (cond, good, wrong) => (cond ? ok(good) : fail(wrong));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tagcheck-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${path.join(dir, "profile")}`,
  "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--disable-background-networking",
  "--disable-component-update", "--disable-sync", "--disable-domain-reliability",
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost", "--window-size=1280,900", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
process.on("exit", () => { try { chrome.kill("SIGKILL"); } catch {} try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} });

const wsUrl = await new Promise((res, rej) => {
  let b = "";
  const t = setTimeout(() => rej(new Error("Chrome did not start in 60 seconds")), 60_000);
  chrome.stderr.on("data", (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); res(m[1]); } });
});
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const handlers = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); return; }
  for (const h of handlers) h(m);
});
const cdp = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId }));
});
const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
const { sessionId: S } = await cdp("Target.attachToTarget", { targetId, flatten: true });

const local = new URL(BASE).host;
const answered = [];   // every request this script answered instead of the network
const seen = [];       // every request the page made, from the Network domain
let wifiReplies = 0;
handlers.push((m) => {
  if (m.sessionId !== S) return;
  if (m.method === "Network.requestWillBeSent") seen.push(m.params.request.url);
  if (m.method === "Fetch.requestPaused") onPaused(m.params).catch((err) => console.error("interception:", err.message));
});

async function onPaused(p) {
  const url = p.request.url;
  const u = new URL(url);
  const fulfil = (code, body = "", type = "text/plain") => cdp("Fetch.fulfillRequest", {
    requestId: p.requestId, responseCode: code,
    responseHeaders: [{ name: "Content-Type", value: type }, { name: "Cache-Control", value: "no-store" }],
    ...(code === 204 ? {} : { body: Buffer.from(body).toString("base64") }),
  }, S);
  /* /_next/image is answered too: the local server would fetch a remote
     original to resize it, and nothing here needs the pictures. */
  if (u.host === local && !u.pathname.startsWith("/api/") && !u.pathname.startsWith("/_next/image")) {
    return cdp("Fetch.continueRequest", { requestId: p.requestId }, S);
  }
  answered.push({ url, method: p.request.method, body: p.request.postData ?? null, type: p.resourceType });
  if (u.host === local && u.pathname === "/api/wifi-check") {
    wifiReplies++;
    return fulfil(200, JSON.stringify({ ok: true, conversionId: `wifi-conv-${wifiReplies}`, light: null, recommend: null }), "application/json");
  }
  if (u.host === local && u.pathname === "/api/contact") {
    return fulfil(200, JSON.stringify({ success: true, id: "answered-here", conversionId: "contact-conv-1", leadEmailSent: true }), "application/json");
  }
  if (u.host === local) return fulfil(204);
  if (url.split("?")[0] === SDK) return fulfil(200, SDK_STUB, "application/javascript");
  if (p.resourceType === "Script") return fulfil(200, "/* answered by check-tracking-browser */", "application/javascript");
  return fulfil(204);
}

await cdp("Page.enable", {}, S);
await cdp("Runtime.enable", {}, S);
await cdp("Network.enable", {}, S);
await cdp("Network.setCacheDisabled", { cacheDisabled: true }, S);
await cdp("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] }, S);

const ev = async (expression) => {
  const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const waitFor = async (expr, ms = 20_000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await ev(expr)) return true; } catch {} await wait(200); }
  return false;
};
let pixelOn = false;
const go = async (p) => {
  await cdp("Page.navigate", { url: BASE + p }, S);
  await waitFor("document.readyState === 'complete'");
  await wait(1500);
  /* After Accept every page loads the SDK (here, the stub) again. */
  if (pixelOn && (await ev("(JSON.parse(localStorage.getItem('ss_consent')||'{}').v||0) >= 2"))) await waitFor("!!window.__oaiStub");
};
/* dataLayer holds gtag's arguments objects; read them as arrays, functions dropped. */
const dataLayer = () => ev(`JSON.parse(JSON.stringify((window.dataLayer||[]).map(function(a){ return a && typeof a === 'object' && typeof a.length === 'number' && !Array.isArray(a) ? Array.prototype.slice.call(a) : a; })))`);
const sdkLoads = () => answered.filter((r) => r.url.split("?")[0] === SDK).length;
const cookies = async () => (await cdp("Network.getCookies", { urls: [BASE] }, S)).cookies;

await go("/?oppref=TEST_CLICK_1");
pixelOn = await ev("typeof window.oaiq === 'function'");
console.log(`\n${BASE}: the build ${pixelOn ? "has" : "has no"} ChatGPT ads pixel id\n`);

try {
  /* ── The pixel, before and after Accept ─────────────────────────── */
  if (pixelOn) {
    const q0 = await ev("window.oaiq.q.map(function(a){ return Array.prototype.slice.call(a); })");
    check(sdkLoads() === 0 && !(await cookies()).some((c) => c.name.startsWith("__o")),
      "landing from a ChatGPT ad, no answer yet: the SDK is not requested and no OpenAI cookie is set",
      `before Accept: ${sdkLoads()} SDK request(s), cookies ${(await cookies()).map((c) => c.name)}`);
    check(q0[0]?.[0] === "init" && q0.some((a) => a[1] === "page_viewed"), "init and page_viewed wait in memory",
      `queue before Accept: ${JSON.stringify(q0)}`);

    /* A client-side route change, still before Accept. */
    await ev(`(function(){ var a=[...document.querySelectorAll('a[href="/reviews"]')][0]; a.click(); return true; })()`);
    await waitFor("location.pathname === '/reviews'");
    await wait(1200);
    const views = await ev("window.oaiq.q.filter(function(a){ return a[1] === 'page_viewed'; }).length");
    check(views === 2 && sdkLoads() === 0, "a client-side route change queues another page_viewed, still nothing loaded",
      `after a route change: ${views} page_viewed, ${sdkLoads()} SDK request(s)`);

    /* Accept, on the second page. */
    await ev(`[...document.querySelectorAll('button')].find(function(b){ return b.textContent.trim() === 'Accept all'; }).click()`);
    await waitFor("!!window.__oaiStub && window.__oaiStub.configStatus !== null", 10_000);
    const stub = await ev("window.__oaiStub");
    check(sdkLoads() === 1 && stub?.found?.filter((a) => a[1] === "page_viewed").length === 2 && stub.found[0]?.[0] === "init",
      "Accept: the SDK is requested once and finds init and both page_viewed queued",
      `after Accept: ${sdkLoads()} SDK request(s), queue found ${JSON.stringify(stub?.found)}`);
    check(stub?.configStatus === 404 && !seen.some((u) => u.includes("/pixel-config/")),
      "pixel-config is answered 404 inside the page and never reaches the network (automatic advanced matching off)",
      `pixel-config: status ${stub?.configStatus}, network ${seen.filter((u) => u.includes("/pixel-config/"))}`);
    const opp = (await cookies()).find((c) => c.name === "__oppref");
    check(opp?.value === "TEST_CLICK_1" && Math.abs(opp.expires - Date.now() / 1000 - 2592000) < 120 && opp.secure && opp.sameSite === "Lax" && opp.path === "/",
      "the ad click, gone from the address, becomes __oppref (30 days, secure, lax)",
      `__oppref: ${JSON.stringify(opp)}`);
    const stored = JSON.parse(await ev("localStorage.getItem('ss_consent')"));
    check(stored?.decision === "granted" && stored.v === 2, "the banner stores the answer with notice version 2", `ss_consent: ${JSON.stringify(stored)}`);

    await ev(`(function(){ var a=[...document.querySelectorAll('a[href="/contact"]')][0]; a.click(); return true; })()`);
    await waitFor("location.pathname === '/contact'");
    await wait(1200);
    const after = await ev("window.__oaiStub.after");
    check(after.filter((a) => a[0] === "measure" && a[1] === "page_viewed").length === 1,
      "after the SDK loaded, a route change sends page_viewed to it", `after load: ${JSON.stringify(after)}`);
  } else {
    await ev(`[...document.querySelectorAll('button')].find(function(b){ return b.textContent.trim() === 'Accept all'; }).click()`);
    await wait(1500);
    await ev(`(function(){ var a=[...document.querySelectorAll('a[href="/reviews"]')][0]; a.click(); return true; })()`);
    await waitFor("location.pathname === '/reviews'");
    await wait(1200);
    const state = await ev("({ oaiq: typeof window.oaiq, stub: typeof window.__oaiStub, guard: !!(window.fetch && window.fetch.__ssOaiGuard), park: sessionStorage.getItem('ss_oai_oppref') })");
    check(sdkLoads() === 0 && !answered.some((r) => r.url.includes("openai.com")) && state.oaiq === "undefined" && !state.guard && state.park === null &&
        !(await cookies()).some((c) => c.name.startsWith("__o")),
      "no pixel id: after Accept and a route change, nothing of OpenAI's is queued, loaded, wrapped, parked or set",
      `no pixel id, yet: ${JSON.stringify(state)}, OpenAI requests ${answered.filter((r) => r.url.includes("openai.com")).length}`);
  }

  /* ── A tap on the phone number ──────────────────────────────────── */
  {
    await go("/contact");
    const before = (await dataLayer()).length;
    const afterBefore = pixelOn ? (await ev("window.__oaiStub ? window.__oaiStub.after.length : 0")) : 0;
    await ev(`(function(){ var a=document.querySelector('a[href^="tel:"]'); a.addEventListener('click', function(e){ e.preventDefault(); }); a.click(); return true; })()`);
    await wait(800);
    const dl = (await dataLayer()).slice(before);
    const conv = dl.filter((a) => a[0] === "event" && a[1] === "conversion");
    const config = (await dataLayer()).find((a) => a[0] === "config" && String(a[1]).endsWith(`/${CALL}`));
    check(conv.length === 1 && conv[0][2].send_to === TAP && conv[0][2].value === 10 && conv[0][2].currency === "EUR" && conv[0][2].transaction_id,
      "a phone tap fires SS - Phone tap (EUR 10) with its own id", `tap conversions: ${JSON.stringify(conv)}`);
    check(!dl.some((a) => JSON.stringify(a).includes(CALL)) && !dl.some((a) => a[1] === "generate_lead") && dl.some((a) => a[0] === "event" && a[1] === "phone_call_click"),
      "no SS - Call label and no generate_lead for the tap; a plain phone_call_click instead",
      `tap events: ${JSON.stringify(dl.filter((a) => a[0] === "event"))}`);
    check(!!config && config[2]?.phone_conversion_number === "01 513 0424",
      "the SS - Call forwarding-number config is still there, unchanged",
      `call config: ${JSON.stringify(config ?? "none (build without NEXT_PUBLIC_GADS_CALL_LABEL?)")}`);
    const beacon = answered.filter((r) => r.url.endsWith("/api/track/phone-click"));
    const body = beacon.length ? JSON.parse(beacon.at(-1).body || "{}") : null;
    check(beacon.length >= 1 && body.phone && !("consent" in body) && !("conversionId" in body),
      "the tap still reaches /api/track/phone-click for the sheet (answered here), with nothing for Google",
      `phone-click beacon: ${JSON.stringify(body)}`);
    if (pixelOn) {
      const ai = (await ev("window.__oaiStub.after")).slice(afterBefore);
      const tap = ai.find((a) => a[1] === "custom");
      check(tap?.[3]?.custom_event_name === "phone_call_click" && tap[3].event_id === conv[0]?.[2]?.transaction_id && !ai.some((a) => a[1] === "lead_created"),
        "ChatGPT ads gets a custom phone_call_click with the tap's id, not a lead", `OpenAI after the tap: ${JSON.stringify(ai)}`);
    }
  }

  /* ── The contact form ────────────────────────────────────────────── */
  {
    await go("/contact");
    const before = (await dataLayer()).length;
    const afterBefore = pixelOn ? (await ev("window.__oaiStub ? window.__oaiStub.after.length : 0")) : 0;
    await ev(`(function(){
      var f = document.getElementById('message').form;
      f.elements.namedItem('name').value = 'TEST FourWinds, ignore';
      f.elements.namedItem('email').value = 'test-ignore@example.ie';
      f.elements.namedItem('phone').value = '00353 87 123 4567';
      f.elements.namedItem('message').value = 'Test, ignore.';
      f.requestSubmit(); return true; })()`);
    await waitFor("/Message Sent/.test(document.body.innerText)", 10_000);
    await wait(500);
    const dl = (await dataLayer()).slice(before);
    const conv = dl.filter((a) => a[0] === "event" && a[1] === "conversion");
    const lead = dl.filter((a) => a[0] === "event" && a[1] === "generate_lead");
    check(conv.length === 1 && conv[0][2].send_to === "AW-17978501655/u8cHCNyipZocEJfU6PxC" && conv[0][2].transaction_id === "contact-conv-1" &&
        conv[0][2].value === 10 && conv[0][2].user_data?.phone_number === "+353871234567" &&
        lead.length === 1 && lead[0][2].lead_source === "contact_form" && lead[0][2].transaction_id === "contact-conv-1",
      "the contact form fires its lead label once with the route's id, E.164 phone, and generate_lead contact_form",
      `contact form: ${JSON.stringify({ conv, lead })}`);
    if (pixelOn) {
      const ai = (await ev("window.__oaiStub.after")).slice(afterBefore);
      const created = ai.find((a) => a[1] === "lead_created");
      check(created?.[2]?.amount === 1000 && created[3]?.event_id === "contact-conv-1",
        "the contact form's lead reaches ChatGPT ads as lead_created, 1000 cents, the same id", `OpenAI after the contact form: ${JSON.stringify(ai)}`);
    }
  }

  /* ── The SmartNet Wi-Fi enquiry, from a package page and a report ── */
  for (const [where, page, source, done] of [
    ["a package page", "/services/wifi/home-network-assessment", "wifi_enquiry", /Thanks, we have your details/],
    ["a check's report", `/wifi-check/report?r=${reportParam}`, "wifi_check", /we have your report|on its way to/],
  ]) {
    await go(page);
    const before = (await dataLayer()).length;
    const afterBefore = pixelOn ? (await ev("window.__oaiStub ? window.__oaiStub.after.length : 0")) : 0;
    const replies = wifiReplies;
    await ev(`(function(){
      var f = document.getElementById('wf-name').form;
      f.elements.namedItem('name').value = 'TEST FourWinds, ignore';
      f.elements.namedItem('phone').value = '087 123 4567';
      f.elements.namedItem('email').value = 'Test-Ignore@Example.IE';
      f.requestSubmit(); return true; })()`);
    await waitFor(`${done}.test(document.body.innerText)`, 10_000);
    await wait(500);
    const id = `wifi-conv-${replies + 1}`;
    const dl = (await dataLayer()).slice(before);
    const conv = dl.filter((a) => a[0] === "event" && a[1] === "conversion");
    const lead = dl.filter((a) => a[0] === "event" && a[1] === "generate_lead");
    const ud = dl.find((a) => a[0] === "set" && a[1] === "user_data");
    check(wifiReplies === replies + 1 && conv.length === 1 && conv[0][2].send_to === SMARTNET && conv[0][2].transaction_id === id && conv[0][2].value === 50 && conv[0][2].currency === "EUR",
      `${where}: the Wi-Fi form fires SS - SmartNet enquiry once, EUR 50, with the id the route answered`,
      `${where}: Wi-Fi conversions ${JSON.stringify(conv)}`);
    check(ud?.[2]?.phone_number === "+353871234567" && ud[2].email_address && conv[0]?.[2]?.user_data?.phone_number === "+353871234567",
      `${where}: Enhanced Conversions get the phone as E.164`, `${where}: user_data ${JSON.stringify(ud)}`);
    check(lead.length === 1 && lead[0][2].lead_source === source && lead[0][2].transaction_id === id,
      `${where}: GA4 gets generate_lead with lead_source ${source} and the same id`, `${where}: generate_lead ${JSON.stringify(lead)}`);
    const posted = JSON.parse(answered.filter((r) => r.url.endsWith("/api/wifi-check")).at(-1)?.body || "{}");
    check(posted.consent?.decision === "granted" && posted.consent.v === 2, `${where}: the enquiry posts the banner answer with its version`,
      `${where}: posted consent ${JSON.stringify(posted.consent)}`);
    if (pixelOn) {
      const ai = (await ev("window.__oaiStub.after")).slice(afterBefore);
      const init = ai.find((a) => a[0] === "init" && a[1]?.user);
      const created = ai.find((a) => a[1] === "lead_created");
      check(init?.[1].user.email_sha256 === sha("test-ignore@example.ie") && init[1].user.phone_number_sha256 === sha("353871234567") &&
          created?.[2]?.amount === 5000 && created[2].currency === "EUR" && created[3]?.event_id === id,
        `${where}: ChatGPT ads gets lead_created with hashed email and phone, 5000 cents and the same id`,
        `${where}: OpenAI after the enquiry ${JSON.stringify(ai)}`);
    }
  }

  /* ── Nothing left the machine ───────────────────────────────────── */
  const external = seen.filter((u) => { try { return new URL(u).host !== local && !u.startsWith("data:"); } catch { return false; } });
  const unanswered = external.filter((u) => !answered.some((r) => r.url === u));
  check(unanswered.length === 0,
    `${external.length} outbound request(s) (${[...new Set(external.map((u) => new URL(u).host))].join(", ")}) were all answered here`,
    `requests that were not answered here: ${unanswered.join(" ")}`);
} catch (err) {
  fail(`the check stopped: ${err.message}`);
}

ws.close();
if (bad) {
  console.error(`\n${bad} problem${bad === 1 ? "" : "s"}.\n`);
  process.exit(1);
}
console.log("\nThe tags do what they should, and nothing left the machine.\n");
process.exit(0);
