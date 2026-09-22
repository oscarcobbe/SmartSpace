/**
 * The visitor's cookie answer, carried from the browser to where Google needs it.
 *
 * Google will not count a conversion from a customer in the EEA without an
 * affirmative consent signal, and until 22 September nothing on this site
 * recorded the answer anywhere a server could read it. The offline upload
 * then either claimed consent it could not prove or sent none, and Google
 * discarded every sale.
 *
 * Two places now record it. A website checkout writes it on the Stripe
 * session (api/checkout). An enquiry writes it here, because most jobs are
 * paid later by payment link or invoice, which has no browser behind it: the
 * enquiry is the only moment that customer's answer exists.
 */
import { createHash } from "node:crypto";
import { crm } from "./crm/db";

export interface ConsentInput { decision?: unknown; decidedAt?: unknown }
export interface Consent { decision: "granted" | "denied"; at: string }

/**
 * The banner answer, or nothing. Anything that is not exactly one of the two
 * answers the banner can store, with a plausible time, is dropped rather than
 * kept: this value is later sent to Google as a consent signal, so a malformed
 * one must become "unspecified", never "granted".
 */
export function consentFrom(raw: ConsentInput | null | undefined): Consent | null {
  if (!raw || (raw.decision !== "granted" && raw.decision !== "denied")) return null;
  const t = Number(raw.decidedAt);
  if (!Number.isFinite(t) || t < Date.UTC(2026, 0, 1) || t > Date.now() + 5 * 60_000) return null;
  return { decision: raw.decision, at: new Date(t).toISOString() };
}

/* The same hashing the offline upload applies to a payer's email, so the two
   join without this table holding an address. */
export const emailHash = (email: string | null | undefined): string | null => {
  const e = (email ?? "").trim().toLowerCase();
  return e ? createHash("sha256").update(e).digest("hex") : null;
};
export const phoneHash = (phone: string | null | undefined): string | null => {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 9 ? createHash("sha256").update(d.slice(-9)).digest("hex") : null;
};

/**
 * Keep an enquirer's answer. Never throws and never delays the enquiry by
 * more than a few seconds: losing this row costs one sale's attribution,
 * while failing the form would cost the customer.
 */
export async function recordEnquiryConsent(input: {
  email?: string | null; phone?: string | null; consent: ConsentInput | null | undefined; source: string;
}): Promise<void> {
  const consent = consentFrom(input.consent);
  const e = emailHash(input.email);
  const p = phoneHash(input.phone);
  if (!consent || (!e && !p)) return;
  try {
    await crm("crm_ad_consent", {
      method: "POST",
      body: JSON.stringify([{
        site: "smart-space", email_hash: e, phone_hash: p,
        decision: consent.decision, decided_at: consent.at, source: input.source,
      }]),
      prefer: "return=minimal",
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error("[ad-consent] could not record:", err instanceof Error ? err.message : err);
  }
}
