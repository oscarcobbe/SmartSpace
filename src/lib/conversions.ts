/**
 * Server-side conversion tracking utility.
 *
 * Sends conversion data to Zapier Tables, which a Zapier Zap then
 * uploads to Google Ads as offline conversions via GCLID.
 *
 * Conversion names (must match actions created in Google Ads):
 *   - "Installer Lead"   – Typeform/contact form from Installer campaign (€10)
 *   - "Installer Purchase" – Shopify purchase from Installer campaign (actual value)
 *   - "Specialist Lead"  – Typeform/contact form from Specialist campaign (€10)
 *   - "Specialist Payment" – Stripe payment link from Specialist campaign (actual value)
 */

export interface ConversionRecord {
  gclid: string;
  email?: string;
  conversion_name: string;
  conversion_value?: number;
  conversion_time: string;
  transaction_id?: string;
  currency?: string;
}

/** Upload a conversion record to Zapier Tables */
export async function uploadConversion(record: ConversionRecord): Promise<void> {
  const tablesId = process.env.ZAPIER_TABLES_ID;
  const tablesSecret = process.env.ZAPIER_TABLES_SECRET;
  if (!tablesId || !tablesSecret || !record.gclid) return;

  try {
    await fetch(`https://tables.zapier.com/api/v1/tables/${tablesId}/records/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tablesSecret}`,
      },
      body: JSON.stringify({ data: record }),
    });
  } catch (err) {
    console.error("[conversions] Failed to upload to Zapier Tables:", err);
  }
}

/**
 * Look up the most recent GCLID associated with a given email address
 * by searching the last 100 records in Zapier Tables.
 */
export async function lookupGclidByEmail(email: string): Promise<string | null> {
  const tablesId = process.env.ZAPIER_TABLES_ID;
  const tablesSecret = process.env.ZAPIER_TABLES_SECRET;
  if (!tablesId || !tablesSecret || !email) return null;

  try {
    const res = await fetch(
      `https://tables.zapier.com/api/v1/tables/${tablesId}/records/?limit=100&ordering=-created_at`,
      {
        headers: { Authorization: `Bearer ${tablesSecret}` },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    // Zapier Tables returns { results: [...] } or { data: [...] }
    const records: Array<{ data: Record<string, string> }> =
      json.results ?? json.data ?? [];
    const match = records.find(
      (r) => r.data?.email?.toLowerCase() === email.toLowerCase() && r.data?.gclid
    );
    return match?.data?.gclid ?? null;
  } catch {
    return null;
  }
}
