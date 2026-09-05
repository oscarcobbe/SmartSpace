"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Which page somebody read, and when, sent to the FourWinds portal.
 *
 * GA4 already counts sessions and pages. This answers the question the CRM
 * asks and GA4 cannot: which pages this particular person read before they
 * got in touch. An enquiry is worked from that.
 *
 * Nothing runs before consent, and the identifiers are minted inside the
 * granted branch rather than on load with the send withheld. Regulation 5(3)
 * of SI 336/2011 is about the storage, not the transmission: writing an id to
 * localStorage and deciding later whether to send it is already the thing
 * that needed consent. Somebody who declines leaves with nothing of ours.
 *
 * Reads ss_consent, which CookieBanner writes, rather than keeping a second
 * idea of whether consent was given. Two readers of one key drift the moment
 * one of them forgets the storage event, and the drift is silent.
 */

const CONSENT_KEY = "ss_consent";
const VISITOR_KEY = "ss_visitor_id";
const SESSION_KEY = "ss_session_id";
const SITE = "smart-space";
const ENDPOINT = "https://portal.fourwindsdigital.com/api/track";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readConsent(): string | null {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

/**
 * Undefined on the server and on the first client render, and that is not the
 * same as denied. Treating "not read yet" as a decision either sends before
 * anybody answered or never starts once they have.
 */
function serverConsent(): string | null | undefined {
  return undefined;
}

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* older browser */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Null when storage is unavailable. Sending an id that cannot be kept mints a
 * new "visitor" on every page and fills the table with journeys one row long,
 * which is worse than sending nothing.
 */
function ids(): { visitorId: string; sessionId: string } | null {
  try {
    let visitorId = window.localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = randomId();
      window.localStorage.setItem(VISITOR_KEY, visitorId);
    }
    let sessionId = window.sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = randomId();
      window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return { visitorId, sessionId };
  } catch {
    return null;
  }
}

function Beacon() {
  const consent = useSyncExternalStore(subscribe, readConsent, serverConsent);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // React re-runs effects on any state change, and answering the banner is
  // one: without this the page the visitor was already on is sent twice.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (consent !== "granted") return;
    if (!pathname || lastSent.current === pathname) return;

    const identity = ids();
    if (!identity) return;
    lastSent.current = pathname;

    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        site: SITE,
        visitorId: identity.visitorId,
        sessionId: identity.sessionId,
        path: pathname,
        title: document.title,
        // Sent whole; the endpoint reduces it to an origin before storing, so
        // a search URL's query never reaches the database.
        referrer: document.referrer || null,
        utmSource: searchParams?.get("utm_source") ?? null,
        utmMedium: searchParams?.get("utm_medium") ?? null,
        utmCampaign: searchParams?.get("utm_campaign") ?? null,
      }),
      // keepalive rather than sendBeacon: sendBeacon posts as text/plain
      // unless handed a Blob, and a cross-origin POST with a content type the
      // server must be told to accept is one preflight from failing quietly.
      keepalive: true,
      mode: "cors",
      credentials: "omit",
    }).catch(() => {});
  }, [consent, pathname, searchParams]);

  return null;
}

/**
 * useSearchParams suspends during prerender, and without a boundary it opts
 * the whole page out of static rendering. The boundary keeps that cost on a
 * component that renders nothing.
 */
export default function VisitBeacon() {
  return (
    <Suspense fallback={null}>
      <Beacon />
    </Suspense>
  );
}
