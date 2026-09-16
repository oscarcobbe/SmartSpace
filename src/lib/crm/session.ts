/**
 * Reading the session on the server.
 *
 * Kept apart from auth.ts because auth.ts is imported by the API routes, which
 * must not pull next/headers into their own module graph, and because every
 * page in /crm needs exactly these two calls and nothing else.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, readSessionCookie } from "./auth";
import type { Site } from "./db";

export type Session = { email: string; site: Site };

export function currentSession(): Session | null {
  /* readSessionCookie throws if CRM_SESSION_SECRET is missing. On a deployment
     where the CRM is not configured that must read as "signed out", not as a
     500 on the marketing site's own route tree. */
  try {
    return readSessionCookie(cookies().get(COOKIE)?.value);
  } catch {
    return null;
  }
}

/** For every page under /crm except the login page itself. */
export function requireSession(): Session {
  const s = currentSession();
  if (!s) redirect("/crm");
  return s;
}

export const SITE_LABEL: Record<Site, string> = {
  "smart-space": "Smart Space",
  smartcareliving: "SmartCare Living",
};
