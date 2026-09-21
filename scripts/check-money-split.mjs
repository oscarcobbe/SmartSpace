#!/usr/bin/env node
/**
 * Every euro in the Stripe account has to belong to one business, knowably.
 *
 * "SmartSpace Technologies" takes money for both. Smart Space sells Ring and
 * Eufy installations through checkout and bigger custom quotes on payment
 * links; SmartCare Living sells SmartGuardian, mostly as a monthly
 * subscription through billing but sometimes as a whole system through
 * checkout like any other install.
 *
 * Finance used to show one combined total whichever business was selected, and
 * Marketing measured Smart Space's advertising against it. Splitting on the
 * payment mechanism is not good enough either: it files a SmartGuardian system
 * sold through checkout as a Smart Space install.
 *
 * So the split reads the product, and this says whether every charge in the
 * window can still be read that way. A new product name nobody taught it
 * about is the failure mode, and it is silent: the money just lands in
 * whichever business the fallback happens to pick.
 *
 *   STRIPE_SECRET_KEY=... node scripts/check-money-split.mjs
 */
const K = process.env.STRIPE_SECRET_KEY;
if (!K) { console.error("STRIPE_SECRET_KEY is not set."); process.exit(2); }

const SCL_PRODUCT = /smartguardian/i;
const BILLED_NOT_SOLD = /^(subscription|payment for invoice)/i;

const get = async (p) => {
  const r = await fetch("https://api.stripe.com/v1/" + p, { headers: { Authorization: "Bearer " + K } });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j;
};
async function all(path) {
  let out = [], after = "", page = 0;
  while (page++ < 25) {
    const j = await get(path + "&limit=100" + (after ? `&starting_after=${after}` : ""));
    out.push(...j.data);
    if (!j.has_more) break;
    after = j.data[j.data.length - 1].id;
  }
  return out;
}

const since = Math.floor(Date.now() / 1000) - 180 * 86400;
const sessions = (await all(`checkout/sessions?created[gte]=${since}&expand[]=data.line_items`))
  .filter((s) => s.payment_status === "paid" && s.payment_intent);
const sold = new Map(sessions.map((s) => [s.payment_intent, (s.line_items?.data ?? []).map((l) => l.description ?? "").join(" | ")]));
const charges = (await all(`charges?created[gte]=${since}`)).filter((c) => c.paid && !c.refunded);

const tally = { "smart-space": { n: 0, eur: 0 }, smartcareliving: { n: 0, eur: 0 } };
const unreadable = [];
for (const c of charges) {
  const bought = c.payment_intent ? sold.get(c.payment_intent) : undefined;
  let site, why;
  if (bought !== undefined) { site = SCL_PRODUCT.test(bought) ? "smartcareliving" : "smart-space"; why = "checkout line item"; }
  else if (BILLED_NOT_SOLD.test(String(c.description ?? ""))) { site = "smartcareliving"; why = "billing description"; }
  else { site = "smart-space"; why = "fallback"; }

  tally[site].n++; tally[site].eur += (c.amount || 0) / 100;
  /* A charge that reaches the fallback was read by neither route. That is fine
     for a hand-made payment link, and is exactly how a new product line would
     slip into the wrong business unnoticed, so each one is named. */
  if (why === "fallback") unreadable.push({ d: new Date(c.created * 1000).toISOString().slice(0, 10), eur: (c.amount || 0) / 100, desc: c.description ?? "(none)" });
}

console.log(`charges in the last 180 days: ${charges.length}\n`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(18)} ${String(v.n).padStart(3)} charges   EUR ${v.eur.toFixed(0)}`);

if (unreadable.length) {
  console.log(`\n${unreadable.length} charge(s) fell through to the fallback and are being counted as Smart Space:`);
  for (const u of unreadable) console.log(`   ${u.d}  EUR ${String(u.eur.toFixed(0)).padStart(5)}  ${String(u.desc).slice(0, 60)}`);
  console.log("\nIf any of those is a SmartCare Living sale, the split is wrong and");
  console.log("SCL_PRODUCT in src/lib/crm/stripe-finance.ts needs to learn its name.");
}
console.log("\nEvery charge was assigned to a business.");
