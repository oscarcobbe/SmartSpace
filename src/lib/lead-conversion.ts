/**
 * Firing a lead conversion to Google Ads, in one place.
 *
 * This was written inside ContactForm and is now needed by the callback form
 * on the paid landing page too. Copying it would put the conversion label in
 * two files, and the comment in ContactForm records what that costs: phone
 * call conversions once stopped registering because a label carried a
 * trailing newline from a copy-paste into Vercel. A label that lives in two
 * places is a label that will eventually differ in one of them.
 *
 * Everything here was already proven in production and is unchanged:
 *
 *   Enhanced conversions. Google hashes email_address and phone_number in the
 *   browser, so the match happens without either value leaving as plain text.
 *   The key is `email_address`, not `email`, per Google's user_data schema.
 *
 *   transaction_id is the server-generated id from /api/contact, so the
 *   client fire and the server fire of the same lead are counted once.
 *
 *   transport_type beacon uses navigator.sendBeacon, which the browser
 *   delivers even if the page navigates immediately afterwards. Without it
 *   the ping is abandoned when somebody submits and closes the tab.
 *
 *   .trim() on the env var is load-bearing for the reason above.
 *
 * Added since, for every lead that comes through here:
 *
 *   The phone goes to Google as E.164 (+353...), not as typed. Enhanced
 *   Conversions asks for E.164, and "087 123 4567" hashes to something else
 *   than the number Google matches against. src/lib/phone.ts.
 *
 *   The same lead, with the same id, for ChatGPT ads (src/lib/chatgpt-pixel.ts),
 *   which does nothing until that pixel exists and the visitor accepts.
 */

import { oaiLead } from "@/lib/chatgpt-pixel";
import { normalisePhone } from "@/lib/phone";

const GADS_LEAD_SEND_TO =
  process.env.NEXT_PUBLIC_GADS_LEAD_SEND_TO?.trim() ||
  "AW-17978501655/u8cHCNyipZocEJfU6PxC";

/**
 * "SS - SmartNet enquiry" (conversion action 7810338147, lead form category,
 * counted for bidding, default value 50): every enquiry from the home network
 * pages and the Wi-Fi check. It existed in the account and nothing fired it
 * until 30 September 2026. /api/wifi-check fires the same label from the
 * server, so it is exported from here rather than written out twice.
 * NEXT_PUBLIC_GADS_SMARTNET_SEND_TO overrides it, as NEXT_PUBLIC_GADS_LEAD_SEND_TO
 * overrides the lead label, for an action recreated in the account.
 */
export const GADS_WIFI_SEND_TO =
  process.env.NEXT_PUBLIC_GADS_SMARTNET_SEND_TO?.trim() ||
  "AW-17978501655/aFHQCOOaoYwdEJfU6PxC";
/** The value the account gives that action. */
export const WIFI_LEAD_VALUE = 50;

/* wifi_check is an enquiry sent from a Wi-Fi check's report, wifi_enquiry one
   from a package page: the lead_source the server's own copy carries too. */
export type LeadSource = "contact_form" | "callback_request" | "wifi_check" | "wifi_enquiry";

const SEND_TO: Record<LeadSource, string> = {
  contact_form: GADS_LEAD_SEND_TO,
  callback_request: GADS_LEAD_SEND_TO,
  wifi_check: GADS_WIFI_SEND_TO,
  wifi_enquiry: GADS_WIFI_SEND_TO,
};

export function fireLeadConversion(
  email: string,
  phone: string,
  conversionId: string | undefined,
  source: LeadSource,
  value = 10,
) {
  if (typeof window === "undefined") return;
  /*
   * No server-issued id, no fire.
   *
   * /api/contact answers a honeypot hit with { success: true, id: "honeypot" }
   * and no conversionId, deliberately, so a bot does not retry. It skips every
   * side effect: no email, no sheet write, no server conversion. The form
   * could not tell that apart from a real success, saw res.ok, and fired a
   * client conversion with transaction_id undefined. So a submission the
   * server threw away still booked a conversion, and nothing on the server
   * side existed for Ads to dedupe it against.
   *
   * It is also the honest rule in general: this fire exists to add enhanced
   * data to a conversion the server already recorded, and without the id it
   * is not that, it is a second unattributable one. If a password manager
   * ever fills the hidden field, the customer loses the lead and the account
   * gains a phantom.
   */
  if (!conversionId) {
    console.warn("[gtag] no conversion id from the server, client fire skipped");
    return;
  }

  /* Before the gtag guard: a browser that blocks Google may still run
     OpenAI's pixel, and the two are independent. */
  oaiLead(email, phone, value, conversionId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") {
    console.warn("[gtag] window.gtag not available, conversion NOT fired");
    return;
  }

  const e164 = normalisePhone(phone);
  const userData: Record<string, string> = { email_address: email };
  if (e164) userData.phone_number = e164;
  gtag("set", "user_data", userData);

  gtag("event", "conversion", {
    send_to: SEND_TO[source],
    value,
    currency: "EUR",
    transaction_id: conversionId,
    user_data: userData,
    transport_type: "beacon",
    event_callback: () => console.log("[gtag] AW conversion ack:", conversionId, source),
  });

  gtag("event", "generate_lead", {
    currency: "EUR",
    value,
    lead_source: source,
    transaction_id: conversionId,
    transport_type: "beacon",
  });

  console.log("[gtag] lead conversion fired", { conversionId, source, sendTo: SEND_TO[source] });
}
