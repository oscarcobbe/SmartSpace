/**
 * An amount of money, as a person actually types it.
 *
 * ── WHY THIS IS NOT Number(x.replace(/[^0-9.]/g, "")) ────────────
 *
 * That was the first version, and an adversarial review found it charges a
 * hundred times too much for the commonest European way of writing a price.
 * Stripping everything but digits and dots turns "199,50" into "19950", which
 * Number reads as nineteen thousand nine hundred and fifty euro. It is under
 * the twenty thousand ceiling, so a live payment link goes out and the
 * customer gets an email itemising EUR 19,950.00 for a EUR 199.50 job.
 *
 * The same strip silently accepted several other things:
 *
 *   "1.479,00"  ->  1.47900      -> EUR 1.48, a hundredth of the price
 *   "1e3"       ->  13           -> the e and the digits ran together
 *   "-50"       ->  50           -> the sign disappeared
 *   "1.2.3"     ->  NaN          -> refused, but only by luck
 *
 * Every one of those passed `Number.isFinite(amount) && amount > 0`.
 *
 * So this does not coerce. It recognises the shapes a person writes and
 * refuses everything else, and it says which shape it refused, because "that
 * is not an amount" is no use to somebody looking at a number they can see.
 */

export type MoneyParse =
  | { ok: true; cents: number; /** The amount, written back the one right way. */ formatted: string }
  | { ok: false; reason: string };

/**
 * Decimal separators, decided by which one comes last.
 *
 * "1.479,00" is one thousand four hundred and seventy nine euro: the comma is
 * the decimal point and the dot groups thousands. "1,479.00" is the same
 * amount the other way round. The last separator in the string is the decimal
 * one in both, which is the only rule that reads both conventions correctly.
 */
export function parseMoney(raw: unknown): MoneyParse {
  const text = String(raw ?? "").trim().replace(/[ \s]/g, "").replace(/^€/, "");
  if (!text) return { ok: false, reason: "How much is it for?" };

  if (!/^[0-9.,]+$/.test(text)) {
    return { ok: false, reason: `"${text.slice(0, 20)}" is not an amount. Digits, and a . or , for the cents.` };
  }

  /*
   * The shape is recognised whole, not separator by separator.
   *
   * Walking the separators one at a time let "1.2.3" through as EUR 12.30 and
   * "1,2,3.00" through as EUR 123.00, because each step looked locally
   * reasonable. A price has exactly one grammar: optional thousands groups of
   * three, then at most one decimal separator, then one or two cents. Match
   * that or refuse.
   */
  const PLAIN = /^\d+$/;                                   // 1479
  const CENTS = /^\d+[.,]\d{1,2}$/;                        // 1479.00, 199,50
  const GROUPED_DOT = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;    // 1.479,00
  const GROUPED_COMMA = /^\d{1,3}(,\d{3})+(\.\d{1,2})?$/;  // 1,479.00
  if (!PLAIN.test(text) && !CENTS.test(text) && !GROUPED_DOT.test(text) && !GROUPED_COMMA.test(text)) {
    return {
      ok: false,
      reason: `"${text.slice(0, 20)}" is not an amount. Write it as 199.50 or 1,479.00.`,
    };
  }

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  /* Only the separator that is genuinely the decimal one. In a grouped shape
     the groups are three digits wide, so a final group of three is thousands
     and never cents. */
  const tail = Math.max(lastDot, lastComma);
  const tailLen = tail === -1 ? 0 : text.length - tail - 1;
  const decimalAt = tail !== -1 && tailLen <= 2 ? tail : -1;

  let whole: string;
  let fraction = "";
  if (decimalAt === -1) {
    whole = text;
  } else {
    whole = text.slice(0, decimalAt);
    fraction = text.slice(decimalAt + 1);
    /* The shape check above guarantees one or two digits here. */
  }

  const groupsOnly = whole.replace(/[.,]/g, "");
  if (!/^\d+$/.test(groupsOnly)) {
    return { ok: false, reason: `"${text.slice(0, 20)}" is not an amount.` };
  }

  const cents = Number(groupsOnly) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) {
    return { ok: false, reason: `"${text.slice(0, 20)}" is larger than this till takes.` };
  }
  if (cents <= 0) return { ok: false, reason: "An amount has to be more than nothing." };

  return {
    ok: true,
    cents,
    formatted: new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100),
  };
}
