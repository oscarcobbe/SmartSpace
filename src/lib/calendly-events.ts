/**
 * Reading booked events back out of Calendly, for the jobs that message
 * customers about their bookings: the day-before reminders and the review
 * request the morning after an installation.
 *
 * Moved out of the reminders route so both jobs read Calendly the same way.
 * Each function throws with a sentence on failure; the callers decide whether
 * that is an alert.
 */

export interface CalendlyEvent {
  uri: string;
  name?: string;
  start_time: string;
  end_time: string;
}

export interface CalendlyInvitee {
  name?: string;
  email?: string;
  text_reminder_number?: string;
  questions_and_answers?: { question: string; answer: string }[];
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function calendlyUserUri(token: string): Promise<string> {
  const res = await fetch("https://api.calendly.com/users/me", { headers: auth(token), cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Calendly /users/me ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return (await res.json()).resource.uri as string;
}

export async function activeEventsBetween(token: string, userUri: string, startIso: string, endIso: string): Promise<CalendlyEvent[]> {
  const res = await fetch(
    `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&min_start_time=${startIso}&max_start_time=${endIso}&status=active&sort=start_time:asc&count=100`,
    { headers: auth(token), cache: "no-store", signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok) throw new Error(`Calendly scheduled_events ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return ((await res.json()).collection || []) as CalendlyEvent[];
}

export async function firstInvitee(token: string, eventUri: string): Promise<CalendlyInvitee | undefined> {
  const res = await fetch(`${eventUri}/invitees`, { headers: auth(token), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()).collection || [])[0];
}

/** Offset in minutes between Dublin and UTC on a YYYY-MM-DD, read at noon to stay clear of the change. */
function dublinOffsetMinutes(dateStr: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hour12: false })
    .formatToParts(new Date(`${dateStr}T12:00:00Z`));
  const h = parseInt(parts.find((p) => p.type === "hour")?.value || "12", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return (h - 12) * 60 + m;
}

/** A Dublin calendar day `offset` days from today, as a date and its UTC bounds. */
export function dublinDay(offset: number): { dateStr: string; startIso: string; endIso: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const y = parseInt(parts.find((p) => p.type === "year")?.value || "0", 10);
  const mo = parseInt(parts.find((p) => p.type === "month")?.value || "0", 10);
  const d = parseInt(parts.find((p) => p.type === "day")?.value || "0", 10);
  const day = new Date(Date.UTC(y, mo - 1, d + offset));
  const dateStr = day.toISOString().slice(0, 10);
  const startMs = day.getTime() - dublinOffsetMinutes(dateStr) * 60_000;
  return { dateStr, startIso: new Date(startMs).toISOString(), endIso: new Date(startMs + 86_400_000 - 1000).toISOString() };
}

/** "10:00 – 12:00" in Dublin time. The en dash reads well in email; texts replace it. */
export function formatSlot(startIso: string, endIso: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Dublin", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fmt.format(new Date(startIso))} – ${fmt.format(new Date(endIso))}`;
}

const answers = (qas: CalendlyInvitee["questions_and_answers"]) => (qas ?? []).map((q) => q.answer).join(" | ");

export const phoneFrom = (qas: CalendlyInvitee["questions_and_answers"]) => /Phone:\s*([^|]+)/i.exec(answers(qas))?.[1]?.trim() || undefined;
export const productFrom = (qas: CalendlyInvitee["questions_and_answers"]) => /Product:\s*([^|]+)/i.exec(answers(qas))?.[1]?.trim() || undefined;
export function addressFrom(qas: CalendlyInvitee["questions_and_answers"]): string | undefined {
  for (const qa of qas ?? []) {
    if (/address|eircode|location/i.test(qa.question) && qa.answer) return qa.answer.replace(/^Address:\s*/i, "").trim();
    const m = qa.answer?.match(/Address:\s*([^|]+)/i);
    if (m) return m[1].trim();
  }
  return undefined;
}

export const isConsultation = (e: CalendlyEvent) => /consultation/i.test(e.name || "");
