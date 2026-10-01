#!/usr/bin/env node
/**
 * Every home network enquiry reaches Google Ads as "SS - SmartNet enquiry".
 *
 * The action (7810338147) sat in the account from its creation until 30
 * September 2026 with nothing firing it, and /api/wifi-check fired no
 * conversion at all, so every Wi-Fi check and assessment enquiry was
 * invisible to the campaign's bidding. This fails the build when:
 *   /api/wifi-check stops firing the server conversion with the action's
 *     label, or stops handing the page the id it used;
 *   the Wi-Fi enquiry form stops firing the same conversion with that id,
 *     so Google can count the lead once;
 *   the label is written anywhere but src/lib/lead-conversion.ts.
 *
 * The consent rules for both fires are check-server-conversion-consent's.
 *
 *   node scripts/check-wifi-conversion.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LABEL = "aFHQCOOaoYwdEJfU6PxC";
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
/* Code only: comments do not fire conversions. */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const fail = [];

const route = code(read("src/app/api/wifi-check/route.ts"));
const fire = /fireServerConversion\(\{[\s\S]*?\}\)/.exec(route)?.[0] ?? "";
if (!fire) fail.push("src/app/api/wifi-check/route.ts: no fireServerConversion call, so Google hears of no Wi-Fi enquiry the page's tag misses");
if (fire && !/gadsLabel:\s*GADS_WIFI_SEND_TO\b/.test(fire)) fail.push("src/app/api/wifi-check/route.ts: the server conversion is not sent with GADS_WIFI_SEND_TO's label");
if (fire && !/transactionId:\s*conversionId\b/.test(fire)) fail.push("src/app/api/wifi-check/route.ts: the server conversion does not use conversionId, so Google cannot count the page's and the server's copies once");
if (!/afterResponse\(\s*"server conversion"/.test(route)) fail.push("src/app/api/wifi-check/route.ts: the server conversion is not run after the answer (afterResponse)");
if (!/NextResponse\.json\(\{\s*ok:\s*true[^}]*\bconversionId\b[^}]*\}\s*\)\s*;\s*\}\s*$/.test(route)) {
  fail.push("src/app/api/wifi-check/route.ts: the success answer does not hand the page conversionId, so the page cannot fire its copy");
}

const form = code(read("src/components/wifi/WifiEnquiryForm.tsx"));
if (!/fireLeadConversion\([^)]*json\.conversionId[^)]*"wifi_enquiry"/.test(form)) {
  fail.push("src/components/wifi/WifiEnquiryForm.tsx: the form does not fire fireLeadConversion(..., json.conversionId, \"wifi_enquiry\", ...) after a success");
}
const helper = code(read("src/lib/lead-conversion.ts"));
/* NEXT_PUBLIC_GADS_SMARTNET_SEND_TO may override it, as the lead label's
   variable does; the fallback is the action's own label. */
if (!new RegExp(`GADS_WIFI_SEND_TO\\s*=\\s*(process\\.env\\.NEXT_PUBLIC_GADS_SMARTNET_SEND_TO\\?\\.trim\\(\\)\\s*\\|\\|\\s*)?"AW-\\d+/${LABEL}"`).test(helper)) fail.push(`src/lib/lead-conversion.ts: GADS_WIFI_SEND_TO is not the SmartNet enquiry label ${LABEL}`);
if (!/wifi_enquiry:\s*GADS_WIFI_SEND_TO/.test(helper)) fail.push("src/lib/lead-conversion.ts: a wifi_enquiry fire is not sent to GADS_WIFI_SEND_TO");
if (!/wifi_check:\s*GADS_WIFI_SEND_TO/.test(helper)) fail.push("src/lib/lead-conversion.ts: a wifi_check fire (an enquiry from a report) is not sent to GADS_WIFI_SEND_TO");

/* The label in one place. */
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
};
const holders = walk(join(ROOT, "src")).filter((p) => readFileSync(p, "utf8").includes(LABEL)).map((p) => relative(ROOT, p));
if (holders.join() !== "src/lib/lead-conversion.ts") fail.push(`the label ${LABEL} is written in ${holders.join(", ") || "no file"}; it belongs only in src/lib/lead-conversion.ts`);

if (fail.length) {
  console.error(`\ncheck-wifi-conversion: ${fail.length} ${fail.length === 1 ? "failure" : "failures"}\n`);
  for (const f of fail) console.error(`  FAIL  ${f}`);
  process.exit(1);
}
console.log("check-wifi-conversion: /api/wifi-check and the Wi-Fi enquiry form both fire \"SS - SmartNet enquiry\" with one id per lead; the label is in one file");
