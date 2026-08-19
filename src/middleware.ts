import { NextResponse } from "next/server";

/**
 * Adds baseline security headers to every response. CSP is intentionally
 * permissive for now (allows Google Ads, gtag, Calendly, Stripe, Shopify,
 * Resend/Gmail domains used by third-party scripts/fonts).
 */
export function middleware() {
  const res = NextResponse.next();
  const h = res.headers;

  h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "SAMEORIGIN");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  const csp = [
    "default-src 'self'",
    // inline/eval needed by Next.js + gtag; limit script hosts to known CDNs.
    // www.gstatic.com serves gtag's web-conversion loader (wcm/loader.js) and
    // googleadservices.com serves enhanced-conversion code. Missing either from
    // script-src makes the browser refuse them and silently kills paid-conversion
    // measurement (same failure class as the connect-src note below).
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://www.gstatic.com https://js.stripe.com https://assets.calendly.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://assets.calendly.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    // googleadservices.com + googleads.g.doubleclick.net are where gtag.js
    // sendBeacons every conversion. Without them in connect-src the browser
    // silently kills the beacon under CSP, tag "fires" in JS but nothing
    // reaches Google Ads. This was the cause of 0 conversions for ~30 days.
    // pagead2.googlesyndication.com/ccm/collect and www.google.com are the
    // newer endpoints gtag.js began using for page_view and enhanced-conversion
    // pings. Google can switch to these at any time (the tag reloads from
    // googletagmanager.com on every visit), so a CSP that once worked can start
    // refusing them with no deploy on our side. That is exactly what silently
    // killed measurement from mid-July 2026. *.google-analytics.com future-proofs
    // GA4 regional collectors (region1, region2, and so on).
    "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://td.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://api.calendly.com https://*.myshopify.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://calendly.com https://*.calendly.com https://www.google.com https://maps.google.com",
    "base-uri 'self'",
    "form-action 'self' https://checkout.stripe.com",
    "object-src 'none'",
  ].join("; ");
  h.set("Content-Security-Policy", csp);

  return res;
}

export const config = {
  // Skip static assets and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)"],
};
