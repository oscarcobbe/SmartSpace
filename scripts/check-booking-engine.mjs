#!/usr/bin/env node
/**
 * The booking engine against a fake Google Calendar.
 *
 * Calendly used to guarantee three things nobody wrote down: a customer is
 * only offered a slot Nigel is free for, two customers can never hold the
 * same slot, and a cancelled slot can be booked again. src/lib/booking now
 * does all three on Nigel's Google Calendar, so each is pinned here, along
 * with the ways it could plausibly break:
 *
 *   - two bookings racing past the free/busy check at the same moment;
 *   - a slot booked, cancelled, then booked again (Google keeps the id);
 *   - Nigel dragging a booking to another time in his calendar, leaving its
 *     slot's id behind;
 *   - a calendar Google could not read counting as free;
 *   - the clock change at the end of October moving every slot an hour;
 *   - a moved booking breaking the links already emailed to the customer.
 *
 *   node scripts/check-booking-engine.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateKeyPairSync } from "node:crypto";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(ROOT, ".booking-engine-"));
const compile = (name) => {
  const src = readFileSync(join(ROOT, "src/lib/booking", `${name}.ts`), "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from "\.\/google-calendar"/g, 'from "./google-calendar.mjs"');
  writeFileSync(join(dir, `${name}.mjs`), js);
};

// ─── A fake Google: the token endpoint, freeBusy and events ─────────
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.GOOGLE_BOOKING_SA_KEY = Buffer.from(JSON.stringify({
  client_email: "bookings@test.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
})).toString("base64");
process.env.BOOKING_CALENDAR_OWNER = "nigel@smart-space.ie";
process.env.BOOKING_LINK_SECRET = "test-secret-for-links-0123456789";

const cal = new Map(); // id -> event
let etagN = 0;
let unreadable = false;
let freeBusyHook = null; // runs before freeBusy answers, to stage a race
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const stamp = (e) => ({ ...e, etag: `"${++etagN}"`, updated: new Date().toISOString() });

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const method = (init.method || "GET").toUpperCase();
  if (url.host === "oauth2.googleapis.com") {
    const assertion = new URLSearchParams(init.body.toString()).get("assertion");
    const claims = JSON.parse(Buffer.from(assertion.split(".")[1], "base64url").toString());
    if (claims.sub !== "nigel@smart-space.ie") return json(401, { error: "unauthorized_client" });
    return json(200, { access_token: "tok", expires_in: 3600 });
  }
  const body = init.body ? JSON.parse(init.body) : null;
  const path = url.pathname.replace("/calendar/v3", "");
  if (path === "/freeBusy") {
    if (freeBusyHook) await freeBusyHook();
    if (unreadable) return json(200, { calendars: { primary: { errors: [{ reason: "notFound" }] } } });
    const tMin = Date.parse(body.timeMin), tMax = Date.parse(body.timeMax);
    const busy = [...cal.values()]
      .filter((e) => e.status !== "cancelled" && e.transparency !== "transparent")
      .filter((e) => Date.parse(e.start.dateTime) < tMax && Date.parse(e.end.dateTime) > tMin)
      .map((e) => ({ start: e.start.dateTime, end: e.end.dateTime }));
    return json(200, { calendars: { primary: { busy } } });
  }
  const m = path.match(/^\/calendars\/primary\/events(?:\/([^/]+))?$/);
  if (!m) return json(404, { error: "no route" });
  const id = m[1] && decodeURIComponent(m[1]);
  if (method === "POST") {
    if (cal.has(body.id)) return json(409, { error: { message: "The requested identifier already exists." } });
    const e = stamp({ status: "confirmed", created: new Date().toISOString(), ...body });
    cal.set(body.id, e);
    return json(200, e);
  }
  if (method === "GET" && id) return cal.has(id) ? json(200, cal.get(id)) : json(404, {});
  if (method === "PUT" || method === "PATCH") {
    const cur = cal.get(id);
    if (!cur) return json(404, {});
    const ifMatch = init.headers?.["If-Match"];
    if (ifMatch && ifMatch !== cur.etag) return json(412, { error: "conditionNotMet" });
    const e = stamp(method === "PUT" ? { created: cur.created, ...body, id } : { ...cur, ...body });
    cal.set(id, e);
    return json(200, e);
  }
  if (method === "DELETE") {
    const cur = cal.get(id);
    if (!cur || cur.status === "cancelled") return json(410, {});
    cal.set(id, stamp({ ...cur, status: "cancelled" }));
    return new Response(null, { status: 204 });
  }
  if (method === "GET") {
    const prop = url.searchParams.get("privateExtendedProperty");
    const showDeleted = url.searchParams.get("showDeleted") === "true";
    const tMin = url.searchParams.get("timeMin"), tMax = url.searchParams.get("timeMax");
    let items = [...cal.values()];
    if (!showDeleted) items = items.filter((e) => e.status !== "cancelled");
    if (prop) {
      const [k, v] = prop.split("=");
      items = items.filter((e) => e.extendedProperties?.private?.[k] === v);
    }
    if (tMin) items = items.filter((e) => Date.parse(e.end.dateTime) > Date.parse(tMin));
    if (tMax) items = items.filter((e) => Date.parse(e.start.dateTime) < Date.parse(tMax));
    return json(200, { items });
  }
  return json(405, {});
};

let E;
try {
  compile("google-calendar");
  compile("engine");
  E = await import(pathToFileURL(join(dir, "engine.mjs")).href);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// ─── Cases ──────────────────────────────────────────────────────────
let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
};
const NOW = Date.parse("2026-10-01T09:00:00Z"); // a Thursday
const person = { name: "Mary Byrne", email: "mary@example.ie", phone: "087 123 4567", address: "1 Main St, Naas" };
const book = (date, start, extra = {}) => E.book({ site: "ss", kind: "installation", date, start, ...person, ...extra }, NOW);
const reset = () => { cal.clear(); unreadable = false; freeBusyHook = null; };

// Times
check("10:00 Dublin in summer is 09:00 UTC", new Date(E.dublinToEpoch("2026-10-05", "10:00")).toISOString() === "2026-10-05T09:00:00.000Z");
check("10:00 Dublin after the clock change (25 Oct) is 10:00 UTC", new Date(E.dublinToEpoch("2026-10-26", "10:00")).toISOString() === "2026-10-26T10:00:00.000Z");
check("a slot's event id is base32hex and carries the slot", E.slotEventId("2026-10-05", "12:30") === "ssb2026100512300" && /^[0-9a-v]{5,1024}$/.test(E.slotEventId("2026-10-05", "12:30")));

// Free slots
reset();
check("an empty weekday offers all three slots", JSON.stringify(await E.freeStarts("2026-10-05", NOW)) === '["10:00","12:30","15:00"]');
check("Saturday offers nothing", (await E.freeStarts("2026-10-03", NOW)).length === 0);
check("a day in the past offers nothing", (await E.freeStarts("2026-09-28", NOW)).length === 0);
cal.set("nigel-own", { id: "nigel-own", status: "confirmed", start: { dateTime: "2026-10-05T11:30:00Z" }, end: { dateTime: "2026-10-05T12:00:00Z" } });
check("Nigel's own event at 12:30–13:00 Dublin blocks only the 12:30 slot", JSON.stringify(await E.freeStarts("2026-10-05", NOW)) === '["10:00","15:00"]');
cal.set("free-time", { id: "free-time", status: "confirmed", transparency: "transparent", start: { dateTime: "2026-10-05T14:00:00Z" }, end: { dateTime: "2026-10-05T16:00:00Z" } });
check("an event marked free does not block", (await E.freeStarts("2026-10-05", NOW)).includes("15:00"));
unreadable = true;
let threw = false;
try { await E.freeStarts("2026-10-05", NOW); } catch { threw = true; }
check("a calendar Google cannot read throws instead of counting as free", threw);

// Booking
reset();
const r1 = await book("2026-10-05", "10:00", { product: "Ring Video Doorbell 4", orderId: "cs_test_1" });
check("a free slot books", r1.ok && r1.booking.id === "ssb2026100510000", JSON.stringify(r1));
const ev = cal.get("ssb2026100510000");
check("the event is 2 hours, from 10:00 Dublin", ev?.start.dateTime === "2026-10-05T09:00:00.000Z" && ev?.end.dateTime === "2026-10-05T11:00:00.000Z");
check("the event carries the customer and order", ev?.extendedProperties.private.email === "mary@example.ie" && ev?.extendedProperties.private.orderId === "cs_test_1" && ev?.extendedProperties.private.ssbooking === "1");
check("the event's title is the visit type and the customer", ev?.summary === "Smart Space Installation: Mary Byrne");
const r2 = await book("2026-10-05", "10:00");
check("the same slot cannot be booked twice", !r2.ok && r2.reason === "taken", JSON.stringify(r2));
const sclTry = await E.book({ site: "scl", kind: "consultation", date: "2026-10-05", start: "10:00", ...person }, NOW);
check("nor from the other site", !sclTry.ok && sclTry.reason === "taken");

// The race: both pass free/busy before either writes
reset();
let release;
const gate = new Promise((r) => (release = r));
let arrived = 0;
freeBusyHook = async () => { if (++arrived === 2) release(); await gate; };
const [ra, rb] = await Promise.all([book("2026-10-06", "15:00"), book("2026-10-06", "15:00", { email: "sean@example.ie", name: "Sean Kelly" })]);
freeBusyHook = null;
check("two bookings racing for one slot: exactly one wins", [ra, rb].filter((r) => r.ok).length === 1 && [ra, rb].some((r) => !r.ok && r.reason === "taken"), JSON.stringify([ra, rb]));
check("and the calendar holds one booking in that slot", (await E.bookingsBetween("2026-10-06T00:00:00Z", "2026-10-07T00:00:00Z")).length === 1);

// Cancel, then book again
reset();
const c1 = await book("2026-10-07", "12:30");
const cancelled = await E.cancel(c1.booking.ref);
check("a booking can be cancelled by its reference", cancelled?.id === c1.booking.id && cal.get(c1.booking.id).status === "cancelled");
check("a cancelled slot is offered again", (await E.freeStarts("2026-10-07", NOW)).includes("12:30"));
const c2 = await book("2026-10-07", "12:30", { name: "Sean Kelly", email: "sean@example.ie" });
check("and books again, reusing the slot's id", c2.ok && c2.booking.id === "ssb2026100712300" && c2.booking.email === "sean@example.ie", JSON.stringify(c2));
check("the old reference no longer finds a booking", (await E.bookingByRef(c1.booking.ref)) === null);
check("cancelling twice does nothing", (await E.cancel(c1.booking.ref)) === null);

// Nigel drags a booking elsewhere
reset();
const d1 = await book("2026-10-08", "10:00");
const moved = cal.get(d1.booking.id);
cal.set(moved.id, { ...moved, start: { dateTime: "2026-10-09T13:00:00Z" }, end: { dateTime: "2026-10-09T15:00:00Z" } });
check("after Nigel moves a booking away, its old slot is offered", (await E.freeStarts("2026-10-08", NOW)).includes("10:00"));
const d2 = await book("2026-10-08", "10:00", { name: "Sean Kelly", email: "sean@example.ie" });
check("and books under the next id", d2.ok && d2.booking.id === "ssb2026100810001", JSON.stringify(d2));
check("the moved booking is untouched", cal.get(moved.id).extendedProperties.private.email === "mary@example.ie" && cal.get(moved.id).status === "confirmed");

// Reschedule keeps the reference
reset();
const m1 = await book("2026-10-12", "10:00");
const url1 = E.manageUrl(m1.booking);
const m2 = await E.reschedule(m1.booking.ref, "2026-10-13", "15:00", NOW);
check("a booking moves to a free slot", m2.ok && m2.booking.start === "2026-10-13T14:00:00.000Z", JSON.stringify(m2));
check("the old slot is released", cal.get(m1.booking.id).status === "cancelled" && (await E.freeStarts("2026-10-12", NOW)).includes("10:00"));
check("the reference, and so the emailed link, still works", m2.ok && m2.booking.ref === m1.booking.ref && E.manageUrl(m2.booking) === url1);
check("the customer's details move with it", m2.ok && m2.booking.email === "mary@example.ie" && m2.booking.phone === "087 123 4567");
await book("2026-10-14", "10:00", { name: "Sean Kelly", email: "sean@example.ie" });
const m3 = await E.reschedule(m1.booking.ref, "2026-10-14", "10:00", NOW);
check("moving onto a taken slot is refused and leaves the booking where it was", !m3.ok && m3.reason === "taken" && (await E.bookingByRef(m1.booking.ref))?.start === "2026-10-13T14:00:00.000Z");

// Links
const ref = m1.booking.ref;
const token = new URL(url1).searchParams.get("t");
check("the link's token matches its booking", E.tokenMatches(ref, token));
check("and no other", !E.tokenMatches("abcdef123456", token) && !E.tokenMatches(ref, "0".repeat(32)) && !E.tokenMatches(ref, null));
check("SmartCare Living bookings link to smartcareliving.ie", E.manageUrl({ ref, site: "scl" }).startsWith("https://www.smartcareliving.ie/booking/"));

// Refusals
check("a time that is not a slot is refused", !(await book("2026-10-05", "11:00")).ok);
check("a booking without an email is refused", !(await E.book({ site: "ss", kind: "installation", date: "2026-10-15", start: "10:00", name: "X", email: "" }, NOW)).ok);
check("a slot under four hours away is refused", !(await E.book({ site: "ss", kind: "installation", date: "2026-10-01", start: "12:30", ...person }, NOW)).ok);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
