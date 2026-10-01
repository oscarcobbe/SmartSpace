#!/usr/bin/env node
// Switching both sites' bookings from Calendly to Nigel's Google Calendar, and back.
// See docs/booking.md. Needs the Vercel CLI logged in to the team, and the
// SmartCare Living checkout (SCL_DIR, default ~/Projects/SmartCareliving).
//
//   node scripts/booking-switch.mjs check      read-only: the live Google connection, which system books, Nigel's approvals
//   node scripts/booking-switch.mjs go         switch both sites on, redeploy, prove it with one booking on Nigel's calendar (cancelled at once)
//   node scripts/booking-switch.mjs rollback   switch both sites back to Calendly and redeploy
//
// Secrets are read from Vercel into memory and never printed or kept.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir, homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const SS = { dir: resolve(dirname(fileURLToPath(import.meta.url)), ".."), id: "prj_x92pO1wboy7sZxg4a0uyEOAf7LTM", site: "https://smart-space.ie" };
const SCL_DIR = process.env.SCL_DIR || join(homedir(), "Projects", "SmartCareliving");
const SCL = { dir: SCL_DIR, id: "prj_TwDUnZURgvjyHXfDtOSDM1iHyW04", site: "https://www.smartcareliving.ie" };
const SCL_CODE = SCL_DIR;
const vercel = (cwd, args, input) => spawnSync("vercel", args, { cwd, input, encoding: "utf8" });
const say = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function prodEnv(p) {
  const d = mkdtempSync(join(tmpdir(), "cut-"));
  try {
    vercel(p.dir, ["env", "pull", join(d, "e"), "--environment=production", "--yes"]);
    return Object.fromEntries(readFileSync(join(d, "e"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
  } finally { rmSync(d, { recursive: true, force: true }); }
}

async function ssHealth(secret) {
  const r = await fetch(`${SS.site}/api/booking/engine?health=1`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(40000) });
  return r.json();
}

async function sclApprovals(env) {
  for (const k of ["CRM_HMAC_SECRET", "CRM_INBOUND_URL"]) process.env[k] = env[k] || "";
  const { isApproved } = await import(pathToFileURL(join(SCL_CODE, "api/_lib/signoff.js")).href);
  const ids = ["booking-confirmed-links", "booking-moved", "booking-cancelled"];
  return Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await isApproved(id, { timeoutMs: 8000 })])));
}

async function sclSource() {
  const day = new Date(Date.now() + 9 * 86400000);
  while (![1, 2, 3, 4].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
  const r = await fetch(`${SCL.site}/api/calendly-availability?kind=consult&date=${day.toISOString().slice(0, 10)}`, { headers: { Origin: SCL.site } });
  return (await r.json()).source;
}

async function status() {
  const ss = prodEnv(SS), scl = prodEnv(SCL);
  const h = await ssHealth(ss.BOOKING_API_SECRET);
  const sa = await sclApprovals(scl);
  say("Smart Space: books with", h.backend, "| Google reachable:", h.ok, `(${h.readMs} ms)`, "| approvals:", JSON.stringify(h.approved));
  say("SmartCare Living: free times from", await sclSource(), "| approvals:", JSON.stringify(sa), "(not required: it falls back to today's confirmation)");
  return { ss, scl, h, sa };
}

async function redeploy(p) {
  const list = JSON.parse(execFileSync("vercel", ["api", `/v6/deployments?projectId=${p.id}&limit=1&target=production&state=READY`], { cwd: p.dir, encoding: "utf8" }));
  const url = list.deployments[0].url;
  const r = vercel(p.dir, ["redeploy", url, "--target", "production"]);
  if (r.status !== 0) throw new Error(`redeploy failed for ${p.site}: ${r.stderr.slice(-300)}`);
}

async function setSwitch(on) {
  for (const p of [SS, SCL]) {
    vercel(p.dir, ["env", "rm", "BOOKING_BACKEND", "production", "--yes"]);
    if (on) {
      const r = vercel(p.dir, ["env", "add", "BOOKING_BACKEND", "production"], "google");
      if (r.status !== 0) throw new Error(`could not set BOOKING_BACKEND on ${p.site}`);
    }
  }
  say(on ? "switch set on both sites, redeploying..." : "switch removed on both sites, redeploying...");
  await Promise.all([redeploy(SS), redeploy(SCL)]);
}

async function go() {
  const { ss, h } = await status();
  if (!h.ok) throw new Error("the live site cannot read the calendar; not switching");
  if (!Object.values(h.approved || {}).every(Boolean)) throw new Error("Nigel has not approved all three Smart Space booking emails; not switching");
  await setSwitch(true);
  const after = await ssHealth(ss.BOOKING_API_SECRET);
  const src = await sclSource();
  say("after switch: Smart Space books with", after.backend, "| SmartCare Living free times from", src);
  if (after.backend !== "google" || src !== "calendar") throw new Error("the switch did not take on both sites; run rollback");

  // One real booking on Nigel's calendar, cancelled at once.
  const auth = { Authorization: `Bearer ${ss.BOOKING_API_SECRET}`, "Content-Type": "application/json" };
  const api = `${SS.site}/api/booking/engine`;
  const day = new Date(Date.now() + 21 * 86400000);
  let booked = null;
  for (let i = 0; i < 14 && !booked; i++, day.setUTCDate(day.getUTCDate() + 1)) {
    if (![1, 2, 3, 4].includes(day.getUTCDay())) continue;
    const date = day.toISOString().slice(0, 10);
    const free = (await (await fetch(`${api}?date=${date}`, { headers: auth })).json()).starts || [];
    if (!free.length) continue;
    const r = await (await fetch(api, { method: "POST", headers: auth, body: JSON.stringify({ action: "book", kind: "consultation", date, start: free[free.length - 1], name: "TEST switch-over check (deleting now)", email: "switch-check@example.invalid" }) })).json();
    if (r.ok) booked = r.booking;
  }
  if (!booked) throw new Error("could not make the test booking; run rollback");
  say("test booking made on Nigel's calendar:", booked.start);
  const t = new URL(booked.manageUrl).searchParams.get("t");
  const c = await (await fetch(api, { method: "POST", headers: auth, body: JSON.stringify({ action: "cancel", ref: booked.ref, t }) })).json();
  say("test booking cancelled:", c.ok === true);
  if (!c.ok) throw new Error("the test booking could not be cancelled: delete it from Nigel's calendar by hand");
  say("\nSwitched. Both sites now book on Nigel's Google Calendar.");
}

async function rollback() {
  await setSwitch(false);
  const ss = prodEnv(SS);
  const h = await ssHealth(ss.BOOKING_API_SECRET);
  say("after rollback: Smart Space books with", h.backend, "| SmartCare Living free times from", await sclSource());
}

const cmd = process.argv[2];
try {
  if (cmd === "check") await status();
  else if (cmd === "go") await go();
  else if (cmd === "rollback") await rollback();
  else say("usage: node scripts/booking-switch.mjs check | go | rollback");
} catch (e) {
  console.error("STOPPED:", e.message);
  process.exit(1);
}
