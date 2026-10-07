import Link from "next/link";
import { requireSession } from "@/lib/crm/session";
import { crmConfigured } from "@/lib/crm/db";
import { listPis, listAssessments, commandsForPi, eventsForPi, type Pi, type Assessment } from "@/lib/network/store";
import { PI_ACTIONS } from "@/lib/network/pi-protocol";
import { PageHeader, Panel, Note, Pill, Empty } from "../../ui";
import { BackTo, online, piWorries } from "../assessments/parts";
import { ago, when } from "../assessments/format";
import { AddPiForm, PiKeyForms } from "./key-forms";

export const dynamic = "force-dynamic";

/**
 * The measuring Pis: whether each is on, what it last said about itself, what
 * it still holds from earlier houses, and its key.
 */

function Facts({ pi }: { pi: Pi }) {
  const s = pi.status ?? {};
  const rows: [string, string][] = [
    ["Wired address (eth0)", s.ip_eth0 ?? "none"],
    ["Gateway", s.gateway ?? "unknown"],
    ["Temperature", typeof s.temp_c === "number" ? `${s.temp_c}C` : "unknown"],
    ["Power", s.throttled ? (/0x0$/.test(s.throttled) ? "clean" : `warning ${s.throttled}`) : "unknown"],
    ["Card", s.disk_pct ? `${s.disk_pct} full` : "unknown"],
    ["Up for", typeof s.uptime_s === "number" ? `${Math.floor(s.uptime_s / 3600)} hours` : "unknown"],
    ["Program version", pi.agent_version ?? "unknown"],
    ["Calling from", pi.last_ip ?? "unknown"],
  ];
  if (pi.role === "server") {
    rows.push(["iperf3 server", (s.iperf3_running ?? 0) > 0 ? "running" : "not running"]);
    rows.push(["Restarts after a power cut", (s.reboot_cron ?? 0) > 0 ? "yes" : "no @reboot line"]);
  } else {
    rows.push(["Hourly test", (s.cron_iperf ?? 0) > 0 ? `scheduled (${s.cron_sched ?? "?"})${(s.cron_both ?? 0) > 0 ? ", both directions" : ", one direction"}` : "not scheduled"]);
    rows.push(["iperf.log", `${Math.round((s.log_bytes ?? 0) / 1024)} KB, ${s.log_lines ?? 0} lines${s.log_last_stamp ? `, last ${s.log_last_stamp}` : ""}`]);
    rows.push(["Watched devices", s.devices_conf?.length ? s.devices_conf.map((d) => `${d.name} (${d.ip})`).join(", ") : "none"]);
    rows.push(["Remote access (Pi Connect)", s.rpi_connect ?? "unknown"]);
  }
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-wrap justify-between gap-x-3 border-b border-slate-100 py-1.5">
          <dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Archive({ pi, byPrefix }: { pi: Pi; byPrefix: Map<string, Assessment> }) {
  const held = pi.status?.archive ?? [];
  if (!held.length) return <p className="text-sm text-slate-600">Holds no earlier logs.</p>;
  return (
    <div className="space-y-2">
      <p className="text-sm text-amber-900">Holds logs from earlier houses. Clear them from each assessment&apos;s Collection section once they are filed, so they do not travel to the next customer&apos;s house.</p>
      <ul className="space-y-1 text-sm">
        {held.map((a) => {
          const owner = byPrefix.get(a.dir.split("-")[2] ?? "");
          return (
            <li key={a.dir} className="flex flex-wrap gap-x-2">
              <span className="font-mono text-[13px]">{a.dir}</span>
              <span className="text-slate-600">{a.files.map((f) => `${f.name} ${Math.round(f.bytes / 1024)} KB`).join(", ")}</span>
              {owner && <Link href={`/crm/network/assessments/${owner.id}#collection`} className="font-medium underline">{owner.customer_name}</Link>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function Pis() {
  const session = requireSession();
  if (session.site !== "smart-space") {
    return (
      <>
        <PageHeader title="Pis" />
        <Note tone="warn">The network service is Smart Space&apos;s. Switch to Smart Space at the top of the menu.</Note>
      </>
    );
  }
  let pis: Pi[] = [], assessments: Assessment[] = [], problem: string | null = null;
  if (!crmConfigured()) problem = "The database is not connected on this deployment.";
  else {
    try { [pis, assessments] = await Promise.all([listPis(), listAssessments()]); }
    catch (err) { problem = `The Pis could not be read (${err instanceof Error ? err.message.slice(0, 160) : "no answer"}).`; }
  }
  const byPrefix = new Map(assessments.map((a) => [a.id.slice(0, 8), a]));
  const detail = await Promise.all(pis.map(async (p) => ({
    pi: p,
    commands: await commandsForPi(p.id, 12).catch(() => []),
    events: await eventsForPi(p.id, 8).catch(() => []),
  })));

  return (
    <>
      <BackTo href="/crm/network/assessments">All assessments</BackTo>
      <PageHeader
        title="Pis"
        sub="The two measuring Pis. Each calls in to the portal every minute, every few seconds while an assessment is open, and only ever does the seven things the portal can ask of it."
      />
      {problem && <div className="mb-6"><Note tone="warn">{problem}</Note></div>}

      <div className="space-y-6">
        {pis.length === 0 && !problem && (
          <Panel><Empty title="No Pis yet" detail="Add each Pi below. Its key is shown once, for the installer." /></Panel>
        )}
        {detail.map(({ pi, commands, events }) => {
          const up = online(pi);
          const worries = up ? piWorries(pi) : [];
          return (
            <section key={pi.id} id={`pi-${pi.id}`} className="scroll-mt-20">
              <Panel
                title={pi.name}
                aside={
                  <span className="flex flex-wrap items-center gap-2">
                    <Pill className={pi.revoked_at ? "bg-rose-50 text-rose-800 ring-rose-600/20" : up ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20" : "bg-slate-100 text-slate-700 ring-slate-500/20"}>
                      {pi.revoked_at ? "Switched off" : up ? "On" : "Offline"}
                    </Pill>
                    <span className="text-xs text-slate-500">{pi.role === "node" ? "On the trial floor" : "At the router"}</span>
                  </span>
                }
              >
                <div className="space-y-5 px-4 py-4">
                  <p className="text-sm text-slate-700">
                    {pi.last_seen_at ? `Last called in ${ago(pi.last_seen_at)} (${when(pi.last_seen_at)}).` : "Has never called in. Run the installer on it."}
                    {" "}Key ending {pi.key_hint}, made {when(pi.key_set_at)}.
                  </p>
                  {worries.length > 0 && <Note tone="warn">{worries.join(". ")}.</Note>}
                  <Facts pi={pi} />
                  {pi.role === "node" && <Archive pi={pi} byPrefix={byPrefix} />}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Recent instructions</h3>
                    {commands.length === 0 ? <p className="mt-1 text-sm text-slate-500">None yet.</p> : (
                      <ul className="mt-1.5 divide-y divide-slate-100 text-sm">
                        {commands.map((c) => (
                          <li key={c.id} className="flex flex-wrap justify-between gap-x-3 py-1.5">
                            <span className="text-slate-800">
                              {PI_ACTIONS[c.action]?.label ?? c.action}
                              {c.assessment_id && byPrefix.get(c.assessment_id.slice(0, 8)) ? `, ${byPrefix.get(c.assessment_id.slice(0, 8))!.customer_name}` : ""}
                              {c.error ? `: ${c.error}` : ""}
                            </span>
                            <span className="text-xs text-slate-500">{c.state}, {when(c.finished_at ?? c.created_at)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {events.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">History</h3>
                      <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
                        {events.map((e) => <li key={e.id}>{e.summary} <span className="text-xs text-slate-500">{when(e.at)}</span></li>)}
                      </ul>
                    </div>
                  )}
                  <PiKeyForms id={pi.id} name={pi.name} />
                </div>
              </Panel>
            </section>
          );
        })}

        <Panel title="Add a Pi">
          <AddPiForm />
        </Panel>

        <Panel title="Installing the program on a Pi" tone="quiet">
          <div className="space-y-2 px-4 py-4 text-sm leading-relaxed text-slate-700">
            <p>From the Mac, on the same network as the Pi, in the SmartSpace folder: <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[13px]">scripts/network-pi/install.sh smartspace-node1.local node</code>, or <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[13px]">smartspace-server.local server</code> for the Pi at the router.</p>
            <p>It copies the program, asks for the key the portal showed, starts it, and waits until the portal hears from the Pi. The Pi then appears above as On. Your own scripts (check, collect, targetdevicewatch) keep working beside it: the logs are the same files.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
