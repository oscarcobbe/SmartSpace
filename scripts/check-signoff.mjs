#!/usr/bin/env node
/**
 * Nothing new reaches a customer without Nigel's sign-off, and a mailing only
 * reaches people it may lawfully reach. Pinned here, because each of these is
 * one careless edit from sending something nobody approved:
 *
 *   - an approval of different wording is not an approval of this wording;
 *   - a request for changes, an unreadable record, or no record, is a no;
 *   - every gate in the code names an item that exists on the sign-off page,
 *     and every item on the page is checked by something (or is a switch
 *     somebody flips by hand, named below with the reason);
 *   - the day-before reminders are switched by sign-off, not by a constant;
 *   - a customer basis lapses 12 months after the sale, SmartGuardian needs
 *     consent, an unsubscribed address is never sent to, and the mailings
 *     sender cannot be the receipts domain;
 *   - an unsubscribe link cannot be edited into somebody else's opt-out.
 *
 *   node scripts/check-signoff.mjs
 */
import { readFileSync, readdirSync, statSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(ROOT, ".signoff-"));
const load = async (rel) => {
  const src = readFileSync(join(ROOT, rel), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const file = join(dir, rel.replace(/[\/.]/g, "_") + ".mjs");
  writeFileSync(file, js);
  return import(pathToFileURL(file).href);
};
let V, M;
try {
  V = await load("src/lib/signoff/verdict.ts");
  M = await load("src/lib/email/mailing-rules.ts");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const fail = [];
const eq = (what, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) fail.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};

/* ── The verdict ─────────────────────────────────────────────────── */
const row = (o) => ({ item: "x", content_hash: "aaa", decision: "approved", choice: null, comment: null, decided_by: "nigel", decided_at: "2026-09-28T10:00:00Z", ...o });
eq("no record is not approved", V.approvalFrom([], "aaa").approved, false);
eq("an unreadable record is not approved", V.approvalFrom(null, "aaa").approved, false);
eq("approved this wording", V.approvalFrom([row()], "aaa").approved, true);
eq("approved other wording", V.approvalFrom([row()], "bbb").state, "stale");
eq("changes asked", V.approvalFrom([row({ decision: "changes" })], "aaa").approved, false);
eq("the newest decision wins, whatever the order",
  V.approvalFrom([row({ decided_at: "2026-09-28T09:00:00Z" }), row({ decision: "changes", decided_at: "2026-09-28T11:00:00Z" })], "aaa").state, "changes");
eq("an approval after changes counts",
  V.approvalFrom([row({ decision: "changes", decided_at: "2026-09-28T09:00:00Z" }), row({ decided_at: "2026-09-28T11:00:00Z", choice: "next-morning" })], "aaa").choice, "next-morning");

/* ── Every gate names a real item, and every item is gated ───────── */
const items = readFileSync(join(ROOT, "src/lib/signoff/items.ts"), "utf8");
const ids = new Set([...items.matchAll(/^\s{4}id: "([a-z]+:[a-z0-9-]+)",$/gm)].map((m) => m[1]));
if (ids.size < 10) fail.push(`only ${ids.size} sign-off items found in items.ts; the pattern is reading the wrong thing`);

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e)) files.push(p);
  }
})(join(ROOT, "src"));
const gated = new Set();
for (const f of files) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/approval\("([a-z]+:[a-z0-9-]+)"\)/g)) {
    gated.add(m[1]);
    if (!ids.has(m[1])) fail.push(`${f.slice(ROOT.length + 1)} checks "${m[1]}", which is not on the sign-off page`);
  }
  for (const m of src.matchAll(/itemId: "([a-z]+:[a-z0-9-]+)"/g)) {
    gated.add(m[1]);
    if (!ids.has(m[1])) fail.push(`${f.slice(ROOT.length + 1)} names "${m[1]}", which is not on the sign-off page`);
  }
}
/* Switched by hand after approval (NEXT_PUBLIC_NETWORK_PAGES_LIVE), because
   putting a public site's pages behind a database read on every request is
   the wrong trade for two pages. */
const BY_HAND = new Set(["network:traffic-light", "network:pages"]);
for (const id of ids) if (!gated.has(id) && !BY_HAND.has(id)) fail.push(`"${id}" is on the sign-off page but nothing checks it before sending`);

const reminders = readFileSync(join(ROOT, "src/app/api/cron/booking-reminders/route.ts"), "utf8");
if (/REMINDERS_PAUSED/.test(reminders)) fail.push("the reminders are switched by a constant again, not by sign-off");
for (const id of ["email:reminder-consultation", "sms:reminder-consultation", "email:reminder-install", "sms:reminder-install"]) {
  if (!reminders.includes(`approval("${id}")`)) fail.push(`the reminders job does not check ${id}`);
}

/* ── The Wi-Fi check sends nothing before its pages are public ───── */
/* Until NEXT_PUBLIC_NETWORK_PAGES_LIVE is on, only people signed in to the CRM
   can open the pages, so every enquiry is a test. Sending on VERCEL_ENV alone
   would have emailed Nigel a test lead the first time the pages were tried on
   the live site. */
const wifiRoute = readFileSync(join(ROOT, "src/app/api/wifi-check/route.ts"), "utf8");
const liveFn = wifiRoute.match(/const live = \(\) =>([\s\S]*?);\n/)?.[1] ?? "";
if (!liveFn) fail.push("could not find live() in the Wi-Fi check route; this check is reading the wrong thing");
else if (!/VERCEL_ENV === "production"\s*&&\s*process\.env\.NEXT_PUBLIC_NETWORK_PAGES_LIVE === "1"/.test(liveFn)) {
  fail.push("the Wi-Fi check route can send before its pages are public: live() must need both VERCEL_ENV production and NEXT_PUBLIC_NETWORK_PAGES_LIVE=1");
}
/* Until then the pages are an unlisted draft: open by link, not indexed, and
   linked from nowhere on the public site. Oscar, 29 September 2026: live for
   Nigel to review, but not reachable from the home page. */
const middleware = readFileSync(join(ROOT, "src/middleware.ts"), "utf8");
if (!/isNetwork && process\.env\.NEXT_PUBLIC_NETWORK_PAGES_LIVE !== "1"\) h\.set\("X-Robots-Tag", "noindex/.test(middleware)) {
  fail.push("middleware no longer tells search engines to leave the unlisted network pages alone");
}
/* Until 30 September 2026 this also failed the build when a public page linked
   to the network pages before the switch, because they were an unlisted draft.
   Oscar launched them on 29 September (PR #23), the switch is on in production,
   and guides now link to them on purpose, so that rule is retired. The two
   above still hold whenever the switch is off: no indexing, no live form. */

/* ── Who a mailing may reach ─────────────────────────────────────── */
const T = (id) => M.templateById(id);
const net = T("network-diagnosis-a");
const sg = T("smartguardian-announce");
const cust = (d) => ({ email: "mary@example.ie", basis: "customer", last_purchase_on: d });
eq("customer, 11 months ago", M.recipientVerdict(cust("2025-11-01"), net, "2026-10-01", false).send, true);
eq("customer, on the anniversary", M.recipientVerdict(cust("2025-10-01"), net, "2026-10-01", false).send, true);
eq("customer, a day past 12 months", M.recipientVerdict(cust("2025-09-30"), net, "2026-10-01", false).send, false);
/* Mid-month too: a window stretched by a month is hidden at a month's end by
   the leap-day correction, which is how this check first passed a broken rule. */
eq("customer, mid-month anniversary", M.recipientVerdict(cust("2025-09-15"), net, "2026-09-15", false).send, true);
eq("customer, a day past a mid-month anniversary", M.recipientVerdict(cust("2025-09-15"), net, "2026-09-16", false).send, false);
eq("customer with no date", M.recipientVerdict(cust(null), net, "2026-10-01", false).send, false);
eq("SmartGuardian to a customer without consent", M.recipientVerdict(cust("2026-09-01"), sg, "2026-10-01", false).send, false);
eq("SmartGuardian with consent", M.recipientVerdict({ email: "a@b.ie", basis: "consent", last_purchase_on: null }, sg, "2026-10-01", false).send, true);
eq("unsubscribed is never sent", M.recipientVerdict({ email: "a@b.ie", basis: "consent", last_purchase_on: null }, net, "2026-10-01", true).send, false);
eq("leap day plus a year", M.customerWindowEnds("2024-02-29"), "2025-02-28");

eq("no mailings sender", M.marketingSenderProblem(undefined, "Smart Space <hello@bookings.smart-space.ie>") !== null, true);
eq("mailings on the receipts domain", M.marketingSenderProblem("Nigel <nigel@bookings.smart-space.ie>", "Smart Space <hello@bookings.smart-space.ie>") !== null, true);
eq("mailings on their own domain", M.marketingSenderProblem("Nigel <nigel@news.smart-space.ie>", "Smart Space <hello@bookings.smart-space.ie>"), null);

const tok = M.unsubscribeToken("Mary@Example.ie", "s3cret");
eq("an unsubscribe link reads back", M.readUnsubscribeToken(tok, "s3cret"), "mary@example.ie");
const [, sig] = tok.split(".");
const forged = `${Buffer.from("someone@else.ie").toString("base64url")}.${sig}`;
eq("an edited link is refused", M.readUnsubscribeToken(forged, "s3cret"), null);
eq("a link signed with another secret is refused", M.readUnsubscribeToken(tok, "other"), null);

eq("an import line", M.parseRecipientLine("mary@example.ie, Mary, 14/03/2026"), { email: "mary@example.ie", firstName: "Mary", purchased: "2026-03-14" });
eq("an import line with no name keeps the date in place", M.parseRecipientLine("mary@example.ie,,2026-03-14"), { email: "mary@example.ie", firstName: null, purchased: "2026-03-14" });

if (fail.length) {
  console.error(`\ncheck-signoff: ${fail.length} problem${fail.length === 1 ? "" : "s"}:\n`);
  for (const f of fail) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log(`check-signoff: ${ids.size} items, each gated; approvals match wording; mailings hold to the 12-month rule, consent and opt-outs`);
