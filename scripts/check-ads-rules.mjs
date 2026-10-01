#!/usr/bin/env node
/**
 * The rules under Marketing's figures, on rows made up for the purpose.
 *
 *   Whose sale a payment is (src/lib/crm/payment-names.ts). Read by the
 *   charge's description, EUR 2,746 of SmartCare Living's installs sat in
 *   Smart Space's return in 2026; a checkout's line items name it.
 *
 *   Which rows are enquiries, and which came from an ad
 *   (src/lib/crm/enquiry-count.ts). Google's count printed as "Enquiries"
 *   was 48 for Smart Space, a third of it payments and calls; SmartCare
 *   Living's 2 was 7 in its own sheet.
 *
 *   Spend and enquiries merged per period (src/lib/crm/ads-merge.ts).
 *
 *   node scripts/check-ads-rules.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require_ = createRequire(import.meta.url);
const ts = require_("typescript");
const dir = mkdtempSync(join(tmpdir(), "ads-rules-"));
const load = async (names) => {
  for (const n of names) {
    const js = ts.transpileModule(readFileSync(new URL(`../src/lib/crm/${n}.ts`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText.replace(/from\s+"\.\/([\w-]+)"/g, 'from "./$1.mjs"');
    writeFileSync(join(dir, `${n}.mjs`), js);
  }
  return Promise.all(names.map((n) => import(pathToFileURL(join(dir, `${n}.mjs`)).href)));
};

let failed = 0;
const expect = (got, want, why) => {
  if (JSON.stringify(got) === JSON.stringify(want)) return;
  failed++;
  console.error(`FAIL  ${why}\n      got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};

try {
  const [names, count, merge] = await load(["payment-names", "how-they-came", "enquiry-count", "ads-merge"])
    .then(([a, , c, d]) => [a, c, d]);

  /* ── Whose sale ── */
  const { nameEach, businessOf } = names;
  const P = (id, amount, extra = {}) => ({ id, intent: `pi_${id}`, amount, created: 1_780_000_000, description: null, ...extra });
  const named = nameEach(
    [P("a", 194700), P("b", 11900, { intent: "pi_b" }), P("c", 11900, { intent: "pi_c" }), P("d", 5000, { description: "Subscription update" }), P("e", 9900, { description: "Ring doorbell fitted" })],
    {
      byIntent: new Map([["pi_a", "Initial payment of €1,947 for the supply and installation of a 7 zone SmartGuardian system"]]),
      invoices: [
        { id: "in_1", cents: 11900, at: 1_780_000_000, text: "SmartGuardian monthly", reason: "subscription_create", paidBy: new Set(["pi_b"]) },
        { id: "in_2", cents: 11900, at: 1_780_000_000, text: "SmartGuardian monthly", reason: "subscription_cycle", paidBy: new Set(["pi_c"]) },
      ],
    },
  );
  expect(businessOf(named.get("a").name), "smartcareliving", "a checkout whose line items name SmartGuardian is SmartCare Living's, whatever its empty description says");
  expect([businessOf(named.get("b").name), named.get("b").renewal], ["smartcareliving", false], "a subscription's first payment is a sale");
  expect([businessOf(named.get("c").name), named.get("c").renewal], ["smartcareliving", true], "a subscription's monthly renewal is not a new sale");
  expect([named.get("d").via, businessOf(named.get("d").name)], ["unnamed", null], "Stripe's own \"Subscription update\" names nobody, so it is in neither business");
  expect(businessOf(named.get("e").name), "smart-space", "anything named that is not SmartGuardian is Smart Space's");

  /* ── Which rows are enquiries ── */
  const { countEnquiries, notAnEnquiry } = count;
  const R = (at, extra = {}) => ({ at, type: "Contact Enquiry", name: "Aoife Byrne", email: "aoife@gmail.com", phone: "0871234501", source: "smart-space.ie", landingPage: "/", ...extra });
  expect(notAnEnquiry(R("2026-09-01 10:00", { source: "phone_click", email: "", name: "" }), "smart-space"), "a tap on the phone number", "a tap on the phone number is not an enquiry");
  expect(notAnEnquiry(R("2026-09-01 10:00", { type: "Paid Order", orderId: "typed by hand" }), "smart-space"), "a paid order typed in by hand", "a paid order with no checkout behind it is not counted");
  expect(notAnEnquiry(R("2026-09-01 10:00", { type: "Paid Order", orderId: "cs_live_1", product: "SmartGuardian system" }), "smart-space"), "the other business's checkout", "SmartCare Living's checkout is not Smart Space's enquiry");
  expect(notAnEnquiry(R("2026-09-01 10:00", { status: "Spam" }), "smart-space"), "marked spam", "an enquiry Nigel marked Spam is left out");
  expect(notAnEnquiry(R("2026-09-01 10:00", { email: "oscar@fourwindsdigital.com" }), "smart-space"), "the team's own test", "the team's own address is a test");
  expect(notAnEnquiry(R("2026-09-01 10:00", { type: "QR Scan" }), "smart-space"), "a QR Scan row", "a QR scan is not an enquiry");
  expect(notAnEnquiry(R("2026-09-01 10:00", { type: "quiz", source: "quiz" }), "smartcareliving"), "", "every SmartCare Living form row is an enquiry");

  const counted = countEnquiries([
    R("2026-09-01 10:00", { landingPage: "/?gclid=Cj0abc" }),
    R("2026-09-01 13:30", { type: "Free Consultation" }),
    R("2026-09-02 09:00"),
    R("2026-09-03 09:00", { type: "Paid Order", orderId: "cs_live_1", email: "b@x.ie", phone: "", name: "B" }),
    R("2026-09-20 09:00", { type: "Paid Order", orderId: "cs_live_2", email: "b@x.ie", phone: "", name: "B" }),
    R("2026-09-21 09:00", { email: "c@x.ie", phone: "", name: "C", landingPage: "/x?oppref=op_1" }),
    R("2026-09-22 09:00", { email: "d@x.ie", phone: "", name: "D", gbraid: "0AAA" }),
  ], "smart-space");
  expect(counted.length, 5, "one person on one day is one enquiry, and a second payment within ninety days is not a new one");
  expect(counted.map((e) => e.came), ["ad", "not-ad", "not-ad", "chatgpt-ad", "ad"],
    "a gclid on the landing page is a Google ad, ?oppref= is ChatGPT's, a gbraid in the notes is a Google ad");
  expect(counted[0].gclid, "Cj0abc", "the enquiry carries its click for the keyword table");
  expect(counted[4].gclid, null, "an iPhone click has no gclid, so its keyword is not guessed");

  /* ── Spend and enquiries per period ── */
  const { withOurEnquiries } = merge;
  const B = (key, cost, conversions, value) => ({ key, label: key, cost, clicks: 10, impressions: 100, conversions, value, cpa: null, roas: null, deltaCost: null, deltaConversions: null, deltaValue: null });
  const out = withOurEnquiries(
    [B("2026-08", 600, 9, 1000), B("2026-09", 600, 13, 40)],
    new Map([["2026-09", B("2026-09", 100, 2, 0)]]),
    new Map([["2026-08", { googleWeb: 4, calls: 3, chatgpt: 0, all: 20 }], ["2026-09", { googleWeb: 4, calls: 4, chatgpt: 1, all: 27 }]]),
  );
  expect(out.map((b) => [b.cost, b.conversions, b.cpa]), [[600, 7, 600 / 7], [700, 9, 700 / 9]],
    "spend is every channel's, enquiries are ours from every channel, and cost per enquiry divides the two");
  expect(out.map((b) => b.roas), [1000 / 600, 40 / 600], "Google's return stays Google's value over Google's spend");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failed) {
  console.error(`\ncheck-ads-rules: ${failed} rule${failed === 1 ? "" : "s"} broken`);
  process.exit(1);
}
console.log("check-ads-rules: every rule holds");
