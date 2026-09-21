#!/usr/bin/env node
/**
 * A tagged payment link must actually be tagged, and a bad one must not
 * pretend to be.
 *
 * Stripe drops a client_reference_id it does not like without complaining, so
 * the dangerous outcome here is not an error, it is a link that sends
 * perfectly and attributes nothing. Nobody would spot that for months, which
 * is exactly how the payment-link gap went unnoticed since May.
 *
 *   node scripts/check-payment-link-ref.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src/lib/crm/payment-link-ref.ts"), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dir = mkdtempSync(join(tmpdir(), "plr-"));
const file = join(dir, "ref.mjs");
writeFileSync(file, js);
const { isUsableGclid, mintToken, withReference, TOKEN_PATTERN } = await import(pathToFileURL(file).href);

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const fail = (m) => { console.error(`FAIL  ${m}`); bad++; };

try {
  /* Stripe's published rule: letters, digits, dashes, underscores, max 200. */
  const t = mintToken();
  TOKEN_PATTERN.test(t) && t.length <= 200
    ? ok(`token is shaped the way Stripe accepts (${t.length} chars)`)
    : fail(`token would be dropped by Stripe: ${t}`);

  new Set(Array.from({ length: 500 }, mintToken)).size === 500
    ? ok("500 tokens, no collisions")
    : fail("tokens collided");

  const real = "Cj0KCQjw_6CnBhDxARIsADTOhT8example-Value_123";
  isUsableGclid(real) ? ok("a real click id is accepted") : fail("a real click id was refused");

  const refuse = [
    ["", "empty"],
    ["   ", "whitespace only"],
    ["has a space", "a pasted value with a space"],
    ["https://example.com/?gclid=abc", "a whole URL pasted by mistake"],
    ["a".repeat(181), "longer than the limit"],
    [null, "null"],
    [undefined, "undefined"],
    [42, "a number"],
  ];
  const wrong = refuse.filter(([v]) => isUsableGclid(v));
  wrong.length === 0
    ? ok(`${refuse.length} bad values all refused`)
    : fail(`accepted values Stripe would drop: ${wrong.map(([, w]) => w).join(", ")}`);

  const base = new URL("https://buy.stripe.com/test_abc123");
  const tagged = withReference(base, t);
  tagged.searchParams.get("client_reference_id") === t
    ? ok("the reference is on the emailed URL")
    : fail("the reference did not reach the URL");

  /* readCart matches the payment link by its canonical URL with the query
     stripped. If tagging changed that, every tagged email would lose its
     itemised list of what the customer is paying for. */
  tagged.toString().split("?")[0] === base.toString().split("?")[0]
    ? ok("the canonical URL is unchanged, so the line items still resolve")
    : fail("tagging changed the canonical URL and would break itemisation");

  withReference(base, null).toString() === base.toString()
    ? ok("nothing to attach leaves the link exactly as it was")
    : fail("an untagged link was modified anyway");

  withReference(base, "not a valid token!").searchParams.has("client_reference_id")
    ? fail("a malformed token was attached, Stripe would silently drop it")
    : ok("a malformed token is refused rather than attached");

  const already = new URL("https://buy.stripe.com/test_abc123?prefilled_email=a%40b.com");
  const both = withReference(already, t);
  both.searchParams.get("prefilled_email") === "a@b.com" && both.searchParams.get("client_reference_id") === t
    ? ok("an existing parameter survives alongside the reference")
    : fail("tagging clobbered a parameter that was already on the link");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (bad) { console.error(`\n${bad} failing check(s).`); process.exit(1); }
console.log("\nPayment link tagging behaves on all nine checks.");
