# Smart Space — Master TODO

Single flat checklist of everything Nigel needs to do. Paste into Cowork / any task tool. Priorities inline. Last refreshed 2026-05-04.

For the *why* / step-by-step on any item, see [`MANUAL-ACTION-CHECKLIST.md`](./MANUAL-ACTION-CHECKLIST.md).

---

## P0 — this week (high impact, do first)

- [ ] **[P0] Verify smart-space.ie in Resend** so customer auto-reply emails actually deliver. Currently failing silently with 403 — sandbox mode only sends to nigel@smart-space.ie. ~10 min: resend.com/domains → Add Domain → 4 DNS records → verify → swap `RESEND_FROM_EMAIL` env var in Vercel from `onboarding@resend.dev` to `hello@smart-space.ie`.
- [ ] **[P0] Phone John Caffrey** — `+353894163530` — confirm: existing wired doorbell or no doorbell at all? Install Fri 15 May 10:00–12:00.
- [ ] **[P0] Phone Cecile Grand** — apology call + reschedule. Her install was 4/29 (past). Look up phone in Stripe receipt or Sheet.
- [ ] **[P0] Phone Helen O'Reilly** if any spec ambiguity — `+353868443500` — install Tue 12 May 15:00–17:00. (Lower urgency than the other two — her variant matched uniquely.)
- [ ] **[P0] Stripe Dashboard → Developers → Webhooks → enable failure-notification email.** Add nigel@smart-space.ie. Closes the silent-webhook-failure hole.
- [ ] **[P0] Resubmit `sitemap.xml` in Search Console.** Search Console → Sitemaps → if already submitted click "..." → Refresh. Pushes Google to re-crawl the 6 new URLs (privacy, terms, blog index, 3 blog posts, FAQ).
- [ ] **[P0] Google Ads negative-keywords audit.** Tools → Search Terms → last 30 days → add as Negative Keywords any irrelevant query. Examples: ring tone, ringtone, fitness tracker, app issue, diy install, free, cheap. ~30 min.
- [ ] **[P0] Add tap-to-dial phone CTA above the fold on /ring-installation.** Page gets 30 paid sessions/month, 0 conversions. Phone number doesn't appear until line 547 of the page. Older mobile traffic wants to call, not configure.
- [ ] **[P0] Reverse the Add-to-Cart friction on /ring-installation.** Currently disabled with "Select an Installation Date" before the user even sees the calendar on mobile. Either auto-select the earliest available date as default OR move the calendar above the disabled CTA on mobile.
- [ ] **[P0] Move social proof up on /ring-installation hero.** "5★ Google · 5,000+ installs · SME Winner 2025" trust strip is at line 497 — move directly under the H1.

## P1 — next 2 weeks (medium impact)

- [ ] **[P1] Set up Twilio account** + buy a number (€1.50/mo + €0.05/SMS) → add 4 env vars to Vercel: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_TO_NUMBER`. Code is already deployed, just no-ops until env vars exist. Activates SMS alerts for paid orders ≥ €100.
- [ ] **[P1] GA4 → Admin → Data Filters → exclude Internal traffic** (your IP/device). Cleans dashboard noise.
- [ ] **[P1] Google Business Profile refresh.** business.google.com → 3 fresh photos (recent install, van, happy customer) + a "What's New" post. Map-pack signal.
- [ ] **[P1] Add "Not sure" option to /services/installation-only configurator.** Many homeowners genuinely don't know if their existing doorbell is wired. Forcing yes/no = abandonment. Default to safe-fallback variant + tooltip "We'll check on the confirmation call."
- [ ] **[P1] Add hero subline "Next available: [date]" on /ring-installation.** Search intent for "Ring installation Dublin" is half price, half *speed*. Customers want to know when you can come.
- [ ] **[P1] Add "Meet your installer" card** on /ring-installation — your photo, first name, years of experience, business address, RECI/Garda-vetted credentials. Trust signals are abstract icons right now.
- [ ] **[P1] Add price comparison anchor.** "vs €180+ Amazon Home Services · vs €80 risk of DIY drilling damage". Or "Used by 5,000+ Irish homes since 2019". One line under the price on /ring-installation.

## P2 — lower urgency

- [ ] **[P2] Cloudflare Turnstile** — only if honeypot proves insufficient (give it 2 weeks). Free tier. Layered on top of the existing honeypot for stronger bot protection.
- [ ] **[P2] Trustpilot integration on /reviews.** Claim a Trustpilot business profile if you don't have one. Embed the TrustBox widget. External proof beats self-hosted reviews.
- [ ] **[P2] Referral program design + launch.** Options: 10% commission to past customers, or flat €50 voucher. Track manually first; if it works, formalise. Decide structure first, then ship the post-purchase email + landing page.
- [ ] **[P2] Remove FeaturedProducts carousel from /ring-installation** (line 466 of page.tsx) — splits paid-traffic attention. Or move to very bottom after FAQ.
- [ ] **[P2] WhatsApp fallback link** near the Add-to-Cart on /ring-installation. "Prefer WhatsApp? Message us — replies in 1 hour." Captures users who aren't ready to commit but want to talk.
- [ ] **[P2] Align JSON-LD availability** in `ring-installation/layout.tsx` with the calendar's 5-day lead time. Currently the schema says "next-working-day" — minor mismatch.

## Watch-list (no action — just monitor)

- [ ] Watch `/admin/leads` daily for first **paid Google Ads conversion** in the next 14 days. Proves the CSP fix worked. If still €0 from Paid Search after 14 days, the issue is genuinely the LP/creative not tracking.
- [ ] Watch Search Console next 2 weeks — indexed-pages count should rise from 15 toward 21+ as the 6 new sitemap URLs get crawled.
- [ ] Watch Vercel runtime logs for `[contact] auto-reply email failed` lines. Should disappear once Resend domain is verified (P0 #1).
- [ ] Watch your phone for SMS — first one tells you Twilio is wired up correctly. Until then, all alerts go to email only.

## Done — already shipped 2026-05-04 (no action, just record)

22 items shipped this session. Don't redo any of these:

- Stripe webhook URL fix (was 308-redirecting → fixed to apex)
- CSP fix (Google Ads beacons were blocked → unblocked)
- Server-side conversion fire (Google Ads pixel + GA4 MP)
- Apps Script orderId dedup (live, verified)
- Recovery cron (daily 7am UTC)
- Calendly health cron (daily 7:30am UTC)
- logLead failure alert email
- Lead conversion `transaction_id` dedup
- GA4 API secret added to Vercel
- Honeypot anti-spam on contact form
- Customer-answers panel in dashboard
- Variant recovery for past orders (Helen / John / Cecile)
- Privacy policy + Terms pages
- Auto-reply email shipped (gated on P0 #1 above)
- Product/Offer schema on product pages
- Sitemap fix (added 6 new URLs)
- Admin dashboard partial-failure error banners
- Twilio SMS scaffold (gated on P1 setup)
- Stripe v2 thin webhook deleted
- Image alt-text + a11y fixes
- Apps Script redeploy (orderId dedup is now LIVE)
- Stripe webhook health alert email setup (Nigel confirmed)

---

**File last edited:** 2026-05-04
**Source of truth:** [`MANUAL-ACTION-CHECKLIST.md`](./MANUAL-ACTION-CHECKLIST.md) for the full why/how on each item.
