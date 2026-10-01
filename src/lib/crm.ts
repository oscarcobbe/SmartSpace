// Fire-and-forget client for the SmartCRM inbound webhook.
//
// Posts JSON with HMAC-SHA256 signature in `X-CRM-Signature` header.
// All errors are swallowed and logged, the customer flow must never break
// because the CRM is down.
//
// Required env vars (Vercel project + .env.local):
//   CRM_INBOUND_URL     e.g. https://crm.smart-space.ie/api/inbound/lead
//   CRM_HMAC_SECRET     same value as INBOUND_WEBHOOK_SECRET on the CRM side

import { createHmac } from "crypto";
import type { BrowserContext } from "./server-conversions";

export interface CrmLeadPayload {
  source: string;
  source_detail?: string | null;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  county?: string | null;
  eircode?: string | null;
  message?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  referrer?: string | null;
  tags?: string[];
  custom?: Record<string, unknown>;
}

/**
 * A ChatGPT ad on the CRM lead, as the gclid is a Google ad: the click
 * (custom.oppref) and OpenAI's reference for the browser (custom.obref), for
 * a later sale to be traced to the ad. In custom rather than columns of their
 * own, so the lead insert does not depend on a migration reaching the
 * database first.
 *
 * openAiOk is the route's openAiConsented() answer, the one its Conversions
 * API copy goes by, and without it both are null. browserContext falls back
 * to the form's attribution record, which attribution.ts writes under any
 * Accept, so a visitor who accepted before /privacy named OpenAI and then
 * clicked a ChatGPT ad has a click in it. Nothing told that visitor the
 * click would be kept, and /privacy says it is kept like the rest of what
 * goes to OpenAI: only under an Accept that names it. SmartCare Living's
 * opprefForLead keeps the same rule.
 */
export function chatGptAdOf(
  browser: Pick<BrowserContext, "oppref" | "obref">,
  openAiOk: boolean,
): { oppref: string | null; obref: string | null } {
  if (openAiOk !== true) return { oppref: null, obref: null };
  return { oppref: browser.oppref || null, obref: browser.obref || null };
}

/**
 * Send a lead to SmartCRM. Always succeeds (errors are logged, not thrown).
 * Smart Space's brand is hard-coded here, every call from this site is
 * tagged smart-space. Resolves with what happened, for the runtime log.
 */
export async function sendToCrm(payload: CrmLeadPayload): Promise<{ ok: boolean; outcome: string }> {
  // .trim() because Vercel env-var pills hide trailing whitespace from
  // copy-paste. A trailing newline in CRM_INBOUND_URL would mangle the
  // fetch target; a trailing newline in CRM_HMAC_SECRET would silently
  // break the HMAC signature. See the GADS_CALL_LABEL post-mortem in
  // src/app/layout.tsx for the canonical case.
  const url = process.env.CRM_INBOUND_URL?.trim();
  const secret = process.env.CRM_HMAC_SECRET?.trim();
  if (!url || !secret) {
    // Not configured, totally fine, just skip.
    return { ok: true, outcome: "skipped, CRM_INBOUND_URL or CRM_HMAC_SECRET is not set" };
  }

  try {
    const body = JSON.stringify({ brand: "smart-space", ...payload });
    const signature = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CRM-Signature": signature,
      },
      body,
      // 5s upper bound, don't block the user response on a slow CRM.
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[crm] non-2xx response (${res.status}):`, text.slice(0, 200));
      return { ok: false, outcome: `CRM answered HTTP ${res.status}` };
    }
    return { ok: true, outcome: "mirrored to the CRM" };
  } catch (err) {
    // Never throw, Nigel still got the email + the row hit the sheet.
    console.warn("[crm] send failed (non-fatal):", err instanceof Error ? err.message : err);
    return { ok: false, outcome: `CRM send failed: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}` };
  }
}
