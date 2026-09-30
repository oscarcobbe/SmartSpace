/**
 * SmartCare Living's customer emails, for the email studio.
 *
 * Smart Space's messages are rendered from this repo (catalogue.ts).
 * SmartCare Living's are sent from its own site, so they are fetched from it:
 * smartcareliving.ie/api/email-catalogue renders each one from the same
 * function that sends it, with an invented customer. The request is signed
 * with CRM_HMAC_SECRET, the secret the two sites already share for leads
 * (sha256 HMAC of "email-catalogue:" plus today's UTC date).
 */
import { createHmac } from "crypto";
import type { Email } from "./customer";
import type { Entry, Stage } from "./catalogue";

const URL_DEFAULT = "https://www.smartcareliving.ie/api/email-catalogue";

type Fetched = Omit<Entry, "render"> & { email: Email };

export async function sclCatalogue(): Promise<{ stages: Stage[]; entries: Entry[]; problem?: string }> {
  const secret = process.env.CRM_HMAC_SECRET?.trim();
  if (!secret) {
    return { stages: [], entries: [], problem: "CRM_HMAC_SECRET is not set here, so SmartCare Living's emails cannot be fetched." };
  }
  const signature = createHmac("sha256", secret)
    .update(`email-catalogue:${new Date().toISOString().slice(0, 10)}`)
    .digest("hex");
  try {
    const res = await fetch(process.env.SCL_EMAIL_CATALOGUE_URL || URL_DEFAULT, {
      headers: { "x-crm-signature": signature },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { stages: [], entries: [], problem: `SmartCare Living's site answered ${res.status} when asked for its emails.` };
    }
    const body = (await res.json()) as { stages: Stage[]; entries: Fetched[] };
    const entries: Entry[] = body.entries.map(({ email, ...rest }) => ({ ...rest, render: () => email }));
    return { stages: body.stages, entries };
  } catch (err) {
    return { stages: [], entries: [], problem: `Could not reach SmartCare Living's site for its emails (${String(err).slice(0, 120)}).` };
  }
}

/**
 * One quiz email for one real person, rendered by smartcareliving.ie from the
 * same function the catalogue shows. POST, body signed (lib/crm/scl-link).
 */
export async function sclRender(step: string, ctx: Record<string, unknown>): Promise<Email> {
  const body = JSON.stringify({ render: step, ctx });
  const signature = createHmac("sha256", process.env.CRM_HMAC_SECRET?.trim() || "").update(body).digest("hex");
  const res = await fetch(process.env.SCL_EMAIL_CATALOGUE_URL || URL_DEFAULT, {
    method: "POST",
    headers: { "content-type": "application/json", "x-crm-signature": signature },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`smartcareliving.ie answered ${res.status} to the render`);
  const mail = (await res.json()) as Email;
  if (!mail?.subject || !mail?.html) throw new Error("smartcareliving.ie sent back an empty email");
  return mail;
}
