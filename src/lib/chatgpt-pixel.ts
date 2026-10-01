/**
 * ChatGPT ads: OpenAI's measurement pixel, the browser half.
 *
 * Ported from SmartCare Living's js/tracking.js (chatgptPixel, oaiLead), which
 * has run it since 30 September 2026. The server half, OpenAI's Conversions
 * API, is fireOpenAi in server-conversions.ts; both send one event id per
 * lead, and OpenAI keeps the first of the pair.
 *
 * ── OFF UNTIL THE PIXEL EXISTS ───────────────────────────────────
 *
 * NEXT_PUBLIC_OAI_PIXEL_ID is the pixel's id from OpenAI Ads Manager. Until it
 * is set, every function here returns at once: no queue on window, no script,
 * no cookie, nothing to see in the browser.
 *
 * ── WHAT IT WAITS FOR ────────────────────────────────────────────
 *
 * OpenAI's own snippet goes in <head> and runs on page load, and the SDK treats
 * "never told" as consent, so installed that way it would set its __oppref and
 * __obref cookies on every visitor. Here the SDK is loaded only after Accept,
 * like Google's cookies, and only for an Accept given under the notice that
 * names OpenAI (consent-version.ts): somebody who accepted before 1 October
 * 2026 agreed to Google alone.
 *
 * Events wait in memory on window.oaiq from the page's first moment and go
 * nowhere until the SDK loads and reads them. Nothing leaves the browser
 * before Accept, and a visitor who never accepts never sends any of them.
 *
 * The ad click arrives as ?oppref=. Accept on the landing page and the SDK
 * reads it from the address. Accept a page later and the address no longer has
 * it, the same loss attribution.ts guards against for the gclid, so it waits
 * in sessionStorage (dropped when the tab closes) and is written as the SDK's
 * own __oppref cookie, 30 days, when the visitor says yes.
 *
 * Never on the CRM (SiteChrome does not mount it there), the admin pages or
 * /dev, and not on SmartCare Living's payment page, which is that business's.
 * The site has no internal-traffic switch to honour.
 *
 *   node scripts/check-chatgpt-pixel.mjs
 */
import { consentRecord } from "./attribution";
import { OPENAI_CONSENT_VERSION } from "./consent-version";
import { oaiEventId } from "./oai-event-id";
import { normalisePhone } from "./phone";

export const OAI_PIXEL_ID = (process.env.NEXT_PUBLIC_OAI_PIXEL_ID || "").trim();

const SDK = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
const PIXEL_CONFIG = "https://bzrcdn.openai.com/pixel-config/";
/** Where an ad click waits for Accept (sessionStorage, this tab only). */
const PARK = "ss_oai_oppref";
const OFF_SITE = /^\/(crm|admin|dev|smartcareliving-payment-success)(\/|$)/;

type Queue = ((...args: unknown[]) => void) & { q: unknown[] };
type Win = Window & {
  oaiq?: Queue;
  __ssOnConsent?: (() => void)[];
  fetch: typeof fetch & { __ssOaiGuard?: true };
};

const win = () => window as unknown as Win;
const offSite = () => OFF_SITE.test(window.location.pathname);

/** OpenAI's command queue, the same shape its snippet creates. */
function oai(...args: unknown[]): void {
  if (!OAI_PIXEL_ID || typeof window === "undefined" || offSite()) return;
  const w = win();
  if (!w.oaiq) {
    const q = function () {
      // eslint-disable-next-line prefer-rest-params
      q.q.push(arguments);
    } as unknown as Queue;
    q.q = [];
    w.oaiq = q;
  }
  w.oaiq(...args);
}

let started = false;
let loaded = false;
let lastPath: string | null = null;

/**
 * Once per document, from ChatGptPixel. Queues init, parks an ad click that
 * arrived before Accept, and loads the SDK now or on Accept.
 */
export function startChatGptPixel(): void {
  if (started || !OAI_PIXEL_ID || typeof window === "undefined" || offSite()) return;
  started = true;

  const clickId = clickInAddress();
  const consent = consentRecord();
  if (clickId && consent?.decision !== "granted") {
    try { sessionStorage.setItem(PARK, clickId); } catch { /* storage refused: only this page can use it */ }
  }

  oai("init", { pixelId: OAI_PIXEL_ID });

  if (consent?.decision === "granted") {
    if (consent.v >= OPENAI_CONSENT_VERSION) load();
    return;
  }
  /* CookieBanner runs this queue on Accept, after storing the answer at the
     current version, so an Accept pressed here is one that names OpenAI. */
  const w = win();
  w.__ssOnConsent = w.__ssOnConsent ?? [];
  w.__ssOnConsent.push(load);
}

function clickInAddress(): string {
  try {
    return (new URLSearchParams(window.location.search).get("oppref") ?? "").slice(0, 512);
  } catch {
    return "";
  }
}

function load(): void {
  if (loaded) return;
  loaded = true;

  let parked = "";
  try {
    parked = sessionStorage.getItem(PARK) ?? "";
    sessionStorage.removeItem(PARK);
  } catch { /* storage refused */ }
  /* The address as it is now, not as it was on arrival: a client-side route
     change in between has already dropped ?oppref= from it, and the SDK only
     reads what is there when it loads. */
  if (!clickInAddress() && parked) {
    const domain = /(^|\.)smart-space\.ie$/.test(window.location.hostname) ? "; domain=smart-space.ie" : "";
    try {
      document.cookie = `__oppref=${encodeURIComponent(parked)}; path=/; max-age=2592000; samesite=lax; secure${domain}`;
    } catch { /* cookies refused */ }
  }

  guardPixelConfig();

  const s = document.createElement("script");
  s.async = true;
  s.src = SDK;
  document.head.appendChild(s);
}

/*
 * Automatic advanced matching stays off.
 *
 * With it on, the SDK reads name, email, phone and address fields from every
 * form as the visitor types, sent or not. /privacy says only that a hashed
 * email and phone go with an enquiry somebody sends, which oaiLead does. Ads
 * Manager has no switch for it and the docs give no opt-out; the SDK reads the
 * setting from pixel-config/ and treats a 404 there as "not found", meaning
 * off (SmartCare Living, 30 September 2026, oaiq-web 0.1.41). Every other
 * request passes through untouched.
 */
function guardPixelConfig(): void {
  const w = win();
  if (typeof w.fetch !== "function" || typeof Response === "undefined" || w.fetch.__ssOaiGuard) return;
  const real = w.fetch;
  const guarded = function (input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url ?? "";
    if (url.startsWith(PIXEL_CONFIG)) return Promise.resolve(new Response(null, { status: 404 }));
    return real.call(window, input, init);
  } as Win["fetch"];
  guarded.__ssOaiGuard = true;
  w.fetch = guarded;
}

/** A page view: the first load, and every client-side route change after it. */
export function oaiPageViewed(path: string): void {
  if (!OAI_PIXEL_ID || path === lastPath) return;
  lastPath = path;
  oai("measure", "page_viewed", { type: "contents" });
}

async function sha256Hex(s: string): Promise<string> {
  if (!s || typeof crypto === "undefined" || !crypto.subtle || typeof TextEncoder === "undefined") return "";
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/**
 * An enquiry, as lead_created. The SDK takes email and phone only through
 * init, hashed the way OpenAI asks: the email trimmed and lowercased, the
 * phone as digits with the country code and no + or leading zeros. amount is
 * in cents. eventId is the enquiry's conversion id, which the server's
 * Conversions API copy carries too, cut the same way (oai-event-id.ts).
 */
export function oaiLead(email: string | undefined, phone: string | undefined, euros: number, eventId: string): void {
  const id = oaiEventId(eventId);
  if (!OAI_PIXEL_ID || typeof window === "undefined" || !id) return;
  const e = (email ?? "").trim().toLowerCase();
  const p = normalisePhone(phone).replace(/^\+/, "").replace(/^0+/, "");
  Promise.all([sha256Hex(e), sha256Hex(p)]).then(([he, hp]) => {
    const user: Record<string, string> = {};
    if (he) user.email_sha256 = he;
    if (hp) user.phone_number_sha256 = hp;
    if (he || hp) oai("init", { pixelId: OAI_PIXEL_ID, user });
    oai(
      "measure",
      "lead_created",
      { type: "customer_action", amount: Math.round(euros * 100), currency: "EUR" },
      { event_id: id },
    );
  });
}

/**
 * A paid Stripe checkout, as order_created, keyed on the Stripe session id:
 * the id the webhook's Conversions API copy sends, cut to the same length.
 */
export function oaiOrder(sessionId: string, amount: number, currency: string): void {
  const id = oaiEventId(sessionId);
  if (!OAI_PIXEL_ID || !id) return;
  oai(
    "measure",
    "order_created",
    { type: "contents", amount: Math.round(amount * 100), currency: currency.toUpperCase() },
    { event_id: id },
  );
}

/**
 * A tap on the phone number. A custom event rather than lead_created: a tap
 * is intent, not a call that connected, and counting it as a lead would teach
 * the bidding that it was one.
 */
export function oaiPhoneTap(eventId: string): void {
  if (!OAI_PIXEL_ID) return;
  oai("measure", "custom", { type: "custom" }, { custom_event_name: "phone_call_click", event_id: oaiEventId(eventId) });
}
