/**
 * The report as a page: the house template with this assessment's figures in it.
 *
 * The template is docs/report-style/network-assessment.html, the same file
 * Nigel's own Claude reads to make a report by hand, imported as text when the
 * site is built (the webpack rule in next.config.mjs), so a change to the
 * house style reaches both the same day and there is no second copy to drift.
 */
import { createHash } from "crypto";
import TEMPLATE from "../../../docs/report-style/network-assessment.html";
import { buildReport, fillTemplate, type ReportData, type ReportSource } from "./report-data";
import type { Assessment, Command } from "./store";
import { readings } from "./flow";
import type { IperfParse, parseDevicesLog } from "./logs";

export function renderReport(R: Record<string, unknown>): string {
  return fillTemplate(TEMPLATE, R);
}

export function htmlHash(html: string): string {
  return createHash("sha256").update(html, "utf8").digest("hex");
}

export function reportFor(
  a: Assessment,
  commands: Command[],
  logs: { iperf: IperfParse | null; devices: ReturnType<typeof parseDevicesLog> | null },
): ReportData {
  const r = readings(commands);
  const socketReadings: ReportSource["socketReadings"] = {};
  for (const [purpose, m] of Array.from(r)) if (purpose.startsWith("socket:")) socketReadings[purpose.slice(7)] = m;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return buildReport({
    customerName: a.customer_name,
    address: a.address,
    eircode: a.eircode,
    visitAt: a.visit_at,
    collectionAt: a.collection_at ?? a.trial_ended_at,
    trialStartedAt: a.trial_started_at,
    capture: a.capture ?? {},
    socketReadings,
    baseline: r.get("baseline") ?? null,
    iperf: logs.iperf,
    devices: logs.devices,
    today,
  });
}
