"use server";

/**
 * Every write on the assessment pages.
 *
 * Each action re-reads the session, refuses anything but Smart Space, and
 * checks the assessment id it was given, because a server action is a public
 * endpoint and its form fields are whatever the caller sends.
 *
 * Instructions to the Pi are only ever the fixed actions in
 * src/lib/network/pi-protocol.ts, with arguments checked there before they
 * are queued and again on the Pi.
 */
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/crm/session";
import { crmConfigured, logActivity, upsertContact } from "@/lib/crm/db";
import { done, failed, writeFailed, type ActionState } from "../../action-state";
import { readSection, sectionById, type Row } from "@/lib/network/capture";
import { dublinWallToEpoch } from "@/lib/network/logs";
import { cleanDeviceName, privateIpv4, UUID_RE, PI_ACTIONS, type PiAction } from "@/lib/network/pi-protocol";
import {
  addEvent, createAssessment, getAssessment, listPis, queueCommand, reportsFor, saveCaptureSection,
  saveReportVersion, markReportFiled, updateAssessment, STAGES, type Assessment, type Pi, type Stage,
} from "@/lib/network/store";
import { driveConfigured, makeCustomerFolder, putFile, DriveError } from "@/lib/network/drive";
import { clearable, fileLogsInDrive, parsedLogs } from "@/lib/network/flow";
import { commandsFor } from "@/lib/network/store";
import { htmlHash, renderReport, reportFor } from "@/lib/network/report";

function session() {
  const s = requireSession();
  if (s.site !== "smart-space") throw new Error("The network service is Smart Space's. Switch to Smart Space first.");
  return s;
}

/** "2026-10-14T10:00" typed on the form, read as Dublin time. */
function dublinInput(raw: FormDataEntryValue | null): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(String(raw ?? "").trim());
  if (!m) return null;
  return new Date(dublinWallToEpoch(+m[1], +m[2], +m[3], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0)).toISOString();
}

const field = (form: FormData, k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);

async function loadFor(id: string): Promise<Assessment | null> {
  if (!UUID_RE.test(id)) return null;
  return getAssessment(id);
}

export interface NewAssessmentState { error?: string }

export async function bookAssessment(_prev: NewAssessmentState, form: FormData): Promise<NewAssessmentState> {
  let s;
  try { s = session(); } catch (e) { return { error: (e as Error).message }; }
  if (!crmConfigured()) return { error: "The database is not connected on this deployment." };
  const name = field(form, "name");
  const email = field(form, "email").toLowerCase() || null;
  const phone = field(form, "phone", 40) || null;
  if (!name) return { error: "A name is needed." };
  if (!email && !phone) return { error: "A phone number or an email address is needed." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address does not look right." };

  let made: Assessment;
  try {
    const address = field(form, "address") || null;
    const eircode = field(form, "eircode", 20).toUpperCase() || null;
    const contactId = await upsertContact("smart-space", { name, email, phone, address_line1: address, eircode }).catch(() => null);
    const pis = await listPis().catch(() => [] as Pi[]);
    const live = pis.filter((p) => !p.revoked_at);
    made = await createAssessment({
      customer_name: name,
      email,
      phone,
      address,
      eircode,
      contact_id: contactId,
      visit_at: dublinInput(form.get("visit_at")),
      collection_at: dublinInput(form.get("collection_at")),
      paid_ref: field(form, "paid_ref", 120) || null,
      node_pi_id: live.filter((p) => p.role === "node").length === 1 ? live.find((p) => p.role === "node")!.id : null,
      server_pi_id: live.filter((p) => p.role === "server").length === 1 ? live.find((p) => p.role === "server")!.id : null,
      created_by: s.email,
    });
    await addEvent({ assessment_id: made.id, kind: "booked", summary: "Assessment booked", actor: s.email });
    /* On the customer's own history too, so the assessment is one click from their page. */
    if (contactId) {
      await logActivity("smart-space", {
        contact_id: contactId, kind: "network", actor: s.email, detail: { assessment_id: made.id },
        summary: made.visit_at ? `Home network assessment booked for ${new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(made.visit_at))}` : "Home network assessment booked",
      });
    }
  } catch (err) {
    return { error: writeFailed("The booking", err).message };
  }
  redirect(`/crm/network/assessments/${made.id}`);
}

export async function saveCustomer(_prev: ActionState, form: FormData): Promise<ActionState> {
  let s;
  try { s = session(); } catch (e) { return failed((e as Error).message); }
  const id = field(form, "id", 40);
  try {
    const a = await loadFor(id);
    if (!a) return failed("This assessment could not be found.");
    const name = field(form, "name");
    if (!name) return failed("A name is needed.");
    await updateAssessment(id, {
      customer_name: name,
      email: field(form, "email").toLowerCase() || null,
      phone: field(form, "phone", 40) || null,
      address: field(form, "address") || null,
      eircode: field(form, "eircode", 20).toUpperCase() || null,
      visit_at: dublinInput(form.get("visit_at")),
      collection_at: dublinInput(form.get("collection_at")),
      review_call_at: dublinInput(form.get("review_call_at")),
      paid_ref: field(form, "paid_ref", 120) || null,
    });
    await addEvent({ assessment_id: id, kind: "edit", summary: "Customer and dates updated", actor: s.email });
    return done("Saved.");
  } catch (err) {
    return writeFailed("The customer details", err);
  }
}

/** The node Pi and the router Pi this assessment uses. */
async function pisFor(a: Assessment): Promise<{ node: Pi | null; server: Pi | null }> {
  const pis = await listPis();
  const live = pis.filter((p) => !p.revoked_at);
  const node = live.find((p) => p.id === a.node_pi_id) ?? (live.filter((p) => p.role === "node").length === 1 ? live.find((p) => p.role === "node")! : null);
  const server = live.find((p) => p.id === a.server_pi_id) ?? (live.filter((p) => p.role === "server").length === 1 ? live.find((p) => p.role === "server")! : null);
  return { node, server };
}

async function queue(a: Assessment, by: string, action: PiAction, args: unknown, purpose: string | null, what?: string): Promise<ActionState> {
  const { node } = await pisFor(a);
  if (!node) return failed("No node Pi is set up. Add it under Pis first.");
  try {
    await queueCommand({ pi: node, assessmentId: a.id, action, args, purpose, by });
  } catch (err) {
    return failed(`Not sent to the Pi: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (a.stage === "booked") await updateAssessment(a.id, { stage: "visit" });
  await addEvent({ assessment_id: a.id, pi_id: node.id, kind: `asked:${action}`, summary: `Asked ${node.name}: ${what ?? PI_ACTIONS[action].label.toLowerCase()}`, actor: by });
  const last = node.last_seen_at ? (Date.now() - Date.parse(node.last_seen_at)) / 1000 : null;
  const when = last == null ? `${node.name} has never called in, so this waits until it does.`
    : last > 180 ? `${node.name} last called in ${Math.round(last / 60)} min ago, so this waits until it is back.`
    : "The Pi picks it up within a few seconds.";
  return done(`Sent. ${when}`);
}

function watchedDevices(rows: Row[]): { devices: { name: string; ip: string }[]; problems: string[] } {
  const devices: { name: string; ip: string }[] = [];
  const problems: string[] = [];
  for (const r of rows) {
    const name = cleanDeviceName(r.device);
    const rawIp = String(r.ip ?? "").trim();
    if (!rawIp) continue; // silent devices are left off the watch, as on the sheet
    const ip = privateIpv4(rawIp);
    if (!name) problems.push(`A device with address ${rawIp} has no name.`);
    else if (!ip) problems.push(`${name}: "${rawIp}" is not an address on a home network.`);
    else devices.push({ name, ip });
  }
  return { devices, problems };
}

/**
 * Save a section of the capture sheet, and do what the button pressed asks:
 * "save", "measure:<row>", "baseline", "final", "start", "watch", "check",
 * "look", "collect", "file" or "clear". The section is saved first, so a
 * measurement or a start always works from what is on screen.
 */
export async function sectionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  let s;
  try { s = session(); } catch (e) { return failed((e as Error).message); }
  const id = field(form, "id", 40);
  const sectionId = field(form, "section", 40);
  const intent = field(form, "intent", 60) || "save";
  const section = sectionById(sectionId);
  if (!section) return failed("That is not a section of the capture sheet.");

  let a: Assessment | null;
  try { a = await loadFor(id); } catch (err) { return writeFailed("The section", err); }
  if (!a) return failed("This assessment could not be found.");

  const values = readSection(sectionId, form);
  if (!values) return failed("That is not a section of the capture sheet.");
  try {
    await saveCaptureSection(id, sectionId, values);
  } catch (err) {
    return writeFailed(section.title, err);
  }

  const only = (want: string) => sectionId === want;
  if (intent === "save") {
    await addEvent({ assessment_id: id, kind: "edit", summary: `Saved: ${section.title}`, actor: s.email });
    return done("Saved.");
  }
  if (intent.startsWith("measure:") && only("sockets")) {
    const rowId = intent.slice(8);
    const row = (values.rows as Row[] | undefined)?.find((r) => r.id === rowId);
    if (!row) return failed("Saved, but that socket row is empty, so there is nothing to measure. Type where the socket is first.");
    return queue(a, s.email, "measure", { seconds: 10 }, `socket:${rowId}`, `measure the socket ${[row.floor, row.socket].filter(Boolean).join(", ").toLowerCase()}`);
  }
  if (intent === "baseline" && only("trial")) return queue(a, s.email, "measure", { seconds: 10 }, "baseline", "measure the baseline");
  if (intent === "final" && only("collection")) return queue(a, s.email, "measure", { seconds: 10 }, "final", "take the final reading");
  if ((intent === "start" || intent === "watch") && only("trial")) {
    const { devices, problems } = watchedDevices((values.devices as Row[]) ?? []);
    if (problems.length) return failed(`Saved, but not sent to the Pi. ${problems.join(" ")}`);
    if (intent === "start") {
      const { node } = await pisFor(a);
      const busy = node?.status?.job && node.status.job !== id ? await getAssessment(node.status.job).catch(() => null) : null;
      if (busy && busy.stage === "trial") {
        return failed(`Saved, but the node Pi is still running ${busy.customer_name}'s trial. Collect those logs first.`);
      }
      return queue(a, s.email, "start_trial", { assessment: id, devices }, null, `start the trial, watching ${devices.length} device${devices.length === 1 ? "" : "s"}`);
    }
    return queue(a, s.email, "watch_devices", { assessment: id, devices }, null, `change the watched devices to ${devices.length}`);
  }
  if (intent === "check" && only("trial")) return queue(a, s.email, "check", {}, null, "run the pre-departure check");
  if (intent === "look" && only("collection")) return queue(a, s.email, "collect", { assessment: id, final: false }, null, "send a copy of the logs");
  if (intent === "collect" && only("collection")) return queue(a, s.email, "collect", { assessment: id, final: true }, null, "collect the logs at the end of the trial");
  if (intent === "file" && only("collection")) {
    try {
      const r = await fileLogsInDrive(id);
      return r.ok ? done(`Drive: ${r.outcome}.`) : failed(`Not filed: ${r.outcome}.`);
    } catch (err) {
      return failed(err instanceof DriveError ? err.message : `Drive did not take the logs: ${String(err).slice(0, 160)}`);
    }
  }
  if (intent === "clear" && only("collection")) {
    const { node } = await pisFor(a);
    const files = await clearable(id, node);
    if (!files.length) return failed("Saved. The Pi holds nothing the portal has an exact copy of, so there is nothing to clear.");
    return queue(a, s.email, "clear_logs", { assessment: id, files }, null, `delete its ${files.length} archived log${files.length === 1 ? "" : "s"}, each held here byte for byte`);
  }
  return failed("Saved, but that button does nothing in this section.");
}

export async function makeFolder(_prev: ActionState, form: FormData): Promise<ActionState> {
  let s;
  try { s = session(); } catch (e) { return failed((e as Error).message); }
  const id = field(form, "id", 40);
  if (!driveConfigured()) return failed("Google Drive is not set up on this deployment.");
  try {
    const a = await loadFor(id);
    if (!a) return failed("This assessment could not be found.");
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(a.visit_at ? new Date(a.visit_at) : new Date());
    const r = await makeCustomerFolder(day, a.customer_name);
    await updateAssessment(id, { drive: { ...(a.drive ?? {}), ...r.refs } });
    await addEvent({
      assessment_id: id, kind: "drive:folder", actor: s.email,
      summary: `${r.made ? "Drive folder made" : "Drive folder found"}: ${r.refs.folderName}${r.template ? `, with a copy of "${r.template.name}"` : ""}`,
      detail: { template: r.template },
    });
    const logs = await fileLogsInDrive(id).catch(() => null);
    return done(`${r.made ? "Made" : "Found"} ${r.refs.folderName}.${r.refs.sheetId ? " The capture sheet is in it." : " No capture sheet template was found in Templates."}${logs?.ok && !/no logs/.test(logs.outcome) ? ` Logs ${logs.outcome}.` : ""}`);
  } catch (err) {
    return failed(err instanceof DriveError ? err.message : `The folder was not made: ${String(err).slice(0, 200)}`);
  }
}

export async function choosePis(_prev: ActionState, form: FormData): Promise<ActionState> {
  let s;
  try { s = session(); } catch (e) { return failed((e as Error).message); }
  const id = field(form, "id", 40);
  try {
    const a = await loadFor(id);
    if (!a) return failed("This assessment could not be found.");
    const pis = await listPis();
    const node = pis.find((p) => p.id === field(form, "node", 40) && p.role === "node" && !p.revoked_at) ?? null;
    const server = pis.find((p) => p.id === field(form, "server", 40) && p.role === "server" && !p.revoked_at) ?? null;
    await updateAssessment(id, { node_pi_id: node?.id ?? null, server_pi_id: server?.id ?? null });
    await addEvent({ assessment_id: id, kind: "edit", summary: `Pis: ${node?.name ?? "no node"} and ${server?.name ?? "no router Pi"}`, actor: s.email });
    return done("Saved.");
  } catch (err) {
    return writeFailed("The choice of Pis", err);
  }
}

export async function setStage(_prev: ActionState, form: FormData): Promise<ActionState> {
  let s;
  try { s = session(); } catch (e) { return failed((e as Error).message); }
  const id = field(form, "id", 40);
  const stage = field(form, "stage", 20) as Stage;
  if (!STAGES.some((x) => x.value === stage)) return failed("That is not a stage.");
  try {
    const a = await loadFor(id);
    if (!a) return failed("This assessment could not be found.");
    await updateAssessment(id, { stage });
    await addEvent({ assessment_id: id, kind: "stage", summary: `Marked ${STAGES.find((x) => x.value === stage)!.label.toLowerCase()}`, actor: s.email });
    return done("Saved.");
  } catch (err) {
    return writeFailed("The stage", err);
  }
}

/**
 * Approve the report exactly as it stands. The page sends the fingerprint of
 * the report it drew; if anything has changed since, the approval is refused
 * so what is approved is what was looked at. The approved page is kept in the
 * CRM and, when the Drive folder exists, saved to its Report folder. Nothing
 * is sent to the customer.
 */
export async function approveReport(_prev: ActionState, form: FormData): Promise<ActionState> {
  let s;
  try { s = session(); } catch (e) { return failed((e as Error).message); }
  const id = field(form, "id", 40);
  const shown = field(form, "hash", 64);
  try {
    const a = await loadFor(id);
    if (!a) return failed("This assessment could not be found.");
    const [commands, logs, versions] = await Promise.all([commandsFor(id), parsedLogs(id), reportsFor(id)]);
    const report = reportFor(a, commands, logs);
    if (report.missing.length) return failed(`Not approved. Still missing: ${report.missing.join("; ")}.`);
    const html = renderReport(report.R);
    const hash = htmlHash(html);
    if (hash !== shown) return failed("The report changed since this page was drawn. Look at the preview again, then approve.");
    const version = (versions[0]?.version ?? 0) + 1;
    const now = new Date().toISOString();
    const saved = await saveReportVersion({
      assessment_id: id, version, state: "approved", data: { R: report.R, html }, html_hash: hash,
      created_by: s.email, approved_by: s.email, approved_at: now,
    });
    await updateAssessment(id, { stage: "reported" });
    let where = "Kept in the CRM.";
    if (a.drive?.reportId && driveConfigured()) {
      try {
        const f = await putFile(a.drive.reportId, `${a.drive.folderName ?? a.customer_name} report v${version}.html`, "text/html", html);
        await markReportFiled(saved.id, f.id);
        where = "Kept in the CRM and saved to the Report folder in Drive.";
      } catch (err) {
        where = `Kept in the CRM. Drive did not take it: ${err instanceof Error ? err.message.slice(0, 160) : "no answer"}.`;
      }
    }
    await addEvent({ assessment_id: id, kind: "report", summary: `Report version ${version} approved. ${where}`, actor: s.email });
    if (a.contact_id) {
      await logActivity("smart-space", { contact_id: a.contact_id, kind: "network", actor: s.email, detail: { assessment_id: id, version }, summary: `Home network assessment report approved (version ${version})` });
    }
    return done(`Version ${version} approved. ${where} Nothing has been sent to the customer.`);
  } catch (err) {
    return writeFailed("The approval", err);
  }
}
