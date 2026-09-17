#!/usr/bin/env node
/**
 * The booking-date parser, against every shape a booking actually arrives in.
 *
 * Bookings reach the CRM from three places and each writes the date its own
 * way: Stripe checkout metadata (ISO), the manual Paid Order sheet
 * (dd/mm/yyyy) and Calendly (toLocaleString, so "Thu, 17 Sep, 15:00" with no
 * year). The week view had its own parser that handled the first two and
 * returned null for the third, so every Calendly consultation and
 * installation was filtered out of "This week" and the page looked calm
 * because the rows were gone, not because the diary was empty.
 *
 * Run by `npm run build`, so the shape that was being dropped cannot be
 * dropped again quietly.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, renameSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const out = mkdtempSync(join(tmpdir(), "booking-"));
execFileSync("npx", ["tsc", "src/lib/crm/booking-date.ts", "--outDir", out, "--module", "es2022",
  "--target", "es2022", "--moduleResolution", "bundler", "--skipLibCheck"], { stdio: "inherit" });
for (const f of readdirSync(out)) if (f.endsWith(".js")) renameSync(join(out, f), join(out, f.replace(/\.js$/, ".mjs")));
const { bookingIso, hasBooking } = await import(pathToFileURL(join(out, "booking-date.mjs")).href);

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => (cond ? pass++ : (fail++, console.log("FAIL:", name, extra)));
const eq = (name, got, want) => check(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const AT = new Date("2026-09-17T12:00:00Z");

/* Stripe checkout metadata. */
eq("ISO with a time and offset", bookingIso("2026-09-17T15:00:00+01:00", AT), "2026-09-17");
eq("bare ISO", bookingIso("2026-12-02", AT), "2026-12-02");

/* The manual Paid Order sheet. 03/09 is 3 September in Ireland and 9 March in
   the United States, and the sheet is Irish: reading it the other way moves a
   job six months. */
eq("dd/mm/yyyy is day first", bookingIso("03/09/2026", AT), "2026-09-03");

/* Calendly. These are the rows the week view was silently dropping. */
eq("Calendly, full", bookingIso("Thu, 17 Sep, 15:00", AT), "2026-09-17");
eq("Calendly, with an end time", bookingIso("Thu 17 Sep 15:00 – 17:00", AT), "2026-09-17");
eq("day and month alone", bookingIso("17 Sep", AT), "2026-09-17");

/* The feed's window straddles New Year, so a missing year cannot default to
   the current one: on 28 December, "02 Jan" is next week, not eleven months
   ago. */
eq("across New Year, forward", bookingIso("Sat, 02 Jan, 09:00", new Date("2026-12-28T12:00:00Z")), "2027-01-02");
eq("across New Year, back", bookingIso("Mon, 28 Dec, 09:00", new Date("2027-01-02T12:00:00Z")), "2026-12-28");

/* Not dates. A dash is what an unbooked order carries, and reading it as a
   date would put every unbooked job in the diary. */
for (const v of ["-", "–", "", "   ", "Complimentary", undefined, null]) {
  eq(`not a date: ${JSON.stringify(v)}`, bookingIso(v, AT), null);
  check(`hasBooking false for ${JSON.stringify(v)}`, hasBooking(v) === false);
}

/* Rejected rather than guessed. */
eq("impossible day", bookingIso("32 Sep", AT), null);
eq("unknown month", bookingIso("17 Zzz", AT), null);

console.log(`\nbooking dates: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
