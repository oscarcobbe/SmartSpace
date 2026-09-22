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
 *   an outside referrer is good evidence even inside the gap;
 *   two different people with one name are never joined.
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
expect(readVisit(V("2026-09-22 09:00", { landingPage: "/" })),
  "not-ad", "after the fix a direct first visit is readable again");
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

if (failed) {
  console.error(`\ncheck-how-they-came: ${failed} rule${failed === 1 ? "" : "s"} broken`);
  process.exit(1);
}
console.log("check-how-they-came: every rule holds");
