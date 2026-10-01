#!/usr/bin/env node
/**
 * The server's copy of each ChatGPT ads conversion (OpenAI's Conversions
 * API), against the page's pixel event it must pair with.
 *
 * check-chatgpt-pixel.mjs covers the pixel's consent gate and the shape of
 * each event. This covers what makes the server copy count: OpenAI keeps one
 * event per pixel id, event name and id, so the pixel's event_id and the
 * server's id have to be the same string for every path that sends both, and
 * the hashes have to be the ones OpenAI computes on its side. Modelled on
 * SmartCare Living's scripts/check-openai-capi.mjs.
 *
 * The modules are compiled and run against a stub browser and a stub fetch.
 * Nothing is sent anywhere.
 *
 * What has to hold:
 *
 *   - The email and phone hashes are the ones OpenAI's docs publish for their
 *     own examples, from the browser and from the server alike.
 *   - The pixel's event_id and the server's id agree, for a lead's UUID and
 *     for a real-length Stripe session id (66 characters; the server cut it
 *     to 64 and the pixel did not, so every paid order counted twice).
 *   - Every lead route sends its conversion id to both halves and asks
 *     openAiConsented; every form hands the route's id to the pixel.
 *   - Nothing goes to OpenAI without an Accept under the notice that names it,
 *     without OPENAI_ADS_API_KEY, or without NEXT_PUBLIC_OAI_PIXEL_ID.
 *   - A phone-only lead and an email-only lead both reach OpenAI.
 *   - The ChatGPT ad click reaches the server copy and the CRM lead from the
 *     pixel's cookie or, when the pixel never loaded, the form's attribution,
 *     and the CRM lead and the Stripe session keep it only under an Accept
 *     that names OpenAI, though the attribution record holds it under any.
 *   - OpenAI failing, hanging or refusing never holds up or fails the lead.
 *
 *   node scripts/check-openai-capi.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PIXEL = "check-pixel-id";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

/* Published in OpenAI's Conversions API and Measurement Pixel docs, for
   "+1 (415) 555-2671" (normalised to 14155552671) and user@example.com.
   Written out rather than computed, so a wrong normalisation cannot agree
   with itself. */
const DOCS_PHONE_SHA = "758fbf68945f21c416814c539ab578876c8d98fb69e6da692def92cd52417fe0";
const DOCS_EMAIL_SHA = "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514";

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const fail = (m) => { bad++; console.error(`FAIL  ${m}`); };
const check = (cond, good, wrong) => (cond ? ok(good) : fail(wrong));

/* ── Compiling the modules ──────────────────────────────────────── */

const dir = mkdtempSync(join(tmpdir(), "openai-capi-"));
const transpile = (rel) =>
  ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
    .replace(/from\s+"\.\/(attribution|consent-version|oai-event-id|phone)"/g, 'from "./$1.mjs"')
    .replace(/from\s+"\.\/crm\/db"/g, 'from "./crm-db-stub.mjs"');
for (const name of ["attribution", "consent-version", "oai-event-id", "phone"]) {
  writeFileSync(join(dir, `${name}.mjs`), transpile(`src/lib/${name}.ts`));
}
/* ad-consent.ts records answers in the CRM database; only its pure functions
   are exercised here. */
writeFileSync(join(dir, "crm-db-stub.mjs"), "export const crm = async () => null;\nexport const crmConfigured = () => false;\n");
const serverJs = transpile("src/lib/server-conversions.ts");
const pixelJs = transpile("src/lib/chatgpt-pixel.ts");
let copies = 0;
/* A fresh copy per case: both modules read env when loaded, and keep state. */
async function load(js, env = {}) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const file = join(dir, `m${++copies}.mjs`);
  writeFileSync(file, js);
  return import(pathToFileURL(file).href);
}
const crmMod = await load(transpile("src/lib/crm.ts"));
const consentMod = await load(transpile("src/lib/ad-consent.ts"));
const { OPENAI_CONSENT_VERSION } = await import(pathToFileURL(join(dir, "consent-version.mjs")).href);

/* ── The browser half, as far as it pairs with the server ─────────── */

function store() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

/** What the pixel queues for a visitor who accepted under the current notice. */
async function pixelQueue(run) {
  const local = store();
  local.setItem("ss_consent", JSON.stringify({ decision: "granted", decidedAt: Date.now(), v: 2 }));
  const scripts = [];
  globalThis.localStorage = local;
  globalThis.sessionStorage = store();
  globalThis.document = { cookie: "", createElement: () => ({}), head: { appendChild: (el) => scripts.push(el.src) } };
  globalThis.window = { location: { pathname: "/contact", search: "", hostname: "localhost" }, fetch: async () => ({ ok: true, status: 200 }) };
  const px = await load(pixelJs, { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL });
  px.startChatGptPixel();
  run(px);
  await new Promise((r) => setTimeout(r, 30));
  return (globalThis.window.oaiq?.q ?? []).map((a) => Array.from(a));
}

/* ── The server half ────────────────────────────────────────────── */

const sent = [];
let openAiAnswer = "ok";
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  sent.push({ url: u, init, body: init.body ? JSON.parse(init.body) : null });
  if (u.startsWith("https://bzr.openai.com/")) {
    if (openAiAnswer === "throw") throw new Error("network down");
    if (openAiAnswer === "hang") return new Promise((_, rej) => init.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
    if (openAiAnswer === "refuse") return new Response('{"error":"bad event"}', { status: 400 });
  }
  return new Response("", { status: 200 });
};
const quiet = { log: console.log, warn: console.warn, error: console.error };
const env = { NEXT_PUBLIC_OAI_PIXEL_ID: PIXEL, OPENAI_ADS_API_KEY: "check-key", NEXT_PUBLIC_GA4_MEASUREMENT_ID: undefined, GA4_API_SECRET: undefined };
const lead = {
  gadsLabel: "CheckLabel",
  ga4EventName: "server_lead",
  value: 10,
  currency: "EUR",
  transactionId: "6f1c2b9e-3d4a-4e5f-8a7b-0c1d2e3f4a5b",
  email: "mary@example.ie",
  phone: "087 123 4567",
  adConsent: "granted",
  browser: { browserTagsRan: true, sourceUrl: "https://smart-space.ie/contact", ip: "203.0.113.9", userAgent: "check-agent" },
  openAi: { type: "lead_created", consented: true },
};
/** fireServerConversion once, quietly; what went to OpenAI and how long it took. */
async function fire(input, envOver = {}) {
  const mod = await load(serverJs, { ...env, ...envOver });
  sent.length = 0;
  console.log = console.warn = console.error = () => {};
  const t0 = Date.now();
  let threw = null;
  try { await mod.fireServerConversion(input); } catch (e) { threw = e; } finally { Object.assign(console, quiet); }
  const openai = sent.filter((r) => r.url.startsWith("https://bzr.openai.com/"));
  return { took: Date.now() - t0, threw, openai, event: openai[0]?.body?.events?.[0], others: sent.length - openai.length };
}
const serverMod = await load(serverJs, env);
const request = (headers) => new Request("https://smart-space.ie/api/contact", { method: "POST", headers });

try {
  /* 1. Hashing, against OpenAI's own published examples. */
  {
    const r = await fire({ ...lead, email: "  User@Example.com ", phone: "+1 (415) 555-2671" });
    check(r.event?.user?.emails_sha256?.[0] === DOCS_EMAIL_SHA && r.event.user.phone_numbers_sha256?.[0] === DOCS_PHONE_SHA,
      "server: email and phone hash to the digests in OpenAI's docs (trimmed and lowercased; digits with country code, no +)",
      `server hashes: ${JSON.stringify(r.event?.user)}`);
    const q = await pixelQueue((px) => px.oaiLead("  User@Example.com ", "+1 (415) 555-2671", 10, lead.transactionId));
    const init = q.find((a) => a[0] === "init" && a[1].user);
    check(init?.[1].user.email_sha256 === DOCS_EMAIL_SHA && init[1].user.phone_number_sha256 === DOCS_PHONE_SHA,
      "pixel: the same two digests go into init", `pixel hashes: ${JSON.stringify(init)}`);
    const irish = await fire({ ...lead, phone: "+353 (0)87 123 4567" });
    check(irish.event?.user?.phone_numbers_sha256?.[0] === sha("353871234567"),
      "an Irish number written with (0) hashes as 353871234567", `Irish phone: ${JSON.stringify(irish.event?.user)}`);
  }

  /* 2. One id for the pair, for each event both halves send. */
  {
    const uuid = lead.transactionId;
    const stripe = `cs_live_${"a1B2c3D4e5".repeat(5)}F6g7H8i9`; // 66 characters, as Stripe issues them
    const q = await pixelQueue((px) => {
      px.oaiLead("mary@example.ie", "0871234567", 10, uuid);
      px.oaiOrder(stripe, 139, "eur");
    });
    const pixelLead = q.find((a) => a[1] === "lead_created")?.[3]?.event_id;
    const pixelOrder = q.find((a) => a[1] === "order_created")?.[3]?.event_id;
    const serverLead = (await fire(lead)).event?.id;
    const serverOrder = (await fire({ ...lead, ga4EventName: "purchase", value: 139, transactionId: stripe, openAi: { type: "order_created", consented: true } })).event?.id;
    check(pixelLead === uuid && serverLead === uuid, "a lead: the pixel's event_id and the server's id are the route's conversion id, whole",
      `lead ids: pixel ${pixelLead}, server ${serverLead}`);
    check(stripe.length === 66 && pixelOrder && pixelOrder === serverOrder && pixelOrder.length <= 64,
      `a paid order: a ${stripe.length}-character Stripe session id goes out as one ${pixelOrder?.length}-character id from both halves`,
      `order ids differ, so OpenAI would count the sale twice: pixel ${pixelOrder} (${pixelOrder?.length}), server ${serverOrder} (${serverOrder?.length})`);
  }

  /* 3. The routes and the forms hand the same id to both halves. */
  {
    const routes = ["src/app/api/contact/route.ts", "src/app/api/booking/route.ts", "src/app/api/checkout/free/route.ts", "src/app/api/wifi-check/route.ts"];
    const wrong = [];
    for (const f of routes) {
      const src = read(f);
      if (!/transactionId:\s*conversionId/.test(src)) wrong.push(`${f}: the server copy is not keyed on conversionId`);
      if (!/NextResponse\.json\(\{[^}]*\bconversionId\b/.test(src)) wrong.push(`${f}: the answer does not give the page its conversionId`);
      /* One decision for both uses of the click: the OpenAI copy and the CRM. */
      if (!/const openAiOk = openAiConsented\(consentFrom\(consent\)\);/.test(src)) wrong.push(`${f}: no openAiOk from openAiConsented(consentFrom(consent))`);
      if (!/openAi:\s*\{\s*type:\s*"lead_created",\s*consented:\s*openAiOk\s*\}/.test(src)) wrong.push(`${f}: the OpenAI copy does not go by openAiOk`);
      if (!/browserContext\(request,\s*\w+\)/.test(src)) wrong.push(`${f}: browserContext is not given the form's attribution`);
      if ((src.match(/chatGptAdOf\(/g) ?? []).length !== 1 || !/\.\.\.chatGptAdOf\(browser,\s*openAiOk\)/.test(src)) wrong.push(`${f}: the CRM lead does not get the click under openAiOk, and only then`);
    }
    const hook = read("src/app/api/webhooks/stripe/route.ts");
    if (!/transactionId:\s*sessionId/.test(hook) || !/const openAiOk = openAiConsented\(consent\);/.test(hook) || !/openAi:\s*\{\s*type:\s*"order_created",\s*consented:\s*openAiOk\s*\}/.test(hook)) wrong.push("the Stripe webhook's OpenAI copy is not keyed on the session id under openAiConsented");
    if ((hook.match(/chatGptAdOf\(/g) ?? []).length !== 1 || !/\.\.\.chatGptAdOf\(browser,\s*openAiOk\)/.test(hook)) wrong.push("the paid order's CRM lead does not get the click under openAiOk, and only then");
    const checkout = read("src/app/api/checkout/route.ts");
    if (!/browserContext\(request,\s*attribution\)/.test(checkout) ||
        !/if \(openAiConsented\(consent\)\) \{\s*if \(browser\.oppref\) params\.append\("metadata\[oai_oppref\]"[^\n]*\n\s*if \(browser\.obref\) params\.append\("metadata\[oai_obref\]"/.test(checkout) ||
        (checkout.match(/metadata\[oai_o(pp|b)ref\]/g) ?? []).length !== 2) wrong.push("/api/checkout does not record the ad click for the webhook, or records it without an Accept that names OpenAI");
    for (const f of ["src/components/ContactForm.tsx", "src/components/CallbackForm.tsx", "src/components/wifi/WifiEnquiryForm.tsx"]) {
      const src = read(f);
      if (!/fireLeadConversion\([^)]*json\.conversionId/.test(src)) wrong.push(`${f}: the page's events do not use the route's conversionId`);
      if (!/attribution:\s*getAttribution\(\)/.test(src)) wrong.push(`${f}: the form does not send the attribution record`);
    }
    if (!/oaiLead\(email,\s*phone,\s*value,\s*conversionId\)/.test(read("src/lib/lead-conversion.ts"))) wrong.push("lib/lead-conversion no longer gives oaiLead the conversion id");
    if (!/conversionId:\s*data\.conversionId/.test(read("src/app/services/free-consultation/page.tsx"))) wrong.push("the free consultation does not carry its conversionId to the success page");
    const success = read("src/app/smartspace-payment-success/page.tsx");
    if (!/oaiLead\([^)]*state\.conversionId\)/.test(success) || !/oaiOrder\(state\.sessionId/.test(success)) wrong.push("the success page does not send the free consultation's conversionId or the paid order's session id");
    check(!wrong.length, `${routes.length} lead routes, the webhook, checkout and every form agree on the id and the consent rule`, wrong.join("\n      "));
  }

  /* 4. Consent: an Accept under the notice that names OpenAI, and nothing else. */
  {
    const at = Date.now() - 60_000;
    const cases = [
      [{ decision: "granted", decidedAt: at, v: 2 }, true, "an Accept under version 2"],
      [{ decision: "granted", decidedAt: at, v: 1 }, false, "an Accept under version 1"],
      [{ decision: "granted", decidedAt: at }, false, "an Accept stored before versions existed"],
      [{ decision: "denied", decidedAt: at, v: 2 }, false, "a Decline"],
      [{ decision: "granted", decidedAt: "soon", v: 2 }, false, "an answer with no real time"],
      [null, false, "no answer"],
    ];
    const wrong = cases.filter(([c, want]) => consentMod.openAiConsented(consentMod.consentFrom(c)) !== want).map(([, want, what]) => `${what} should be ${want}`);
    check(!wrong.length, `openAiConsented: only an Accept under the notice naming OpenAI (${cases.length} answers)`, wrong.join("; "));
    const old = await fire({ ...lead, openAi: { type: "lead_created", consented: false } });
    const declined = await fire({ ...lead, adConsent: "denied" });
    check(old.openai.length === 0 && declined.openai.length === 0 && declined.others === 0,
      "an older Accept sends nothing to OpenAI; a Decline sends nothing to anybody",
      `old Accept: ${old.openai.length} to OpenAI; Decline: ${declined.openai.length} to OpenAI, ${declined.others} elsewhere`);
  }

  /* 5. Off until both values exist. */
  for (const [what, over] of [["OPENAI_ADS_API_KEY unset", { OPENAI_ADS_API_KEY: undefined }], ["OPENAI_ADS_API_KEY blank", { OPENAI_ADS_API_KEY: "  " }], ["NEXT_PUBLIC_OAI_PIXEL_ID unset", { NEXT_PUBLIC_OAI_PIXEL_ID: undefined }]]) {
    const r = await fire(lead, over);
    check(r.openai.length === 0 && !r.threw, `${what}: nothing goes to OpenAI`, `${what}: ${r.openai.length} request(s) to OpenAI`);
  }

  /* 6. A lead with one way to reach them still pairs. */
  {
    const phoneOnly = await fire({ ...lead, email: undefined });
    const emailOnly = await fire({ ...lead, phone: undefined });
    check(phoneOnly.event && !phoneOnly.event.user.emails_sha256 && phoneOnly.event.user.phone_numbers_sha256?.[0] === sha("353871234567"),
      "a phone-only lead reaches OpenAI, matched on the hashed phone alone", `phone-only: ${JSON.stringify(phoneOnly.event?.user)}`);
    check(emailOnly.event && !emailOnly.event.user.phone_numbers_sha256 && emailOnly.event.user.emails_sha256?.[0] === sha("mary@example.ie"),
      "an email-only lead reaches OpenAI on the hashed email alone", `email-only: ${JSON.stringify(emailOnly.event?.user)}`);
    const q = await pixelQueue((px) => px.oaiLead("", "0871234567", 10, "phone-only-1"));
    const init = q.find((a) => a[0] === "init" && a[1].user);
    check(init && !init[1].user.email_sha256 && init[1].user.phone_number_sha256 === sha("353871234567") && q.some((a) => a[1] === "lead_created" && a[3]?.event_id === "phone-only-1"),
      "the pixel's copy of a phone-only lead carries the phone and the same id", `pixel phone-only: ${JSON.stringify(q)}`);
  }

  /* 7. The ad click, from the cookie or the form, to OpenAI and the CRM. */
  {
    const both = serverMod.browserContext(request({ cookie: "__oppref=FROM_COOKIE; __obref=ref-1" }), { oppref: "FROM_FORM" });
    const formOnly = serverMod.browserContext(request({ cookie: "_ga=GA1.1.1.2" }), { oppref: "FROM_FORM" });
    const neither = serverMod.browserContext(request({}), { oppref: 42 });
    check(both.oppref === "FROM_COOKIE" && both.obref === "ref-1" && formOnly.oppref === "FROM_FORM" && !formOnly.obref && neither.oppref === undefined,
      "the click: the pixel's cookie first, then the form's attribution record; anything that is not a string is ignored",
      `browserContext: both ${JSON.stringify(both)}, form only ${JSON.stringify(formOnly)}, neither ${JSON.stringify(neither)}`);
    const r = await fire({ ...lead, browser: { ...lead.browser, ...formOnly } });
    check(r.event?.oppref === "FROM_FORM" && !r.event.user.obref,
      "a browser that never loaded the pixel still sends its ChatGPT ad click with the lead", `event without the cookie: ${JSON.stringify(r.event)}`);
    const crm = crmMod.chatGptAdOf(both, true);
    const none = crmMod.chatGptAdOf(neither, true);
    check(crm.oppref === "FROM_COOKIE" && crm.obref === "ref-1" && none.oppref === null && none.obref === null,
      "the CRM lead gets custom.oppref and custom.obref, null without an ad click", `chatGptAdOf: ${JSON.stringify(crm)}, ${JSON.stringify(none)}`);

    /* The attribution record is written under any Accept, so a visitor who
       accepted before /privacy named OpenAI and then clicked a ChatGPT ad
       posts the click with the form. The CRM must keep it only when the
       visitor's Accept names OpenAI, the rule the OpenAI copy keeps. */
    const at = Date.now() - 60_000;
    const crmFor = (v) => {
      const accepted = consentMod.consentFrom({ decision: "granted", decidedAt: at, ...(v === undefined ? {} : { v }) });
      return crmMod.chatGptAdOf(serverMod.browserContext(request({}), { oppref: "OLD_ACCEPT_CLICK" }), consentMod.openAiConsented(accepted));
    };
    const below = [OPENAI_CONSENT_VERSION - 1, undefined].map(crmFor);
    const atOrAbove = [OPENAI_CONSENT_VERSION, OPENAI_CONSENT_VERSION + 1].map(crmFor);
    check(below.every((c) => c.oppref === null && c.obref === null),
      `an Accept under notice version ${OPENAI_CONSENT_VERSION - 1} or none, with an oppref in the record: nothing for the CRM's custom`,
      `an Accept that does not name OpenAI still put the click on the CRM lead: ${JSON.stringify(below)}`);
    check(atOrAbove.every((c) => c.oppref === "OLD_ACCEPT_CLICK"),
      `an Accept under version ${OPENAI_CONSENT_VERSION} or later: the click reaches custom.oppref`,
      `an Accept that names OpenAI lost the click: ${JSON.stringify(atOrAbove)}`);
    const declined = crmMod.chatGptAdOf(both, consentMod.openAiConsented(consentMod.consentFrom({ decision: "denied", decidedAt: at, v: OPENAI_CONSENT_VERSION })));
    const unsure = crmMod.chatGptAdOf(both, undefined);
    check(declined.oppref === null && declined.obref === null && unsure.oppref === null && unsure.obref === null,
      "a Decline, or no decision passed at all, writes nothing either, cookie or no cookie",
      `Decline: ${JSON.stringify(declined)}; no decision: ${JSON.stringify(unsure)}`);
    const attribution = read("src/lib/attribution.ts");
    check(/params\.get\("oppref"\)/.test(attribution) && /cameFromAnAd\(\{\s*gclid,\s*oppref/.test(attribution),
      "attribution.ts keeps ?oppref= as an ad click (check-consent-attribution runs it)", "attribution.ts no longer captures ?oppref= as an ad click");
  }

  /* 8. OpenAI never holds up or fails a lead. */
  {
    const results = {};
    for (const how of ["throw", "refuse", "hang"]) {
      openAiAnswer = how;
      results[how] = await fire({ ...lead, browser: { ...lead.browser, browserTagsRan: false } });
    }
    openAiAnswer = "ok";
    const fine = Object.values(results).every((r) => !r.threw && r.others >= 1);
    check(fine && results.hang.took < 4500,
      `OpenAI down, refusing or hanging: the fire resolves (${results.hang.took} ms at worst), never throws, and Google still gets its copy`,
      `with OpenAI failing: ${JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, r]) => [k, { threw: String(r.threw), took: r.took, others: r.others }])))}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (bad) {
  console.error(`\n${bad} problem${bad === 1 ? "" : "s"} with the OpenAI Conversions API copy.\n`);
  process.exit(1);
}
console.log("\nThe server's copy of each ChatGPT ads conversion pairs with the pixel's, and goes only with consent and a key.\n");
