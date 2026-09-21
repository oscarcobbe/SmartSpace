#!/usr/bin/env node
/**
 * Clicking a month on Finance must land on that month's rows — all of them.
 *
 * The orders feed cannot be reached from a development machine, so the first
 * time anybody sees this drill-down is in production, in front of the person
 * who stopped trusting the numbers. The dangerous failure is not an error: a
 * filter that reads one of the three date shapes still returns rows, prints a
 * confident count above them, and silently omits the rest.
 *
 * That is exactly what shipped. The first version read only "dd/mm/yyyy", so
 * every contact enquiry, consultation and installation vanished from the month
 * view while the banner said "18 rows". The cases below are the three shapes
 * the feed actually writes, taken from src/app/api/admin/leads/route.ts, not
 * from what looked likely.
 *
 *   node scripts/check-month-filter.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(tmpdir(), "month-"));
const load = async (rel, name) => {
  const js = ts.transpileModule(readFileSync(join(ROOT, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from\s+"\.\/booking-date"/, 'from "./booking-date.mjs"');
  const file = join(dir, name);
  writeFileSync(file, js);
  return import(pathToFileURL(file).href);
};
await load("src/lib/crm/booking-date.ts", "booking-date.mjs");
const { monthOf, monthLabel, isMonthKey } = await load("src/lib/crm/month.ts", "month.mjs");

let bad = 0;
const ok = (m) => console.log(`ok    ${m}`);
const is = (got, want, m) => got === want ? ok(m)
  : (bad++, console.error(`FAIL  ${m} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`));

/* A fixed "now", so the Calendly year inference is not a coin toss in CI. */
const NOW = new Date("2026-09-20T12:00:00Z");

/* 1. Stripe orders. route.ts:255, toLocaleString en-GB Europe/Dublin. */
is(monthOf("18/09/2026, 14:32", NOW), "2026-09", "a Stripe order places by day, not month");
is(monthOf("05/09/2026, 14:32", NOW), "2026-09", "a day under 13 is still a day");
is(monthOf("28/02/2026, 09:05", NOW), "2026-02", "a day over 12 proves the order");
is(monthOf("01/12/2025, 00:00", NOW), "2025-12", "December survives the year boundary");

/* 2. Sheet and database rows: contact enquiries and manual paid orders,
      route.ts:556 and :628, String(r.date) straight from storage. */
is(monthOf("2026-06-18", NOW), "2026-06", "an ISO enquiry date places");
is(monthOf("2026-01-31", NOW), "2026-01", "January ISO is not December before it");

/* 3. Calendly bookings. route.ts:418 formats with no year at all, and this is
      the shape that was being dropped in silence. */
is(monthOf("Thu, 17 Sep, 15:00", NOW), "2026-09", "a Calendly booking places into the nearest year");
is(monthOf("Mon, 02 Jan, 09:00", NOW), "2027-01", "a January booking read in September lands ahead, not eleven months back");

/* Nothing must become a month by accident. */
is(monthOf("", NOW), null, "an empty date is no month");
is(monthOf("-", NOW), null, "the feed's dash for no date is no month");
is(monthOf(undefined, NOW), null, "a missing date is no month");
is(monthOf("Complimentary", NOW), null, "a word where a date should be is no month");

/* The query string reaches a filter, so it is validated before it gets there. */
is(isMonthKey("2026-09"), true, "a real month key is accepted");
is(isMonthKey("2026-13"), false, "month 13 is not a key");
is(isMonthKey("2026-00"), false, "month 00 is not a key");
is(isMonthKey("2026-9"), false, "an unpadded month is not a key");
is(isMonthKey("../../etc/passwd"), false, "a path is not a key");
is(isMonthKey(undefined), false, "nothing is not a key");

is(monthLabel("2026-09"), "September 2026", "the banner names the month in full");
is(monthLabel("2026-01"), "January 2026", "January is not December of the year before");

/* The join itself: a Stripe bucket key and a feed row must agree, or a bar
   links to a month with nothing in it. */
is(monthOf("14/08/2026, 11:02", NOW), "2026-08", "a feed row matches Stripe's own bucket key");

rmSync(dir, { recursive: true, force: true });
if (bad) { console.error(`\n${bad} check(s) failed.`); process.exit(1); }
console.log("\nMonth drill-down holds, for all three date shapes the feed writes.");
