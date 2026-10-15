/**
 * The broadband evidence report, for Nigel only, drawn from the newest
 * broadband.csv the Pi sent. A strip at the top offers Print, which is how it
 * becomes a PDF for the customer to send to their provider; the strip does
 * not print. Nothing here is sent to anyone.
 */
import { cookies } from "next/headers";
import { COOKIE, readSessionCookie } from "@/lib/crm/auth";
import { getAssessment, commandsFor } from "@/lib/network/store";
import { parsedLogs } from "@/lib/network/flow";
import { evidenceFor } from "@/lib/network/evidence";
import { UUID_RE } from "@/lib/network/pi-protocol";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });

function strip(html: string, text: string): string {
  const bar = `<div class="crm-strip" style="position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;padding:10px 16px;background:#fff7d6;border-bottom:1px solid #d9d4c7;font:600 14px/1.4 system-ui,sans-serif;color:#26221E">`
    + `<span>${text}</span>`
    + `<button type="button" onclick="window.print()" style="min-height:40px;padding:0 16px;border-radius:8px;border:1px solid #26221E;background:#26221E;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer">Print or save as PDF</button>`
    + `</div><style>@media print{.crm-strip{display:none!important}}</style>`;
  return html.replace(/<body([^>]*)>/i, (m) => `${m}${bar}`);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  let session = null;
  try { session = readSessionCookie(cookies().get(COOKIE)?.value); } catch { session = null; }
  if (!session || session.site !== "smart-space") return notFound();
  if (!UUID_RE.test(params.id)) return notFound();
  const a = await getAssessment(params.id);
  if (!a) return notFound();
  const [commands, logs] = await Promise.all([commandsFor(a.id), parsedLogs(a.id)]);
  const evidence = evidenceFor(a, logs.broadband, commands);
  if (!evidence) return new Response("No broadband log yet. Look at the log or collect it from the assessment page first.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const which = logs.broadbandCopy?.final ? "From the collected log." : "From a copy taken while the test is still running, so it will change.";
  return new Response(strip(evidence.html, `Broadband evidence report. ${which} Nothing has been sent to the customer.`), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
