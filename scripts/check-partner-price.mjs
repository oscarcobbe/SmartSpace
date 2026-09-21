#!/usr/bin/env node
/**
 * The partner share is a percentage of a real subscription, so the price it is
 * taken from has to be the real one.
 *
 * This is a number that goes into a conversation about money with another
 * business. A stale figure here is not a display bug, it is an offer we cannot
 * honour, found out by the partner rather than by us.
 *
 *   node scripts/check-partner-price.mjs
 *
 * Exits 2, not 1, when Stripe cannot be reached: a check that proved nothing
 * is not a check that passed.
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

const src = readFileSync(join(ROOT, "src/lib/crm/content/partners.ts"), "utf8");
const declared = Number(/subscriptionPerMonth:\s*(\d+)/.exec(src)?.[1]);
if (!Number.isFinite(declared)) {
  console.error("partners.ts does not declare a subscription price.");
  process.exit(1);
}

const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("STRIPE_SECRET_KEY is not set, so the price could not be checked."); process.exit(2); }

const r = await fetch("https://api.stripe.com/v1/prices?limit=100&active=true&expand[]=data.product", {
  headers: { Authorization: `Bearer ${key}` },
});
const j = await r.json();
if (j.error) { console.error(`Stripe refused: ${j.error.message}`); process.exit(2); }

/* The standard monthly subscription, which is the one a home actually goes on.
   Bundles and trials are deliberately excluded: a share of a trial is nothing
   and a share of a three-pack is a different conversation. */
const live = (j.data ?? []).filter((p) =>
  p.recurring?.interval === "month" &&
  /smartguardian/i.test(p.product?.name ?? "") &&
  !/trial|trail|bundle|\dx /i.test(p.product?.name ?? ""));

if (live.length === 0) { console.error("No live SmartGuardian monthly price found in Stripe."); process.exit(2); }

const amounts = [...new Set(live.map((p) => p.unit_amount / 100))];
if (!amounts.includes(declared)) {
  console.error(
    `The partner share is worked out on EUR ${declared} a month.\n` +
    `  Stripe's live SmartGuardian monthly price is EUR ${amounts.join(" or ")}.\n` +
    `  Update subscriptionPerMonth in src/lib/crm/content/partners.ts.`);
  process.exit(1);
}
console.log(`Partner share is taken from EUR ${declared} a month, which is Stripe's live SmartGuardian price.`);
