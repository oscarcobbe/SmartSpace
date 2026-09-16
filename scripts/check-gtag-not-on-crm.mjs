/**
 * Runs the inline tracking script exactly as the page ships it, once per path,
 * and counts what it configured.
 *
 * Reading the diff was not enough here. This script has silently killed
 * conversion measurement twice before, and the failure mode both times was
 * that it still looked right.
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

/**
 * Usage: extract the inline consent/config script from a rendered page, then
 *
 *   node scripts/check-gtag-not-on-crm.mjs <path-to-extracted.js>
 *
 * The extraction is deliberately not automated here, because the thing being
 * tested is the bytes the browser receives, and reading them out of a live
 * response is the only way to be sure that is what is being run.
 */
const code = readFileSync(process.argv[2], "utf8");

function run(pathname) {
  const calls = [];
  const sandbox = {
    location: { pathname },
    localStorage: { getItem: () => null },
    window: {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  /* gtag is defined by the script itself and pushes into dataLayer, so the
     record of what happened is the dataLayer, not a spy we installed. */
  for (const args of sandbox.dataLayer ?? []) calls.push(Array.from(args));
  return calls;
}

const site = run("/ring-installation");
const crm = run("/crm/contacts/abc");
const crmRoot = run("/crm");

const configs = (calls) => calls.filter((c) => c[0] === "config").map((c) => c[1]);
const consents = (calls) => calls.filter((c) => c[0] === "consent").length;

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => (cond ? pass++ : (fail++, console.log("FAIL:", name, extra)));

check("marketing page configures Google Ads", configs(site).some((id) => String(id).startsWith("AW-")), configs(site).join(","));
check("marketing page configures GA4", configs(site).some((id) => String(id).startsWith("G-")), configs(site).join(","));
check("marketing page sets a consent default", consents(site) >= 1, String(consents(site)));
check("marketing page calls gtag js", site.some((c) => c[0] === "js"));

check("crm page configures nothing", configs(crm).length === 0, configs(crm).join(","));
check("crm root configures nothing", configs(crmRoot).length === 0, configs(crmRoot).join(","));
check("crm page STILL sets the consent default", consents(crm) >= 1, String(consents(crm)));
check("crm page still calls gtag js", crm.some((c) => c[0] === "js"));

/* A path that merely begins with the letters must not be caught. */
const lookalike = run("/crmsomething");
check("/crmsomething is treated as the website", configs(lookalike).length > 0, configs(lookalike).join(","));

console.log(`\nmarketing configured: ${configs(site).join(", ") || "nothing"}`);
console.log(`crm configured:       ${configs(crm).join(", ") || "nothing"}`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
