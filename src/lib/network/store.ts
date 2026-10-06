/**
 * The assessments, the Pis and their instructions, read from and written to
 * the CRM database through crm(), the same way as every other CRM table.
 *
 * Nothing here is cached: every read is no-store, because the pages that use
 * it are watched while a Pi is working.
 */
import { createHash, randomBytes } from "crypto";
import { crm, unlessWrongKey } from "@/lib/crm/db";
import { PI_ACTIONS, checkArgs, type PiAction } from "./pi-protocol";
import type { Capture, SectionValues } from "./capture";

export type Stage = "booked" | "visit" | "trial" | "collected" | "reported" | "closed" | "cancelled";

export const STAGES: { value: Stage; label: string }[] = [
  { value: "booked", label: "Booked" },
  { value: "visit", label: "Visit under way" },
  { value: "trial", label: "Trial running" },
  { value: "collected", label: "Collected" },
  { value: "reported", label: "Report approved" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export interface DriveRefs {
  folderId?: string;
  folderName?: string;
  dataId?: string;
  photosId?: string;
  reportId?: string;
  sheetId?: string;
  madeAt?: string;
}

export interface Assessment {
  id: string;
  contact_id: string | null;
  customer_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  eircode: string | null;
  stage: Stage;
  visit_at: string | null;
  collection_at: string | null;
  review_call_at: string | null;
  paid_ref: string | null;
  capture: Capture;
  node_pi_id: string | null;
  server_pi_id: string | null;
  trial_started_at: string | null;
  trial_ended_at: string | null;
  drive: DriveRefs;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Pi {
  id: string;
  name: string;
  role: "node" | "server";
  key_hint: string;
  key_set_at: string;
  revoked_at: string | null;
  created_at: string;
  last_seen_at: string | null;
  last_ip: string | null;
  agent_version: string | null;
  status: PiStatus;
  fast_until: string | null;
}

/** What a Pi says about itself each time it calls in. Every field is optional: a Pi reports what it can read. */
export interface PiStatus {
  role?: string;
  hostname?: string;
  time?: string;
  uptime_s?: number;
  ip_eth0?: string | null;
  wlan_inet?: number;
  gateway?: string | null;
  throttled?: string | null;
  temp_c?: number | null;
  disk_pct?: string | null;
  iperf3_running?: number;
  reboot_cron?: number;
  cron_iperf?: number;
  cron_sched?: string | null;
  cron_both?: number;
  log_bytes?: number;
  log_lines?: number;
  log_first?: string | null;
  log_last_stamp?: string | null;
  devices_conf?: { name: string; ip: string }[] | null;
  devices_cron?: number;
  devices_lines?: number;
  rpi_connect?: string | null;
  job?: string | null;
  archive?: { dir: string; files: { name: string; bytes: number; sha256: string }[] }[];
  today?: string;
}

export interface Command {
  id: string;
  pi_id: string;
  assessment_id: string | null;
  action: PiAction;
  purpose: string | null;
  args: Record<string, unknown>;
  state: "queued" | "sent" | "done" | "failed" | "expired" | "cancelled";
  result: Record<string, unknown> | null;
  error: string | null;
  requested_by: string | null;
  created_at: string;
  expires_at: string;
  sent_at: string | null;
  finished_at: string | null;
}

export interface LogCopy {
  id: string;
  assessment_id: string;
  pi_id: string | null;
  command_id: string | null;
  kind: "iperf" | "devices";
  final: boolean;
  source: string;
  bytes: number;
  sha256: string;
  received_at: string;
  drive_file_id: string | null;
  filed_at: string | null;
  cleared_on_pi_at: string | null;
}

export interface ReportVersion {
  id: string;
  assessment_id: string;
  version: number;
  state: "draft" | "approved";
  data: Record<string, unknown>;
  html_hash: string;
  created_by: string | null;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  drive_file_id: string | null;
}

export interface NetworkEvent {
  id: string;
  assessment_id: string | null;
  pi_id: string | null;
  kind: string;
  summary: string;
  detail: Record<string, unknown>;
  actor: string | null;
  at: string;
}

const iso = (t = Date.now()) => new Date(t).toISOString();
const json = (v: unknown) => JSON.stringify(v);
const q = encodeURIComponent;

/* ── Assessments ─────────────────────────────────────────────────── */

const ASSESSMENT_COLUMNS = "*";

export async function listAssessments(): Promise<Assessment[]> {
  const rows = await crm<Assessment[]>(`network_assessments?site=eq.smart-space&select=${ASSESSMENT_COLUMNS}&order=visit_at.desc.nullsfirst,created_at.desc&limit=500`);
  return rows ?? [];
}

export async function getAssessment(id: string): Promise<Assessment | null> {
  const rows = await crm<Assessment[]>(`network_assessments?site=eq.smart-space&id=eq.${q(id)}&select=${ASSESSMENT_COLUMNS}&limit=1`);
  return rows?.[0] ?? null;
}

export async function createAssessment(row: Partial<Assessment> & { customer_name: string }): Promise<Assessment> {
  const made = await crm<Assessment[]>("network_assessments", {
    method: "POST",
    prefer: "return=representation",
    body: json({ site: "smart-space", ...row }),
  });
  if (!made?.[0]) throw new Error("the database did not return the new assessment");
  return made[0];
}

export async function updateAssessment(id: string, patch: Partial<Assessment>): Promise<void> {
  await crm(`network_assessments?site=eq.smart-space&id=eq.${q(id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: json({ ...patch, updated_at: iso() }),
  });
}

/** One section of the capture sheet, written in place without touching the others. */
export async function saveCaptureSection(id: string, section: string, values: SectionValues): Promise<void> {
  await crm("rpc/network_capture_set", {
    method: "POST",
    body: json({ p_id: id, p_section: section, p_values: values }),
  });
}

/* ── Pis ─────────────────────────────────────────────────────────── */

const PI_COLUMNS = "id,name,role,key_hint,key_set_at,revoked_at,created_at,last_seen_at,last_ip,agent_version,status,fast_until";

export async function listPis(): Promise<Pi[]> {
  const rows = await crm<Pi[]>(`network_pis?select=${PI_COLUMNS}&order=role.asc,name.asc`);
  return rows ?? [];
}

export async function getPi(id: string): Promise<Pi | null> {
  const rows = await crm<Pi[]>(`network_pis?id=eq.${q(id)}&select=${PI_COLUMNS}&limit=1`);
  return rows?.[0] ?? null;
}

/** A Pi's key: 32 random bytes. Only its SHA-256 is ever stored. */
export function newPiKey(): { key: string; hash: string; hint: string } {
  const key = `ssn_${randomBytes(32).toString("base64url")}`;
  return { key, hash: keyHash(key), hint: key.slice(-4) };
}

export function keyHash(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/** The Pi a key belongs to, if the key is live. */
export async function piByKey(key: string): Promise<Pi | null> {
  if (!/^ssn_[A-Za-z0-9_-]{43}$/.test(key)) return null;
  const rows = await crm<Pi[]>(`network_pis?key_hash=eq.${keyHash(key)}&revoked_at=is.null&select=${PI_COLUMNS}&limit=1`);
  return rows?.[0] ?? null;
}

export async function createPi(name: string, role: "node" | "server", hash: string, hint: string): Promise<Pi> {
  const made = await crm<Pi[]>("network_pis", {
    method: "POST",
    prefer: "return=representation",
    body: json({ name, role, key_hash: hash, key_hint: hint }),
  });
  if (!made?.[0]) throw new Error("the database did not return the new Pi");
  return made[0];
}

export async function setPiKey(id: string, hash: string, hint: string): Promise<void> {
  await crm(`network_pis?id=eq.${q(id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: json({ key_hash: hash, key_hint: hint, key_set_at: iso(), revoked_at: null }),
  });
}

export async function revokePi(id: string): Promise<void> {
  await crm(`network_pis?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: json({ revoked_at: iso() }) });
}

export async function recordPiCall(id: string, patch: { status: PiStatus; last_ip: string | null; agent_version: string | null }): Promise<void> {
  await crm(`network_pis?id=eq.${q(id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: json({ ...patch, last_seen_at: iso() }),
  });
}

/** Ask these Pis to call in every few seconds for the next while. */
export async function hurryPis(ids: (string | null | undefined)[], minutes = 10): Promise<void> {
  const list = ids.filter((x): x is string => !!x);
  if (!list.length) return;
  await crm(`network_pis?id=in.(${list.map(q).join(",")})`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: json({ fast_until: iso(Date.now() + minutes * 60_000) }),
  });
}

/* ── Instructions ────────────────────────────────────────────────── */

const COMMAND_COLUMNS = "id,pi_id,assessment_id,action,purpose,args,state,result,error,requested_by,created_at,expires_at,sent_at,finished_at";

export async function queueCommand<A extends PiAction>(input: {
  pi: Pi; assessmentId: string | null; action: A; args: unknown; purpose?: string | null; by: string;
}): Promise<Command> {
  if (input.pi.revoked_at) throw new Error(`${input.pi.name} is switched off`);
  if (input.pi.role !== "node") throw new Error(`${input.pi.name} is the Pi at the router; instructions go to the node Pi`);
  const checked = checkArgs(input.action, input.args);
  if (!checked.ok) throw new Error(checked.why);
  const ttl = PI_ACTIONS[input.action].ttlMinutes;
  const made = await crm<Command[]>("network_commands", {
    method: "POST",
    prefer: "return=representation",
    body: json({
      pi_id: input.pi.id,
      assessment_id: input.assessmentId,
      action: input.action,
      purpose: input.purpose ?? null,
      args: checked.args,
      requested_by: input.by,
      expires_at: iso(Date.now() + ttl * 60_000),
    }),
  });
  if (!made?.[0]) throw new Error("the database did not return the instruction");
  await hurryPis([input.pi.id]);
  return made[0];
}

/**
 * Hand a Pi what is waiting for it, once. The UPDATE moves queued rows to sent
 * in one statement, so a Pi that calls twice at once cannot be given the same
 * instruction twice. Instructions past their expiry are marked expired, and
 * one sent ten minutes ago that never reported back is marked failed.
 */
export async function claimCommands(piId: string): Promise<Command[]> {
  const now = iso();
  await crm(`network_commands?pi_id=eq.${q(piId)}&state=eq.queued&expires_at=lte.${q(now)}`, {
    method: "PATCH", prefer: "return=minimal",
    body: json({ state: "expired", finished_at: now, error: "The Pi did not call in before this instruction expired." }),
  });
  await crm(`network_commands?pi_id=eq.${q(piId)}&state=eq.sent&sent_at=lt.${q(iso(Date.now() - 10 * 60_000))}`, {
    method: "PATCH", prefer: "return=minimal",
    body: json({ state: "failed", finished_at: now, error: "The Pi took this instruction and never reported back. It may have restarted part way." }),
  });
  const claimed = await crm<Command[]>(
    `network_commands?pi_id=eq.${q(piId)}&state=eq.queued&expires_at=gt.${q(now)}&select=${COMMAND_COLUMNS}`,
    { method: "PATCH", prefer: "return=representation", body: json({ state: "sent", sent_at: now }) },
  );
  return (claimed ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function getCommand(id: string): Promise<Command | null> {
  const rows = await crm<Command[]>(`network_commands?id=eq.${q(id)}&select=${COMMAND_COLUMNS}&limit=1`);
  return rows?.[0] ?? null;
}

/** Record what the Pi said about an instruction it was given. Only the Pi it was sent to can answer it. */
export async function finishCommand(piId: string, id: string, ok: boolean, result: unknown, error: string | null): Promise<Command | null> {
  const rows = await crm<Command[]>(
    `network_commands?id=eq.${q(id)}&pi_id=eq.${q(piId)}&state=eq.sent&select=${COMMAND_COLUMNS}`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: json({
        state: ok ? "done" : "failed",
        result: result && typeof result === "object" ? result : null,
        error: ok ? null : String(error ?? "The Pi reported a failure without saying why.").slice(0, 600),
        finished_at: iso(),
      }),
    },
  );
  return rows?.[0] ?? null;
}

export async function cancelCommand(id: string): Promise<void> {
  await crm(`network_commands?id=eq.${q(id)}&state=eq.queued`, {
    method: "PATCH", prefer: "return=minimal", body: json({ state: "cancelled", finished_at: iso() }),
  });
}

export async function commandsFor(assessmentId: string, limit = 200): Promise<Command[]> {
  const rows = await crm<Command[]>(`network_commands?assessment_id=eq.${q(assessmentId)}&select=${COMMAND_COLUMNS}&order=created_at.desc&limit=${limit}`);
  return rows ?? [];
}

export async function commandsForPi(piId: string, limit = 50): Promise<Command[]> {
  const rows = await crm<Command[]>(`network_commands?pi_id=eq.${q(piId)}&select=${COMMAND_COLUMNS}&order=created_at.desc&limit=${limit}`);
  return rows ?? [];
}

/* ── Logs ────────────────────────────────────────────────────────── */

const LOG_COLUMNS = "id,assessment_id,pi_id,command_id,kind,final,source,bytes,sha256,received_at,drive_file_id,filed_at,cleared_on_pi_at";

export async function logsFor(assessmentId: string): Promise<LogCopy[]> {
  const rows = await crm<LogCopy[]>(`network_logs?assessment_id=eq.${q(assessmentId)}&select=${LOG_COLUMNS}&order=received_at.desc&limit=200`);
  return rows ?? [];
}

export async function logContent(id: string): Promise<string | null> {
  const rows = await crm<{ content: string }[]>(`network_logs?id=eq.${q(id)}&select=content&limit=1`);
  return rows?.[0]?.content ?? null;
}

/** The newest copy of each log for an assessment, final copies first. */
export async function bestLogs(assessmentId: string): Promise<{ iperf: (LogCopy & { content: string }) | null; devices: (LogCopy & { content: string }) | null }> {
  const list = await logsFor(assessmentId);
  const pick = (kind: "iperf" | "devices") =>
    list.filter((l) => l.kind === kind).sort((a, b) => Number(b.final) - Number(a.final) || b.received_at.localeCompare(a.received_at))[0] ?? null;
  const load = async (l: LogCopy | null) => (l ? { ...l, content: (await logContent(l.id)) ?? "" } : null);
  const [iperf, devices] = await Promise.all([load(pick("iperf")), load(pick("devices"))]);
  return { iperf, devices };
}

export async function storeLog(row: {
  assessment_id: string; pi_id: string; command_id: string; kind: "iperf" | "devices"; final: boolean;
  source: string; content: string; bytes: number; sha256: string;
}): Promise<{ id: string; duplicate: boolean }> {
  const existing = await crm<{ id: string; final: boolean }[]>(
    `network_logs?assessment_id=eq.${q(row.assessment_id)}&kind=eq.${row.kind}&sha256=eq.${row.sha256}&select=id,final&limit=1`,
  );
  if (existing?.[0]) {
    /* The same bytes again: keep one copy. A final collection of bytes first
       seen during the trial marks that copy final rather than storing twice. */
    if (row.final && !existing[0].final) {
      await crm(`network_logs?id=eq.${existing[0].id}`, {
        method: "PATCH", prefer: "return=minimal", body: json({ final: true, source: row.source, command_id: row.command_id }),
      });
    }
    return { id: existing[0].id, duplicate: true };
  }
  const made = await crm<{ id: string }[]>("network_logs", { method: "POST", prefer: "return=representation", body: json(row) });
  if (!made?.[0]) throw new Error("the database did not return the stored log");
  return { id: made[0].id, duplicate: false };
}

export async function markLogFiled(id: string, driveFileId: string): Promise<void> {
  await crm(`network_logs?id=eq.${q(id)}`, {
    method: "PATCH", prefer: "return=minimal", body: json({ drive_file_id: driveFileId, filed_at: iso() }),
  });
}

export async function markLogsCleared(assessmentId: string, sha256s: string[]): Promise<void> {
  if (!sha256s.length) return;
  await crm(`network_logs?assessment_id=eq.${q(assessmentId)}&sha256=in.(${sha256s.join(",")})`, {
    method: "PATCH", prefer: "return=minimal", body: json({ cleared_on_pi_at: iso() }),
  });
}

/* ── Reports ─────────────────────────────────────────────────────── */

const REPORT_COLUMNS = "id,assessment_id,version,state,data,html_hash,created_by,created_at,approved_by,approved_at,drive_file_id";

export async function reportsFor(assessmentId: string): Promise<ReportVersion[]> {
  const rows = await crm<ReportVersion[]>(`network_reports?assessment_id=eq.${q(assessmentId)}&select=${REPORT_COLUMNS}&order=version.desc&limit=50`);
  return rows ?? [];
}

export async function getReport(assessmentId: string, version: number): Promise<ReportVersion | null> {
  const rows = await crm<ReportVersion[]>(`network_reports?assessment_id=eq.${q(assessmentId)}&version=eq.${version}&select=${REPORT_COLUMNS}&limit=1`);
  return rows?.[0] ?? null;
}

export async function saveReportVersion(row: {
  assessment_id: string; version: number; state: "draft" | "approved"; data: Record<string, unknown>; html_hash: string;
  created_by: string; approved_by?: string | null; approved_at?: string | null;
}): Promise<ReportVersion> {
  const made = await crm<ReportVersion[]>("network_reports", { method: "POST", prefer: "return=representation", body: json(row) });
  if (!made?.[0]) throw new Error("the database did not return the report");
  return made[0];
}

export async function markReportFiled(id: string, driveFileId: string): Promise<void> {
  await crm(`network_reports?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: json({ drive_file_id: driveFileId }) });
}

/* ── History ─────────────────────────────────────────────────────── */

export async function addEvent(e: { assessment_id?: string | null; pi_id?: string | null; kind: string; summary: string; detail?: Record<string, unknown>; actor?: string | null }): Promise<boolean> {
  try {
    await crm("network_events", { method: "POST", prefer: "return=minimal", body: json({ detail: {}, ...e }) });
    return true;
  } catch (err) {
    console.error("[network] history line not written:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function eventsFor(assessmentId: string, limit = 200): Promise<NetworkEvent[]> {
  const rows = await crm<NetworkEvent[]>(`network_events?assessment_id=eq.${q(assessmentId)}&select=*&order=at.desc&limit=${limit}`);
  return rows ?? [];
}

export async function eventsForPi(piId: string, limit = 50): Promise<NetworkEvent[]> {
  const rows = await crm<NetworkEvent[]>(`network_events?pi_id=eq.${q(piId)}&select=*&order=at.desc&limit=${limit}`);
  return rows ?? [];
}

/** For a list page: an empty read that is really a refused key throws rather than saying "none yet". */
export async function checkedList<T>(rows: T[]): Promise<T[]> {
  return unlessWrongKey(rows);
}
