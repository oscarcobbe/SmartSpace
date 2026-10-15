/**
 * The broadband evidence report as a page, for one assessment: its customer,
 * the provider and package from the capture sheet, and the newest
 * broadband.csv the Pi sent. The house style comes from the assessment
 * template (imported as text, as in report.ts); the figures and the wording
 * from broadband.ts.
 */
import TEMPLATE from "../../../docs/report-style/network-assessment.html";
import { broadbandFigures, renderEvidence, type BbParse, type BroadbandFigures } from "./broadband";
import { numberOf } from "./capture";
import type { Assessment, Command } from "./store";

/** The newest broadband test started for this assessment that the Pi carried out. */
export function lastBroadbandStart(commands: Command[]): Command | null {
  return commands.find((c) => c.action === "start_broadband" && c.state === "done") ?? null;
}

export function evidenceFor(a: Assessment, log: BbParse | null, commands: Command[]): { figures: BroadbandFigures; html: string } | null {
  const figures = log ? broadbandFigures(log.rows) : null;
  if (!figures) return null;
  const c = a.capture ?? {};
  const provider = String((c.customer as Record<string, unknown> | undefined)?.provider ?? "").trim() || null;
  const every = (lastBroadbandStart(commands)?.result as { speed_every?: number } | null)?.speed_every;
  const html = renderEvidence(TEMPLATE, {
    customerName: a.customer_name,
    address: [a.address, a.eircode].filter(Boolean).join(", ") || null,
    provider,
    packageMbps: numberOf(c, "customer", "packageMbps"),
    figures,
    speedEvery: typeof every === "number" ? every : null,
    reportDate: new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "long", year: "numeric" }).format(new Date()),
  });
  return { figures, html };
}
