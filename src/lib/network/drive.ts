/**
 * The customer's folder in Google Drive, made and filled from the portal.
 *
 * ── WHY THE SERVICE ACCOUNT WORKS AS ITSELF ─────────────────────────
 *
 * The booking calendar signs in as Nigel through domain-wide delegation: the
 * bookings service account may act as any smart-space.ie user, for calendar
 * scopes only. Adding Drive to that delegation would let it read, change or
 * delete every file in every smart-space.ie user's Drive. So this does not use
 * delegation at all. The same service account is shared on the one folder it
 * needs, SmartSpace Networks, as an Editor (Content manager), and calls Drive
 * as itself. Drive then lets it see that folder and nothing else, and the
 * calendar's delegation is never touched.
 *
 * It signs in the way the calendar does (src/lib/booking/google-calendar.ts),
 * copied rather than shared so nothing here can change how bookings sign in:
 * on Vercel, without a key file, by exchanging the deployment's OIDC token
 * for a Google token and asking for one with the Drive scope; with
 * GOOGLE_BOOKING_SA_KEY, by signing a JWT with no subject.
 *
 * Everything is created, never overwritten in place, except the three log
 * files, which are replaced with a new version (Drive keeps the old one in
 * the file's history) because the portal holds every copy anyway.
 *
 * The folder layout is Nigel's newclient.sh exactly: Customers/<date> <name>
 * with Data, Photos and Report inside, plus a copy of the capture sheet
 * template named "<name> capture sheet".
 */
import { createSign } from "crypto";
import type { DriveRefs } from "./store";

/* Under next dev only, NETWORK_DRIVE_DEV_BASE points these at a stand-in, so
   the folder and filing steps can be run on a laptop. Never read in production. */
const DEV_BASE = process.env.NODE_ENV !== "production" ? process.env.NETWORK_DRIVE_DEV_BASE?.trim() || "" : "";
const API = DEV_BASE ? `${DEV_BASE}/drive/v3` : "https://www.googleapis.com/drive/v3";
const UPLOAD = DEV_BASE ? `${DEV_BASE}/upload/drive/v3` : "https://www.googleapis.com/upload/drive/v3";
const SCOPE = "https://www.googleapis.com/auth/drive";
const FOLDER = "application/vnd.google-apps.folder";
const DOC = "application/vnd.google-apps.document";

export class DriveError extends Error {}

interface ServiceAccountKey { client_email: string; private_key: string; token_uri?: string }

function readKey(): ServiceAccountKey | null {
  const raw = process.env.GOOGLE_BOOKING_SA_KEY;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const key = JSON.parse(text) as ServiceAccountKey;
    return key.client_email && key.private_key ? key : null;
  } catch {
    return null;
  }
}

const saEmail = () => process.env.GOOGLE_BOOKING_SA_EMAIL?.trim() || readKey()?.client_email || "";
const wifProvider = () => process.env.GOOGLE_WIF_PROVIDER?.trim() || "";
/* For trying the Drive half on a laptop with a person's own token (gcloud).
   Never read in production. */
const devToken = () => (process.env.NODE_ENV !== "production" ? process.env.NETWORK_DRIVE_DEV_TOKEN?.trim() || "" : "");

export function driveConfigured(): boolean {
  return !!devToken() || !!readKey() || (!!saEmail() && (!!wifProvider() || !!process.env.GOOGLE_SOURCE_ACCESS_TOKEN));
}

/** The address to share SmartSpace Networks with. */
export function driveAccount(): string {
  return saEmail();
}

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

async function postJson<T>(url: string, body: unknown, bearer?: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new DriveError(`Google sign-in answered ${res.status}: ${(await res.text().catch(() => "")).slice(0, 240)}`);
  return (await res.json()) as T;
}

let cached: { token: string; exp: number } | null = null;

async function token(): Promise<string> {
  const dev = devToken();
  if (dev) return dev;
  if (cached && cached.exp - 60_000 > Date.now()) return cached.token;
  const key = readKey();
  if (key) {
    const now = Math.floor(Date.now() / 1000);
    const aud = key.token_uri || "https://oauth2.googleapis.com/token";
    const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = b64url(JSON.stringify({ iss: key.client_email, scope: SCOPE, aud, iat: now, exp: now + 3600 }));
    const signer = createSign("RSA-SHA256");
    signer.update(`${head}.${claims}`);
    const assertion = `${head}.${claims}.${b64url(signer.sign(key.private_key))}`;
    const res = await fetch(aud, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new DriveError(`Google sign-in answered ${res.status}: ${(await res.text().catch(() => "")).slice(0, 240)}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    cached = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
    return data.access_token;
  }
  if (!saEmail()) throw new DriveError("Google Drive is not set up on this deployment.");
  /* The calendar's keyless route: Vercel's OIDC token, exchanged for a token
     allowed to act for the service account, which then asks Google for an
     access token with the Drive scope. No subject: the account is itself. */
  let federated = process.env.GOOGLE_SOURCE_ACCESS_TOKEN?.trim() || "";
  if (!federated) {
    const { getVercelOidcToken } = await import("@vercel/functions/oidc");
    const oidc = await getVercelOidcToken();
    const sts = await postJson<{ access_token: string }>("https://sts.googleapis.com/v1/token", {
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: `//iam.googleapis.com/${wifProvider()}`,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token: oidc,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    });
    federated = sts.access_token;
  }
  const sa = await postJson<{ accessToken: string; expireTime: string }>(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(saEmail())}:generateAccessToken`,
    { scope: [SCOPE], lifetime: "3600s" },
    federated,
  );
  cached = { token: sa.accessToken, exp: Date.parse(sa.expireTime) || Date.now() + 3_000_000 };
  return sa.accessToken;
}

/** Google's answer, turned into a sentence Nigel can act on. */
function explain(status: number, text: string): string {
  if (/has not been used in project|is disabled/i.test(text)) {
    return "The Google Drive API is switched off for the bookings service account's Google Cloud project. Switch it on in the Cloud console (APIs and services, Google Drive API).";
  }
  if (status === 404) {
    return `Drive could not find that folder. Share SmartSpace Networks with ${saEmail() || "the bookings service account"} as an Editor.`;
  }
  if (status === 403) {
    return `Drive refused (${text.slice(0, 160)}). Check SmartSpace Networks is shared with ${saEmail() || "the bookings service account"} as an Editor.`;
  }
  return `Drive answered ${status}: ${text.slice(0, 200)}`;
}

async function drive<T>(method: string, path: string, opts: { query?: Record<string, string>; body?: BodyInit; json?: unknown; headers?: Record<string, string>; base?: string } = {}): Promise<T> {
  const url = new URL(`${opts.base ?? API}${path}`);
  url.searchParams.set("supportsAllDrives", "true");
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await token()}`,
      ...(opts.json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.body,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401) cached = null;
  if (!res.ok) throw new DriveError(explain(res.status, await res.text().catch(() => "")));
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export interface DriveFile { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string }

/** A Drive query string, with the value's quotes and backslashes escaped. */
const lit = (v: string) => `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

async function search(q: string, fields = "files(id,name,mimeType,modifiedTime,webViewLink)"): Promise<DriveFile[]> {
  const out = await drive<{ files: DriveFile[] }>("GET", "/files", {
    query: { q, fields, corpora: "allDrives", includeItemsFromAllDrives: "true", pageSize: "100", orderBy: "modifiedTime desc" },
  });
  return out.files ?? [];
}

/** SmartSpace Networks: NETWORK_DRIVE_FOLDER_ID if set, otherwise the only folder of that name the account can see. */
export async function networksFolder(): Promise<DriveFile> {
  const id = process.env.NETWORK_DRIVE_FOLDER_ID?.trim();
  if (id) return drive<DriveFile>("GET", `/files/${encodeURIComponent(id)}`, { query: { fields: "id,name,mimeType,webViewLink" } });
  const found = await search(`name = 'SmartSpace Networks' and mimeType = '${FOLDER}' and trashed = false`);
  if (!found.length) {
    throw new DriveError(`The SmartSpace Networks folder is not shared with ${saEmail() || "the bookings service account"}. Share it as an Editor and try again.`);
  }
  return found[0];
}

async function child(parentId: string, name: string, mime?: string): Promise<DriveFile | null> {
  const found = await search(`${lit(parentId)} in parents and name = ${lit(name)} and trashed = false${mime ? ` and mimeType = '${mime}'` : ""}`);
  return found[0] ?? null;
}

async function ensureFolder(parentId: string, name: string): Promise<{ file: DriveFile; made: boolean }> {
  const found = await child(parentId, name, FOLDER);
  if (found) return { file: found, made: false };
  const file = await drive<DriveFile>("POST", "/files", {
    query: { fields: "id,name,mimeType,webViewLink" },
    json: { name, mimeType: FOLDER, parents: [parentId] },
  });
  return { file, made: true };
}

export interface FolderResult {
  refs: DriveRefs;
  made: boolean;
  /** The capture sheet template copied, so Nigel can see which version it was. */
  template: { id: string; name: string; modifiedTime?: string } | null;
}

/** "Customers/2026-10-14 Mary Fitzgerald" with Data, Photos, Report and the capture sheet. Safe to run twice. */
export async function makeCustomerFolder(date: string, customerName: string): Promise<FolderResult> {
  const name = `${date} ${customerName}`.replace(/[\\/]/g, "-").replace(/\s+/g, " ").trim();
  const root = await networksFolder();
  const customers = await ensureFolder(root.id, "Customers");
  const folder = await ensureFolder(customers.file.id, name);
  const [data, photos, report] = await Promise.all(
    ["Data", "Photos", "Report"].map((n) => ensureFolder(folder.file.id, n)),
  );

  const sheetName = `${customerName} capture sheet`;
  let sheet = await child(folder.file.id, sheetName, DOC);
  let template: FolderResult["template"] = null;
  if (!sheet) {
    const templates = await child(root.id, "Templates", FOLDER);
    const candidates = templates
      ? (await search(`${lit(templates.id)} in parents and mimeType = '${DOC}' and trashed = false and name contains 'Capture Sheet'`))
      : [];
    const pick = candidates.sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""))[0];
    if (pick) {
      template = { id: pick.id, name: pick.name, modifiedTime: pick.modifiedTime };
      sheet = await drive<DriveFile>("POST", `/files/${encodeURIComponent(pick.id)}/copy`, {
        query: { fields: "id,name,mimeType,webViewLink" },
        json: { name: sheetName, parents: [folder.file.id] },
      });
    }
  }
  return {
    refs: {
      folderId: folder.file.id,
      folderName: name,
      dataId: data.file.id,
      photosId: photos.file.id,
      reportId: report.file.id,
      sheetId: sheet?.id,
      madeAt: new Date().toISOString(),
    },
    made: folder.made,
    template,
  };
}

/**
 * Put a file in a folder. With `replace`, a file of the same name there gets
 * this as its new version instead of a second copy beside it.
 */
export async function putFile(parentId: string, name: string, mimeType: string, content: string | Buffer, replace = false): Promise<DriveFile> {
  const existing = replace ? await child(parentId, name) : null;
  const boundary = `ss${Math.random().toString(36).slice(2)}`;
  const meta = existing ? { name } : { name, parents: [parentId] };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8"),
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  return drive<DriveFile>(existing ? "PATCH" : "POST", existing ? `/files/${encodeURIComponent(existing.id)}` : "/files", {
    base: UPLOAD,
    query: { uploadType: "multipart", fields: "id,name,mimeType,webViewLink" },
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
}

export const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
export const fileUrl = (id: string) => `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
export const docUrl = (id: string) => `https://docs.google.com/document/d/${encodeURIComponent(id)}/edit`;
