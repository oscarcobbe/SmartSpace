/**
 * The statutory particulars, in one place.
 *
 * ── WHY THEY HAVE TO BE ON THE SITE ──────────────────────────────
 *
 * Section 151 of the Companies Act 2014 requires a company's registered name,
 * its registered number and its registered office on its websites and business
 * letters. smart-space.ie carried none of the three: not in the footer, not in
 * the terms, not in the privacy policy. The footer said "Smart Space", which
 * is a trading name and not the registered one.
 *
 * It is also the public record Google cross-checks during advertiser
 * verification, which SmartCare Living's account is currently blocked on, so
 * the absence was costing something concrete as well as being a breach.
 *
 * ── WHY ONE FILE ─────────────────────────────────────────────────
 *
 * These details have to agree wherever they appear. Written into the footer
 * and the terms separately they drift, and the wrong company number on a
 * public page is worse than none.
 *
 * ── SOURCE ───────────────────────────────────────────────────────
 *
 * Read from the public register on 21 September 2026. Confirm against
 * core.cro.ie before relying on it for anything beyond the website: the
 * aggregator that carries it is not the register itself.
 */
export const COMPANY = {
  /** As registered, not the trading name. */
  legalName: "Smart Space Technologies Limited",
  /** The name the business trades under. */
  tradingAs: "Smart Space",
  /** CRO registration number. */
  number: "625163",
  registeredOffice: "Fourwinds Cottage, Cuckoo Corner, Ballymerrigan, Co. Wicklow, Ireland",
  incorporated: "20 April 2018",
  country: "Ireland",
} as const;

/** One line, for a footer. */
export const companyLine = () =>
  `${COMPANY.tradingAs} is a trading name of ${COMPANY.legalName}, ` +
  `registered in ${COMPANY.country}, company number ${COMPANY.number}. ` +
  `Registered office: ${COMPANY.registeredOffice}.`;
