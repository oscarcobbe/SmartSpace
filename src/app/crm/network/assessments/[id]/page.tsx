import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FolderOpen, FileText } from "lucide-react";
import { requireSession } from "@/lib/crm/session";
import { SECTIONS, sectionById, sectionProgress, numberOf, ruleOfThumbPrice, ticked, rows as rowsOf, type Section } from "@/lib/network/capture";
import {
  getAssessment, listPis, commandsFor, reportsFor, eventsFor, logsFor, hurryPis, STAGES,
  type Assessment, type Command, type Pi,
} from "@/lib/network/store";
import { buildCheck, type NodeCheck } from "@/lib/network/check";
import { trialFigures } from "@/lib/network/logs";
import { clearable, parsedLogs, pending, readings } from "@/lib/network/flow";
import { reportFor, renderReport, htmlHash } from "@/lib/network/report";
import { driveConfigured, driveAccount, folderUrl, docUrl } from "@/lib/network/drive";
import { UUID_RE } from "@/lib/network/pi-protocol";
import { evidenceFor, lastBroadbandStart } from "@/lib/network/evidence";
import { PageHeader, Panel, Note, Pill } from "../../../ui";
import { ActionForm, SubmitButton } from "../../../action-form";
import SectionForm, { type Reading, type SectionButton } from "../section-form";
import Live from "../live";
import { BackTo, PiStrip, CheckPanel, LogsPanel, TrialStatus, Waiting, Failures, History, Versions, online } from "../parts";
import { inputValue, when, secondsSince, STAGE_TONE } from "../format";
import { sectionAction, saveCustomer, makeFolder, choosePis, setStage, approveReport, broadbandAction } from "../actions";

export const dynamic = "force-dynamic";

const input = "min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:text-sm";
const primary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800";
const plain = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50";


function Field({ name, label, type = "text", value, placeholder }: { name: string; label: string; type?: string; value?: string | null; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={`c-${name}`} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <input id={`c-${name}`} name={name} type={type} defaultValue={value ?? ""} placeholder={placeholder}
        inputMode={type === "tel" ? "tel" : type === "email" ? "email" : undefined} className={input} />
    </div>
  );
}

function SectionPanel({ section, capture, children }: { section: Section; capture: Assessment["capture"]; children: React.ReactNode }) {
  const p = sectionProgress(capture, section);
  return (
    <Panel title={section.title} aside={<span className="text-xs text-slate-500">{p.filled} of {p.total} filled</span>}>
      {children}
    </Panel>
  );
}

const STEPS = [
  { href: "#customer", label: "Booking" },
  { href: "#broadband", label: "Broadband" },
  { href: "#line", label: "Line" },
  { href: "#sockets", label: "Sockets" },
  { href: "#rooms", label: "Rooms" },
  { href: "#trial", label: "Trial" },
  { href: "#collection", label: "Collection" },
  { href: "#report", label: "Report" },
];

export default async function AssessmentPage({ params }: { params: { id: string } }) {
  const session = requireSession();
  if (session.site !== "smart-space") {
    return (
      <>
        <BackTo href="/crm/network/assessments">All assessments</BackTo>
        <Note tone="warn">The network service is Smart Space&apos;s. Switch to Smart Space at the top of the menu.</Note>
      </>
    );
  }
  if (!UUID_RE.test(params.id)) notFound();
  const a = await getAssessment(params.id);
  if (!a) notFound();

  const [pis, commands, logs, versions, events, copies] = await Promise.all([
    listPis(), commandsFor(a.id), parsedLogs(a.id), reportsFor(a.id), eventsFor(a.id), logsFor(a.id),
  ]);
  const live = pis.filter((p) => !p.revoked_at);
  const node: Pi | null = live.find((p) => p.id === a.node_pi_id) ?? (live.filter((p) => p.role === "node").length === 1 ? live.find((p) => p.role === "node")! : null);
  const server: Pi | null = live.find((p) => p.id === a.server_pi_id) ?? (live.filter((p) => p.role === "server").length === 1 ? live.find((p) => p.role === "server")! : null);
  const bbStart = lastBroadbandStart(commands);
  const bbPi: Pi | null = bbStart ? live.find((p) => p.id === bbStart.pi_id) ?? null : null;

  /* While the assessment is being worked, ask its Pis to call in every few
     seconds, so a button pressed on site is answered in seconds, not a minute. */
  const active = ["booked", "visit", "trial", "collected"].includes(a.stage);
  const soon = Date.now() + 5 * 60_000;
  if (active && [node, server, bbPi].some((p) => p && (!p.fast_until || Date.parse(p.fast_until) < soon))) {
    await hurryPis([node?.id, server?.id, bbPi?.id]).catch(() => undefined);
  }

  const waiting = pending(commands);
  const measured = readings(commands);
  const socketReadings: Record<string, Reading> = {};
  for (const [k, m] of Array.from(measured)) if (k.startsWith("socket:")) socketReadings[k.slice(7)] = m;
  const pendingRows = waiting.filter((c) => c.purpose?.startsWith("socket:")).map((c) => c.purpose!.slice(7));

  const lastDone = (action: Command["action"]) => commands.find((c) => c.action === action && c.state === "done");
  const checkCmd = lastDone("check");
  const check = checkCmd ? buildCheck({
    node: (checkCmd.result ?? null) as NodeCheck | null,
    nodeName: node?.name ?? "The node Pi",
    server: server ? server.status : null,
    serverName: server?.name ?? "The Pi at the router",
    serverSeenAgoS: secondsSince(server?.last_seen_at),
    ranAt: checkCmd.finished_at,
  }) : null;
  const startCmd = commands.find((c) => (c.action === "start_trial" || c.action === "watch_devices") && c.state === "done");
  const pings: Record<string, boolean> = {};
  for (const d of ((startCmd?.result as { devices?: { name: string; up: boolean }[] } | null)?.devices ?? [])) pings[d.name] = d.up;
  const checkPings = ((checkCmd?.result as NodeCheck | null)?.devices?.results ?? []);
  if (checkCmd && (!startCmd || (checkCmd.finished_at ?? "") > (startCmd.finished_at ?? ""))) for (const d of checkPings) pings[d.name] = d.up;

  const figures = logs.iperf ? trialFigures(logs.iperf.rows) : null;
  const report = reportFor(a, commands, logs);
  const html = renderReport(report.R);
  const hash = htmlHash(html);
  const toClear = await clearable(a.id, node);
  const bbToClear = bbPi ? (await clearable(a.id, bbPi)).filter((f) => f.name === "broadband.csv") : [];
  const bbRunning = !!bbPi && bbPi.status?.bb_job === a.id;
  const evidence = evidenceFor(a, logs.broadband, commands);
  const bbCopies = copies.filter((x) => x.kind === "broadband");

  const c = a.capture ?? {};
  const lineSpeed = numberOf(c, "line", "down");
  const baseline = measured.get("baseline");
  const final = measured.get("final");
  const hardware = numberOf(c, "conclusions", "hardwareExVat");
  const suggested = ruleOfThumbPrice(hardware);
  const evening = figures?.evening.down;
  const sag = evening ? Math.round((1 - evening.evening / evening.rest) * 100) : null;
  const byEye: Record<string, boolean> = {
    wired: ticked(c, "trial", "wired"),
    devicesMoved: rowsOf(c, "trial", "devices").length > 0,
    decoShot: ticked(c, "trial", "decoShot"),
    ownWifi: ticked(c, "trial", "ownWifi"),
    tape: ticked(c, "photos", "sockets"),
    saidUnplug: ticked(c, "trial", "saidUnplug"),
  };

  const noNode = node ? undefined : "No node Pi is chosen for this assessment.";
  const started = !!a.trial_started_at;
  const stageLabel = STAGES.find((s) => s.value === a.stage)?.label ?? a.stage;
  const refresh = waiting.length ? 3 : a.stage === "trial" || bbRunning ? 60 : null;

  const trialButtons: SectionButton[] = [
    { intent: "baseline", label: baseline ? "Measure the baseline again" : "Measure the baseline", disabled: noNode },
    {
      intent: "start", label: started ? "Start the trial again" : "Start the trial", tone: "primary",
      disabled: noNode ?? (!server ? "No Pi at the router is chosen." : undefined),
      note: started ? `Started ${when(a.trial_started_at)}. Starting again files the current logs away on the Pi and begins fresh ones.` : "Files any earlier logs away on the Pi, starts a fresh log, writes one reading straight away and starts watching the devices with an IP.",
    },
    { intent: "watch", label: "Change the watched devices", disabled: noNode ?? (!started ? "Start the trial first." : undefined), note: "Keeps the logs; only the device list changes." },
    { intent: "check", label: "Run the pre-departure check", disabled: noNode },
  ];
  const collectionButtons: SectionButton[] = [
    { intent: "final", label: final ? "Measure again" : "Measure now", disabled: noNode, note: "The final down and up, before anything is unplugged." },
    { intent: "look", label: "Look at the logs now", disabled: noNode ?? (!started ? "The trial has not been started from the portal." : undefined), note: "A copy to read during the trial. Nothing on the Pi changes." },
    { intent: "collect", label: "Collect the logs", tone: "primary", disabled: noNode ?? (!started ? "The trial has not been started from the portal." : undefined), note: "Stops the device watch, files both logs away on the Pi, and sends them here. Do this before unplugging anything." },
    { intent: "file", label: "File in Drive", disabled: !a.drive?.dataId ? "Make the Drive folder first." : !copies.length ? "No logs yet." : undefined },
    { intent: "clear", label: "Clear the Pi's copy", disabled: !toClear.length ? "The Pi holds nothing the portal has an exact copy of." : undefined, note: toClear.length ? `Deletes ${toClear.length} archived file${toClear.length === 1 ? "" : "s"} on the Pi, each only if it matches the copy here byte for byte.` : undefined },
  ];

  const sec = (id: string) => sectionById(id)!;
  const form = (id: string, extra: Partial<Parameters<typeof SectionForm>[0]> = {}, children?: React.ReactNode) => (
    <SectionPanel section={sec(id)} capture={c}>
      <SectionForm assessmentId={a.id} section={sec(id)} values={c[id] ?? {}} action={sectionAction} {...extra}>{children}</SectionForm>
    </SectionPanel>
  );

  return (
    <>
      <BackTo href="/crm/network/assessments">All assessments</BackTo>
      <PageHeader
        title={a.customer_name}
        sub={[a.address, a.visit_at ? `Visit ${when(a.visit_at)}` : "No visit date", a.collection_at ? `Collection ${when(a.collection_at)}` : null].filter(Boolean).join(". ")}
        aside={<Pill className={STAGE_TONE[a.stage]}>{stageLabel}</Pill>}
      />

      <PiStrip node={node} server={server} assessmentId={a.id} />

      <nav aria-label="Sections" className="sticky top-[117px] z-10 -mx-1 mb-5 flex gap-1 overflow-x-auto bg-slate-50/95 px-1 py-2 backdrop-blur lg:top-14 [scrollbar-width:none]">
        {STEPS.map((s) => (
          <a key={s.href} href={s.href} className="flex min-h-[40px] shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">{s.label}</a>
        ))}
      </nav>

      <div className="space-y-3">
        <Live seconds={refresh} label={waiting.length ? "Waiting for the Pi. This page updates by itself." : undefined} />
        <Waiting commands={waiting} />
        <Failures commands={commands} />
      </div>

      <div className="mt-4 space-y-6">
        <div id="customer" className="scroll-mt-44 lg:scroll-mt-28">
          <Panel title="Customer and dates">
            <ActionForm action={saveCustomer} className="space-y-4 px-4 py-4">
              <input type="hidden" name="id" value={a.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="name" label="Name" value={a.customer_name} />
                <Field name="phone" label="Phone" type="tel" value={a.phone} />
                <Field name="email" label="Email" type="email" value={a.email} />
                <Field name="address" label="Address" value={a.address} />
                <Field name="eircode" label="Eircode" value={a.eircode} />
                <Field name="paid_ref" label="Paid, Stripe reference" value={a.paid_ref} />
                <Field name="visit_at" label="Visit date and time" type="datetime-local" value={inputValue(a.visit_at)} />
                <Field name="collection_at" label="Collection date agreed" type="datetime-local" value={inputValue(a.collection_at)} />
                <Field name="review_call_at" label="Review call" type="datetime-local" value={inputValue(a.review_call_at)} />
              </div>
              <SubmitButton pendingLabel="Saving" className={primary}>Save</SubmitButton>
            </ActionForm>
          </Panel>
        </div>

        <Panel title="Google Drive folder">
          <div className="space-y-3 px-4 py-4 text-sm">
            {a.drive?.folderId ? (
              <>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">{a.drive.folderName}</span> in SmartSpace Networks, Customers.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={folderUrl(a.drive.folderId)} target="_blank" rel="noopener" className={plain}><FolderOpen className="h-4 w-4" aria-hidden="true" />Folder</a>
                  {a.drive.photosId && <a href={folderUrl(a.drive.photosId)} target="_blank" rel="noopener" className={plain}>Photos</a>}
                  {a.drive.dataId && <a href={folderUrl(a.drive.dataId)} target="_blank" rel="noopener" className={plain}>Data</a>}
                  {a.drive.reportId && <a href={folderUrl(a.drive.reportId)} target="_blank" rel="noopener" className={plain}>Report</a>}
                  {a.drive.sheetId && <a href={docUrl(a.drive.sheetId)} target="_blank" rel="noopener" className={plain}><FileText className="h-4 w-4" aria-hidden="true" />Capture sheet</a>}
                </div>
              </>
            ) : driveConfigured() ? (
              <ActionForm action={makeFolder} className="space-y-2">
                <input type="hidden" name="id" value={a.id} />
                <p className="text-slate-700">Makes Customers/&quot;{a.visit_at ? inputValue(a.visit_at).slice(0, 10) : "today's date"} {a.customer_name}&quot; with Data, Photos and Report, and a copy of the capture sheet template. If it already exists it is used as it is.</p>
                <SubmitButton pendingLabel="Making the folder" className={primary}>Make the Drive folder</SubmitButton>
              </ActionForm>
            ) : (
              <p className="text-slate-700">Google Drive is not set up on this deployment. Everything is kept here in the CRM in the meantime.</p>
            )}
            {driveConfigured() && !a.drive?.folderId && driveAccount() && (
              <p className="text-xs text-slate-500">The portal works in Drive as {driveAccount()}. SmartSpace Networks has to be shared with that address as an Editor.</p>
            )}
          </div>
        </Panel>

        <Panel title="Pis for this assessment">
          <ActionForm action={choosePis} className="flex flex-wrap items-end gap-3 px-4 py-4">
            <input type="hidden" name="id" value={a.id} />
            <div className="min-w-[180px] flex-1">
              <label htmlFor="pick-node" className="mb-1.5 block text-sm font-medium text-slate-700">On the trial floor (node)</label>
              <select id="pick-node" name="node" defaultValue={node?.id ?? ""} className={input}>
                <option value="">None</option>
                {live.filter((p) => p.role === "node").map((p) => <option key={p.id} value={p.id}>{p.name}{online(p) ? "" : " (offline)"}</option>)}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label htmlFor="pick-server" className="mb-1.5 block text-sm font-medium text-slate-700">At the router (server)</label>
              <select id="pick-server" name="server" defaultValue={server?.id ?? ""} className={input}>
                <option value="">None</option>
                {live.filter((p) => p.role === "server").map((p) => <option key={p.id} value={p.id}>{p.name}{online(p) ? "" : " (offline)"}</option>)}
              </select>
            </div>
            <SubmitButton pendingLabel="Saving" className={plain}>Save</SubmitButton>
          </ActionForm>
        </Panel>

        <div id="broadband" className="scroll-mt-44 lg:scroll-mt-28">
          <Panel title="Broadband evidence test" aside={bbRunning ? <Pill className="bg-sky-100 text-sky-900">Running</Pill> : evidence ? <Pill className="bg-slate-100 text-slate-800">{bbCopies.some((x) => x.final) ? "Collected" : "Copy held"}</Pill> : undefined}>
            <div className="space-y-4 px-4 py-4 text-sm">
              <p className="text-slate-700">
                For the broadband evidence service, or to rule the broadband in or out during an assessment. One Pi, wired straight into the customer&apos;s router, pings the internet and the router every minute for as long as it is left there (usually 7 days) and runs a speed test as often as chosen below. It carries on by itself after a power cut. Loss to the internet while the router answers is the broadband; loss to both is the house side.
              </p>
              {bbStart && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-slate-700">
                  {bbRunning ? (
                    <p><span className="font-semibold text-slate-900">Running on {bbPi!.name}</span> since {when(bbPi!.status?.bb_started ?? bbStart.finished_at)}: {bbPi!.status?.bb_minutes ?? 0} minutes logged{bbPi!.status?.bb_last ? `, the last at ${bbPi!.status.bb_last.slice(5, 16)}` : ""}.</p>
                  ) : (
                    <p>Started on {bbPi?.name ?? "a Pi that is now switched off"} {when(bbStart.finished_at)}. {bbCopies.some((x) => x.final) ? "The log has been collected and the test is over." : "The Pi is not running it now."}</p>
                  )}
                </div>
              )}
              <ActionForm action={broadbandAction} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="intent" value="start" />
                <div className="min-w-[180px] flex-1">
                  <label htmlFor="bb-pi" className="mb-1.5 block text-sm font-medium text-slate-700">The Pi at the router</label>
                  <select id="bb-pi" name="pi" defaultValue={bbPi?.id ?? server?.id ?? ""} className={input}>
                    <option value="">Choose</option>
                    {live.map((p) => <option key={p.id} value={p.id}>{p.name}{online(p) ? "" : " (offline)"}</option>)}
                  </select>
                </div>
                <div className="min-w-[220px] flex-1">
                  <label htmlFor="bb-every" className="mb-1.5 block text-sm font-medium text-slate-700">Speed test</label>
                  <select id="bb-every" name="speed_every" defaultValue="60" className={input}>
                    <option value="60">Every hour (about 3.4 GB a day)</option>
                    <option value="30">Every 30 minutes (about 7 GB a day)</option>
                    <option value="180">Every 3 hours (about 1.1 GB a day)</option>
                    <option value="0">None, pings only (a few MB a day)</option>
                  </select>
                </div>
                <SubmitButton pendingLabel="Sending" className={primary}>{bbStart ? "Start the test again" : "Start the broadband test"}</SubmitButton>
                <p className="basis-full text-xs text-slate-500">Ask about a data allowance first: a 5G or mobile plan may have one. {bbStart ? "Starting again files the log so far away on the Pi and begins a fresh one." : "The first minute's result shows in the history within a few seconds."}</p>
              </ActionForm>
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                {([
                  { intent: "look", label: "Look at the log now", tone: plain, off: !bbRunning ? "Only while the test is running." : undefined },
                  { intent: "collect", label: "Stop and collect the log", tone: primary, off: !bbRunning ? "The test is not running." : undefined },
                  { intent: "file", label: "File in Drive", tone: plain, off: !a.drive?.dataId ? "Make the Drive folder first." : !bbCopies.length ? "No log yet." : undefined },
                  { intent: "clear", label: "Clear the Pi's copy", tone: plain, off: !bbToClear.length ? "The Pi holds no broadband log the portal has an exact copy of." : undefined },
                ] as const).map((b) => b.off ? (
                  <button key={b.intent} type="button" disabled title={b.off} className={`${b.tone} cursor-not-allowed opacity-50`}>{b.label}</button>
                ) : (
                  <ActionForm key={b.intent} action={broadbandAction} className="inline-flex flex-col">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="intent" value={b.intent} />
                    <SubmitButton pendingLabel="Sending" className={b.tone}>{b.label}</SubmitButton>
                  </ActionForm>
                ))}
              </div>
              {evidence ? (
                <div className="space-y-3">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                    <div><dt className="text-xs text-slate-500">Measured</dt><dd className="font-semibold tabular-nums">{evidence.figures.internet.minutes} minutes over {Math.round(evidence.figures.spanHours)} hours</dd></div>
                    <div><dt className="text-xs text-slate-500">Loss to the internet</dt><dd className="font-semibold tabular-nums">{evidence.figures.internet.lossPct}%{evidence.figures.router ? `, router ${evidence.figures.router.lossPct}%` : ""}</dd></div>
                    <div><dt className="text-xs text-slate-500">Drops</dt><dd className="font-semibold tabular-nums">{evidence.figures.outages.length} ({evidence.figures.broadbandOutageMinutes + evidence.figures.houseOutageMinutes} min)</dd></div>
                    <div><dt className="text-xs text-slate-500">Minutes a call would stutter</dt><dd className="font-semibold tabular-nums">{evidence.figures.callTroubleMinutes}</dd></div>
                    <div><dt className="text-xs text-slate-500">Download, typical</dt><dd className="font-semibold tabular-nums">{evidence.figures.down ? `${evidence.figures.down.median} Mbps` : "no speed tests"}</dd></div>
                    <div><dt className="text-xs text-slate-500">Jitter, typical</dt><dd className="font-semibold tabular-nums">{evidence.figures.internet.jitterMedian ?? "-"} ms</dd></div>
                    <div><dt className="text-xs text-slate-500">Lag under load</dt><dd className="font-semibold tabular-nums">{evidence.figures.loadedLatencyMedian ?? "-"} ms, quiet {evidence.figures.idleLatencyMedian ?? "-"} ms</dd></div>
                    <div><dt className="text-xs text-slate-500">Points at</dt><dd className="font-semibold">{{ broadband: "the broadband", house: "the house side", both: "both", clean: "nothing: clean", none: "too little data" }[evidence.figures.finding]}</dd></div>
                  </dl>
                  {evidence.figures.spanHours < 24 * 6 && <p className="text-amber-800">The log covers {Math.round(evidence.figures.spanHours)} hours so far, not a full week.</p>}
                  <a href={`/crm/network/assessments/${a.id}/broadband`} target="_blank" rel="noopener" className={plain}>
                    Open the evidence report <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              ) : bbStart ? (
                <p className="text-slate-600">No log here yet. Look at the log while it runs, or collect it at the end.</p>
              ) : null}
            </div>
          </Panel>
        </div>

        <div id="booking" className="scroll-mt-44 lg:scroll-mt-28">{form("booking")}</div>
        <div id="complaint" className="scroll-mt-44 lg:scroll-mt-28">{form("customer")}</div>
        <div id="line" className="scroll-mt-44 lg:scroll-mt-28">{form("line")}</div>
        <div id="sockets" className="scroll-mt-44 lg:scroll-mt-28">{form("sockets", { measure: { readings: socketReadings, pending: pendingRows }, lineSpeed })}</div>
        <div id="rooms" className="scroll-mt-44 lg:scroll-mt-28">{form("rooms")}</div>
        <div id="trial" className="scroll-mt-44 lg:scroll-mt-28">{form("trial", { buttons: trialButtons, pings }, (
          <div className="space-y-4">
            {baseline && <p className="text-sm text-slate-700">Baseline measured by the Pi {when(baseline.at)}: <span className="font-semibold">{baseline.down ?? "no reading"} down, {baseline.up ?? "no reading"} up</span> (Mbps). It is used in the report in place of anything typed above.</p>}
            {startCmd && (
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{startCmd.action === "start_trial" ? "Trial started" : "Watched devices changed"} {when(startCmd.finished_at)}</p>
                {(() => {
                  const r = (startCmd.result ?? {}) as { archived?: { dir: string; files: { name: string }[] } | null; log_lines?: number };
                  return (
                    <>
                      {r.archived && <p>The previous logs were filed on the Pi in {r.archived.dir} ({r.archived.files.map((f) => f.name).join(", ")}), not deleted.</p>}
                      {typeof r.log_lines === "number" && <p>{r.log_lines > 0 ? "The first reading has landed in the new log." : "The first reading has not landed yet. Run the check."}</p>}
                    </>
                  );
                })()}
              </div>
            )}
            {check ? <CheckPanel check={check} byEye={byEye} /> : <p className="text-sm text-slate-600">The pre-departure check has not been run yet.</p>}
          </div>
        ))}</div>
        <div id="photos" className="scroll-mt-44 lg:scroll-mt-28">{form("photos", {}, a.drive?.photosId ? (
          <a href={folderUrl(a.drive.photosId)} target="_blank" rel="noopener" className={plain}>Open the Photos folder <ExternalLink className="h-4 w-4" aria-hidden="true" /></a>
        ) : <p className="text-sm text-slate-600">Make the Drive folder to get a Photos folder for these.</p>)}</div>

        {(started || a.stage === "trial") && (
          <Panel title="During the three days">
            <div className="px-4 py-4"><TrialStatus node={node} startedAt={a.trial_started_at} collectionAt={a.collection_at} /></div>
          </Panel>
        )}

        <div id="collection" className="scroll-mt-44 lg:scroll-mt-28">{form("collection", { buttons: collectionButtons }, (
          <div className="space-y-3">
            {final && <p className="text-sm text-slate-700">Final reading by the Pi {when(final.at)}: <span className="font-semibold">{final.down ?? "no reading"} down, {final.up ?? "no reading"} up</span> (Mbps).</p>}
            <LogsPanel figures={figures} devices={logs.devices?.devices ?? null} copies={copies} />
          </div>
        ))}</div>

        <div id="conclusions" className="scroll-mt-44 lg:scroll-mt-28">{form("conclusions", {}, (
          <div className="space-y-1 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {suggested != null && <p>Your rule on €{hardware} of hardware: <span className="font-semibold">€{new Intl.NumberFormat("en-IE").format(suggested)}</span> including VAT.</p>}
            {sag != null && <p>From the log: the evening (18:00 to 23:00) was {sag >= 1 ? `${sag}% lower` : sag <= -1 ? `${-sag}% higher` : "no different"} than the rest of the day, in the down direction.</p>}
            <p>Monitoring is left out of the report until its price is settled.</p>
          </div>
        ))}</div>

        <div id="report" className="scroll-mt-44 lg:scroll-mt-28">{form("report", {}, null)}</div>

        <div id="report-approve" className="scroll-mt-44 lg:scroll-mt-28">
          <Panel title="Draft and approval">
            <div className="space-y-4 px-4 py-4 text-sm">
              {report.missing.length > 0 ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900">
                  <p className="font-semibold">The report cannot be approved yet. Still missing:</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5">{report.missing.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              ) : (
                <p className="font-semibold text-emerald-800">Every figure the report needs is here.</p>
              )}
              {report.notes.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  <ul className="list-disc space-y-0.5 pl-5">{report.notes.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <a href={`/crm/network/assessments/${a.id}/report`} target="_blank" rel="noopener" className={plain}>
                  Preview the draft <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>
              <ActionForm action={approveReport} className="space-y-2">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="hash" value={hash} />
                <p className="text-slate-600">Approving keeps this exact version and, when the folder exists, saves it to the Report folder in Drive. Nothing is sent to the customer.</p>
                {report.missing.length ? (
                  <button type="button" disabled className={`${primary} cursor-not-allowed opacity-50`}>Approve this version</button>
                ) : (
                  <SubmitButton pendingLabel="Approving" className={primary}>Approve this version</SubmitButton>
                )}
              </ActionForm>
              <Versions versions={versions} assessmentId={a.id} />
            </div>
          </Panel>
        </div>

        <Panel title="History">
          <History events={events} />
        </Panel>

        <Panel title="Stage" tone="quiet">
          <ActionForm action={setStage} className="flex flex-wrap items-end gap-3 px-4 py-4">
            <input type="hidden" name="id" value={a.id} />
            <div className="min-w-[200px]">
              <label htmlFor="stage" className="mb-1.5 block text-sm font-medium text-slate-700">Stage</label>
              <select id="stage" name="stage" defaultValue={a.stage} className={input}>
                {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <SubmitButton pendingLabel="Saving" className={plain}>Save</SubmitButton>
            <p className="basis-full text-xs text-slate-500">The stage moves on by itself as the Pi reports: the trial when it starts, collected when the logs arrive, report approved on approval.</p>
          </ActionForm>
        </Panel>

        <p className="pb-6 text-xs text-slate-500">
          <Link href="/crm/network/pis" className="underline">Pis</Link> · Sections follow the capture sheet ({SECTIONS.length} sections).
        </p>
      </div>
    </>
  );
}
