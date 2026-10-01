#!/usr/bin/env node
/**
 * The ChatGPT ads pixel, both halves, does what /privacy says and nothing more.
 *
 * src/lib/chatgpt-pixel.ts (the browser) and fireOpenAi in
 * src/lib/server-conversions.ts (OpenAI's Conversions API) are compiled and
 * run here against a stub browser and a stub fetch. Nothing is sent anywhere.
 *
 * What has to hold:
 *
 *   - With NEXT_PUBLIC_OAI_PIXEL_ID unset, nothing at all: no queue, no
 *     script, no cookie, no request. The pixel does not exist yet.
 *   - Nothing loads before Accept, and an Accept given before /privacy named
 *     OpenAI (consent version 1) does not load it either.
 *   - An ad click (?oppref=) survives until Accept a page later, and becomes
 *     the __oppref cookie then.
 *   - The SDK's pixel-config lookup is answered 404, which keeps automatic
 *     advanced matching off; every other request passes through.
 *   - Leads carry hashed email and phone (E.164 digits), cents, the lead's id.
 *   - The server copy goes only with a key, a pixel id and an OpenAI-era
 *     Accept, carries the same id, and never holds up the lead.
 *   - The Google Ads pixel from the server stays quiet when the browser's own
 *     tag ran (_gcl_au), and a lead reaches GA4 as server_lead.
 *
 * check-openai-capi.mjs checks that the two halves pair: one id, the same
 * hashes, every route and form wired the same way.
 *
 *   node scripts/check-chatgpt-pixel.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import ts from "typescript";

/* Bookings on Google Calendar have their own check (check-booking-engine.mjs); this one runs the routes on the Calendly path it was written for, whatever the build's environment says. */
for (const k of ["BOOKING_BACKEND", "GOOGLE_BOOKING_SA_EMAIL", "GOOGLE_WIF_PROVIDER", "GOOGLE_BOOKING_SA_KEY", "GOOGLE_SOURCE_ACCESS_TOKEN", "BOOKING_CALENDAR_OWNER"]) delete process.env[k];

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SDK = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
const PIXEL = "check-pixel-id";
const sha = (s) => createHash("sha256").update(s).digest("hex");

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const fail = (m) => { bad++; console.error(`FAIL  ${m}`); };
const check = (cond, good, wrong) => (cond ? ok(good) : fail(wrong));

/* ── Compiling the modules ──────────────────────────────────────── */

const dir = mkdtempSync(join(tmpdir(), "chatgpt-pixel-"));
const transpile = (rel) =>
  ts.transpileModule(readFileSync(join(ROOT, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from\s+"\.\/(attribution|consent-version|oai-event-id|phone)"/g, 'from "./$1.mjs"');
for (const name of ["attribution", "consent-version", "oai-event-id", "phone"]) {
  writeFileSync(join(dir, `${name}.mjs`), transpile(`src/lib/${name}.ts`));
}
const pixelJs = transpile("src/lib/chatgpt-pixel.ts");
const serverJs = transpile("src/lib/server-conversions.ts");
let copies = 0;
/* A fresh copy per case: both modules keep state, and read env when loaded. */
async function load(js, env) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const file = join(dir, `m${++copies}.mjs`);
  writeFileSync(file, js);
  return import(pathToFileURL(file).href);
}

/* ── A browser tab just real enough ─────────────────────────────── */

function store() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

function tab() {
  const local = store();
  const session = store();
  const jar = new Map();
  const cookieWrites = [];
  const t = {
    local, session, jar, cookieWrites,
    /** A page load: a new window over the same tab storage. */
    visit(path = "/", search = "", hostname = "localhost") {
      const scripts = [];
      const realFetch = async (url) => ({ ok: true, status: 200, url: String(url) });
      const document = {
        get cookie() { return [...jar].map(([k, v]) => `${k}=${v}`).join("; "); },
        set cookie(v) { cookieWrites.push(v); const [pair] = String(v).split(";"); const i = pair.indexOf("="); jar.set(pair.slice(0, i), pair.slice(i + 1)); },
        createElement: () => ({}),
        head: { appendChild: (el) => scripts.push(el.src) },
      };
      const window = { location: { pathname: path, search, hostname }, fetch: realFetch };
      globalThis.window = window;
      globalThis.document = document;
      globalThis.localStorage = local;
      globalThis.sessionStorage = session;
      window.scripts = scripts;
      window.queued = () => (window.oaiq?.q ?? []).map((a) => Array.from(a));
      return window;
    },
    /** What CookieBanner does on a press: store the answer, then run the queue. */
    answer(window, decision, v = 2) {
      local.setItem("ss_consent", JSON.stringify({ decision, decidedAt: Date.now(), v }));
      if (decision !== "granted") return;
      const q = window.__ssOnConsent;
      if (Array.isArray(q)) { q.forEach((fn) => fn()); q.length = 0; }
    },
  };
  return t;
}

const settle = () => new Promise((r) => setTimeout(r, 30));

try {
  /* 1. The pixel does not exist yet. */
  {
    const t = tab();
    t.local.setItem("ss_consent", JSON.stringify({ decision: "granted", decidedAt: Date.now(), v: 2 }));
    const w = t.visit("/", "?oppref=CLICK");
    const realFetch = w.fetch;
    const px = await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: undefined });
    px.startChatGptPixel();
    px.oaiPageViewed("/");
    px.oaiLead("a@b.ie", "0871234567", 10, "id-1");
    px.oaiOrder("cs_1", 10, "eur");
    px.oaiPhoneTap("tap-1");
    await settle();
    check(
      w.oaiq === undefined && w.scripts.length === 0 && t.cookieWrites.length === 0 && !w.__ssOnConsent && w.fetch === realFetch &&
        t.session.getItem("ss_oai_oppref") === null,
      "NEXT_PUBLIC_OAI_PIXEL_ID unset: nothing queued, loaded, parked, stored or wrapped",
      "with no pixel id something still happened in the browser",
    );
  }

  /* 2. Nothing before an answer. */
  {
    const t = tab();
    const w = t.visit("/", "?oppref=CLICK");
    const px = await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL });
    px.startChatGptPixel();
    px.oaiPageViewed("/");
    const q = w.queued();
    check(w.scripts.length === 0 && t.cookieWrites.length === 0, "no answer yet: the SDK is not loaded and no cookie is set",
      `before any answer: scripts ${JSON.stringify(w.scripts)}, cookies ${JSON.stringify(t.cookieWrites)}`);
    check(q.length === 2 && q[0][0] === "init" && q[0][1].pixelId === PIXEL && q[1][0] === "measure" && q[1][1] === "page_viewed" && q[1][2].type === "contents",
      "init and page_viewed wait in memory", `queue should be init then page_viewed, got ${JSON.stringify(q)}`);
    check(t.session.getItem("ss_oai_oppref") === "CLICK", "the ad click is parked for this tab", "the ad click was not parked");
  }

  /* 3. Ad click on one page, Accept on the next. */
  {
    const t = tab();
    t.visit("/", "?oppref=KEEP_ME", "smart-space.ie");
    (await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL })).startChatGptPixel();
    const w = t.visit("/contact", "", "smart-space.ie");
    const px = await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL });
    px.startChatGptPixel();
    px.oaiPageViewed("/contact");
    check(w.scripts.length === 0, "second page, still no answer: nothing loaded", "loaded before the answer on the second page");
    t.answer(w, "granted");
    const written = t.cookieWrites.find((c) => c.startsWith("__oppref="));
    check(w.scripts.filter((s) => s === SDK).length === 1, "Accept: the SDK is requested once", `Accept loaded ${JSON.stringify(w.scripts)}`);
    check(
      t.jar.get("__oppref") === "KEEP_ME" && /; path=\/; max-age=2592000; samesite=lax; secure; domain=smart-space\.ie$/.test(written ?? "") &&
        t.session.getItem("ss_oai_oppref") === null,
      "Accept a page later: __oppref holds the ad click, 30 days, on smart-space.ie, and the park is cleared",
      `__oppref after Accept: ${JSON.stringify(written)}`,
    );
    px.oaiPageViewed("/contact");
    px.oaiPageViewed("/reviews");
    const views = w.queued().filter((a) => a[1] === "page_viewed").length;
    check(views === 2, "page_viewed once per route: a repeat of the same path is not sent again", `${views} page_viewed for two routes`);

    /* The SDK's matching setting, and everything else. */
    const cfg = await w.fetch("https://bzrcdn.openai.com/pixel-config/check.json");
    const other = await w.fetch("/api/contact");
    const req = await w.fetch(new Request("https://bzrcdn.openai.com/pixel-config/x"));
    check(cfg.status === 404 && req.status === 404 && other.status === 200,
      "pixel-config is answered 404 (automatic advanced matching off); other requests pass through",
      `pixel-config ${cfg.status}/${req.status}, other ${other.status}`);
  }

  /* 3b. The same within one document: Next.js changes page without a load,
     and the address loses ?oppref= on the first client-side route change. */
  {
    const t = tab();
    const w = t.visit("/", "?oppref=SPA_CLICK");
    const px = await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL });
    px.startChatGptPixel();
    px.oaiPageViewed("/");
    w.location.pathname = "/contact";
    w.location.search = "";
    px.oaiPageViewed("/contact");
    t.answer(w, "granted");
    check(w.scripts.length === 1 && t.jar.get("__oppref") === "SPA_CLICK",
      "Accept after a client-side route change: __oppref still holds the ad click",
      `after a route change: scripts ${w.scripts.length}, __oppref ${JSON.stringify(t.jar.get("__oppref"))}`);
  }

  /* 4. Accept on the landing page itself: the SDK reads the address. */
  {
    const t = tab();
    const w = t.visit("/", "?oppref=HERE");
    (await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL })).startChatGptPixel();
    t.answer(w, "granted");
    check(w.scripts.length === 1 && !t.jar.has("__oppref") && t.session.getItem("ss_oai_oppref") === null,
      "Accept on the landing page: the SDK loads and reads the click from the address itself",
      `landing-page Accept: scripts ${w.scripts.length}, cookie ${t.jar.get("__oppref")}`);
  }

  /* 5. Accept from before OpenAI was named; 6. a current one; 7. a refusal. */
  for (const [label, stored, loads] of [
    ["an Accept stored before the notice named OpenAI (no version)", { decision: "granted", decidedAt: Date.now() }, false],
    ["an Accept at version 1", { decision: "granted", decidedAt: Date.now(), v: 1 }, false],
    ["an Accept under the current notice", { decision: "granted", decidedAt: Date.now(), v: 2 }, true],
    ["Essential only", { decision: "denied", decidedAt: Date.now(), v: 2 }, false],
  ]) {
    const t = tab();
    t.local.setItem("ss_consent", JSON.stringify(stored));
    const w = t.visit("/", "?oppref=X");
    (await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL })).startChatGptPixel();
    check((w.scripts.length === 1) === loads && !t.jar.has("__oppref"),
      `${label}: the pixel ${loads ? "loads at once" : "stays off"}`,
      `${label}: scripts ${JSON.stringify(w.scripts)}, cookie ${t.jar.get("__oppref")}`);
  }

  /* 8. Admin pages and SmartCare Living's payment page. */
  for (const path of ["/admin/leads", "/smartcareliving-payment-success"]) {
    const t = tab();
    t.local.setItem("ss_consent", JSON.stringify({ decision: "granted", decidedAt: Date.now(), v: 2 }));
    const w = t.visit(path);
    const px = await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL });
    px.startChatGptPixel();
    px.oaiPageViewed(path);
    check(w.oaiq === undefined && w.scripts.length === 0, `${path}: nothing queued or loaded`, `${path} reached the pixel`);
  }

  /* 9. The events. */
  {
    const t = tab();
    t.local.setItem("ss_consent", JSON.stringify({ decision: "granted", decidedAt: Date.now(), v: 2 }));
    const w = t.visit("/contact");
    const px = await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL });
    px.startChatGptPixel();
    px.oaiLead("  Mary@Example.IE ", "087 123 4567", 50, "conv-1");
    await settle();
    px.oaiOrder("cs_test_1", 139.5, "eur");
    px.oaiPhoneTap("tap-1");
    const q = w.queued();
    const init = q.find((a) => a[0] === "init" && a[1].user);
    const lead = q.find((a) => a[1] === "lead_created");
    check(init?.[1].pixelId === PIXEL && init[1].user.email_sha256 === sha("mary@example.ie") && init[1].user.phone_number_sha256 === sha("353871234567"),
      "a lead's email (trimmed, lowercased) and phone (353..., no +) are hashed into init",
      `init user data: ${JSON.stringify(init)}`);
    check(lead && q.indexOf(init) < q.indexOf(lead) && lead[2].type === "customer_action" && lead[2].amount === 5000 && lead[2].currency === "EUR" && lead[3]?.event_id === "conv-1",
      "lead_created after it: customer_action, EUR 50 as 5000 cents, event_id the lead's conversion id",
      `lead_created: ${JSON.stringify(lead)}`);
    const order = q.find((a) => a[1] === "order_created");
    check(order && order[2].type === "contents" && order[2].amount === 13950 && order[2].currency === "EUR" && order[3]?.event_id === "cs_test_1",
      "order_created: contents, cents, currency, event_id the Stripe session",
      `order_created: ${JSON.stringify(order)}`);
    const tap = q.find((a) => a[1] === "custom");
    check(tap && tap[2].type === "custom" && tap[3]?.custom_event_name === "phone_call_click" && tap[3].event_id === "tap-1" && !q.some((a) => a[1] === "lead_created" && a[3]?.event_id === "tap-1"),
      "a phone tap is a custom phone_call_click, not a lead", `phone tap: ${JSON.stringify(tap)}`);
  }

  /* ── The phone, as Google and OpenAI match it ───────────────────── */
  {
    const { normalisePhone } = await import(pathToFileURL(join(dir, "phone.mjs")).href);
    const table = [
      ["087 123 4567", "+353871234567"],
      ["0871234567", "+353871234567"],
      ["00353 87 123 4567", "+353871234567"],
      ["353871234567", "+353871234567"],
      ["+353 87 123 4567", "+353871234567"],
      ["+353 (0)87 123 4567", "+353871234567"],
      ["(01) 513-0424", "+35315130424"],
      ["871234567", "+353871234567"],
      ["0044 7700 900123", "+447700900123"],
      ["+44 7700 900123", "+447700900123"],
      ["", ""],
      [undefined, ""],
      ["+", ""],
    ];
    const wrong = table.filter(([i, want]) => normalisePhone(i) !== want).map(([i, want]) => `${JSON.stringify(i)} gave ${normalisePhone(i)}, want ${want}`);
    check(!wrong.length, `${table.length} ways of writing a number come out as E.164`, `phone normalisation: ${wrong.join("; ")}`);
  }

  /* ── The server ─────────────────────────────────────────────────── */

  const sent = [];
  let openAiBehaviour = "ok";
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    sent.push({ url: u, init, body: init.body ? JSON.parse(init.body) : null });
    if (u.startsWith("https://bzr.openai.com/")) {
      if (openAiBehaviour === "throw") throw new Error("network down");
      if (openAiBehaviour === "hang") {
        return new Promise((_, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
      }
    }
    return new Response("", { status: 200 });
  };
  const quiet = { log: console.log, warn: console.warn, error: console.error };
  const silence = () => { console.log = console.warn = console.error = () => {}; };
  const loud = () => Object.assign(console, quiet);

  const lead = {
    gadsLabel: "CheckLabel",
    ga4EventName: "server_lead",
    value: 50,
    currency: "EUR",
    transactionId: "conv-1",
    gclid: "CheckClick",
    email: " Mary@Example.IE",
    phone: "087 123 4567",
    extraParams: { lead_source: "wifi_check" },
    adConsent: "granted",
    browser: { browserTagsRan: false, oppref: "OPP", obref: "OBR", sourceUrl: "https://smart-space.ie/wifi-check/report?r=x", ip: "203.0.113.9", userAgent: "check-agent" },
    openAi: { type: "lead_created", consented: true },
  };
  const env = { NEXT_PUBLIC_GA4_MEASUREMENT_ID: "G-CHECK", GA4_API_SECRET: "check-secret", NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL, OPENAI_ADS_API_KEY: "check-key" };
  async function fire(input, envOver = {}) {
    const mod = await load(serverJs, { ...env, ...envOver });
    sent.length = 0;
    silence();
    const t0 = Date.now();
    try { await mod.fireServerConversion(input); } finally { loud(); }
    return { took: Date.now() - t0, openai: sent.filter((r) => r.url.startsWith("https://bzr.openai.com/")), ads: sent.filter((r) => r.url.includes("googleadservices.com")), ga4: sent.filter((r) => r.url.includes("mp/collect")) };
  }

  {
    const r = await fire(lead);
    const req = r.openai[0];
    const ev = req?.body?.events?.[0];
    check(r.openai.length === 1 && req.url === `https://bzr.openai.com/v1/events?pid=${PIXEL}` && req.init.method === "POST" &&
        req.init.headers?.Authorization === "Bearer check-key" && req.init.signal,
      "the Conversions API gets one POST to the pixel, with the key as a bearer token and a timeout",
      `OpenAI request: ${JSON.stringify(req && { url: req.url, headers: req.init.headers, signal: !!req.init.signal })}`);
    check(ev && ev.id === "conv-1" && ev.type === "lead_created" && ev.action_source === "web" && typeof ev.timestamp_ms === "number" &&
        ev.source_url === lead.browser.sourceUrl && ev.oppref === "OPP" && ev.user.obref === "OBR" &&
        ev.user.emails_sha256?.[0] === sha("mary@example.ie") && ev.user.phone_numbers_sha256?.[0] === sha("353871234567") &&
        ev.user.ip_address === "203.0.113.9" && ev.user.user_agent === "check-agent" &&
        ev.data.type === "customer_action" && ev.data.amount === 5000 && ev.data.currency === "EUR",
      "the event carries the pixel's id, the click and browser references, hashed email and phone, cents",
      `OpenAI event: ${JSON.stringify(ev)}`);
    const pn = r.ads[0] && new URL(r.ads[0].url).searchParams.get("pn");
    check(r.ads.length === 1 && pn === sha("+353871234567"), "no _gcl_au: the Ads pixel fires, with the phone hashed as E.164",
      `Ads pixel: ${r.ads.map((x) => x.url).join(" ") || "none"}`);
    const g = r.ga4[0]?.body;
    check(g?.events?.[0]?.name === "server_lead" && g.events[0].params.lead_source === "wifi_check" && g.user_data?.sha256_phone_number === sha("+353871234567"),
      "GA4 gets server_lead, never generate_lead, with lead_source", `GA4 body: ${JSON.stringify(g)}`);
  }
  {
    const r = await fire({ ...lead, browser: { ...lead.browser, browserTagsRan: true } });
    check(r.ads.length === 0 && r.ga4.length === 1 && r.openai.length === 1,
      "_gcl_au on the request: the browser's tag records it and the server's Ads pixel stays quiet",
      `with the browser's tag running: ads ${r.ads.length}, ga4 ${r.ga4.length}, openai ${r.openai.length}`);
  }
  {
    const r = await fire({ ...lead, openAi: { type: "lead_created", consented: false } });
    check(r.openai.length === 0 && r.ads.length === 1, "an Accept from before OpenAI was named: Google only", `openai ${r.openai.length}`);
  }
  for (const [what, over] of [["OPENAI_ADS_API_KEY unset", { OPENAI_ADS_API_KEY: undefined }], ["NEXT_PUBLIC_OAI_PIXEL_ID unset", { NEXT_PUBLIC_OAI_PIXEL_ID: undefined }]]) {
    const r = await fire(lead, over);
    check(r.openai.length === 0 && r.ads.length === 1, `${what}: nothing goes to OpenAI, Google is unaffected`, `${what}: ${r.openai.length} OpenAI request(s)`);
  }
  {
    const r = await fire({ ...lead, adConsent: "denied" });
    check(sent.length === 0, "Essential only: nothing leaves the server", `${sent.length} request(s) after a refusal`);
    void r;
  }
  {
    const r = await fire({ ...lead, ga4EventName: "purchase", value: 139.5, transactionId: "cs_1", openAi: { type: "order_created", consented: true } });
    const ev = r.openai[0]?.body?.events?.[0];
    check(ev?.type === "order_created" && ev.data.type === "contents" && ev.data.amount === 13950 && ev.id === "cs_1",
      "a paid order goes as order_created, contents, keyed on the Stripe session", `order event: ${JSON.stringify(ev)}`);
  }
  {
    openAiBehaviour = "throw";
    const r1 = await fire(lead);
    openAiBehaviour = "hang";
    const r2 = await fire(lead);
    openAiBehaviour = "ok";
    check(r1.ads.length === 1 && r2.took < 4500,
      `OpenAI down or hanging: the fire still resolves (${r2.took} ms with a hung endpoint) and Google is unaffected`,
      `with OpenAI failing: ads ${r1.ads.length}, took ${r2.took} ms`);
  }
  {
    const mod = await load(serverJs, env);
    const b = mod.browserContext(new Request("https://smart-space.ie/api/contact", {
      method: "POST",
      headers: {
        cookie: "_ga=GA1.1.1.2; _gcl_au=1.1.99.123; __oppref=a%20click; __obref=ref-1",
        referer: "https://smart-space.ie/contact",
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
        "user-agent": "check-agent",
      },
    }));
    check(b.browserTagsRan === true && b.oppref === "a click" && b.obref === "ref-1" && b.sourceUrl === "https://smart-space.ie/contact" &&
        b.ip === "198.51.100.7" && b.userAgent === "check-agent",
      "browserContext reads _gcl_au, the OpenAI cookies, the page, the address and the agent off the request",
      `browserContext: ${JSON.stringify(b)}`);
    const none = mod.browserContext(new Request("https://smart-space.ie/api/contact", { method: "POST", headers: { cookie: "_ga=GA1.1.1.2; ss_x=1" } }));
    check(none.browserTagsRan === false && !none.oppref && !none.obref,
      "no _gcl_au (GA4's cookie alone is not Google Ads' tag): the browser's Ads tag did not run",
      `request without _gcl_au: ${JSON.stringify(none)}`);
  }

  /* ── The pieces that have to agree with this ────────────────────── */
  {
    const banner = readFileSync(join(ROOT, "src/components/CookieBanner.tsx"), "utf8");
    check(/JSON\.stringify\(\{\s*decision,\s*decidedAt: Date\.now\(\),\s*v: CONSENT_VERSION\s*\}/.test(banner),
      "the banner stores the notice version with every answer", "CookieBanner no longer stores v: CONSENT_VERSION with the answer");
    const privacy = readFileSync(join(ROOT, "src/app/privacy/page.tsx"), "utf8");
    check(/OpenAI/.test(privacy) && /__oppref/.test(privacy) && /__obref/.test(privacy),
      "/privacy names OpenAI and both of its cookies", "/privacy no longer names OpenAI, __oppref and __obref; the pixel must not run undisclosed");
    const mw = readFileSync(join(ROOT, "src/middleware.ts"), "utf8");
    const scriptSrc = mw.match(/: "script-src 'self'[^"]+"/)?.[0] ?? "";
    const connectSrc = mw.match(/"connect-src 'self'[^"]+"/)?.[0] ?? "";
    check(scriptSrc.includes("https://bzrcdn.openai.com") && connectSrc.includes("https://bzr.openai.com") && connectSrc.includes("https://bzrcdn.openai.com"),
      "the CSP lets the SDK load and send", "the CSP is missing bzrcdn.openai.com in script-src or bzr/bzrcdn.openai.com in connect-src");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (bad) {
  console.error(`\n${bad} problem${bad === 1 ? "" : "s"} with the ChatGPT ads pixel.\n`);
  process.exit(1);
}
console.log("\nThe ChatGPT ads pixel waits for an Accept that names OpenAI, and sends only what /privacy says.\n");
