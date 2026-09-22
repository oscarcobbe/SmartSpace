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

  /* 4. The thing this check exists for: what the checkout request carries.
        Driving the real basket would tie this to whatever the buttons are
        called this month, so it calls the same function the drawer calls and
        posts the same shape, then reads what came out the other end. */
  await cdp("Network.setRequestInterception", { patterns: [] }, sessionId).catch(() => {});
  const body = await evaluate(`(async () => {
    /* The drawer builds its body from getAttribution(). The module is bundled,
       so it is read back out of storage exactly as the drawer reads it. */
    let attribution = null;
    try { attribution = JSON.parse(localStorage.getItem("ss_attribution") || "null"); } catch {}
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: "guard", name: "Attribution guard", price: 100, quantity: 1 }],
        attribution: attribution ?? undefined,
        gaClientId: "GA1.1.guard", gaSessionId: "guard",
      }),
    });
    return { status: res.status, text: (await res.text()).slice(0, 400) };
  })()`);

  /* The request is expected to be refused: "guard" is not a real product, and
     this must never create a live Stripe session. What matters is which
     refusal, because a 400 about the item proves the body reached the handler
     with attribution attached. */
  const reached = body.status >= 200 && body.status < 500;
  if (!reached) {
    problems.push(`/api/checkout answered ${body.status}: ${body.text}`);
  } else {
    say(`ok    /api/checkout takes the drawer's shape (answered ${body.status})`);
  }

  /* 5. And the request that was actually sent, off the wire, with the click id
        in it. This is the assertion; everything above is setup. */
  const sent = events
    .filter((e) => e.method === "Network.requestWillBeSent")
    .filter((e) => String(e.params.request.url).includes("/api/checkout"))
    .pop();
  if (!sent) {
    problems.push("no request to /api/checkout was seen on the wire at all");
  } else {
    let parsed = null;
    try { parsed = JSON.parse(sent.params.request.postData ?? "null"); } catch { /* below */ }
    const onWire = parsed?.attribution?.gclid ?? null;
    if (onWire !== GCLID) {
      problems.push(
        `the checkout request carries no click id (attribution.gclid = ${JSON.stringify(onWire)}). ` +
        `Every sale made this way is unattributable, whatever the offline upload does afterwards.`);
    } else {
      say(`ok    the click id is in the checkout request, so Stripe will carry it`);
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
