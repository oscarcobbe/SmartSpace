/**
 * What happens when a Pi reports back, and how its answers are read.
 *
 * Shared by the Pi's own route (src/app/api/network/pi) and the CRM pages, so
 * a measurement means the same thing wherever it is shown.
 */
import { parseIperfLog, parseDevicesLog, throughputCsv } from "./logs";
import { putFile, driveConfigured } from "./drive";
import {
  addEvent, bestLogs, getAssessment, logsFor, markLogFiled, markLogsCleared, updateAssessment,
  type Command, type Pi,
} from "./store";
import { PI_ACTIONS } from "./pi-protocol";
import type { Measured } from "./report-data";

const mbps = (x: unknown) => (typeof x === "number" ? `${x} Mbps` : "no reading");

/** One sentence for the history about an instruction that finished. */
export function describe(cmd: Command): string {
  const label = PI_ACTIONS[cmd.action]?.label ?? cmd.action;
  if (cmd.state === "failed") return `${label} failed: ${cmd.error ?? "no reason given"}`;
  if (cmd.state === "expired") return `${label} expired before the Pi called in`;
  const r = (cmd.result ?? {}) as Record<string, unknown>;
  switch (cmd.action) {
    case "measure": {
      const what = cmd.purpose === "baseline" ? "Baseline" : cmd.purpose === "final" ? "Final reading" : "Socket measured";
      return `${what}: ${mbps(r.down)} down, ${mbps(r.up)} up`;
    }
    case "check": return "Pre-departure check ran";
    case "start_trial": {
      const devs = Array.isArray(r.devices) ? r.devices.length : 0;
      const filed = r.archived && typeof r.archived === "object" ? ` The previous logs were filed on the Pi in ${(r.archived as { dir: string }).dir}.` : "";
      return `Trial started, watching ${devs} device${devs === 1 ? "" : "s"}.${filed}`;
    }
    case "watch_devices": return `Watched devices changed (${Array.isArray(r.devices) ? r.devices.length : 0})`;
    case "stop_watch": return "Device watch stopped";
    case "collect": {
      const files = Array.isArray(r.files) ? r.files.length : 0;
      return r.final ? `Logs collected (${files} file${files === 1 ? "" : "s"}); the trial is over` : `Logs looked at during the trial (${files} file${files === 1 ? "" : "s"})`;
    }
    case "clear_logs": {
      const deleted = Array.isArray(r.deleted) ? r.deleted.length : 0;
      const kept = Array.isArray(r.kept) ? r.kept.length : 0;
      return `Pi's copy cleared: ${deleted} file${deleted === 1 ? "" : "s"} deleted${kept ? `, ${kept} kept` : ""}`;
    }
  }
  return label;
}

/** The Pi finished an instruction: record it, and move the assessment on where it should. */
export async function afterCommand(pi: Pi, cmd: Command): Promise<{ fileLogs: boolean }> {
  const r = (cmd.result ?? {}) as Record<string, unknown>;
  const aid = cmd.assessment_id;
  await addEvent({ assessment_id: aid, pi_id: pi.id, kind: `pi:${cmd.action}`, summary: describe(cmd), detail: { command: cmd.id, purpose: cmd.purpose }, actor: pi.name });
  if (cmd.state !== "done" || !aid) return { fileLogs: false };

  if (cmd.action === "start_trial") {
    await updateAssessment(aid, { stage: "trial", trial_started_at: new Date().toISOString(), trial_ended_at: null, node_pi_id: pi.id });
  }
  if (cmd.action === "collect" && r.final === true) {
    await updateAssessment(aid, { stage: "collected", trial_ended_at: new Date().toISOString() });
    return { fileLogs: true };
  }
  if (cmd.action === "clear_logs" && Array.isArray(r.deleted)) {
    await markLogsCleared(aid, (r.deleted as { sha256: string }[]).map((d) => d.sha256).filter((x) => /^[0-9a-f]{64}$/.test(x)));
  }
  return { fileLogs: false };
}

/**
 * The logs into the customer's Data folder: iperf.log and devices.log as the
 * Pi wrote them, and throughput.csv exactly as parse_iperf.py writes it. Does
 * nothing until the folder exists and Drive is set up; the portal keeps every
 * copy either way.
 */
export async function fileLogsInDrive(assessmentId: string): Promise<{ ok: boolean; outcome: string }> {
  if (!driveConfigured()) return { ok: false, outcome: "Drive is not set up here" };
  const a = await getAssessment(assessmentId);
  if (!a?.drive?.dataId) return { ok: false, outcome: "no Drive folder yet" };
  const { iperf, devices } = await bestLogs(assessmentId);
  const filed: string[] = [];
  if (iperf) {
    const f = await putFile(a.drive.dataId, "iperf.log", "text/plain", iperf.content, true);
    await markLogFiled(iperf.id, f.id);
    await putFile(a.drive.dataId, "throughput.csv", "text/csv", throughputCsv(parseIperfLog(iperf.content).rows), true);
    filed.push("iperf.log", "throughput.csv");
  }
  if (devices) {
    const f = await putFile(a.drive.dataId, "devices.log", "text/plain", devices.content, true);
    await markLogFiled(devices.id, f.id);
    filed.push("devices.log");
  }
  if (filed.length) await addEvent({ assessment_id: assessmentId, kind: "drive:logs", summary: `Filed in Drive: ${filed.join(", ")}`, actor: "portal" });
  return { ok: true, outcome: filed.length ? `filed ${filed.join(", ")}` : "no logs yet" };
}

/* ── Reading the answers back ────────────────────────────────────── */

export function measuredFrom(cmd: Command | undefined): Measured | null {
  if (!cmd || cmd.state !== "done" || cmd.action !== "measure") return null;
  const r = (cmd.result ?? {}) as Record<string, unknown>;
  return {
    down: typeof r.down === "number" ? r.down : null,
    up: typeof r.up === "number" ? r.up : null,
    at: cmd.finished_at ?? cmd.created_at,
  };
}

/** The newest finished measurement for each purpose: "socket:<row>", "baseline", "final". */
export function readings(commands: Command[]): Map<string, Measured> {
  const out = new Map<string, Measured>();
  for (const c of [...commands].sort((a, b) => (a.finished_at ?? a.created_at).localeCompare(b.finished_at ?? b.created_at))) {
    const m = measuredFrom(c);
    if (m && c.purpose) out.set(c.purpose, m);
  }
  return out;
}

/** Instructions still waiting for, or being carried out by, the Pi. */
export function pending(commands: Command[]): Command[] {
  return commands.filter((c) => c.state === "queued" || c.state === "sent");
}

/** The parsed logs for an assessment, newest final copy first. */
export async function parsedLogs(assessmentId: string) {
  const { iperf, devices } = await bestLogs(assessmentId);
  return {
    iperfCopy: iperf,
    devicesCopy: devices,
    iperf: iperf ? parseIperfLog(iperf.content) : null,
    devices: devices ? parseDevicesLog(devices.content) : null,
  };
}

/** Archived logs on the Pi whose exact copy the portal holds, ready to be cleared. */
export async function clearable(assessmentId: string, pi: Pi | null): Promise<{ dir: string; name: string; sha256: string }[]> {
  if (!pi) return [];
  const held = new Set((await logsFor(assessmentId)).filter((l) => !l.cleared_on_pi_at).map((l) => l.sha256));
  const out: { dir: string; name: string; sha256: string }[] = [];
  for (const a of pi.status?.archive ?? []) {
    for (const f of a.files) if (held.has(f.sha256)) out.push({ dir: a.dir, name: f.name, sha256: f.sha256 });
  }
  return out;
}
