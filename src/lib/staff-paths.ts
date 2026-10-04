/**
 * The pages that are staff tools, not the website.
 *
 * None of them loads Google's tag, mounts a tracker or shows the cookie
 * banner. Until 4 October 2026 only /crm was left out: /admin/leads filed 16
 * page views from 2 users into the GA4 property the ads are judged by, and
 * sent scroll and form_begin events to Google Ads and its remarketing lists,
 * because Nigel reading his own leads looked like a visitor. /ga4-setup and
 * /gbp-setup are internal hand-off notes that answer 200 in production.
 * /dev, /backlink-outreach and /test123-checkout are 404 there, and a 404
 * page renders inside the same layout, so they are listed too.
 *
 * One rule, read in two places: the inline script in src/app/layout.tsx (via
 * src/lib/gtag-bootstrap.ts), which decides whether gtag.js is loaded at all,
 * and src/components/SiteChrome.tsx, which decides whether the trackers and
 * the banner are mounted. scripts/check-gtag-bootstrap.mjs and
 * scripts/check-tracking-browser.mjs fail when a staff page is tracked.
 *
 * A new staff page goes here. Kept free of imports: the browser, the server
 * and the build checks all load it.
 */
export const STAFF_PATH = /^\/(?:admin|crm|dev|ga4-setup|gbp-setup|backlink-outreach|test123-checkout)(?:\/|$)/;

export function isStaffPath(pathname: string | null | undefined): boolean {
  return !!pathname && STAFF_PATH.test(pathname);
}
