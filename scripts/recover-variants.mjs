#!/usr/bin/env node
/**
 * Reverse-engineer the variant a past customer chose by matching the
 * amount they paid against the product's variant prices. Each variant is
 * a unique combination of options (e.g. "2 devices / wired / no cameras")
 * and has its own price — so the paid amount usually narrows things down
 * to one variant. When two or more variants share a price we surface every
 * candidate so Nigel can ring the customer to disambiguate.
 *
 * Usage:
 *   node scripts/recover-variants.mjs           # dry run, prints matches
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const env = {};
for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const STRIPE_KEY = env.STRIPE_SECRET_KEY;

// Load the frozen product catalogue (matches what was live on each customer's
// purchase date — contents haven't changed since the catalogue was decoupled).
const catalogueRaw = readFileSync(resolve(process.cwd(), "src/data/productCatalogue.ts"), "utf8");
// File shape: `export const PRODUCT_CATALOGUE: ShopifyProduct[] = [...];`
// Find the `= [` after the export declaration; the matching `]` is the
// last `]` in the file.
const arrStartIdx = catalogueRaw.indexOf("= [");
const start = arrStartIdx >= 0 ? arrStartIdx + 2 : -1;
const end = catalogueRaw.lastIndexOf("]");
if (start < 0 || end < 0) {
  console.error("Could not locate catalogue array");
  process.exit(1);
}
const products = JSON.parse(catalogueRaw.slice(start, end + 1));

function variantsForHandle(handle) {
  const p = products.find((p) => p.handle === handle);
  if (!p) return [];
  return (p.variants?.edges || []).map((e) => e.node);
}

function findVariantsByPrice(handle, paidEuros) {
  const cents = Math.round(paidEuros * 100);
  return variantsForHandle(handle).filter((v) => Math.round(parseFloat(v.price.amount) * 100) === cents);
}

async function fetchPaidStripeOrders() {
  const r = await fetch(
    "https://api.stripe.com/v1/checkout/sessions?limit=100&status=complete&expand[]=data.custom_fields",
    { headers: { Authorization: `Bearer ${STRIPE_KEY}` } }
  );
  return (await r.json()).data || [];
}

// ─── product_name → handle mapping ──────────────────────────────────────
// productCatalogue uses Shopify handles. Stripe metadata uses display names.
function handleFromProductName(name) {
  if (!name) return null;
  const norm = name.toLowerCase().trim();
  // Direct hit by handle?
  if (products.find((p) => p.handle === norm)) return norm;
  // Match by title
  const byTitle = products.find((p) => p.title.toLowerCase() === norm);
  if (byTitle) return byTitle.handle;
  // Looser: contains
  const byContains = products.find((p) => p.title.toLowerCase().includes(norm) || norm.includes(p.title.toLowerCase()));
  if (byContains) return byContains.handle;
  return null;
}

// ─── main ───────────────────────────────────────────────────────────────
const orders = await fetchPaidStripeOrders();
console.log(`\nResolved ${orders.length} paid Stripe orders.\n`);

for (const s of orders) {
  const cd = s.customer_details || {};
  const name = cd.name || "—";
  const productName = s.metadata?.product_name || "(unknown)";
  const handle = handleFromProductName(productName);
  const paid = (s.amount_total || 0) / 100;
  if (!handle) {
    console.log(`❓ ${name}  €${paid.toFixed(2)}  ${productName} → no catalogue match`);
    continue;
  }
  // Skip <€5 test orders
  if (paid < 5) {
    console.log(`🧪 ${name}  €${paid.toFixed(2)}  ${productName} (test, skipped)`);
    continue;
  }
  const candidates = findVariantsByPrice(handle, paid);
  console.log(`━━━ ${name}  €${paid.toFixed(2)}  ${productName} ━━━`);
  if (candidates.length === 0) {
    console.log(`   no exact-price match. Closest variants:`);
    const closest = variantsForHandle(handle)
      .map((v) => ({ v, diff: Math.abs(parseFloat(v.price.amount) - paid) }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3);
    closest.forEach(({ v, diff }) => console.log(`     €${parseFloat(v.price.amount).toFixed(2)}  ${v.title}  (diff €${diff.toFixed(2)})`));
  } else if (candidates.length === 1) {
    const v = candidates[0];
    console.log(`   ✅ Unique match: ${v.title}`);
    for (const so of v.selectedOptions) console.log(`      ${so.name}: ${so.value}`);
  } else {
    console.log(`   ⚠️ ${candidates.length} variants share this price — needs customer confirmation:`);
    candidates.forEach((v) => {
      console.log(`     • ${v.title}`);
      for (const so of v.selectedOptions) console.log(`         ${so.name}: ${so.value}`);
    });
  }
  console.log();
}
