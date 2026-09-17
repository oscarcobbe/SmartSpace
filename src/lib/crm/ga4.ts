/**
 * GA4, read only, for whichever business this deployment is.
 *
 * The credential is a base64 service-account JSON in GA_SERVICE_ACCOUNT_JSON.
 * Worth writing down because JSON.parse on it fails with "Unexpected token 'e'"
 * and reads like a corrupt secret rather than an encoded one.
 *
 * The account holds analytics.edit on paper and is Viewer in practice: creating
 * or deleting a key event returns 403. Reporting is what it can do and
 * reporting is all this asks for.
 */
import { createSign } from "crypto";
import type { Site } from "./db";

export const GA4_PROPERTY: Record<Site, string> = {
  "smart-space": "534445467",
  smartcareliving: "535647893",
};

export interface Row {
  key: string[];
  values: number[];
}

export type Ga4Result<T> = { ok: true; data: T } | { ok: false; reason: string };

let cached: { value: string; until: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.value;
  const raw = process.env.GA_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GA_SERVICE_ACCOUNT_JSON is not set on this deployment.");

  const sa = JSON.parse(Buffer.from(raw.trim(), "base64").toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned =
    `${b64({ alg: "RS256", typ: "JWT" })}.` +
    b64({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    });
  const sig = createSign("RSA-SHA256").update(unsigned).end().sign(sa.private_key, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("Google refused the analytics credentials.");
  cached = { value: j.access_token, until: Date.now() + 50 * 60_000 };
  return j.access_token;
}

async function runReport(
  property: string,
  body: Record<string, unknown>,
): Promise<Row[]> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    },
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${text.slice(0, 200)}`);
  const j = JSON.parse(text);
  return (j.rows ?? []).map((r: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }) => ({
    key: (r.dimensionValues ?? []).map((d) => d.value),
    values: (r.metricValues ?? []).map((v) => Number(v.value) || 0),
  }));
}

export interface Insights {
  days: number;
  totals: { users: number; sessions: number; views: number; engaged: number; avgSeconds: number };
  /** Where they came from, biggest first. */
  sources: { label: string; users: number; sessions: number; engaged: number }[];
  /** Which pages they landed on. */
  landing: { path: string; sessions: number; engaged: number }[];
  /** What they did, from the event vocabulary shipped on both sites. */
  events: { name: string; count: number }[];
  devices: { label: string; sessions: number; engaged: number }[];
  counties: { label: string; sessions: number }[];
  /** Sessions per day, oldest first, for the chart. */
  daily: { date: string; sessions: number }[];
}

const dateKey = (raw: string) =>
  `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

export async function fetchInsights(site: Site, days = 28): Promise<Ga4Result<Insights>> {
  const property = GA4_PROPERTY[site];
  const range = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  try {
    /* Six reports in parallel. GA4 bills per request rather than per row, and
       one combined report with five dimensions would return a cross product
       nobody asked for. */
    const [totals, sources, landing, events, devices, counties, daily] = await Promise.all([
      runReport(property, {
        dateRanges: range,
        metrics: [
          { name: "totalUsers" }, { name: "sessions" }, { name: "screenPageViews" },
          { name: "engagedSessions" }, { name: "averageSessionDuration" },
        ],
      }),
      runReport(property, {
        dateRanges: range,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "totalUsers" }, { name: "sessions" }, { name: "engagedSessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
      runReport(property, {
        dateRanges: range,
        dimensions: [{ name: "landingPage" }],
        metrics: [{ name: "sessions" }, { name: "engagedSessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 12,
      }),
      runReport(property, {
        dateRanges: range,
        dimensions: [{ name: "eventName" }],
        metrics: [{ name: "eventCount" }],
        orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
        limit: 25,
      }),
      runReport(property, {
        dateRanges: range,
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }, { name: "engagedSessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      runReport(property, {
        dateRanges: range,
        dimensions: [{ name: "region" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 10,
      }),
      runReport(property, {
        dateRanges: range,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    ]);

    const t = totals[0]?.values ?? [0, 0, 0, 0, 0];

    return {
      ok: true,
      data: {
        days,
        totals: {
          users: t[0], sessions: t[1], views: t[2], engaged: t[3], avgSeconds: t[4],
        },
        sources: sources.map((r) => ({
          label: r.key[0] || "Unknown", users: r.values[0], sessions: r.values[1], engaged: r.values[2],
        })),
        landing: landing.map((r) => ({ path: r.key[0] || "/", sessions: r.values[0], engaged: r.values[1] })),
        events: events.map((r) => ({ name: r.key[0], count: r.values[0] })),
        devices: devices.map((r) => ({ label: r.key[0] || "Unknown", sessions: r.values[0], engaged: r.values[1] })),
        counties: counties.map((r) => ({ label: r.key[0] || "Unknown", sessions: r.values[0] })),
        daily: daily.map((r) => ({ date: dateKey(r.key[0]), sessions: r.values[0] })),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "GA4 could not be reached." };
  }
}

/** The events worth naming, from the vocabulary both sites ship. */
export const EVENT_LABEL: Record<string, string> = {
  page_view: "Page viewed",
  scroll_depth: "Scrolled down the page",
  time_on_page: "Stayed on a page",
  phone_click: "Tapped the phone number",
  email_click: "Tapped an email address",
  button_click: "Pressed a button",
  internal_click: "Followed a link on the site",
  outbound_click: "Left for another site",
  file_download: "Downloaded something",
  form_begin: "Started filling a form",
  form_complete: "Finished a form",
  form_abandon: "Gave up on a form",
  section_view: "Read a section",
  rage_click: "Clicked the same thing repeatedly",
  page_exit: "Left the page",
  user_engagement: "Was still there after ten seconds",
  session_start: "Arrived",
  first_visit: "First ever visit",
  guide_read: "Read a guide",
  quiz_complete: "Finished the quiz",
  book_consultation: "Booked a consultation",
  purchase: "Paid",
};
