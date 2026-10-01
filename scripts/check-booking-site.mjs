#!/usr/bin/env node
/**
 * Smart Space's booking messages go to Smart Space's visits only.
 *
 * Both sites' visits share Nigel's calendar: on Calendly (event types named
 * "SmartCare Living - ..." beside "Smart Space ..."), and on Google Calendar
 * (each booking's site in its private properties). The day-before reminder and
 * the review request are Smart Space's, in Smart Space's name, so a
 * SmartCare Living customer must never get one. Found 1 Oct 2026: both jobs
 * read every visit in the calendar.
 *
 * This runs the real reader (src/lib/booking/upcoming.ts) against a fake
 * Calendly and a fake Google holding one visit of each kind from each site,
 * and checks the label each comes back with, then that both jobs keep only
 * Smart Space's.
 *
 *   node scripts/check-booking-site.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const k of ["BOOKING_BACKEND", "GOOGLE_BOOKING_SA_KEY", "GOOGLE_SOURCE_ACCESS_TOKEN"]) delete process.env[k];
Object.assign(process.env, {
  CALENDLY_PERSONAL_TOKEN: "check-token",
  GOOGLE_BOOKING_SA_EMAIL: "bookings@check.iam.gserviceaccount.com",
  GOOGLE_SOURCE_ACCESS_TOKEN: "check-signer",
  BOOKING_CALENDAR_OWNER: "nigel@smart-space.ie",
  BOOKING_LINK_SECRET: "check-link-secret-0123456789",
});

const dir = mkdtempSync(join(ROOT, ".booking-site-"));
const files = {
  upcoming: "src/lib/booking/upcoming.ts",
  engine: "src/lib/booking/engine.ts",
  "google-calendar": "src/lib/booking/google-calendar.ts",
  "calendly-events": "src/lib/calendly-events.ts",
};
let U;
try {
  for (const [name, path] of Object.entries(files)) {
    const js = ts.transpileModule(readFileSync(join(ROOT, path), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
      .replace(/from "@\/lib\/calendly-events"/g, 'from "./calendly-events.mjs"')
      .replace(/from "\.\/engine"/g, 'from "./engine.mjs"')
      .replace(/from "\.\/google-calendar"/g, 'from "./google-calendar.mjs"');
    writeFileSync(join(dir, `${name}.mjs`), js);
  }
  const json = (b) => new Response(JSON.stringify(b), { status: 200, headers: { "content-type": "application/json" } });
  const at = (h) => `2026-10-14T${h}:00:00Z`;
  const calendly = [
    { uri: "https://api.calendly.com/scheduled_events/ss-visit", name: "SmartSpace Consultation", start_time: at("09"), end_time: at("11") },
    { uri: "https://api.calendly.com/scheduled_events/ss-install", name: "Smart Space Installation", start_time: at("11"), end_time: at("13") },
    { uri: "https://api.calendly.com/scheduled_events/scl-visit", name: "SmartCare Living - Complimentary Consultation", start_time: at("09"), end_time: at("11") },
    { uri: "https://api.calendly.com/scheduled_events/scl-install", name: "SmartCare Living - Installation", start_time: at("14"), end_time: at("16") },
    { uri: "https://api.calendly.com/scheduled_events/scl-old", name: "SmartCare living - Home Consultation", start_time: at("14"), end_time: at("16") },
  ];
  const ev = (id, site, kind, h) => ({ id, status: "confirmed", start: { dateTime: at(h) }, end: { dateTime: at(String(Number(h) + 2).padStart(2, "0")) },
    extendedProperties: { private: { ssbooking: "1", ref: `${id}ref`, site, kind, name: "Check", email: `${id}@example.ie` } } });
  const google = [ev("g1", "ss", "installation", "09"), ev("g2", "scl", "installation", "11"), ev("g3", "scl", "consultation", "14")];
  globalThis.fetch = async (input) => {
    const u = new URL(typeof input === "string" ? input : input.url);
    if (u.host === "api.calendly.com" && u.pathname === "/users/me") return json({ resource: { uri: "https://api.calendly.com/users/nigel" } });
    if (u.host === "api.calendly.com" && u.pathname === "/scheduled_events") return json({ collection: calendly });
    if (u.host === "api.calendly.com" && u.pathname.endsWith("/invitees")) return json({ collection: [{ name: "Check", email: "c@example.ie", questions_and_answers: [] }] });
    if (u.host === "iamcredentials.googleapis.com") return json({ signedJwt: "a.b.c" });
    if (u.host === "oauth2.googleapis.com") return json({ access_token: "t", expires_in: 3600 });
    if (u.host === "www.googleapis.com") return json({ items: google });
    throw new Error(`check-booking-site does not let ${u} be fetched`);
  };
  U = await import(pathToFileURL(join(dir, "upcoming.mjs")).href);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
};
const { visits, problems } = await U.visitsBetween("2026-10-14T00:00:00Z", "2026-10-14T23:59:59Z");
const site = (key) => visits.find((v) => v.key === key || v.key.includes(key))?.site;
check("both calendars were read", problems.length === 0 && visits.length === 8, JSON.stringify({ problems, n: visits.length }));
check("Calendly's Smart Space visit and install are Smart Space's", site("ss-visit") === "ss" && site("ss-install") === "ss");
check("Calendly's SmartCare Living events are SmartCare Living's, whatever the capitals", ["scl-visit", "scl-install", "scl-old"].every((k) => site(k) === "scl"));
check("Google bookings keep the site they were made on", site("g1ref") === "ss" && site("g2ref") === "scl" && site("g3ref") === "scl");

const src = (p) => readFileSync(join(ROOT, p), "utf8");
check("the day-before reminder keeps only Smart Space's visits", /visitsBetween\([^)]*\)[\s\S]{0,400}\.filter\(\(v\) => v\.site === "ss"\)/.test(src("src/app/api/cron/booking-reminders/route.ts")));
check("the review request asks only Smart Space's installations", /visits\.filter\(\(x\) => !x\.consultation && x\.site === "ss"\)/.test(src("src/app/api/cron/review-requests/route.ts")));
const ssOnly = visits.filter((v) => v.site === "ss");
check("which, on this day, is 3 of the 8 visits", ssOnly.length === 3, JSON.stringify(ssOnly.map((v) => v.key)));

console.log(failed ? `\n${failed} failed` : "\ncheck-booking-site: Smart Space's reminders and review requests reach Smart Space's visits only");
process.exit(failed ? 1 : 0);
