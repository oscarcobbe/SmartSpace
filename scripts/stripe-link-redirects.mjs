#!/usr/bin/env node
/**
 * Send a customer back to us after they pay, instead of leaving them on Stripe.
 *
 * ── WHY ──────────────────────────────────────────────────────────
 *
 * Every payment link in this account finishes on Stripe's hosted confirmation
 * page. Our conversion tag never runs, so no sale made through a link has ever
 * been recorded in Google Ads. That is most of SmartCare Living's income,
 * because SmartGuardian subscriptions are sold through links and nothing else,
 * and a large share of Smart Space's: roughly EUR 4,000 in one recent stretch
 * on ten links made by hand.
 *
 * The offline upload exists to cover exactly this gap and was discarding one
 * hundred per cent of what it sent. Two routes, both silently dead, is why the
 * ad accounts have shown a business that does not sell anything.
 *
 * ── WHICH PAGE ───────────────────────────────────────────────────
 *
 * A SmartGuardian subscription is SmartCare Living's, so it goes to SCL's own
 * domain and records into SCL's account. Everything else is Smart Space's.
 * Sending an SCL customer to smart-space.ie would record the sale correctly
 * and confuse the customer, which is not a trade worth making.
 *
 *   node scripts/stripe-link-redirects.mjs            # dry run
 *   node scripts/stripe-link-redirects.mjs --apply
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of [".env.local", ".env.production.local"]) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) { console.error("STRIPE_SECRET_KEY is not set."); process.exit(2); }

const SCL_PAGE = "https://www.smartcareliving.ie/payment-success?session_id={CHECKOUT_SESSION_ID}";
const SS_PAGE = "https://smart-space.ie/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}";

/* The same test the CRM's finance split uses, so one product cannot be Smart
   Space's money on one screen and SmartCare Living's on another. */
const SCL_PRODUCT = /smartguardian/i;

/* Test links are left alone on purpose.
   "Trial Subscription", "Trial 2 Subscription" and "Trail Subscription" are a
   euro a month, carry no metadata and have no subscriptions on them at all.
   They exist so somebody can put a card through the flow. Pointing them at a
   success page would record a conversion in a live account every time anybody
   tested anything, which is the same class of fault as a page that fires
   because it was opened. */
const TEST_LINK = /\btri?al\b|\btest\b/i;

const stripe = async (path, body) => {
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${KEY}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const j = await r.json();
  if (j.error) throw new Error(`${path}: ${j.error.message}`);
  return j;
};

const links = (await stripe("/payment_links?limit=100&expand[]=data.line_items")).data ?? [];
const apply = process.argv.includes("--apply");

const plan = [];
const skipped = [];
for (const l of links) {
  if (!l.active) continue;
  const items = (l.line_items?.data ?? []).map((i) => i.description ?? "");
  if (items.some((d) => TEST_LINK.test(d))) { skipped.push(items.join(", ")); continue; }
  const isScl = items.some((d) => SCL_PRODUCT.test(d));
  const want = isScl ? SCL_PAGE : SS_PAGE;
  const now = l.after_completion?.type === "redirect" ? l.after_completion.redirect?.url : null;
  plan.push({ id: l.id, items, who: isScl ? "SmartCare Living" : "Smart Space", want, now, change: now !== want });
}

const ambiguous = plan.filter((p) =>
  p.who === "Smart Space" && p.items.some((d) => /subscription/i.test(d)));

console.log(`${plan.length} active payment links\n`);
for (const p of plan) {
  console.log(`  ${p.change ? "CHANGE" : "  ok  "} ${p.who.padEnd(17)} ${String(p.items[0] ?? "?").slice(0, 46).padEnd(48)}`);
}
if (skipped.length) {
  console.log(`\n  ${skipped.length} test link(s) deliberately left on Stripe's page, so a test cannot record a sale:`);
  for (const t of skipped) console.log(`    ${t.slice(0, 70)}`);
}
if (ambiguous.length) {
  console.log(`\n  ${ambiguous.length} recurring link(s) not named SmartGuardian, going to Smart Space:`);
  for (const a of ambiguous) console.log(`    ${a.items.join(", ").slice(0, 70)}`);
  console.log("    Check these are Smart Space's before applying.");
}

const changing = plan.filter((p) => p.change);
console.log(`\n${changing.length} would change.`);
if (!apply) { console.log("Nothing was changed. Add --apply."); process.exit(0); }

let done = 0;
for (const p of changing) {
  const body = new URLSearchParams();
  body.append("after_completion[type]", "redirect");
  body.append("after_completion[redirect][url]", p.want);
  await stripe(`/payment_links/${p.id}`, body);
  done++;
  console.log(`  set ${p.id} -> ${p.who}`);
}
console.log(`\n${done} payment link${done === 1 ? "" : "s"} now return the customer to us.`);
