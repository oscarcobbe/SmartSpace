/**
 * Exercises the statement parser against several shapes of Revolut export.
 *
 * Written because the parser has never seen a real one. That is exactly why it
 * needs tests: the risk is not that it crashes, it is that it reads the wrong
 * column and files a statement of plausible nonsense. Every case here asserts
 * on the values that came out, not on whether it threw.
 *
 * Run: npm run check:revolut
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const out = mkdtempSync(join(tmpdir(), "revolut-"));
execFileSync("npx", ["tsc", "src/lib/crm/revolut.ts", "--outDir", out, "--module", "es2022",
  "--target", "es2022", "--moduleResolution", "bundler", "--skipLibCheck"], { stdio: "inherit" });
for (const f of readdirSync(out)) if (f.endsWith(".js")) renameSync(join(out, f), join(out, f.replace(/\.js$/, ".mjs")));
const { parseRevolutCsv, ParseError } = await import(pathToFileURL(join(out, "revolut.mjs")).href);

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => (cond ? pass++ : (fail++, console.log("FAIL:", name, extra)));

/* Shape one: the columns Revolut Business has used in recent exports. */
const modern = [
  "Date started (UTC),Date completed (UTC),ID,State,Type,Description,Payer,Amount,Fee,Balance,Payment currency",
  '2026-09-01 09:14:22,2026-09-01 09:14:25,tx_001,COMPLETED,TOPUP,"Payment from AOIFE BYRNE",Aoife Byrne,139.00,0.00,2139.00,EUR',
  '2026-09-02 11:00:00,2026-09-02 11:00:01,tx_002,COMPLETED,CARD_PAYMENT,"GOOGLE ADS",,-45.50,0.20,2093.30,EUR',
  '2026-09-03 08:00:00,2026-09-03 08:00:00,tx_003,COMPLETED,FEE,"Monthly plan fee",,-25.00,0.00,2068.30,EUR',
].join("\n");

let r = parseRevolutCsv(modern);
check("modern: three lines", r.lines.length === 3, String(r.lines.length));
check("modern: completed date preferred over started", r.mapping.Date === "Date completed (UTC)", r.mapping.Date);
check("modern: money in is positive cents", r.lines[0].amount_cents === 13900, String(r.lines[0].amount_cents));
check("modern: money out is negative cents", r.lines[1].amount_cents === -4550, String(r.lines[1].amount_cents));
check("modern: fee read separately", r.lines[1].fee_cents === 20, String(r.lines[1].fee_cents));
check("modern: balance carried", r.lines[2].balance_cents === 206830, String(r.lines[2].balance_cents));
check("modern: id used as the key", r.lines[0].external_id === "tx_001", r.lines[0].external_id);
check("modern: date is iso", r.lines[0].happened_on === "2026-09-01", r.lines[0].happened_on);
check("modern: quoted description kept whole", r.lines[0].description === "Payment from AOIFE BYRNE", r.lines[0].description);
check("modern: counterparty read", r.lines[0].counterparty === "Aoife Byrne", String(r.lines[0].counterparty));
check("modern: type kept verbatim", r.lines[1].kind === "CARD_PAYMENT", String(r.lines[1].kind));
check("modern: nothing unexpectedly skipped", r.skipped.length === 0, JSON.stringify(r.skipped));

/* Shape two: an older export, day-first dates, comma thousands, no id column. */
const older = [
  "Date,Description,Amount,Balance,Currency",
  '01/09/2026,"Transfer from client","1,250.00","3,318.30",EUR',
  '15/09/2026,"Supplier payment","-1,000.00","2,318.30",EUR',
].join("\n");

r = parseRevolutCsv(older);
check("older: two lines", r.lines.length === 2, String(r.lines.length));
check("older: day first, not month first", r.lines[0].happened_on === "2026-09-01", r.lines[0].happened_on);
check("older: fifteenth is the fifteenth", r.lines[1].happened_on === "2026-09-15", r.lines[1].happened_on);
check("older: thousands separator handled", r.lines[0].amount_cents === 125000, String(r.lines[0].amount_cents));
check("older: negative with separator", r.lines[1].amount_cents === -100000, String(r.lines[1].amount_cents));
check("older: id synthesised when absent", r.lines[0].external_id.includes("2026-09-01"), r.lines[0].external_id);
check("older: synthesised ids differ", r.lines[0].external_id !== r.lines[1].external_id);

/* The same file twice must produce the same ids, or re-importing duplicates. */
const again = parseRevolutCsv(older);
check("ids are stable across runs", again.lines[0].external_id === r.lines[0].external_id);

/* Shape three: not a statement at all. */
try {
  parseRevolutCsv("Name,Email\nAoife,a@b.ie");
  check("a non-statement is rejected", false, "it was accepted");
} catch (e) {
  check("a non-statement is rejected", e instanceof ParseError, String(e));
  check("the refusal names the columns it found", String(e.message).includes("Name, Email"), String(e.message));
}

/* Bad rows are skipped and named, not silently dropped, and not fatal. */
const messy = [
  "Date,Description,Amount",
  "2026-09-01,Good line,10.00",
  "not a date,Bad date,10.00",
  "2026-09-02,Bad amount,abc",
  "2026-09-03,Another good one,-5.00",
].join("\n");
r = parseRevolutCsv(messy);
check("messy: the good lines survive", r.lines.length === 2, String(r.lines.length));
check("messy: the bad ones are reported", r.skipped.length === 2, JSON.stringify(r.skipped));
check("messy: the report names the row number", r.skipped[0].row === 3, JSON.stringify(r.skipped[0]));

/* Identical lines in one file collapse rather than double the balance. */
const dupes = ["Date,Description,Amount", "2026-09-01,Same,10.00", "2026-09-01,Same,10.00"].join("\n");
r = parseRevolutCsv(dupes);
check("duplicate rows collapse to one", r.lines.length === 1, String(r.lines.length));

/* A BOM from Excel must not swallow the first header. */
r = parseRevolutCsv("﻿" + older);
check("a byte order mark is stripped", r.lines.length === 2, String(r.lines.length));

/* Brackets for negatives, which some exports use. */
r = parseRevolutCsv(["Date,Description,Amount", "2026-09-01,Bracketed,(42.50)"].join("\n"));
check("bracketed negatives are negative", r.lines[0].amount_cents === -4250, String(r.lines[0].amount_cents));

/* Unmapped columns are reported so nothing is silently ignored. */
r = parseRevolutCsv(["Date,Amount,Product,Beneficiary IBAN", "2026-09-01,10.00,Current,IE12..."].join("\n"));
check("unmapped columns are named", r.unmapped.includes("Product") && r.unmapped.includes("Beneficiary IBAN"), JSON.stringify(r.unmapped));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
