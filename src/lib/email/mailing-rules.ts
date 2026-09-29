/**
 * Who a mailing to past customers may go to, and from where.
 *
 * Irish rules (S.I. 336 of 2011, regulation 13(11), as summarised by the Data
 * Protection Commission's guidance): a marketing email may go to an existing
 * customer without their consent only for similar products or services of the
 * same business, within 12 months of the sale, where the customer was given a
 * way to say no to marketing when their details were taken, and with a way to
 * object in every message. Anyone else needs to have said yes. So each
 * recipient records the basis they are emailed on, and a customer basis
 * carries the date of the last purchase so the 12 months can be measured on
 * the day of sending.
 *
 * The code can measure the 12 months; it cannot know whether the chance to
 * say no was given. That is declared by whoever adds the person, which is why
 * the label below says it in full. Checked 28 September 2026: the website's
 * booking forms and its Stripe checkout offer no marketing opt-out, so an
 * online buyer does not qualify on this basis by buying alone.
 *
 * SmartGuardian is SmartCare Living's product, not Smart Space's, so its
 * announcement accepts consent only until someone decides otherwise with
 * advice; the network emails are Smart Space's own service and accept either.
 *
 * Pure, bar Node's crypto for the unsubscribe links, so the build check runs
 * exactly this.
 */
import { createHmac, timingSafeEqual } from "crypto";

export type Basis = "customer" | "consent";

export interface MailingTemplate {
  /** The email studio entry, and the template's name in the database. */
  id: "smartguardian-announce" | "network-diagnosis-a" | "network-diagnosis-b";
  itemId: string;
  title: string;
  bases: Basis[];
}

export const MAILING_TEMPLATES: MailingTemplate[] = [
  { id: "network-diagnosis-a", itemId: "mailing:network-diagnosis-a", title: "The network service, problem-led version", bases: ["customer", "consent"] },
  { id: "network-diagnosis-b", itemId: "mailing:network-diagnosis-b", title: "The network service, for security customers", bases: ["customer", "consent"] },
  { id: "smartguardian-announce", itemId: "mailing:smartguardian-announce", title: "Meet SmartCare Living and SmartGuardian", bases: ["consent"] },
];

export const templateById = (id: string) => MAILING_TEMPLATES.find((t) => t.id === id) ?? null;

/** Written to follow "people who", "they", or "Can go to people who". */
export const BASIS_LABEL: Record<Basis, string> = {
  customer: "bought from Smart Space in the last 12 months and were given a way to say no to marketing when they bought",
  consent: "said yes to marketing emails",
};

const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/i;

/** The last day a sale on `purchased` (YYYY-MM-DD) still covers, 12 months on. */
export function customerWindowEnds(purchased: string): string {
  const [y, m, d] = purchased.split("-").map(Number);
  const end = new Date(Date.UTC(y + 1, m - 1, d));
  /* 29 February plus a year is 1 March; step back so the window never grows. */
  if (end.getUTCMonth() !== m - 1) end.setUTCDate(0);
  return end.toISOString().slice(0, 10);
}

export type Verdict = { send: true } | { send: false; reason: string };

export function recipientVerdict(
  r: { email: string; basis: Basis; last_purchase_on: string | null },
  template: MailingTemplate,
  today: string,
  unsubscribed: boolean,
): Verdict {
  if (!EMAIL.test(r.email.trim())) return { send: false, reason: "Not a valid email address." };
  if (unsubscribed) return { send: false, reason: "Unsubscribed." };
  if (!template.bases.includes(r.basis)) {
    return { send: false, reason: "This email needs their consent. A purchase alone does not cover it." };
  }
  if (r.basis === "customer") {
    if (!r.last_purchase_on || !/^\d{4}-\d{2}-\d{2}$/.test(r.last_purchase_on)) {
      return { send: false, reason: "No purchase date, so the 12 months cannot be measured." };
    }
    if (customerWindowEnds(r.last_purchase_on) < today) {
      return { send: false, reason: "Bought more than 12 months ago." };
    }
  }
  return { send: true };
}

const domainOf = (from: string | undefined) => {
  const m = /@([^>\s]+)>?\s*$/.exec(from ?? "");
  return m ? m[1].toLowerCase() : null;
};

/**
 * Mailings go out from their own address, on a domain the order receipts do
 * not use: a complaint about a bulk email counts against the domain that sent
 * it, and receipts cannot be allowed to share that fate.
 */
export function marketingSenderProblem(marketingFrom: string | undefined, transactionalFrom: string | undefined): string | null {
  const m = domainOf(marketingFrom);
  if (!m) return "No sending address for mailings is set yet (MARKETING_FROM_EMAIL).";
  const t = domainOf(transactionalFrom);
  if (t && m === t) {
    return `The mailings address is on ${m}, the same domain the order receipts go out on. It needs a separate one, for example news.smart-space.ie.`;
  }
  return null;
}

/* Unsubscribe links carry the address and a signature, so a link cannot be
   edited into somebody else's opt-out. */
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");

export function unsubscribeToken(email: string, secret: string): string {
  const e = email.trim().toLowerCase();
  const sig = createHmac("sha256", secret).update(e).digest("base64url").slice(0, 24);
  return `${b64(e)}.${sig}`;
}

export function readUnsubscribeToken(token: string, secret: string): string | null {
  const [e64, sig] = token.split(".");
  if (!e64 || !sig) return null;
  let email: string;
  try {
    email = Buffer.from(e64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!EMAIL.test(email)) return null;
  const expected = createHmac("sha256", secret).update(email).digest("base64url").slice(0, 24);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? email : null;
}

/** One line of an import: "email, first name, last purchase date". */
export function parseRecipientLine(line: string): { email: string; firstName: string | null; purchased: string | null } | { error: string } {
  const parts = line.split(/[,;\t]/).map((p) => p.trim());
  const email = (parts[0] ?? "").toLowerCase();
  if (!EMAIL.test(email)) return { error: `"${line.slice(0, 60)}" does not start with an email address.` };
  const firstName = parts[1] ? parts[1].slice(0, 60) : null;
  let purchased: string | null = null;
  const raw = parts[2] ?? "";
  if (raw) {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    const irish = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    if (iso) purchased = raw;
    else if (irish) purchased = `${irish[3]}-${irish[2].padStart(2, "0")}-${irish[1].padStart(2, "0")}`;
    else return { error: `"${raw}" is not a date. Use 2026-03-14 or 14/03/2026.` };
  }
  return { email, firstName, purchased };
}
