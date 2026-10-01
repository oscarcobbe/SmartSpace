/**
 * The id OpenAI counts a ChatGPT ads conversion once on.
 *
 * The page's pixel sends it as event_id and the server's Conversions API copy
 * sends it as id. OpenAI keeps the first of the two only when pixel id, event
 * name and id are the same string. The server cut its copy to 64 characters
 * and the pixel sent the id whole, so a Stripe Checkout session id (66
 * characters, cs_live_ and 58 more) reached OpenAI as two different ids, and
 * every paid order would have counted twice. Both halves now take the id from
 * here.
 *
 * Why 64: OpenAI's docs give no length for id. 64 is what the server half
 * already sent, and the limit the API sets on its other identifiers
 * (custom_event_name, integration_source). A lead's UUID (36) fits whole. A
 * Stripe session id loses its last two characters and keeps 56 random ones.
 *
 * Kept free of imports: the browser, the server and the build checks all load
 * it.
 */
export function oaiEventId(id: string | null | undefined): string {
  return String(id ?? "").trim().slice(0, 64);
}
