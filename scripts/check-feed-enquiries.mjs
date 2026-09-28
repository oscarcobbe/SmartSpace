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
 * with limit=500 and never said when it had hit the limit, and it built a
 * checkout made from a payment link as product "Order", which let SmartCare
 * Living's SmartGuardian payments pass as Smart Space orders. See
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
/* Where each site sends a paid customer, as Stripe held them on 28 September 2026. */
const SMART_SPACE_RETURN = "https://smart-space.ie/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}";
const SMARTCARE_RETURN = "https://www.smartcareliving.ie/payment-success?session_id={CHECKOUT_SESSION_ID}";
/* A checkout the site made: metadata, and its own success_url. */
const session = (id, createdIso, metadata, over = {}) => ({
  id, created: at(createdIso), metadata, payment_status: "paid", amount_total: 13900,
  customer_details: { name: "Test Person", email: `${id}@example.ie`, phone: "+353870000000", address: {} },
  custom_fields: [], success_url: SMART_SPACE_RETURN, payment_link: null,
  line_items: { object: "list", data: [{ description: metadata.product_name ?? "Order" }], has_more: false },
  ...over,
});
/* A checkout made from a payment link: no metadata, Stripe's placeholder
   success_url, and the link (expanded) saying where the customer goes. */
const redirectTo = (url) => ({ id: "plink_check", after_completion: { type: "redirect", redirect: { url } } });
const byLink = (id, createdIso, description, link, over = {}) => session(id, createdIso, {}, {
  success_url: "https://stripe.com", payment_link: link, line_items: { object: "list", data: [{ description }], has_more: false },
  ...over,
});
const sheetRow = (over) => ({
  date: "2026-09-25 11:40", type: "Contact Enquiry", name: "Test Person", email: "person@example.ie", gclid: "",
  phone: "087 000 0000", address: "", product: "", amount: "", currency: "", bookingDate: "", bookingSlot: "",
  orderId: "", source: "smart-space.ie", notes: "", status: "New", ...over,
});
const STRIPE = [
  session("cs_live_meta", "2026-09-25T10:00:00Z", { product_name: "Plus Video Doorbell", gclid: "Cj0-from-metadata" }),
  session("cs_live_sheet", "2026-09-24T10:00:00Z", { product_name: "Eufy Video Doorbell E340" }),
  byLink("cs_live_link_ss", "2026-09-24T09:00:00Z", "Standard Call Out Fee", redirectTo(SMART_SPACE_RETURN)),
  byLink("cs_live_link_scl", "2026-09-24T08:00:00Z", "SmartGuardian Monthly Subscription", redirectTo(SMARTCARE_RETURN)),
  byLink("cs_live_link_named", "2026-09-24T07:00:00Z", "SmartGuardian Back Payment",
    { id: "plink_check", after_completion: { type: "hosted_confirmation", redirect: null } }),
  byLink("cs_live_link_unread", "2026-09-24T06:00:00Z", "Standard Call Out Fee", "plink_not_expanded"),
  /* A link Stripe did not expand whose own success_url names a site, as 1 of
     the 24 real links' did on 28 September 2026: a link's success_url is not
     where it sends the customer, so it says nothing. */
  byLink("cs_live_link_unread_url", "2026-09-24T05:00:00Z", "Standard Call Out Fee", "plink_not_expanded",
    { success_url: SMART_SPACE_RETURN }),
  /* SmartCare Living's links go back to www.smartcareliving.ie. One whose
     product is not named SmartGuardian is named by its return page alone. */
  byLink("cs_live_link_www", "2026-09-24T04:00:00Z", "Monthly Subscription", redirectTo(SMARTCARE_RETURN)),
  byLink("cs_live_link_clash", "2026-09-23T08:00:00Z", "SmartGuardian Monthly Subscription", redirectTo(SMART_SPACE_RETURN)),
  session("cs_live_none", "2026-09-23T06:12:00Z", { product_name: "Plus Floodlight Cam", gclid: "" }),
];
/* cs_live_meta has no sheet row, as when the webhook's write to the sheet
   failed, so its click id can only come from the checkout's metadata. */
const SHEET = [
  sheetRow({ date: "2026-09-24 11:01", type: "Paid Order", orderId: "cs_live_sheet", gclid: "Cj0-from-webhook-row" }),
  /* A webhook row whose checkout Stripe did not return: it stands in for the
     order, click id and all, and nothing says whose it is. */
  sheetRow({ date: "2026-09-20 10:00", type: "Paid Order", orderId: "cs_live_gone", gclid: "Cj0-stand-in", product: "Installation" }),
  sheetRow({ date: "2026-09-23 07:13", type: "Paid Order", orderId: "cs_live_none" }),
  sheetRow({ date: "2026-09-21 11:40", type: "Free Consultation", email: "booker@example.ie", gclid: "Cj0-booking",
    product: "Free Home Consultation", bookingDate: "Thu 24 Sep", bookingSlot: "10:00-12:00" }),
  sheetRow({ date: "2026-09-22 12:53", type: "Free Consultation", email: "second@example.ie", source: "smart-space.ie/booking" }),
  sheetRow({ date: "2026-09-25 11:40", type: "Contact Enquiry", notes: "Installation Enquiry: a question" }),
  sheetRow({ date: "2026-09-14 03:16", type: "QR Scan", source: "business-card:review", email: "" }),
];

let requests = [];
function answer({ stripe = STRIPE, hasMore = false, sheet = SHEET, sheetTimesOut = 0 }) {
  globalThis.fetch = async (url) => {
    const u = String(url);
    requests.push(u);
    /* The Apps Script waking up slowly, as the route's retry is there for. */
    if (u.startsWith("https://sheet.example.invalid/exec?") && sheetTimesOut-- > 0) {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    }
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
  const { SHEET_LIMIT } = await import(pathToFileURL(join(dir, "feed-enquiries.mjs")).href);

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
  eq(body.leads.filter((l) => l.type === "Paid Order").length, STRIPE.length + 1,
    "each Stripe checkout is one paid order, and a webhook row whose checkout Stripe did not return stands in for it");
  eq(order("cs_live_meta")?.gclid ?? "", "Cj0-from-metadata", "a paid order carries the click id in its checkout's metadata");
  eq(order("cs_live_sheet")?.gclid ?? "", "Cj0-from-webhook-row", "a paid order whose checkout has none carries the one on its sheet row");
  eq(order("cs_live_none")?.gclid ?? "", "", "a paid order with no click id anywhere carries none");
  eq(order("cs_live_gone")?.gclid ?? "", "Cj0-stand-in", "a sheet row standing in for a checkout Stripe did not return keeps its click id");

  /* ---- which business each paid order belongs to ---- */
  const stripeAsk = requests.find((u) => u.startsWith("https://api.stripe.com/v1/checkout/")) ?? "";
  eq(["data.line_items", "data.payment_link"].filter((e) => !new URL(stripeAsk || "https://x/").searchParams.getAll("expand[]").includes(e)), [],
    "the Stripe read expands what each checkout's business is read from");
  eq(Object.fromEntries(STRIPE.map((x) => x.id).concat("cs_live_gone").map((id) => [id, order(id)?.business])), {
    cs_live_meta: "smart-space", cs_live_sheet: "smart-space", cs_live_link_ss: "smart-space",
    cs_live_link_scl: "smartcare-living", cs_live_link_named: "smartcare-living",
    cs_live_link_unread: null, cs_live_link_unread_url: null, cs_live_link_www: "smartcare-living",
    cs_live_link_clash: null, cs_live_none: "smart-space", cs_live_gone: null,
  }, "each paid order says whose it is: by where the checkout sends the customer and by a SmartGuardian name, and null when neither says or the two disagree");

  /* ---- coverage ---- */
  const sheetAsked = Number(new URL(requests.find((u) => u.startsWith("https://sheet.example.invalid/")) ?? "https://x/?limit=NaN").searchParams.get("limit"));
  const stripeAsked = Number(new URL(requests.find((u) => u.startsWith("https://api.stripe.com/v1/checkout/")) ?? "https://x/?limit=NaN").searchParams.get("limit"));
  eq(body.coverage?.sheet, { rows: SHEET.length, limit: sheetAsked, complete: true, oldest: null },
    "a sheet read shorter than its limit is complete, and gives the limit it asked for");
  eq(body.coverage?.stripe, { rows: STRIPE.length, limit: stripeAsked, complete: true, oldest: "2026-09-23T06:12:00.000Z" },
    "Stripe's read is complete when Stripe says there is no more, and its oldest checkout is given");

  const padded = [...SHEET, ...Array.from({ length: Math.max(0, sheetAsked - SHEET.length) }, () => sheetRow({ type: "QR Scan", email: "" }))];
  answer({ sheet: padded });
  eq((await feed(route)).coverage?.sheet?.complete, false, "a sheet read that returned as many rows as it asked for is not complete");
  answer({ sheet: [...padded, sheetRow({})] });
  eq((await feed(route)).coverage?.sheet?.complete, false, "a sheet holding more rows than the limit is not complete");

  answer({ sheet: [] });
  eq((await feed(route)).coverage?.sheet?.complete, false,
    "a sheet read of no rows is not complete: the Apps Script answers a type it does not know with no rows");

  /* The first read timing out and the retry answering: the retry asks for
     the same limit, and coverage is judged against it. */
  answer({ sheetTimesOut: 1 });
  const retried = await feed(route);
  const sheetAsks = requests.filter((u) => u.startsWith("https://sheet.example.invalid/"));
  eq(sheetAsks.length, 2, "a sheet read that timed out is retried once");
  eq(sheetAsks.map((u) => Number(new URL(u).searchParams.get("limit"))), [SHEET_LIMIT, SHEET_LIMIT],
    "the first sheet read and its retry both ask for SHEET_LIMIT rows");
  eq(retried.coverage?.sheet, { rows: SHEET.length, limit: SHEET_LIMIT, complete: true, oldest: null },
    "the retried read's coverage is judged against the limit it asked for");
  eq((retried.freeConsultations ?? []).length, 2, "the retried read still lists the free consultations");

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
