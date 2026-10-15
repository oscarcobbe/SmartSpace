#!/usr/bin/env node
/**
 * The mark buttons in enquiry emails (src/lib/crm/mark-link.ts).
 *
 *   node scripts/check-mark-link.mjs
 *
 * SmartCare Living signs the same tokens in its own repository
 * (api/_lib/mark-link.js), and this site checks them. The VECTOR below is
 * checked in both repositories with the same secret and reference, so a change
 * to the format on one side fails that side's build instead of every
 * SmartCare Living button quietly opening "This link is not valid".
 *
 * Also checked: a token with one character changed is refused, a token for
 * one site does not open the other, no secret means no buttons (the email
 * goes as it did), and every route that emails Nigel about an enquiry stores
 * the reference its buttons name.
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const VECTOR = { secret: "vector-secret", site: "smartcareliving", ref: "abcdefghijklmnop", token: "scl.abcdefghijklmnop.ia4lPT2p4WJn4MbYJhHKwy" };

const require_ = createRequire(import.meta.url);
const ts = require_("typescript");
const dir = mkdtempSync(join(tmpdir(), "mark-link-"));
const js = ts.transpileModule(readFileSync(new URL("../src/lib/crm/mark-link.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
writeFileSync(join(dir, "mark-link.mjs"), js);
const m = await import(pathToFileURL(join(dir, "mark-link.mjs")).href);
rmSync(dir, { recursive: true, force: true });

let failed = 0;
const expect = (ok, why) => {
  if (ok) console.log(`ok    ${why}`);
  else { failed++; console.log(`FAIL  ${why}`); }
};

const tok = m.markToken(VECTOR.site, VECTOR.ref, VECTOR.secret);
expect(tok === VECTOR.token, `the shared vector signs as ${VECTOR.token} (got ${tok})`);
expect(JSON.stringify(m.readMarkToken(VECTOR.token, VECTOR.secret)) === JSON.stringify({ site: VECTOR.site, ref: VECTOR.ref }), "the vector reads back to its site and reference");

const flipped = VECTOR.token.slice(0, -1) + (VECTOR.token.endsWith("A") ? "B" : "A");
expect(m.readMarkToken(flipped, VECTOR.secret) === null, "a token with its last character changed is refused");
expect(m.readMarkToken(VECTOR.token.replace(/^scl\./, "ss."), VECTOR.secret) === null, "a SmartCare Living token relabelled as Smart Space is refused");
expect(m.readMarkToken(VECTOR.token, "another-secret") === null, "a token signed under another secret is refused");
expect(m.readMarkToken("", VECTOR.secret) === null && m.readMarkToken("ss.x.y", VECTOR.secret) === null, "malformed tokens are refused");
expect(m.markToken("smart-space", "short", VECTOR.secret) === null, "a reference too short to be ours is not signed");

const ref = m.newMarkRef();
expect(/^[A-Za-z0-9_-]{16}$/.test(ref) && ref !== m.newMarkRef(), "new references are 16 URL-safe characters and differ");

delete process.env.CRM_HMAC_SECRET;
expect(m.markButtonsHtml("smart-space", ref) === "" && m.markButtonsText("smart-space", ref) === "", "with no secret the email carries no buttons");

process.env.CRM_HMAC_SECRET = VECTOR.secret;
process.env.CRM_INBOUND_URL = "https://www.smart-space.ie/api/crm/inbound";
const html = m.markButtonsHtml("smart-space", ref);
const links = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);
expect(links.length === 3, "the email carries three buttons");
expect(links.every((l) => l.startsWith("https://www.smart-space.ie/crm/mark/ss.")), "each opens the CRM's mark page on the site the CRM lives on");
expect(["green", "amber", "red"].every((c) => links.some((l) => l.endsWith(`?mark=${c}`))), "one button for each of green, amber and red");
expect(links.every((l) => m.readMarkToken(new URL(l).pathname.split("/").pop()) !== null), "every button's token reads back");

/* Every route that emails Nigel about an enquiry stores the reference. */
for (const route of ["contact", "booking", "checkout/free", "wifi-check"]) {
  const src = readFileSync(new URL(`../src/app/api/${route}/route.ts`, import.meta.url), "utf8");
  expect(/mark_ref:\s*markRef/.test(src) && /markButtonsHtml\("smart-space", markRef\)/.test(src),
    `/api/${route} puts the buttons in Nigel's email and stores the reference on the enquiry`);
}

if (failed) {
  console.log(`\n${failed} failed.`);
  process.exit(1);
}
console.log("\nThe mark links hold.");
