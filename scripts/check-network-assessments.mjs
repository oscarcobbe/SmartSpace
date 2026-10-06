#!/usr/bin/env node
/**
 * The home network assessment portal, pinned.
 *
 * Six things that would each be wrong in front of a customer, or wrong inside
 * a customer's house, without anything else in the build noticing:
 *
 *   1. The log reader must agree with Nigel's parse_iperf.py on every reading.
 *      The excerpt is the first sixteen hours of his real trial log (2 October
 *      2026, Fourwinds), and the CSV beside it is what parse_iperf.py
 *      (sha256 dd5da2cb...) wrote from it. Byte for byte, CRLF included.
 *   2. devices.log must be read as collect.sh reads it.
 *   3. The Pi program must know exactly the actions the portal can send, and
 *      must never pass a string to a shell.
 *   4. The portal must refuse, before queueing, anything the Pi would refuse:
 *      a public address, a name that would break the log line, an archive
 *      path outside the archive.
 *   5. The report template must only say what was measured. Run against
 *      figures where the line is at fault, a test failed, nobody mentioned the
 *      evening and no monitoring price is set, it must say so and nothing else.
 *   6. The pre-departure check must catch a double NAT and an old log.
 *
 *   node scripts/check-network-assessments.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIX = join(ROOT, "scripts/fixtures/network");
const dir = mkdtempSync(join(ROOT, ".network-check-"));

const compile = (name) => {
  const src = readFileSync(join(ROOT, "src/lib/network", `${name}.ts`), "utf8");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
    .outputText.replace(/from "\.\/(\w[\w-]*)"/g, 'from "./$1.mjs"');
  writeFileSync(join(dir, `${name}.mjs`), js);
};
let L, P, C, RD;
try {
  for (const m of ["logs", "pi-protocol", "check", "capture", "report-data"]) compile(m);
  L = await import(pathToFileURL(join(dir, "logs.mjs")).href);
  P = await import(pathToFileURL(join(dir, "pi-protocol.mjs")).href);
  C = await import(pathToFileURL(join(dir, "check.mjs")).href);
  RD = await import(pathToFileURL(join(dir, "report-data.mjs")).href);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const fail = [];
const eq = (what, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) fail.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
};
const ok = (what, cond) => { if (!cond) fail.push(what); };
let count = 0;
const done = (n) => { count += n; };

/* ── 1. iperf.log, against parse_iperf.py ─────────────────────────── */
{
  const real = L.parseIperfLog(readFileSync(join(FIX, "iperf-real-excerpt.log"), "utf8"));
  const golden = readFileSync(join(FIX, "iperf-real-excerpt.throughput.csv"), "utf8");
  const csv = L.throughputCsv(real.rows);
  if (csv !== golden) {
    const a = csv.split("\r\n"), b = golden.split("\r\n");
    const i = a.findIndex((x, j) => x !== b[j]);
    fail.push(`throughput.csv differs from parse_iperf.py's at line ${i + 1}: "${a[i]}" against "${b[i]}"`);
  }
  /* parse_iperf.py printed: down 13 readings, min 34.2, median 39.4, mean
     39.1, max 44.2; up 16 readings, min 85.5, median 89.4, mean 89.2, max
     91.4; evening down 39.4 vs 38.9; 3 incomplete entries. */
  const f1 = (x) => Math.round(x * 10) / 10;
  const d = L.summarise(real.rows, "down"), u = L.summarise(real.rows, "up");
  eq("down summary", [d.n, f1(d.min), f1(d.median), f1(d.mean), f1(d.max)], [13, 34.2, 39.4, 39.1, 44.2]);
  eq("up summary", [u.n, f1(u.min), f1(u.median), f1(u.mean), f1(u.max)], [16, 85.5, 89.4, 89.2, 91.4]);
  const ev = L.eveningSplit(real.rows, "down");
  eq("evening split, down", [f1(ev.evening), f1(ev.rest)], [39.4, 38.9]);
  eq("incomplete entries", L.trialFigures(real.rows).gaps.length, 3);
  eq("first entry is IST, an hour ahead", new Date(real.rows[0].at).toISOString(), "2026-10-02T12:01:37.000Z");
  done(7);

  /* The hour the clocks go back, a refused connection, BSD date order, and
     iperf3 choosing Gbits and Kbits on its own. */
  const edge = L.parseIperfLog(readFileSync(join(FIX, "iperf-edge.log"), "utf8"));
  eq("edge: three entries", edge.rows.length, 3);
  eq("edge: IST and GMT 01:10 are different moments", edge.rows.slice(0, 2).map((r) => new Date(r.at).toISOString()), ["2026-10-25T00:10:01.000Z", "2026-10-25T01:10:01.000Z"]);
  eq("edge: readings", edge.rows.map((r) => [r.down, r.up, r.note]), [[208, 192, ""], [null, null, "connection failed"], [1050, 0.95, ""]]);
  eq("edge: failures logged", edge.failures.length, 2);
  eq("edge: month-first date read", [edge.rows[2].d, edge.rows[2].mo, edge.rows[2].h], [25, 10, 2]);
  done(5);
}

/* ── 2. devices.log, as collect.sh reads it ───────────────────────── */
{
  const r = L.parseDevicesLog(readFileSync(join(FIX, "devices.log"), "utf8"));
  /* collect.sh printed: Bedroom TV 5 checks, 3 missed (40.0% up);
     Nest thermostat 5 checks, 5 missed (0.0% up). */
  eq("devices: per device", r.devices.map((x) => [x.name, x.checks, x.missed, x.pctUp]), [["Bedroom TV", 5, 3, 40], ["Nest thermostat", 5, 5, 0]]);
  eq("devices: drops are runs of missed checks", r.devices[0].drops.map((x) => [x.from.slice(11), x.to.slice(11), x.missed]), [["21:12", "21:14", 2], ["21:18", "21:18", 1]]);
  eq("devices: an unreadable line is counted, not a device", [r.lines, r.unreadable], [11, 1]);
  done(3);
}

/* ── 3. The Pi program ────────────────────────────────────────────── */
{
  const agent = readFileSync(join(ROOT, "scripts/network-pi/agent.py"), "utf8");
  const block = /ACTIONS = \{([\s\S]*?)\n\}/.exec(agent);
  ok("agent.py has no ACTIONS table", !!block);
  const theirs = block ? [...block[1].matchAll(/"([a-z_]+)":/g)].map((m) => m[1]).sort() : [];
  eq("agent.py's actions are the portal's", theirs, [...P.PI_ACTION_NAMES].sort());
  const code = agent.replace(/"""[\s\S]*?"""/g, "").replace(/#.*$/gm, "");
  ok("agent.py passes shell=True somewhere", !/shell\s*=\s*True/.test(code));
  ok("agent.py calls os.system or os.popen", !/os\.(system|popen)\s*\(/.test(code));
  ok("agent.py starts a process outside run()", (code.match(/subprocess\.(run|Popen|call|check_output|check_call)\s*\(/g) ?? []).length === 1);
  ok("agent.py calls run() with a string instead of a list", !/\brun\(\s*(f?["'])/.test(code));
  ok("agent.py imports eval or exec", !/\b(eval|exec)\s*\(/.test(code));
  done(7);
}

/* ── 4. What the portal will queue ────────────────────────────────── */
{
  const a = "6f2a1c3e-0b4d-4e5f-8a9b-0c1d2e3f4a5b";
  const ck = (action, args) => P.checkArgs(action, args);
  ok("a public address is refused", !ck("start_trial", { assessment: a, devices: [{ name: "TV", ip: "8.8.8.8" }] }).ok);
  ok("a padded address is refused", !ck("start_trial", { assessment: a, devices: [{ name: "TV", ip: "192.168.068.010" }] }).ok);
  ok("a broadcast address is refused", !ck("start_trial", { assessment: a, devices: [{ name: "TV", ip: "192.168.1.255" }] }).ok);
  const piped = ck("start_trial", { assessment: a, devices: [{ name: "TV|1.2.3.4\nrm", ip: "192.168.68.61" }] });
  eq("a pipe or line break in a name cannot reach devices.conf", piped.ok && piped.args.devices[0].name, "TV 1.2.3.4 rm");
  ok("thirteen devices are refused", !ck("start_trial", { assessment: a, devices: Array.from({ length: 13 }, (_, i) => ({ name: `d${i}`, ip: `192.168.68.${i + 2}` })) }).ok);
  ok("a path outside the archive is refused", !ck("clear_logs", { assessment: a, files: [{ dir: "../../etc", name: "iperf.log", sha256: "0".repeat(64) }] }).ok);
  ok("a file that is not a log is refused", !ck("clear_logs", { assessment: a, files: [{ dir: "20261014-101500-6f2a1c3e", name: "key", sha256: "0".repeat(64) }] }).ok);
  ok("a hundred-second measurement is refused", !ck("measure", { seconds: 100 }).ok);
  ok("an action the Pi does not know is refused", !ck("reboot", {}).ok);
  ok("a normal start is accepted", ck("start_trial", { assessment: a, devices: [{ name: "Bedroom TV", ip: "192.168.68.61" }] }).ok);
  done(10);
}

/* ── 5. The report says only what was measured ────────────────────── */
{
  const template = readFileSync(join(ROOT, "docs/report-style/network-assessment.html"), "utf8");
  ok("the template still claims nothing is lost on the line", !template.includes("None of it is lost on the line itself"));
  ok("the template still invents how often it happened", !/devicesBefore\s*\|\|\s*'regularly'/.test(template));

  function render(R) {
    const html = RD.fillTemplate(template, R);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const els = new Map();
    const el = (id) => {
      if (!els.has(id)) {
        const e = { id, textContent: "", innerHTML: "", removed: false, ancestorRemoved: null };
        e.remove = () => { e.removed = true; };
        e.closest = (sel) => ({ remove: () => { e.ancestorRemoved = sel; } });
        els.set(id, e);
      }
      return els.get(id);
    };
    const ctx = vm.createContext({
      document: { getElementById: el, documentElement: {} },
      getComputedStyle: () => ({ getPropertyValue: () => "#000" }),
    });
    vm.runInContext(scripts.join("\n;\n"), ctx, { timeout: 2000 });
    return (id) => el(id);
  }

  const base = {
    client: "Test Customer", address: "1 Test Road", property: "Semi-detached", visitDate: "14 October 2026", collectDate: "17 October 2026",
    engineer: "Nigel Cobbe, SmartSpace Networks", complaint: "The telly buffers.", verdict: "The line is at fault.", verdictAfter: "", quote: "",
    line: { provider: "Eir", package: "500 Mbps", packageNum: 500, down: 120, up: 20, idleMs: 12, loadDownMs: 90, loadUpMs: 140, grade: "D", loss: "2%", url: "", verdict: "poor" },
    cascade: [{ label: "What you pay for", value: 500, note: "" }, { label: "Arriving at the router", value: 120, note: "" }, { label: "Back bedroom", value: 30, note: "" }],
    roomsNeed: 25, rooms: [{ room: "Back bedroom", floor: "Second", speed: 30 }],
    sockets: [{ floor: "Second floor", socket: "Back bedroom", down: 80, up: 60, chosen: true }],
    trial: {
      where: "Second floor", compareRoom: "Back bedroom", ssid: "SmartSpace Trial", baselineDown: 80, baselineUp: 60,
      tests: 72, medianDown: 78, medianUp: 58, lowest: 61, hours: 72, failed: [{ at: "Sat 21:10" }, { at: "Sat 22:10" }],
      series: [{ h: 17, d: 80, u: 60 }, { h: 19, d: 70, u: 55 }, { h: 21, d: 61, u: 50 }, { h: 23, d: 79, u: 59 }],
      eveningComplaint: false, roomOnTrial: null, devicesBefore: "", logExported: false, deviceSource: "checks",
      devices: [{ name: "Bedroom TV", was: "Hall router", node: "the trial network", drops: [5.2] }],
    },
    plan: [], wont: "No cabling.", quoteLines: [], quoteTotal: "€0", credited: "−€395", balance: "€0", monitoring: "", reportDate: "18 October 2026",
  };
  const $ = render(base);
  ok("the cascade says what the line delivers", $("cap-cascade").textContent.startsWith("Your line delivers 120 of the 500 Mbps you pay for"));
  ok("the cascade blames the house for the line's loss", !/of the speed you pay for has been lost inside the house/.test($("cap-cascade").textContent));
  ok("failed hourly tests are not reported", /2 of them did not complete: Sat 21:10, Sat 22:10/.test($("m-trial").innerHTML));
  ok("the cascade drops the article", /reaches the back bedroom, /.test($("cap-cascade").textContent));
  ok("a trial with failed tests is called complete", !/Every one of them completed/.test($("m-trial").innerHTML));
  ok("the trial still compares the feed with a room's Wi-Fi", !/into a room that had been getting/.test($("m-trial").innerHTML));
  ok("the evening is pinned on what the customer never said", !/when you told us/.test($("cap-trial").textContent));
  ok("the evening caption is missing", /18:00 to 23:00/.test($("cap-trial").textContent));
  ok("a customer statement is invented", !/You had told us/.test($("m-devices").innerHTML));
  ok("ping checks are described as the equipment's own log", !/keeps its own record/.test($("m-devices").innerHTML) && /checked whether each of these devices/.test($("m-devices").innerHTML));
  ok("a cost section appears with nothing quoted", $("t-quote").ancestorRemoved === "section");
  const quoted = { quoteLines: [{ item: "Equipment, installation, configuration and testing", amount: "€1,110" }], quoteTotal: "€1,110", balance: "€715" };
  const $q = render({ ...base, ...quoted });
  ok("a monitoring line appears with no price set", $q("m-monitoring").removed === true && $q("t-quote").ancestorRemoved === null);
  ok("the sockets line claims several per floor", $("g-sockets").textContent === "1 socket was tested.");

  const $$ = render({ ...base, ...quoted, trial: { ...base.trial, eveningComplaint: true, failed: [], devicesBefore: "two or three times a week" }, monitoring: "€39 a month" });
  ok("the customer's evening complaint is dropped", /when you told us the trouble happens/.test($$("cap-trial").textContent));
  ok("a clean trial is not called complete", /Every one of them completed/.test($$("m-trial").innerHTML));
  ok("what the customer said is dropped", /You had told us this was happening two or three times a week/.test($$("m-devices").innerHTML));
  ok("a settled monitoring price is dropped", $$("m-monitoring").removed === false && /€39 a month/.test($$("m-monitoring").textContent));

  /* Whatever the customer said, it cannot end the script element. */
  const filled = RD.fillTemplate(template, { ...base, complaint: "</script><script>alert(1)</script>" });
  ok("a customer's words can close the script element", !filled.includes("</script><script>alert(1)"));
  done(21);
}

/* ── 5b. The report's figures come only from the assessment ────────── */
{
  const r = RD.buildReport({
    customerName: "Test Customer", address: null, eircode: null, visitAt: null, collectionAt: null, trialStartedAt: null,
    capture: { customer: { provider: "Eir" } }, socketReadings: {}, baseline: null, iperf: null, devices: null, today: "2026-10-18",
  });
  ok("a report with no complaint is approvable", r.missing.some((m) => m.startsWith("The complaint")));
  ok("a report with no three-day log is approvable", r.missing.some((m) => m.startsWith("The three-day log")));
  ok("a report with nothing in What we are not recommending is approvable", r.missing.some((m) => m.startsWith("What we are not recommending")));
  eq("monitoring is left out of the report", r.R.monitoring, "");
  done(4);
}

/* ── 6. The pre-departure check ───────────────────────────────────── */
{
  const node = {
    ip_eth0: "192.168.68.23", gateway: "192.168.68.1", cron_iperf: 1, cron_sched: "10 *", cron_both: 1,
    log_lines: 4, log_first: "Fri 16 Oct 13:10:01 IST 2026", today: "6 Oct", throttled: "0x0", temp_c: 48, disk_pct: "21%",
    live: { down: 180, up: 170 }, devices: { conf: [{ name: "TV", ip: "192.168.68.61" }], cron: 1, log_lines: 3, results: [{ name: "TV", ip: "192.168.68.61", up: true }] },
  };
  const server = { ip_eth0: "192.168.1.22", gateway: "192.168.1.1", iperf3_running: 1, reboot_cron: 1, throttled: "0x0", temp_c: 45, uptime_s: 9000 };
  const r = C.buildCheck({ node, nodeName: "node1", server, serverName: "server", serverSeenAgoS: 20, ranAt: null });
  ok("a double NAT is not caught", r.sections[1].lines.some((l) => l.level === "fail" && /different networks/.test(l.text)));
  ok("a log from the 16th reads as today's on the 6th", r.sections[1].lines.some((l) => l.level === "fail" && /OLD data/.test(l.text)));
  const fine = C.buildCheck({ node: { ...node, gateway: "192.168.1.1", log_first: "Tue  6 Oct 13:10:01 IST 2026" }, nodeName: "node1", server, serverName: "server", serverSeenAgoS: 20, ranAt: null });
  eq("a healthy house passes", fine.fail, 0);
  const gone = C.buildCheck({ node, nodeName: "node1", server, serverName: "server", serverSeenAgoS: 900, ranAt: null });
  ok("a router Pi silent for fifteen minutes passes", gone.sections[0].lines[0].level === "fail");
  done(4);
}

if (fail.length) {
  console.error(`Network assessments: ${fail.length} problem${fail.length === 1 ? "" : "s"}:\n`);
  for (const f of fail) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`Network assessments: ${count} checks pass. The log reader matches parse_iperf.py, the Pi does only the portal's seven actions, and the report says only what was measured.`);
