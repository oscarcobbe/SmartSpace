#!/usr/bin/env node
/**
 * The leads feed lists every free consultation, keeps each paid order's click
 * id, and says whether its capped reads were complete.
 *
 * The FourWinds portal's weekly client report counts Smart Space's enquiries
 * from this feed. Until 28 September 2026 the feed dropped the sheet's "Free
 * Consultation" rows and built each paid order from Stripe without the gclid
 * that /api/checkout wrote into the session, so the report counted no free
 * consultation and tied no paid order to an ad. It also read the leads sheet
 * with limit=500 and never said when it had hit the limit. See
 * src/lib/feed-enquiries.ts.
 *
 * This runs the real route, GET in src/app/api/admin/leads/route.ts, with
 * fetch replaced: Stripe, the sheet's Apps Script and Stripe's balance answer
 * with rows shaped like theirs, and the response is read the way the report
 * reads it. Reading the helpers alone would pass with the route never calling
 * them.
 *
 * Nothing leaves this machine: fetch never reaches the network, and every key
 * is made up here.
 *
 *   node scripts/check-feed-enquiries.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/*
 * The route and what it imports, each transpiled on its own and pointed at
 * the others by a relative path. An import this table does not know fails the
 * check, so a new dependency is added here rather than skipped.
 */
const FILES = {
  "@/lib/feed-enquiries": ["src/lib/feed-enquiries.ts", "feed-enquiries.mjs"],
  "@/lib/found-us": ["src/lib/found-us.ts", "found-us.mjs"],
  "@/lib/crm/labels": ["src/lib/crm/labels.ts", "labels.mjs"],
  "@/lib/format": ["src/lib/format.ts", "format.mjs"],
  "@/lib/crm/auth": ["src/lib/crm/auth.ts", "auth.mjs"],
  "@/data/productCatalogue": ["src/data/productCatalogue.ts", "productCatalogue.mjs"],
};
const BUILTIN = new Set(["crypto", "node:crypto"]);
/* The route uses NextResponse.json and nothing else from next/server. */
const NEXT_SERVER = `export const NextResponse = {
  json: (body, init = {}) => new Response(JSON.stringify(body), { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } }),
};`;

const fail = [];
const dir = mkdtempSync(join(tmpdir(), "feed-enquiries-"));

function load(srcPath, outName) {
  const js = ts.transpileModule(readFileSync(join(ROOT, srcPath), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.Preserve },
  }).outputText;
  const out = js.replace(/(from\s+|import\s+)(["'])([^"']+)\2/g, (whole, lead, q, spec) => {
    if (FILES[spec]) return `${lead}${q}./${FILES[spec][1]}${q}`;
    if (spec === "next/server") return `${lead}${q}./next-server.mjs${q}`;
    if (BUILTIN.has(spec)) return whole;
    fail.push(`${srcPath} imports "${spec}", which this check does not load. Add it to FILES in scripts/check-feed-enquiries.mjs.`);
    return whole;
  });
  writeFileSync(join(dir, outName), out);
}

/* ---- the sources, as they answer ---- */

const at = (iso) => Math.floor(Date.parse(iso) / 1000);
const session = (id, createdIso, metadata) => ({
  id, created: at(createdIso), metadata, payment_status: "paid", amount_total: 13900,
  customer_details: { name: "Test Person", email: `${id}@example.ie`, phone: "+353870000000", address: {} },
  custom_fields: [],
});
const sheetRow = (over) => ({
  date: "2026-09-25 11:40", type: "Contact Enquiry", name: "Test Person", email: "person@example.ie", gclid: "",
  phone: "087 000 0000", address: "", product: "", amount: "", currency: "", bookingDate: "", bookingSlot: "",
  orderId: "", source: "smart-space.ie", notes: "", status: "New", ...over,
});
const STRIPE = [
  session("cs_live_meta", "2026-09-25T10:00:00Z", { product_name: "Plus Video Doorbell", gclid: "Cj0-from-metadata" }),
  session("cs_live_sheet", "2026-09-24T10:00:00Z", { product_name: "Eufy Video Doorbell E340" }),
  session("cs_live_none", "2026-09-23T06:12:00Z", { product_name: "Plus Floodlight Cam", gclid: "" }),
];
/* cs_live_meta has no sheet row, as when the webhook's write to the sheet
   failed, so its click id can only come from the checkout's metadata. */
const SHEET = [
  sheetRow({ date: "2026-09-24 11:01", type: "Paid Order", orderId: "cs_live_sheet", gclid: "Cj0-from-webhook-row" }),
  sheetRow({ date: "2026-09-23 07:13", type: "Paid Order", orderId: "cs_live_none" }),
  sheetRow({ date: "2026-09-21 11:40", type: "Free Consultation", email: "booker@example.ie", gclid: "Cj0-booking",
    product: "Free Home Consultation", bookingDate: "Thu 24 Sep", bookingSlot: "10:00-12:00" }),
  sheetRow({ date: "2026-09-22 12:53", type: "Free Consultation", email: "second@example.ie", source: "smart-space.ie/booking" }),
  sheetRow({ date: "2026-09-25 11:40", type: "Contact Enquiry", notes: "Installation Enquiry: a question" }),
  sheetRow({ date: "2026-09-14 03:16", type: "QR Scan", source: "business-card:review", email: "" }),
];

let requests = [];
function answer({ stripe = STRIPE, hasMore = false, sheet = SHEET }) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    requests.push(u);
    if (u.startsWith("https://api.stripe.com/v1/checkout/sessions?")) {
      return new Response(JSON.stringify({ object: "list", data: stripe, has_more: hasMore }), { status: 200 });
    }
    if (u === "https://api.stripe.com/v1/balance") {
      return new Response(JSON.stringify({ available: [], pending: [] }), { status: 200 });
    }
    if (u.startsWith("https://sheet.example.invalid/exec?")) {
      const limit = Number(new URL(u).searchParams.get("limit"));
      /* The Apps Script's own cap: the rows from the bottom of the sheet up. */
      return new Response(JSON.stringify({ rows: sheet.slice(0, limit), count: Math.min(sheet.length, limit) }), { status: 200 });
    }
    throw new Error(`this check does not let ${u} be fetched`);
  };
}

let call = 0;
async function feed(route) {
  requests = [];
  const res = await route.GET(new Request("https://smart-space.ie/api/admin/leads", {
    headers: { authorization: "Bearer check-admin-key", "x-forwarded-for": `10.0.0.${++call}` },
  }));
  if (res.status !== 200) throw new Error(`the route answered ${res.status}`);
  return res.json();
}

const eq = (got, want, why) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) fail.push(`${why}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};

try {
  for (const [src, out] of Object.values(FILES)) load(src, out);
  load("src/app/api/admin/leads/route.ts", "route.mjs");
  writeFileSync(join(dir, "next-server.mjs"), NEXT_SERVER);

  process.env.ADMIN_KEY = "check-admin-key";
  process.env.STRIPE_SECRET_KEY = "sk_test_check";
  process.env.GOOGLE_SHEET_WEBHOOK_URL = "https://sheet.example.invalid/exec";
  process.env.GOOGLE_SHEET_READ_TOKEN = "check-read-token";
  delete process.env.CALENDLY_PERSONAL_TOKEN;

  const route = await import(pathToFileURL(join(dir, "route.mjs")).href);

  /* ---- free consultations ---- */
  answer({});
  const body = await feed(route);
  const free = body.freeConsultations ?? null;
  eq(Array.isArray(free), true, "the feed lists free consultations");
  eq((free ?? []).map((c) => c.date), ["2026-09-21 11:40", "2026-09-22 12:53"],
    "every Free Consultation row in the sheet is listed, dated when it was booked");
  eq((free ?? []).map((c) => c.gclid ?? ""), ["Cj0-booking", ""], "a free consultation keeps the click id the sheet row carries");
  eq((free ?? []).map((c) => c.email), ["booker@example.ie", "second@example.ie"], "a free consultation says who booked it");
  eq(body.leads.filter((l) => /booker|second/.test(l.email)).length, 0,
    "a free consultation is not also a dashboard row, which shows it as its Calendly appointment");

  /* ---- paid orders' click ids ---- */
  const order = (id) => body.leads.find((l) => l.type === "Paid Order" && l.orderId === id);
  eq(body.leads.filter((l) => l.type === "Paid Order").length, 3, "each Stripe checkout is one paid order");
  eq(order("cs_live_meta")?.gclid ?? "", "Cj0-from-metadata", "a paid order carries the click id in its checkout's metadata");
  eq(order("cs_live_sheet")?.gclid ?? "", "Cj0-from-webhook-row", "a paid order whose checkout has none carries the one on its sheet row");
  eq(order("cs_live_none")?.gclid ?? "", "", "a paid order with no click id anywhere carries none");

  /* ---- coverage ---- */
  const sheetAsked = Number(new URL(requests.find((u) => u.startsWith("https://sheet.example.invalid/")) ?? "https://x/?limit=NaN").searchParams.get("limit"));
  const stripeAsked = Number(new URL(requests.find((u) => u.startsWith("https://api.stripe.com/v1/checkout/")) ?? "https://x/?limit=NaN").searchParams.get("limit"));
  eq(body.coverage?.sheet, { rows: SHEET.length, limit: sheetAsked, complete: true, oldest: null },
    "a sheet read shorter than its limit is complete, and gives the limit it asked for");
  eq(body.coverage?.stripe, { rows: 3, limit: stripeAsked, complete: true, oldest: "2026-09-23T06:12:00.000Z" },
    "Stripe's read is complete when Stripe says there is no more, and its oldest checkout is given");

  const padded = [...SHEET, ...Array.from({ length: Math.max(0, sheetAsked - SHEET.length) }, () => sheetRow({ type: "QR Scan", email: "" }))];
  answer({ sheet: padded });
  eq((await feed(route)).coverage?.sheet?.complete, false, "a sheet read that returned as many rows as it asked for is not complete");
  answer({ sheet: [...padded, sheetRow({})] });
  eq((await feed(route)).coverage?.sheet?.complete, false, "a sheet holding more rows than the limit is not complete");

  answer({ hasMore: true });
  eq((await feed(route)).coverage?.stripe?.complete, false, "a Stripe read with more checkouts behind it is not complete");
} catch (err) {
  fail.push(`the route could not be run: ${err instanceof Error ? err.stack ?? err.message : err}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fail.length) {
  console.error(`\ncheck-feed-enquiries: ${fail.length} ${fail.length === 1 ? "failure" : "failures"}\n`);
  for (const f of fail) console.error(`  FAIL  ${f}`);
  console.error("");
  process.exit(1);
}
console.log("check-feed-enquiries: the feed lists free consultations, keeps paid orders' click ids, and says when a read was cut short");
