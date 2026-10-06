/**
 * Which Pi is calling, from its key.
 *
 * Returns null for anything that is not a live key, and while the CRM is not
 * set up, so the routes can answer a plain 404 without saying why.
 */
import { crmConfigured } from "@/lib/crm/db";
import { piByKey, type Pi } from "./store";

export async function authorisedPi(req: Request): Promise<Pi | null> {
  if (!crmConfigured()) return null;
  const key = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!key) return null;
  try {
    return await piByKey(key);
  } catch {
    return null;
  }
}
