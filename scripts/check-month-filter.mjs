#!/usr/bin/env node
/**
 * Clicking a month on Finance must land on that month's orders.
 *
 * The orders feed needs a live key, so this drill-down cannot be tried on a
 * development machine: the first time anybody sees it work is in production,
 * in front of the person who stopped trusting the numbers. The dangerous
 * failure is not an error either. Reading "05/09/2026" as May gives a filter
 * that returns rows, just the wrong ones, in a month that looks plausible.
 *
 *   node scripts/check-month-filter.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(ROOT, "src/lib/crm/month.ts"), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const dir = mkdtempSync(join(tmpdir(), "month-"));
const file = join(dir, "month.mjs");
writeFileSync(file, js);
const { monthOf, monthLabel, isMonthKey } = await import(pathToFileURL(file).href);

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const fail = (m) => { bad++; console.error(`FAIL  ${m}`); };
const is = (got, want, m) => (got === want ? ok(m) : fail(`${m} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`));

/* The exact string the orders feed writes. */
is(monthOf("05/09/2026, 14:32"), "2026-09", "a day under 13 reads as day, not month");
is(monthOf("28/02/2026, 09:05"), "2026-02", "a day over 12 reads as day");
is(monthOf("01/12/2025, 00:00"), "2025-12", "December survives the year boundary");
is(monthOf("31/01/2026"), "2026-01", "the time is optional");

/* Everything that must not quietly become a month. */
is(monthOf(""), null, "an empty date is no month");
is(monthOf(undefined), null, "a missing date is no month");
is(monthOf("2026-09-05"), null, "an ISO date is not this format");
is(monthOf("5/9/2026, 14:32"), null, "an unpadded date is not this format");
is(monthOf("05/13/2026, 14:32"), null, "month 13 is rejected rather than rolled over");
is(monthOf("00/09/2026"), null, "day zero is rejected");

/* The query string reaches a filter, so it is validated before it gets there. */
is(isMonthKey("2026-09"), true, "a real month key is accepted");
is(isMonthKey("2026-13"), false, "month 13 is not a key");
is(isMonthKey("2026-00"), false, "month 00 is not a key");
is(isMonthKey("2026-9"), false, "an unpadded month is not a key");
is(isMonthKey("../../etc"), false, "a path is not a key");
is(isMonthKey(undefined), false, "nothing is not a key");

is(monthLabel("2026-09"), "September 2026", "the chip names the month in full");
is(monthLabel("2026-01"), "January 2026", "January is not December of the year before");

/* The join itself: Stripe's bucket key and a feed row must agree, or the bar
   links to a month with nothing in it. */
is(monthOf("14/08/2026, 11:02"), "2026-08", "a feed row matches Stripe's own bucket key");

rmSync(dir, { recursive: true, force: true });
if (bad) { console.error(`\n${bad} check(s) failed.`); process.exit(1); }
console.log("\nMonth drill-down holds.");
