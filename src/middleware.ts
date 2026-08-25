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
    /*
     * googleadservices.com + googleads.g.doubleclick.net are where gtag.js
     * sendBeacons every conversion. Without them in connect-src the browser
     * silently kills the beacon under CSP, tag "fires" in JS but nothing
     * reaches Google Ads. This was the cause of 0 conversions for ~30 days.
     *
     * And then the same class of bug took GA4 out, for a second time and
     * for a different reason. The list had region1.google-analytics.com.
     * GA4 sends to region1.ANALYTICS.GOOGLE.COM. Two different domains,
     * one letter of difference in how you read them, and everything the
     * browser tried to send was refused:
     *
     *   Connecting to 'https://region1.analytics.google.com/g/collect?
     *   v=2&tid=G-N8886QEJ70&...&en=page_view' violates the following
     *   Content Security Policy directive: "connect-src ..."
     *
     * Which is why the property showed users and no sessions: gtag ran,
     * set its cookies, formed a client id, and every hit was blocked at
     * the door. Nothing in GA4 says "your CSP is eating this". You only
     * see it in the console of a browser sitting on the page.
     *
     * Three more were being blocked alongside it and are added here too:
     * stats.g.doubleclick.net and ad.doubleclick.net take the Ads side of
     * the same page_view, and www.google.ie takes the phone-call
     * conversion. Google uses the visitor's country domain for that one,
     * so it is wildcarded rather than listed: an Irish visitor hits
     * google.ie, a British one google.co.uk, and listing them one at a
     * time is how this breaks again in a country nobody tested from.
     */
    "connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://td.doubleclick.net https://stats.g.doubleclick.net https://ad.doubleclick.net https://*.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://*.google.ie https://*.google.co.uk https://api.calendly.com https://*.myshopify.com",
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
