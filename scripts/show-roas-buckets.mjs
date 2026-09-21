/**
 * Print the buckets the ROAS chart draws, so a shape can be argued about
 * against numbers rather than against a screenshot.
 *
 *   node scripts/show-roas-buckets.mjs [smart-space|smartcareliving]
 */
process.env.TZ = "Europe/Dublin";
const site = process.argv[2] || "smart-space";
const { fetchRoas } = await import("../src/lib/crm/roas.ts");
const r = await fetchRoas(site, 400);
if (r.ok === false) { console.error("refused:", r.reason); process.exit(1); }
console.log(`site ${site}  lastAttributed ${r.lastAttributed}  revenueKnown ${r.revenueKnown}`);
for (const b of r.month) {
  const ad = b.spend - b.spendBlind;
  console.log(
    `  ${String(b.label).padEnd(10)} spend ${b.spend.toFixed(0).padStart(6)}` +
    ` attributable ${ad.toFixed(0).padStart(6)}  adRev ${b.adRevenue.toFixed(0).padStart(7)}` +
    `  allRev ${b.allRevenue.toFixed(0).padStart(7)}  google ${b.googleValue.toFixed(0).padStart(7)}` +
    `  ratio ${ad > 0 ? (b.adRevenue / ad).toFixed(2) : "n/a"}  ${b.start}..${b.end}${b.partial ? " partial" : ""}`);
}
