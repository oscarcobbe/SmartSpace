# Tuesday 28 Apr 2026 — Action Brief

Two tasks for the calendar block. Total time: ~75 min. No code work — both are user actions in browser dashboards.

| Task | Time | Where |
|---|---|---|
| 1. Search Console resubmit | ~15 min | search.google.com/search-console |
| 2. Google Business Profile setup | ~60 min | business.google.com + your site's /gbp-setup page |

---

## Task 1 — Search Console resubmit (~15 min)

**Why:** All the indexing fixes (SSR product pages, collapsed redirects, sitemap with 9 product URLs, noindex on internal pages) are already deployed. Google needs to be told to re-crawl. Without this, the fixes sit there unused for weeks while Google catches up at its own slow pace.

### Steps

1. Open https://search.google.com/search-console
2. Confirm property is **smart-space.ie** (top dropdown)

**Resubmit the sitemap:**

3. Left sidebar → **Sitemaps**
4. If `sitemap.xml` is already listed, click the three dots → **Remove sitemap**
5. Then in the "Add a new sitemap" box, type `sitemap.xml` → **SUBMIT**
6. You should see "Success" with 32 discovered URLs

**Request indexing on top 6 URLs (one at a time):**

7. Top of page → URL Inspection bar → paste each URL below → press Enter → wait for the report → click **Request Indexing**
8. Repeat for each:
   - `https://smart-space.ie/`
   - `https://smart-space.ie/services/plus-video-doorbell`
   - `https://smart-space.ie/services/pro-video-doorbell`
   - `https://smart-space.ie/services/pro-whole-home-bundle`
   - `https://smart-space.ie/services/pro-driveway-bundle`
   - `https://smart-space.ie/services/pro-floodlight-cam`

Don't request indexing on more than 6 in one session — Google rate-limits this and the rest get queued anyway.

**Check the indexing report:**

9. Left sidebar → **Pages** (under Indexing)
10. Note today's numbers as a baseline so you can see improvement in 14 days:
    - "Indexed" count: ___
    - "Page with redirect — Failed": ___
    - "Soft 404": ___
    - "Crawled - currently not indexed": ___

### Expected results

- **Day 3:** URL Inspection on `/services/pro-whole-home-bundle` shows "Indexing in progress" or "URL is on Google"
- **Day 14:** "Page with redirect — Failed" drops below 20 (was 125), Soft 404 drops to 0–1, Indexed pages climb past 30

If results don't move after 14 days, ping me — there's something else blocking that we'll need to debug.

---

## Task 2 — Google Business Profile setup (~60 min)

**Why:** Your single biggest gap. GBP listings show up in Google Maps results and the local pack ("Ring installer near me" → 3-card map result at the top of Google). Right now you're invisible there. Every competitor (Phonewatch, HomeSecure, local installers) has a GBP. Every install you don't capture from a local-pack search is going to one of them.

### The complete walkthrough is already on your site

Open: **https://smart-space.ie/gbp-setup** (it's noindexed, internal only)

That page has the full step-by-step:
- Creating / claiming the profile
- Service-area business setup (12 Leinster counties pre-listed)
- Business details (phone, hours, appointment link — pre-filled values to paste)
- Description (pre-written paragraph to paste)
- Services list (7 services with prices)
- Photo strategy (target mix of 10+ photos)
- Verification process
- Review-request email template

### Critical decisions to make BEFORE you start

1. **Which Google account owns the listing?**
   - Recommended: nigel@smart-space.ie (Workspace) — keeps it tied to the business
   - Alternative: a personal Gmail you already use — only if you need to share access broadly later

2. **Service-area business, NOT storefront**
   - When asked "do customers visit your location?" → **No**
   - You'll still need a real address for verification (postcard goes there) but it stays hidden from public profile

3. **Photos**
   - Have 10+ photos ready before you start, or you'll lose momentum mid-flow
   - 5 in-progress install shots, 3 finished installs, 1 team photo, 1 van/branded vehicle, 1 logo (use `/Logo1.png` from the website)
   - Avoid stock — Google detects it and demotes the listing

4. **Verification**
   - Most likely: postcard to your business address (5–14 days)
   - Sometimes: phone call or video verification (instant)
   - Listing won't appear in Maps until verified

### Skip the Search Console section on /gbp-setup

That page also covers Search Console setup, but you've already done that (the indexing reports show data). Just do the GBP section.

---

## After Tuesday

- **Wed 29 – Fri 1 May:** wait for GBP postcard if that's your verification method
- **Sat 2 May (calendar block):** GA4 MCP install (parked — only revisit if needed)
- **Day 7 post-deploy (~3 May):** check Search Console — Quality Score on landing pages should start ticking up if indexing is reprocessing
- **Day 14 post-deploy (~10 May):** Search Console "Pages" report should show the indexing improvements listed above

---

## What's already done (so you don't redo it)

- ✅ Search Console indexing fix code shipped (commit `55b205f`)
- ✅ All 9 product pages SSR-rendered (Googlebot sees full HTML)
- ✅ All 5 listing pages SSR-rendered
- ✅ 29 broken external redirects collapsed to 1 catch-all
- ✅ noindex meta on 4 internal pages (admin/leads, test123-checkout, both payment-success pages)
- ✅ Sitemap includes 9 product URLs
- ✅ Production verified: pro-whole-home-bundle returns full title + Service JSON-LD + product specs in initial HTML

The deployed site is ready. Tuesday is just the resubmit-and-wait phase.
