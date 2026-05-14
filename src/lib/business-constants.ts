/**
 * Single source of truth for business-level constants that previously
 * existed in multiple files (drift risk). If any of these change, change
 * them HERE and only here — every consumer reads from this module.
 *
 * The constants that landed here did so because a grep found them
 * duplicated across 2+ files with no shared origin:
 *
 *   - BUSINESS_PHONE_E164 + BUSINESS_PHONE_DISPLAY:  6 places used "+35315130424"
 *                                                    and "01 513 0424" as raw
 *                                                    string literals.
 *   - BUSINESS_EMAIL:                                duplicated in 4+ files.
 *   - AGGREGATE_RATING + AGGREGATE_REVIEW_COUNT:     hardcoded "5" / "100"
 *                                                    in layout.tsx schema AND
 *                                                    reviews/page.tsx schema.
 *                                                    If the real GBP count
 *                                                    drifts from the hardcoded
 *                                                    value, Google's review-
 *                                                    snippet policy is violated.
 *   - ALERT_TO_EMAIL_FALLBACK:                       8 files duplicated the
 *                                                    `CONTACT_TO_EMAIL ?? "nigel@..."`
 *                                                    fallback. If Nigel's
 *                                                    address ever changes,
 *                                                    that's 8 string edits.
 */

export const BUSINESS_NAME = "Smart Space";
export const BUSINESS_DOMAIN = "smart-space.ie";
export const BUSINESS_SITE = `https://${BUSINESS_DOMAIN}`;

export const BUSINESS_PHONE_E164 = "+35315130424";
export const BUSINESS_PHONE_DISPLAY = "01 513 0424";

export const BUSINESS_EMAIL = "info@smart-space.ie";

/**
 * AggregateRating values rendered in JSON-LD. Update both numbers in one
 * place when the real Google Business Profile rating/count drifts more
 * than a few points from the on-site schema. Stale values violate Google's
 * structured-data review-snippet policy if they materially overstate.
 */
export const AGGREGATE_RATING = "5";
export const AGGREGATE_REVIEW_COUNT = "100";

/**
 * Where alert / notification emails go when the CONTACT_TO_EMAIL env var
 * isn't set. Centralising this means there's exactly ONE string to update
 * if Nigel's address ever changes. Callers should use:
 *
 *   const to = alertTo();
 *
 * rather than `process.env.CONTACT_TO_EMAIL ?? "nigel@smart-space.ie"`.
 */
const ALERT_TO_EMAIL_FALLBACK = "nigel@smart-space.ie";

/** Returns the configured CONTACT_TO_EMAIL or the hard-coded fallback. */
export function alertTo(): string {
  return process.env.CONTACT_TO_EMAIL?.trim() || ALERT_TO_EMAIL_FALLBACK;
}
