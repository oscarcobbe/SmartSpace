/**
 * Server-side conversion firing.
 *
 * Why: client-side gtag.js misses ~20-40% of conversions in production due to
 *   - Adblockers / privacy extensions silently dropping the pixel
 *   - Consent Mode default-deny (modeled, not full-fidelity)
 *   - SPA navigation killing the success page before the gtag fire completes
 *   - Mobile browsers throttling background JS on tab-switch
 *
 * This module fires conversions a second time from the server (the source of
 * truth, we only call it after the row has been confirmed paid / written to
 * the lead sheet), so Google Ads + GA4 see every real conversion from a visitor
 * who accepted ad cookies. Nothing is sent for anybody else; see
 * fireServerConversion below.
 *
 * Three channels:
 *   1) GA4 Measurement Protocol, official, authenticated. Requires
 *      GA4_API_SECRET (create in GA4 Admin → Data Streams → Measurement
 *      Protocol API secrets). A lead arrives as server_lead, never under the
 *      browser's own event names; see ga4EventName below.
 *   2) Google Ads conversion pixel, unauthenticated GET to the legacy
 *      googleadservices endpoint, for a browser whose own Google tag never
 *      ran; see fireServerConversion.
 *   3) OpenAI's Conversions API, the server-side copy of the ChatGPT ads
 *      pixel. Off until OPENAI_ADS_API_KEY and NEXT_PUBLIC_OAI_PIXEL_ID are
 *      both set; see fireOpenAi.
 *
 * All are best-effort: failures are logged and never thrown. Customer flows
 * never break because tracking is having a bad day.
 */

import { createHash, randomUUID } from "crypto";
import { oaiEventId } from "./oai-event-id";
import { normalisePhone } from "./phone";

/* G-N8886QEJ70 in production, stream 15470580335. A Measurement Protocol event
   is filed under the stream whose id it carries, so GA4_API_SECRET has to be a
   secret of that stream (replaced on 4 October 2026; the old one belonged to
   G-JR2WXNSLEL's stream, and no server event arrived from 20 August). */
const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET;
const GADS_ACCOUNT_ID = "17978501655"; // from AW-17978501655
/* The ChatGPT ads pixel the browser loads (src/lib/chatgpt-pixel.ts). The
   Conversions API posts to the same pixel, so both halves share one id. */
const OAI_PIXEL_ID = (process.env.NEXT_PUBLIC_OAI_PIXEL_ID || "").trim();

/** Sha256 lowercase-trim, Google's Enhanced Conversions hashing format. */
function hashPii(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase();
  if (!normalised) return undefined;
  return createHash("sha256").update(normalised).digest("hex");
}

/*
 * The phone, hashed as Google matches it: E.164 (+353...), not as typed.
 * "087 123 4567" and "+353871234567" are one customer and were two hashes,
 * and only the second is the form Enhanced Conversions matches.
 */
const hashPhone = (phone: string | undefined) => hashPii(normalisePhone(phone) || undefined);

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    let v = part.slice(i + 1).trim();
    try { v = decodeURIComponent(v); } catch { /* leave it raw */ }
    if (k && !(k in out)) out[k] = v;
  }
  return out;
}

/**
 * What an enquiry's own request says about the browser that sent it.
 *
 * The form POST is same-origin, so it carries the site's first-party cookies
 * and headers with it. Read once, before the route answers, and passed to
 * fireServerConversion.
 */
export interface BrowserContext {
  /**
   * Whether Google's Ads tag runs in this browser. It writes _gcl_au, and only
   * once ad storage is granted, so the cookie on the request means the page's
   * own conversion tag fires for this lead (SmartCare Living's browserTagsRan).
   */
  browserTagsRan: boolean;
  /** The ChatGPT ad click (__oppref, 30 days) and OpenAI's browser reference
      (__obref, a year): the pixel's own cookies, set only after Accept. The
      click falls back to the one in the form's attribution record. */
  oppref?: string;
  obref?: string;
  /** The page the enquiry was sent from, for OpenAI's source_url. */
  sourceUrl?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * attribution is the record the form sent (src/lib/attribution.ts), which
 * keeps a ChatGPT ad click (?oppref=) the way it keeps a gclid. The pixel's
 * __oppref cookie wins when both are there. The record covers a browser that
 * blocks bzrcdn.openai.com: the SDK never loads there, so no cookie is
 * written, and the Conversions API does not find the click by itself
 * (OpenAI's docs: "Capture the value yourself"). The record, like the cookie,
 * exists only after Accept.
 */
export function browserContext(request: Request, attribution?: { oppref?: unknown } | null): BrowserContext {
  const h = request.headers;
  const cookies = parseCookies(h.get("cookie"));
  const ip = (h.get("x-real-ip") || (h.get("x-forwarded-for") ?? "").split(",")[0] || "").trim();
  const click = cookies.__oppref || (typeof attribution?.oppref === "string" ? attribution.oppref : "");
  return {
    browserTagsRan: Boolean(cookies._gcl_au),
    oppref: click ? click.slice(0, 512) : undefined,
    obref: cookies.__obref ? cookies.__obref.slice(0, 128) : undefined,
    sourceUrl: (h.get("referer") || "").slice(0, 1000) || undefined,
    ip: ip.slice(0, 64) || undefined,
    userAgent: (h.get("user-agent") || "").slice(0, 400) || undefined,
  };
}

export interface ServerConversionInput {
  /** Conversion label after the slash, e.g. `IofPCOiZuJkcEJfU6PxC`. */
  gadsLabel: string;
  /**
   * `purchase` for a paid order, `server_lead` for every enquiry. The browser
   * sends a lead to GA4 as generate_lead, and GA4 dedupes that on nothing, so
   * a server copy under the same name counted every consented lead twice
   * (SmartCare Living found the same and moved to server_lead). purchase is
   * deduped on transaction_id, so a paid order keeps its name.
   */
  ga4EventName: "purchase" | "server_lead";
  value?: number;
  currency?: string;
  /** Stripe session id / order id, dedupes the conversion across retries. */
  transactionId?: string;
  /** The visitor's real GA4 client id (from the _ga cookie, captured at
   *  checkout). Lets GA4 stitch a server-fired purchase to the browser session
   *  and its channel, instead of dropping it in (not set)/Unassigned. */
  clientId?: string;
  /** The visitor's GA4 session id (from the _ga_<stream> cookie). */
  sessionId?: string;
  /** Carried through from URL → localStorage → checkout metadata; null if user came from organic. */
  gclid?: string;
  /** Used both to dedupe and for Enhanced Conversions matching. */
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  /** Anything else worth landing in GA4 (e.g. `lead_source: 'contact_form'`). */
  extraParams?: Record<string, string | number | boolean>;
  /**
   * The visitor's recorded answer to the cookie banner, as the browser sent it
   * with the enquiry or the checkout. Required, so every caller has to say
   * where its answer came from. Only "granted" lets anything leave.
   */
  adConsent: "granted" | "denied" | null;
  /**
   * The enquiry's browser, from browserContext(request). The Stripe webhook
   * has no browser behind it and passes what /api/checkout recorded on the
   * session instead.
   */
  browser: BrowserContext;
  /**
   * The same event for ChatGPT ads (OpenAI's Conversions API). consented is
   * openAiConsented() of the visitor's answer: an Accept given under a notice
   * that names OpenAI. Omitted, nothing goes to OpenAI.
   */
  openAi?: { type: "lead_created" | "order_created"; consented: boolean };
}

/**
 * Fire conversion through every channel concurrently. Awaits them with a
 * 4s ceiling so a hung endpoint can't pin the parent serverless function.
 * Always resolves, never throws.
 *
 * Nothing is sent without a recorded yes to ad cookies.
 *
 * Both channels carry identifiers: the Ads pixel sends the click id and a
 * hashed email and phone, and the GA4 event sends a hashed email as user_id
 * and in user_data. This used to fire for every enquiry, phone tap and sale
 * whatever the visitor had chosen, while /privacy says Google receives hashed
 * email and phone "when you consent", and anonymised pings otherwise. A
 * visitor who pressed "Essential only" still had their hashed email sent to
 * Google Ads, and Enhanced Conversions exists to match exactly that to a
 * Google account.
 *
 * So the rule the offline upload already follows applies here too: an answer
 * that is not a recorded "granted" is not consent, and the server stays quiet.
 * The browser still sends its own cookieless pings under Consent Mode, which
 * is what the notice describes.
 */
export async function fireServerConversion(input: ServerConversionInput): Promise<void> {
  if (input.adConsent !== "granted") {
    console.log(`[conv] server fire skipped for ${input.ga4EventName}: no recorded yes to ad cookies (${input.adConsent ?? "no answer"})`);
    return;
  }

  const tasks: Array<Promise<unknown>> = [];

  if (GA4_ID && GA4_API_SECRET) {
    tasks.push(fireGA4(input));
  } else if (!GA4_API_SECRET) {
    // Logged once per cold start so we know the safety net isn't installed.
    console.warn("[conv] GA4_API_SECRET not set, skipping server-side GA4 conversion fire");
  }

  /*
   * The Ads pixel only for a browser whose own Google tag never ran: an ad
   * blocker, mostly.
   *
   * It used to fire for every consented conversion, and Google Ads keeps the
   * first of two with the same transaction_id. The browser's tag is the better
   * record of the pair: it carries the consent state and Google's own click
   * cookies, which this request cannot. Whichever reached Google first won the
   * dedupe, so the server could replace the better copy with the weaker one.
   * So where the tag runs, the page records the conversion and this stays
   * quiet, which is SmartCare Living's rule since September.
   */
  if (input.browser?.browserTagsRan) {
    console.log(`[conv] Google Ads pixel skipped for ${input.transactionId ?? "-"}: the browser's own tag fires it (_gcl_au present)`);
  } else {
    tasks.push(fireGoogleAdsPixel(input));
  }

  if (input.openAi) tasks.push(fireOpenAi(input));

  await Promise.race([
    Promise.allSettled(tasks),
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}

async function fireGA4(input: ServerConversionInput): Promise<void> {
  try {
    const userData: Record<string, unknown> = {};
    const sha_email = hashPii(input.email);
    const sha_phone = hashPhone(input.phone);
    if (sha_email) userData.sha256_email_address = sha_email;
    if (sha_phone) userData.sha256_phone_number = sha_phone;
    if (input.firstName) userData.address = { ...(userData.address as object), sha256_first_name: hashPii(input.firstName) };
    if (input.lastName) userData.address = { ...(userData.address as object), sha256_last_name: hashPii(input.lastName) };

    const params: Record<string, string | number | boolean> = {
      ...(input.extraParams ?? {}),
    };
    if (typeof input.value === "number") params.value = input.value;
    if (input.currency) params.currency = input.currency;
    if (input.transactionId) params.transaction_id = input.transactionId;
    if (input.gclid) params.gclid = input.gclid;
    // session_id + a nonzero engagement time let GA4 attach the purchase to the
    // originating session, so channel attribution matches the browser session.
    if (input.sessionId) {
      params.session_id = input.sessionId;
      params.engagement_time_msec = 1;
    }

    const body = {
      client_id: input.clientId || input.transactionId || randomUUID(),
      user_id: sha_email, // stable user_id for cross-device join when available
      user_data: Object.keys(userData).length ? userData : undefined,
      events: [
        {
          name: input.ga4EventName,
          params,
        },
      ],
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_ID}&api_secret=${GA4_API_SECRET}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[conv] GA4 MP responded ${res.status}: ${await res.text().catch(() => "")}`);
    } else {
      console.log(`[conv] GA4 MP fired ${input.ga4EventName} value=${input.value ?? 0} ${input.currency ?? ""}`);
    }
  } catch (err) {
    console.error("[conv] GA4 MP error:", err);
  }
}

async function fireGoogleAdsPixel(input: ServerConversionInput): Promise<void> {
  // Legacy pixel format: GET to googleadservices/pagead/conversion/<id>/
  // Accepts gclid for click attribution and value/currency for monetary.
  // Emails/phones can be appended as `em` and `pn` (sha256 hex) for ECfL.
  try {
    // Final safety belt: scrub any whitespace from the label even if a
    // caller forgot to .trim() the env var. A trailing \n in a Vercel
    // env var URL-encodes to %0A here and makes Google Ads reject the
    // conversion as an unknown label. The Vercel value pill hides
    // whitespace characters in its UI, so this is a defence in depth.
    const sanitisedLabel = input.gadsLabel.trim().replace(/\s+/g, "");
    const params = new URLSearchParams();
    params.set("label", sanitisedLabel);
    if (typeof input.value === "number") params.set("value", input.value.toString());
    if (input.currency) params.set("currency_code", input.currency);
    if (input.transactionId) params.set("oid", input.transactionId);
    if (input.gclid) params.set("gclid", input.gclid);
    const sha_email = hashPii(input.email);
    const sha_phone = hashPhone(input.phone);
    if (sha_email) params.set("em", sha_email);
    if (sha_phone) params.set("pn", sha_phone);

    const url = `https://www.googleadservices.com/pagead/conversion/${GADS_ACCOUNT_ID}/?${params.toString()}`;
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    // The pixel always 200s with a 1x1 GIF, failure here usually means the
    // network blocked us, not that Google rejected the conversion.
    if (!res.ok) {
      console.error(`[conv] Google Ads pixel responded ${res.status}`);
    } else {
      console.log(`[conv] Google Ads pixel fired AW-${GADS_ACCOUNT_ID}/${input.gadsLabel} gclid=${input.gclid ? "yes" : "no"} email=${sha_email ? "hashed" : "no"}`);
    }
  } catch (err) {
    console.error("[conv] Google Ads pixel error:", err);
  }
}

/**
 * The same event for ChatGPT ads, through OpenAI's Conversions API.
 *
 * The page's pixel sends it too, with this transaction id as its event_id,
 * and OpenAI keeps the first event per pixel, event name and id, so the pair
 * counts once. This copy survives an ad blocker, a closed tab and a pixel that
 * had not finished loading. It carries the ad click (__oppref) and OpenAI's
 * browser reference (__obref) from the pixel's own cookies.
 *
 * A no-op until both OPENAI_ADS_API_KEY (created in OpenAI Ads Manager, kept
 * only in Vercel) and NEXT_PUBLIC_OAI_PIXEL_ID are set, and nothing is sent
 * for a visitor whose Accept predates the notice naming OpenAI. Three seconds
 * at most, inside fireServerConversion's own ceiling.
 * https://developers.openai.com/ads/conversions-api
 */
async function fireOpenAi(input: ServerConversionInput): Promise<void> {
  const key = (process.env.OPENAI_ADS_API_KEY || "").trim();
  const oa = input.openAi;
  if (!key || !OAI_PIXEL_ID || !oa) return;
  if (!oa.consented) {
    console.log(`[conv] OpenAI skipped for ${input.transactionId ?? "-"}: no Accept under the notice that names OpenAI`);
    return;
  }
  /* The pixel's event_id, cut the same way, so OpenAI keeps one of the two. */
  const id = oaiEventId(input.transactionId);
  if (!id) return;
  try {
    const b = input.browser ?? { browserTagsRan: false };
    const email = (input.email ?? "").trim().toLowerCase();
    /* OpenAI's format: digits with the country code, no + and no leading zeros. */
    const phone = normalisePhone(input.phone).replace(/^\+/, "").replace(/^0+/, "");
    const user: Record<string, unknown> = {};
    if (b.obref) user.obref = b.obref;
    if (email) user.emails_sha256 = [createHash("sha256").update(email).digest("hex")];
    if (/^\d{8,15}$/.test(phone)) user.phone_numbers_sha256 = [createHash("sha256").update(phone).digest("hex")];
    if (b.ip) user.ip_address = b.ip;
    if (b.userAgent) user.user_agent = b.userAgent;

    const event: Record<string, unknown> = {
      id,
      type: oa.type,
      timestamp_ms: Date.now(),
      source_url: /^https?:\/\//.test(b.sourceUrl ?? "") ? b.sourceUrl : "https://smart-space.ie/",
      action_source: "web",
      user,
      data: {
        type: oa.type === "order_created" ? "contents" : "customer_action",
        amount: Math.round((input.value ?? 0) * 100),
        currency: (input.currency || "EUR").toUpperCase(),
      },
    };
    if (b.oppref) event.oppref = b.oppref;

    const res = await fetch(`https://bzr.openai.com/v1/events?pid=${encodeURIComponent(OAI_PIXEL_ID)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ events: [event] }),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      console.error(`[conv] OpenAI Conversions API responded ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    } else {
      console.log(`[conv] OpenAI ${oa.type} sent for ${id} oppref=${b.oppref ? "yes" : "no"} obref=${b.obref ? "yes" : "no"}`);
    }
  } catch (err) {
    console.error("[conv] OpenAI Conversions API error:", err instanceof Error ? err.message : err);
  }
}
