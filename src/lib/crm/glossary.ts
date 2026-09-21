/**
 * What every figure in the CRM actually means, in plain words.
 *
 * Nigel's point on the call was blunt and fair: if he has to ask what a number
 * is, the number has failed. Worse, several of these have names that sound
 * self-explanatory and are not. "Work won" is not work won, it is what Google
 * recorded, most of it placeholder values. "Enquiries" counts conversion
 * actions, which includes a maps click. A figure whose name misleads is worse
 * than one that is merely unexplained.
 *
 * So each entry says two things: what it is, and what it is made of. The
 * second is the one that settles arguments, because it names the source.
 */
export interface Definition {
  /** What it is, one sentence, no jargon. */
  plain: string;
  /** Where the number comes from, so it can be checked. */
  madeOf: string;
  /** Said out loud when the name is misleading rather than merely terse. */
  caution?: string;
}

export const GLOSSARY: Record<string, Definition> = {
  spend: {
    plain: "What the advertising cost over the period shown.",
    madeOf: "Google Ads cost for this business's own campaigns, taken from the daily record. The other business's campaigns on the same account are left out.",
  },
  workWon: {
    plain: "The value Google recorded against these ads.",
    madeOf: "Google Ads conversion value.",
    caution: "Mostly placeholder amounts set per conversion type rather than prices anyone paid, mixed with a few real Stripe amounts. It is not what the work was worth and should not be used to decide budget.",
  },
  returnOnSpend: {
    plain: "How many euro came back for every euro spent.",
    madeOf: "Money back divided by ad spend, over the days attribution was working.",
    caution: "Which money counts changes the answer, so the chart says which of the three is on screen.",
  },
  moneyFromAnAd: {
    plain: "Money actually taken on a checkout that carried a Google click id.",
    madeOf: "Stripe checkout sessions marked paid, where the session metadata holds a click id.",
    caution: "Counted strictly, so it can only ever understate. A payment whose click id was not captured is not in here even if an ad caused it.",
  },
  allMoneyTaken: {
    plain: "Every euro Stripe took in the period.",
    madeOf: "Stripe checkout sessions marked paid, all of them.",
    caution: "Counted loosely, so it can only ever overstate. It includes work that came from the van, a neighbour or a phone call that never saw an ad.",
  },
  enquiries: {
    plain: "How many times somebody did something the ads count as a lead.",
    madeOf: "Google Ads conversions for this business's campaigns.",
    caution: "A conversion is whatever the account has been told to count, which currently includes a maps click. Not all of these are a person who wants a quote.",
  },
  clicks: {
    plain: "How many times somebody clicked an ad.",
    madeOf: "Google Ads clicks.",
  },
  costEach: {
    plain: "What one enquiry cost, on average.",
    madeOf: "Ad spend divided by enquiries.",
  },
  moneyIn: {
    plain: "What customers paid, before Stripe's fee and before refunds.",
    madeOf: "Stripe charges marked paid.",
  },
  kept: {
    plain: "What was left after Stripe's fee and any refunds.",
    madeOf: "Stripe balance transactions, net.",
  },
  nextPayout: {
    plain: "What Stripe is due to pay into the bank next, and when.",
    madeOf: "The pending Stripe payout.",
  },
  averageOrder: {
    plain: "What a typical paid order came to.",
    madeOf: "Money in divided by the number of paid orders.",
  },
  paidOrders: {
    plain: "How many orders were paid for.",
    madeOf: "Stripe checkout sessions marked paid. One session is one order however many items it held.",
  },
  people: {
    plain: "How many separate people are on record.",
    madeOf: "Rows in the contacts table, matched on email or phone so one person is not counted twice.",
  },
  consultations: {
    plain: "Booked consultations.",
    madeOf: "Calendly bookings on the consultation event type.",
  },
  scans: {
    plain: "How many times a QR code or short link was opened.",
    madeOf: "Scan rows written by the redirect.",
  },
};

export type GlossaryKey = keyof typeof GLOSSARY;
