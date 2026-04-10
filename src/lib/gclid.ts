const GCLID_KEY = "ss_gclid";
const GCLID_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days in ms

interface StoredGclid {
  value: string;
  expires: number;
}

export function captureGclid(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const gclid = params.get("gclid");
  if (!gclid) return;
  const entry: StoredGclid = { value: gclid, expires: Date.now() + GCLID_TTL };
  try {
    localStorage.setItem(GCLID_KEY, JSON.stringify(entry));
  } catch {}
}

export function getStoredGclid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GCLID_KEY);
    if (!raw) return null;
    const entry: StoredGclid = JSON.parse(raw);
    if (Date.now() > entry.expires) {
      localStorage.removeItem(GCLID_KEY);
      return null;
    }
    return entry.value;
  } catch {
    return null;
  }
}
