/**
 * A phone number as Google and OpenAI match it: E.164, +353 for Ireland.
 *
 * Enhanced Conversions hashes the phone before it leaves, and a hash matches
 * only the exact string Google hashed on its side, which is E.164. This site
 * sent the number as typed ("087 123 4567", "0871234567", "+353 87...") from
 * the browser, the server and the success page, so one customer could arrive
 * as several different hashes, and only one written exactly as +353871234567
 * could match.
 * SmartCare Living has normalised since it launched (normalisePhone in its
 * js/tracking.js and lib/server-conversions.js); this is the same rule.
 *
 *   087 123 4567       -> +353871234567
 *   00353 87 123 4567  -> +353871234567
 *   353871234567       -> +353871234567
 *   +353 (0)87 1234567 -> +353871234567
 *   0044 7700 900123   -> +447700900123
 *
 * Kept free of imports: the browser, the server and the build checks all load
 * it.
 */
export function normalisePhone(value: string | null | undefined): string {
  let p = String(value ?? "").replace(/[^\d+]/g, "");
  if (!p.replace(/\+/g, "")) return "";
  if (p.startsWith("00")) p = `+${p.slice(2)}`;
  else if (p.startsWith("353")) p = `+${p}`;
  else if (p.startsWith("0")) p = `+353${p.slice(1)}`;
  else if (!p.startsWith("+")) p = `+353${p}`;
  /* "+353 (0)87..." is how many Irish numbers are written, and the 0 in
     brackets is not dialled. */
  if (p.startsWith("+3530")) p = `+353${p.slice(5)}`;
  return `+${p.slice(1).replace(/\+/g, "")}`;
}
