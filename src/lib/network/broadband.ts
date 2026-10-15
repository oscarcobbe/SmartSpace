/**
 * The broadband evidence test: reading broadband.csv, and the one-page
 * evidence report drawn from it.
 *
 * The Pi wired into the customer's router writes broadband.csv
 * (scripts/network-pi/agent.py, broadband_loop): every minute a "ping" row
 * for the internet (20 pings to 1.1.1.1) and one for the router (20 pings to
 * the gateway), and every so often a "speed" row (Cloudflare's speed test,
 * with 40 pings running during it for the lag under load).
 *
 * The router row is what makes it evidence. A minute where the internet is
 * silent but the router answers is the broadband. A minute where the router
 * is silent too is the cable, the Pi or the power, and the report must not
 * hand that to the provider as theirs.
 *
 * Kept free of imports so scripts/check-network-assessments.mjs can load it
 * on its own. The template is passed in for the same reason.
 */

export interface BbRow {
  /** Milliseconds since 1970, from the Pi's own epoch column. */
  at: number;
  kind: "ping" | "speed";
  target: "internet" | "router";
  sent: number;
  lost: number;
  avg: number | null;
  max: number | null;
  jitter: number | null;
  down: number | null;
  up: number | null;
  loadedSent: number | null;
  loadedLost: number | null;
  loadedAvg: number | null;
  error: string;
}

export interface BbParse {
  rows: BbRow[];
  /** Lines that were not a row the Pi writes (a power cut mid-line, say). */
  unreadable: number;
}

/** One CSV line, as Python's csv module writes it: commas, and quotes round a field that holds one. */
function csvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const num = (s: string | undefined): number | null => {
  if (s == null || s.trim() === "" || s === "None") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export function parseBroadbandCsv(text: string): BbParse {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], unreadable: 0 };
  const head = csvLine(lines[0]);
  const col = (name: string) => head.indexOf(name);
  const need = ["epoch", "kind", "target", "sent", "lost"];
  if (need.some((n) => col(n) < 0)) return { rows: [], unreadable: lines.length };
  const rows: BbRow[] = [];
  let unreadable = 0;
  for (const line of lines.slice(1)) {
    const f = csvLine(line);
    const get = (name: string) => (col(name) >= 0 ? f[col(name)] : undefined);
    const epoch = num(get("epoch"));
    const kind = get("kind");
    const target = get("target");
    if (f.length !== head.length || epoch == null || (kind !== "ping" && kind !== "speed") || (target !== "internet" && target !== "router")) {
      unreadable++;
      continue;
    }
    rows.push({
      at: epoch * 1000,
      kind,
      target,
      sent: num(get("sent")) ?? 0,
      lost: num(get("lost")) ?? 0,
      avg: num(get("avg_ms")),
      max: num(get("max_ms")),
      jitter: num(get("jitter_ms")),
      down: num(get("down_mbps")),
      up: num(get("up_mbps")),
      loadedSent: num(get("loaded_sent")),
      loadedLost: num(get("loaded_lost")),
      loadedAvg: num(get("loaded_avg_ms")),
      error: get("error") ?? "",
    });
  }
  rows.sort((a, b) => a.at - b.at);
  return { rows, unreadable };
}

/* ── Dublin time ─────────────────────────────────────────────────── */

const parts = (ms: number) => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { y: g("year"), mo: g("month"), d: g("day"), h: Number(g("hour")), mi: g("minute"), wd: g("weekday") };
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-18" in Dublin. */
export const dayKey = (ms: number) => { const p = parts(ms); return `${p.y}-${p.mo}-${p.d}`; };
/** "Sat 18 Oct" */
export const dayLabel = (ms: number) => { const p = parts(ms); return `${p.wd} ${Number(p.d)} ${MONTHS[Number(p.mo) - 1]}`; };
/** "21:14" */
export const clockLabel = (ms: number) => { const p = parts(ms); return `${String(p.h).padStart(2, "0")}:${p.mi}`; };
/** 18:00 to 23:00 in Dublin, the hours the assessment report calls the evening. */
export const isEvening = (ms: number) => { const h = parts(ms).h; return h >= 18 && h < 23; };

/* ── The figures ─────────────────────────────────────────────────── */

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const round1 = (x: number | null) => (x == null ? null : Math.round(x * 10) / 10);
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/** Two rows a minute apart belong to one run; a speed test can push the next minute out to about two. */
const SAME_RUN_MS = 150_000;
/** Longer than this with no row at all, the Pi was off or unplugged. */
const SILENCE_MS = 5 * 60_000;
/** Teams and Zoom start breaking up past this much jitter. */
const CALL_JITTER_MS = 30;

export interface PingFigures {
  minutes: number;
  sent: number;
  lost: number;
  lossPct: number;
  /** Minutes with at least one ping lost: each one is a moment a call would have stuttered. */
  minutesWithLoss: number;
  /** Minutes with every ping lost. */
  minutesDead: number;
  latencyMedian: number | null;
  latencyWorst: number | null;
  jitterMedian: number | null;
  /** Minutes where the jitter alone was enough to break up a video call. */
  minutesJittery: number;
}

export interface Outage {
  from: number;
  to: number;
  minutes: number;
  /** The router did not answer either, for most of it: the house side, not the broadband. */
  routerToo: boolean;
}

export interface Silence { from: number; to: number; minutes: number }

export interface SpeedTest { at: number; down: number | null; up: number | null; loadedAvg: number | null; loadedLossPct: number | null; failed: boolean }

export interface DayFigures {
  day: string;
  label: string;
  minutes: number;
  lossPct: number;
  outageMinutes: number;
  troubleMinutes: number;
  downMedian: number | null;
  downLowest: number | null;
}

export interface BroadbandFigures {
  from: number;
  to: number;
  spanHours: number;
  internet: PingFigures;
  router: PingFigures | null;
  outages: Outage[];
  /** Minutes the internet was gone while the router answered. */
  broadbandOutageMinutes: number;
  /** Minutes the router did not answer either. */
  houseOutageMinutes: number;
  /** Minutes a video call would have suffered: a ping lost, or jitter past 30 ms. */
  callTroubleMinutes: number;
  silences: Silence[];
  speeds: SpeedTest[];
  down: { median: number; lowest: number; highest: number } | null;
  up: { median: number; lowest: number; highest: number } | null;
  /** Median download in the evening (18:00 to 23:00) against the rest of the day. */
  eveningDown: { evening: number; rest: number } | null;
  /** Packet loss to the internet in the evening against the rest of the day, in percent. */
  eveningLoss: { evening: number; rest: number } | null;
  idleLatencyMedian: number | null;
  loadedLatencyMedian: number | null;
  days: DayFigures[];
  /** What the week shows, in one word, for the verdict. */
  finding: "broadband" | "house" | "both" | "clean" | "none";
}

function pingFigures(rows: BbRow[]): PingFigures {
  const sent = rows.reduce((s, r) => s + r.sent, 0);
  const lost = rows.reduce((s, r) => s + r.lost, 0);
  const lat = rows.map((r) => r.avg).filter((x): x is number => x != null);
  const worst = rows.map((r) => r.max).filter((x): x is number => x != null);
  const jit = rows.map((r) => r.jitter).filter((x): x is number => x != null);
  return {
    minutes: rows.length,
    sent,
    lost,
    lossPct: pct(lost, sent),
    minutesWithLoss: rows.filter((r) => r.lost > 0).length,
    minutesDead: rows.filter((r) => r.sent > 0 && r.lost >= r.sent).length,
    latencyMedian: round1(median(lat)),
    latencyWorst: worst.length ? Math.max(...worst) : null,
    jitterMedian: round1(median(jit)),
    minutesJittery: rows.filter((r) => r.jitter != null && r.jitter > CALL_JITTER_MS).length,
  };
}

const spread = (xs: number[]) => (xs.length ? { median: round1(median(xs))!, lowest: Math.min(...xs), highest: Math.max(...xs) } : null);

export function broadbandFigures(rows: BbRow[]): BroadbandFigures | null {
  const net = rows.filter((r) => r.kind === "ping" && r.target === "internet" && r.sent > 0);
  if (!net.length) return null;
  const routerRows = rows.filter((r) => r.kind === "ping" && r.target === "router" && r.sent > 0);
  const routerAt = (at: number) => routerRows.find((r) => Math.abs(r.at - at) < 30_000) ?? null;

  /* Outages: runs of minutes with every internet ping lost. */
  const outages: Outage[] = [];
  let run: BbRow[] = [];
  const close = () => {
    if (!run.length) return;
    const routerDead = run.filter((r) => { const x = routerAt(r.at); return x != null && x.lost >= x.sent; }).length;
    outages.push({ from: run[0].at, to: run[run.length - 1].at, minutes: run.length, routerToo: routerDead * 2 > run.length });
    run = [];
  };
  for (const r of net) {
    const dead = r.lost >= r.sent;
    if (dead && run.length && r.at - run[run.length - 1].at > SAME_RUN_MS) close();
    if (dead) run.push(r);
    else close();
  }
  close();

  const silences: Silence[] = [];
  for (let i = 1; i < net.length; i++) {
    const gap = net[i].at - net[i - 1].at;
    if (gap > SILENCE_MS) silences.push({ from: net[i - 1].at, to: net[i].at, minutes: Math.round(gap / 60_000) - 1 });
  }

  const speeds: SpeedTest[] = rows.filter((r) => r.kind === "speed").map((r) => ({
    at: r.at,
    down: r.down,
    up: r.up,
    loadedAvg: r.loadedAvg,
    loadedLossPct: r.loadedSent ? pct(r.loadedLost ?? 0, r.loadedSent) : null,
    failed: r.down == null && r.up == null,
  }));
  const downs = speeds.map((s) => s.down).filter((x): x is number => x != null);
  const ups = speeds.map((s) => s.up).filter((x): x is number => x != null);
  const evDown = speeds.filter((s) => s.down != null && isEvening(s.at)).map((s) => s.down!);
  const restDown = speeds.filter((s) => s.down != null && !isEvening(s.at)).map((s) => s.down!);
  const evNet = net.filter((r) => isEvening(r.at));
  const restNet = net.filter((r) => !isEvening(r.at));
  const lossOf = (rs: BbRow[]) => pct(rs.reduce((s, r) => s + r.lost, 0), rs.reduce((s, r) => s + r.sent, 0));

  const byDay = new Map<string, BbRow[]>();
  for (const r of net) {
    const k = dayKey(r.at);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(r);
  }
  const trouble = (r: BbRow) => r.lost > 0 || (r.jitter != null && r.jitter > CALL_JITTER_MS);
  const days: DayFigures[] = Array.from(byDay.entries()).map(([day, rs]) => {
    const dDown = speeds.filter((s) => s.down != null && dayKey(s.at) === day).map((s) => s.down!);
    return {
      day,
      label: dayLabel(rs[0].at),
      minutes: rs.length,
      lossPct: lossOf(rs),
      outageMinutes: outages.filter((o) => dayKey(o.from) === day).reduce((s, o) => s + o.minutes, 0),
      troubleMinutes: rs.filter(trouble).length,
      downMedian: round1(median(dDown)),
      downLowest: dDown.length ? Math.min(...dDown) : null,
    };
  });

  const internet = pingFigures(net);
  const router = routerRows.length ? pingFigures(routerRows) : null;
  const broadbandOutageMinutes = outages.filter((o) => !o.routerToo).reduce((s, o) => s + o.minutes, 0);
  const houseOutageMinutes = outages.filter((o) => o.routerToo).reduce((s, o) => s + o.minutes, 0);

  /* Loss beyond the router is the broadband's only when the router itself
     answered cleanly: loss to both is something in the house first. */
  const routerClean = !router || router.lossPct < 0.5;
  const netBad = internet.lossPct >= 1 || broadbandOutageMinutes > 0 || internet.minutesJittery > internet.minutes * 0.02;
  const houseBad = (router != null && router.lossPct >= 1) || houseOutageMinutes > 0;
  const finding: BroadbandFigures["finding"] = netBad && routerClean ? "broadband"
    : netBad && houseBad ? "both"
    : houseBad ? "house"
    : "clean";

  return {
    from: net[0].at,
    to: net[net.length - 1].at,
    spanHours: (net[net.length - 1].at - net[0].at) / 3_600_000,
    internet,
    router,
    outages,
    broadbandOutageMinutes,
    houseOutageMinutes,
    callTroubleMinutes: net.filter(trouble).length,
    silences,
    speeds,
    down: spread(downs),
    up: spread(ups),
    eveningDown: evDown.length && restDown.length ? { evening: round1(median(evDown))!, rest: round1(median(restDown))! } : null,
    eveningLoss: evNet.length && restNet.length ? { evening: lossOf(evNet), rest: lossOf(restNet) } : null,
    idleLatencyMedian: internet.latencyMedian,
    loadedLatencyMedian: round1(median(speeds.map((s) => s.loadedAvg).filter((x): x is number => x != null))),
    days,
    finding,
  };
}

/* ── The evidence report ─────────────────────────────────────────── */

export interface EvidenceSource {
  customerName: string;
  address: string | null;
  provider: string | null;
  packageMbps: number | null;
  figures: BroadbandFigures;
  /** Minutes between speed tests, as the test was started; 0 for none. */
  speedEvery: number | null;
  reportDate: string;
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const mbps = (x: number | null | undefined) => (x == null ? "no reading" : `${x} Mbps`);
const ms = (x: number | null | undefined) => (x == null ? "no reading" : `${x} ms`);
const span = (o: { from: number; to: number }) =>
  dayKey(o.from) === dayKey(o.to) ? `${dayLabel(o.from)}, ${clockLabel(o.from)} to ${clockLabel(o.to)}` : `${dayLabel(o.from)} ${clockLabel(o.from)} to ${dayLabel(o.to)} ${clockLabel(o.to)}`;
const duration = (minutes: number) => (minutes < 60 ? plural(minutes, "minute") : `${plural(Math.floor(minutes / 60), "hour")}${minutes % 60 ? ` ${plural(minutes % 60, "minute")}` : ""}`);

/** What the week shows, said plainly, from the figures and nothing else. */
export function evidenceVerdict(src: EvidenceSource): { headline: string; lines: string[] } {
  const f = src.figures;
  const who = src.provider ? `your ${src.provider} connection` : "your broadband";
  const lines: string[] = [];
  const over = f.spanHours < 24 ? plural(Math.max(1, Math.round(f.spanHours)), "hour") : plural(Math.round(f.spanHours / 24), "day");
  if (f.broadbandOutageMinutes > 0) {
    const n = f.outages.filter((o) => !o.routerToo).length;
    lines.push(`The internet went completely for ${duration(f.broadbandOutageMinutes)} in all, in ${plural(n, "separate drop")}, while your router stayed up and answering. Those drops were beyond your router.`);
  }
  if (f.internet.lossPct >= 1) {
    lines.push(`${f.internet.lossPct}% of the test signals sent to the internet never came back. Below 1% is normal; above it, video calls freeze and drop.`);
  } else if (f.internet.minutesWithLoss > 0) {
    lines.push(`Overall loss to the internet was ${f.internet.lossPct}%, within the normal range, though ${plural(f.internet.minutesWithLoss, "minute")} had some loss.`);
  }
  if (f.callTroubleMinutes > 0) {
    lines.push(`A video call would have stuttered or frozen in ${plural(f.callTroubleMinutes, "minute")} of the ${f.internet.minutes} measured.`);
  }
  if (f.eveningLoss && f.eveningLoss.evening >= 1 && f.eveningLoss.evening > f.eveningLoss.rest * 2) {
    lines.push(`It was worse in the evening (18:00 to 23:00): ${f.eveningLoss.evening}% loss, against ${f.eveningLoss.rest}% the rest of the day.`);
  }
  if (src.packageMbps && f.down) {
    const share = Math.round((f.down.median / src.packageMbps) * 100);
    lines.push(`Download speed was ${mbps(f.down.median)} on a typical test and ${mbps(f.down.lowest)} at its lowest, against the ${src.packageMbps} Mbps package: ${share}% of it on a typical test.`);
  }
  if (f.houseOutageMinutes > 0) {
    lines.push(`For ${duration(f.houseOutageMinutes)} the router did not answer either. That points at the router, its power or our box's cable rather than the broadband, so we have not counted it against ${who}.`);
  }
  if (f.silences.length) {
    const total = f.silences.reduce((s, x) => s + x.minutes, 0);
    lines.push(`Our box recorded nothing for ${duration(total)} (${plural(f.silences.length, "gap")}), most likely while it was unplugged or the power was off. Those minutes are left out rather than guessed.`);
  }
  const headline = f.finding === "broadband" ? `Over ${over}, the trouble was in ${who}, not in your home.`
    : f.finding === "both" ? `Over ${over}, ${who} dropped out, and there was also trouble on the house side of the router.`
    : f.finding === "house" ? `Over ${over}, ${who} itself held up; the trouble was on the house side of the router.`
    : `Over ${over}, ${who} held up: no drops and no loss worth reporting.`;
  if (!lines.length) lines.push("Every minute measured had a working connection, with loss and jitter inside the normal range for video calls.");
  return { headline, lines };
}

/**
 * The page, in the house style: the head, letterhead and legal line come
 * from the assessment template (docs/report-style/SKILL.md, "Any other
 * report"), and the body only uses parts its stylesheet already has.
 */
export function renderEvidence(template: string, src: EvidenceSource): string {
  const f = src.figures;
  const head = (template.split("</head>")[0] ?? "")
    .replace(/<title>[^<]*<\/title>/, `<title>Broadband evidence report, ${esc(src.customerName)}</title>`)
    .replace(/Home network assessment"/, 'Broadband evidence report"');
  const letterhead = /<div class="letterhead">[\s\S]*?<\/div>\s*<\/div>/.exec(template)?.[0] ?? "";
  const legal = /<p class="legal">[\s\S]*?<\/p>/.exec(template)?.[0] ?? "";
  const v = evidenceVerdict(src);
  const pill = (good: boolean, fair: boolean, text: string) => `<span class="pill ${good ? "good" : fair ? "fair" : "poor"}">${esc(text)}</span>`;

  const outageRows = f.outages.length
    ? f.outages.map((o) => `<tr><td>${esc(span(o))}</td><td class="n">${esc(duration(o.minutes))}</td><td>${o.routerToo ? "Router silent too: house side" : "Router up: beyond the router"}</td></tr>`).join("")
    : `<tr><td colspan="3">No drops: the internet answered in every minute measured.</td></tr>`;
  const dayRows = f.days.map((d) => `<tr><td style="white-space:nowrap">${esc(d.label)}</td><td class="n">${d.minutes}</td><td class="n">${d.lossPct}%</td><td class="n">${d.outageMinutes}</td><td class="n">${d.troubleMinutes}</td><td class="n">${d.downMedian ?? "-"}</td><td class="n">${d.downLowest ?? "-"}</td></tr>`).join("");
  const speedText = f.speeds.length
    ? `${plural(f.speeds.length, "speed test")}${src.speedEvery ? `, one every ${src.speedEvery} minutes` : ""}${f.speeds.some((s) => s.failed) ? `, of which ${f.speeds.filter((s) => s.failed).length} reached nothing at all` : ""}.`
    : "No speed tests were run, at your request, to keep within your data allowance.";

  const body = `
<div class="sheet">
${letterhead}
<header class="cover">
  <p class="kicker">Broadband evidence report</p>
  <h1>${esc(src.customerName)}</h1>
  <div class="meta">
    ${src.address ? `<div><span>Address</span>${esc(src.address)}</div>` : ""}
    <div><span>Provider</span>${esc(src.provider ?? "Not given")}${src.packageMbps ? `, ${src.packageMbps} Mbps package` : ""}</div>
    <div><span>Measured</span>${esc(dayLabel(f.from))} ${esc(clockLabel(f.from))} to ${esc(dayLabel(f.to))} ${esc(clockLabel(f.to))}</div>
    <div><span>Report date</span>${esc(src.reportDate)}</div>
  </div>
</header>

<div class="verdict"><h2>What we found</h2><p>${esc(v.headline)}</p><div class="after">${v.lines.map(esc).join("<br><br>")}</div></div>

<section>
  <div class="shead"><div class="n">1</div><div class="t"><h2>How it was measured</h2>
    <p class="gloss">A small box of ours, wired by cable straight into your router, so your Wi-Fi plays no part in these figures.</p></div></div>
  <p>Every minute, day and night, it sent 20 test signals to the internet and 20 to your router, and timed each one coming back. A signal that never comes back is a lost packet: on a video call that is a frozen picture or a dropped word. Checking the router at the same moment tells the two kinds of fault apart: if the router answers and the internet does not, the problem is beyond your home. ${esc(speedText)}</p>
</section>

<section>
  <div class="shead"><div class="n">2</div><div class="t"><h2>The connection, minute by minute</h2>
    <p class="gloss">${f.internet.minutes} minutes measured over ${Math.round(f.spanHours)} hours.</p></div></div>
  <div class="scroll"><table>
    <tr><th></th><th class="n">To the internet</th><th class="n">To your router</th></tr>
    <tr><td>Signals lost</td><td class="n">${f.internet.lossPct}% ${pill(f.internet.lossPct < 0.5, f.internet.lossPct < 1, f.internet.lossPct < 0.5 ? "Normal" : f.internet.lossPct < 1 ? "Borderline" : "Too high")}</td><td class="n">${f.router ? `${f.router.lossPct}%` : "not measured"}</td></tr>
    <tr><td>Minutes with any loss</td><td class="n">${f.internet.minutesWithLoss}</td><td class="n">${f.router?.minutesWithLoss ?? "-"}</td></tr>
    <tr><td>Minutes completely cut off</td><td class="n">${f.internet.minutesDead}</td><td class="n">${f.router?.minutesDead ?? "-"}</td></tr>
    <tr><td>Response time, typical</td><td class="n">${ms(f.internet.latencyMedian)}</td><td class="n">${ms(f.router?.latencyMedian)}</td></tr>
    <tr><td>Jitter, typical (under 30 ms suits video calls)</td><td class="n">${ms(f.internet.jitterMedian)}</td><td class="n">${ms(f.router?.jitterMedian)}</td></tr>
    <tr><td>Minutes too jittery for a video call</td><td class="n">${f.internet.minutesJittery}</td><td class="n">${f.router?.minutesJittery ?? "-"}</td></tr>
  </table></div>
</section>

<section>
  <div class="shead"><div class="n">3</div><div class="t"><h2>Every drop</h2>
    <p class="gloss">Each run of minutes in which not one signal reached the internet.</p></div></div>
  <div class="scroll"><table>
    <tr><th>When</th><th class="n">How long</th><th>Your router</th></tr>
    ${outageRows}
  </table></div>
</section>

${f.speeds.length ? `<section>
  <div class="shead"><div class="n">4</div><div class="t"><h2>Speed</h2>
    <p class="gloss">${esc(speedText)}</p></div></div>
  <div class="scroll"><table>
    <tr><th></th><th class="n">Typical</th><th class="n">Lowest</th><th class="n">Highest</th></tr>
    <tr><td>Download</td><td class="n">${mbps(f.down?.median)}</td><td class="n">${mbps(f.down?.lowest)}</td><td class="n">${mbps(f.down?.highest)}</td></tr>
    <tr><td>Upload</td><td class="n">${mbps(f.up?.median)}</td><td class="n">${mbps(f.up?.lowest)}</td><td class="n">${mbps(f.up?.highest)}</td></tr>
  </table></div>
  ${f.eveningDown ? `<p>Evening (18:00 to 23:00) download was ${mbps(f.eveningDown.evening)} on a typical test, against ${mbps(f.eveningDown.rest)} the rest of the day.</p>` : ""}
  ${f.loadedLatencyMedian != null ? `<p>Response time while the line was busy with a speed test was ${ms(f.loadedLatencyMedian)}, against ${ms(f.idleLatencyMedian)} when quiet. A big rise means a call suffers whenever someone else in the house is downloading.</p>` : ""}
</section>` : ""}

<section>
  <div class="shead"><div class="n">${f.speeds.length ? 5 : 4}</div><div class="t"><h2>Day by day</h2>
    <p class="gloss">Minutes measured, minutes completely cut off, and trouble minutes, when a video call would have stuttered: any signal lost, or jitter over 30 ms. Download in Mbps.</p></div></div>
  <div class="scroll"><table>
    <tr><th>Day</th><th class="n">Minutes</th><th class="n">Loss</th><th class="n">Cut off</th><th class="n">Trouble</th><th class="n">Down, typical</th><th class="n">Down, lowest</th></tr>
    ${dayRows}
  </table></div>
</section>

<footer class="foot">
  <p>Measured by SmartSpace Networks. You are welcome to send this report to your provider.</p>
  ${legal}
</footer>
</div>`;
  return `${head}</head>\n<body>${body}\n</body>\n</html>\n`;
}
