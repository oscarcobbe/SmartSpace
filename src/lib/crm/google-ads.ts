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

export type AdSite = "smart-space" | "smartcareliving";

export const ADS_ACCOUNT: Record<AdSite, string> = {
  "smart-space": "9994041488",
  smartcareliving: "9060218843",
};

/**
 * Campaigns that sit on one business's account but spent the other business's
 * money. There is one: SmartCare Living was first run from the Smart Space
 * account in March before it got its own, and its €926 is still on that
 * account's history. Reported as Smart Space, it pushed Smart Space's return on
 * spend down by about a fifth for work it never won.
 *
 * Verified against the API on 16 September 2026 rather than guessed. The id is
 * what identifies it, because a campaign can be renamed; the name pattern is a
 * second net so a new cross-business campaign is caught rather than quietly
 * counted, and it only ever has to be right about the word.
 */
const FOREIGN_CAMPAIGN_IDS: Record<AdSite, string[]> = {
  "smart-space": ["23688259814"],
  smartcareliving: [],
};

const FOREIGN_NAME: Record<AdSite, RegExp> = {
  "smart-space": /smart\s*care\s*living/i,
  smartcareliving: /smart\s*space/i,
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
  id: string;
  name: string;
  status: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
  /** True when this campaign belongs to the other business. */
  foreign: boolean;
}

interface Cell {
  month: string;
  campaignId: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
}

export interface AdsData {
  months: MonthSpend[];
  campaigns: CampaignRow[];
  /** Kept so a split can rebuild the months for either side. */
  cells: Cell[];
  monthKeys: string[];
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
  campaign?: { id?: string | number; name?: string; status?: string };
  metrics?: {
    costMicros?: string | number;
    clicks?: string | number;
    impressions?: string | number;
    conversions?: string | number;
    conversionsValue?: string | number;
  };
}

export async function search(customerId: string, gaql: string): Promise<AdsRow[]> {
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

export const iso = (d: Date) => d.toISOString().slice(0, 10);

const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]} ${String(y).slice(2)}`;
};

export const num = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? 0)) || 0);

export const isForeign = (site: AdSite, id: string, name: string) =>
  FOREIGN_CAMPAIGN_IDS[site].includes(id) || FOREIGN_NAME[site].test(name);

function buildMonths(cells: Cell[], monthKeys: string[], keep: (campaignId: string) => boolean): MonthSpend[] {
  const buckets = new Map<string, MonthSpend>(
    monthKeys.map((key) => [key, { key, label: monthLabel(key), cost: 0, conversions: 0, value: 0, clicks: 0, impressions: 0 }]),
  );
  for (const c of cells) {
    if (!keep(c.campaignId)) continue;
    const b = buckets.get(c.month);
    if (!b) continue;
    b.cost += c.cost;
    b.clicks += c.clicks;
    b.impressions += c.impressions;
    b.conversions += c.conversions;
    b.value += c.value;
  }
  return Array.from(buckets.values());
}

function totals(months: MonthSpend[]) {
  const sum = (f: (m: MonthSpend) => number) => months.reduce((s, m) => s + f(m), 0);
  return {
    cost: sum((m) => m.cost),
    clicks: sum((m) => m.clicks),
    impressions: sum((m) => m.impressions),
    conversions: sum((m) => m.conversions),
    value: sum((m) => m.value),
  };
}

export async function fetchAds(site: AdSite, monthsBack = 12): Promise<AdsResult> {
  const customerId = ADS_ACCOUNT[site];
  try {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));

    /* One query, segmented by month and by campaign, because the page needs
       both roll-ups and the split between the two businesses needs the cells. */
    const rows = await search(
      customerId,
      `SELECT segments.month, campaign.id, campaign.name, campaign.status,
              metrics.cost_micros, metrics.clicks, metrics.impressions,
              metrics.conversions, metrics.conversions_value
       FROM campaign
       WHERE segments.date BETWEEN '${iso(from)}' AND '${iso(now)}'`,
    );

    const monthKeys: string[] = [];
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1 - i), 1));
      monthKeys.push(iso(d).slice(0, 7));
    }

    const cells: Cell[] = [];
    const campaigns = new Map<string, CampaignRow>();

    for (const r of rows) {
      const id = String(r.campaign?.id ?? "");
      const name = String(r.campaign?.name ?? "Unnamed");
      /* segments.month comes back as a full date on the first of the month. */
      const month = String(r.segments?.month ?? "").slice(0, 7);
      const cell: Cell = {
        month, campaignId: id,
        cost: num(r.metrics?.costMicros) / 1e6,
        clicks: num(r.metrics?.clicks),
        impressions: num(r.metrics?.impressions),
        conversions: num(r.metrics?.conversions),
        value: num(r.metrics?.conversionsValue),
      };
      cells.push(cell);

      const row = campaigns.get(id) ?? {
        id, name, status: String(r.campaign?.status ?? ""),
        cost: 0, clicks: 0, impressions: 0, conversions: 0, value: 0,
        foreign: isForeign(site, id, name),
      };
      row.cost += cell.cost;
      row.clicks += cell.clicks;
      row.impressions += cell.impressions;
      row.conversions += cell.conversions;
      row.value += cell.value;
      campaigns.set(id, row);
    }

    const months = buildMonths(cells, monthKeys, () => true);

    return {
      ok: true,
      data: {
        months,
        campaigns: Array.from(campaigns.values()).sort((a, b) => b.cost - a.cost),
        cells,
        monthKeys,
        window: { from: iso(from), to: iso(now) },
        ...totals(months),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Google Ads could not be reached." };
  }
}

export interface AdsSplit {
  /** This business's own campaigns, which is what the headline figures use. */
  own: AdsData;
  /** The other business's campaigns sitting on this account, or null. */
  other: AdsData | null;
}

/**
 * Separate the business from the account.
 *
 * Takes no site argument: which campaigns are foreign was decided in fetchAds,
 * where the account being queried is known, and re-deciding it here would be a
 * second rule to keep in step with the first.
 *
 * The totals on the account are real spend and are still available, but they
 * are not this business's performance, and a page that leads with them answers
 * a question nobody asked.
 */
export function adsSplit(data: AdsData): AdsSplit {
  const foreignIds = new Set(data.campaigns.filter((c) => c.foreign).map((c) => c.id));

  const ownMonths = buildMonths(data.cells, data.monthKeys, (id) => !foreignIds.has(id));
  const own: AdsData = {
    ...data,
    months: ownMonths,
    campaigns: data.campaigns.filter((c) => !c.foreign),
    ...totals(ownMonths),
  };

  if (foreignIds.size === 0) return { own, other: null };

  const otherMonths = buildMonths(data.cells, data.monthKeys, (id) => foreignIds.has(id));
  const other: AdsData = {
    ...data,
    months: otherMonths,
    campaigns: data.campaigns.filter((c) => c.foreign),
    ...totals(otherMonths),
  };
  return { own, other };
}

/* ─── What was changed in the account, and when ───────────────── */

export interface AccountChange {
  /** ISO-ish, as Google returns it. */
  at: string;
  resource: string;
  operation: string;
  campaign: string | null;
}

export type ChangesResult = { ok: true; data: AccountChange[] } | { ok: false; reason: string };

/**
 * The account's own change log.
 *
 * ── WHY THIS IS HERE ─────────────────────────────────────────────
 *
 * The marketing findings used to say "whatever changed is working" when cost
 * per enquiry improved. That is a shrug standing in for the answer, and the
 * answer was available the whole time: Google keeps every edit, who made it
 * and when. A report that notices an improvement and cannot say what caused it
 * is not worth reading twice.
 *
 * Google only retains thirty days here, and rejects a window wider than that,
 * so this asks for fourteen: enough to cover the fortnight a change is usually
 * judged over, and well inside what the API will answer.
 */
export async function fetchChanges(site: AdSite, days = 14): Promise<ChangesResult> {
  const customerId = ADS_ACCOUNT[site];
  if (!customerId) return { ok: false, reason: "No Google Ads account is mapped to this site." };
  try {
    const rows = await search(
      customerId,
      `SELECT change_event.change_date_time, change_event.change_resource_type,
              change_event.resource_change_operation, campaign.name
         FROM change_event
        WHERE change_event.change_date_time DURING LAST_${days === 30 ? 30 : 14}_DAYS
        ORDER BY change_event.change_date_time DESC
        LIMIT 500`,
    );
    return {
      ok: true,
      data: rows.map((r) => {
        const c = (r as Record<string, Record<string, unknown>>).changeEvent ?? {};
        const camp = (r as Record<string, Record<string, unknown>>).campaign ?? {};
        return {
          at: String(c.changeDateTime ?? ""),
          resource: String(c.changeResourceType ?? ""),
          operation: String(c.resourceChangeOperation ?? ""),
          campaign: camp.name ? String(camp.name) : null,
        };
      }),
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Change history could not be read." };
  }
}

/** Plain English for one kind of edit, singular and plural. */
const CHANGE_WORD: Record<string, [string, string]> = {
  "CREATE|CAMPAIGN_CRITERION": ["negative keyword or target added", "negative keywords or targets added"],
  "REMOVE|CAMPAIGN_CRITERION": ["negative keyword or target removed", "negative keywords or targets removed"],
  "CREATE|AD_GROUP_CRITERION": ["keyword added", "keywords added"],
  "REMOVE|AD_GROUP_CRITERION": ["keyword removed", "keywords removed"],
  "UPDATE|AD_GROUP_CRITERION": ["keyword changed", "keywords changed"],
  "CREATE|AD_GROUP_AD": ["ad added", "ads added"],
  "UPDATE|AD": ["ad edited", "ads edited"],
  "UPDATE|AD_GROUP": ["ad group changed", "ad groups changed"],
  "CREATE|AD_GROUP": ["ad group added", "ad groups added"],
  "UPDATE|CAMPAIGN": ["campaign setting changed", "campaign settings changed"],
  "UPDATE|CAMPAIGN_BUDGET": ["budget changed", "budget changes"],
  "CREATE|CAMPAIGN_ASSET": ["sitelink or callout added", "sitelinks or callouts added"],
  "REMOVE|CAMPAIGN_ASSET": ["sitelink or callout removed", "sitelinks or callouts removed"],
};

/**
 * The edits, counted and worded, commonest first.
 *
 * Counted rather than listed one by one: thirty-nine separate rows saying
 * "negative keyword added" is a log, and nobody reads a log. "39 negative
 * keywords added" is the same fact in a form somebody takes in at a glance.
 */
export function summariseChanges(changes: AccountChange[]): string[] {
  const counts = new Map<string, number>();
  for (const c of changes) {
    const key = `${c.operation}|${c.resource}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const entries: [string, number][] = [];
  counts.forEach((n, key) => entries.push([key, n]));
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => {
      const words = CHANGE_WORD[key];
      if (!words) {
        /* An edit type we have no phrase for is still reported, in Google's
           own words, rather than dropped. Silence here would understate the
           work done in exactly the month somebody asks what we did. */
        const [op, res] = key.split("|");
        return `${n} ${res.toLowerCase().replace(/_/g, " ")} ${op.toLowerCase()}${n === 1 ? "" : "s"}`;
      }
      return `${n} ${n === 1 ? words[0] : words[1]}`;
    });
}
