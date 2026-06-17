import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { sendSiteAlert } from "@/lib/site-alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sitewide health check.
 *
 * Fires once a day (registered in /vercel.json) and probes every external
 * dependency + every critical public page. If anything is broken, sends
 * ONE aggregated alert email listing every failure, so a multi-system
 * outage doesn't generate 50 separate emails.
 *
 * What it checks (in order):
 *   1. Stripe API (`GET /v1/balance` with STRIPE_SECRET_KEY), catches:
 *      revoked secret key, Stripe outage, billing issues.
 *   2. Google Apps Script read path (`doGet?token=...&limit=1`), catches:
 *      READ_TOKEN mismatch, deployment URL stale, Sheet renamed, daily
 *      quota exceeded. (Write path doesn't need probing, it's already
 *      alerted on by `logLead` in src/lib/leads.ts.)
 *   3. Every critical public page returns HTTP 200, catches: server
 *      component crash, broken deploy, missing imports, runtime errors
 *      in catalogue/data files. The page list deliberately covers every
 *      money-making path (services, bundles, contact, booking).
 *   4. /sitemap.xml returns 200, silent sitemap failure is invisible
 *      until Google de-indexes the site weeks later.
 *
 * Auth: same `CRON_SECRET` bearer pattern as the other cron routes. Also
 * accepts `?force=true` from an admin (no-auth) for manual smoke testing
 *, returns the full report but does NOT send the alert email unless the
 * normal auth check passed too.
 */

function safeBearerEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  durationMs: number;
}

async function timedFetch(
  name: string,
  url: string,
  init: RequestInit = {},
  expect: (res: Response, body: string) => string | null,
  // Per-check timeout. Default 10s covers public pages + Stripe API
  // which should respond fast; raise for endpoints that legitimately
  // take longer to warm up (e.g. Apps Script doGet cold starts can
  // routinely take 8-12s, the 18 May incident hit exactly that).
  timeoutMs: number = 10000
): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    let body = "";
    try {
      res = await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
        // Keep User-Agent stable so Vercel logs don't show a different agent
        // than real browsers, easier debugging.
        headers: {
          "User-Agent": "smart-space-health-check/1.0",
          ...(init.headers ?? {}),
        },
      });
      // Read up to ~16KB of body for sentinel checks. Most pages are larger,
      // but a sentinel string near the top is enough.
      body = await res.text().then((t) => t.slice(0, 16 * 1024));
    } finally {
      clearTimeout(t);
    }
    const failReason = expect(res, body);
    const durationMs = Date.now() - start;
    if (failReason) {
      return {
        name,
        ok: false,
        detail: `HTTP ${res.status} ${res.statusText}, ${failReason}`,
        durationMs,
      };
    }
    return { name, ok: true, detail: `HTTP ${res.status}`, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    const msg =
      err instanceof Error
        ? `${err.name}: ${err.message}` +
          (err.name === "AbortError" ? ` (>${Math.round(timeoutMs / 1000)}s timeout)` : "")
        : String(err);
    return { name, ok: false, detail: msg, durationMs };
  }
}

function getBaseUrl(): string {
  // Always probe the canonical public domain. The inbound `host` header on
  // a Vercel cron invocation is the `*.vercel.app` deployment alias, which
  // returns 401 to unauthenticated traffic, so using it produced a flood
  // of false 401 alerts on 2026-05-12. Env var wins, apex is the fallback.
  // .trim(), same trailing-whitespace-from-Vercel risk as elsewhere.
  // If SITE_URL ends in a literal \n, every page probe below would fetch
  // `https://smart-space.ie\n/...` and we'd alert "every page is down".
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://smart-space.ie";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const authorized =
    !!process.env.CRON_SECRET && safeBearerEqual(auth, expected);

  // Accept ?force=true so an operator can hit /api/cron/health-check?force=true
  // from a browser to see the JSON report without provisioning CRON_SECRET.
  // Force-mode runs every check but never sends the email, auth-only.
  const force = url.searchParams.get("force") === "true";
  if (!authorized && !force) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = getBaseUrl();
  const results: CheckResult[] = [];

  // 1. Stripe, a revoked key or Stripe outage is silent otherwise.
  // /v1/balance is the cheapest authenticated endpoint and returns 401
  // distinctively for bad keys.
  if (process.env.STRIPE_SECRET_KEY) {
    results.push(
      await timedFetch(
        "stripe-balance",
        "https://api.stripe.com/v1/balance",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          },
        },
        (res, body) => {
          if (!res.ok) return `Stripe rejected the request (${body.slice(0, 200)})`;
          try {
            const json = JSON.parse(body);
            if (!Array.isArray(json.available)) {
              return `Unexpected balance payload, no .available array`;
            }
            return null;
          } catch {
            return `Stripe response was not valid JSON`;
          }
        }
      )
    );
  } else {
    results.push({
      name: "stripe-balance",
      ok: false,
      detail: "STRIPE_SECRET_KEY env var not set",
      durationMs: 0,
    });
  }

  // 2. Apps Script read path, catches READ_TOKEN drift, stale deployment URL,
  // exceeded daily quota.
  //
  // Apps Script cold starts can take 8-12s legitimately (the WRITE path's
  // logLead() hit the same problem on 18 May and was bumped to 12s + retry).
  // This READ probe gets 15s before aborting + one retry on cold-start
  // aborts, by the second attempt the Apps Script instance is warm, so
  // it usually returns in under a second.
  const sheetUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  const readToken = process.env.GOOGLE_SHEET_READ_TOKEN;
  if (sheetUrl && readToken) {
    const probe = `${sheetUrl}${sheetUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(readToken)}&limit=1`;
    const expect = (res: Response, body: string) => {
      if (!res.ok) return `Apps Script returned non-2xx (${body.slice(0, 200)})`;
      try {
        const json = JSON.parse(body);
        if (json.error) return `Apps Script said: ${json.error}`;
        if (!Array.isArray(json.rows)) return `No .rows array in response`;
        return null;
      } catch {
        return `Apps Script response was not valid JSON: ${body.slice(0, 200)}`;
      }
    };

    let sheetResult = await timedFetch("google-sheet-read", probe, {}, expect, 15000);

    // Retry once if the failure was a cold-start abort. The second hit is
    // warm and almost always passes, same pattern as logLead's retry.
    if (!sheetResult.ok && sheetResult.detail.includes("AbortError")) {
      console.warn("[health] google-sheet-read first attempt aborted, retrying after 1.5s warm-up wait");
      await new Promise((r) => setTimeout(r, 1500));
      sheetResult = await timedFetch("google-sheet-read", probe, {}, expect, 12000);
    }

    results.push(sheetResult);
  } else {
    results.push({
      name: "google-sheet-read",
      ok: false,
      detail:
        "GOOGLE_SHEET_WEBHOOK_URL or GOOGLE_SHEET_READ_TOKEN not set, the /admin/leads dashboard will be empty on this deploy",
      durationMs: 0,
    });
  }

  // 3. Public pages, must return 200 AND include a sentinel string we
  // expect to render in the static markup. A 200 response from Next.js
  // with a partial render is the most common silent-failure mode for
  // App Router server components.
  type PageCheck = { path: string; sentinel: RegExp };
  const pages: PageCheck[] = [
    { path: "/", sentinel: /Smart Space/i },
    { path: "/services", sentinel: /View Options|services/i },
    { path: "/services/doorbell", sentinel: /Doorbell/i },
    { path: "/services/camera", sentinel: /Floodlight Cam|Camera/i },
    { path: "/services/bundles", sentinel: /Bundle/i },
    { path: "/services/bundles/whole-home", sentinel: /Whole Home/i },
    { path: "/services/bundles/driveway", sentinel: /Driveway/i },
    { path: "/services/free-consultation", sentinel: /Consultation/i },
    { path: "/services/eufy", sentinel: /Eufy/i },
    { path: "/services/eufy-video-doorbell-e340", sentinel: /Eufy Video Doorbell/i },
    { path: "/services/eufy-floodlight-cam-e340", sentinel: /Floodlight Cam/i },
    { path: "/contact", sentinel: /Contact|message/i },
    { path: "/sitemap.xml", sentinel: /<urlset|<sitemap/i },
  ];
  for (const { path, sentinel } of pages) {
    results.push(
      await timedFetch(
        `page${path === "/" ? ":home" : path}`,
        `${base}${path}`,
        {},
        (res, body) => {
          if (!res.ok) return `expected 200, got ${res.status}`;
          if (!sentinel.test(body)) {
            return `page returned 200 but expected content (${sentinel.source}) not found in first 16KB`;
          }
          return null;
        }
      )
    );
  }

  const failed = results.filter((r) => !r.ok);
  const summary = {
    checked: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    base,
  };

  // Send a single aggregated alert if anything failed AND this was a real
  // (authorized) cron run, not a manual force-run.
  if (failed.length > 0 && authorized && !force) {
    const headline =
      failed.length === 1
        ? `${failed[0].name} is failing`
        : `${failed.length} health checks failing`;

    const detail = [
      `${failed.length} of ${results.length} checks failed.`,
      "",
      "FAILURES:",
      ...failed.map((r) => `  ❌ ${r.name} (${r.durationMs}ms), ${r.detail}`),
      "",
      "PASSING:",
      ...results
        .filter((r) => r.ok)
        .map((r) => `  ✅ ${r.name} (${r.durationMs}ms), ${r.detail}`),
      "",
      "What to check first:",
      "  - Any 'page:' failures usually mean a server-component runtime error.",
      "    Open Vercel logs and look for the most recent /api/* or page render exception.",
      "  - 'stripe-balance' failure ⇒ STRIPE_SECRET_KEY is revoked or wrong, or Stripe is down.",
      "  - 'google-sheet-read' failure ⇒ READ_TOKEN mismatch or Apps Script needs redeploy.",
    ].join("\n");

    await sendSiteAlert({
      category: "health-check",
      severity: failed.length >= 3 ? "critical" : "error",
      summary: headline,
      details: detail,
      // Dedupe by the set of failing checks so transient single failures
      // don't spam, but a new failure surfaces a fresh email.
      dedupeKey: `health-check:${failed.map((r) => r.name).sort().join("|")}`,
    });
  }

  return NextResponse.json({
    ok: failed.length === 0,
    ...summary,
    results,
    alerted: failed.length > 0 && authorized && !force,
  });
}
