#!/usr/bin/env node
/**
 * The Wi-Fi report's verdicts, pinned.
 *
 * The traffic light is the product: a customer is told red or green and
 * pointed at a package on the strength of it, and Nigel is emailed the same
 * verdict. Each case below is a house the grading has to get right, and most
 * are a way it could plausibly get it wrong:
 *
 *   - a slow room in a house with a fast line is a Wi-Fi problem, not a
 *     broadband one, and must never be blamed on the provider;
 *   - a reading taken only in the room that struggles says nothing about the
 *     line into the house;
 *   - anything short of green points to the assessment, never to a sale;
 *   - good numbers with drop-outs the customer notices are still amber;
 *   - a link edited by hand must not open as a report.
 *
 *   node scripts/check-wifi-grade.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = mkdtempSync(join(ROOT, ".wifi-grade-"));
const compile = (name) => {
  const src = readFileSync(join(ROOT, "src/lib/wifi-check", `${name}.ts`), "utf8");
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from "\.\/grade"/g, 'from "./grade.mjs"');
  writeFileSync(join(dir, `${name}.mjs`), js);
};
let G, C;
try {
  compile("grade");
  compile("codec");
  G = await import(pathToFileURL(join(dir, "grade.mjs")).href);
  C = await import(pathToFileURL(join(dir, "codec.mjs")).href);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const fail = [];
const eq = (what, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) fail.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};

const home = (o = {}) => ({
  home: "semi", floors: 2, people: 3, trouble: [], everywhere: false, drops: "rarely", cameras: 0, ...o,
});
const R = (place, down, up, ping = 12, busy = 30) => ({ place, down, up, ping, busy, at: 1759000000000 });

/* A fast line and a room that has lost most of it: the Wi-Fi, never the line. */
{
  const g = G.grade([R("router", 300, 40), R("trouble", 20, 8)], home({ trouble: ["upstairs"], drops: "often" }));
  eq("slow room, fast line: light", g.light, "red");
  eq("slow room, fast line: cause", g.cause, "rooms");
  eq("slow room, fast line: package", g.recommend, "home-network-assessment");
  eq("slow room, fast line: no second suggestion", g.also, null);
  eq("slow room, fast line: the line is green", g.checks.find((c) => c.key === "speed").light, "green");
}

/* Slow beside the router: the line, and monitoring to prove it. */
{
  const g = G.grade([R("router", 12, 2)], home({ people: 5 }));
  eq("slow at the router: light", g.light, "red");
  eq("slow at the router: cause", g.cause, "line");
  eq("slow at the router: package", g.recommend, "home-network-assessment");
  eq("slow at the router: monitoring second", g.also, "network-monitoring");
}

/* Only the struggling room was tested: the speed check must not grade the line. */
{
  const g = G.grade([R("trouble", 15, 6)], home({ trouble: ["upstairs"], drops: "sometimes" }));
  eq("room only: speed not graded", g.checks.find((c) => c.key === "speed").light, null);
  eq("room only: cause", g.cause, "rooms");
}

/* All good: green, and nothing to sell. */
{
  const g = G.grade([R("router", 250, 21), R("trouble", 180, 19)], home({ trouble: ["upstairs"] }));
  eq("all good: light", g.light, "green");
  eq("all good: package", g.recommend, null);
}

/* Good numbers, drop-outs they notice: amber, monitoring. */
{
  const g = G.grade([R("router", 250, 21)], home({ drops: "sometimes" }));
  eq("drops now and then: light", g.light, "amber");
  eq("drops now and then: cause", g.cause, "drops");
  eq("drops now and then: package", g.recommend, "home-network-assessment");
  eq("drops now and then: monitoring second", g.also, "network-monitoring");
}

/* Said upstairs struggles, never tested there, drops often: rooms suspected, and asked to test. */
{
  const g = G.grade([R("router", 250, 21)], home({ trouble: ["upstairs"], drops: "often" }));
  eq("suspected rooms: cause", g.cause, "rooms");
  eq("suspected rooms: untested", g.untested, ["upstairs"]);
  eq("suspected rooms: rooms check not graded", g.checks.find((c) => c.key === "rooms").light, null);
}

/* Ring's upload scale, and the camera floor. */
eq("upload 12 is good", G.grade([R("router", 200, 12)], home()).checks.find((c) => c.key === "upload").light, "green");
eq("upload 7 is okay", G.grade([R("router", 200, 7)], home()).checks.find((c) => c.key === "upload").light, "amber");
eq("upload 4 is poor", G.grade([R("router", 200, 4)], home()).checks.find((c) => c.key === "upload").light, "red");
eq("upload 7 cannot carry four cameras", G.grade([R("router", 200, 7)], home({ cameras: 4 })).checks.find((c) => c.key === "upload").light, "red");

/* Response when busy. */
eq("busy 200 ms is red", G.grade([R("router", 200, 20, 15, 200)], home()).checks.find((c) => c.key === "busy").light, "red");
eq("busy 90 ms is amber", G.grade([R("router", 200, 20, 15, 90)], home()).cause, "busy");

/* Slow to respond only in the struggling room, fine at the router: the Wi-Fi. */
{
  const g = G.grade([R("router", 300, 40, 10, 30), R("trouble", 200, 30, 12, 190)], home({ trouble: ["office"] }));
  eq("busy only in the room: light", g.light, "red");
  eq("busy only in the room: cause", g.cause, "rooms");
  eq("busy only in the room: named", /where the Wi-Fi struggles/.test(g.checks.find((c) => c.key === "busy").finding), true);
}
eq("busy at the router too: the line", G.grade([R("router", 300, 40, 10, 170), R("trouble", 200, 30, 12, 190)], home()).cause, "busy");

/* The need: one 4K stream a person at Netflix's 15 Mbps, never under 25. */
eq("need for one", G.needDownFor(1), 25);
eq("need for six", G.needDownFor(6), 90);

/* The link round trips, and refuses what it did not write. */
{
  const check = { answers: home({ trouble: ["upstairs", "garden"], cameras: 2 }), readings: [R("router", 312.44, 40.06), R("trouble", 18.27, 6.61)] };
  const back = C.decodeCheck(C.encodeCheck(check));
  eq("round trip answers", back?.answers, check.answers);
  eq("round trip speeds, one decimal", back?.readings.map((r) => [r.place, r.down, r.up]), [["router", 312.4, 40.1], ["trouble", 18.3, 6.6]]);

  const wire = (mutate) => {
    const w = JSON.parse(Buffer.from(C.encodeCheck(check), "base64url").toString("utf8"));
    mutate(w);
    return Buffer.from(JSON.stringify(w), "utf8").toString("base64url");
  };
  eq("an unknown home type is refused", C.decodeCheck(wire((w) => { w.a.h = "castle"; })), null);
  eq("an unknown room is refused", C.decodeCheck(wire((w) => { w.a.t = ["attic"]; })), null);
  eq("an absurd speed is refused", C.decodeCheck(wire((w) => { w.r[0][1] = 1e9; })), null);
  eq("a negative speed is refused", C.decodeCheck(wire((w) => { w.r[0][2] = -5; })), null);
  eq("a report with no readings is refused", C.decodeCheck(wire((w) => { w.r = []; })), null);
  eq("five readings keep the last four", C.decodeCheck(wire((w) => { w.r = [w.r[0], w.r[0], w.r[0], w.r[0], w.r[1]]; }))?.readings.length, 4);
  eq("markup in a city name is stripped", C.decodeCheck(wire((w) => { w.r[0][6] = "<b>Dublin</b>"; }))?.readings[0].city, "bDublinb");
  eq("garbage is refused", C.decodeCheck("not-a-report"), null);
  eq("nothing is refused", C.decodeCheck(""), null);
}

if (fail.length) {
  console.error(`\n${fail.length} Wi-Fi grading problem${fail.length === 1 ? "" : "s"}:\n`);
  for (const f of fail) console.error(`  ${f}`);
  console.error("");
  process.exit(1);
}
console.log("Wi-Fi report grades as it should: slow rooms blame the Wi-Fi, slow lines blame the line, and a hand-edited link does not open.");
