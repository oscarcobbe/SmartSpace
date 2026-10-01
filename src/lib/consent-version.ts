/**
 * Which privacy notice a cookie-banner answer was given under.
 *
 * CookieBanner stores this with every answer (ss_consent's "v"). An answer
 * stored before it existed reads as 1.
 *
 *   1  Google Analytics and Google Ads only.
 *   2  1 October 2026: /privacy also names OpenAI (ChatGPT ads).
 *
 * An Accept is agreement to the advertisers the notice named when it was
 * given, and nobody who accepted under version 1 was told about OpenAI. So the
 * ChatGPT ads pixel, and its server-side copy, need an Accept given at
 * OPENAI_CONSENT_VERSION or later; Google's tags carry on under any Accept.
 * Bump CONSENT_VERSION, and add a line above, when /privacy names another ad
 * company, and gate that company on the new number.
 *
 * Kept free of imports: the browser, the server and the build checks all load
 * it.
 */
export const CONSENT_VERSION = 2;

/** The first notice that names OpenAI. */
export const OPENAI_CONSENT_VERSION = 2;
