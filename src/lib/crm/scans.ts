/**
 * QR scans, read back.
 *
 * Kept out of Orders on purpose. A scan is somebody pointing a phone at a van
 * at a traffic light, not an enquiry, and putting the two in one list makes
 * both numbers useless.
 */
import { crm, crmConfigured, type Site } from "./db";

export interface ScanRow {
  id: string;
  code: string;
  placement: string | null;
  device: string | null;
  scanned_at: string;
}

export interface ScanSummary {
  total: number;
  last7: number;
  byCode: { code: string; count: number; last: string }[];
  byDevice: { device: string; count: number }[];
  daily: { date: string; count: number }[];
  recent: ScanRow[];
}

const CODE_LABEL: Record<string, string> = {
  van: "The van",
  "business-card:review": "Review cards",
  "business-card:install": "Installer cards",
};

export const scanLabel = (code: string) => CODE_LABEL[code] ?? code;

/** Null when there is nothing to show; a problem when the read failed. */
export async function fetchScans(site: Site, days = 90): Promise<ScanSummary | null | { problem: string }> {
  if (!crmConfigured()) return null;

  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  let rows: ScanRow[] | null;
  try {
    rows = await crm<ScanRow[]>(
      `crm_scans?site=eq.${site}&scanned_at=gte.${since}` +
        `&select=id,code,placement,device,scanned_at&order=scanned_at.desc&limit=2000`,
    );
  } catch (err) {
    return { problem: `Scans of the printed codes could not be read (${err instanceof Error ? err.message.slice(0, 100) : "no answer"}).` };
  }
  if (!rows) return null;

  const weekAgo = Date.now() - 7 * 86_400_000;
  const byCode = new Map<string, { count: number; last: string }>();
  const byDevice = new Map<string, number>();
  const daily = new Map<string, number>();

  for (const r of rows) {
    const c = byCode.get(r.code) ?? { count: 0, last: r.scanned_at };
    c.count++;
    /* Rows arrive newest first, so the first one seen for a code is its most
       recent scan and later ones must not overwrite it. */
    byCode.set(r.code, c);
    byDevice.set(r.device ?? "unknown", (byDevice.get(r.device ?? "unknown") ?? 0) + 1);
    const day = r.scanned_at.slice(0, 10);
    daily.set(day, (daily.get(day) ?? 0) + 1);
  }

  return {
    total: rows.length,
    last7: rows.filter((r) => Date.parse(r.scanned_at) >= weekAgo).length,
    byCode: Array.from(byCode.entries())
      .map(([code, v]) => ({ code, count: v.count, last: v.last }))
      .sort((a, b) => b.count - a.count),
    byDevice: Array.from(byDevice.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count),
    daily: Array.from(daily.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    recent: rows.slice(0, 20),
  };
}
