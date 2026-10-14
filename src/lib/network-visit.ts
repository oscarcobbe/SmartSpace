/**
 * The assessment visit's details as the page asks for them (NetworkBookAndPay)
 * and as /api/checkout reads them back: one definition for both sides.
 */
/** An Irish Eircode: a routing key (A65, D6W) and four characters, with or without the space. */
export const EIRCODE = /^([AC-FHKNPRTV-Y][0-9]{2}|D6W)\s?[0-9AC-FHKNPRTV-Y]{4}$/i;
/** The item's answers, under the names the checkout and the webhook read. */
export const VISIT_KEYS = { name: "Name for the visit", phone: "Phone", email: "Email", address: "Visit address", eircode: "Eircode" } as const;
