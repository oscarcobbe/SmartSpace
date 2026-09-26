/**
 * Feed text, made fit to put in front of a person.
 *
 * The feeds write the same things several ways: a slot is "10:00 - 12:00" from
 * one source and "12:30\u201314:30" from another, and a date arrives as
 * "23/09/2026, 11:21". The house rule is no en or em dashes on screen, and a
 * diary that writes one slot two ways reads as two kinds of thing.
 */

import type { Lead } from "./leads";

const EN = "\u2013";
const EM = "\u2014";

/** Any dash between two times becomes " to ": "10:00 to 12:00". */
export function slotText(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "-" || s === EN || s === EM) return "";
  return s
    .replace(/(\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2})/g, "$1 to $2")
    .replace(/[\u2013\u2014]/g, "-");
}

/** Free text from a feed with its en and em dashes turned into plain hyphens. */
export function plainText(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "-" || s === EN || s === EM) return "";
  return s.replace(/\s*[\u2013\u2014]\s*/g, " - ");
}

/** "23/09/2026, 11:21" or "2026-09-23 11:21" as "23 Sept". Falls back to the input. */
export function shortDay(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "-") return "";
  let y: number, m: number, d: number;
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (dmy) { d = +dmy[1]; m = +dmy[2]; y = +dmy[3]; }
  else if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else return s.split(",")[0] ?? s;
  return new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", day: "numeric", month: "short" })
    .format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/**
 * Something to call a customer who arrived without a name.
 *
 * Five paid orders carry `name: "-"`, because Stripe does not require one and
 * nothing downstream insisted. The panel rendered every one of them as
 * "Unnamed", which is the least useful of the several things we do know: one of
 * them is a 479 euro doorbell going to a named street in Carpenterstown on
 * 5 October, with an email address and a mobile number attached.
 *
 * So fall through what we have rather than giving up at the first empty field.
 * The email local part is put in front of the address because it is usually
 * the person's actual name.
 */
export function displayName(l: Pick<Lead, "name" | "email" | "address" | "phone">): string {
  const name = plainText(l.name);
  if (name) return name;

  const email = plainText(l.email);
  if (email) {
    const local = email.split("@")[0] ?? "";
    /* Only when it reads like a name. "stackthedrummer" is better than an
       address; "info" or "sales1" is not better than anything. */
    if (local.length > 2 && !/^(info|sales|admin|contact|hello|enquiries|office)\d*$/i.test(local)) {
      return local.replace(/[._]+/g, " ");
    }
  }

  const address = plainText(l.address);
  if (address) return address.split(",")[0]!.trim();

  const phone = plainText(l.phone);
  if (phone) return phone;

  return "No name on the order";
}

