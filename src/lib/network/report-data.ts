/**
 * The report's figures, drawn from the assessment and nothing else.
 *
 * The report template (docs/report-style/network-assessment.html) draws every
 * chart and sentence from one object, R. This builds R from what was captured
 * on the visit, what the Pi measured, and the three-day logs. A figure that is
 * not there is left out and named in `missing`, never estimated: Nigel's rule
 * is that every number in the report was measured in the house, and the
 * report cannot be approved while anything it needs is missing.
 *
 * Kept free of runtime imports so the build check can load it on its own;
 * the type imports below disappear when it is compiled.
 */
import type { Capture, Row } from "./capture";
import type { IperfParse, parseDevicesLog as ParseDevices } from "./logs";

type DevicesParse = ReturnType<typeof ParseDevices>;

export interface Measured { down: number | null; up: number | null; at: string }

export interface ReportSource {
  customerName: string;
  address: string | null;
  eircode: string | null;
  visitAt: string | null;
  collectionAt: string | null;
  trialStartedAt: string | null;
  capture: Capture;
  /** Socket rows measured by the Pi, by row id. A typed value is used when there is no measurement. */
  socketReadings: Record<string, Measured>;
  baseline: Measured | null;
  iperf: IperfParse | null;
  devices: DevicesParse | null;
  /** Report date as YYYY-MM-DD, or today when empty. */
  today: string;
}

export interface ReportData {
  R: Record<string, unknown>;
  /** Figures the report needs and does not have. Approval waits for these. */
  missing: string[];
  /** Things worth a look that do not stop approval. */
  notes: string[];
}

const ENGINEER = "Nigel Cobbe, SmartSpace Networks";
const ROOMS_NEED = 25;

const longDate = (d: Date) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "long", year: "numeric" }).format(d);

const shortWhen = (t: number) =>
  new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(t)).replace(",", "");

function dateOf(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T12:00:00Z`) : new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

const v = (c: Capture, s: string, k: string): unknown => c?.[s]?.[k];
const s = (c: Capture, sec: string, k: string): string => {
  const x = v(c, sec, k);
  return typeof x === "string" ? x.trim() : typeof x === "number" ? String(x) : "";
};
const n = (c: Capture, sec: string, k: string): number | null => {
  const x = v(c, sec, k);
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x.trim() && Number.isFinite(Number(x))) return Number(x);
  return null;
};
const yes = (c: Capture, sec: string, k: string) => v(c, sec, k) === true;
const list = (c: Capture, sec: string, k: string): Row[] => {
  const x = v(c, sec, k);
  return Array.isArray(x) ? (x as Row[]) : [];
};
const num = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const round = (x: number) => Math.round(x);
const euro = (x: number) => `€${Math.round(x).toLocaleString("en-IE")}`;
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const SPAN = ["", "one day", "two days", "three days", "four days", "five days", "six days", "seven days"];
/** "three days", from how many hours the trial ran. The template words it the same way. */
const spanWords = (hours: number | null) => {
  const d = hours == null ? 3 : Math.max(1, Math.round(hours / 24));
  return SPAN[d] ?? `${d} days`;
};

const LINE_PILL: Record<string, "good" | "fair" | "poor"> = {
  fine: "good", placement: "fair", latency: "poor", provider: "poor", loss: "poor",
};

export function buildReport(src: ReportSource): ReportData {
  const c = src.capture ?? {};
  const missing: string[] = [];
  const notes: string[] = [];
  const need = (ok: boolean, what: string) => { if (!ok) missing.push(what); };

  /* ── Cover ── */
  const visit = dateOf(src.visitAt);
  const collected = dateOf(src.collectionAt);
  need(!!visit, "The visit date (Booking)");
  need(!!collected, "The collection date (Booking)");
  const complaint = s(c, "customer", "complaint");
  need(!!complaint, "The complaint, in their words (The customer and the complaint)");
  const verdict = s(c, "report", "verdict");
  need(!!verdict, "What we found, in plain words (The report)");
  const wont = s(c, "report", "wont");
  need(!!wont, "What we are not recommending, and why (The report). Never empty.");

  /* ── The line ── */
  const provider = s(c, "customer", "provider");
  const packageNum = n(c, "customer", "packageMbps");
  const down = n(c, "line", "down"), up = n(c, "line", "up");
  const idle = n(c, "line", "idleMs"), loadD = n(c, "line", "loadDownMs"), loadU = n(c, "line", "loadUpMs");
  const grade = s(c, "line", "grade");
  const loss = n(c, "line", "loss");
  const lineVerdict = s(c, "line", "verdict");
  need(!!provider, "Broadband provider (The customer and the complaint)");
  need(packageNum != null, "Package speed (The customer and the complaint)");
  need(down != null && up != null, "Download and upload at the router (Step 1)");
  need(idle != null && loadD != null && loadU != null, "Idle and loaded latency (Step 1)");
  need(!!grade, "Waveform grade (Step 1)");
  need(loss != null, "Loss percentage from the ping test (Step 1)");
  need(!!lineVerdict, "Verdict on the line (Step 1)");

  /* ── Rooms ── */
  const rooms = list(c, "rooms", "rows")
    .filter((r) => typeof r.room === "string" && r.room && num(r.speed) != null)
    /* "Ground", not "Ground floor": the chart sets the floor in capitals beside the room's name. */
    .map((r) => ({ room: String(r.room), floor: String(r.floor ?? "").replace(/\s*floor$/i, ""), speed: round(num(r.speed)!) }));
  need(rooms.length > 0, "At least one room with a speed (Step 3)");
  const compareName = s(c, "trial", "compareRoom");
  const compare = rooms.find((r) => r.room.toLowerCase() === compareName.toLowerCase())
    ?? (rooms.length ? rooms.reduce((a, b) => (a.speed < b.speed ? a : b)) : null);
  if (compareName && !rooms.some((r) => r.room.toLowerCase() === compareName.toLowerCase())) {
    notes.push(`"${compareName}" is not a room in the survey, so the report compares with the slowest room instead.`);
  }

  /* ── Where the speed goes ── */
  const cascade: { label: string; value: number; note: string }[] = [];
  if (packageNum != null) cascade.push({ label: "What you pay for", value: round(packageNum), note: "advertised package" });
  if (down != null) cascade.push({ label: "Arriving at the router", value: round(down), note: "measured on a cable" });
  if (rooms.length) {
    const best = rooms.reduce((a, b) => (a.speed > b.speed ? a : b));
    if (!compare || best.room !== compare.room) cascade.push({ label: `Best room, ${lower(best.room)}`, value: best.speed, note: "on your existing Wi-Fi" });
    if (compare) {
      const theirs = compareName && compare.room.toLowerCase() === compareName.toLowerCase();
      cascade.push({ label: compare.room, value: compare.speed, note: theirs ? "the room you complained about" : "the weakest room measured" });
    }
  }

  /* ── Sockets ── */
  const sockets = list(c, "sockets", "rows")
    .map((r) => {
      const m = src.socketReadings[r.id];
      const d = m?.down ?? num(r.down), u = m?.up ?? num(r.up);
      return { floor: String(r.floor ?? ""), socket: String(r.socket ?? ""), down: d != null ? round(d) : null, up: u != null ? round(u) : null, chosen: r.chosen === true };
    })
    .filter((r) => r.socket && (r.down != null || r.up != null));
  need(sockets.length > 0, "At least one socket measured (Step 2)");

  /* ── The trial ── */
  const trialFloor = s(c, "trial", "trialFloor");
  need(!!trialFloor, "Floor the trial system is on (Step 4)");
  const baselineDown = src.baseline?.down ?? n(c, "trial", "baselineDown");
  const baselineUp = src.baseline?.up ?? n(c, "trial", "baselineUp");

  const rows = src.iperf?.rows ?? [];
  const complete = rows.filter((r) => r.down != null && r.up != null);
  need(complete.length > 0, "The three-day log (Collect the logs)");
  const med = (xs: number[]) => {
    if (!xs.length) return null;
    const a = [...xs].sort((p, q) => p - q), m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const downs = rows.map((r) => r.down).filter((x): x is number => x != null);
  const ups = rows.map((r) => r.up).filter((x): x is number => x != null);
  const failed = rows.filter((r) => r.down == null || r.up == null).map((r) => ({ at: shortWhen(r.at) }));
  const hours = rows.length > 1 ? (rows[rows.length - 1].at - rows[0].at) / 3_600_000 : null;
  if (hours != null && hours < 60) notes.push(`The log covers ${Math.round(hours)} hours, not three full days.`);
  if (failed.length) notes.push(`${failed.length} hourly test${failed.length === 1 ? "" : "s"} did not complete: ${failed.map((f) => f.at).join(", ")}.`);

  const trial: Record<string, unknown> = {
    where: trialFloor,
    compareRoom: compare?.room ?? "",
    ssid: s(c, "trial", "ssid") || "SmartSpace Trial",
    baselineDown: baselineDown != null ? round(baselineDown) : null,
    baselineUp: baselineUp != null ? round(baselineUp) : null,
    tests: rows.length || null,
    medianDown: downs.length ? round(med(downs)!) : null,
    medianUp: ups.length ? round(med(ups)!) : null,
    lowest: downs.length ? round(Math.min(...downs)) : null,
    failed,
    hours: hours != null ? Math.round(hours) : null,
    series: complete.map((r) => ({ h: r.h, d: round(r.down!), u: round(r.up!) })),
    eveningComplaint: yes(c, "customer", "eveningTrouble"),
    roomOnTrial: n(c, "trial", "roomOnTrial"),
    devicesBefore: s(c, "collection", "before"),
    logExported: false,
    deviceSource: "checks",
    devices: [] as unknown[],
  };

  /* ── The devices, from devices.log ── */
  const watched = list(c, "trial", "devices");
  if (src.devices?.devices.length) {
    /* Hours from the device watch's own first check, which is when the
       trial began for these devices, whoever started it. */
    const start = Math.min(...src.devices.devices.map((d) => d.firstAt));
    trial.devices = src.devices.devices.map((d) => {
      const row = watched.find((w) => String(w.device ?? "").trim().toLowerCase() === d.name.toLowerCase());
      return {
        name: d.name,
        was: String(row?.was ?? "") || "your own Wi-Fi",
        node: "the trial network",
        drops: d.drops.map((x) => Math.max(0, Math.round(((x.fromAt - start) / 3_600_000) * 10) / 10)),
      };
    });
    for (const d of src.devices.devices) {
      if (d.checks > 0 && d.missed === d.checks) {
        notes.push(`${d.name} never answered a check. It may ignore pings (Nest thermostats and battery sensors do): leave it out, and use the Deco log for it.`);
      }
    }
  } else if (watched.some((w) => w.ip)) {
    notes.push("Devices were moved onto the trial network but there is no device log, so the devices section is left out.");
  }

  /* ── What we recommend, and the money ── */
  const plan = list(c, "conclusions", "plan")
    .filter((r) => r.floor || r.hardware)
    .map((r) => ({ floor: String(r.floor ?? ""), kit: String(r.hardware ?? ""), where: String(r.position ?? ""), expect: String(r.expect ?? "") }));
  const rec = s(c, "conclusions", "recommendation");
  if (!plan.length && rec !== "decline" && rec !== "refer") missing.push("What would be installed (Conclusions and the quote)");
  const lines = list(c, "report", "lines")
    .filter((r) => r.item && num(r.amount) != null)
    .map((r) => ({ item: String(r.item), amount: num(r.amount)! }));
  const total = lines.reduce((p, l) => p + l.amount, 0);
  if (!lines.length && rec !== "decline" && rec !== "refer") missing.push("The quote lines, as the customer sees them (The report)");
  if (lines.length && total < 395) notes.push("The quote is less than the €395 assessment fee it credits.");

  /* ── What the trial showed, drafted when Nigel has not written it ── */
  let verdictAfter = s(c, "report", "verdictAfter");
  if (!verdictAfter && trialFloor && trial.medianDown != null) {
    const span = spanWords(hours);
    const parts = [
      `Over ${span} we ran a working system on the ${lower(trialFloor)} alongside your own Wi-Fi.`,
      `The connection feeding it carried a median of ${trial.medianDown} Mbps to that floor across ${rows.length} hourly tests${failed.length ? `, ${failed.length} of which did not complete` : ", every one of which completed"}.`,
    ];
    if (trial.roomOnTrial != null && compare) parts.push(`In the ${lower(compare.room)} it measured ${trial.roomOnTrial} Mbps, against ${compare.speed} Mbps on your existing Wi-Fi.`);
    const devs = src.devices?.devices ?? [];
    if (devs.length === 1) {
      const d = devs[0];
      parts.push(d.missed === 0
        ? `The ${lower(d.name)} answered every check while it was on the trial network.`
        : `The ${lower(d.name)} dropped off ${d.drops.length} time${d.drops.length === 1 ? "" : "s"} while on the trial network, answering ${d.pctUp}% of checks.`);
    } else if (devs.length) {
      const clean = devs.filter((d) => d.missed === 0).length;
      parts.push(clean === devs.length
        ? `Every device you named answered every check while it was on the trial network.`
        : `${clean} of the ${devs.length} devices you named answered every check while on the trial network.`);
    }
    verdictAfter = parts.join(" ");
    notes.push("What the trial showed was drafted from the logs. Read it, and write your own if it says it badly.");
  }

  const reportDay = dateOf(s(c, "report", "reportDate")) ?? dateOf(src.today) ?? new Date();
  if (collected && reportDay.getTime() < collected.getTime() - 86_400_000) {
    notes.push("The report date is before the collection date.");
  }

  const R: Record<string, unknown> = {
    client: src.customerName,
    address: [src.address, src.eircode].filter(Boolean).join(", "),
    property: s(c, "report", "property") || s(c, "customer", "propertyType"),
    visitDate: visit ? longDate(visit) : "",
    collectDate: collected ? longDate(collected) : "",
    engineer: ENGINEER,
    complaint,
    verdict,
    verdictAfter,
    quote: s(c, "collection", "noticed"),
    line: {
      provider,
      package: packageNum != null ? `${round(packageNum)} Mbps` : "",
      packageNum: packageNum != null ? round(packageNum) : null,
      down: down != null ? round(down) : null,
      up: up != null ? round(up) : null,
      idleMs: idle != null ? round(idle) : null,
      loadDownMs: loadD != null ? round(loadD) : null,
      loadUpMs: loadU != null ? round(loadU) : null,
      grade,
      loss: loss != null ? `${loss}%` : "",
      url: s(c, "line", "url"),
      verdict: LINE_PILL[lineVerdict] ?? "fair",
    },
    cascade,
    roomsNeed: ROOMS_NEED,
    rooms,
    sockets,
    trial,
    plan,
    wont,
    quoteLines: lines.map((l) => ({ item: l.item, amount: euro(l.amount) })),
    quoteTotal: euro(total),
    credited: "−€395",
    balance: euro(Math.max(0, total - 395)),
    // Left out until the monitoring price is settled. The template drops the line when empty.
    monitoring: "",
    reportDate: longDate(reportDay),
  };
  return { R, missing, notes };
}

/**
 * The template with R in place of its example block. Everything else in the
 * file, the stylesheet, the letterhead, the charts and the footer, is
 * untouched, so the report is the house style by construction.
 */
export function fillTemplate(template: string, R: Record<string, unknown>): string {
  const start = template.indexOf("const R = {");
  const endMarker = "<!-- ================= END OF THE EDITABLE BLOCK";
  const end = template.indexOf(endMarker);
  if (start < 0 || end < 0 || end < start) throw new Error("The report template has no editable R block.");
  const close = template.lastIndexOf("</script>", end);
  if (close < start) throw new Error("The report template's R block is not closed.");
  /* JSON is valid JavaScript, and with <, > and & escaped no value can close
     the script element or open a new one, whatever the customer's words say. */
  const json = JSON.stringify(R, null, 2)
    .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return `${template.slice(0, start)}const R = ${json};\n${template.slice(close)}`;
}
