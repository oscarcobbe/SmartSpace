import { NextResponse } from "next/server";
import { crm } from "@/lib/crm/db";

/**
 * How many people answer the cookie banner, and how, on both sites.
 *
 * Google Ads only ever counts visitors who press Accept, so the acceptance
 * rate is the ceiling on every ad figure, and nobody knew it. The banner's own
 * measurement went to Google Analytics: on this site it was never recorded at
 * all (0 in the 14 days to 23 September, against 307 sessions), because the
 * site loads gtag directly and gtag ignores GTM-style dataLayer events; on
 * smartcareliving.ie it recorded 1 in 246. Counting consent through a system
 * that only sees consenting visitors was never going to work anyway.
 *
 * So: counted here, first party. The body is one word; the site comes from the
 * Origin header, never from the body, so one site cannot write the other's
 * figures. Nothing identifying is kept: a site, a Dublin day, an event, a
 * number (crm_consent_tally in SmartCRM).
 */

export const dynamic = "force-dynamic";

const SITES: Record<string, "smart-space" | "smartcareliving"> = {
  "https://smart-space.ie": "smart-space",
  "https://www.smart-space.ie": "smart-space",
  "https://smartcareliving.ie": "smartcareliving",
  "https://www.smartcareliving.ie": "smartcareliving",
};
const EVENTS = new Set(["shown", "granted", "denied"]);

function cors(origin: string | null): Record<string, string> {
  return origin && SITES[origin]
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type", Vary: "Origin" }
    : { Vary: "Origin" };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: cors(request.headers.get("origin")) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = cors(origin);
  const site = origin ? SITES[origin] : undefined;
  if (!site) return NextResponse.json({ error: "origin" }, { status: 403, headers });

  let event = "";
  try {
    /* text/plain from the browser, so the cross-site call from
       smartcareliving.ie is a simple request with no preflight. */
    event = String((JSON.parse(await request.text()) as { event?: unknown }).event ?? "");
  } catch {
    return NextResponse.json({ error: "body" }, { status: 400, headers });
  }
  if (!EVENTS.has(event)) return NextResponse.json({ error: "event" }, { status: 400, headers });

  try {
    await crm("rpc/crm_consent_tally_bump", {
      method: "POST",
      body: JSON.stringify({ p_site: site, p_event: event }),
    });
  } catch (e) {
    /* A count is never worth an error in front of a visitor. */
    console.error("[consent-tally]", e instanceof Error ? e.message : e);
  }
  return new NextResponse(null, { status: 204, headers });
}
