/**
 * Who the domain rule lets in, and who it does not.
 *
 * The demo stub answers every crm_users lookup with a row, so signing in
 * through the local UI proves nothing about this: every address takes the
 * named-user path. This compiles the real module and drives allowedSites with
 * the database returning nothing, which is the only way the domain branch is
 * reached.
 *
 * Run: npm run check:crm-domain
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, renameSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const out = mkdtempSync(join(tmpdir(), "crmdomain-"));
execFileSync("npx", ["tsc", "src/lib/crm/auth.ts", "src/lib/crm/db.ts", "--outDir", out,
  "--module", "es2022", "--target", "es2022", "--moduleResolution", "bundler", "--skipLibCheck"],
  { stdio: "inherit" });
for (const f of readdirSync(out)) if (f.endsWith(".js")) renameSync(join(out, f), join(out, f.replace(/\.js$/, ".mjs")));

/* The database answers "no such user" for everything, so only the domain rule
   can let anybody through. Replacing crm() in the compiled db module is what
   makes that possible without a server. */
const dbPath = join(out, "db.mjs");
writeFileSync(dbPath, readFileSync(dbPath, "utf8").replace(
  /export async function crm\([\s\S]*?\n}/,
  "export async function crm() { return []; }",
));
writeFileSync(join(out, "auth.mjs"), readFileSync(join(out, "auth.mjs"), "utf8").replace('from "./db"', 'from "./db.mjs"'));

process.env.CRM_SESSION_SECRET = "test";
const { allowedSites } = await import(pathToFileURL(join(out, "auth.mjs")).href);

let pass = 0, fail = 0;
const check = async (name, email, expected) => {
  const got = await allowedSites(email);
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  ok ? pass++ : (fail++, console.log(`FAIL: ${name}\n   ${email} gave ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`));
};

/* CRM_SITE is unset, so THIS_SITE is smart-space. */
await check("anyone on the company domain", "deirdre@smart-space.ie", ["smart-space"]);
await check("mixed case and spaces", "  Deirdre@Smart-Space.IE  ", ["smart-space"]);
await check("a plus address still counts", "deirdre+crm@smart-space.ie", ["smart-space"]);
await check("the owner", "nigel@smart-space.ie", ["smart-space"]);

await check("a stranger", "someone@gmail.com", null);
await check("no domain at all", "deirdre", null);
await check("empty", "", null);
/* The classic near miss: a domain that merely ends with ours. */
await check("a lookalike domain", "attacker@notsmart-space.ie", null);
await check("ours as a subdomain of theirs", "attacker@smart-space.ie.evil.com", null);
await check("ours as a prefix", "attacker@smart-space.ie.co", null);
/* The other business's domain must not open this deployment. */
await check("the other business", "someone@smartcareliving.ie", null);
/* FourWinds is not a standing right, it is a named row. */
await check("fourwinds is not a domain grant", "oscar@fourwindsdigital.com", null);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
