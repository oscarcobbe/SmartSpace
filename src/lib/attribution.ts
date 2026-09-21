/**
 * Client-side attribution capture.
 *
 * On first visit (or anytime a gclid / utm param is on the URL), we store
 * a snapshot of marketing attribution data in localStorage for up to 90 days.
 * When the user eventually converts (contact form, consultation, purchase)
 * we attach the stored attribution to the lead record so the Google Sheet
 * shows which campaign / landing page drove each lead.
 */

const STORAGE_KEY = "ss_attribution";
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export interface Attribution {
  gclid?: string;
  landingPage?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** Unix ms when first captured */
  capturedAt: number;
  /** Unix ms when this record expires */
  expiresAt: number;
}

/**
 * Read URL params + document and store an attribution snapshot.
 * First-touch wins: if a prior attribution record is still valid and the
 * current URL has no gclid/utm (i.e. the user is just navigating around),
 * we don't overwrite it.
 * If the current URL DOES have a new gclid or utm, we treat that as a new
 * session and overwrite. This matches how most ad platforms prefer to
 * attribute, the most recent paid click wins.
 */
export function captureAttribution(): void {
  /* Promote anything parked on an earlier page of this visit first, so a
     visitor who accepted on page two keeps the click id from page one. */
  flushPendingAttribution();
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const gclid = params.get("gclid") ?? undefined;
  const utmSource = params.get("utm_source") ?? undefined;
  const utmMedium = params.get("utm_medium") ?? undefined;
  const utmCampaign = params.get("utm_campaign") ?? undefined;
  const utmContent = params.get("utm_content") ?? undefined;
  const utmTerm = params.get("utm_term") ?? undefined;

  const hasAdSignal = cameFromAnAd({ gclid, utmSource, utmCampaign });

  // Load existing record (if any) to preserve first-touch attribution when
  // the user is just bouncing around the site with no new ad signal.
  let existing: Attribution | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Attribution;
      if (Date.now() < parsed.expiresAt) existing = parsed;
    }
  } catch {
    // ignore corrupt storage
  }

  if (existing && !hasAdSignal) return; // keep first-touch

  const now = Date.now();
  const record: Attribution = {
    gclid,
    landingPage: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    capturedAt: now,
    expiresAt: now + TTL_MS,
  };

  /*
   * Written only once consent is in, not on page load.
   *
   * This wrote gclid, landing page, referrer and all five UTM values to
   * localStorage from GclitCapture, which the root layout mounts above
   * <CookieBanner />. So the identifiers were stored before the banner had
   * been answered, and /privacy said the opposite in terms: "by default we
   * collect no personal advertising or analytics data until you accept
   * cookies". The notice was right about the intention and wrong about the
   * code.
   *
   * Deferring outright would lose it: the gclid is in the URL of the landing
   * page and is gone by the time somebody answers two pages later. So the
   * record is held in memory for this page view and written when consent
   * arrives. Refuse, or ignore the banner, and nothing is stored.
   */
  writeWhenConsented(record);
}

const CONSENT_KEY = "ss_consent";
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * True if the visitor has already accepted, read the way the banner writes.
 *
 * This compared the raw stored string against "granted". CookieBanner stores
 * an object, {"decision":"granted","decidedAt":...}, so the comparison was
 * never true for anybody and consentGranted() returned false for every
 * visitor including those who had just pressed Accept. Every capture went
 * into the queue below instead of being written, and the queue lives on
 * window, so it died on the next full page load: an ad click on
 * /services?gclid=... followed by a hard navigation lost the click id, and
 * the record written on the second page had no gclid and an organic landing
 * page.
 *
 * Live since the consent gate went in on 6 September 2026. The last lead of
 * any kind carrying a click id is 4 September; sixteen since, none with one.
 *
 * Reads the same shape and honours the same twelve-month expiry as
 * CookieBanner's own loadStored, so the two cannot disagree again.
 */
function consentGranted(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { decision?: string; decidedAt?: number };
    if (parsed?.decision !== "granted") return false;
    return Date.now() - (parsed.decidedAt ?? 0) <= CONSENT_TTL_MS;
  } catch {
    return false;
  }
}

/** Where a record waits while the visitor has not yet decided. */
const PENDING_KEY = "ss_attribution_pending";

/**
 * Whether a record came from an ad, by the one definition.
 *
 * The durable write, the park and the flush each decided this for themselves
 * and one of them left out utmCampaign, which is the difference between
 * keeping a paid visit and discarding it.
 */
function cameFromAnAd(r: Partial<Attribution> | null | undefined): boolean {
  return Boolean(r && (r.gclid || r.utmSource || r.utmCampaign));
}

/**
 * Holds one attribution record until consent, then writes it.
 *
 * The queue is on window so CookieBanner can drain it without importing this
 * module, which would pull attribution capture into the banner's bundle. That
 * is fine for a visitor who accepts on the page they landed on and useless
 * for one who clicks through first, because window does not survive a full
 * page load and the click id only ever arrives on the landing URL.
 *
 * So the record is also parked in sessionStorage, which does survive
 * navigation within the tab and is discarded when the tab closes. Nothing is
 * written to the durable store until consent is given, which is the point of
 * the gate; this only stops the pending record evaporating between the ad
 * click and the Accept button.
 */
function writeWhenConsented(record: Attribution): void {
  const write = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      // ignore, not critical
    }
  };

  if (consentGranted()) {
    write();
    return;
  }

  try {
    /*
     * First touch wins in here too, and it did not.
     *
     * The durable write keeps the earliest record carrying an ad signal
     * ("if (existing && !hasAdSignal) return"). This park had no such guard,
     * so it was overwritten on every page view: a visitor who clicked an ad
     * and read one more page before answering the cookie banner had their
     * click id replaced by a record for whatever page they were on, and by
     * the time they accepted there was nothing left to promote. Google then
     * has no click to tie the sale to, and the sale never appears in the ad
     * account. That is most visitors, because most people do not answer the
     * banner on the page they land on.
     */
    const parked = sessionStorage.getItem(PENDING_KEY);
    /* Skip only the park write, never the queue registration below. Returning
       out of the whole function here meant the page the banner was actually
       answered on registered nothing, so accepting wrote nothing at all until
       the next page load. */
    const keepParked =
      parked !== null && !cameFromAnAd(record) && cameFromAnAd(JSON.parse(parked) as Attribution);
    if (!keepParked) sessionStorage.setItem(PENDING_KEY, JSON.stringify(record));
  } catch {
    // ignore, the window queue below still covers a same-page acceptance
  }

  const w = window as unknown as { __ssOnConsent?: (() => void)[] };
  w.__ssOnConsent = w.__ssOnConsent ?? [];
  /*
   * On acceptance, promote what was parked before writing this page's record.
   *
   * Without this the durable record only appeared on the next page load, so
   * somebody who accepted the banner and submitted the form without
   * navigating again had no attribution at that moment, which is the one
   * moment it is read. And the queued write is for the page the banner was
   * answered on, which is usually not the page the ad landed on, so it has to
   * give way to the parked record rather than replace it.
   */
  w.__ssOnConsent.push(() => {
    flushPendingAttribution();
    let existing: string | null = null;
    try { existing = localStorage.getItem(STORAGE_KEY); } catch { /* blocked */ }
    if (existing && !cameFromAnAd(record)) return;
    write();
  });
}

/**
 * Write anything parked on an earlier page of this visit.
 *
 * Called on every capture, so the record from the landing URL is promoted the
 * moment consent exists, whichever page the visitor happened to accept on.
 */
export function flushPendingAttribution(): void {
  if (typeof window === "undefined") return;
  if (!consentGranted()) return;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;

    /*
     * First touch holds, except against an ad click, which is the same rule
     * captureAttribution applies a few lines up: `if (existing &&
     * !hasAdSignal) return`.
     *
     * Getting this wrong is not theoretical. Tested against production on a
     * browser that already held an organic record from an earlier visit: a
     * fresh ad click parked correctly, and a version of this function that
     * refused to overwrite anything would have dropped it on acceptance,
     * which is the exact visitor the whole fix exists for.
     */
    const parked = JSON.parse(raw) as Attribution;
    /* utmCampaign was missing here, so a paid visit tagged with a campaign
       but no source was thrown away on acceptance. */
    const hasAdSignal = cameFromAnAd(parked);
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing || hasAdSignal) localStorage.setItem(STORAGE_KEY, raw);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore, not critical
  }
}

/** Retrieve the stored attribution record, or null if missing/expired. */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    /*
     * Last resort: promote the park before reading.
     *
     * The park is normally drained when the banner is accepted, or on the
     * next page load. Neither has happened if a visitor accepts before this
     * script has finished initialising and then converts on that same page
     * without navigating again. The record is sitting in sessionStorage the
     * whole time; this stops the one read that matters missing it.
     */
    if (!localStorage.getItem(STORAGE_KEY)) flushPendingAttribution();

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Convenience, just the gclid, for legacy call-sites */
export function getStoredGclid(): string | null {
  return getAttribution()?.gclid ?? null;
}

/**
 * Read the GA4 client id + session id from the first-party _ga cookies that
 * gtag.js sets once analytics consent is granted. Passing these to the
 * server-side purchase event lets GA4 stitch the sale to the visitor's real
 * session and marketing channel, instead of dumping the revenue in
 * (not set)/Unassigned. Returns undefined when no cookie exists (e.g. consent
 * not granted), in which case the server keeps its previous fallback.
 */
export function getGaIds(): { clientId?: string; sessionId?: string } {
  if (typeof document === "undefined") return {};
  const c = document.cookie || "";
  // _ga = GA1.1.<clientId>  where clientId is two dot-joined numbers.
  const ga = c.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/);
  // _ga_<streamId> session cookie. GS2 prefixes the session id with 's' and
  // uses $-delimited fields (GS2.1.s<sessionId>$o1$...); GS1 used a plain
  // number (GS1.1.<sessionId>.<...>). Allow both with an optional 's'.
  const ses = c.match(/(?:^|;\s*)_ga_[A-Z0-9]+=GS\d+\.\d+\.s?(\d+)/);
  return { clientId: ga ? ga[1] : undefined, sessionId: ses ? ses[1] : undefined };
}
