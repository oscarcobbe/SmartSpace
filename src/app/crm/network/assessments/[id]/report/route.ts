/**
 * The report as the customer would see it, for Nigel only.
 *
 * Without ?v= it is the live draft, drawn from the assessment as it stands.
 * With ?v=2 it is approved version 2 exactly as approved: the stored page,
 * not a fresh drawing, so a later change to the template or a figure cannot
 * alter what was approved.
 *
 * A strip at the top says which it is and offers Print, the way the report is
 * turned into a PDF (File, Print, Save as PDF, as in the report style's
 * SKILL.md). The strip is not part of the report and does not print.
 */
import { cookies } from "next/headers";
import { COOKIE, readSessionCookie } from "@/lib/crm/auth";
import { getAssessment, commandsFor, getReport } from "@/lib/network/store";
import { parsedLogs } from "@/lib/network/flow";
import { reportFor, renderReport } from "@/lib/network/report";
import { UUID_RE } from "@/lib/network/pi-protocol";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });

function strip(html: string, text: string, tone: "draft" | "approved"): string {
  const bg = tone === "draft" ? "#fff7d6" : "#e8f6ec";
  const bar = `<div class="crm-strip" style="position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:10px 16px;background:${bg};border-bottom:1px solid #d9d4c7;font:600 14px/1.4 system-ui,sans-serif;color:#26221E">`
    + `<span>${text}</span>`
    + `<button type="button" onclick="window.print()" style="min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #26221E;background:#26221E;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer">Print or save as PDF</button>`
    + `</div><style>@media print{.crm-strip{display:none!important}}</style>`;
  return html.replace(/<body([^>]*)>/i, (m) => `${m}${bar}`);
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  let session = null;
  try { session = readSessionCookie(cookies().get(COOKIE)?.value); } catch { session = null; }
  if (!session || session.site !== "smart-space") return notFound();
  if (!UUID_RE.test(params.id)) return notFound();
  const a = await getAssessment(params.id);
  if (!a) return notFound();

  const v = new URL(req.url).searchParams.get("v");
  let html: string;
  if (v) {
    const version = await getReport(a.id, Number(v));
    const stored = (version?.data as { html?: string } | undefined)?.html;
    if (!version || !stored) return notFound();
    html = strip(stored, `Version ${version.version}, approved. This is the page exactly as approved.`, "approved");
  } else {
    const [commands, logs] = await Promise.all([commandsFor(a.id), parsedLogs(a.id)]);
    const report = reportFor(a, commands, logs);
    const missing = report.missing.length ? ` Still missing: ${report.missing.length} figure${report.missing.length === 1 ? "" : "s"}, listed on the assessment page.` : "";
    html = strip(renderReport(report.R), `Draft, not approved.${missing}`, "draft");
  }
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
