import { NextResponse } from "next/server";

/**
 * Adds baseline security headers to every response. CSP is intentionally
 * permissive for now (allows Google Ads, gtag, Calendly, Stripe, Shopify,
 * Resend/Gmail domains used by third-party scripts/fonts).
 */
export function middleware(request: Request) {
  /*
   * The CRM does not exist on a deployment that has no database.
   *
   * The page itself called notFound(), which rendered the right page and
   * answered 200, because a streaming response has already committed its
   * status by the time the component runs. A public URL that says "Page not
   * found" over a 200 is the shape this repository keeps finding: a crawl, an
   * uptime check or a probe reads it as a working page.
   *
   * Middleware runs before any of that, so the 404 here is a real one. Setting
   * SMARTCRM_URL and SMARTCRM_SERVICE_KEY brings the CRM into being.
   */
  const path = new URL(request.url).pathname;
  const isCrm = path === "/crm" || path.startsWith("/crm/") || path.startsWith("/api/crm/");
  if (isCrm && !(process.env.SMARTCRM_URL?.trim() && process.env.SMARTCRM_SERVICE_KEY?.trim())) {
    return new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

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
    // killed measurement from mid-July 2026.
    //
    // *.google-analytics.com was added to future-proof the GA4 regional
    // collectors and did not, because they are not on that domain. GA4
    // sends to region1.ANALYTICS.GOOGLE.COM, a different apex, so the
    // wildcard never matched and every hit was refused:
    //
    //   Connecting to 'https://region1.analytics.google.com/g/collect?
    //   v=2&tid=G-N8886QEJ70&...&en=page_view' violates the following
    //   Content Security Policy directive: "connect-src ..."
    //
    // That is the users-without-sessions shape in the property. gtag
    // loaded, the container initialised, the client id and session
    // cookies were set, page_view was pushed, and the request died at the
    // door. GA4 never says so. It is only visible in the console of a
    // browser actually sitting on the page.
    //
    // Blocked alongside it: stats.g.doubleclick.net and ad.doubleclick.net
    // take the Ads half of the same page view, and the phone-call
    // conversion goes to the visitor's own Google country domain, so an
    // Irish caller hits google.ie and a British one google.co.uk. Those
    // are wildcarded rather than listed, because naming them one at a
    // time is how this breaks again from a country nobody tested from.
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
