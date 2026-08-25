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
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const gclid = params.get("gclid") ?? undefined;
  const utmSource = params.get("utm_source") ?? undefined;
  const utmMedium = params.get("utm_medium") ?? undefined;
  const utmCampaign = params.get("utm_campaign") ?? undefined;
  const utmContent = params.get("utm_content") ?? undefined;
  const utmTerm = params.get("utm_term") ?? undefined;

  const hasAdSignal = !!(gclid || utmSource || utmCampaign);

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

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore, not critical
  }
}

/** Retrieve the stored attribution record, or null if missing/expired. */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
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
