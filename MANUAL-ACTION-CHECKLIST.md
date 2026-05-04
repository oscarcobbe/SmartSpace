# Manual Action Checklist — Things only Nigel can do

Tasks that need a login, a phone, or a business decision. Code can't do these. Listed in priority order.

Last updated: 2026-05-04 (after the May 4 fix sprint)

---

## 🔴 Do this week (high impact)

### 0. Verify smart-space.ie in Resend (unblocks customer auto-reply)

The customer-facing auto-reply email shipped 2026-05-04 but is currently failing with HTTP 403 from Resend: `"You can only send testing emails to your own email address (nigel@smart-space.ie)"`. Your Resend account is still in dev/sandbox mode using `onboarding@resend.dev` as sender. Until you verify a real domain, every customer-facing auto-reply silently fails (Nigel-facing emails still work — they're allowed in sandbox).

**10-minute fix:**

1. Go to https://resend.com/domains → **Add Domain** → enter `smart-space.ie` (or `mail.smart-space.ie` if you'd rather not touch apex DNS).
2. Resend shows 4 DNS records to add: 1 SPF (TXT), 2 DKIM (TXT), 1 DMARC (TXT). Copy each.
3. In Vercel → Domains → smart-space.ie (or wherever DNS is hosted), add the 4 TXT records exactly as Resend specifies. Names will be things like `resend._domainkey`, `_dmarc`, and either `@` or empty for SPF (if you already have SPF, append Resend's mechanism to the existing record — don't create a duplicate).
4. Back on resend.com/domains → click **Verify**. Usually clears in 2-5 minutes. Status goes **Pending → Verified**.
5. Update the Vercel env var `RESEND_FROM_EMAIL`:
   - From: `Smart Space <onboarding@resend.dev>`
   - To: `Smart Space <hello@smart-space.ie>` (or any address `@smart-space.ie` — inbox doesn't need to exist for outbound).
6. Redeploy Vercel (or push any commit).
7. Test: submit a contact form using a non-Nigel email — auto-reply should land in their inbox within 3 seconds.

**Verify it worked:** check Vercel runtime logs after the test. `[contact] auto-reply email failed` lines should disappear.

### 1. Phone call: Helen O'Reilly + John Caffrey + Cecile Grand

The dashboard reverse-engineers their variant choices from amount paid, but two of them have ambiguous "Yes wired OR No doorbell at all" answers. Quick disambiguation:

- **John Caffrey** — `+353894163530` — install on **Fri 15 May 10:00–12:00**. Confirm: existing wired doorbell or no doorbell at all?
- **Cecile Grand** — Stripe receipt has her contact details — install was 4/29 (already past). **Phone-call apology + reschedule.**
- **Helen O'Reilly** — `+353868443500` — install on **Tue 12 May 15:00–17:00**. Confirm her power-option choice if anything's unclear ("No New Cabling Required" was the unique match — likely fine without a call).

### 2. Set up Stripe webhook health alerts (30 sec, in Stripe Dashboard)

Stripe → **Developers → Webhooks → click your endpoint → "Notification email" or "Webhook event failure" notification setting**. Add `nigel@smart-space.ie`. Stripe will email you if 3+ consecutive deliveries fail. Without this, a webhook secret rotation or signing-secret mismatch goes silent for 3 days.

### 3. Resubmit sitemap to Google Search Console

Search Console → Sitemaps → if `sitemap.xml` is already submitted, click ⋯ → **Refresh**. If not, paste `sitemap.xml` and submit. Today's deploy added 6 new URLs (privacy, terms, blog index, 3 blog posts, FAQ). Refresh nudges Google to re-crawl within 24-48h.

### 4. Google Ads negative keywords audit

Google Ads → **Tools → Search terms** (in your active campaign) → look at the last 30 days of search terms that triggered your ads. Add as Negative Keywords every term that's irrelevant — e.g.:

- `ring tone`, `ringtone`, `ring fitness tracker`, `ring app`
- `nest thermostat` (if you don't install thermostats)
- `eufy battery`, `eufy app issue` (support intent, not buy intent)
- `diy install`, `how to install ring myself`
- `cheap`, `free` (low-intent qualifiers — debatable, depends on data)
- Brand misspellings of competitors

Setting these as **campaign-level negatives** stops them from eating budget. ~30 minutes for a thorough first pass.

---

## 🟡 Do next 2 weeks (medium impact)

### 5. Implement /ring-installation LP fixes (separate audit was produced earlier)

The agent audit produced a P0/P1/P2 list. The single biggest lever flagged was:
- Phone number invisible above the fold → add tap-to-dial CTA in the hero
- "Add to Cart" disabled until date+slot picked → reverse the friction

Tell Claude to ship them when you're ready. Each one is ~15 min of code.

### 6. Cloudflare Turnstile (only if honeypot stops being enough)

If after 2 weeks of the honeypot you still see 1+ gibberish entries per week, layer Turnstile on top. Free tier:
1. Cloudflare account → Turnstile → Add site → `smart-space.ie`
2. Get site key (public) + secret key (private)
3. Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` to Vercel
4. Tell Claude to wire it into `ContactForm.tsx` + `/api/contact`

### 7. Set up Twilio SMS for high-value paid orders

Code is already deployed (`src/lib/sms.ts`) and graceful-no-ops without credentials. To activate:

1. Create Twilio account, buy an Irish (or US) number (~€1.50/month + ~€0.05/SMS)
2. Get Account SID + Auth Token from Twilio console
3. Add to Vercel env:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_FROM_NUMBER` (the purchased number, E.164 format e.g. `+35315551234`)
   - `TWILIO_TO_NUMBER` (your phone, E.164 format e.g. `+35389...`)
4. Redeploy
5. Next paid order ≥ €100 will SMS you within 5 seconds

Total cost at current order volume: <€5/month.

### 8. GA4 internal-traffic filter (clean up bot/test noise)

GA4 Admin → **Data Settings → Data Filters → Create**:
1. Filter type: **Internal traffic** → exclude IPs of known internal users (your office Wi-Fi, your phone hotspot)
2. Optionally a second filter for **Developer traffic** to exclude the `traffic_type=internal` parameter

This won't kill the Singapore/Romania bot traffic, but it cleans your own clicks out so engagement metrics reflect real prospects.

To exclude bot traffic from non-target countries: GA4 doesn't expose country filtering directly. Best option is to create an **Audience** for "IE only" and run reports against that audience — see GA4 → Admin → Audiences.

### 9. Google Business Profile refresh

5-minute thing, big map-pack signal:

1. business.google.com → log in → manage your Smart Space listing
2. Add 3 fresh photos (recent install, your van, a happy customer)
3. Post a "What's New" update (e.g., "Ring video doorbell installation across Dublin — €299 fully fitted")
4. Confirm hours, service area, and primary category are correct

---

## 🟢 Lower priority (do when you have time)

### 10. Trustpilot widget on /reviews

If you have a Trustpilot business profile:
1. Trustpilot → Integrations → TrustBox → grab the embed code
2. Tell Claude where on /reviews to drop it

If you don't have a Trustpilot profile yet, **claim one** — it's a real ranking signal and lets you show external reviews next to your self-hosted ones. Free tier is fine.

### 11. Repeat-customer / referral program

Possible structures:
- 10% commission to past customers for any referral that converts (~€30 on a €299 install)
- Or a flat €50 thank-you voucher for them
- Tracked manually for now; if it works, formalise later

This is a business decision, not a code change. Once you decide, Claude can add a "Refer a friend" CTA to the post-purchase email + a referral form.

### 12. /ring-installation LP audit P1 + P2 items

The audit produced a longer list of medium-impact recommendations: customer photos / installer face, price comparison anchors, "Not sure" option on configurator, WhatsApp fallback, etc. Tell Claude when you want to ship these.

---

## ✅ Already shipped today (no action needed)

For completeness — these are DONE, just listed so you know what's covered:

- Stripe webhook URL fix (was 308-redirecting, now apex)
- CSP fix (Google Ads beacons were blocked, now allowed)
- Server-side conversion fire (Google Ads pixel + GA4 MP)
- Apps Script orderId dedup
- Recovery cron (daily 7am UTC)
- Calendly health cron (daily 7:30am UTC)
- logLead failure alert email (lead-loss prevention)
- Lead conversion `transaction_id` dedup
- GA4 measurement protocol secret
- Honeypot anti-spam on contact form
- Customer-answers in dashboard
- Variant recovery for past orders
- Privacy policy + Terms pages
- Auto-reply email to customer on contact form submission
- Product/Offer schema on product pages
- Sitemap fix (added blog, FAQ, privacy, terms — 6 new URLs)
- Admin dashboard partial-failure error banners
- Twilio SMS scaffold (activates when env vars set)
- Stripe v2 thin webhook deleted
- Image alt-text audit + a11y fixes
- Apps Script redeploy (orderId dedup is now LIVE — verified empirically)
- Stripe webhook health alert email setup (Nigel confirmed done)
- GA4 API secret added to Vercel

That's 22 things shipped in one session. You're not on the back foot any more.
