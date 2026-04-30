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
    // inline/eval needed by Next.js + gtag; limit script hosts to known CDNs
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://googleads.g.doubleclick.net https://js.stripe.com https://assets.calendly.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://assets.calendly.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' https:",
    "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://www.googletagmanager.com https://region1.google-analytics.com https://api.calendly.com https://*.myshopify.com",
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
