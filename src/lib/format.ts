/**
 * Price formatting helpers, drop `.00` on whole-euro amounts but keep
 * cents when they're non-zero.
 *
 *   299    → "€299"
 *   299.50 → "€299.50"
 *   1299   → "€1,299"
 *
 * Uses Intl.NumberFormat for thousands separators and the locale-correct
 * currency symbol position (en-IE puts the € before the number).
 */

/**
 * Format a numeric euro amount.
 */
export function formatEuro(amount: number): string {
  if (!Number.isFinite(amount)) return "€0";
  const cents = Math.round(amount * 100);
  const isWhole = cents % 100 === 0;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(amount);
}

/**
 * Drop-in replacement for the per-page `formatPrice(amount, currencyCode)`
 * helpers that wrapped Intl.NumberFormat. Accepts a string or number for
 * amount; tolerates Shopify-style price.amount strings.
 */
export function formatPrice(amount: string | number, currencyCode = "EUR"): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount);
  if (!Number.isFinite(n)) return formatEuro(0);
  const cents = Math.round(n * 100);
  const isWhole = cents % 100 === 0;
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(n);
}
