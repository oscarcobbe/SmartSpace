/**
 * What the portal may ask a Pi to do, and nothing else.
 *
 * The Pis spend three days at a time inside customers' homes, on the
 * customer's own network. Whoever can queue an instruction can make a Pi do
 * something there, and the CRM sits behind a one-letter password. So the Pi
 * runs only the seven actions below, each with fixed programs and fixed
 * arguments, and the only values that come from the portal are checked twice:
 * here, before anything is queued, and again on the Pi
 * (scripts/network-pi/agent.py), which also refuses any action it does not
 * know. No value from the portal is ever run as a command: device names are
 * written to devices.conf and never reach a shell, and addresses must be
 * private IPv4 addresses before anything pings them.
 *
 * Every instruction expires. One queued for a house the Pi never reached must
 * not run days later in a different house, so an instruction that only makes
 * sense on site lives for minutes, not days.
 *
 * scripts/check-network-assessments.mjs fails the build if agent.py's list of
 * actions differs from this one, or if agent.py ever passes a string to a
 * shell.
 *
 * Kept free of imports so the build check can load it on its own.
 */

export const PI_ACTIONS = {
  /** iperf3 to the Pi at the router, both directions. The socket hunt, the baseline and the final reading. */
  measure: { ttlMinutes: 10, label: "Measure" },
  /** Everything the pre-departure check needs, read live on the node Pi. */
  check: { ttlMinutes: 10, label: "Pre-departure check" },
  /** File the previous logs in the Pi's archive, start fresh ones, watch the named devices. */
  start_trial: { ttlMinutes: 30, label: "Start the trial" },
  /** Change the watched devices without touching the logs. */
  watch_devices: { ttlMinutes: 30, label: "Change the watched devices" },
  /** Stop pinging the devices. Nothing is deleted. */
  stop_watch: { ttlMinutes: 60 * 24, label: "Stop the device watch" },
  /** Send iperf.log and devices.log to the portal. "final" files them in the archive first. */
  collect: { ttlMinutes: 60 * 24, label: "Collect the logs" },
  /** Delete archived logs on the Pi whose exact copy (by SHA-256) the portal holds. */
  clear_logs: { ttlMinutes: 60 * 24 * 7, label: "Clear the Pi's copy" },
} as const;

export type PiAction = keyof typeof PI_ACTIONS;

export const PI_ACTION_NAMES = Object.keys(PI_ACTIONS) as PiAction[];

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** An archive folder on the Pi: the moment it was filed, and the first eight of the assessment id. */
export const ARCHIVE_DIR_RE = /^\d{8}-\d{6}(?:-[0-9a-f]{8})?$/;

export const LOG_NAMES = ["iperf.log", "devices.log"] as const;

/** A device name as devicewatch.sh can write it: no pipe, no line break, no control characters. */
export function cleanDeviceName(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[|\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

/**
 * A private IPv4 address, written plainly. The trial network is the Deco's,
 * 192.168.68.x, but a customer's own router can hand out any private range.
 */
export function privateIpv4(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((n, i) => n > 255 || String(n) !== m[i + 1])) return null;
  const [a, b] = o;
  const isPrivate = a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  if (!isPrivate) return null;
  if (o[3] === 0 || o[3] === 255) return null;
  return o.join(".");
}

export type DeviceArg = { name: string; ip: string };

export type ArgsFor = {
  measure: { seconds: number };
  check: Record<string, never>;
  start_trial: { assessment: string; devices: DeviceArg[] };
  watch_devices: { assessment: string; devices: DeviceArg[] };
  stop_watch: { assessment: string };
  collect: { assessment: string; final: boolean };
  clear_logs: { assessment: string; files: { dir: string; name: string; sha256: string }[] };
};

export type CheckedArgs<A extends PiAction> = { ok: true; args: ArgsFor[A] } | { ok: false; why: string };

function devicesFrom(raw: unknown): { devices: DeviceArg[] } | { why: string } {
  if (!Array.isArray(raw)) return { why: "The device list is not a list." };
  if (raw.length > 12) return { why: "No more than twelve devices can be watched." };
  const out: DeviceArg[] = [];
  const seen = new Set<string>();
  for (const d of raw) {
    const name = cleanDeviceName((d as DeviceArg)?.name);
    const ip = privateIpv4((d as DeviceArg)?.ip);
    if (!name) return { why: "Every watched device needs a name." };
    if (!ip) return { why: `${name}: "${String((d as DeviceArg)?.ip ?? "")}" is not an address on a home network.` };
    if (seen.has(name)) return { why: `${name} is listed twice.` };
    seen.add(name);
    out.push({ name, ip });
  }
  return { devices: out };
}

/** Checks the arguments for an action, the same way the Pi will. */
export function checkArgs<A extends PiAction>(action: A, raw: unknown): CheckedArgs<A> {
  const a = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const assessment = typeof a.assessment === "string" && UUID_RE.test(a.assessment) ? a.assessment : null;
  switch (action) {
    case "measure": {
      const seconds = a.seconds == null ? 10 : Number(a.seconds);
      if (!Number.isInteger(seconds) || seconds < 3 || seconds > 30) return { ok: false, why: "A measurement runs for 3 to 30 seconds." };
      return { ok: true, args: { seconds } as ArgsFor[A] };
    }
    case "check":
      return { ok: true, args: {} as ArgsFor[A] };
    case "start_trial":
    case "watch_devices": {
      if (!assessment) return { ok: false, why: "No assessment to start the trial for." };
      const d = devicesFrom(a.devices ?? []);
      if ("why" in d) return { ok: false, why: d.why };
      return { ok: true, args: { assessment, devices: d.devices } as ArgsFor[A] };
    }
    case "stop_watch":
      if (!assessment) return { ok: false, why: "No assessment given." };
      return { ok: true, args: { assessment } as ArgsFor[A] };
    case "collect":
      if (!assessment) return { ok: false, why: "No assessment to collect the logs for." };
      return { ok: true, args: { assessment, final: a.final === true } as ArgsFor[A] };
    case "clear_logs": {
      if (!assessment) return { ok: false, why: "No assessment given." };
      if (!Array.isArray(a.files) || a.files.length === 0 || a.files.length > 20) return { ok: false, why: "No files named to clear." };
      const files: { dir: string; name: string; sha256: string }[] = [];
      for (const f of a.files as Record<string, unknown>[]) {
        const dir = String(f?.dir ?? ""), name = String(f?.name ?? ""), sha256 = String(f?.sha256 ?? "");
        if (!ARCHIVE_DIR_RE.test(dir)) return { ok: false, why: `"${dir}" is not an archive folder.` };
        if (!(LOG_NAMES as readonly string[]).includes(name)) return { ok: false, why: `"${name}" is not a log.` };
        if (!/^[0-9a-f]{64}$/.test(sha256)) return { ok: false, why: "A file to clear has no fingerprint." };
        files.push({ dir, name, sha256 });
      }
      return { ok: true, args: { assessment, files } as ArgsFor[A] };
    }
    default:
      return { ok: false, why: "That is not something a Pi can be asked to do." };
  }
}

/** How long the Pi should wait before calling in again. */
export function pollSeconds(fast: boolean): number {
  return fast ? 5 : 60;
}
