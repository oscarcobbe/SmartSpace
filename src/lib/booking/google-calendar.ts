/**
 * Nigel's Google Calendar, read and written directly. This replaced Calendly
 * as the booking backend in October 2026.
 *
 * Access is a Google service account with domain-wide delegation in the
 * smart-space.ie Workspace: it acts as BOOKING_CALENDAR_OWNER, so every event
 * it writes is Nigel's own, exactly as Calendly's were. No Google library: the
 * token is a signed JWT swapped at oauth2.googleapis.com, and the calendar is
 * plain REST.
 *
 * Env:
 *   GOOGLE_BOOKING_SA_KEY    the service account's JSON key, base64-encoded
 *   BOOKING_CALENDAR_OWNER   the Workspace user whose calendar holds bookings
 *   BOOKING_BUSY_CALENDARS   calendars whose events block a slot, comma
 *                            separated (default "primary", the owner's own)
 */
import { createSign } from "crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
].join(" ");
const API = "https://www.googleapis.com/calendar/v3";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

function readKey(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_BOOKING_SA_KEY;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const key = JSON.parse(text) as ServiceAccountKey;
    return key.client_email && key.private_key ? key : null;
  } catch {
    return null;
  }
}

export function calendarOwner(): string | null {
  return process.env.BOOKING_CALENDAR_OWNER?.trim() || null;
}

export function googleCalendarConfigured(): boolean {
  return !!readKey() && !!calendarOwner();
}

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

// One token per warm instance, refreshed a minute before Google's hour runs out.
let cached: { token: string; owner: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  const key = readKey();
  const owner = calendarOwner();
  if (!key || !owner) throw new Error("Google Calendar is not configured (GOOGLE_BOOKING_SA_KEY, BOOKING_CALENDAR_OWNER)");
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.owner === owner && cached.exp - 60 > now) return cached.token;

  const tokenUri = key.token_uri || "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: key.client_email, sub: owner, scope: SCOPES, aud: tokenUri, iat: now, exp: now + 3600 }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) {
    // unauthorized_client here means the Workspace admin has not yet allowed
    // this service account's client ID, or not for both scopes.
    throw new Error(`Google token ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, owner, exp: now + (data.expires_in || 3600) };
  return data.access_token;
}

/** A Google Calendar API error that keeps the status, so callers can tell a 409 from a 500. */
export class CalendarError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, path: string, opts: { body?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
    signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
  });
  if (!res.ok) {
    throw new CalendarError(res.status, `Google Calendar ${method} ${path.split("?")[0]} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export interface CalendarEvent {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  etag?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  created?: string;
  updated?: string;
  extendedProperties?: { private?: Record<string, string> };
}

export function busyCalendars(): string[] {
  const list = (process.env.BOOKING_BUSY_CALENDARS || "primary").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : ["primary"];
}

/** Busy intervals across the blocking calendars, as epoch milliseconds. */
export async function busyBetween(timeMin: string, timeMax: string): Promise<{ start: number; end: number }[]> {
  const ids = busyCalendars();
  const data = await call<{ calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }> }>(
    "POST",
    "/freeBusy",
    { body: { timeMin, timeMax, timeZone: "Europe/Dublin", items: ids.map((id) => ({ id })) }, timeoutMs: 6000 },
  );
  const out: { start: number; end: number }[] = [];
  for (const id of ids) {
    const cal = data.calendars?.[id];
    // A calendar we cannot read must not quietly count as free.
    if (!cal || cal.errors?.length) throw new CalendarError(502, `freeBusy could not read calendar ${id}: ${cal?.errors?.map((e) => e.reason).join(", ") || "missing"}`);
    for (const b of cal.busy || []) out.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
  }
  return out;
}

const enc = encodeURIComponent;

export function insertEvent(event: Omit<CalendarEvent, "etag">): Promise<CalendarEvent> {
  return call<CalendarEvent>("POST", `/calendars/primary/events?sendUpdates=none`, { body: event });
}

/** Returns null for an id that has never existed. A deleted event comes back with status "cancelled". */
export async function getEvent(id: string): Promise<CalendarEvent | null> {
  try {
    return await call<CalendarEvent>("GET", `/calendars/primary/events/${enc(id)}`);
  } catch (e) {
    if (e instanceof CalendarError && (e.status === 404 || e.status === 410)) return null;
    throw e;
  }
}

/** Replaces the event, only if nobody has changed it since `etag` was read (412 otherwise). */
export function replaceEvent(event: CalendarEvent, etag: string): Promise<CalendarEvent> {
  return call<CalendarEvent>("PUT", `/calendars/primary/events/${enc(event.id)}?sendUpdates=none`, {
    body: event,
    headers: { "If-Match": etag },
  });
}

export function patchEvent(id: string, patch: Partial<CalendarEvent>, etag?: string): Promise<CalendarEvent> {
  return call<CalendarEvent>("PATCH", `/calendars/primary/events/${enc(id)}?sendUpdates=none`, {
    body: patch,
    headers: etag ? { "If-Match": etag } : undefined,
  });
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    await call<void>("DELETE", `/calendars/primary/events/${enc(id)}?sendUpdates=none`);
  } catch (e) {
    if (e instanceof CalendarError && e.status === 410) return; // already gone
    throw e;
  }
}

/** Events on the owner's calendar between two instants, optionally only those carrying a private property. */
export async function listEvents(opts: { timeMin: string; timeMax: string; privateProperty?: string; showDeleted?: boolean }): Promise<CalendarEvent[]> {
  const out: CalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({ timeMin: opts.timeMin, timeMax: opts.timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250" });
    if (opts.privateProperty) q.set("privateExtendedProperty", opts.privateProperty);
    if (opts.showDeleted) q.set("showDeleted", "true");
    if (pageToken) q.set("pageToken", pageToken);
    const page = await call<{ items?: CalendarEvent[]; nextPageToken?: string }>("GET", `/calendars/primary/events?${q}`);
    out.push(...(page.items || []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

/** Events carrying a private property, wherever they are in time (for looking a booking up by its reference). */
export async function findByProperty(privateProperty: string, showDeleted = false): Promise<CalendarEvent[]> {
  const q = new URLSearchParams({ privateExtendedProperty: privateProperty, singleEvents: "true", maxResults: "50" });
  if (showDeleted) q.set("showDeleted", "true");
  const page = await call<{ items?: CalendarEvent[] }>("GET", `/calendars/primary/events?${q}`);
  return page.items || [];
}
