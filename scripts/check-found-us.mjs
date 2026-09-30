#!/usr/bin/env node
/**
 * "How did you hear about us?" reaches every place the weekly report reads it.
 *
 * Oscar chose one optional select on the site's lead forms and checkouts on
 * 27 September 2026, so that where an enquiry came from can be counted
 * without a cookie (src/lib/found-us.ts). On 30 September it became eight
 * answers with no "Google ad" among them, and an optional box underneath for
 * the visitor's own words. The FourWinds weekly report reads the answer from
 * the CRM lead (custom.found_us) and from the leads feed (foundUs), which
 * takes it from the sheet row's Notes and the Stripe checkout's metadata. Any
 * one of them dropping it is silent: the form still works, the lead still
 * arrives, and the report counts one enquiry fewer.
 *
 * This fails the build when:
 *   the select stops offering exactly the eight answers, in order, worded as
 *     agreed, or stops being optional, or is too small to use on a phone; or
 *     the box under it goes missing, becomes required, loses its limit, or
 *     its hint names one of the answers;
 *   an answer stops being one of the CRM's FOUND_US keys, or a retired one
 *     stops being taken, when records from before 30 September carry it;
 *   a request to /api/contact, /api/checkout or /api/checkout/free is sent
 *     without found_us and found_us_detail, or from a page with no field to
 *     answer them on;
 *   /api/contact or /api/checkout/free drops the answer or the words before
 *     the CRM lead or the sheet row, /api/checkout before the Stripe
 *     session's metadata, or the Stripe webhook does not read them back into
 *     the order's sheet row and CRM lead; or any of them lets through
 *     something that is not an answer, or words that could split a sheet
 *     row's Notes;
 *   the leads feed leaves foundUs or foundUsDetail off a contact enquiry, a
 *     paid order or a free consultation that has one, or leaves either
 *     inside a contact enquiry's message.
 *
 * The forms are read with the TypeScript parser, and the field is rendered
 * with react-dom/server. The routes are the real ones, compiled and run with
 * fetch replaced: the sheet, the CRM, Stripe, Calendly and Google answer as
 * themselves, and the Stripe webhook gets an event signed with the real
 * stripe package and built from the metadata the checkout route sent to
 * Stripe. Nothing leaves this machine, no email is sent (Resend is replaced),
 * and every key is made up here.
 *
 *   node scripts/check-found-us.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { builtinModules } from "node:module";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];

/* The answers this site offers, agreed on 30 September 2026. The weekly
   report counts keys (fourwinds-portal, scripts/lib/ad-enquiries.mjs), and
   SmartCare Living offers its own list of the same keys (its
   api/_lib/found-us.js), so a change here is a change to both. */
const CONTRACT = [
  ["google_search", "Google search"],
  ["ai_assistant", "ChatGPT or another AI assistant"],
  ["social", "Facebook or Instagram"],
  ["recommended", "Recommended by a friend or family member"],
  ["van", "Saw our van"],
  ["press", "Newspaper, radio or online article"],
  ["existing_customer", "Existing Smart Space customer"],
  ["other", "Other (please tell us)"],
];
const KEYS = CONTRACT.map(([k]) => k);
/* Offered until 30 September 2026. Stripe sessions, sheet rows and CRM leads
   from before then carry them, as can a page loaded before the change, so the
   server still takes them and the feed still reads them. */
const RETIRED = ["google_ads", "organisation"];
const LABEL = "How did you hear about us?";
const BLANK = "Choose one (optional)";
const DETAIL_LABEL = "Tell us more (optional)";
const DETAIL_MAX = 200;
const ENDPOINTS = new Set(["/api/contact", "/api/checkout", "/api/checkout/free"]);
/* Every file that posted a lead on 28 September 2026. One missing from what
   the scan finds means the scan is reading the wrong thing. */
const KNOWN_POSTERS = [
  "src/components/ContactForm.tsx",
  "src/components/CallbackForm.tsx",
  "src/components/CartDrawer.tsx",
  "src/app/services/free-consultation/page.tsx",
  "src/components/AddToCartButton.tsx",
];
/* A component that sends the answer and the words the page it sits on hands
   it. Each use that posts must pass the props, and sit on a page that renders
   the field. */
const BY_PROP = { "src/components/AddToCartButton.tsx": { component: "AddToCartButton", props: ["foundUs", "foundUsDetail"], when: "directCheckout" } };
/* What a lead request must carry, and what each one is. */
const SENT = { found_us: "the answer", found_us_detail: "the visitor's words" };

let asserted = 0;
const eq = (got, want, why) => {
  asserted++;
  if (JSON.stringify(got) !== JSON.stringify(want)) fail.push(`${why}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};
const ok = (cond, why) => { asserted++; if (!cond) fail.push(why); };

/* ── Part 1: the forms, read with the TypeScript parser ─────────────────── */

const sources = [];
const collect = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) collect(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) sources.push(relative(ROOT, p));
  }
};
collect(join(ROOT, "src"));
const parse = (rel) => ts.createSourceFile(rel, readFileSync(join(ROOT, rel), "utf8"), ts.ScriptTarget.Latest, true,
  rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const walk = (node, fn) => { fn(node); ts.forEachChild(node, (c) => walk(c, fn)); };
const where = (sf, node) => `${sf.fileName}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}`;
const nameOf = (p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : "");
const tagOf = (el) => (ts.isIdentifier(el.tagName) ? el.tagName.text : "");
const attrOf = (el, name) => el.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText() === name);

/** The object literal in `body: JSON.stringify(x)`, following x to its declaration when it is a name. */
function bodyObject(sf, init) {
  if (!init || !ts.isObjectLiteralExpression(init)) return null;
  const body = init.properties.find((p) => ts.isPropertyAssignment(p) && nameOf(p) === "body");
  if (!body) return null;
  const call = body.initializer;
  if (!ts.isCallExpression(call) || call.expression.getText(sf) !== "JSON.stringify" || !call.arguments[0]) return null;
  let arg = call.arguments[0];
  if (ts.isIdentifier(arg)) {
    const name = arg.text;
    arg = null;
    walk(sf, (n) => {
      if (!arg && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name && n.initializer) arg = n.initializer;
    });
  }
  return arg && ts.isObjectLiteralExpression(arg) ? arg : null;
}

const posters = new Set(); // files that post a lead body
const fieldFiles = new Set(); // files that render <FoundUsField>
const needsField = new Map(); // file -> why it must render the field
let fieldUses = 0;
for (const rel of sources) {
  if (rel.startsWith("src/app/api/")) continue;
  const sf = parse(rel);
  walk(sf, (n) => {
    if (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) {
      if (tagOf(n) === "FoundUsField") {
        fieldFiles.add(rel);
        fieldUses++;
        const cls = attrOf(n, "selectClassName")?.initializer;
        const words = cls && ts.isStringLiteral(cls) ? cls.text.split(/\s+/) : [];
        ok(words.includes("text-base"), `${where(sf, n)}: the select needs text-base (16px), or iOS Safari zooms the page when it is focused`);
        ok(words.includes("min-h-11"), `${where(sf, n)}: the select needs min-h-11, the 44px touch floor`);
        ok(!attrOf(n, "required"), `${where(sf, n)}: the field is optional and must never be required`);
        /* A form that keeps the answer in state sends the words from state
           too, so the box has to write to it. */
        if (attrOf(n, "value")) {
          ok(!!attrOf(n, "detail") && !!attrOf(n, "onDetailChange"),
            `${where(sf, n)}: the form keeps the answer in state but not the visitor's words, so the box sends nothing; pass detail and onDetailChange`);
        }
      }
      for (const [file, rule] of Object.entries(BY_PROP)) {
        if (tagOf(n) !== rule.component || !attrOf(n, rule.when)) continue;
        for (const prop of rule.props) {
          ok(!!attrOf(n, prop), `${where(sf, n)}: <${rule.component} ${rule.when}> posts a checkout without ${prop}; pass it from the page's FoundUsField`);
        }
        needsField.set(rel, `it posts a checkout through ${file}`);
      }
    }
    if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression) || n.expression.text !== "fetch") return;
    const target = n.arguments[0];
    if (!target || !ts.isStringLiteral(target) || !ENDPOINTS.has(target.text)) return;
    posters.add(rel);
    if (!BY_PROP[rel]) needsField.set(rel, `it posts to ${target.text}`);
    const obj = bodyObject(sf, n.arguments[1]);
    if (!obj) { fail.push(`${where(sf, n)}: a request to ${target.text} whose body this check cannot read; send JSON.stringify({ ..., found_us, found_us_detail })`); return; }
    for (const [key, what] of Object.entries(SENT)) {
      const field = obj.properties.find((p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && nameOf(p) === key);
      if (!field) { fail.push(`${where(sf, n)}: the request to ${target.text} has no ${key}, so ${what} never leave the browser`); continue; }
      if (ts.isPropertyAssignment(field) && (ts.isStringLiteral(field.initializer) || ts.isNoSubstitutionTemplateLiteral(field.initializer))) {
        fail.push(`${where(sf, n)}: ${key} is a fixed string, not ${what}`);
      }
    }
  });
}
for (const f of KNOWN_POSTERS) ok(posters.has(f), `${f}: no request to a lead endpoint found there, so this check is reading the wrong thing`);
for (const [f, why] of needsField) ok(fieldFiles.has(f), `${f}: ${why} but renders no <FoundUsField>, so there is nothing to answer`);

/* found-us.ts takes the keys the server accepts from the CRM's FOUND_US
   rather than listing them again, so the site and the CRM cannot drift. The
   eight it offers are named there, and Part 4 checks each is a FOUND_US key. */
{
  const sf = parse("src/lib/found-us.ts");
  let imports = false;
  walk(sf, (n) => {
    if (ts.isImportDeclaration(n) && n.moduleSpecifier.text === "@/lib/crm/labels") {
      const named = n.importClause?.namedBindings;
      if (named && ts.isNamedImports(named) && named.elements.some((e) => e.name.text === "FOUND_US")) imports = true;
    }
    if (ts.isStringLiteral(n) && RETIRED.includes(n.text)) {
      fail.push(`${where(sf, n)}: "${n.text}" is written out here; the retired answers are taken because FOUND_US still has them, not from a list of their own`);
    }
  });
  ok(imports, "src/lib/found-us.ts does not import FOUND_US from @/lib/crm/labels");
}

/* ── Part 2: compile the real modules ───────────────────────────────────── */

/* Under node_modules, so the packages the routes really use (stripe, react)
   resolve from here. */
const cacheDir = join(ROOT, "node_modules", ".cache");
mkdirSync(cacheDir, { recursive: true });
const dir = mkdtempSync(join(cacheDir, "check-found-us-"));
const STUBS = {
  resend: `export class Resend { constructor() { this.emails = { send: async (m) => { globalThis.__check.emails.push(m); return { data: { id: "check-email" }, error: null }; } }; } }`,
  "@vercel/functions": `export function waitUntil(p) { globalThis.__check.background.push(Promise.resolve(p)); }`,
  "next/server": `export const NextResponse = { json: (body, init = {}) => new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } }) };
export const NextRequest = Request;`,
};
const REAL = new Set(["stripe", "react", "react/jsx-runtime", "react-dom/server"]);
const BUILTIN = new Set([...builtinModules, ...builtinModules.map((m) => `node:${m}`)]);
for (const [spec, code] of Object.entries(STUBS)) writeFileSync(join(dir, `stub-${spec.replace(/\W+/g, "_")}.mjs`), code);

const compiled = new Map();
function resolveSource(spec, fromRel) {
  const base = spec.startsWith("@/") ? join("src", spec.slice(2)) : join(dirname(fromRel), spec);
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const p = join(ROOT, base + ext);
    if (existsSync(p) && statSync(p).isFile()) return relative(ROOT, p);
  }
  throw new Error(`${fromRel} imports "${spec}", which is not a file`);
}
function compile(rel) {
  if (compiled.has(rel)) return compiled.get(rel);
  const out = `${rel.replace(/[\/.]+/g, "_")}.mjs`;
  compiled.set(rel, out);
  const js = ts.transpileModule(readFileSync(join(ROOT, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: rel,
  }).outputText;
  const rewritten = js.replace(/(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(["'])([^"']+)\2/g, (whole, lead, q, spec) => {
    if (spec.startsWith("@/") || spec.startsWith("./") || spec.startsWith("../")) return `${lead}${q}./${compile(resolveSource(spec, rel))}${q}`;
    if (STUBS[spec]) return `${lead}${q}./stub-${spec.replace(/\W+/g, "_")}.mjs${q}`;
    if (REAL.has(spec) || BUILTIN.has(spec)) return whole;
    fail.push(`${rel} imports "${spec}", which this check neither stubs nor loads. Add it to STUBS or REAL in scripts/check-found-us.mjs.`);
    return whole;
  });
  writeFileSync(join(dir, out), rewritten);
  return out;
}
const load = (rel) => import(pathToFileURL(join(dir, compile(rel))).href);

/* ── Part 3: the outside world, as it answers ───────────────────────────── */

const SHEET_URL = "https://sheet.example.invalid/exec";
const CRM_URL = "https://crm.example.invalid/api/inbound/lead";
const STRIPE_SESSION = { id: "cs_test_found_us_check", url: "https://checkout.stripe.com/c/pay/cs_test_found_us_check" };
const world = { sheetRows: [], stripeSessions: [] };
const calls = [];
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

globalThis.__check = { emails: [], background: [] };
globalThis.fetch = async (input, init = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  const method = String(init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const body = init.body === undefined || init.body === null ? undefined : String(init.body);
  calls.push({ url, method, body });
  if (url.startsWith(SHEET_URL)) {
    if (method === "POST") return json({ success: true });
    const limit = Number(new URL(url).searchParams.get("limit")) || 500;
    return json({ rows: world.sheetRows.slice(0, limit), count: Math.min(world.sheetRows.length, limit) });
  }
  if (url === CRM_URL && method === "POST") return json({ ok: true });
  if (url === "https://api.stripe.com/v1/checkout/sessions" && method === "POST") return json({ ...STRIPE_SESSION, object: "checkout.session" });
  if (url.startsWith("https://api.stripe.com/v1/checkout/sessions?")) return json({ object: "list", data: world.stripeSessions, has_more: false });
  if (url === "https://api.stripe.com/v1/balance") return json({ available: [], pending: [] });
  if (url.startsWith("https://api.calendly.com/event_type_available_times?")) {
    /* Every slot start of that day, in Irish summer and winter time. */
    const day = new URL(url).searchParams.get("start_time").slice(0, 10);
    const starts = ["09:00", "10:00", "11:30", "12:30", "14:00", "15:00"];
    return json({ collection: starts.map((t) => ({ start_time: `${day}T${t}:00Z`, status: "available" })) });
  }
  if (url === "https://api.calendly.com/invitees" && method === "POST") return json({ resource: { uri: "https://api.calendly.com/scheduled_events/check" } }, 201);
  if (url.startsWith("https://api.calendly.com/scheduled_events?")) return json({ collection: [] });
  if (/^https:\/\/www\.(googleadservices|google-analytics)\.com\//.test(url)) return new Response("", { status: 200 });
  fail.push(`a route tried to fetch ${method} ${url}, which this check does not answer`);
  throw new Error(`check-found-us does not let ${url} be fetched`);
};

Object.assign(process.env, {
  RESEND_API_KEY: "re_check_not_a_key",
  RESEND_FROM_EMAIL: "check@example.invalid",
  CONTACT_TO_EMAIL: "nigel-check@example.invalid",
  MONITOR_BCC_EMAIL: "monitor-check@example.invalid",
  GOOGLE_SHEET_WEBHOOK_URL: SHEET_URL,
  GOOGLE_SHEET_READ_TOKEN: "check-read-token",
  CRM_INBOUND_URL: CRM_URL,
  CRM_HMAC_SECRET: "check-hmac-secret",
  STRIPE_SECRET_KEY: "sk_test_check_not_a_key",
  STRIPE_WEBHOOK_SECRET: "whsec_check_not_a_secret",
  CALENDLY_PERSONAL_TOKEN: "check-calendly-token",
  CALENDLY_CONSULTATION_EVENT_TYPE_URI: "https://api.calendly.com/event_types/check-consultation",
  CALENDLY_INSTALLATION_EVENT_TYPE_URI: "https://api.calendly.com/event_types/check-installation",
  ADMIN_KEY: "check-admin-key",
});
for (const k of ["GA4_API_SECRET", "NEXT_PUBLIC_GA4_MEASUREMENT_ID", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER", "TWILIO_TO_NUMBER",
  "SMARTCRM_URL", "SMARTCRM_ANON_KEY", "SMARTCRM_KEY"]) delete process.env[k];

/* Route output goes nowhere unless this check fails, when it is printed. */
const logged = [];
const quiet = () => {
  const saved = { log: console.log, warn: console.warn, error: console.error };
  for (const k of Object.keys(saved)) console[k] = (...a) => logged.push(`${k}: ${a.map((x) => (x instanceof Error ? x.message : typeof x === "string" ? x : JSON.stringify(x))).join(" ")}`);
  return () => Object.assign(console, saved);
};

/** Run a route handler, then everything it handed to waitUntil. */
async function run(handler, request) {
  calls.length = 0;
  const loud = quiet();
  try {
    const res = await handler(request);
    while (globalThis.__check.background.length) await Promise.allSettled(globalThis.__check.background.splice(0));
    return { status: res.status, body: await res.json().catch(() => null), calls: [...calls] };
  } finally {
    loud();
  }
}
const post = (path, body, headers = {}) => new Request(`https://smart-space.ie${path}`, {
  method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body),
});
const sheetRow = (r) => r.calls.filter((c) => c.url === SHEET_URL && c.method === "POST").map((c) => JSON.parse(c.body));
const crmLead = (r) => r.calls.filter((c) => c.url === CRM_URL).map((c) => JSON.parse(c.body));
const stripeCreate = (r) => r.calls.filter((c) => c.url === "https://api.stripe.com/v1/checkout/sessions" && c.method === "POST").map((c) => new URLSearchParams(c.body));

/* What is not an answer: missing, empty, the CRM's two keys that never are,
   a label instead of a key, the wrong type, and a key with more on it. */
const NOT_ANSWERS = [undefined, "", "unknown", "website", "Saw our van", "A Google ad", "Google Ads", ["google_search"], { google_search: true }, 1,
  "google_search | found: other"];
const show = (v) => (v === undefined ? "a missing found_us" : `found_us ${JSON.stringify(v)}`);
/* The visitor's words as typed, and as every place should keep them: one
   line, no "|", which separates a sheet row's Notes items. */
const SAID = "A neighbour mentioned you | then I\nsearched online";
const SAID_KEPT = "A neighbour mentioned you then I searched online";
/* Words that are no words: missing, empty, blank, the wrong type. */
const NOT_WORDS = [undefined, "", "   ", 42, ["words"], { words: "x" }];
const showWords = (v) => (v === undefined ? "a missing found_us_detail" : `found_us_detail ${JSON.stringify(v)}`);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

try {
  /* ── Part 4: the list and the field ───────────────────────────────────── */
  const foundUs = await load("src/lib/found-us.ts");
  const { FOUND_US } = await load("src/lib/crm/labels.ts");
  eq(foundUs.FOUND_US_OPTIONS.map((o) => [o.value, o.label]), CONTRACT, "the select offers exactly the eight agreed answers, in order, worded as agreed");
  for (const k of [...KEYS, ...RETIRED]) ok(k in FOUND_US, `"${k}" is not a key of the CRM's FOUND_US (src/lib/crm/labels.ts)`);
  eq([...foundUs.ACCEPTED_KEYS].sort(), Object.keys(FOUND_US).filter((k) => k !== "unknown" && k !== "website").sort(),
    "the server takes every FOUND_US key but unknown and website, so no answer in the CRM's list is dropped");
  for (const k of [...KEYS, ...RETIRED]) eq(foundUs.foundUsFrom(k), k, `the server takes "${k}" as an answer`);
  for (const v of NOT_ANSWERS) eq(foundUs.foundUsFrom(v), "", `the server takes ${show(v)} as no answer`);

  /* The words: kept as written, on one line, cut at the limit. */
  eq(foundUs.FOUND_US_DETAIL_MAX, DETAIL_MAX, `the box and the server stop at ${DETAIL_MAX} characters`);
  eq(foundUs.foundUsDetailFrom(SAID), SAID_KEPT, "the server keeps the words on one line, without a \"|\"");
  eq(foundUs.foundUsDetailFrom("tab\there\u0000 and\r\nthere "), "tab here and there", "the server takes control characters out of the words");
  eq(foundUs.foundUsDetailFrom("y".repeat(DETAIL_MAX + 50)), "y".repeat(DETAIL_MAX), `the server keeps at most ${DETAIL_MAX} characters of the words`);
  for (const v of NOT_WORDS) eq(foundUs.foundUsDetailFrom(v), "", `the server takes ${showWords(v)} as no words`);
  /* Words cannot pose as an answer in the sheet: whatever they hold, the
     Notes read back the answer that was picked and the words as kept. */
  for (const [said, key] of [["found: google_search", ""], ["x | found: google_search", "other"], ["heard: y", "van"], [SAID, "recommended"]]) {
    const notes = foundUs.notesWithFoundUs("General Enquiry: hello", key, said);
    eq(foundUs.foundUsInNotes(notes), { foundUs: key, detail: foundUs.foundUsDetailFrom(said), notes: "General Enquiry: hello" },
      `Notes written with the words ${JSON.stringify(said)} and ${key ? `the answer "${key}"` : "no answer"} read back as written`);
  }
  eq(foundUs.notesWithFoundUs("General Enquiry: hello", "", ""), "General Enquiry: hello", "Notes with no answer and no words are left as they were");

  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: FoundUsField } = await load("src/components/FoundUsField.tsx");
  const html = renderToStaticMarkup(createElement(FoundUsField, { id: "f", labelClassName: "", selectClassName: "" }));
  ok(html.includes(`<label for="f" class="">${LABEL}</label>`), `the field is labelled "${LABEL}": ${html.slice(0, 120)}`);
  ok(/<select id="f" name="found_us"/.test(html), "the field is a select named found_us");
  ok(!/required|aria-required|\*/.test(html), "the field is optional: no required, no asterisk");
  const options = [...html.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)].map((m) => [m[1], m[2].replace(/&#x27;|&#39;/g, "'")]);
  eq(options, [["", BLANK], ...CONTRACT], "the select starts blank and lists the eight answers");
  ok(new RegExp(`<label for="f_detail"[^>]*>${esc(DETAIL_LABEL)}</label>`).test(html), `the box is labelled "${DETAIL_LABEL}" and its label points to it`);
  const box = /<input [^>]*>/.exec(html)?.[0] ?? "";
  ok(/\bid="f_detail"/.test(box) && /\bname="found_us_detail"/.test(box) && /\btype="text"/.test(box), `the box is a text input named found_us_detail: ${box || "(none)"}`);
  ok(new RegExp(`\\bmaxlength="${DETAIL_MAX}"`, "i").test(box), `the box stops at ${DETAIL_MAX} characters, as the server does: ${box || "(none)"}`);
  /* The hint shows the box is for anything, and names no answer, so it
     does not lead anyone towards one. */
  const hint = /\bplaceholder="([^"]*)"/.exec(box)?.[1] ?? "";
  ok(!/google|chatgpt|\bai\b|facebook|instagram|friend|family|recommend|\bvan\b|newspaper|radio|article|customer/i.test(hint),
    `the box's hint "${hint}" names an answer, which leads visitors towards it`);

  /* ── Part 5: /api/contact, the contact and callback forms ─────────────── */
  const contact = await load("src/app/api/contact/route.ts");
  const enquiry = (extra) => ({
    name: "Check Person", email: "check.person@example.invalid", phone: "087 000 0000", subject: "installation",
    message: "A doorbell | and two cameras", homepage_url: "", ...extra,
  });
  for (const k of KEYS) {
    const r = await run(contact.POST, post("/api/contact", enquiry({ found_us: k })));
    eq(r.status, 200, `/api/contact answers a form with found_us "${k}"`);
    eq(crmLead(r).map((l) => l.custom?.found_us), [k], `/api/contact gives the CRM lead custom.found_us "${k}"`);
    eq(sheetRow(r).map((row) => row.notes), [`Installation Enquiry: A doorbell | and two cameras | found: ${k}`], `/api/contact writes "found: ${k}" as the sheet row's last Notes item`);
  }
  for (const v of NOT_ANSWERS) {
    const r = await run(contact.POST, post("/api/contact", enquiry(v === undefined ? {} : { found_us: v })));
    eq(crmLead(r).map((l) => l.custom?.found_us ?? null), [null], `/api/contact gives the CRM no answer for ${show(v)}`);
    eq(sheetRow(r).map((row) => row.notes), ["Installation Enquiry: A doorbell | and two cameras"], `/api/contact writes no answer to the sheet for ${show(v)}`);
  }
  for (const k of RETIRED) {
    const r = await run(contact.POST, post("/api/contact", enquiry({ found_us: k })));
    eq(crmLead(r).map((l) => l.custom?.found_us), [k], `/api/contact records the retired answer "${k}" from a page loaded before 30 September`);
  }
  {
    const r = await run(contact.POST, post("/api/contact", enquiry({ found_us: "recommended", found_us_detail: SAID })));
    eq(crmLead(r).map((l) => [l.custom?.found_us, l.custom?.found_us_detail]), [["recommended", SAID_KEPT]],
      "/api/contact gives the CRM lead the answer and the visitor's words, on one line");
    eq(sheetRow(r).map((row) => row.notes), [`Installation Enquiry: A doorbell | and two cameras | heard: ${SAID_KEPT} | found: recommended`],
      "/api/contact writes the words as \"heard:\" just before the answer in the sheet row's Notes");
  }
  {
    const r = await run(contact.POST, post("/api/contact", enquiry({ found_us_detail: SAID })));
    eq(crmLead(r).map((l) => [l.custom?.found_us ?? null, l.custom?.found_us_detail]), [[null, SAID_KEPT]], "/api/contact keeps the words when no answer was picked");
    eq(sheetRow(r).map((row) => row.notes), [`Installation Enquiry: A doorbell | and two cameras | heard: ${SAID_KEPT}`],
      "/api/contact writes the words as the last Notes item when no answer was picked");
  }
  for (const v of NOT_WORDS) {
    const r = await run(contact.POST, post("/api/contact", enquiry(v === undefined ? { found_us: "van" } : { found_us: "van", found_us_detail: v })));
    eq(crmLead(r).map((l) => l.custom?.found_us_detail ?? null), [null], `/api/contact gives the CRM no words for ${showWords(v)}`);
    eq(sheetRow(r).map((row) => row.notes), ["Installation Enquiry: A doorbell | and two cameras | found: van"], `/api/contact writes no words to the sheet for ${showWords(v)}`);
  }
  {
    const r = await run(contact.POST, post("/api/contact", enquiry({ found_us: "other", found_us_detail: "y".repeat(DETAIL_MAX + 100) })));
    eq(crmLead(r).map((l) => String(l.custom?.found_us_detail ?? "").length), [DETAIL_MAX], `/api/contact keeps at most ${DETAIL_MAX} characters of the words`);
  }

  /* ── Part 6: /api/checkout/free, the free consultation ────────────────── */
  const free = await load("src/app/api/checkout/free/route.ts");
  const booking = (extra) => ({
    items: [{ productId: "free-consultation", name: "Complimentary Home Consultation", price: 0, image: "", quantity: 1,
      bookingDate: "2026-10-06", bookingSlot: "10:00-12:00", bookingLabel: "Tue 6 Oct 10:00 - 12:00" }],
    customer: { name: "Check Booker", email: "check.booker@example.invalid", phone: "087 000 0001", address: "1 Check Road, Dublin" },
    ...extra,
  });
  for (const k of KEYS) {
    const r = await run(free.POST, post("/api/checkout/free", booking({ found_us: k })));
    eq(r.body?.success, true, `/api/checkout/free books a consultation with found_us "${k}"`);
    eq(crmLead(r).map((l) => l.custom?.found_us), [k], `/api/checkout/free gives the CRM lead custom.found_us "${k}"`);
    eq(sheetRow(r).map((row) => row.notes), [`found: ${k}`], `/api/checkout/free writes "found: ${k}" to the sheet row's Notes`);
  }
  for (const v of NOT_ANSWERS) {
    const r = await run(free.POST, post("/api/checkout/free", booking(v === undefined ? {} : { found_us: v })));
    eq(crmLead(r).map((l) => l.custom?.found_us ?? null), [null], `/api/checkout/free gives the CRM no answer for ${show(v)}`);
    eq(sheetRow(r).map((row) => row.notes ?? null), [null], `/api/checkout/free writes no answer to the sheet for ${show(v)}`);
  }
  {
    const r = await run(free.POST, post("/api/checkout/free", booking({ found_us: "press", found_us_detail: SAID })));
    eq(crmLead(r).map((l) => [l.custom?.found_us, l.custom?.found_us_detail]), [["press", SAID_KEPT]],
      "/api/checkout/free gives the CRM lead the answer and the visitor's words, on one line");
    eq(sheetRow(r).map((row) => row.notes), [`heard: ${SAID_KEPT} | found: press`], "/api/checkout/free writes the words just before the answer in the sheet row's Notes");
  }
  {
    const r = await run(free.POST, post("/api/checkout/free", booking({ found_us_detail: SAID })));
    eq(crmLead(r).map((l) => [l.custom?.found_us ?? null, l.custom?.found_us_detail]), [[null, SAID_KEPT]], "/api/checkout/free keeps the words when no answer was picked");
    eq(sheetRow(r).map((row) => row.notes), [`heard: ${SAID_KEPT}`], "/api/checkout/free writes the words to the sheet row's Notes when no answer was picked");
  }
  for (const v of NOT_WORDS) {
    const r = await run(free.POST, post("/api/checkout/free", booking(v === undefined ? { found_us: "van" } : { found_us: "van", found_us_detail: v })));
    eq(crmLead(r).map((l) => l.custom?.found_us_detail ?? null), [null], `/api/checkout/free gives the CRM no words for ${showWords(v)}`);
    eq(sheetRow(r).map((row) => row.notes), ["found: van"], `/api/checkout/free writes no words to the sheet for ${showWords(v)}`);
  }

  /* ── Part 7: /api/checkout, then the Stripe webhook ───────────────────── */
  const checkout = await load("src/app/api/checkout/route.ts");
  const webhook = await load("src/app/api/webhooks/stripe/route.ts");
  const { PRODUCT_CATALOGUE } = await load("src/data/productCatalogue.ts");
  const product = PRODUCT_CATALOGUE.find((p) => p.handle === "installation-only");
  const variant = product?.variants?.edges?.[0]?.node;
  ok(!!variant, "src/data/productCatalogue.ts has no installation-only variant to check out with");
  const cart = (extra) => ({
    items: [{
      productId: "installation-only", name: product?.title, price: parseFloat(variant?.price?.amount ?? "0"), image: "", quantity: 1,
      bookingDate: "2026-10-07", bookingSlot: "12:30-14:30", bookingLabel: "Wed 7 Oct 12:30 - 14:30",
      configuration: Object.fromEntries((variant?.selectedOptions ?? []).map((o) => [o.name, o.value])),
    }],
    attribution: { gclid: "Cj0-check-click", landingPage: "/ring-installation" },
    ...extra,
  });
  const { default: Stripe } = await import("stripe");
  let events = 0;
  /** The session Stripe would complete: the metadata /api/checkout sent, and a buyer. */
  const completed = (params) => {
    const metadata = {};
    for (const [k, v] of params) { const m = /^metadata\[(.+)\]$/.exec(k); if (m) metadata[m[1]] = v; }
    return {
      id: STRIPE_SESSION.id, object: "checkout.session", payment_status: "paid", status: "complete",
      amount_total: Number(params.get("line_items[0][price_data][unit_amount]")), currency: "eur", metadata,
      customer_details: { name: "Check Buyer", email: "check.buyer@example.invalid", phone: "+353870000002",
        address: { line1: "2 Check Road", line2: null, city: "Dublin", postal_code: "D02 XY45", country: "IE" } },
      custom_fields: [], created: Math.floor(Date.now() / 1000),
    };
  };
  const deliver = async (session) => {
    const payload = JSON.stringify({ id: `evt_check_found_us_${++events}`, object: "event", type: "checkout.session.completed",
      api_version: "2026-03-25.dahlia", created: session.created, data: { object: session } });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    return run(webhook.POST, post("/api/webhooks/stripe", payload, { "stripe-signature": signature }));
  };
  for (const k of KEYS) {
    const r = await run(checkout.POST, post("/api/checkout", cart({ found_us: k })));
    eq(r.body?.url, STRIPE_SESSION.url, `/api/checkout opens a Stripe checkout with found_us "${k}"`);
    const params = stripeCreate(r);
    eq(params.map((p) => p.get("metadata[found_us]")), [k], `/api/checkout writes metadata[found_us] "${k}" on the Stripe session`);
    if (!params.length) continue;
    const w = await deliver(completed(params[0]));
    eq(w.status, 200, `the Stripe webhook accepts a signed checkout.session.completed with found_us "${k}"`);
    const rows = sheetRow(w);
    eq(rows.map((row) => String(row.notes ?? "").split(" | ").pop()), [`found: ${k}`],
      `the Stripe webhook writes "found: ${k}" as the order's last sheet Notes item`);
    eq(crmLead(w).map((l) => l.custom?.found_us), [k], `the Stripe webhook gives the order's CRM lead custom.found_us "${k}"`);
    eq(crmLead(w).map((l) => /found:/.test(String(l.custom?.configuration ?? ""))), [false], "the order's CRM configuration does not carry the answer");
  }
  for (const v of NOT_ANSWERS) {
    const r = await run(checkout.POST, post("/api/checkout", cart(v === undefined ? {} : { found_us: v })));
    const params = stripeCreate(r);
    eq(params.map((p) => p.has("metadata[found_us]")), [false], `/api/checkout writes no found_us metadata for ${show(v)}`);
    if (!params.length) continue;
    const w = await deliver(completed(params[0]));
    eq(crmLead(w).map((l) => l.custom?.found_us ?? null), [null], `the Stripe webhook gives the CRM no answer when checkout had ${show(v)}`);
    eq(sheetRow(w).map((row) => /found:/.test(row.notes ?? "")), [false], `the Stripe webhook writes no answer to the sheet when checkout had ${show(v)}`);
  }
  /* A session whose metadata was set some other way: only an answer counts. */
  for (const v of ["website", "Google Ads", "google_ads | found: other"]) {
    const params = new URLSearchParams({ "metadata[found_us]": v, "line_items[0][price_data][unit_amount]": "13900" });
    const w = await deliver(completed(params));
    eq(crmLead(w).map((l) => l.custom?.found_us ?? null), [null], `the Stripe webhook takes metadata found_us ${JSON.stringify(v)} as no answer`);
  }
  /* A session paid for before 30 September carries a retired answer. */
  for (const k of RETIRED) {
    const params = new URLSearchParams({ "metadata[found_us]": k, "line_items[0][price_data][unit_amount]": "13900" });
    const w = await deliver(completed(params));
    eq(crmLead(w).map((l) => l.custom?.found_us), [k], `the Stripe webhook reads back the retired answer "${k}"`);
  }
  /* The words, through checkout and back. */
  {
    const r = await run(checkout.POST, post("/api/checkout", cart({ found_us: "social", found_us_detail: SAID })));
    const params = stripeCreate(r);
    eq(params.map((p) => [p.get("metadata[found_us]"), p.get("metadata[found_us_detail]")]), [["social", SAID_KEPT]],
      "/api/checkout writes the words to metadata[found_us_detail] on the Stripe session, on one line");
    if (params.length) {
      const w = await deliver(completed(params[0]));
      eq(sheetRow(w).map((row) => String(row.notes ?? "").split(" | ").slice(-2)), [[`heard: ${SAID_KEPT}`, "found: social"]],
        "the Stripe webhook writes the words just before the answer in the order's sheet Notes");
      eq(crmLead(w).map((l) => [l.custom?.found_us, l.custom?.found_us_detail]), [["social", SAID_KEPT]],
        "the Stripe webhook gives the order's CRM lead the answer and the words");
    }
  }
  for (const v of NOT_WORDS) {
    const r = await run(checkout.POST, post("/api/checkout", cart(v === undefined ? { found_us: "social" } : { found_us: "social", found_us_detail: v })));
    eq(stripeCreate(r).map((p) => p.has("metadata[found_us_detail]")), [false], `/api/checkout writes no found_us_detail metadata for ${showWords(v)}`);
  }
  {
    const params = new URLSearchParams({ "metadata[found_us]": "van", "metadata[found_us_detail]": "one | two\nthree", "line_items[0][price_data][unit_amount]": "13900" });
    const w = await deliver(completed(params));
    eq(crmLead(w).map((l) => l.custom?.found_us_detail), ["one two three"], "the Stripe webhook keeps words set on a session some other way on one line, without a \"|\"");
    eq(sheetRow(w).map((row) => String(row.notes ?? "").split(" | ").slice(-2)), [["heard: one two three", "found: van"]],
      "the Stripe webhook writes those words to the sheet as one Notes item");
  }

  /* ── Part 8: the leads feed ───────────────────────────────────────────── */
  const feed = await load("src/app/api/admin/leads/route.ts");
  const at = (iso) => Math.floor(Date.parse(iso) / 1000);
  const session = (id, created, metadata) => ({
    id, created: at(created), metadata, payment_status: "paid", amount_total: 13900,
    customer_details: { name: "Feed Buyer", email: `${id}@example.invalid`, phone: "+353870000003", address: {} }, custom_fields: [],
  });
  const row = (over) => ({
    date: "2026-09-25 11:40", type: "Contact Enquiry", name: "Feed Person", email: "feed@example.invalid", gclid: "", phone: "087 000 0004",
    address: "", product: "", amount: "", currency: "", bookingDate: "", bookingSlot: "", orderId: "", source: "smart-space.ie", notes: "", status: "New", ...over,
  });
  world.stripeSessions = [
    session("cs_test_meta", "2026-09-25T10:00:00Z", { product_name: "Installation Only", found_us: "google_ads" }),
    session("cs_test_sheet", "2026-09-24T10:00:00Z", { product_name: "Installation Only" }),
    session("cs_test_none", "2026-09-23T10:00:00Z", { product_name: "Installation Only" }),
    session("cs_test_junk", "2026-09-22T10:00:00Z", { product_name: "Installation Only", found_us: "website" }),
    session("cs_test_words", "2026-09-30T10:00:00Z", { product_name: "Installation Only", found_us: "van", found_us_detail: "one | two" }),
  ];
  world.sheetRows = [
    row({ email: "answered@example.invalid", notes: "Installation Enquiry: A doorbell | and two cameras | found: organisation" }),
    row({ email: "silent@example.invalid", notes: "Installation Enquiry: A doorbell | and two cameras" }),
    row({ email: "typed@example.invalid", notes: "General Enquiry: hello | found: Google Ads" }),
    row({ email: "wrote@example.invalid", notes: `General Enquiry: hello | heard: ${SAID_KEPT} | found: recommended` }),
    row({ email: "words.only@example.invalid", notes: "General Enquiry: hello | heard: saw it on a van" }),
    row({ type: "Free Consultation", email: "booker@example.invalid", notes: "found: existing_customer", product: "Free Home Consultation" }),
    row({ type: "Free Consultation", email: "quiet.booker@example.invalid", notes: "" }),
    row({ type: "Free Consultation", email: "booker.words@example.invalid", notes: "heard: on the radio | found: press" }),
    row({ type: "Paid Order", orderId: "cs_test_sheet", notes: "Number of devices: 1 | heard: a friend | found: recommended" }),
    row({ type: "Paid Order", orderId: "cs_test_none", notes: "Number of devices: 1" }),
    row({ type: "Paid Order", orderId: "manual-check-1", name: "Hand Typed", amount: 200, notes: "Paid cash | heard: the van | found: other" }),
  ];
  const f = await run(feed.GET, new Request("https://smart-space.ie/api/admin/leads", {
    headers: { authorization: "Bearer check-admin-key", "x-forwarded-for": "10.9.9.1" },
  }));
  eq(f.status, 200, "the leads feed answers");
  const leads = f.body?.leads ?? [];
  const lead = (pred) => leads.find(pred) ?? {};
  const answer = (l) => ("foundUs" in l ? l.foundUs : "(none)");
  const words = (l) => ("foundUsDetail" in l ? l.foundUsDetail : "(none)");
  const paid = (id) => lead((l) => l.orderId === id);
  eq(answer(paid("cs_test_meta")), "google_ads", "a paid order carries the retired answer in its checkout's metadata");
  eq(answer(paid("cs_test_sheet")), "recommended", "a paid order whose checkout has none carries the one on its sheet row");
  eq(words(paid("cs_test_sheet")), "a friend", "a paid order whose checkout has no words carries the ones on its sheet row");
  eq(answer(paid("cs_test_none")), "(none)", "a paid order with no answer anywhere carries none");
  eq(words(paid("cs_test_none")), "(none)", "a paid order with no words anywhere carries none");
  eq(answer(paid("cs_test_junk")), "(none)", "a paid order whose metadata holds something else carries none");
  eq([answer(paid("cs_test_words")), words(paid("cs_test_words"))], ["van", "one two"], "a paid order carries the answer and the words in its checkout's metadata, on one line");
  const manual = paid("manual-check-1");
  eq([answer(manual), words(manual)], ["other", "the van"], "a paid order typed into the sheet carries the answer and the words in its Notes");
  eq((manual.details ?? []).find((d) => d.question === "Notes")?.answer, "Paid cash", "the answer and the words are not part of a typed order's Notes");
  const answered = lead((l) => l.email === "answered@example.invalid");
  eq(answer(answered), "organisation", "a contact enquiry carries the retired answer from its sheet row's Notes");
  eq((answered.details ?? []).find((d) => d.question === "Message")?.answer, "A doorbell | and two cameras", "the answer is not part of a contact enquiry's message");
  eq(answer(lead((l) => l.email === "silent@example.invalid")), "(none)", "a contact enquiry with no answer carries none");
  eq(words(lead((l) => l.email === "silent@example.invalid")), "(none)", "a contact enquiry with no words carries none");
  eq(answer(lead((l) => l.email === "typed@example.invalid")), "google_ads", "an answer typed into the sheet as a label is read as its key");
  const wrote = lead((l) => l.email === "wrote@example.invalid");
  eq([answer(wrote), words(wrote)], ["recommended", SAID_KEPT], "a contact enquiry carries the answer and the words from its sheet row's Notes");
  eq((wrote.details ?? []).find((d) => d.question === "Message")?.answer, "hello", "the words are not part of a contact enquiry's message");
  const wordsOnly = lead((l) => l.email === "words.only@example.invalid");
  eq([answer(wordsOnly), words(wordsOnly)], ["(none)", "saw it on a van"], "a contact enquiry with words and no answer carries the words");
  eq((wordsOnly.details ?? []).find((d) => d.question === "Message")?.answer, "hello", "words without an answer are not part of the message either");
  const consult = (email) => (f.body?.freeConsultations ?? []).find((c) => c.email === email) ?? {};
  eq(answer(consult("booker@example.invalid")), "existing_customer", "a free consultation carries the answer from its sheet row's Notes");
  eq(answer(consult("quiet.booker@example.invalid")), "(none)", "a free consultation with no answer carries none");
  eq([answer(consult("booker.words@example.invalid")), words(consult("booker.words@example.invalid"))], ["press", "on the radio"],
    "a free consultation carries the answer and the words from its sheet row's Notes");
} catch (err) {
  fail.push(`the check could not run: ${err instanceof Error ? err.stack ?? err.message : err}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fail.length) {
  console.error(`\ncheck-found-us: ${fail.length} ${fail.length === 1 ? "failure" : "failures"}\n`);
  for (const f of fail) console.error(`  FAIL  ${f}`);
  if (logged.length) console.error(`\n  What the routes logged (last 30 lines):\n    ${logged.slice(-30).join("\n    ")}`);
  console.error("");
  process.exit(1);
}
/* Fewer than this means scenarios were skipped, not that they passed. */
if (asserted < 200) {
  console.error(`check-found-us: only ${asserted} assertions ran, so part of this check did not run`);
  process.exit(1);
}
console.log(
  `check-found-us (${asserted} assertions): ${fieldUses} fields ask, and ${posters.size} files post found_us and found_us_detail with every lead; ` +
    `/api/contact, /api/checkout/free, /api/checkout and the Stripe webhook carry each of the ${KEYS.length} answers and the visitor's words ` +
    `to the CRM, the sheet and Stripe and nothing else, and still take the ${RETIRED.length} retired answers; the leads feed returns foundUs and foundUsDetail`,
);
