#!/usr/bin/env node
/**
 * Does every payment link still send the customer back to us?
 *
 * ── WHY THIS IS A STANDING CHECK AND NOT A ONE-OFF FIX ───────────
 *
 * Every payment link in this account finished on Stripe's own confirmation
 * page, so our conversion tag never ran and no sale made through one had ever
 * been recorded in Google Ads. Months of SmartCare Living's entire income and
 * a large share of Smart Space's, invisible, while the offline upload built to
 * cover the gap was discarding everything it sent.
 *
 * They were all repointed on 21 September. The fix is not the point. A link is
 * made by hand in the Stripe dashboard when somebody quotes a job, and the
 * person making it has no reason to think about conversion tracking, so the
 * next one will default back to Stripe's page and nothing will say so. That is
 * how this got to be months old in the first place.
 *
 *   node scripts/check-payment-links-redirect.mjs
 *
 * Exit 0 all good, 1 a link is not coming back to us, 2 it could not ask.
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
if (!KEY) { console.error("STRIPE_SECRET_KEY is not set, so nothing was checked."); process.exit(2); }

const SCL_PRODUCT = /smartguardian/i;
/* A link that exists so somebody can put a card through the flow must not
   record a sale. Left on Stripe's page deliberately. */
const TEST_LINK = /\btri?al\b|\btest\b/i;

let data;
try {
  const r = await fetch("https://api.stripe.com/v1/payment_links?limit=100&expand[]=data.line_items", {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  data = await r.json();
  if (data.error) throw new Error(data.error.message);
} catch (e) {
  console.error(`Could not ask Stripe: ${e.message}`);
  process.exit(2);
}

const problems = [];
let checked = 0, tests = 0;

for (const l of data.data ?? []) {
  if (!l.active) continue;
  const items = (l.line_items?.data ?? []).map((i) => i.description ?? "");
  const what = items.join(", ").slice(0, 60) || l.id;
  if (items.some((d) => TEST_LINK.test(d))) { tests++; continue; }
  checked++;

  const url = l.after_completion?.type === "redirect" ? (l.after_completion.redirect?.url ?? "") : "";
  if (!url) {
    problems.push(`"${what}" finishes on Stripe's own page, so the sale cannot be recorded.`);
    continue;
  }
  if (!url.includes("{CHECKOUT_SESSION_ID}")) {
    problems.push(`"${what}" redirects without the session id, so the page cannot verify the payment or send its value.`);
    continue;
  }
  /* The right business. SmartGuardian is SmartCare Living's, and sending its
     customer to smart-space.ie would credit the sale correctly and confuse the
     person who just paid. */
  const wantScl = items.some((d) => SCL_PRODUCT.test(d));
  const goesScl = /smartcareliving\.ie/.test(url);
  if (wantScl !== goesScl) {
    problems.push(
      `"${what}" is ${wantScl ? "SmartCare Living's" : "Smart Space's"} and returns to ` +
      `${goesScl ? "smartcareliving.ie" : "smart-space.ie"}.`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} payment link${problems.length === 1 ? "" : "s"} that will lose the sale:\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\n  Fix with: node scripts/stripe-link-redirects.mjs --apply\n`);
  process.exit(1);
}
console.log(`${checked} live payment links all return the customer to the right business, ${tests} test link(s) left on Stripe on purpose.`);
