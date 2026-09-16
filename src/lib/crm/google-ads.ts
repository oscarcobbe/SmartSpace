/**
 * Google Ads, read only.
 *
 * Deliberately has no mutate. The CRM is a place Nigel looks at numbers, and a
 * client that can change a bid is a client that can change a bid by accident.
 * Everything that writes to Google lives in the FourWinds portal, behind its
 * own dry-run-then-apply path.
 *
 * Two API details that have already cost time and are worth stating once: the
 * literals DURING ALL_TIME and LAST_90_DAYS do not exist in v25, so every range
 * here is an explicit BETWEEN; and micros are millionths, not hundredths, so
 * cost_micros / 1e6 is euro.
 */

const VERSION = "v25";

export const ADS_ACCOUNT: Record<"smart-space" | "smartcareliving", string> = {
  "smart-space": "9994041488",
  smartcareliving: "9060218843",
};

export interface MonthSpend {
  key: string;
  label: string;
  cost: number;
  conversions: number;
  value: number;
  clicks: number;
  impressions: number;
}

export interface CampaignRow {
  name: string;
  status: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
}

export interface AdsData {
  months: MonthSpend[];
  campaigns: CampaignRow[];
  window: { from: string; to: string };
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
}

export type AdsResult = { ok: true; data: AdsData } | { ok: false; reason: string };

let cachedToken: { value: string; until: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.until > Date.now()) return cachedToken.value;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json();
  if (!body.access_token) throw new Error("Google refused the stored credentials.");
  /* Google issues these for an hour. Keep it for fifty minutes so a render
     near the boundary refreshes rather than failing on an expired token. */
  cachedToken = { value: body.access_token, until: Date.now() + 50 * 60_000 };
  return body.access_token;
}

/** Only the fields these queries ask for. Google returns camelCase over REST. */
interface AdsRow {
  segments?: { month?: string };
  campaign?: { name?: string; status?: string };
  metrics?: {
    costMicros?: string | number;
    clicks?: string | number;
    impressions?: string | number;
    conversions?: string | number;
    conversionsValue?: string | number;
  };
}

async function search(customerId: string, gaql: string): Promise<AdsRow[]> {
  const dev = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!dev) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is not set on this deployment.");
  const res = await fetch(`https://googleads.googleapis.com/${VERSION}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "developer-token": dev,
      "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: gaql }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google Ads ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text).results ?? [];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${String(y).slice(2)}`;
};

const num = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0);

export async function fetchAds(site: "smart-space" | "smartcareliving", monthsBack = 12): Promise<AdsResult> {
  const customerId = ADS_ACCOUNT[site];
  try {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));
    const range = `segments.date BETWEEN '${iso(from)}' AND '${iso(now)}'`;

    const [byMonth, byCampaign] = await Promise.all([
      search(
        customerId,
        `SELECT segments.month, metrics.cost_micros, metrics.clicks, metrics.impressions,
                metrics.conversions, metrics.conversions_value
         FROM campaign WHERE ${range}`,
      ),
      search(
        customerId,
        `SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks,
                metrics.impressions, metrics.conversions, metrics.conversions_value
         FROM campaign WHERE ${range}`,
      ),
    ]);

    const buckets = new Map<string, MonthSpend>();
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1 - i), 1));
      const key = iso(d).slice(0, 7);
      buckets.set(key, { key, label: monthLabel(key), cost: 0, conversions: 0, value: 0, clicks: 0, impressions: 0 });
    }
    for (const r of byMonth) {
      /* segments.month comes back as a full date on the first of the month. */
      const key = String(r.segments?.month ?? "").slice(0, 7);
      const b = buckets.get(key);
      if (!b) continue;
      b.cost += num(r.metrics?.costMicros) / 1e6;
      b.clicks += num(r.metrics?.clicks);
      b.impressions += num(r.metrics?.impressions);
      b.conversions += num(r.metrics?.conversions);
      b.value += num(r.metrics?.conversionsValue);
    }

    const rolled = new Map<string, CampaignRow>();
    for (const r of byCampaign) {
      const name = String(r.campaign?.name ?? "Unnamed");
      const row = rolled.get(name) ?? {
        name, status: String(r.campaign?.status ?? ""), cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0,
      };
      row.cost += num(r.metrics?.costMicros) / 1e6;
      row.clicks += num(r.metrics?.clicks);
      row.impressions += num(r.metrics?.impressions);
      row.conversions += num(r.metrics?.conversions);
      row.value += num(r.metrics?.conversionsValue);
      rolled.set(name, row);
    }

    const months = Array.from(buckets.values());
    const sum = (f: (m: MonthSpend) => number) => months.reduce((s, m) => s + f(m), 0);

    return {
      ok: true,
      data: {
        months,
        campaigns: Array.from(rolled.values()).sort((a, b) => b.cost - a.cost),
        window: { from: iso(from), to: iso(now) },
        cost: sum((m) => m.cost),
        clicks: sum((m) => m.clicks),
        impressions: sum((m) => m.impressions),
        conversions: sum((m) => m.conversions),
        value: sum((m) => m.value),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Google Ads could not be reached." };
  }
}
