import { NextResponse } from "next/server";
import { sendSiteAlert } from "@/lib/site-alerts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Receives uncaught client-side errors from src/app/error.tsx (and any other
 * boundary that posts to this endpoint) and forwards them to Nigel via
 * sendSiteAlert. Heavy filtering, browsers throw a lot of garbage that is
 * NOT a real Smart Space bug (ad-blocker race, extension injection, stale
 * deploy chunk-load, ResizeObserver loop bug, cross-origin "Script error.").
 *
 * Defence layers:
 *   1. Known-noise regex (NOISE_PATTERNS), drop without alerting.
 *   2. sendSiteAlert dedup (1h per message+url).
 *   3. sendSiteAlert process rate-limit (10 emails per 15min).
 *
 * Body shape (all optional except `message`):
 *   { message, stack?, url?, userAgent?, digest? }
 *
 * Returns 200 always, alerts must not visibly fail in the user's browser.
 */

const NOISE_PATTERNS: RegExp[] = [
  // Stale-deploy chunk loading, happens to users on the previous deploy
  // for ~1 minute after each Vercel release. Not a bug, will self-heal.
  /Loading chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /ChunkLoadError/i,
  /Loading CSS chunk/i,
  // Cross-origin script errors are reported with no context, not actionable.
  /^Script error\.?$/,
  // ResizeObserver browser-engine quirk, not a real failure.
  /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i,
  // Browser extensions throwing into our pages.
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /^extension:\/\//i,
  // Network errors during user-cancelled navigations.
  /AbortError: The user aborted a request/i,
  /TypeError: NetworkError when attempting to fetch resource/i,
  // Common ad-blocker / tracking-blocker noise.
  /gtag is not defined/i,
  /Adblock|uBlock|adsbygoogle/i,
  // Safari private-mode quota.
  /QuotaExceededError/i,
];

function isNoise(message: string, stack: string): boolean {
  const combined = `${message}\n${stack}`;
  return NOISE_PATTERNS.some((re) => re.test(combined));
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `… [truncated ${s.length - max} chars]`;
}

export async function POST(request: Request) {
  let body: {
    message?: string;
    stack?: string;
    url?: string;
    userAgent?: string;
    digest?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    // Malformed payload, drop silently. We don't want to alert on
    // every random POST a scanner makes against this endpoint.
    return NextResponse.json({ ok: false, reason: "invalid-json" }, { status: 400 });
  }

  const message = (body.message ?? "").toString().trim();
  if (!message) {
    return NextResponse.json({ ok: false, reason: "missing-message" }, { status: 400 });
  }

  const stack = (body.stack ?? "").toString();
  const url = (body.url ?? "").toString().slice(0, 500);
  const userAgent = (body.userAgent ?? request.headers.get("user-agent") ?? "").toString().slice(0, 300);
  const digest = (body.digest ?? "").toString().slice(0, 80);

  if (isNoise(message, stack)) {
    console.log(`[client-error] dropped as noise: ${message.slice(0, 120)}`);
    return NextResponse.json({ ok: true, dropped: "noise" });
  }

  const result = await sendSiteAlert({
    category: "client-error",
    severity: "warning",
    summary: truncate(message, 120),
    details: [
      `URL:        ${url || "(unknown)"}`,
      `User-Agent: ${userAgent || "(unknown)"}`,
      `Digest:     ${digest || "(none)"}`,
      "",
      "Stack:",
      truncate(stack || "(no stack provided)", 4000),
      "",
      "Note: client-side errors are a leading indicator, not a guaranteed user-facing failure.",
      "Most often these surface from one of: a stale deploy still cached in someone's tab,",
      "a browser extension injecting into our DOM, or an ad-blocker racing with gtag. If the",
      "same error appears repeatedly across different users, it's a real bug worth chasing.",
    ].join("\n"),
    // Dedupe by message+url+digest so the same React error on the same page
    // doesn't repeat-fire as users refresh.
    dedupeKey: `client-error:${digest || message.slice(0, 80)}:${url}`,
  });

  return NextResponse.json({ ok: true, ...result });
}
