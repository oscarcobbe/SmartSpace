#!/usr/bin/env node
/**
 * The rules that decide whether a paying customer came from an ad.
 *
 * Every figure on the marketing chart's solid and grey bars rests on these.
 * Each case is a real row shape from the enquiry log, and each one is a way
 * the verdict has already been wrong, or would be wrong with a rule loosened:
 *
 *   a gbraid landing with no gclid is still an ad click (iPhone traffic);
 *   a bare landing page during the consent gap proves nothing;
 *   the same bare landing page before the gap is a direct first visit;
 *   after the gap, until return visits carried Google's click cookie, it is
 *   unknown, because it may be a return visit whose ad click the gap lost;
 *   an outside referrer is good evidence even inside the gap;
 *   two different people with one name are never joined;
 *   a ChatGPT ad (?oppref=) is ChatGPT's, never Google's, and an ordinary
 *   ChatGPT referral (utm_source=chatgpt.com, no oppref) stays organic;
 *   a ChatGPT sale changes none of Google's figures on the return chart.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const ts = require_("typescript");
const src = readFileSync(new URL("../src/lib/crm/how-they-came.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const Module = require_("node:module");
const m = new Module("how-they-came");
m._compile(js, "how-they-came.js");
const { readVisit, readTrail, EnquiryIndex, dublinStamp } = m.exports;

let failed = 0;
const expect = (got, want, why) => {
  if (got === want) return;
  failed++;
  console.error(`FAIL  ${why}\n      got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};

const V = (at, extra = {}) => ({ at, source: "smart-space.ie", ...extra });

expect(readVisit(V("2026-07-01 10:00", { landingPage: "/services?gad_source=1&gad_campaignid=23734106100&gbraid=0AAA" })),
  "ad", "a gbraid landing with no gclid field is an ad click");
expect(readVisit(V("2026-07-01 10:00", { gclid: "Cj0KCQ", landingPage: "/services/eufy?_gl=1*abc" })),
  "ad", "a gclid on the row is an ad click whatever the landing page says");
expect(readVisit(V("2026-07-01 10:00", { landingPage: "/x", utmSource: "google", utmMedium: "cpc" })),
  "ad", "a paid UTM medium is an ad");
expect(readVisit(V("2026-09-07 14:41", { landingPage: "/?ved=2ahUKEw", referrer: "https://www.google.com/" })),
  "not-ad", "organic Google inside the gap is still organic: an internal page would carry smart-space.ie as referrer");
expect(readVisit(V("2026-08-10 10:00", { landingPage: "/installation-only?utm_source=chatgpt.com", utmSource: "chatgpt.com" })),
  "not-ad", "ChatGPT is not an ad");
expect(readVisit(V("2026-05-12 14:02", { landingPage: "/services/free-consultation", referrer: "android-app://com.google.android.gm/" })),
  "not-ad", "arriving from the Gmail app is not an ad");
expect(readVisit(V("2026-08-02 11:00", { landingPage: "/" })),
  "not-ad", "a direct first visit before the gap: an ad click in the 90 days before would have been kept");
expect(readVisit(V("2026-09-11 14:39", { landingPage: "/services/camera" })),
  "unknown", "a bare landing page inside the consent gap may be the second page of an ad visit");
expect(readVisit(V("2026-09-21 23:59", { landingPage: "/" })),
  "unknown", "the day the fix went out is still inside the gap");
expect(readVisit(V("2026-09-25 11:40", { landingPage: "/services/eufy" })),
  "unknown", "after the fix, a bare landing may be a return visit whose ad click the gap lost (25 September 2026: Google credited it to an ad)");
expect(readVisit(V("2026-10-01 23:59", { landingPage: "/" })),
  "unknown", "until the site read Google's click cookie, a bare landing still proves nothing");
expect(readVisit(V("2026-10-02 09:00", { landingPage: "/" })),
  "not-ad", "once return visits carry Google's click, a bare landing is a direct visit again");
expect(readVisit(V("2026-07-03 10:00", { landingPage: "" })),
  "unknown", "no landing page at all is unknown, never not-an-ad");
expect(readVisit(V("2026-07-03 10:00", { landingPage: "/services", referrer: "https://smart-space.ie/services" })),
  "not-ad", "an internal referrer outside the gap is still a recorded first-touch record");
expect(readVisit({ at: "2026-07-03 10:00", source: "business-card:installer" }),
  "not-ad", "a business card scan is not an ad");

expect(readTrail([V("2026-06-27 10:00", { landingPage: "/ring-installation?gbraid=0AAA" }), V("2026-07-03 10:00")]),
  "ad", "one ad click on the trail makes the customer an ad customer");
expect(readTrail([V("2026-09-15 18:30"), V("2026-09-07 14:41", { landingPage: "/?ved=x", referrer: "https://www.google.com/" })]),
  "not-ad", "a readable organic visit beats a blank one");
expect(readTrail([]), "unknown", "no trail is unknown");

const rows = [
  { at: "2026-06-27 10:00", type: "Free Consultation", name: "Sara Brown", email: "sara@example.ie", phone: "353871111111", landingPage: "/ring-installation?gbraid=1" },
  { at: "2026-06-01 10:00", type: "Contact Enquiry", name: "Michael Ryan", email: "mryan1@example.ie", phone: "", landingPage: "/" },
  { at: "2026-06-02 10:00", type: "Contact Enquiry", name: "Michael Ryan", email: "mryan2@example.ie", phone: "", landingPage: "/?gbraid=1" },
  { at: "2026-07-20 13:23", type: "Contact Enquiry", name: "Alan Dempsey", email: "alan_dempsey@hotmail.com", phone: "", landingPage: "/services?gad_source=1" },
  { at: "2026-06-03 10:00", type: "Contact Enquiry", name: "Info Desk", email: "info@firm-one.ie", phone: "", landingPage: "/?gbraid=1" },
  { at: "2026-08-01 10:00", type: "Free Consultation", name: "Late Row", email: "late@example.ie", phone: "", landingPage: "/?gbraid=1" },
];
const idx = new EnquiryIndex(rows);
expect(idx.find({ emails: [], phones: ["087 111 1111"], names: [] }, "2026-07-10 00:00").length,
  1, "a phone number matches whatever its spacing and prefix");
expect(idx.find({ emails: ["SARA@example.ie "], phones: [], names: [] }, "2026-07-10 00:00").length,
  1, "an email matches whatever its case and whitespace");
expect(idx.find({ emails: [], phones: [], names: ["Sara Brown"] }, "2026-07-10 00:00").length,
  1, "a name held by one person in the log matches");
expect(idx.find({ emails: [], phones: [], names: ["Michael Ryan"] }, "2026-07-10 00:00").length,
  0, "a name held by two different people matches nobody");
expect(idx.find({ emails: ["alan_dempsey@icloud.com"], phones: [], names: [] }, "2026-07-31 00:00").length,
  1, "a long personal username at another provider is the same person");
expect(idx.find({ emails: ["info@firm-two.ie"], phones: [], names: [] }, "2026-07-31 00:00").length,
  0, "a shared mailbox name at another company is somebody else");
expect(idx.find({ emails: ["late@example.ie"], phones: [], names: [] }, "2026-07-10 00:00").length,
  0, "an enquiry made after the payment says nothing about how the payer came");

expect(dublinStamp(Date.UTC(2026, 8, 22, 11, 2) / 1000), "2026-09-22 12:02", "Irish summer time is UTC+1");
expect(dublinStamp(Date.UTC(2026, 11, 1, 11, 2) / 1000), "2026-12-01 11:02", "Irish winter time is UTC");

/* ── ChatGPT ads: their own channel, never Google's ─────────────── */

expect(readVisit(V("2026-10-02 10:00", { landingPage: "/ring-installation?oppref=op_abc123&utm_source=chatgpt", utmSource: "chatgpt" })),
  "chatgpt-ad", "a landing URL with ?oppref= is a ChatGPT ad, whatever utm_source says");
expect(readVisit(V("2026-10-02 10:00", { landingPage: "/x?oppref=op_abc&utm_source=chatgpt&utm_medium=cpc", utmSource: "chatgpt", utmMedium: "cpc" })),
  "chatgpt-ad", "a ChatGPT ad tagged cpc is ChatGPT's, not taken for a Google ad by its medium");
expect(readVisit(V("2026-10-02 10:00", { landingPage: "/", oppref: "op_from_stripe" })),
  "chatgpt-ad", "a click kept on the Stripe session (oai_oppref) is a ChatGPT ad");
expect(readVisit(V("2026-10-02 10:00", { landingPage: "/?utm_source=chatgpt.com", utmSource: "chatgpt.com", referrer: "https://chatgpt.com/" })),
  "not-ad", "a ChatGPT citation, utm_source=chatgpt.com with no oppref, is organic");
expect(readVisit(V("2026-10-02 10:00", { landingPage: "/?oppref=", referrer: "https://chatgpt.com/" })),
  "not-ad", "an empty ?oppref= is not a click");
expect(readVisit(V("2026-10-02 10:00", { landingPage: "/services?gclid=Cj0&oppref=op_both" })),
  "ad", "a visit carrying both click ids stays Google's, as it was before ChatGPT ads were read");
expect(readTrail([V("2026-10-01 09:00", { landingPage: "/?oppref=op_1" }), V("2026-10-03 10:00", { landingPage: "/", referrer: "https://www.google.com/" })]),
  "chatgpt-ad", "a ChatGPT ad on the trail makes the customer ChatGPT's");
expect(readTrail([V("2026-10-01 09:00", { landingPage: "/?oppref=op_1" }), V("2026-10-03 10:00", { landingPage: "/?gbraid=0AAA" })]),
  "ad", "a customer both ads reached stays Google's");

/* The return chart's arithmetic, roas-months.ts, on payments made up here. */
{
  const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const dir = mkdtempSync(join(tmpdir(), "roas-months-"));
  const esm = (rel) => ts.transpileModule(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from\s+"\.\/how-they-came"/g, 'from "./how-they-came.mjs"');
  try {
    writeFileSync(join(dir, "how-they-came.mjs"), esm("src/lib/crm/how-they-came.ts"));
    writeFileSync(join(dir, "roas-months.mjs"), esm("src/lib/crm/roas-months.ts"));
    writeFileSync(join(dir, "labels.mjs"), esm("src/lib/crm/labels.ts"));
    const { cameOf, roasMonths } = await import(pathToFileURL(join(dir, "roas-months.mjs")).href);
    const { foundUsLabel } = await import(pathToFileURL(join(dir, "labels.mjs")).href);
    const t = Date.UTC(2026, 9, 2, 10) / 1000;

    expect(JSON.stringify(cameOf({ created: t, metadata: { oai_oppref: "op_1" } }, [])),
      JSON.stringify({ came: "chatgpt-ad", via: "click" }), "a checkout with oai_oppref is a ChatGPT ad, on the payment");
    expect(JSON.stringify(cameOf({ created: t, metadata: { gclid: "Cj0", oai_oppref: "op_1" } }, [])),
      JSON.stringify({ came: "ad", via: "click" }), "a checkout with both click ids is Google's");
    expect(JSON.stringify(cameOf({ created: t, metadata: { landing_page: "/ring-installation?oppref=op_2" } }, [])),
      JSON.stringify({ came: "chatgpt-ad", via: "enquiry" }), "a checkout whose recorded landing page has ?oppref= is a ChatGPT ad");
    expect(JSON.stringify(cameOf({ created: t, payment_link: "plink_1", metadata: {} }, [V("2026-09-30 10:00", { landingPage: "/?oppref=op_3" })])),
      JSON.stringify({ came: "chatgpt-ad", via: "enquiry" }), "a payment link traced through a ChatGPT ad enquiry is ChatGPT's");
    expect(cameOf({ created: t, metadata: { utm_source: "chatgpt.com", landing_page: "/?utm_source=chatgpt.com", referrer: "https://chatgpt.com/" } }, []).came,
      "not-ad", "a checkout from a ChatGPT citation stays organic");

    /* Google's figures with a ChatGPT sale in October, against the same sale
       read the way it was before ChatGPT ads had a name (not an ad). They must
       be the same to the cent; only where the money is shown moves. */
    const P = (month, amount, person, came, via = null) => ({ month, amount, person, came, via });
    const base = [
      P("2026-08", 400, "a", "ad", "click"), P("2026-08", 300, "b", "not-ad"), P("2026-09", 250, "c", "unknown"),
      P("2026-09", 500, "d", "ad", "enquiry"), P("2026-10", 600, "e", "unknown"), P("2026-10", 200, "f", "not-ad"),
    ];
    const spend = new Map([["2026-08", 150], ["2026-09", 180], ["2026-10", 90]]);
    const label = (k) => k;
    const google = (ms) => JSON.stringify(ms.map((m) => [m.key, m.spend, m.back, m.backViaEnquiry, m.estimated, m.share, m.unseen, m.taken, m.sales, m.tiedSales]));
    const withChatGpt = roasMonths([...base, P("2026-10", 900, "g", "chatgpt-ad", "click")], spend, "2026-10", label);
    const asBefore = roasMonths([...base, P("2026-10", 900, "g", "not-ad")], spend, "2026-10", label);
    const asGoogle = roasMonths([...base, P("2026-10", 900, "g", "ad", "click")], spend, "2026-10", label);
    expect(google(withChatGpt), google(asBefore), "a ChatGPT sale leaves Google's spend, back, estimate, share and sales exactly as they were");
    expect(google(withChatGpt) === google(asGoogle), false, "the comparison can tell: the same sale counted as Google's does move Google's figures");
    const oct = withChatGpt.find((m) => m.key === "2026-10");
    const octBefore = asBefore.find((m) => m.key === "2026-10");
    expect(JSON.stringify([oct.chatgptBack, oct.chatgptSales, oct.notFromAds, oct.back]), JSON.stringify([900, 1, 200, 0]),
      "the ChatGPT sale is ChatGPT's back, not Google's, and not counted as found some other way");
    expect(octBefore.chatgptBack, 0, "read as not an ad, nothing is ChatGPT's");
    const roas = (ms) => ms.reduce((t, m) => t + m.back + m.estimated, 0) / ms.reduce((t, m) => t + m.spend, 0);
    expect(roas(withChatGpt), roas(asBefore), "Google's return per euro is the same with the ChatGPT sale in it");

    /* The customer's page. */
    expect(foundUsLabel({ custom: { oppref: "op_lead" } }), "A ChatGPT ad (the click was recorded)", "a CRM lead with custom.oppref and no answer found us through a ChatGPT ad");
    expect(foundUsLabel({ gclid: "Cj0", custom: { oppref: "op_lead" } }), "A Google ad (the click was recorded)", "a lead with both clicks reads as Google's, as the trail does");
    expect(foundUsLabel({ custom: { found_us: "ai_assistant", oppref: "op_lead" } }), "ChatGPT or another AI assistant", "what somebody chose still wins");
    expect(foundUsLabel({ custom: { utm_source: "chatgpt.com" } }), "Did not say", "nothing without the click");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (failed) {
  console.error(`\ncheck-how-they-came: ${failed} rule${failed === 1 ? "" : "s"} broken`);
  process.exit(1);
}
console.log("check-how-they-came: every rule holds");
