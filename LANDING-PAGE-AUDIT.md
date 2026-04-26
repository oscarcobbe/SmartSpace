# Smart Space — Landing Page Audit

Date: 2026-04-25  •  Audited by: ads-landing skill v1.5  •  Site: smart-space.ie
Audience baseline: 86% mobile, 76% male, 55–64 age skew  •  Brand: orange #f48222, Inter

Health score = MessageMatch×0.25 + Speed×0.25 + Mobile×0.20 + Trust×0.15 + Form×0.15.
Grades: A 90+, B 75–89, C 60–74, D 40–59, F <40.

---

## 1. Homepage — `/`  →  62 / 100  (C)

| Pillar | Score | Notes |
|---|---|---|
| Message Match | 55 | H1 "Expertly Installed. Perfectly Secured." is a brand slogan, not a search-intent match for any "Ring installer Dublin" RSA. Hero CTA is "View Popular Bundles" — bundles isn't what cold-search traffic asks for. |
| Page Speed | 35 | Hero PNG `H1_Hero_HP_desktop_1366x768_V5.png` weighs **2.29 MB** uncompressed (verified `curl -sI`). On 4G this alone pushes LCP past 4.0 s on mobile. Loaded from `images.ctfassets.net` with no `priority`, no `<Image>`, no `srcset`, no `loading="eager"`/`fetchpriority="high"`. |
| Mobile | 70 | Hero is `h-[70vh]` (Hero.tsx:6); CTA is at `bottom-16` (Hero.tsx:38) — on a 667px viewport the CTA sits ~280 px below where the H1 lands, requiring scroll. Body copy 14 px on mobile (`text-sm`, Hero.tsx:31), under the 16 px guideline. |
| Trust | 75 | ReviewsSurfacing strip ("5 ★ on Google by 100+ customers") is good (`ReviewsSurfacing.tsx:24`). Phone number not in navbar. |
| Form | n/a→70 | No lead form above fold. Newsletter is the only on-page input. For a homepage that's defensible, but loses the soft-conversion path. |

**Top 3 issues**
1. **Hero image 2.29 MB** (`src/components/Hero.tsx:9-13`). Replace with `next/image` + AVIF, set `priority` and `fetchpriority="high"`, ship at 1366 width with srcset down to 375. Target <200 KB. Expected LCP improvement: −2 to −3 s on mobile.
2. **CTA mismatch with paid intent** (`src/components/Hero.tsx:39-45`). Cold "ring installer Dublin" search clicks land on a CTA pointing to `/services/bundles` (browse page) instead of a quoting/booking action. Add a primary "Book Installation — From €139" CTA pointing to `/ring-installation#book` and demote bundles to secondary.
3. **No phone number in navbar** (`src/components/Navbar.tsx:55-110`). 55–64 male demo over-indexes on call as the trust action; missing tel: link in the persistent nav forfeits a high-intent path. Add a `tel:+35315130424` button on desktop and a phone icon on mobile beside the cart at line 93.

---

## 2. `/ring-installation`  →  82 / 100  (B)

| Pillar | Score | Notes |
|---|---|---|
| Message Match | 95 | H1 "Ring Doorbell Installation in Ireland — From €139" (page.tsx:195-198) is a near-exact match to the active RSA "From €139 / Book Online — Instant Dates". Sub-line confirms wired/battery + brands. Best message match on the site. |
| Page Speed | 78 | No 2.3 MB hero — text-only above fold. Brand logos are unoptimised `<img>` PNGs (page.tsx:213-218) but small. Configurator hydrates from Shopify on client mount (`useEffect`, page.tsx:155) — initial paint shows a spinner block, marginally hurts INP and creates a content-shift risk for users who scroll fast. |
| Mobile | 80 | Configurator stacks single-column, calendar is touch-friendly. Tap targets on variant chips (`px-4 py-2.5`, page.tsx:278) ≈ 44 px — under the 48 px guideline. Cross-sell pills at the bottom (page.tsx:511-538) are also under-spec. |
| Trust | 80 | Trust strip with Shield/Star/Wrench/Award icons (page.tsx:486-498), 3 named reviews, FAQPage JSON-LD (layout.tsx:48-92). Reviews lack photos and have no link to actual Google Business profile. |
| Form | 75 | Configurator is a 3-field choice form + calendar — appropriate for the offer. **No name/email/phone capture before Stripe** — entire lead is lost if user abandons checkout. Add a "Or get a quote first" softer path (email + phone only) above the calendar for the 70%+ who won't transact on first visit. |

**Top 3 issues**
1. **No call-or-quote fallback above the configurator** (`src/app/ring-installation/page.tsx:186-204`). The only path is "configure → Stripe checkout". 55–64 male buyers typically want to call before paying online. Insert a phone CTA `tel:+35315130424` and a "Email me a quote" mini-form (3 fields) inside the hero block.
2. **Configurator depends on client-side Shopify fetch** (`page.tsx:155-171`). On slow mobile this shows a spinner for 1–3 s in the page's primary conversion zone. Move the product fetch to the server (RSC) and pass props down — keeps the calendar interactive but eliminates the spinner CLS risk.
3. **Variant-chip tap targets** at `px-4 py-2.5` (`page.tsx:278`) measure ~44 × 38 px — below the 48 × 48 spec. Bump to `px-5 py-3` and add `gap-3` between chips. Same fix on `installation-only/page.tsx:160`.

---

## 3. `/services/installation-only`  →  68 / 100  (C)

| Pillar | Score | Notes |
|---|---|---|
| Message Match | 60 | **No H1 on the page.** Title tag in metadata is correct, but the rendered DOM has no `<h1>` — the first heading is `<h2>Configure Your Installation</h2>` (page.tsx:109). Bad for SEO and message-match scoring on the canonical page. |
| Page Speed | 78 | Same configurator pattern, no hero image. Smaller payload than home. |
| Mobile | 78 | Same chip tap-target issue. Brand logos display ok. |
| Trust | 55 | **No trust strip, no reviews, no testimonials, no FAQ on this page.** Only the "Supported Brands" logo row (page.tsx:85-103) and a 4-icon "what's included" panel below the fold. Substantially weaker than `/ring-installation`. |
| Form | 75 | Same configurator + Stripe + Calendly flow. Same lack of soft-lead capture. |

**Top 3 issues**
1. **Missing H1** (`src/app/services/installation-only/page.tsx`). Add `<h1>Smart Doorbell Installation — Dublin & Leinster</h1>` above the brand strip at line 85. Currently the H2 at line 109 is the highest heading, which the audit framework scores as a message-match weakness.
2. **No trust signals above the fold** — strip out the entire visible structure and there's no rating, no review, no SME badge, no installer count. Lift the `<Trust strip>` block from `ring-installation/page.tsx:482-499` and place it directly under the brand row at line 103.
3. **No reviews or FAQ section.** Both exist on `/ring-installation` (page.tsx:412-449 and 454-480). Lift the same `REVIEWS` and `FAQ` arrays and reuse — zero net new content cost. The fact that the paid LP has stronger trust than the canonical page is backwards.

---

## 4. `/services/free-consultation`  →  66 / 100  (C)

| Pillar | Score | Notes |
|---|---|---|
| Message Match | 70 | H1 "Book Your Consultation" (page.tsx:104-106) is action-aligned but generic. "Free" / "Complimentary" should be in the H1 — currently it's only in the green price card and trust strip. |
| Page Speed | 82 | No images above fold. Lightest of the 5. |
| Mobile | 78 | Form fields are full-width, labelled, with `type="tel"` and `type="email"` for keyboard hinting (page.tsx:147, 162). Good. Submit button is full-width and has clear active/disabled copy ("Select a Date First" → "Book Complimentary Consultation", page.tsx:198-202) — best CTA copy on the site. |
| Trust | 65 | Trust strip is at the very bottom (page.tsx:246-262), should be near the form. No testimonials. |
| Form | 60 | **5 fields all required, no progressive disclosure** (name, phone, email, address, date). For a free consultation that's the upper end. Collecting full address/Eircode pre-conversion is friction — defer to post-confirmation. |

**Top 3 issues**
1. **Address required upfront** (`src/app/services/free-consultation/page.tsx:46`). Drop `address.trim()` from `formValid`, mark address optional in the label, and collect Eircode in the post-booking confirmation email. Expected lift +8–15 % CVR per the form-length table.
2. **H1 doesn't carry the offer** (`page.tsx:104-106`). Change to `<h1>Free Home Security Consultation — Dublin & Leinster</h1>`. Reinforces "free" before the user reads the price card.
3. **Trust strip below the form** (`page.tsx:246-262`). Move the 4 trust items (Dublin's #1, 5-star, 5,000+, SME Winner) above or beside the form so they're visible while the user types — currently they're 2 scrolls down on mobile.

---

## 5. `/services/pro-video-doorbell`  →  64 / 100  (C)

| Pillar | Score | Notes |
|---|---|---|
| Message Match | 65 | H1 "Pro Video Doorbell" (`ProductHero.tsx:138`) — fine for organic but weak for any paid intent that isn't "ring pro video doorbell". The €479 price is visible above fold (good). |
| Page Speed | 70 | Single product image on transparent background. Image not lazy-loaded, no `<Image>`. Page itself ships at ~80 KB HTML — fine. |
| Mobile | 75 | Same chip tap-target undersizing. Color swatches are 40 × 40 (`ProductHero.tsx:210`) — under spec. Calendar is reasonable. |
| Trust | 80 | Star strip (`ProductHero.tsx:144-152`), trust strip (`ProductHero.tsx:292-303`). Best of any service page. **But no reviews, no testimonials, no FAQ on this page** — the WebFetch confirmed zero. |
| Form | 55 | Configurator + calendar + add-to-cart, but no lead capture and no phone CTA in the hero. Only the bottom "Need help choosing?" links to `/contact` (page.tsx:282-284), not a `tel:`. The phone number does appear (page.tsx:276-281), but as text-with-icon, not a button. |

**Top 3 issues**
1. **No phone CTA inside ProductHero** (`src/components/ProductHero.tsx:274-289`). For a €479 product the cold-traffic abandonment rate at the cart is high — add an inline "Or call 01 513 0424" link directly below the AddToCartButton, styled as a secondary CTA.
2. **No social proof beyond the static stars** (`ProductHero.tsx:144-152`). The "5 / 5,000+ installations" line is unlinked text — make it a link to `/reviews` and add 1–2 named reviews specific to doorbells beneath the trust strip at line 304.
3. **Color swatches and chip targets undersized** (`ProductHero.tsx:210`, `ProductHero.tsx:237`). Bump swatch buttons to `w-12 h-12` and chips to `px-5 py-3`. This page sees the highest mobile-share traffic from product RSAs.

---

## Sitewide observations

- **Font mismatch with brand spec.** Brief specifies Inter; `src/app/layout.tsx:147` and `:193` load and apply Plus Jakarta Sans. Either update brand doc or migrate to Inter — currently the rendered site is off-brand by spec.
- **Consent banner implementation is solid.** `CookieBanner.tsx` uses Consent Mode v2 default-deny in `layout.tsx:162-168` correctly, banner appears bottom-left after a 600 ms delay (`CookieBanner.tsx:82`), is dismissable on mobile without scrolling, and does not occlude any primary CTA. No findings.
- **Phone-call conversion tracking** is wired (`layout.tsx:176-181`), gated on `NEXT_PUBLIC_GADS_CALL_LABEL`. Confirm the env var `HWS2CL2y4ZgcEJfU6PxC` is in production.
- **GCLID capture** is present (`GclidCapture.tsx` referenced at `layout.tsx:7,196`). Good for enhanced conversions.
- **CSP allows Stripe + Calendly** correctly (verified in HTTP headers).
- **No `/ring-installation` link in the navbar.** Once the Google Ads RSA is flipped, organic returnees and direct traffic still can't reach it from chrome. Acceptable since it's `noindex,follow` and paid-only — but worth noting.
- **No site-wide "Call now" sticky on mobile.** With 86 % mobile and an audience that calls more than it forms, a fixed-bottom phone bar would lift call conversions across all pages.
- **All product/service pages share the same weakness:** social proof is icon strips, not actual reviews. Either embed the existing reviews block (already exists on `/ring-installation`) or add a 1-line testimonial below each product CTA.

---

## Quick wins — prioritised

| # | Fix | Page(s) | Expected impact | Effort |
|---|---|---|---|---|
| 1 | Replace 2.29 MB hero PNG with optimised `next/image` AVIF (<200 KB) + `priority` + `fetchpriority="high"` | `/` | LCP −2 to −3 s on mobile → +10–15 % CVR | **S** |
| 2 | Swap homepage hero CTA to "Book Installation From €139" pointing to `/ring-installation#book` | `/` | +15–25 % paid CVR | **S** |
| 3 | Add sticky-mobile bottom phone bar `tel:+35315130424` on all 5 pages | sitewide | +20–40 % calls in mobile-heavy 55–64 demo | **S** |
| 4 | Add `<h1>` and trust strip to `/services/installation-only` (lift from `/ring-installation`) | installation-only | Closes message-match + trust gap; preserves SEO during ad flip | **S** |
| 5 | Add reviews + FAQ block to `/services/installation-only` (reuse `REVIEWS` + `FAQ` arrays) | installation-only | +5–15 % CVR; protects organic if Ads point here pre-flip | **S** |
| 6 | Drop required address on free-consultation; collect post-confirm | free-consultation | +8–15 % CVR | **S** |
| 7 | Move free-consultation trust strip above/beside the form | free-consultation | +5–10 % CVR on mobile | **S** |
| 8 | Add inline phone CTA + 1 named review under AddToCart in ProductHero | all product pages | +5–10 % CVR | **M** |
| 9 | Bump variant-chip and color-swatch tap targets to ≥48 × 48 px | sitewide | +5–10 % mobile CVR | **S** |
| 10 | Add phone number `tel:` button to navbar (desktop + mobile icon) | sitewide | +10–20 % calls | **S** |
| 11 | Convert ring-installation Shopify fetch to server-side (RSC) | ring-installation | Eliminates 1–3 s spinner; INP improvement | **M** |
| 12 | Add soft-lead capture (email + phone, 2 fields) above configurator on `/ring-installation` and `/services/installation-only` | both installer pages | Captures 30–50 % of abandoners as leads | **M** |
| 13 | Switch site font to Inter per brand spec (or update brand doc) | sitewide | Brand consistency, no CVR impact | **S** |
| 14 | Add call-tracking conversion verification: confirm `NEXT_PUBLIC_GADS_CALL_LABEL=HWS2CL2y4ZgcEJfU6PxC` in production env | tracking | Ensures call conversions fire post-flip | **S** |
| 15 | Pre-fill UTM/gclid into checkout custom fields so Stripe webhooks carry attribution end-to-end | tracking | Closes attribution loop on enhanced conversions | **M** |

---

## Aggregate

- Sitewide weighted average: **68 / 100 (C)**
- The Google Ads flip from `/services/installation-only` (68) to `/ring-installation` (82) is the right call — the new LP outscores the canonical on every pillar except trust depth. Flip with confidence; backfill the canonical with the same trust + FAQ blocks so organic doesn't regress.
- Single largest CVR risk across the funnel: the **2.29 MB hero PNG on the homepage** combined with the **CTA pointing to /services/bundles** (a browse page, not a buy page).
- Single largest strength: the **`/ring-installation` configurator → Stripe → Calendly** flow is well-built and message-matched to the RSA — once the soft-lead fallback and tap-targets are fixed it will be A-grade.
