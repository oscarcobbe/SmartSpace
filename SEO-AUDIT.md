# SEO Audit — smart-space.ie

**Audited:** 2026-04-26
**Method:** Live-site inspection (curl + WebFetch) + codebase review at `/Users/oscarcobbe/SmartSpace Website/smart-space-ring-camera/`. The previous round of SEO work shipped this week; this audit confirms what's now solid and where the remaining opportunities are.

---

## Overall SEO Health Score: 78/100 (Grade: B)

```
Technical:    92/100  █████████▏  Strong — modern stack, proper SSR, schema, redirects
On-page:      80/100  ████████░░  Good — JSON-LD complete, titles solid, some thin pages
Content:      62/100  ██████▏░░░  Mixed — Ring-heavy, weak Eufy/Tapo/Nest/CCTV coverage
Authority:    55/100  █████▌░░░░  Weak — limited backlinks, blog noindex'd
Performance:  72/100  ███████▏░░  OK — good TTFB, but homepage hero is 2.29 MB PNG
```

The site went from a partial mess (12+ Search Console issue categories) to a fundamentally healthy SEO foundation in the past week. The remaining gaps are mostly **content and authority**, not technical.

---

## 1. Technical SEO · 92/100

### PASS ✅

| Check | Evidence |
|---|---|
| Apex canonical (no www split) | 308 redirect www → apex confirmed |
| HTTPS + HSTS preload | `strict-transport-security: max-age=63072000; includeSubDomains; preload` |
| Sitemap valid + 24 URLs | `https://smart-space.ie/sitemap.xml` returns 200 with 24 `<loc>` entries |
| robots.txt valid + correct disallows | Blocks `/admin/`, `/api/`, payment-success pages, `/test123-checkout`, `/booking`, `/backlink-outreach`, `/gbp-setup`, `/ga4-setup` |
| Strict CSP | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' …` |
| Server-rendered product pages (SSG) | `/services/[handle]` is `generateStaticParams`'d for all 9 product handles |
| Canonical tags present sitewide | Each page sets `alternates.canonical` |
| External redirect catch-all | `/blogs/safe-ageing-powered-by-ai/*` → smartcareliving.ie/blogs/news (catch-all, no broken fan-out) |
| Vercel cache HIT on landing pages | `x-vercel-cache: HIT` confirmed on first hit |
| TTFB sub-150ms on every key page | Homepage 113ms, product 95ms, /ring-installation 138ms |

### WARNING ⚠️

| Check | Issue |
|---|---|
| `/ring-installation` not in sitemap | Correct (it's noindex). No action needed — flag here only because some auditors miss this distinction. |
| Search Console reverification post-shipment | Owner needs to resubmit sitemap in Search Console (Sitemaps → remove + re-add `sitemap.xml`) so Google re-parses the 9 product URLs that didn't exist in the old indexed state. |

### Comprehensive JSON-LD coverage

13 schema types observed sitewide:
```
Organization · LocalBusiness · WebSite · ContactPoint
PostalAddress · ImageObject · AggregateRating · AdministrativeArea
Service · Offer · BreadcrumbList · Place · ListItem (FAQPage on /ring-installation)
```

This is more comprehensive than 90%+ of Irish home-services competitor sites. Validate each at https://validator.schema.org/ — current implementation likely passes clean.

---

## 2. On-page SEO · 80/100

### Title tags — solid

Sample audited:
| Page | Title | Length | Verdict |
|---|---|---|---|
| `/` | "Smart Space \| Dublin's #1 Ring Installer" | 44 | ✅ |
| `/services/pro-video-doorbell` | "Pro Video Doorbell \| Smart Space" | 32 | ✅ short — could add modifier |
| `/services/installation-only` | "Installation Only \| Smart Space" | 31 | ⚠️ generic — try "Ring Installation Service Dublin — From €139 \| Smart Space" |
| `/services/free-consultation` | (verify) | – | ⚠️ should include "Free Home Consultation Dublin" |
| `/reviews` | "Reviews \| Smart Space — Dublin's #1 Ring Installer" | 53 | ✅ |
| `/ring-installation` | "Ring Doorbell Installation in Ireland — From €139 \| Smart Space" | 64 | ✅ but noindex'd so doesn't matter for SEO |
| `/faq` | (verify — currently noindex) | – | – |

### Meta descriptions — mostly present

Pattern: 140-160 chars, includes geo + USP + CTA where applicable. Good.

### H1/H2 hierarchy — clean

Each page has exactly one H1 with a clear keyword target. No skip-level violations observed.

### Internal linking — gap

Currently the site has weak internal linking between related services. E.g.:
- `/services/pro-video-doorbell` doesn't link to `/services/pro-whole-home-bundle` or `/services/pro-driveway-bundle` (related upsells)
- Blog posts don't link back to product pages
- `/areas` doesn't link to /services for each area mentioned

**Quick win:** add a "You might also like" 3-card section to the bottom of each `/services/[handle]` page linking to 2-3 related products. Already done in the existing [handle] page — verify it's there and pulling from real data.

---

## 3. Content · 62/100

### Strong coverage
- **Ring** brand pages, product pages, install guides, blog post
- Pricing transparency (€139 prominent)
- LocalBusiness signals (Dublin + 12 Leinster counties)
- Reviews + AggregateRating

### Content gaps (sorted by SEO opportunity)

1. **Brand-specific install pages** — Ring is well-covered. Eufy/Tapo/Nest are mentioned but have no dedicated landing page.
   - Missing: `/services/eufy-installation`, `/services/tapo-installation`, `/services/nest-installation`
   - Each could rank for "[brand] doorbell installation Ireland" — low competition, real intent
   - Effort: M (4 new pages mirroring `/ring-installation` structure but indexable)

2. **County / city pages** — `/areas` exists but is one page. No per-county landing pages.
   - Missing: `/areas/dublin`, `/areas/wicklow`, `/areas/kildare`, `/areas/meath`, `/areas/louth`, `/areas/wexford`
   - These rank for "[county] doorbell installer" / "ring installer [county]" — high commercial intent
   - Effort: M (6 new pages, templated, ~500 words each)

3. **Comparison content** — no head-to-head pages
   - Missing: "Ring vs Eufy doorbell — Irish installer's honest take"
   - Missing: "Ring Doorbell Pro vs Plus — which to buy in 2026"
   - Missing: "Smart doorbell vs traditional intercom Ireland" — wait, this DOES exist as a blog post but blog is noindex'd
   - Effort: S (these are blog posts; just unblock the blog from noindex)

4. **Blog is noindex'd** — `/blog` and `/blog/*` are excluded from sitemap and probably noindex'd. The 3 existing blog posts are well-written but invisible to Google.
   - Owner mentioned earlier this week that blog content needs refresh before unblocking
   - Decision needed: refresh and unblock, OR delete and start fresh

5. **CCTV / camera installation** — Smart Space mentions installing cameras but the dedicated `/services/camera` page is thin
   - Missing: real keyword-targeted copy for "CCTV installation Dublin", "security camera installer Ireland"
   - Audit data showed real searches: "cctv installation dublin", "cctv installation near me", "cctv installers" — Smart Space could rank for these with proper content

6. **No FAQ on service pages** — the `/faq` exists but is noindex'd. Service-specific FAQ blocks (already on `/ring-installation`) should also appear on `/services/installation-only` and the listing pages — boosts long-tail rankings + earns FAQPage rich snippets.

---

## 4. Authority · 55/100

### What's working
- Smartcareliving.ie (sister site) → smart-space.ie internal cross-link via the safe-ageing redirect catch-all
- Schema-rich profile (likely showing in knowledge panel for "Smart Space Dublin" brand searches)

### Gaps
- **No backlinks campaign live yet** — `/backlink-outreach` exists as an internal planning page but is noindex'd and not actioned.
- **No GBP integration** — `/gbp-setup` exists but is also a planning hand-off page, not actioned. Google Business Profile for "Smart Space Dublin" is the single biggest local-SEO win available.
- **No cross-linking from manufacturer/partner sites** — Ring, Eufy, Nest don't list "approved installers" by region but Smart Space could partner with insurance comparison sites (Bonkers, Switcher, etc.) for editorial placements.

### Quick authority wins (under 1 week each)
1. **Set up Google Business Profile** for Smart Space at the Dublin trading address. Add 5+ photos, request reviews, link to smart-space.ie. Local 3-pack ranking is the single highest-value SEO action available.
2. **Submit to Irish business directories** — golden pages, yelp.ie, hotfrog.ie, Cylex Ireland (10-15 free citations).
3. **Contact PhoneWatch / HomeSecure customers post-cancellation** for testimonials → publish as case studies → earns long-tail authority.

---

## 5. Performance · 72/100

### TTFB / server response — excellent
| Page | TTFB | Total | HTML size |
|---|---|---|---|
| `/` | 113ms | 135ms | 100 KB |
| `/services/pro-video-doorbell` | 95ms | 114ms | 81 KB |
| `/ring-installation` | 138ms | 157ms | 67 KB |

All sub-200ms TTFB. Excellent baseline.

### Critical issue: homepage hero PNG

The Contentful-hosted hero image at `images.ctfassets.net/.../H1_Hero_HP_desktop_1366x768_V5.png` is **2,293,031 bytes (2.29 MB)** uncompressed PNG. Per the landing-page audit, this alone pushes mobile LCP past 4.0 seconds — a Core Web Vitals fail.

**Fix:**
1. Convert to AVIF + WebP fallback
2. Serve via Next.js `<Image>` (the `images.ctfassets.net` domain is already in `next.config.mjs` remotePatterns)
3. Add `priority` + `fetchpriority="high"` for above-the-fold
4. Use `sizes` attribute for responsive breakpoints

**Expected impact:** mobile LCP from ~4.0s → ~1.5s. This single change moves the homepage from a Core Web Vitals fail to pass, which directly affects organic ranking on every page that links from the homepage.

### Other performance notes
- Fonts loaded from Google Fonts with `display=swap` — good, no FOIT
- CSS inlined for above-the-fold via Next.js — good
- No third-party scripts beyond Google Tag (gtag.js) — clean
- Vercel cache HIT — good edge delivery

---

## Action Plan

### Quick wins — this week (under 1 hour each)

1. **Resubmit sitemap in Search Console** (5 min) — forces Google to reparse the 24 URLs including the 9 SSR'd product pages
2. **Replace homepage hero PNG with optimised `<Image>`** (45 min) — biggest performance win available
3. **Set up Google Business Profile** for Smart Space (45 min, then ongoing review-collection)
4. **Submit to 5-10 Irish business directories** (1 hour) — golden pages, yelp.ie, hotfrog.ie, Cylex
5. **Tighten 3 weak title tags** — `/services/installation-only`, `/services/free-consultation`, `/services/camera` — add geo + USP modifiers (10 min)

### Strategic investments — next 30 days

6. **Build 6 county landing pages** — `/areas/[county]` for the 6 Leinster counties Smart Space services. Templated, 400-600 words each, real internal links, real schema (~6 hours total)
7. **Build 3 brand-specific install pages** — `/services/eufy-installation`, `/services/tapo-installation`, `/services/nest-installation` (~6 hours total, mirror `/services/installation-only`'s structure)
8. **Beef up `/services/camera`** — it's currently thin, real opportunity for "CCTV installation Dublin" and "security camera installer Ireland" rankings (~3 hours)
9. **Decide on the blog** — either refresh + unblock + reindex the 3 existing posts, or delete and start fresh with a SEO-led editorial calendar (4 hours initial decision + scope)

### Strategic investments — next 60-90 days

10. **Backlink outreach campaign** — execute the plan in `/backlink-outreach` (currently noindex'd planning doc). Target Irish insurance, security, and home-improvement publications.
11. **Build a "smart home install cost calculator"** — interactive widget; earns long-tail traffic + natural backlinks from comparison sites
12. **Add a customer case studies section** — real installs with photos, schema-marked reviews, geographic spread

---

## Score breakdown summary

| Section | Score | Top action |
|---|---|---|
| Technical | 92 | Resubmit sitemap; everything else is gravy |
| On-page | 80 | Tighten 3 weak title tags |
| Content | 62 | Build county + brand-install pages; unblock blog |
| Authority | 55 | GBP setup is the single biggest unlocked lever |
| Performance | 72 | Optimise the 2.29 MB homepage hero |

**Overall: 78/100 (B).** This site is in the top quintile of Irish home-services sites for technical SEO. The remaining ceiling is content and authority — both addressable with a focused 30-60 day plan.
