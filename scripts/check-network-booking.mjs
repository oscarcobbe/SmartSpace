#!/usr/bin/env node
/**
 * A paid home network assessment is booked as the assessment, never as a Ring
 * installation, and the money path holds the logic that gets it there.
 *
 * Runs the real booking function (src/lib/calendly.ts, Calendly backend)
 * against a fake Calendly and checks which event type each kind books:
 * "assessment" books "SmartSpace Networks - Home Network Assessment" (so the
 * customer's Calendly email names it), an install still books the
 * installation, and with no assessment event type configured an assessment
 * still books (as an installation) rather than losing a paid visit. Then it
 * reads the checkout and the webhook for the steps between: no assessment is
 * charged without a time, the session says it is an assessment, and the
 * webhook passes that on.
 *
 *   node scripts/check-network-booking.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL = "https://api.calendly.com/event_types/install-check";
const ASSESS = "https://api.calendly.com/event_types/assess-check";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
};

/* Load calendly.ts fresh, with the given environment and a fake Calendly. */
async function load(env, tag) {
  delete process.env.BOOKING_BACKEND;
  Object.assign(process.env, { CALENDLY_PERSONAL_TOKEN: "check-token", CALENDLY_INSTALLATION_EVENT_TYPE_URI: INSTALL });
  delete process.env.CALENDLY_ASSESSMENT_EVENT_TYPE_URI;
  Object.assign(process.env, env);
  const dir = mkdtempSync(join(ROOT, `.network-booking-${tag}-`));
  try {
    const tx = (p) => ts.transpileModule(readFileSync(join(ROOT, p), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    writeFileSync(join(dir, "rules.mjs"), tx("src/lib/booking/rules.ts"));
    writeFileSync(join(dir, "stubs.mjs"), 'export const bookingBackend = () => "calendly"; export const book = async () => { throw new Error("not on Calendly"); }; export const freeStarts = async () => []; export const bookingConfirmedEmails = async () => "";');
    writeFileSync(
      join(dir, "calendly.mjs"),
      tx("src/lib/calendly.ts")
        .replace(/from "@\/lib\/booking\/rules"/g, 'from "./rules.mjs"')
        .replace(/from "@\/lib\/booking\/(backend|engine|notify)"/g, 'from "./stubs.mjs"'),
    );
    return await import(pathToFileURL(join(dir, "calendly.mjs")).href + `?${tag}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const booked = [];
globalThis.fetch = async (input, init) => {
  const u = new URL(typeof input === "string" ? input : input.url);
  if (u.pathname === "/event_type_available_times") {
    /* 10:00 Dublin on 20 Oct 2026 is 09:00 UTC. */
    return new Response(JSON.stringify({ collection: [{ status: "available", start_time: "2026-10-20T09:00:00Z" }] }), { status: 200 });
  }
  if (u.pathname === "/invitees") {
    booked.push(JSON.parse(init.body).event_type);
    return new Response(JSON.stringify({ resource: { uri: "https://api.calendly.com/scheduled_events/x/invitees/y" } }), { status: 201 });
  }
  throw new Error(`check-network-booking does not let ${u} be fetched`);
};
const visit = { date: "2026-10-20", timeSlot: "10:00-12:00", customerName: "Check Person", email: "check@example.ie", productTitle: "Home Network Assessment" };
const quietly = async (f) => { const w = console.warn, l = console.log; console.warn = console.log = () => {}; try { return await f(); } finally { console.warn = w; console.log = l; } };

const C = await load({ CALENDLY_ASSESSMENT_EVENT_TYPE_URI: ASSESS }, "configured");
booked.length = 0;
const a = await quietly(() => C.createBookingEvent({ ...visit, kind: "assessment" }));
check("an assessment books the assessment event type", a !== null && booked[0] === ASSESS, JSON.stringify(booked));
booked.length = 0;
const i = await quietly(() => C.createBookingEvent({ ...visit, productTitle: "Installation Only" }));
check("an installation still books the installation event type", i !== null && booked[0] === INSTALL, JSON.stringify(booked));
check("both kinds offer the install slots", (await quietly(() => C.getAvailableSlots("2026-10-20", "assessment"))).map((s) => s.value).join() === "10:00-12:00");

const U = await load({}, "unset");
booked.length = 0;
const f = await quietly(() => U.createBookingEvent({ ...visit, kind: "assessment" }));
check("with no assessment event type set, a paid assessment is still booked (as an installation)", f !== null && booked[0] === INSTALL, JSON.stringify(booked));

const src = (p) => readFileSync(join(ROOT, p), "utf8");
const checkout = src("src/app/api/checkout/route.ts");
check("checkout refuses an assessment with no time", /networkItem\.slug === "home-network-assessment"[\s\S]{0,200}if \(!bookedItem\)[\s\S]{0,120}status: 400/.test(checkout));
check("checkout marks the session as an assessment", /metadata\[booking_kind\]", "assessment"/.test(checkout));
check("checkout asks the evidence buyer for the speed they pay for", /"broadband-evidence"[\s\S]{0,200}custom_fields\[1\]\[key\]", "paid_speed"[\s\S]{0,400}custom_fields\[1\]\[optional\]", "false"/.test(checkout));
const hook = src("src/app/api/webhooks/stripe/route.ts");
check("the webhook books an assessment as one", /createBookingEvent\(\{[\s\S]{0,200}kind: session\.metadata\?\.booking_kind === "assessment" \? "assessment" : undefined/.test(hook));
check("the webhook sends a network buyer the network email, not the install one", /if \(params\.network\) \{[\s\S]{0,300}approval\("email:network-order"\)[\s\S]{0,1500}return;\s*\}/.test(hook));

console.log(failed ? `\n${failed} failed` : "\ncheck-network-booking: a paid assessment is booked as the assessment, with its time, and never charged without one");
process.exit(failed ? 1 : 0);
