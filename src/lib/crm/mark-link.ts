/**
 * Marking an enquiry from the email it arrived in.
 *
 * In the 45 days to 15 October 2026 the CRM took 38 enquiries and Nigel marked
 * none of them green, amber or red, and moved 3 off "New". The marking lived
 * at the bottom of each customer's page, behind the CRM's sign-in, and he
 * reads enquiries in his inbox. So the email that tells him about an enquiry
 * now carries the three choices, and each opens a page at /crm/mark/<token> that
 * needs no sign-in, with his choice already picked and one Save.
 *
 * The token names one enquiry and nothing else. It is the site, a random
 * reference the sending form also stores on the lead (custom.mark_ref), and an
 * HMAC of the two under CRM_HMAC_SECRET, the secret both websites already sign
 * their CRM posts with. The HMAC input is prefixed "mark:" so a signature made
 * here can never be replayed as an inbound post, or the other way round.
 *
 * The link itself writes nothing. Mail scanners open every link in a message
 * before a person does, and a link that marked the lead on open would have
 * marked every lead green by the time Nigel read it. Opening shows the page;
 * only pressing Save writes.
 *
 * SmartCare Living builds the same token in api/_lib/mark-link.js. The test
 * vector in scripts/check-mark-link.mjs is checked in both repositories, so
 * the two cannot drift apart without one of their builds failing.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Site } from "./db";
import type { LeadLight } from "./labels";

const CODE: Record<Site, string> = { "smart-space": "ss", smartcareliving: "scl" };
const SITE_OF: Record<string, Site> = { ss: "smart-space", scl: "smartcareliving" };

/** A new reference for one enquiry: 16 URL-safe characters. */
export const newMarkRef = () => randomBytes(12).toString("base64url");

const secretOf = (secret?: string) => (secret ?? process.env.CRM_HMAC_SECRET ?? "").trim();

function signature(site: Site, ref: string, secret: string) {
  return createHmac("sha256", secret).update(`mark:${site}:${ref}`).digest("base64url").slice(0, 22);
}

/** The token for one enquiry, or null when there is no secret to sign it with. */
export function markToken(site: Site, ref: string, secret?: string): string | null {
  const s = secretOf(secret);
  if (!s || !/^[A-Za-z0-9_-]{8,64}$/.test(ref)) return null;
  return `${CODE[site]}.${ref}.${signature(site, ref, s)}`;
}

/** The site and reference a token names, or null for anything not signed by us. */
export function readMarkToken(token: string, secret?: string): { site: Site; ref: string } | null {
  const s = secretOf(secret);
  const m = /^(ss|scl)\.([A-Za-z0-9_-]{8,64})\.([A-Za-z0-9_-]{22})$/.exec(token ?? "");
  if (!s || !m) return null;
  const site = SITE_OF[m[1]];
  const want = Buffer.from(signature(site, m[2], s));
  const got = Buffer.from(m[3]);
  return want.length === got.length && timingSafeEqual(want, got) ? { site, ref: m[2] } : null;
}

/**
 * Where the CRM is served from. Both websites already know it, because it is
 * where they post their enquiries (CRM_INBOUND_URL), so no second setting has
 * to be kept in step with the first.
 */
export function crmOrigin(): string {
  const inbound = process.env.CRM_INBOUND_URL?.trim();
  try {
    if (inbound) return new URL(inbound).origin;
  } catch { /* fall through */ }
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.smart-space.ie").replace(/\/+$/, "");
}

export function markUrl(site: Site, ref: string, light?: LeadLight): string | null {
  const token = markToken(site, ref);
  if (!token) return null;
  return `${crmOrigin()}/crm/mark/${token}${light ? `?mark=${light}` : ""}`;
}

const BUTTONS: { light: LeadLight; label: string; bg: string }[] = [
  { light: "green", label: "Good lead", bg: "#15803d" },
  { light: "amber", label: "Maybe", bg: "#b45309" },
  { light: "red", label: "Not a lead", bg: "#b91c1c" },
];

/**
 * The three buttons for the email, as table HTML that survives Outlook and
 * Gmail, or "" when the link cannot be signed (the email then goes as before).
 */
export function markButtonsHtml(site: Site, ref: string): string {
  if (!markToken(site, ref)) return "";
  const cells = BUTTONS.map((b) =>
    `<td style="padding:0 8px 8px 0;"><a href="${markUrl(site, ref, b.light)}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:${b.bg};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;text-decoration:none;">${b.label}</a></td>`,
  ).join("");
  return `<div style="margin:20px 0 4px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">
  <p style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;color:#0f172a;"><strong>After you've spoken to them, how good is this enquiry?</strong></p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
  <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#64748b;">Opens a page with your choice picked. Nothing is saved until you press Save there.</p>
</div>`;
}

/** The same choices for the plain-text part of the email. */
export function markButtonsText(site: Site, ref: string): string {
  if (!markToken(site, ref)) return "";
  return [
    "",
    "After you've spoken to them, how good is this enquiry?",
    ...BUTTONS.map((b) => `  ${b.label}: ${markUrl(site, ref, b.light)}`),
  ].join("\n");
}
