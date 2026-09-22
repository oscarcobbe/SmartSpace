#!/usr/bin/env node
/**
 * Does the click id actually reach the payment?
 *
 * ── WHY A THIRD CHECK ────────────────────────────────────────────
 *
 * check-consent-attribution.mjs tests the module. check-attribution-live.mjs
 * walks a real ad click through a real browser and confirms the id is still in
 * localStorage after the banner. Both pass. Both passed through September,
 * while the offline conversion feed carried ten Smart Space sales that month
 * and not one of them had a click id on it.
 *
 * Neither check asks the only question that decides whether a sale can ever be
 * attributed: is the id in the body of the request that creates the payment.
 * getAttribution() is read in CartDrawer.tsx and posted to /api/checkout,
 * which writes metadata[gclid] on the Stripe session, which is where the feed
 * reads it from. That is four files agreeing with each other, and the previous
 * two failures in this saga were both agreements between two files that each
 * looked fine on its own.
 *
 * So this arrives on an ad URL, accepts the banner, puts something in the
 * basket, presses checkout, and reads the request Stripe is about to be sent.
 * If attribution.gclid is not in it, the sale is unattributable no matter what
 * the upload does afterwards, and this says so before the month is over.
 *
 *   node scripts/check-gclid-reaches-checkout.mjs
 *   node scripts/check-gclid-reaches-checkout.mjs --site=http://localhost:3000
 */
import { spawn } from "node:child_process";
import fs from "node:fs";

const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SITE = process.argv.find((a) => a.startsWith("--site="))?.split("=")[1] || "https://smart-space.ie";
const GCLID = "TestClickIdForTheCheckoutGuard";

const dir = fs.mkdtempSync("/tmp/gclid-checkout-");
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`,
  "--no-first-run", "--disable-gpu", "--hide-scrollbars", "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });

const wsUrl = await new Promise((res, rej) => {
  let buf = "";
  const t = setTimeout(() => rej(new Error("Chrome never announced a debugging port")), 20_000);
  chrome.stderr.on("data", (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(t); res(m[1]); }
  });
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const events = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  } else if (m.method) events.push(m);
});
const cdp = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq; pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const { targetId } = await cdp("Target.createTarget", { url: "about:blank" });
const { sessionId } = await cdp("Target.attachToTarget", { targetId, flatten: true });
await cdp("Page.enable", {}, sessionId);
await cdp("Runtime.enable", {}, sessionId);
await cdp("Network.enable", {}, sessionId);

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await cdp(
    "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? "page script threw");
  return result.value;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const problems = [];
const say = (s) => console.log(s);

try {
  /* 1. Arrive the way a customer arrives: on an ad URL. */
  await cdp("Page.navigate", { url: `${SITE}/?gclid=${GCLID}&utm_source=google&utm_medium=cpc` }, sessionId);
  await wait(3500);

  /* 2. Accept the banner, the way the other checks do. A click id parked
        behind an undecided banner is a click id nobody has yet. */
  const accepted = await evaluate(`(() => {
    const b = [...document.querySelectorAll("button")]
      .find((x) => /accept/i.test(x.textContent || ""));
    if (!b) return "no accept button";
    b.click();
    return "clicked";
  })()`);
  await wait(1200);
  if (accepted !== "clicked") problems.push(`the banner: ${accepted}`);

  /* 3. The id has to be on them before anything else is worth checking. */
  const stored = await evaluate(`(() => {
    try { return localStorage.getItem("ss_attribution"); } catch { return null; }
  })()`);
  const gclidStored = stored ? (JSON.parse(stored).gclid ?? null) : null;
  if (gclidStored !== GCLID) {
    problems.push(`the click id is not in storage after the banner: ${JSON.stringify(gclidStored)}`);
  } else {
    say(`ok    the click id survives the banner`);
  }

  /*
   * 4. Press the real button, the way a customer does.
   *
   * This used to build the request itself: read storage, call fetch with the
   * body it expected the drawer to send, then check that its own request
   * carried what it had just put in. A review caught it on 22 September. It
   * proved only that the check agreed with itself; a button that stopped
   * sending attribution, or never sent consent, would still have passed.
   *
   * Now it goes to the paid landing page, answers the one required question,
   * picks a date and a time, and presses "Book Installation Now". The request
   * is paused at the browser, read, and then failed there, so it never reaches
   * the server and no Stripe session is ever created by this check.
   */
  await cdp("Fetch.enable", { patterns: [{ urlPattern: "*/api/checkout", requestStage: "Request" }] }, sessionId);
  await cdp("Page.navigate", { url: `${SITE}/ring-installation` }, sessionId);
  await wait(5000);
  const press = (re) => evaluate(`(() => {
    const b = [...document.querySelectorAll("button")].filter((x) => x.offsetParent && !x.disabled)
      .find((x) => ${re}.test(((x.textContent || "") + " " + (x.getAttribute("aria-label") || "")).replace(/\\s+/g, " ")));
    if (!b) return "missing";
    b.click();
    return "ok";
  })()`);
  const steps = [
    ["the wiring answer", "/^Yes/"],
    ["an installation date", "/(Mon|Tue|Wed|Thu|Fri) \\d{1,2} [A-Z][a-z]{2}/"],
    ["a time", "/\\d{1,2}:\\d{2}/"],
    ["Book Installation Now", "/Book Installation Now/"],
  ];
  for (const [what, re] of steps) {
    const r = await press(re);
    if (r !== "ok") { problems.push(`could not press ${what} on /ring-installation: the page has changed`); break; }
    await wait(1200);
  }

  /* 5. The request the button sent, paused before it left the browser. */
  let paused = null;
  for (let i = 0; i < 20 && !paused; i++) {
    paused = events.find((e) => e.method === "Fetch.requestPaused") ?? null;
    if (!paused) await wait(250);
  }
  if (!paused) {
    if (!problems.length) problems.push("pressing Book Installation Now sent no request to /api/checkout");
  } else {
    await cdp("Fetch.failRequest", { requestId: paused.params.requestId, errorReason: "Aborted" }, sessionId);
    let parsed = null;
    try { parsed = JSON.parse(paused.params.request.postData ?? "null"); } catch { /* below */ }
    const onWire = parsed?.attribution?.gclid ?? null;
    if (onWire !== GCLID) {
      problems.push(
        `the checkout request carries no click id (attribution.gclid = ${JSON.stringify(onWire)}). ` +
        `Every sale made this way is unattributable, whatever the offline upload does afterwards.`);
    } else {
      say(`ok    the real button sends the click id, so Stripe will carry it`);
    }
    /* The banner was accepted above, so the request must say so. Without it
       the offline upload sends the sale as unspecified and Google, for a
       customer in Ireland, discards it. */
    if (parsed?.consent?.decision !== "granted") {
      problems.push(
        `the checkout request does not carry the cookie answer (consent = ${JSON.stringify(parsed?.consent ?? null)}). ` +
        `Google will discard this sale when it is uploaded.`);
    } else {
      say(`ok    the real button sends the cookie answer, so Google may count the sale`);
    }
  }
} finally {
  ws.close(); chrome.kill();
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
}

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? "" : "s"} on ${SITE}:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error("");
  process.exit(1);
}
console.log(`\nA click on an ad reaches the payment with its click id on ${SITE}.\n`);
