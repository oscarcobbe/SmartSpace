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
 *   - a moved booking breaking the links already emailed to the customer;
 *   - Google failing: outages, timeouts, rate limits, an expired token, and
 *     the worst one, a booking written but its answer lost on the way back;
 *   - a crowd: many customers at the same slot at the same instant.
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
process.env.BOOKING_RETRY_BASE_MS = "5"; // the real backoff is 0.3 s, then 0.9 s

const cal = new Map(); // id -> event
let etagN = 0;
let unreadable = false;
let freeBusyHook = null; // runs before freeBusy answers, to stage a race
const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const stamp = (e) => ({ ...e, etag: `"${++etagN}"`, updated: new Date().toISOString() });

/*
 * Faults, queued per request: the first fault whose test matches is used up.
 *   "503" "429" "ratelimit" "401"  answer that, change nothing
 *   "timeout"                      never answer
 *   "503-after" "timeout-after"    do the work, then lose the answer
 */
let faults = [];
const calls = { token: 0, freeBusy: 0, insert: 0, get: 0, put: 0, delete: 0, list: 0 };
const fault = (test, kind) => faults.push({ test, kind });
const isInsert = (m, p) => m === "POST" && p.endsWith("/events");
const isFreeBusy = (m, p) => p.endsWith("/freeBusy");
const isDelete = (m) => m === "DELETE";
const isPut = (m) => m === "PUT";
const isToken = (m, p, host) => host === "oauth2.googleapis.com";
const timeoutError = () => Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const method = (init.method || "GET").toUpperCase();
  const path = url.pathname.replace("/calendar/v3", "");
  const i = faults.findIndex((f) => f.test(method, path, url.host));
  const f = i >= 0 ? faults.splice(i, 1)[0].kind : null;
  if (f === "503" || f === "429" || f === "401") return json(Number(f), { error: { message: `fault ${f}` } });
  if (f === "ratelimit") return json(403, { error: { errors: [{ reason: "rateLimitExceeded" }], message: "Rate Limit Exceeded" } });
  if (f === "timeout") throw timeoutError();
  const res = await google(url, method, init);
  if (f === "503-after") return json(503, { error: { message: "fault 503 after the write" } });
  if (f === "timeout-after") throw timeoutError();
  return res;
};

async function google(url, method, init) {
  if (url.host === "oauth2.googleapis.com") {
    calls.token++;
    const assertion = new URLSearchParams(init.body.toString()).get("assertion");
    const claims = JSON.parse(Buffer.from(assertion.split(".")[1], "base64url").toString());
    if (claims.sub !== "nigel@smart-space.ie") return json(401, { error: "unauthorized_client" });
    return json(200, { access_token: "tok", expires_in: 3600 });
  }
  const body = init.body ? JSON.parse(init.body) : null;
  const path = url.pathname.replace("/calendar/v3", "");
  if (path === "/freeBusy") {
    calls.freeBusy++;
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
    calls.insert++;
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
    calls.delete++;
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
}

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
const reset = () => { cal.clear(); unreadable = false; freeBusyHook = null; faults = []; };
const live = () => [...cal.values()].filter((e) => e.status !== "cancelled" && e.extendedProperties?.private?.ssbooking === "1");
const locks = () => [...cal.values()].filter((e) => e.status !== "cancelled" && e.extendedProperties?.private?.sslock === "1");

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


// ─── When Google misbehaves ─────────────────────────────────────────
reset();
fault(isFreeBusy, "503"); fault(isFreeBusy, "timeout");
check("free/busy survives a 503 and a timeout (third try)", JSON.stringify(await E.freeStarts("2026-10-05", NOW)) === '["10:00","12:30","15:00"]');
reset();
fault(isFreeBusy, "503"); fault(isFreeBusy, "503"); fault(isFreeBusy, "503");
threw = false;
try { await E.freeStarts("2026-10-05", NOW); } catch { threw = true; }
check("three failures in a row: free/busy throws, never answers 'all free'", threw);
reset();
fault(isFreeBusy, "ratelimit");
check("Google's rate-limit 403 is waited out", (await E.freeStarts("2026-10-05", NOW)).length === 3);

reset();
fault(isInsert, "503-after");
const lost1 = await book("2026-10-19", "10:00");
check("a booking written but answered 503: reported booked, once", lost1.ok && live().length === 1, JSON.stringify(lost1));
reset();
fault(isInsert, "timeout-after");
const lost2 = await book("2026-10-19", "12:30");
check("a booking written but its answer timed out: reported booked, once", lost2.ok && live().length === 1 && lost2.booking.id === "ssb2026101912300", JSON.stringify(lost2));
reset();
fault(isInsert, "timeout-after"); fault(isInsert, "timeout-after");
const lost3 = await book("2026-10-19", "15:00");
check("the same twice over: still one booking, reported booked", lost3.ok && live().length === 1, JSON.stringify(lost3));
reset();
fault(isInsert, "503"); fault(isInsert, "503"); fault(isInsert, "503");
fault((m, p) => m === "GET" && /\/events\/ssb/.test(p), "503"); fault((m, p) => m === "GET" && /\/events\/ssb/.test(p), "503"); fault((m, p) => m === "GET" && /\/events\/ssb/.test(p), "503");
const down = await book("2026-10-20", "10:00");
check("Google down for the whole attempt: refused as an error, nothing written", !down.ok && down.reason === "error" && live().length === 0, JSON.stringify(down));
check("and the slot is still offered once Google is back", (await E.freeStarts("2026-10-20", NOW)).includes("10:00"));

reset();
const rv = await book("2026-10-21", "10:00");
await E.cancel(rv.booking.ref);
fault(isPut, "timeout-after");
const rv2 = await book("2026-10-21", "10:00", { name: "Sean Kelly", email: "sean@example.ie" });
check("taking back a cancelled slot whose answer was lost: booked, once", rv2.ok && live().length === 1 && live()[0].extendedProperties.private.email === "sean@example.ie", JSON.stringify(rv2));

reset();
fault((m, p, h) => isToken(m, p, h), "503");
const tk = await E.freeStarts("2026-10-05", NOW);
check("the token endpoint failing once is retried", tk.length === 3);
reset();
fault(isFreeBusy, "401");
const t401 = calls.token;
check("a token Google stops honouring is replaced and the call repeated", (await E.freeStarts("2026-10-05", NOW)).length === 3 && calls.token === t401 + 1);

reset();
const mv1 = await book("2026-10-22", "10:00");
fault(isDelete, "503"); fault(isDelete, "503"); fault(isDelete, "503");
const mv2 = await E.reschedule(mv1.booking.ref, "2026-10-22", "15:00", NOW);
check("a move whose old slot will not delete: the move stands, the leftover is named", mv2.ok && mv2.leftover === mv1.booking.id && live().length === 2, JSON.stringify(mv2));
check("the link then shows the new time, not the old", (await E.bookingByRef(mv1.booking.ref))?.start === "2026-10-22T14:00:00.000Z");
await E.cancel(mv1.booking.ref);
check("and cancelling it removes both", live().length === 0);
reset();
const mv3 = await book("2026-10-22", "10:00");
fault(isDelete, "timeout-after");
const mv4 = await E.reschedule(mv3.booking.ref, "2026-10-22", "12:30", NOW);
check("a move whose delete answer was lost: one booking, at the new time", mv4.ok && !mv4.leftover && live().length === 1 && live()[0].start.dateTime === "2026-10-22T11:30:00.000Z", JSON.stringify(mv4));

// ─── A crowd ────────────────────────────────────────────────────────
reset();
const crowd = await Promise.all(Array.from({ length: 25 }, (_, i) => book("2026-10-26", "12:30", { name: `Person ${i}`, email: `p${i}@example.ie` })));
check("25 customers at one slot at the same instant: exactly one booked", crowd.filter((r) => r.ok).length === 1 && crowd.filter((r) => !r.ok).every((r) => r.reason === "taken") && live().length === 1, JSON.stringify(crowd.filter((r) => !r.ok || true).map((r) => r.ok || r.reason)));
reset();
const days = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];
const spread = await Promise.all(days.flatMap((d) => ["10:00", "12:30", "15:00"].map((t) => book(d, t, { email: `${d}-${t}@example.ie`.replace(":", "") }))));
check("15 different slots booked at once: all 15 booked, none crossed", spread.every((r) => r.ok) && live().length === 15 && new Set(live().map((e) => e.id)).size === 15);
check("and the week then shows nothing free", (await Promise.all(days.map((d) => E.freeStarts(d, NOW)))).every((f) => f.length === 0));
reset();
const churn = [];
for (let i = 0; i < 20; i++) {
  const b = await book("2026-11-02", "10:00", { email: `churn${i}@example.ie` });
  churn.push(b.ok && b.booking.id === "ssb2026110210000");
  await E.cancel(b.booking.ref);
}
check("booked and cancelled 20 times over: the slot's id reused each time, nothing left", churn.every(Boolean) && live().length === 0);
reset();
const flaky = [];
for (let i = 0; i < 30; i++) { if (i % 3 === 0) fault(isInsert, "503-after"); if (i % 4 === 0) fault(isFreeBusy, "503"); if (i % 5 === 0) fault(isInsert, "timeout-after"); }
const flakyRuns = await Promise.all(days.flatMap((d) => ["10:00", "12:30", "15:00"].map((t) => Promise.all([book(d, t, { email: "a@example.ie" }), book(d, t, { email: "b@example.ie" })]))));
const perSlot = flakyRuns.map((pair) => pair.filter((r) => r.ok).length);
check("pairs racing for 15 slots while Google drops answers: never two in a slot", perSlot.every((n) => n <= 1) && live().length === perSlot.reduce((a, n) => a + n, 0) && new Set(live().map((e) => e.start.dateTime)).size === live().length, JSON.stringify(perSlot));


// ─── One change at a time per booking ───────────────────────────────
reset();
const tw = await book("2026-11-03", "10:00");
const both = await Promise.all([E.reschedule(tw.booking.ref, "2026-11-03", "12:30", NOW), E.reschedule(tw.booking.ref, "2026-11-04", "15:00", NOW)]);
check("the same booking moved from two tabs at once: one booking afterwards, where the last move put it",
  both.every((r) => r.ok) && live().length === 1 && live()[0].extendedProperties.private.ref === tw.booking.ref, JSON.stringify(both.map((r) => r.ok ? r.booking.start : r)));
check("and no lock is left behind", locks().length === 0);
reset();
const five = await book("2026-11-05", "10:00");
const moves = await Promise.all(["10:00", "12:30", "15:00"].flatMap((t) => ["2026-11-09", "2026-11-10"].map((d) => E.reschedule(five.booking.ref, d, t, NOW))));
check("six moves of one booking at once: still exactly one booking", live().length === 1 && moves.filter((r) => r.ok).length >= 1 && locks().length === 0, JSON.stringify(moves.map((r) => r.ok || r.reason)));
check("and its link shows where it actually is", (await E.bookingByRef(five.booking.ref))?.id === live()[0].id);
reset();
const cm = await book("2026-11-11", "10:00");
const [mvC, cnC] = await Promise.all([E.reschedule(cm.booking.ref, "2026-11-12", "10:00", NOW), E.cancel(cm.booking.ref)]);
check("a move and a cancel of one booking at once: either cancelled outright, or moved then nothing left to cancel; never two",
  live().length <= 1 && (live().length === 0 ? true : !cnC) && locks().length === 0, JSON.stringify({ mvC, cnC: !!cnC, live: live().length }));
reset();
const st = await book("2026-11-16", "10:00");
cal.set(`ssk${st.booking.ref}`, { id: `ssk${st.booking.ref}`, status: "confirmed", etag: '"old"', created: "2026-10-01T08:00:00Z", updated: "2026-10-01T08:00:00Z",
  start: { date: "2000-01-01" }, end: { date: "2000-01-02" }, extendedProperties: { private: { sslock: "1", holder: "dead" } } });
const afterCrash = await E.reschedule(st.booking.ref, "2026-11-16", "15:00", NOW);
check("a lock left by a crashed change is taken over", afterCrash.ok && live().length === 1 && locks().length === 0, JSON.stringify(afterCrash));
reset();
const held = await book("2026-11-17", "10:00");
cal.set(`ssk${held.booking.ref}`, { id: `ssk${held.booking.ref}`, status: "confirmed", etag: '"fresh"', created: new Date().toISOString(), updated: new Date().toISOString(),
  start: { date: "2000-01-01" }, end: { date: "2000-01-02" }, extendedProperties: { private: { sslock: "1", holder: "alive" } } });
const waited = await E.reschedule(held.booking.ref, "2026-11-17", "15:00", NOW);
check("while another change genuinely holds it, a move waits, then says busy rather than racing", !waited.ok && /in progress/.test(waited.message) && live().length === 1 && live()[0].start.dateTime === "2026-11-17T10:00:00.000Z", JSON.stringify(waited));
check("the lock never blocks a slot", (await E.freeStarts("2026-11-17", NOW)).length === 2);


// ─── Google's write limit, and Stripe saying it twice ───────────────
reset();
for (let i = 0; i < 5; i++) fault(isInsert, "ratelimit");
const rl = await book("2026-11-18", "10:00");
check("five rate-limit refusals in a row are waited out, and it books", rl.ok && live().length === 1, JSON.stringify(rl));
reset();
for (let i = 0; i < 7; i++) fault(isInsert, "ratelimit");
for (let i = 0; i < 7; i++) fault((m, p) => m === "GET" && /\/events\/ssb/.test(p), "ratelimit");
const rl2 = await book("2026-11-18", "12:30");
check("a limit that never lifts ends in a clean refusal, nothing written", !rl2.ok && rl2.reason === "error" && live().length === 0, JSON.stringify(rl2));
reset();
const s1 = await book("2026-11-19", "10:00", { orderId: "cs_live_dup" });
const s2 = await book("2026-11-19", "10:00", { orderId: "cs_live_dup" });
check("the same paid order arriving twice is one booking, reported booked both times", s1.ok && s2.ok && s1.booking.id === s2.booking.id && live().length === 1, JSON.stringify([s1.ok, s2]));
const s3 = await book("2026-11-19", "10:00", { orderId: "cs_live_other" });
check("a different order for that slot is still refused", !s3.ok && s3.reason === "taken");

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
