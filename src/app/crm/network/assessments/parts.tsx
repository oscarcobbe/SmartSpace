/**
 * The pieces of the assessment page that only read: the Pis, the check, the
 * logs, the report and the history. Server components, drawn fresh on every
 * refresh while a Pi is working.
 */
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ExternalLink, Circle } from "lucide-react";
import type { CheckResult } from "@/lib/network/check";
import { BY_EYE } from "@/lib/network/check";
import type { Pi, NetworkEvent, ReportVersion, LogCopy, Command } from "@/lib/network/store";
import type { TrialFigures, DeviceRecord } from "@/lib/network/logs";
import { PI_ACTIONS } from "@/lib/network/pi-protocol";
import { ago, when, clock, secondsSince } from "./format";
import { Pill } from "../../ui";

export function BackTo({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-[0_1px_2px_rgb(15_23_42/0.04)] hover:bg-slate-50">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

export function online(pi: Pi | null, now = Date.now()): boolean {
  const s = secondsSince(pi?.last_seen_at, now);
  return s != null && s < 180;
}

/** Things worth saying about a Pi's health, from its last report. */
export function piWorries(pi: Pi): string[] {
  const s = pi.status ?? {};
  const out: string[] = [];
  if (s.ip_eth0 === null) out.push(pi.role === "node" ? "no address on eth0: the powerline link is not carrying traffic" : "no address on eth0: the Ethernet lead is not working");
  if (s.throttled && !/0x0$/.test(s.throttled)) out.push(`power warning ${s.throttled}`);
  if (typeof s.temp_c === "number" && s.temp_c >= 70) out.push(`running warm at ${s.temp_c}C`);
  if (pi.role === "server" && s.iperf3_running === 0) out.push("iperf3 server not running");
  return out;
}

export function PiStrip({ node, server, assessmentId }: { node: Pi | null; server: Pi | null; assessmentId: string }) {
  const one = (pi: Pi | null, role: string) => {
    if (!pi) {
      return (
        <div className="flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-600">
          <Circle className="h-3 w-3 text-slate-400" aria-hidden="true" /> No {role} chosen. <Link href="/crm/network/pis" className="font-medium underline">Pis</Link>
        </div>
      );
    }
    const up = online(pi);
    const worries = up ? piWorries(pi) : [];
    const elsewhere = pi.role === "node" && pi.status?.job && pi.status.job !== assessmentId;
    return (
      <Link href={`/crm/network/pis#pi-${pi.id}`} className="flex min-h-[44px] flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${up ? (worries.length ? "bg-amber-500" : "bg-emerald-500") : "bg-slate-300"}`} aria-hidden="true" />
        <span className="font-semibold text-slate-900">{pi.name}</span>
        <span className="text-slate-600">{up ? `called in ${ago(pi.last_seen_at)}` : pi.last_seen_at ? `offline, last heard ${ago(pi.last_seen_at)}` : "has never called in"}</span>
        {worries.map((w) => <span key={w} className="text-amber-800">{w}</span>)}
        {elsewhere && <span className="text-amber-800">holding another assessment&apos;s trial</span>}
      </Link>
    );
  };
  return (
    <div className="mb-5 grid gap-2 sm:grid-cols-2">
      {one(node, "node Pi")}
      {one(server, "Pi at the router")}
    </div>
  );
}

const ICON = {
  ok: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="ok" />,
  note: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="check" />,
  fail: <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-label="fail" />,
};

export function CheckPanel({ check, byEye }: { check: CheckResult; byEye: Record<string, boolean> }) {
  const tone = check.fail ? "border-rose-200 bg-rose-50 text-rose-900" : check.warn ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return (
    <div className="space-y-4">
      <div className={`rounded-lg border px-4 py-3 text-sm font-semibold ${tone}`}>
        {check.summary}
        {check.ranAt && <span className="ml-2 font-normal opacity-80">Checked {when(check.ranAt)}.</span>}
      </div>
      {check.sections.map((sec) => (
        <div key={sec.title}>
          <h4 className="text-sm font-semibold text-slate-900">{sec.title}</h4>
          {sec.extra && sec.extra.length > 0 && (
            <dl className="mt-1.5 grid grid-cols-2 gap-x-4 text-sm sm:grid-cols-4">
              {sec.extra.map((x) => (
                <div key={x.label}><dt className="text-xs text-slate-500">{x.label}</dt><dd className="font-semibold tabular-nums text-slate-900">{x.value}</dd></div>
              ))}
            </dl>
          )}
          <ul className="mt-1.5 space-y-1">
            {sec.lines.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-800">{ICON[l.level]}<span>{l.text}</span></li>
            ))}
            {sec.lines.length === 0 && <li className="text-sm text-slate-500">Nothing to check.</li>}
          </ul>
        </div>
      ))}
      <div>
        <h4 className="text-sm font-semibold text-slate-900">By eye, before you walk out</h4>
        <ul className="mt-1.5 space-y-1">
          {BY_EYE.map((b) => (
            <li key={b.key} className="flex items-start gap-2 text-sm text-slate-800">
              {byEye[b.key] ? ICON.ok : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-label="not ticked" />}
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1.5 text-xs text-slate-500">Ticked from Step 4. The Pi cannot see these.</p>
      </div>
    </div>
  );
}

const mb = (x: number | null | undefined) => (x == null ? "no reading" : `${Math.round(x * 10) / 10} Mbps`);

export function LogsPanel({ figures, devices, copies }: {
  figures: TrialFigures | null;
  devices: DeviceRecord[] | null;
  copies: LogCopy[];
}) {
  if (!figures && !devices) {
    return <p className="text-sm text-slate-600">No logs yet. Look at the logs during the trial, or collect them at the collection visit.</p>;
  }
  const evDown = figures?.evening.down;
  const sag = evDown ? Math.round((1 - evDown.evening / evDown.rest) * 100) : null;
  return (
    <div className="space-y-5">
      {figures && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900">The hourly tests (iperf.log)</h4>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-slate-500">Hourly tests</dt><dd className="font-semibold tabular-nums">{figures.tests} over {Math.round(figures.spanHours)} hours</dd></div>
            <div><dt className="text-xs text-slate-500">down, median</dt><dd className="font-semibold tabular-nums">{mb(figures.down?.median)}</dd></div>
            <div><dt className="text-xs text-slate-500">up, median</dt><dd className="font-semibold tabular-nums">{mb(figures.up?.median)}</dd></div>
            <div><dt className="text-xs text-slate-500">down, lowest</dt><dd className="font-semibold tabular-nums">{mb(figures.down?.min)}</dd></div>
          </dl>
          {evDown && (
            <p className="mt-3 text-sm text-slate-700">
              Evening (18:00 to 23:00) down {mb(evDown.evening)} against {mb(evDown.rest)} the rest of the day:{" "}
              <span className="font-semibold">{sag != null && sag >= 1 ? `${sag}% lower in the evening` : sag != null && sag <= -1 ? `${-sag}% higher in the evening` : "no evening sag"}</span>.
            </p>
          )}
          {figures.spanHours < 60 && <p className="mt-2 text-sm text-amber-800">The log covers {Math.round(figures.spanHours)} hours, not three full days.</p>}
          {figures.gaps.length > 0 ? (
            <p className="mt-2 text-sm text-amber-800">
              {figures.gaps.length} hour{figures.gaps.length === 1 ? "" : "s"} without a full reading: {figures.gaps.map((g) => `${g.stamp.slice(5)} (${g.note})`).join(", ")}.
            </p>
          ) : (
            <p className="mt-2 text-sm text-emerald-800">Every hourly test has both directions.</p>
          )}
        </div>
      )}
      {devices && devices.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Per device (devices.log)</h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr><th className="py-1.5 pr-3 font-medium">Device</th><th className="py-1.5 pr-3 font-medium">Checks</th><th className="py-1.5 pr-3 font-medium">Missed</th><th className="py-1.5 pr-3 font-medium">Up</th><th className="py-1.5 font-medium">When the drops happened</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {devices.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2 pr-3 font-medium text-slate-900">{d.name}<span className="block text-xs font-normal text-slate-500">{d.ip}</span></td>
                    <td className="py-2 pr-3 tabular-nums">{d.checks}</td>
                    <td className={`py-2 pr-3 tabular-nums ${d.missed ? "text-rose-700" : ""}`}>{d.missed}</td>
                    <td className="py-2 pr-3 tabular-nums">{d.pctUp}%</td>
                    <td className="py-2 text-slate-700">
                      {d.missed === d.checks ? "Never answered: it may ignore pings. Use the Deco log for it."
                        : d.drops.length ? d.drops.map((x) => (x.from === x.to ? x.from.slice(5) : `${x.from.slice(5)} to ${x.to.slice(11)}`)).join(", ") : "No drops"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {copies.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Copies held</h4>
          <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
            {copies.map((c) => (
              <li key={c.id}>
                {c.kind === "iperf" ? "iperf.log" : "devices.log"}, {Math.round(c.bytes / 1024)} KB, {c.final ? "final" : "during the trial"}, received {when(c.received_at)}
                {c.filed_at ? ", filed in Drive" : ""}
                {c.cleared_on_pi_at ? ", cleared from the Pi" : ""}
                <span className="block font-mono text-[11px] text-slate-500">{c.sha256.slice(0, 16)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TrialStatus({ node, startedAt, collectionAt }: { node: Pi | null; startedAt: string | null; collectionAt: string | null }) {
  const s = node?.status ?? {};
  const hours = startedAt ? (Date.now() - Date.parse(startedAt)) / 3_600_000 : null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
      <div><dt className="text-xs text-slate-500">Started</dt><dd className="font-semibold">{startedAt ? when(startedAt) : "not yet"}</dd></div>
      <div><dt className="text-xs text-slate-500">Running for</dt><dd className="font-semibold tabular-nums">{hours != null ? `${Math.floor(hours / 24)} days ${Math.floor(hours % 24)} hours` : "not started"}</dd></div>
      <div><dt className="text-xs text-slate-500">Last hourly reading</dt><dd className="font-semibold">{s.log_last_stamp ?? "none yet"}</dd></div>
      <div><dt className="text-xs text-slate-500">Readings so far</dt><dd className="font-semibold tabular-nums">{s.log_lines ?? 0} lines, {s.devices_lines ?? 0} device checks</dd></div>
      <div><dt className="text-xs text-slate-500">Collection</dt><dd className="font-semibold">{collectionAt ? when(collectionAt) : "not set"}</dd></div>
      <div><dt className="text-xs text-slate-500">Node Pi up for</dt><dd className="font-semibold tabular-nums">{typeof s.uptime_s === "number" ? `${Math.floor(s.uptime_s / 3600)} hours` : "unknown"}{typeof s.uptime_s === "number" && hours != null && s.uptime_s / 3600 < hours - 1 ? ", so it restarted during the trial (a power cut?)" : ""}</dd></div>
    </dl>
  );
}

export function Waiting({ commands }: { commands: Command[] }) {
  if (!commands.length) return null;
  return (
    <ul className="space-y-1.5">
      {commands.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" aria-hidden="true" />
          <span className="font-medium">{PI_ACTIONS[c.action]?.label ?? c.action}</span>
          <span>{c.state === "queued" ? `waiting for the Pi to call in (asked ${clock(c.created_at)})` : c.sent_at ? `the Pi is on it (since ${clock(c.sent_at)})` : "the Pi is on it"}</span>
        </li>
      ))}
    </ul>
  );
}

export function Failures({ commands }: { commands: Command[] }) {
  const recent = commands.filter((c) => (c.state === "failed" || c.state === "expired") && c.finished_at && Date.now() - Date.parse(c.finished_at) < 6 * 3_600_000).slice(0, 3);
  if (!recent.length) return null;
  return (
    <ul className="space-y-1.5">
      {recent.map((c) => (
        <li key={c.id} className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span><span className="font-medium">{PI_ACTIONS[c.action]?.label ?? c.action}</span>, {clock(c.finished_at)}: {c.error ?? "failed"}</span>
        </li>
      ))}
    </ul>
  );
}

export function History({ events }: { events: NetworkEvent[] }) {
  if (!events.length) return <p className="px-4 py-4 text-sm text-slate-500">Nothing yet.</p>;
  return (
    <ol className="divide-y divide-slate-100">
      {events.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm">
          <span className="min-w-0 text-slate-800">{e.summary}</span>
          <span className="shrink-0 text-xs text-slate-500">{when(e.at)}{e.actor ? `, ${e.actor}` : ""}</span>
        </li>
      ))}
    </ol>
  );
}

export function Versions({ versions, assessmentId }: { versions: ReportVersion[]; assessmentId: string }) {
  if (!versions.length) return null;
  return (
    <ul className="space-y-1.5 text-sm">
      {versions.map((v) => (
        <li key={v.id} className="flex flex-wrap items-center gap-2">
          <a href={`/crm/network/assessments/${assessmentId}/report?v=${v.version}`} target="_blank" rel="noopener"
            className="inline-flex min-h-[36px] items-center gap-1.5 font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">
            Version {v.version} <ExternalLink className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          </a>
          <Pill className="bg-emerald-50 text-emerald-800 ring-emerald-600/20">Approved</Pill>
          <span className="text-slate-600">{v.approved_at ? when(v.approved_at) : ""}{v.approved_by ? ` by ${v.approved_by}` : ""}{v.drive_file_id ? ", in Drive" : ""}</span>
        </li>
      ))}
    </ul>
  );
}
