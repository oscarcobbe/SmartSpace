/**
 * Make a Stripe payment link, tagged, from the dashboard.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────
 *
 * Measured 22 September 2026: every Smart Space charge that month carries
 * empty Stripe metadata. None of them went through the website's checkout,
 * which does write the click id. They are payment links made by hand in
 * Stripe, and a hand-made link has no browser behind it, so it can never carry
 * one. Google cannot match what it was never given, and that is the whole of
 * the "the ads produce sales the account never sees" question.
 *
 * There was already a way to send a tagged link: paste a Stripe URL into
 * /admin/leads and it would attach a reference. Two apps, two logins, and a
 * trip to Stripe first to make the link. It was not used, and the evidence is
 * that not one September sale carries a tag.
 *
 * So the link is made here. One amount, one description, one button, in the
 * dashboard the customer is already open in, and the click id comes off their
 * own record rather than being remembered and pasted.
 *
 * ── WHAT THIS DOES NOT DO ────────────────────────────────────────
 *
 * Tag, or send. /api/admin/send-payment-link already does both, with a mail
 * template that has been in front of customers for months, a host allow-list,
 * and the token minting that keeps the click id off the URL. Copying any of
 * that to save an internal HTTP hop would give this business two email
 * templates to keep in step, which is how one of them goes stale.
 *
 * This makes the link. That is the only part that was missing.
 */

const API = "https://api.stripe.com/v1";

/* Where a paid link lands. Without this the customer ends on Stripe's own
   receipt page, which fires nothing, and the conversion is lost on the client
   side as well as the offline one. Twenty six of twenty seven existing links
   were corrected to this in September; a new one starts correct. */
export const SUCCESS_URL =
  "https://smart-space.ie/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}";

export interface LinkRequest {
  /** Whole euro and cents, as typed. */
  amountCents: number;
  /** What the customer is paying for, as it should read on their statement. */
  description: string;
}

async function stripe(path: string, body: URLSearchParams): Promise<Record<string, unknown>> {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("Stripe is not configured on this deployment.");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    let why = text.slice(0, 200);
    try {
      const j = JSON.parse(text) as { error?: { message?: string } };
      if (j.error?.message) why = j.error.message;
    } catch { /* keep the raw body */ }
    throw new Error(`Stripe refused this: ${why}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

export const MIN_CENTS = 100;
export const MAX_CENTS = 2_000_000;

export async function createPaymentLink(req: LinkRequest): Promise<string> {
  const cents = Math.round(req.amountCents);
  if (!Number.isFinite(cents) || cents < MIN_CENTS || cents > MAX_CENTS) {
    throw new Error(`An amount between €${MIN_CENTS / 100} and €${MAX_CENTS / 100} please.`);
  }
  const description = req.description.trim().slice(0, 120);
  if (description.length < 3) throw new Error("Say what the payment is for.");

  /* An inline product rather than one from the catalogue: these are bespoke
     jobs quoted at a kitchen table, which is the whole reason they are not
     going through the website's checkout in the first place. */
  const price = await stripe("/prices", new URLSearchParams({
    currency: "eur",
    unit_amount: String(cents),
    "product_data[name]": description,
  }));

  const link = await stripe("/payment_links", new URLSearchParams({
    "line_items[0][price]": String(price.id),
    "line_items[0][quantity]": "1",
    "after_completion[type]": "redirect",
    "after_completion[redirect][url]": SUCCESS_URL,
    /* So the money can be found again from either side. */
    "metadata[made_by]": "crm",
  }));

  const url = String(link.url ?? "");
  if (!url.startsWith("https://buy.stripe.com/")) {
    /* The send route only accepts buy.stripe.com, so a link Stripe hands back
       on some other host would be created, charged for, and refused on the way
       out. Better to say so here than to leave an orphan link live. */
    throw new Error(`Stripe returned a link this dashboard cannot send: ${url.slice(0, 60)}`);
  }
  return url;
}
