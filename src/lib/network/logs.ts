/**
 * Reading the two logs the trial Pi writes.
 *
 * iperf.log is written by cron on the node Pi at ten past each hour: a
 * timestamp line from /bin/date, then "--- down ---" and an iperf3 run in
 * reverse mode (the streaming direction), then "--- up ---" and a normal run.
 * devices.log is written every two minutes by devicewatch.sh: one line per
 * named device, "2026-10-14 21:10|Bedroom TV|192.168.68.61|up" or "...|DOWN".
 *
 * parseIperfLog is a line-for-line port of Nigel's parse_iperf.py, so the
 * portal and his Mac agree on every reading: the same date forms, the same
 * markers, the same rule that an unmarked block is the up direction, and the
 * same CSV. scripts/check-network-assessments.mjs runs both over his real
 * three-day log from 2 to 5 October 2026 and fails if any number differs.
 *
 * One addition: a receiver line in Kbits/sec or Gbits/sec is converted to
 * Mbps rather than skipped. The cron line asks iperf3 for Mbits (-f m), so
 * this only matters for a Pi whose schedule was written by hand without it.
 *
 * Kept free of imports so the build check can load it on its own.
 */

export type Direction = "down" | "up";

export interface IperfRow {
  /** The Pi's wall clock, exactly as /bin/date printed it. */
  y: number; mo: number; d: number; h: number; mi: number; s: number;
  /** The zone /bin/date printed (IST, GMT), or null when it printed none. */
  zone: string | null;
  /** The moment itself. From the zone when there is one, else read as Dublin time. */
  at: number;
  down: number | null;
  up: number | null;
  /** "connection failed" when iperf3 could not reach the Pi at the router. */
  note: string;
}

export interface IperfParse {
  rows: IperfRow[];
  /** Each line that said the test could not connect, with its hour. */
  failures: { row: IperfRow; line: string }[];
}

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

/* parse_iperf.py's DATE_RE, with the zone name captured rather than skipped. */
const DATE_RE = new RegExp(
  "^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+"
  + "(?:(?<d1>\\d{1,2})\\s+(?<m1>[A-Z][a-z]{2})"
  + "|(?<m2>[A-Z][a-z]{2})\\s+(?<d2>\\d{1,2}))\\s+"
  + "(?:(?<y1>\\d{4})\\s+)?"
  + "(?<H>\\d{2}):(?<M>\\d{2}):(?<S>\\d{2})"
  + "(?:\\s+(?<Z>[A-Z]{2,5}))?"
  + "(?:\\s+(?<y2>\\d{4}))?\\s*$",
);

/* parse_iperf.py reads "([\d.]+)\s+Mbits/sec\s+.*receiver", ignoring case. */
const RECEIVER = /([\d.]+)\s+([KMG]?)bits\/sec\s+.*receiver/i;

/* The zones a Pi in Ireland prints. Anything else is read as Dublin time. */
const ZONE_OFFSET_MIN: Record<string, number> = { IST: 60, BST: 60, GMT: 0, UTC: 0, WET: 0, WEST: 60 };

/* One formatter, and one answer per hour: building a time-zone formatter
   costs about two milliseconds, and three days of devices.log is 2,000 lines
   or more. Built per line, reading that log took nine seconds. */
let offsetFormat: Intl.DateTimeFormat | null = null;
const offsetByHour = new Map<number, number>();

/** Minutes Dublin is ahead of UTC at a given moment. */
function dublinOffsetMin(epoch: number): number {
  const hour = Math.floor(epoch / 3_600_000);
  const known = offsetByHour.get(hour);
  if (known != null) return known;
  offsetFormat ??= new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", timeZoneName: "longOffset" });
  const name = offsetFormat.formatToParts(new Date(epoch)).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  const offset = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  if (offsetByHour.size > 5000) offsetByHour.clear();
  offsetByHour.set(hour, offset);
  return offset;
}

/** A Dublin wall-clock time as a moment. In the repeated hour each autumn, the first. */
export function dublinWallToEpoch(y: number, mo: number, d: number, h: number, mi: number, s = 0): number {
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const first = asUtc - dublinOffsetMin(asUtc) * 60_000;
  return asUtc - dublinOffsetMin(first) * 60_000;
}

function validDate(y: number, mo: number, d: number, h: number, mi: number, s: number): boolean {
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d
    && h < 24 && mi < 60 && s < 60;
}

/** A /bin/date line as a row's time fields, or null. parse_iperf.py's parse_date. */
export function parseDateLine(line: string): Omit<IperfRow, "down" | "up" | "note"> | null {
  const m = DATE_RE.exec(line.split(/\s+/).filter(Boolean).join(" "));
  if (!m?.groups) return null;
  const g = m.groups;
  const d = Number(g.d1 ?? g.d2);
  const mo = MONTHS[g.m1 ?? g.m2 ?? ""];
  const yText = g.y1 ?? g.y2;
  if (!mo || !yText) return null;
  const y = Number(yText), h = Number(g.H), mi = Number(g.M), s = Number(g.S);
  if (!validDate(y, mo, d, h, mi, s)) return null;
  const zone = g.Z ?? null;
  const offset = zone != null ? ZONE_OFFSET_MIN[zone] : undefined;
  const at = offset != null ? Date.UTC(y, mo - 1, d, h, mi, s) - offset * 60_000 : dublinWallToEpoch(y, mo, d, h, mi, s);
  return { y, mo, d, h, mi, s, zone, at };
}

const UNIT: Record<string, number> = { "": 1e-6, K: 1e-3, M: 1, G: 1e3 };

export function parseIperfLog(text: string): IperfParse {
  const rows: IperfRow[] = [];
  const failures: IperfParse["failures"] = [];
  let current: IperfRow | null = null;
  let direction: Direction | null = null;

  for (const line of text.split(/\r?\n/)) {
    const when = parseDateLine(line);
    if (when) {
      if (current) rows.push(current);
      current = { ...when, down: null, up: null, note: "" };
      direction = null;
      continue;
    }

    /* Direction markers. "--- reverse ---" is the older label for the down
       direction; unlabelled blocks are the up direction. */
    const low = line.toLowerCase();
    if (low.includes("--- down ---") || low.includes("--- reverse ---")) { direction = "down"; continue; }
    if (low.includes("--- up ---") || low.includes("--- forward ---")) { direction = "up"; continue; }
    /* iperf3 prints this whenever -R is in use, so it marks the down
       direction even when the cron job wrote no marker. */
    if (low.includes("reverse mode")) { direction = "down"; continue; }

    if (!current) continue;

    if (low.includes("unable to connect") || low.includes("connection refused")) {
      current.note = "connection failed";
      failures.push({ row: current, line: line.trim() });
      continue;
    }

    const r = RECEIVER.exec(line);
    if (r) {
      const value = Number(r[1]) * (UNIT[(r[2] ?? "").toUpperCase()] ?? 1);
      if (Number.isFinite(value)) {
        current[direction ?? "up"] = r[2].toUpperCase() === "M" ? Number(r[1]) : Math.round(value * 1000) / 1000;
        direction = null;
      }
    }
  }
  if (current) rows.push(current);
  return { rows, failures };
}

export interface Summary { n: number; min: number; max: number; mean: number; median: number }

/** parse_iperf.py's summarise: readings, min, max, mean and median. */
export function summarise(rows: IperfRow[], label: Direction): Summary | null {
  const vals = rows.map((r) => r[label]).filter((v): v is number => v != null);
  if (!vals.length) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    n: vals.length,
    min: Math.min(...vals),
    max: Math.max(...vals),
    mean: vals.reduce((p, c) => p + c, 0) / vals.length,
    median,
  };
}

/** 18:00 to 23:00 on the Pi's clock against the rest of the day, as means. */
export function eveningSplit(rows: IperfRow[], label: Direction): { evening: number; rest: number } | null {
  const ev: number[] = [], rest: number[] = [];
  for (const r of rows) {
    const v = r[label];
    if (v == null) continue;
    (r.h >= 18 && r.h < 23 ? ev : rest).push(v);
  }
  if (!ev.length || !rest.length) return null;
  const mean = (a: number[]) => a.reduce((p, c) => p + c, 0) / a.length;
  return { evening: mean(ev), rest: mean(rest) };
}

/** Python's str() of a float: 103 is "103.0", 88.8 is "88.8". */
function pyFloat(v: number): string {
  return Number.isInteger(v) ? v.toFixed(1) : String(v);
}

function csvField(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** throughput.csv, byte for byte what parse_iperf.py --csv writes (CRLF included). */
export function throughputCsv(rows: IperfRow[]): string {
  const lines = [["date", "time", "down_mbits", "up_mbits", "note"]];
  for (const r of rows) {
    lines.push([
      `${pad(r.y, 4)}-${pad(r.mo)}-${pad(r.d)}`,
      `${pad(r.h)}:${pad(r.mi)}`,
      r.down != null ? pyFloat(r.down) : "",
      r.up != null ? pyFloat(r.up) : "",
      r.note,
    ]);
  }
  return lines.map((l) => l.map(csvField).join(",")).join("\r\n") + "\r\n";
}

/* ── devices.log ─────────────────────────────────────────────────── */

export interface DeviceDrop {
  /** First and last missed check, as the Pi's "YYYY-MM-DD HH:MM". */
  from: string;
  to: string;
  fromAt: number;
  toAt: number;
  missed: number;
}

export interface DeviceRecord {
  name: string;
  ip: string;
  checks: number;
  missed: number;
  /** One decimal place, as collect.sh prints it. */
  pctUp: number;
  first: string;
  last: string;
  firstAt: number;
  lastAt: number;
  /** Runs of consecutive missed checks. One run is one drop. */
  drops: DeviceDrop[];
}

const DEV_LINE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})\|([^|]*)\|([^|]*)\|(up|DOWN)\s*$/;

export function parseDevicesLog(text: string): { devices: DeviceRecord[]; lines: number; unreadable: number } {
  const by = new Map<string, DeviceRecord & { open: DeviceDrop | null }>();
  let lines = 0, unreadable = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    lines++;
    const m = DEV_LINE.exec(raw);
    if (!m) { unreadable++; continue; }
    const [, y, mo, d, h, mi, name, ip, state] = m;
    const stamp = `${y}-${mo}-${d} ${h}:${mi}`;
    const at = dublinWallToEpoch(+y, +mo, +d, +h, +mi);
    let rec = by.get(name);
    if (!rec) {
      rec = { name, ip, checks: 0, missed: 0, pctUp: 0, first: stamp, last: stamp, firstAt: at, lastAt: at, drops: [], open: null };
      by.set(name, rec);
    }
    rec.checks++;
    rec.ip = ip;
    rec.last = stamp;
    rec.lastAt = at;
    if (state === "DOWN") {
      rec.missed++;
      if (rec.open) { rec.open.to = stamp; rec.open.toAt = at; rec.open.missed++; }
      else { rec.open = { from: stamp, to: stamp, fromAt: at, toAt: at, missed: 1 }; rec.drops.push(rec.open); }
    } else {
      rec.open = null;
    }
  }
  const devices = Array.from(by.values())
    .map((r) => ({
      name: r.name, ip: r.ip, checks: r.checks, missed: r.missed,
      pctUp: Math.round(((r.checks - r.missed) * 1000) / r.checks) / 10,
      first: r.first, last: r.last, firstAt: r.firstAt, lastAt: r.lastAt, drops: r.drops,
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { devices, lines, unreadable };
}

/* ── What the trial log says, in the figures the report uses ─────── */

export interface TrialFigures {
  /** Hourly entries in the log. */
  tests: number;
  /** Entries with a reading in both directions. */
  complete: number;
  /** Entries where a direction is missing or the connection failed, with their times. */
  gaps: { at: number; stamp: string; note: string }[];
  down: Summary | null;
  up: Summary | null;
  evening: { down: ReturnType<typeof eveningSplit>; up: ReturnType<typeof eveningSplit> };
  firstAt: number | null;
  lastAt: number | null;
  /** Hours covered, first entry to last. */
  spanHours: number;
}

export function trialFigures(rows: IperfRow[]): TrialFigures {
  const gaps = rows
    .filter((r) => r.down == null || r.up == null)
    .map((r) => ({
      at: r.at,
      stamp: `${pad(r.y, 4)}-${pad(r.mo)}-${pad(r.d)} ${pad(r.h)}:${pad(r.mi)}`,
      note: r.note || (r.down == null && r.up == null ? "no reading" : r.down == null ? "no down reading" : "no up reading"),
    }));
  const firstAt = rows.length ? rows[0].at : null;
  const lastAt = rows.length ? rows[rows.length - 1].at : null;
  return {
    tests: rows.length,
    complete: rows.length - gaps.length,
    gaps,
    down: summarise(rows, "down"),
    up: summarise(rows, "up"),
    evening: { down: eveningSplit(rows, "down"), up: eveningSplit(rows, "up") },
    firstAt,
    lastAt,
    spanHours: firstAt != null && lastAt != null ? (lastAt - firstAt) / 3_600_000 : 0,
  };
}
