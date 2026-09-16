/**
 * What things are called on screen.
 *
 * The database stores "contact_form", "lead_created" and "stripe" because they
 * are keys. Nigel was reading those keys. Anything a person sees gets a name a
 * person would use, and anything without a mapping falls back to a tidied
 * version of the key rather than to nothing, so a new source never renders as
 * an empty cell.
 */

const tidy = (key: string) =>
  key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const SOURCES: Record<string, string> = {
  stripe: "Paid online",
  contact_form: "Contact form",
  quiz: "Quiz",
  booking: "Booking",
  "urgent-callback": "Urgent callback",
  urgent_callback: "Urgent callback",
  checkout_free: "Free consultation",
  website: "Website",
  unknown: "Enquiry",
};

export const sourceLabel = (key: string | null | undefined) =>
  key ? SOURCES[key] ?? tidy(key) : "Enquiry";

const KINDS: Record<string, string> = {
  lead_created: "Enquiry received",
  status: "Status changed",
  note: "Note",
  task: "Next step",
};

export const kindLabel = (key: string) => KINDS[key] ?? tidy(key);

/**
 * Statuses read as a pipeline, so they are coloured as one: grey while nothing
 * has happened, amber while it is in Nigel's hands, green when it is money, red
 * when it is gone. Six separate hues, which is what this had, made teal and
 * green indistinguishable at pill size and gave "quoted" the same visual weight
 * as "won".
 */
export const STATUS_PILL: Record<string, string> = {
  new: "bg-sky-50 text-sky-800 ring-sky-600/20",
  contacted: "bg-slate-100 text-slate-700 ring-slate-500/20",
  quoted: "bg-amber-50 text-amber-800 ring-amber-600/20",
  booked: "bg-amber-50 text-amber-800 ring-amber-600/20",
  installed: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  lost: "bg-rose-50 text-rose-800 ring-rose-600/20",
  spam: "bg-slate-100 text-slate-500 ring-slate-400/20",
};

export const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  booked: "Booked",
  installed: "Installed",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

/** A phone number a CRM can dial. Irish mobiles arrive as 087..., not +353. */
export const telHref = (phone: string | null | undefined) => {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  return `tel:${digits.startsWith("+") ? digits : digits.replace(/^0/, "+353")}`;
};
