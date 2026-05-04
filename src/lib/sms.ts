/**
 * Twilio SMS — second push channel for high-value events.
 *
 * Why this exists: Resend is currently the ONLY way Nigel hears about new
 * leads/orders. If Resend goes down, his inbox spam-filters our domain, or
 * Gmail is having a bad day, an order can come in and Nigel finds out only
 * when the customer phones up confused. SMS is the cheapest second channel
 * — Twilio EU SIM, ~€0.05 per SMS, hits an iPhone in <5 seconds.
 *
 * Set up:
 *   TWILIO_ACCOUNT_SID    — from Twilio console
 *   TWILIO_AUTH_TOKEN     — from Twilio console
 *   TWILIO_FROM_NUMBER    — purchased Twilio number (e.g. +353xxxxxxxxx)
 *   TWILIO_TO_NUMBER      — Nigel's phone (E.164: +35389...)
 *
 * Without ALL four env vars set, sendSms() is a graceful no-op (logs once,
 * returns immediately) — so deploying this code without a Twilio account
 * doesn't break anything. Set the four vars, redeploy, and it activates.
 *
 * Usage: only fire on events where the SMS is genuinely warranted (not
 * every contact form — too noisy). Recommended:
 *   - Paid order ≥ €100 (sendOrderNotification → also fire SMS)
 *   - Calendly booking creation failure (so Nigel knows to manually book)
 *   - logLead Sheet write failure (so he knows the lead wasn't recorded)
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_FROM_NUMBER;
const TO = process.env.TWILIO_TO_NUMBER;

let warnedAboutMissingConfig = false;

/**
 * Best-effort SMS send. Never throws. Logs every send result. Bodies are
 * truncated to 1000 chars (Twilio splits at ~160 chars but accepts longer).
 *
 * @returns true if Twilio accepted the message; false if skipped, missing
 *          config, or failed.
 */
export async function sendSms(body: string): Promise<boolean> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM || !TO) {
    if (!warnedAboutMissingConfig) {
      console.warn(
        "[sms] Twilio env vars not set (TWILIO_ACCOUNT_SID, _AUTH_TOKEN, _FROM_NUMBER, _TO_NUMBER) — sendSms() is a no-op."
      );
      warnedAboutMissingConfig = true;
    }
    return false;
  }

  const trimmed = body.slice(0, 1000);
  const params = new URLSearchParams();
  params.append("From", FROM);
  params.append("To", TO);
  params.append("Body", trimmed);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[sms] Twilio responded ${res.status}: ${errBody.slice(0, 200)}`);
      return false;
    }
    const data = (await res.json().catch(() => ({}))) as { sid?: string };
    console.log(`[sms] sent — sid=${data.sid ?? "?"} body="${trimmed.slice(0, 40)}..."`);
    return true;
  } catch (err) {
    console.error("[sms] send failed:", err);
    return false;
  }
}
