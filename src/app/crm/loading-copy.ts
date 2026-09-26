/**
 * What a loading page says once the wait has gone on, per business.
 *
 * Only the orders feed is ever slow enough to need explaining: Smart Space's
 * reconciles Stripe, Calendly and a sheet, and SmartCare Living's is a Google
 * Sheet whose script sleeps when idle and takes up to a minute to wake.
 */
import type { Site } from "@/lib/crm/db";
import { currentSession } from "@/lib/crm/session";

export type Wait = "orders" | "stripe" | "google" | "database";

export function slowNote(site: Site, wait: Wait): string {
  if (wait === "orders") {
    return site === "smartcareliving"
      ? "Reading SmartCare Living's enquiry sheet. The first read of the day wakes it up and can take up to a minute; after that it is quick."
      : "Reading Stripe, Calendly and the enquiry sheet. This usually takes a few seconds.";
  }
  if (wait === "stripe") return "Reading twelve months of payments from Stripe. This usually takes a few seconds.";
  if (wait === "google") return "Asking Google for the figures. This usually takes a few seconds.";
  return "Reading the database.";
}

/** For loading.tsx files, which render before the page and know only the cookie. */
export function sessionSite(): Site {
  return currentSession()?.site ?? "smart-space";
}

/** "Good morning" at nine, not at nine at night. Dublin, because the machine
 *  this renders on is not in Ireland and has said so before. */
export function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "Smart Space, Saturday 26 September." */
export function todayLine(business: string): string {
  const today = new Intl.DateTimeFormat("en-IE", {
    timeZone: "Europe/Dublin", weekday: "long", day: "numeric", month: "long",
  }).format(new Date());
  return `${business}, ${today}.`;
}
