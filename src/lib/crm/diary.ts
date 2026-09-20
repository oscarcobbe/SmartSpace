/**
 * The two questions the front page is actually being asked about the diary.
 *
 * "Where do I need to be next" and "who just booked" are different orderings of
 * the same rows, and the overview panel was answering neither. It filtered on
 * the `upcoming` flag and then rendered the rows in whatever order the feed
 * happened to return them, so 5 October sat above 23 September and the panel
 * could not be read as a plan for the week.
 */
import { bookingIso } from "./booking-date";
import { fetchLeads, type Lead } from "./leads";
import { fetchMarks, orderKey } from "./order-marks";
import type { Site } from "./db";

const clean = (v: string | undefined | null) => {
  const s = String(v ?? "").trim();
  return !s || s === "-" ? "" : s;
};

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
export function displayName(l: Lead): string {
  const name = clean(l.name);
  if (name) return name;

  const email = clean(l.email);
  if (email) {
    const local = email.split("@")[0] ?? "";
    /* Only when it reads like a name. "stackthedrummer" is better than an
       address; "info" or "sales1" is not better than anything. */
    if (local.length > 2 && !/^(info|sales|admin|contact|hello|enquiries|office)\d*$/i.test(local)) {
      return local.replace(/[._]+/g, " ");
    }
  }

  const address = clean(l.address);
  if (address) return address.split(",")[0]!.trim();

  const phone = clean(l.phone);
  if (phone) return phone;

  return "No name on the order";
}

/** True when we are showing a stand-in rather than a name somebody gave us. */
export const nameIsStandIn = (l: Lead) => clean(l.name) === "";

/**
 * When the booking was MADE, which is not when the job is.
 *
 * The feed writes this field two ways: "18/09/2026, 11:21" from Stripe and
 * "2026-09-14 15:23" from the enquiry table. Day-first is assumed for the
 * slashed form because the site is Irish, and the ISO form needs no help.
 */
export function bookedAtIso(raw: string | undefined | null): string | null {
  const s = clean(raw);
  if (!s) return null;

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4]}:${iso[5]}`;

  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/);
  if (dmy) {
    const [, d, m, y, hh = "00", mm = "00"] = dmy;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}T${hh.padStart(2, "0")}:${mm}`;
  }

  return null;
}

/** The start time inside "10:00-12:00" or "10:00 – 12:00", for ordering a day. */
const slotStart = (raw: string | undefined | null) => {
  const m = clean(raw).match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1]!.padStart(2, "0")}:${m[2]}` : "99:99";
};

/** Today in Dublin, never the server's timezone. */
const todayDublin = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

export interface DiaryRow {
  job: Lead;
  /** Job date, ISO, for upcoming. */
  on: string | null;
  /** When it was booked, ISO, for just-booked. */
  bookedAt: string | null;
  label: string;
  slot: string;
  name: string;
  standIn: boolean;
}

export interface Diary {
  upcoming: DiaryRow[];
  justBooked: DiaryRow[];
  problem: string | null;
}

const label = (on: string) =>
  new Intl.DateTimeFormat("en-IE", {
    timeZone: "Europe/Dublin", weekday: "short", day: "numeric", month: "short",
  }).format(new Date(`${on}T12:00:00Z`));

/**
 * One customer, one row.
 *
 * A booking reaches us twice, once as a Stripe payment and once as a Calendly
 * slot, so the same job appears under both. Keyed on who plus the day plus the
 * start time: the day matters, because keying on the slot alone merges the same
 * person's 10:00 job in June with their 10:00 job in October.
 */
function collapse(rows: DiaryRow[]): DiaryRow[] {
  const out: DiaryRow[] = [];
  const at = new Map<string, number>();
  for (const r of rows) {
    const who =
      clean(r.job.email).toLowerCase() ||
      clean(r.job.phone).replace(/\D/g, "").slice(-9) ||
      "";
    const key = who ? `${who}|${r.on ?? ""}|${r.slot}` : "";
    const i = key ? at.get(key) : undefined;
    if (!key || i === undefined) {
      if (key) at.set(key, out.length);
      out.push(r);
      continue;
    }
    /* Keep whichever row knows more. The paid one usually carries the address. */
    const paid = (x: DiaryRow) => clean(x.job.amount) !== "";
    const keep = paid(r) && !paid(out[i]!) ? r : out[i]!;
    const other = keep === r ? out[i]! : r;
    out[i] = {
      ...keep,
      name: keep.standIn && !other.standIn ? other.name : keep.name,
      standIn: keep.standIn && other.standIn,
      job: {
        ...keep.job,
        address: clean(keep.job.address) || other.job.address,
        details: [...(keep.job.details ?? []), ...(other.job.details ?? [])],
      },
    };
  }
  return out;
}

export async function fetchDiary(site: Site, limit = 6): Promise<Diary> {
  const [feed, marks] = await Promise.all([fetchLeads(site), fetchMarks(site)]);
  if (!feed.ok) return { upcoming: [], justBooked: [], problem: feed.reason };

  const today = todayDublin();

  const rows: DiaryRow[] = feed.data.leads
    /* A job cancelled by phone is still paid in Stripe and still holds its
       Calendly slot. It must not appear as somewhere to be. */
    .filter((l) => marks.get(orderKey(l))?.state !== "cancelled")
    .map((job) => {
      const on = bookingIso(job.bookingDate);
      return {
        job,
        on,
        bookedAt: bookedAtIso(job.date),
        label: on ? label(on) : "",
        slot: slotStart(job.bookingSlot),
        name: displayName(job),
        standIn: nameIsStandIn(job),
      };
    });

  const upcoming = collapse(rows.filter((r) => r.on !== null && r.on >= today))
    .sort((a, b) => a.on!.localeCompare(b.on!) || a.slot.localeCompare(b.slot))
    .slice(0, limit);

  /* Who booked most recently, whenever their job happens to be. Rows with no
     parseable booked-at date sort last rather than to the top, which is what
     an empty string would have done. */
  const justBooked = collapse(rows.filter((r) => r.on !== null))
    .sort((a, b) => (b.bookedAt ?? "").localeCompare(a.bookedAt ?? ""))
    .slice(0, limit);

  return { upcoming, justBooked, problem: null };
}
