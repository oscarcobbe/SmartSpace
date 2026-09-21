/**
 * The home care partnership, written down so every approach says the same thing.
 *
 * ── THE ARGUMENT ─────────────────────────────────────────────────
 *
 * A home care company earns per visit. A carer is in the house for a few hours
 * a week and nobody is paid for the rest of it, which is most of it. That is
 * not a gap in their service, it is the shape of the business: they cannot be
 * there twenty four hours and no family can afford it if they were.
 *
 * So the offer is not a product they resell. It is a share of a subscription on
 * the hours they were never going to bill: sensors in the home, the family and
 * the care company both see what happened overnight, and the care company takes
 * a percentage of the subscription for every home that comes through them.
 *
 * ── WHAT THIS MUST NEVER SAY ─────────────────────────────────────
 *
 * That it replaces a carer. It does not, the whole pitch is that it covers the
 * hours a carer was never in, and a partner who thinks we are selling against
 * their staff will not take the meeting.
 *
 * That there are no cameras. The sensor has a lens and the manufacturer's own
 * manual lists it. Every line says no camera footage, which is true and is the
 * stronger claim anyway.
 *
 * Nothing about who makes the hardware. That is our supplier and it is not
 * public.
 *
 * And no medical claim, no named condition, and no number that is not on file.
 */

export interface PartnerSection {
  heading: string;
  body: string[];
}

/** The subscription a share is taken of. One input, set once, used everywhere. */
export interface PartnerEconomics {
  /** Monthly subscription per home, in euro. Null until it is confirmed. */
  subscriptionPerMonth: number | null;
  /** The share offered to the partner, as a percentage. */
  shareLow: number;
  shareHigh: number;
}

export const ECONOMICS: PartnerEconomics = {
  /* The live price of "SmartGuardian Standard Subscription" in Stripe, read
     from the account rather than from a slide. The partner maths is real money
     on somebody else's spreadsheet, and a figure invented here is one we would
     have to walk back in a meeting. If the price changes in Stripe it has to
     change here, and check-partner-price.mjs fails the build when it drifts. */
  subscriptionPerMonth: 119,
  shareLow: 10,
  shareHigh: 15,
};

export const WHO = {
  heading: "Who this is for",
  body: [
    "Home care companies in Leinster running private packages, not agencies staffing HSE hours only. A private client is the one whose family is already paying and already worried about the nights.",
    "The decision maker is the owner or the care manager. Not the carers, and not head office in another country.",
    "Ten to forty carers is the size that works. Smaller than that and there are not enough homes for the share to matter; much larger and the meeting takes six months.",
  ],
};

export const PITCH: PartnerSection[] = [
  {
    heading: "The problem, in their words",
    body: [
      "You are paid for the hours your carer is in the house. That is a few hours a week out of a hundred and sixty eight.",
      "The family's worry is not the hours you are there. It is the nights, and the mornings before anybody arrives, and the weekend.",
      "When something happens in those hours, you find out afterwards, and it is your reputation in the conversation that follows even though nobody was booked to be there.",
    ],
  },
  {
    heading: "What we put in",
    body: [
      "Sensors in the rooms that matter, fitted by us, with no wearable and nothing for the client to press or charge.",
      "No camera footage leaves the house. The family sees what happened, not pictures of their mother.",
      "The care company gets the same view the family does, so the carer arriving at nine already knows what the night was like.",
    ],
  },
  {
    heading: "What you get",
    body: [
      `A share of the subscription for every home that comes through you, for as long as that home stays on it. ${ECONOMICS.shareLow} to ${ECONOMICS.shareHigh} per cent, agreed up front.`,
      "It is recurring. It is not a referral fee paid once and forgotten.",
      "It is earned on the hours you were never going to bill, so it does not compete with a single visit on your own rota.",
    ],
  },
  {
    heading: "What we are not asking you to do",
    body: [
      "Not to sell anything. You tell us which families are asking about the nights, and we have that conversation.",
      "Not to fit or support it. We do the survey, the install and the support.",
      "Not to sign anything exclusive.",
    ],
  },
];

/**
 * The first message.
 *
 * Short, about their business rather than ours, and it asks for a conversation
 * rather than a sale. The two claims that cannot appear are a replacement for
 * carers and a promise about cameras.
 */
export const OPENER = {
  subject: "The hours your carers are not there",
  body: [
    "{name},",
    "",
    "You are paid for the hours your carers are in the house, and the families you look after worry most about the hours they are not. Most of the week, in other words.",
    "",
    "We fit sensors in the home so the family can see how the night went, with no wearable, nothing to press, and no camera footage leaving the house. Where a home comes through a care company, that company takes a share of the subscription for as long as the home stays on it.",
    "",
    "It is not a replacement for a carer and it is not something you would have to sell or support. It earns on the hours nobody was booked for.",
    "",
    "Worth fifteen minutes?",
    "",
    "Oscar",
  ].join("\n"),
};

/** The objections that come back, and the honest answer to each. */
export const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: "Is this you trying to replace our carers with sensors?",
    a: "No, and if it were we would be selling it to the families directly rather than to you. It covers the hours nobody is booked for. A carer is still the only thing that helps somebody up.",
  },
  {
    q: "Are you putting cameras in our clients' homes?",
    a: "No camera footage leaves the house. The unit has a lens, which is in the manufacturer's own manual, so we say footage rather than cameras, because a family who finds the lens later and was told there was none will never trust us again.",
  },
  {
    q: "Who is liable if it misses something?",
    a: "We are not a monitoring service and we do not claim to catch everything. It is a record of what happened and an alert to the people who already care. That goes in the agreement in writing rather than being settled after an incident.",
  },
  {
    q: "What happens to our share if the family cancels?",
    a: "It stops with the subscription. It is a share of what is actually collected, not a fee we owe you whether or not anybody pays.",
  },
];
