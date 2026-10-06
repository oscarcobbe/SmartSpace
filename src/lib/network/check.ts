/**
 * The pre-departure check, as Nigel's check.sh prints it.
 *
 * check.sh ran on his Mac and asked both Pis over SSH. Here the node Pi reads
 * the same things itself when asked (the "check" instruction), the Pi at the
 * router reports its own every time it calls in, and this puts the two
 * together in check.sh's order and, where it can, its words. The sentences
 * that told him which command to type now say what to press instead, because
 * there is no terminal on the CRM.
 *
 * What check.sh could not see, it cannot see either: whether the Deco app
 * shows the far unit as wired, whether the customer was told. Those stay as
 * the "by eye" list, and their ticks are the trial section's.
 *
 * Kept free of imports so the build check can load it on its own.
 */

export type Level = "ok" | "note" | "fail";
export interface CheckLine { level: Level; text: string }
export interface CheckSection { title: string; lines: CheckLine[]; extra?: { label: string; value: string }[] }
export interface CheckResult {
  sections: CheckSection[];
  pass: number;
  warn: number;
  fail: number;
  summary: string;
  ranAt: string | null;
}

/** What the node Pi returns for a "check" instruction (scripts/network-pi/agent.py, node_check). */
export interface NodeCheck {
  hostname?: string;
  ip_eth0?: string | null;
  gateway?: string | null;
  cron_iperf?: number;
  cron_sched?: string | null;
  cron_both?: number;
  log_lines?: number;
  log_first?: string | null;
  today?: string;
  throttled?: string | null;
  temp_c?: number | null;
  rpi_connect?: string | null;
  disk_pct?: string | null;
  uptime_s?: number;
  live?: { down: number | null; up: number | null; error?: string | null };
  devices?: {
    conf: { name: string; ip: string }[] | null;
    cron: number;
    log_lines: number;
    results: { name: string; ip: string; up: boolean }[];
  };
}

/** What the Pi at the router last said about itself, and when. */
export interface ServerStatus {
  hostname?: string;
  ip_eth0?: string | null;
  gateway?: string | null;
  iperf3_running?: number;
  reboot_cron?: number;
  throttled?: string | null;
  temp_c?: number | null;
  uptime_s?: number;
  disk_pct?: string | null;
}

export const BY_EYE = [
  { key: "wired", text: "Deco app shows the far unit as a WIRED node, not wireless" },
  { key: "devicesMoved", text: "Named problem devices moved onto the trial SSID, with DHCP reservations set" },
  { key: "decoShot", text: "Deco device list screenshotted" },
  { key: "ownWifi", text: "Customer's own Wi-Fi still switched on" },
  { key: "tape", text: "Adapter sockets marked with tape" },
  { key: "saidUnplug", text: "Customer told: do not unplug these, collection is on the agreed day" },
] as const;

function power(throttled: string | null | undefined, cut: string, lines: CheckLine[]) {
  const th = throttled ?? "";
  if (/0x0$/.test(th)) lines.push({ level: "ok", text: "power clean" });
  else if (!th) lines.push({ level: "note", text: "could not read power status" });
  else lines.push({ level: "note", text: `power warning: ${th}. ${cut}` });
}

/**
 * @param node        the node Pi's answer to "check", or null if it has not answered
 * @param server      the router Pi's latest report, or null if it has never called in
 * @param serverSeenAgoS seconds since the router Pi last called in
 */
export function buildCheck(input: {
  node: NodeCheck | null;
  nodeName: string;
  server: ServerStatus | null;
  serverName: string;
  serverSeenAgoS: number | null;
  ranAt: string | null;
}): CheckResult {
  const { node, server } = input;
  const sections: CheckSection[] = [];

  /* ── The Pi at the router ── */
  const s: CheckLine[] = [];
  const serverUp = server != null && input.serverSeenAgoS != null && input.serverSeenAgoS < 180;
  if (!serverUp) {
    s.push({
      level: "fail",
      text: input.serverSeenAgoS == null
        ? `${input.serverName} has never called in. Check it is powered and on the network.`
        : `${input.serverName} has not called in for ${Math.round(input.serverSeenAgoS / 60)} min. Check it is powered and on the network.`,
    });
  } else {
    s.push({ level: "ok", text: `reachable: ${input.serverName} called in ${Math.round(input.serverSeenAgoS!)}s ago` });
    s.push(server!.ip_eth0
      ? { level: "ok", text: `wired, address ${server!.ip_eth0}` }
      : { level: "fail", text: "no address on eth0. The Ethernet lead is not working." });
    s.push((server!.iperf3_running ?? 0) > 0
      ? { level: "ok", text: "iperf3 server running" }
      : { level: "fail", text: "iperf3 server NOT running. Restart the Pi at the router, or run: iperf3 -s -D" });
    s.push((server!.reboot_cron ?? 0) > 0
      ? { level: "ok", text: "restarts itself after a power cut" }
      : { level: "note", text: "no @reboot line. A power cut would stop the tests." });
    power(server!.throttled, "Check the supply.", s);
    if (server!.temp_c != null) s.push(server!.temp_c < 70 ? { level: "ok", text: `temperature ${server!.temp_c}C` } : { level: "note", text: `running warm at ${server!.temp_c}C` });
    if (server!.uptime_s != null && server!.uptime_s < 300) s.push({ level: "note", text: `only up ${Math.floor(server!.uptime_s / 60)} min. Did it just restart?` });
    if (server!.disk_pct) s.push({ level: "ok", text: `card ${server!.disk_pct} full` });
  }
  sections.push({ title: "The Pi at the router", lines: s });

  /* ── The Pi on the trial floor ── */
  const n: CheckLine[] = [];
  if (!node) {
    n.push({ level: "fail", text: `${input.nodeName} has not answered. Check it is powered and plugged into the adapter.` });
  } else {
    n.push({ level: "ok", text: `reachable: ${input.nodeName} answered` });
    n.push(node.ip_eth0
      ? { level: "ok", text: `wired through the adapter, address ${node.ip_eth0}` }
      : { level: "fail", text: "no address on eth0. The powerline link is not carrying traffic." });
    const sg = serverUp ? server!.gateway : null;
    if (sg && node.gateway && sg !== node.gateway) {
      n.push({ level: "fail", text: `the two Pis are on different networks (${sg} vs ${node.gateway}). Double NAT: move the source adapter to the same box.` });
    } else if (node.gateway) {
      n.push({ level: "ok", text: sg ? "both Pis on the same network" : `gateway ${node.gateway}` });
    }
    n.push((node.cron_iperf ?? 0) > 0
      ? { level: "ok", text: `hourly test scheduled (${node.cron_sched ?? "?"})` }
      : { level: "fail", text: "NO hourly test scheduled. Nothing will be logged for three days. Start the trial again to schedule it." });
    n.push((node.cron_both ?? 0) > 0
      ? { level: "ok", text: "logging both directions" }
      : { level: "note", text: "logging one direction only." });
    const ll = node.log_lines ?? 0;
    const today = (node.today ?? "").trim().replace(/\s+/g, " ");
    /* check.sh greps the first line for "6 Oct"; whole words here, so "16 Oct" is not today on the 6th. */
    const startedToday = !!today && new RegExp(`(^|\\s)${today.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`)
      .test((node.log_first ?? "").replace(/\s+/g, " "));
    if (!ll) n.push({ level: "note", text: "log is empty. Fine if the first test has not run yet, but confirm one lands before you leave." });
    else if (startedToday) n.push({ level: "ok", text: `log started today, ${ll} readings so far` });
    else n.push({ level: "fail", text: `log holds OLD data from ${node.log_first ?? "an earlier day"}. Start the trial to file it away and begin a fresh log.` });
    power(node.throttled, "If on the battery bank, swap to a socket.", n);
    if (node.temp_c != null && node.temp_c >= 70) n.push({ level: "note", text: `running warm at ${node.temp_c}C` });
    /* rpi-connect prints "Signed in: yes" or "Signed in: no". check.sh looked
       for "not signed in", which the current rpi-connect never prints, so it
       called a signed-out Pi reachable. Both wordings are read here. */
    const cn = (node.rpi_connect ?? "").toLowerCase();
    if (cn.includes("not signed in") || /signed in:\s*no\b/.test(cn)) n.push({ level: "note", text: "Raspberry Pi Connect not signed in. The portal still hears from the Pi, but you have no way in by hand." });
    else if (cn.includes("signed in")) n.push({ level: "ok", text: "Raspberry Pi Connect signed in, as a way in by hand" });
    if (node.disk_pct) n.push({ level: "ok", text: `card ${node.disk_pct} full` });
  }
  sections.push({ title: "The Pi on the trial floor", lines: n });

  /* ── Live test through the adapters ── */
  const l: CheckLine[] = [];
  const extra: { label: string; value: string }[] = [];
  if (node && serverUp) {
    const down = node.live?.down ?? null, up = node.live?.up ?? null;
    if (down != null) {
      extra.push({ label: "down (streaming direction)", value: `${down} Mbps` });
      extra.push({ label: "up (cameras and calls)", value: up != null ? `${up} Mbps` : "no reading" });
      l.push(down >= 100 ? { level: "ok", text: "throughput good" } : { level: "note", text: "below 100 Mbps. Quote a ceiling, or try another socket." });
      if (down > 0 && up != null && up > 0 && (Math.floor(up / down) >= 2 || Math.floor(down / up) >= 2)) {
        l.push({ level: "note", text: "the two directions differ by more than double. Worth a second reading." });
      }
    } else {
      l.push({ level: "fail", text: `the live test returned nothing. The path is not working.${node.live?.error ? ` (${node.live.error})` : ""}` });
    }
  } else {
    l.push({ level: "fail", text: "skipped: one of the Pis is unreachable." });
  }
  sections.push({ title: "Live test through the adapters", lines: l, extra });

  /* ── The named devices ── */
  const d: CheckLine[] = [];
  if (node) {
    const dv = node.devices;
    if (!dv || !dv.conf || dv.conf.length === 0) {
      d.push({ level: "note", text: "no devices being watched. Add them under Move the named devices onto the trial network, then start the trial." });
    } else {
      d.push(dv.cron > 0
        ? { level: "ok", text: "device watch scheduled, every two minutes" }
        : { level: "fail", text: "devices listed but the watch is NOT scheduled. Press Change the watched devices." });
      d.push(dv.log_lines > 0
        ? { level: "ok", text: `${dv.log_lines} device readings logged so far` }
        : { level: "note", text: "device log still empty. The first check runs within two minutes." });
      for (const r of dv.results) {
        d.push(r.up
          ? { level: "ok", text: `${r.name} answers at ${r.ip}` }
          : { level: "fail", text: `${r.name} does NOT answer at ${r.ip}. Fix the IP now, or it logs as down for three days.` });
      }
    }
  }
  sections.push({ title: "The named devices on the trial network", lines: d });

  const all = sections.flatMap((x) => x.lines);
  const pass = all.filter((x) => x.level === "ok").length;
  const warn = all.filter((x) => x.level === "note").length;
  const fail = all.filter((x) => x.level === "fail").length;
  const summary = fail
    ? `${fail} problem${fail === 1 ? "" : "s"} to fix before you leave. (${pass} ok, ${warn} to check)`
    : warn
      ? `Nothing broken, ${warn} thing${warn === 1 ? "" : "s"} worth a look. (${pass} ok)`
      : `All ${pass} checks passed. Safe to leave.`;
  return { sections, pass, warn, fail, summary, ranAt: input.ranAt };
}
