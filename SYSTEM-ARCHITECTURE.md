# Smart Space — System Architecture

Live snapshot of every external service, integration, script, and data flow wired into [smart-space.ie](https://smart-space.ie). Last revised: **2026-05-04**.

If you're reading this and something on the site is broken, this doc tells you which service the broken thing depends on, where the credentials live, and what the fallback paths are.

---

## Table of contents

1. [High-level map](#1-high-level-map)
2. [Hosting & domain](#2-hosting--domain)
3. [Stripe — payments + webhooks](#3-stripe--payments--webhooks)
4. [Calendly — bookings](#4-calendly--bookings)
5. [Google Apps Script + Google Sheet — lead store](#5-google-apps-script--google-sheet--lead-store)
6. [Resend — transactional email](#6-resend--transactional-email)
7. [Google Ads — conversion tracking](#7-google-ads--conversion-tracking)
8. [Google Analytics 4 — analytics + server-side](#8-google-analytics-4--analytics--server-side)
9. [Shopify — frozen product catalogue](#9-shopify--frozen-product-catalogue)
10. [Cookie consent + Consent Mode v2](#10-cookie-consent--consent-mode-v2)
11. [Attribution capture (gclid + UTM)](#11-attribution-capture-gclid--utm)
12. [User-flow sequences](#12-user-flow-sequences)
13. [Admin dashboard](#13-admin-dashboard)
14. [Backup / redundancy / safety nets](#14-backup--redundancy--safety-nets)
15. [Environment variables — full table](#15-environment-variables--full-table)
16. [What's NOT in this repo](#16-whats-not-in-this-repo)
17. [Recent fixes — May 4 2026](#17-recent-fixes--may-4-2026)

---

## 1. High-level map

```
                                ┌──────────────────────────────┐
                                │  Customer browser            │
                                │  (smart-space.ie)            │
                                └─────────┬────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
  ┌─────────────────┐         ┌──────────────────────┐       ┌─────────────────┐
  │ gtag.js         │         │ Next.js (Vercel)     │       │ Stripe Checkout │
  │ Google Ads +    │         │ smart-space.ie       │       │ (hosted page)   │
  │ GA4 client      │         │  - product pages     │       └────────┬────────┘
  └────────┬────────┘         │  - /api/contact       │                │
           │                  │  - /api/booking       │                │ webhook
           │                  │  - /api/checkout      │                ▼
           ▼                  │  - /api/admin/leads   │       ┌─────────────────┐
  ┌─────────────────┐         │  - /api/cron/*        │◀──────│ Stripe webhook  │
  │ googleadservices│         └──────┬───────────────┘       │ delivery        │
  │ + GA4 collect   │                │                       └─────────────────┘
  └─────────────────┘                ▼
                            ┌────────────────────────┐
                            │ Server-side fan-out:   │
                            │  - Resend (email)      │
                            │  - Calendly (booking)  │
                            │  - Apps Script (Sheet) │
                            │  - Google Ads pixel    │
                            │  - GA4 MP              │
                            └────────────────────────┘
```

Every customer interaction touches Vercel. Vercel fans out to ~5 external services depending on the action.

---

## 2. Hosting & domain

| Item | Value |
|---|---|
| Hosting | **Vercel** project `oscar-5316s-projects/smart-space` |
| Framework | Next.js App Router (TypeScript) |
| Root domain | `smart-space.ie` (apex) |
| Subdomain | `www.smart-space.ie` 308-redirects → apex (preserves query string) |
| Deploy | `vercel deploy --prod` |
| Cron | Configured in [`vercel.json`](./vercel.json) — daily 7am UTC |
| Region | Default Vercel (Dublin DUB1 by default for IE traffic) |

**Why apex not www:** every webhook (Stripe), every backend API integration, and every internal link uses the apex domain. www exists only to redirect humans who type it manually. The `www → apex` 308 redirect was the cause of a 30-day Stripe webhook outage (fixed 2026-05-04) — Stripe doesn't follow 3xx redirects on webhook delivery. Same trap kills client-side gclid attribution if the ad final URL uses www.

---

## 3. Stripe — payments + webhooks

### What it does

Processes every paid order. Customer fills cart → clicks Checkout → redirected to Stripe-hosted page → pays → redirected back to `/smartspace-payment-success`.

### Code paths

| Direction | File | Purpose |
|---|---|---|
| Outbound | [`src/app/api/checkout/route.ts`](./src/app/api/checkout/route.ts) | Creates Stripe Checkout Session via REST API. Resolves cart against frozen Shopify catalogue (5% price tolerance). Sets metadata: `gclid`, `utm_*`, `landing_page`, `referrer`, `product_name`, `booking_date/slot/label`, `configuration` (JSON of customer answers — capped at 490 chars). Custom field: `installation_address`. |
| Inbound | [`src/app/api/webhooks/stripe/route.ts`](./src/app/api/webhooks/stripe/route.ts) | Receives `checkout.session.completed`. Verifies signature. Idempotency check (in-memory + Apps Script orderId dedup). Calls `logLead` → Sheet, `createBookingEvent` → Calendly, `fireServerConversion` → Google Ads/GA4, `sendOrderNotification` → Resend. Always returns 200 to Stripe (so Stripe doesn't retry on transient errors). |
| Verification | [`src/app/api/verify-session/route.ts`](./src/app/api/verify-session/route.ts) | Hit by success page. Reads Stripe session, returns `paid` / `amount` / `email` / `phone`. Used to gate the gtag conversion fire (no spoofing via crafted URL). |
| Recovery | [`scripts/recover-bookings.mjs`](./scripts/recover-bookings.mjs) | Manual node script. Finds paid Stripe orders missing a Calendly event, optionally creates them retroactively. Also exposed via cron (see §14). |

### Webhook configuration

- **Single live endpoint:** `https://smart-space.ie/api/webhooks/stripe`
- Stripe webhook ID: `we_1TMD8SP6gcaIOE1nsEWNhyY7`
- Listens to: `checkout.session.completed` only
- Signature verified via `STRIPE_WEBHOOK_SECRET`
- A second v2 "thin" webhook (`creative-sensation-thin`) exists but only listens to internal Stripe account events (`v2.core.account.created` etc.) — not used by the app.

### Success URL

`https://smart-space.ie/smartspace-payment-success?session_id={CHECKOUT_SESSION_ID}`

The `{CHECKOUT_SESSION_ID}` placeholder is filled by Stripe at redirect time. The success page reads it, calls `/api/verify-session`, then fires the gtag conversion if `paid: true`.

### Env vars

- `STRIPE_SECRET_KEY` — live key, `sk_live_…`
- `STRIPE_WEBHOOK_SECRET` — `whsec_…`, used for HMAC signature verification

---

## 4. Calendly — bookings

### What it does

Two event types — Consultation (free, 15-min callback or 90-min site visit) and Installation (paid, on-site). Calendly stores bookings, sends customer the calendar invite, and syncs to Nigel's Google Calendar via Calendly's native GCal integration.

### Code paths

| File | Purpose |
|---|---|
| [`src/lib/calendly.ts`](./src/lib/calendly.ts) | All Calendly API calls. `createBookingEvent`, `getAvailableSlots`, `cancelBooking`. TIME_SLOTS constants (10–12, 12:30–14:30, 15–17). |
| [`src/app/api/booking/route.ts`](./src/app/api/booking/route.ts) | Free site-visit consultation booking flow. Creates Calendly event → Resend → logLead → fireServerConversion. |
| [`src/app/api/calendar/availability/route.ts`](./src/app/api/calendar/availability/route.ts) | Returns available time slots for a given date. Used by the in-page calendar widget. |
| [`src/app/api/calendar/reserve/route.ts`](./src/app/api/calendar/reserve/route.ts) | Holds a slot temporarily during checkout. |
| [`src/components/BookingCalendar.tsx`](./src/components/BookingCalendar.tsx) | Custom calendar UI on product pages. Talks to `/api/calendar/availability`. |

### Event type URIs

- `CALENDLY_CONSULTATION_EVENT_TYPE_URI` — used for free 15-min callbacks
- `CALENDLY_INSTALLATION_EVENT_TYPE_URI` — used for paid installations triggered by Stripe webhook
- `CALENDLY_EVENT_TYPE_URI` — legacy fallback

### How a Calendly event gets created

```
Customer pays via Stripe
   ↓
Stripe webhook fires
   ↓
src/app/api/webhooks/stripe/route.ts → createBookingEvent()
   ↓
POST https://api.calendly.com/invitees with:
   { event_type, start_time, invitee: { email, first_name, ... },
     questions_and_answers: [{ question, answer: "Product:X | Order:Y | ..." }] }
   ↓
Calendly creates event + sends customer their invite
   ↓
Calendly mirror auto-creates Google Calendar event for Nigel
```

If `createBookingEvent` returns null, the webhook handler continues — `sendOrderNotification` still emails Nigel with `calendlyStatus: "failed"` so it's visible.

### Auth

`CALENDLY_PERSONAL_TOKEN` — long JWT-style PAT issued via Calendly Integrations page. Doesn't expire by default but **revoked on Calendly password change or 2FA reset**. No monitoring → see [§14 backups](#14-backup--redundancy--safety-nets) for the `recover-bookings` cron that catches Calendly-related failures.

---

## 5. Google Apps Script + Google Sheet — lead store

### What it does

Single source of persistence for every lead, paid order, contact form, and consultation booking. Every flow writes here for the admin dashboard to read back.

### The Sheet

**Name:** "Smart Space Leads"
**Owner:** nigel@smart-space.ie

Columns (set up by `setupHeaders()` in the Apps Script):

```
Date | Type | Name | Email | Phone | Address | Product |
Amount | Currency | Booking Date | Booking Slot | Order ID |
Source | Notes | Status | GCLID | Landing Page | Referrer |
UTM Source | UTM Medium | UTM Campaign | UTM Content | UTM Term
```

Status column has data validation: New / Contacted / Quoted / Sold / Lost / No Show.

### The Apps Script

[`google-apps-script.js`](./google-apps-script.js) — pasted into the Sheet's bound Apps Script editor. Three handlers + utilities:

| Function | Purpose |
|---|---|
| `setupHeaders()` | One-shot. Creates header row + column widths + Status validation + conditional formatting. Re-runnable. |
| `doPost(e)` | Receives lead writes. **De-duplicates by orderId** — if a row with the same `cs_(live\|test)_*` orderId already exists, returns `{deduped:true}` and skips. Maps payload fields onto the column order. Colour-codes the Type column. |
| `doGet(e)` | Returns recent rows as JSON. Gated by `READ_TOKEN` query param (must match the constant in the script). Used by `/api/admin/leads` to populate the dashboard. |
| `cleanTestRows()` | Manual run. Deletes rows matching test patterns (Claude Test, +claudetest@, e2e-test@claude-tests.invalid, audit, €1 orders). Also catches orderId duplicates. |

### Deployment URL

`https://script.google.com/macros/s/AKfycbw9kznLPj3k9IkDzTLgZYKpOrbwqe3niv8gjREzlIRSm4dx5tjOeZXAZcvqID-Gw2-C1g/exec`

This URL changes if you do a "New deployment" instead of "Manage → New version". **Stick to "New version" on edits** — the URL stays the same and the Vercel env var doesn't need updating.

### Auth

`READ_TOKEN` constant inside the Apps Script — must match `GOOGLE_SHEET_READ_TOKEN` env var in Vercel. Writes (`doPost`) are unauthenticated; reads (`doGet`) are token-gated.

### Code path on the Vercel side

[`src/lib/leads.ts`](./src/lib/leads.ts) — `logLead()` POSTs to the deployment URL. 8s timeout. **Failure path now sends a "[ALERT] Lead-log write failed" email to Nigel via Resend** (added 2026-05-04) — so Sheet outages stop being silent.

### Env vars

- `GOOGLE_SHEET_WEBHOOK_URL` — the `/exec` URL above
- `GOOGLE_SHEET_READ_TOKEN` — must match `READ_TOKEN` in the Apps Script

---

## 6. Resend — transactional email

### What it does

Sends every transactional email the system produces. Sole "push channel" today (no SMS, no Slack).

### Email types

| Trigger | Recipient | Content | Code |
|---|---|---|---|
| Contact form submission | Nigel | Customer name/email/phone, topic, message | [`src/app/api/contact/route.ts`](./src/app/api/contact/route.ts) |
| Site-visit booking | Nigel | Customer details + date/time | [`src/app/api/booking/route.ts`](./src/app/api/booking/route.ts) |
| Paid order webhook | Nigel | Customer + product + amount + booking + Calendly status | `sendOrderNotification` in [`src/app/api/webhooks/stripe/route.ts`](./src/app/api/webhooks/stripe/route.ts) |
| Booking recovery report | Nigel | List of paid orders that needed retroactive Calendly creation | `sendRecoveryEmail` in [`scripts/recover-bookings.mjs`](./scripts/recover-bookings.mjs) |
| Daily missing-booking alert (cron) | Nigel | Future-recoverable orders only — past ones suppressed | [`src/app/api/cron/recover-bookings/route.ts`](./src/app/api/cron/recover-bookings/route.ts) |
| logLead failure alert | Nigel | "[ALERT] Lead-log write failed" — full lead JSON | `sendLeadLogFailureAlert` in [`src/lib/leads.ts`](./src/lib/leads.ts) |
| Stripe receipt | Customer | Native Stripe — not via Resend | n/a |
| Calendly invite | Customer | Native Calendly — not via Resend | n/a |

### Env vars

- `RESEND_API_KEY` — restricted "send only" token
- `RESEND_FROM_EMAIL` — currently `Smart Space <onboarding@resend.dev>` (dev sender; if you set up your own domain in Resend, change this)
- `CONTACT_TO_EMAIL` — defaults to `nigel@smart-space.ie`

### Failure mode

Resend outage = no notifications, no alert path. The customer-facing flow is unaffected (Resend is awaited but failures are caught and logged). **This is an unmitigated single-channel risk** — see [§14](#14-backup--redundancy--safety-nets).

---

## 7. Google Ads — conversion tracking

### Account

- Account ID: `AW-17978501655`
- Login: `nigel@smart-space.ie`
- Account ID (numeric): `999-404-1488`

### Conversion actions in code

| Conversion action (Google Ads UI name) | Label (used in `gtag('event','conversion',{send_to: …})`) | Where it fires |
|---|---|---|
| SS- Any value stripe | `IofPCOiZuJkcEJfU6PxC` | Paid order (Stripe success page) |
| SS- Free Consultation | `fH4ZCMHv7ZocEJfU6PxC` | Free consultation success page |
| SS- Contact us form / Onsite consultation booked | `u8cHCNyipZocEJfU6PxC` | Contact form + booking flow |
| SS - Call (01 513 0424) | `HWS2CL2y4ZgcEJfU6PxC` | Phone-call conversion (via env var) |

Smart Care Living conversion labels (separate site, same Google Ads account) — DO NOT reuse in Smart Space code:
`8aWsCPbYuZkcEJfU6PxC` and various `Booked Consultation Call - …` actions.

### How a conversion fires

**Two channels per conversion** (intentional redundancy):

#### Channel A — client-side gtag.js (browser)

1. `src/app/layout.tsx` loads `gtag.js?id=AW-17978501655` async on every page
2. Sets Consent Mode v2 defaults to denied (legally required EEA)
3. Configures Google Ads + GA4
4. On user action (form submit / paid success), the relevant component calls `gtag('event', 'conversion', {...})` with: `send_to`, `value`, `currency`, `transaction_id` (UUID from API), `user_data` (email + phone for Enhanced Conversions)
5. gtag.js sends the conversion via `navigator.sendBeacon` to `googleadservices.com/pagead/conversion/...`
6. CSP `connect-src` in [`src/middleware.ts`](./src/middleware.ts) allows the relevant hosts (`googleadservices.com`, `googleads.g.doubleclick.net`, `td.doubleclick.net`) — **without these, the beacon is silently dropped (was the cause of 30 days of zero conversions)**

#### Channel B — server-side pixel (Vercel)

1. After payment/lead is confirmed server-side, [`src/lib/server-conversions.ts`](./src/lib/server-conversions.ts) `fireServerConversion()` fires a GET to `https://www.googleadservices.com/pagead/conversion/17978501655/` with sha256-hashed email + phone (`em`, `pn`), gclid (if present), value, currency, transaction_id (`oid`)
2. Same `transaction_id` as the client-side fire → Google Ads dedupes the two pings into a single conversion
3. Bypasses adblockers, consent denials, and "user closed the tab too quickly" issues

### Auto-tagging

Enabled in Google Ads account settings. Adds `?gclid=…` to every ad URL automatically. Without this, server-side Enhanced Conversions matching is the only attribution path (works but less reliable).

### Enhanced Conversions for Leads

Account-level setting: **"Google tag" method** (changed from GTM 2026-05-04 — site uses gtag.js, not GTM).

### Phone-call conversion

Configured in [`src/app/layout.tsx`](./src/app/layout.tsx) via `gtag('config', 'AW-17978501655/' + callLabel, { phone_conversion_number: '+35315130424' })`. Label comes from `NEXT_PUBLIC_GADS_CALL_LABEL` env var.

---

## 8. Google Analytics 4 — analytics + server-side

### Property

- Stream URL: `https://smart-space.ie`
- Stream ID: `14510064208`
- Measurement ID: `G-JR2WXNSLEL`

### Two channels

#### Client-side gtag (every pageview + every conversion event)

- Configured in [`src/app/layout.tsx`](./src/app/layout.tsx) via `gtag('config', 'G-JR2WXNSLEL')`
- Auto-fires `page_view` on every navigation
- Custom events: `generate_lead` (contact + booking), `purchase` (paid order), `book_appointment` (booking)
- All custom events carry `transaction_id` for dedup against server-side
- Enhanced measurement enabled in GA4 admin (page views, scrolls, outbound clicks etc.)

#### Server-side via Measurement Protocol

- Code in [`src/lib/server-conversions.ts`](./src/lib/server-conversions.ts) → `fireGA4()`
- Fires from Vercel runtime via `POST https://www.google-analytics.com/mp/collect?measurement_id=G-JR2WXNSLEL&api_secret=$GA4_API_SECRET`
- Includes `client_id`, hashed `user_data`, event name + params
- Wired into `/api/contact`, `/api/booking`, `/api/webhooks/stripe`
- **Graceful no-op if `GA4_API_SECRET` missing** — only the Google Ads pixel fires
- When GA4 is linked to Google Ads (in Google Ads → Tools → Linked accounts), GA4 conversions can be imported as Google Ads conversions — making this a third tracking path

### Env vars

- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` = `G-JR2WXNSLEL` (loaded into client bundle at build time)
- `GA4_API_SECRET` — Measurement Protocol secret (server-side only — added 2026-05-04)

---

## 9. Shopify — frozen product catalogue

### What it does

Provides product titles, prices, variants, images, and option metadata for every product page on the site.

### How

- **No live Shopify API calls.** Originally fetched via Storefront API; decoupled 2026-04-24 because the API was slow + rate-limited.
- Snapshot lives in [`src/data/productCatalogue.ts`](./src/data/productCatalogue.ts) — a `ShopifyProduct[]` array.
- All accessor functions in [`src/lib/shopify.ts`](./src/lib/shopify.ts) are local — function signatures preserved so call-sites didn't need changes.

### Updating prices / variants

1. Edit `src/data/productCatalogue.ts`
2. `git commit && git push` (or `vercel deploy --prod`)
3. New build picks up the new prices

### Variant prices used for backfill recovery

Because variants have unique prices (e.g. installation-only "1 device / Yes wired / no cameras" = €139, "3 devices / Yes wired / no cameras" = €375), [`scripts/recover-variants.mjs`](./scripts/recover-variants.mjs) and the `recoverVariantFromPrice()` helper in `/api/admin/leads` reverse-engineer past customers' choices from the amount they paid.

---

## 10. Cookie consent + Consent Mode v2

### What it does

Legally compliant EU/EEA consent flow for ad tracking + analytics.

### Implementation

| File | Role |
|---|---|
| [`src/app/layout.tsx`](./src/app/layout.tsx) | Sets `gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 })` BEFORE the gtag.js bootstrap. Required by GDPR — the very first page load must be consent-compliant. |
| [`src/components/CookieBanner.tsx`](./src/components/CookieBanner.tsx) | Banner UI. On user choice (`Accept all` / `Essential only`), calls `gtag('consent', 'update', …)` with the chosen state. Persists decision in `localStorage["ss_consent"]` with 12-month TTL. Re-applies stored decision on every page load (so SPA navigations keep consent state). |

### What "denied" means in Consent Mode v2

- gtag.js still fires conversion pings — but as **cookieless** (no gclid, no remarketing, no enhanced conversions matching via cookies)
- Google Ads counts these as **modeled** conversions when traffic volume is high enough; otherwise they don't appear in reports
- The server-side fire path (§7B) is **not affected by consent** — it runs from Vercel, no browser cookies involved. This is the safety net.

---

## 11. Attribution capture (gclid + UTM)

### What it does

Captures the first ad click that brought the user to the site, persists it for 90 days, and attaches it to every lead/order they create.

### Files

| File | Role |
|---|---|
| [`src/lib/attribution.ts`](./src/lib/attribution.ts) | `captureAttribution()` reads URL params (gclid, utm_*) on each page load. First-touch wins: if a record exists and the current URL has no ad signal, it's preserved. If the URL has a new gclid/utm, it overwrites (paid-click wins). Stored in `localStorage["ss_attribution"]`. `getAttribution()` reads it back. |
| [`src/components/GclidCapture.tsx`](./src/components/GclidCapture.tsx) | Mounted in `layout.tsx`. `useEffect` on first mount runs `captureAttribution()`. |

### How it flows into orders

```
User lands on /services/installation-only?gclid=ABC
   ↓
GclidCapture useEffect fires → captureAttribution()
   ↓
localStorage.ss_attribution = { gclid: "ABC", landingPage: "/services/...", ... }
   ↓
User browses, eventually clicks Checkout
   ↓
CartDrawer reads getAttribution() → adds to /api/checkout body
   ↓
/api/checkout sets Stripe metadata.gclid + metadata.utm_*
   ↓
Stripe webhook reads metadata.gclid → passes to logLead + fireServerConversion
   ↓
Sheet column GCLID = "ABC", Google Ads attribution preserved
```

Same chain works for contact form (`getAttribution()` → POST body → logLead → Sheet) and booking.

---

## 12. User-flow sequences

### A — Contact form submit

```
1. ContactForm.tsx: user fills + submits
2. POST /api/contact { name, email, phone, subject, message, attribution }
3. /api/contact:
   - Validates required fields
   - Generates conversionId (UUID)
   - Resend.send → email Nigel
   - logLead → Apps Script POST → Sheet row "Contact Enquiry"
       - if logLead fails, sendLeadLogFailureAlert → Resend → "[ALERT]" email
   - fireServerConversion (Google Ads pixel + GA4 MP) with conversionId
   - Returns { success: true, id, conversionId }
4. ContactForm.tsx receives conversionId → fires gtag('event', 'conversion', { transaction_id: conversionId, ... })
5. Google Ads dedupes (server fire + client fire) by transaction_id → single conversion counted
```

### B — Site-visit booking (`/booking`)

```
1. /booking page collects contact + selected date/timeSlot
2. POST /api/booking { name, email, phone, subject, message, date, timeSlot, attribution }
3. /api/booking:
   - createBookingEvent (Calendly) — BLOCKING, fails fast if no slot
   - Resend → email Nigel
   - logLead "Free Consultation"
   - fireServerConversion (book_appointment) with conversionId
   - Returns { success: true, conversionId }
4. /booking page fires gtag conversion with transaction_id: conversionId
```

### C — Paid order via Stripe

```
1. CartDrawer: user clicks Checkout
2. POST /api/checkout { items, attribution }
3. /api/checkout:
   - Resolves items vs frozen Shopify catalogue (5% price tolerance)
   - Builds Stripe session with metadata (gclid, utm_*, configuration JSON, booking_*)
   - Returns { url: stripe_checkout_url }
4. Browser redirects to Stripe hosted checkout
5. Customer pays → Stripe redirects to /smartspace-payment-success?session_id=cs_live_…
6. Success page calls /api/verify-session?session_id=…
   - Reads Stripe session, returns { paid: true, amount, currency, email, phone }
7. Success page fires gtag conversion with transaction_id: sessionId
8. (async) Stripe POSTs checkout.session.completed to /api/webhooks/stripe
   - Verify signature
   - Idempotency check (in-memory + Apps Script orderId dedup)
   - logLead "Paid Order"
   - createBookingEvent (Calendly) if booking_date+slot in metadata
   - fireServerConversion with transactionId: sessionId
   - sendOrderNotification (Resend) → email Nigel
   - Returns 200 to Stripe
```

### D — Free consultation (`/services/free-consultation`)

```
1. Free-consultation page: user fills form
2. POST /api/checkout/free { items, attribution }
3. /api/checkout/free:
   - Calls createBookingEvent (Calendly, kind: consultation)
   - Resend → email Nigel
   - logLead
   - Redirects user to /smartspace-payment-success?free=true&e=…&p=…
4. Success page reads `free=true` → fires gtag with FREE_CONSULTATION conversion label + value 50
```

---

## 13. Admin dashboard

### Route

`https://smart-space.ie/admin/leads` (auth-gated by `ADMIN_KEY`)

### Code

| File | Role |
|---|---|
| [`src/app/admin/leads/page.tsx`](./src/app/admin/leads/page.tsx) | UI. Two views: "Upcoming" (Calendly-driven cards) + "All Records" (table). Click any row to expand "Customer answers" sub-section. |
| [`src/app/api/admin/leads/route.ts`](./src/app/api/admin/leads/route.ts) | API. Auth-gated by `ADMIN_KEY`. Rate-limited (10/min/IP). Aggregates leads from THREE sources in parallel, returns a unified `Lead[]` array with `details` (Q&A pairs). |

### Three lead sources merged into one view

1. **Stripe paid orders** — direct Stripe API call (`/v1/checkout/sessions?status=complete`)
   - For orders with `metadata.configuration` (post-2026-05-04): parsed JSON → details
   - For older orders: `recoverVariantFromPrice()` matches paid amount against the frozen Shopify variant catalogue → reverse-engineers what the customer chose. When two variants share the same price, both candidates surface with "OR" suffix.
2. **Calendly upcoming events** — direct Calendly API (`/scheduled_events?status=active&min_start_time=now&max_start_time=+90d`)
   - Each event's invitee Q&A is split per "Label: value" sub-field
3. **Google Sheet contact submissions** — Apps Script `doGet` with `READ_TOKEN`
   - Sheet `notes` column is split into Topic + Message + UTM source/campaign rows

### Auth

- `ADMIN_KEY` env var in Vercel
- Submitted via `Authorization: Bearer <key>` header (preferred) or `?key=` query (legacy fallback)
- Constant-time comparison via `timingSafeEqual`

---

## 14. Backup / redundancy / safety nets

### Listed by P0 → P2

| # | Risk | Mitigation | Status |
|---|---|---|---|
| 1 | Webhook idempotency in-memory only (cold-start = empty cache) | Apps Script `doPost` dedupes by Stripe orderId on the Sheet side; Calendly side has no dedup yet | ⚠️ Partial — Calendly can still get duplicates on retry |
| 2 | `logLead` failures are silent | `sendLeadLogFailureAlert` emails Nigel with full lead JSON | ✅ Live (2026-05-04) |
| 3 | Single-source-of-truth Sheet | Resend backup-email fallback (#2) gives Nigel the data even if Sheet is dead | ✅ Partial |
| 4 | Calendly token has no monitoring | Daily cron diagnostic catches "no Calendly events created for paid orders" | ✅ Live (2026-05-04) |
| 5 | `recover-bookings.mjs` is manual | Cron route `/api/cron/recover-bookings` runs daily 7am UTC, emails Nigel only when `futureRecoverable > 0` | ✅ Live (2026-05-04) |
| 6 | Stripe webhook secret rotation | Stripe Dashboard → Developers → Webhooks → notification email | ⚠️ Manual config required |
| 7 | Admin dashboard partial-failure (one source down) | Each fetch wrapped in try/catch — but no error banner yet | ⚠️ Silent on UI |
| 8 | Email-to-Nigel is the only push channel | None | 🚨 Unmitigated |
| 9 | DNS / domain | Domain registrar lock + auto-renew | ⚠️ Manual config |
| 10 | Conversion tracking adblockers / consent denials | Server-side pixel fire (Channel B) | ✅ Live |
| 11 | Stripe webhook URL 308 redirect | URL fixed to apex via Stripe API | ✅ Fixed |
| 12 | CSP blocks Google Ads beacons | `connect-src` extended with googleadservices + doubleclick | ✅ Fixed |

### Cron schedule

[`vercel.json`](./vercel.json):
```json
{ "crons": [{ "path": "/api/cron/recover-bookings", "schedule": "0 7 * * *" }] }
```

`CRON_SECRET` env var in Vercel — Vercel injects `Authorization: Bearer <CRON_SECRET>` automatically on cron-driven requests. Endpoint rejects everything else.

---

## 15. Environment variables — full table

| Variable | Service | Where used | Risk if missing |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe | Checkout creation, webhook verification, admin dashboard, recovery script | 🚨 Checkout breaks, dashboard partial |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signature verification | 🚨 All webhooks 400 — silent order loss |
| `RESEND_API_KEY` | Resend | All email | 🚨 No notifications |
| `RESEND_FROM_EMAIL` | Resend | "From" address | ⚠️ Email skipped with warning |
| `CONTACT_TO_EMAIL` | Resend | "To" address (defaults to nigel@smart-space.ie) | ⚠️ Falls back to default |
| `CALENDLY_PERSONAL_TOKEN` | Calendly | All Calendly API calls | 🚨 Bookings break |
| `CALENDLY_CONSULTATION_EVENT_TYPE_URI` | Calendly | Free consultation flow | ⚠️ Free consultation breaks |
| `CALENDLY_INSTALLATION_EVENT_TYPE_URI` | Calendly | Stripe-paid install bookings | ⚠️ Auto-booking breaks |
| `CALENDLY_EVENT_TYPE_URI` | Calendly | Legacy fallback | ⚠️ Pre-2026-04 fallback only |
| `GOOGLE_SHEET_WEBHOOK_URL` | Apps Script | logLead writes + dashboard reads | ⚠️ Lead-log failure alert fires (closed loop) |
| `GOOGLE_SHEET_READ_TOKEN` | Apps Script | Dashboard reads only | ⚠️ Dashboard misses contact enquiries |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | GA4 | gtag.js + server-side MP | ⚠️ GA4 disabled with warning |
| `GA4_API_SECRET` | GA4 | Server-side MP only | ⚠️ Server-side GA4 path no-ops gracefully |
| `NEXT_PUBLIC_GADS_CALL_LABEL` | Google Ads | Phone-call conversion config | ⚠️ Phone-call tracking disabled |
| `ADMIN_KEY` | Smart Space | `/admin/leads` auth | 🚨 Dashboard returns 500 |
| `CRON_SECRET` | Vercel cron | `/api/cron/*` auth | ⚠️ Cron returns 401 |

`NEXT_PUBLIC_*` vars are exposed to the client bundle at build time. All others are server-only.

---

## 16. What's NOT in this repo

- **SmartCareLiving** — separate site at `~/Projects/SmartCareliving/`. Different stack (vanilla HTML + GTM container, not Next.js + gtag). Shares the **same Google Ads account** so account-level settings apply to both. See [`~/Projects/SmartCareliving/CLAUDE.md`](../SmartCareliving/CLAUDE.md) for cross-project context.
- **Twilio SMS** — referenced in `INTEGRATIONS-SETUP.md` for SCL but **not used in Smart Space**. Could be added as a second push channel for paid orders.
- **Shopify orders** — Shopify is read-only for product data. No orders are created there. All orders go through Stripe.
- **Zapier Tables** — `ZAPIER_TABLES_ID` / `ZAPIER_TABLES_SECRET` env vars are listed but referenced nowhere in code. Dead — safe to remove.

---

## 17. Recent fixes — May 4 2026

Major outage day. All of the following fixes shipped in one session:

1. **Stripe webhook URL 308 redirect** — was `www.smart-space.ie`, returned 308 to apex, Stripe doesn't follow 3xx → every webhook delivery failed silently for 30 days. Changed to apex via Stripe API. (Caused Helen, Cecile, John to need manual recovery.)
2. **CSP blocking Google Ads beacons** — `connect-src` was missing `googleadservices.com`. Every gtag conversion was silently dropped at the browser. Added the host. (Caused 0 conversions over 30 days despite real customer purchases.)
3. **Apps Script orderId dedup** — added to `doPost` so Stripe webhook retries don't create duplicate Sheet rows.
4. **Customer-configuration capture** — every product page now passes `configuration` from cart → `/api/checkout` → Stripe `metadata.configuration` (JSON-encoded) → webhook → Sheet `notes` → dashboard "Customer answers" section.
5. **Variant recovery for past orders** — `recoverVariantFromPrice()` reverse-engineers Helen/John/Cecile's choices from amount paid against the frozen Shopify catalogue.
6. **Server-side conversion fire** — new `src/lib/server-conversions.ts` fires Google Ads pixel + GA4 MP from Vercel runtime. Bypasses client-side adblock + consent denials.
7. **GA4_API_SECRET** — added to enable the third tracking channel (server-side MP).
8. **Conversion `transaction_id` dedup** — contact + booking flows generate UUID, return it to client, both client + server fires use the same id → Google Ads counts one conversion not two.
9. **Enhanced Conversions for Leads method** — switched account-level setting from "Google Tag Manager" to "Google tag" (site uses gtag.js directly).
10. **Booking page Enhanced Conversions** — added `gtag('set', 'user_data', { email_address, phone_number })` (was missing entirely).
11. **logLead failure alert** — Resend email to Nigel when Sheet write fails. Closes silent-lead-loss hole.
12. **Daily recovery cron** — `/api/cron/recover-bookings` runs 7am UTC, emails Nigel only when there's something actionable.
13. **Favicon 404** — added `src/app/favicon.ico`.
14. **Customer-answers UI** — admin dashboard expanded card now renders Q&A pairs per lead (Stripe metadata + Calendly Q&A + Sheet notes split into Topic / Message / Source / Campaign).

---

*Last edited 2026-05-04. If you change a service in this list, update this file.*
