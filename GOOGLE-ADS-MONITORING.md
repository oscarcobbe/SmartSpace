# Google Ads Monitoring Log

Ongoing record of CSV-export snapshots, baseline metrics, and what changed between
exports. Each snapshot block is dated; do not delete old ones — they're how we'll
see whether changes worked.

---

## Snapshot 1: Apr 28, 2026 — covering Mar 29 → Apr 27 (30 days)

### Top-line health

| Metric | Value | Benchmark | Verdict |
|---|---|---|---|
| Spend | €394.61 | €350/mo budgeted | On budget |
| Impressions | 8,838 | n/a | — |
| Clicks | 268 | n/a | — |
| CTR | 3.03% | ≥6.66% pass / 3-6.66% warn / <3% fail | ⚠️ Warning |
| Avg CPC | €1.47 | ≤€4.26 pass | ✅ Good |
| **Conversions** | **0** | n/a | 🚨 **BROKEN** |
| Cost / conv | — | — | n/a (no conversions) |
| Optimization score | 94.7% (Installer) | ≥80% | ✅ Good |

### Critical Finding #1: 0 conversions is a CVR problem, not a tracking bug
*(Updated Apr 28 after Diagnostics review)*

**Initial hypothesis was wrong.** Diagnostics dashboard confirms:
- **Website-fired conversions = healthy** (0 alerts on Website tag)
- **Enhanced Conversions = "Recording Enhanced Conversions"** — gtag IS being received
- 2 broken Import conversions (Confirmed SmartGuardian Bookings + Installations) are
  **SmartCareLiving offline-upload conversions** — irrelevant to active Installer April 2026

So tracking infrastructure works. The 0 conversions in 30 days is real:
- 268 ad clicks → 0 paid Stripe orders, 0 free consultation bookings
- Real conversion rate: **0%** (vs. industry benchmark 7.52% for local services)

**Why the 0% CVR:**

1. **Wrong landing page.** Only 9 of 268 clicks (3%) reached `/ring-installation`
   (the dedicated paid LP). 91% went to homepage, /services, or legacy URLs that
   weren't designed for paid traffic.
2. **Maximize Clicks bidding with no conversion history** = algorithm optimizes for
   cheap clicks, not converting users. No signal to filter out tire-kickers.
3. **Top search keywords are research-intent, not buy-intent.** "ring doorbell"
   (49 impr, generic) and "ring chime" (10 impr, accessory) capture browsing,
   not buying.
4. **Sitelinks expanded reach but diluted signal.** Sitelinks like "View All Cameras"
   (118 clicks to /services) and "Clear Pricing" (80 clicks to /services/installation-only)
   ate budget without funneling to the conversion-optimized LP.

**Verification step (do this once):** open in incognito browser:
`https://smart-space.ie/smartspace-payment-success?free=true&e=test@smartspace.test&p=0871234567`

If a Free Consultation conversion appears in Google Ads "All conversions" column within
24h, tracking is verified working. (Don't worry — this URL doesn't actually book a
consultation, it just fires the gtag conversion tag.)

### 🟡 Critical Finding #2: €132.94 wasted on a paused legacy ad

The Paused responsive search ad in `Installer April 2026` had final URL
`https://smart-space.ie/pages/your-5-star-rated-all-things-ring-installer` —
a legacy URL that now 301-redirects to `/` per `next.config.mjs`.

Before pause: 81 clicks @ €1.64 = **€132.94 down the drain** routing through a redirect
that Googlebot dislikes (the destination is the homepage, not a focused LP).

**Action:** delete the paused ad entirely (don't just leave it paused — it clutters the
ad strength signal). All Installer April 2026 traffic should go to `/ring-installation`
which is the dedicated paid LP.

### Critical Finding #3: 0% of impressions go to the dedicated /ring-installation LP

| Landing page | Clicks | Spend |
|---|---|---|
| `https://www.smart-space.ie/` (homepage variants) | 159 | €202.57 |
| `https://smart-space.ie/pages/your-5-star...` (legacy) | 54 | €86.34 |
| `https://www.smart-space.ie/services/installation-only` | 30 | €61.29 |
| `https://www.smart-space.ie/services` | 9 | €14.73 |
| `https://smart-space.ie/ring-installation` (dedicated paid LP) | **9** | **€13.33** |
| Other (camera, doorbell, bundles, contact, about) | 7 | €14.04 |

The `/ring-installation` paid landing page that was built specifically for this campaign
got **3% of clicks**. Most traffic goes to homepage or sitelinks pointing elsewhere.

This is partly by design (sitelinks expand reach) but the imbalance suggests the main
ad creative's Final URL might be sending less traffic to /ring-installation than expected.

**Action after conversion fix:** A/B which final URL converts better — homepage vs
/ring-installation. Without conversions tracked, we can't run that test.

### Competitive: auction insights

| Competitor | Their Impression Share | Their position above you | Your outranking share |
|---|---|---|---|
| amazon.ie | 30.98% | 44.80% | 11.33% |
| ring.com | 21.69% | 78.95% ⚠️ | 11.01% |
| phonewatch.ie | 22.09% | 53.08% | 11.91% |
| homesecure.ie | 11.93% | 35.29% | 13.05% |
| networksecurity.ie | <10% | 41.28% | 13.43% |
| **You (smart-space.ie)** | **13.82%** | — | — |
| eufy.com | <10% | 50.00% | 13.41% |

**Reading:** ring.com is above you 79% of the time when you both show. That's the manufacturer
out-bidding their own installer. Phonewatch is above you 53% of the time and outranks you
on impression share. You're 4th in the auction behind Amazon, Phonewatch, Ring.

**Implication:** higher CPCs and lower position than ideal. To climb, either bid more
aggressively (after conversions track) or improve Quality Score via better landing-page
relevance and CTR.

### Time of day / day of week patterns

**Best hours for clicks:** 8-11 AM (25-31 clicks), 1-6 PM (17-23 clicks)
**Worst hours:** 9 PM - 6 AM (zero)

**Best days for clicks:**
| Day | Clicks |
|---|---|
| Wednesday | 107 |
| Tuesday | 63 |
| Saturday | 21 |
| Friday | 20 |
| Thursday | 19 |
| Monday | 22 |
| Sunday | 16 |

**Note:** the Wed=107 cluster is mostly explained by the Apr 14-15 launch spike (32+71 clicks).
Real ongoing pattern probably looks like: weekdays > weekends, mornings > evenings. Too early
to set ad-schedule bid adjustments — needs more data.

### Demographics (matches brand-profile assumptions)

- Gender: 75% male, 29% female (matches brand-profile prediction of 70% male)
- Age: 55-64 dominates (33%), then 35-44 (24%), 45-54 (16%), 65+ (13%)
- 55-64 cluster confirms "post-Amazon installer" hypothesis — older homeowners with
  a doorbell in the box and no DIY confidence

### Top search keywords (where your money goes)

| Keyword | Match | Status | Spend | Clicks | CTR |
|---|---|---|---|---|---|
| smart doorbell installation | Broad | Removed | €91.53 | 68 | 7.16% |
| smart doorbell installer | Phrase | Enabled | €54.76 | 29 | **25.22%** ⭐ |
| security camera installation near me | Phrase | Paused | €38.28 | 10 | 21.74% |
| install ring doorbell wired | Exact | Removed | €25.29 | 7 | 17.07% |
| ring doorbell installation | Phrase | Removed | €17.17 | 10 | 9.43% |
| ring doorbell installation | Exact | Removed | €14.81 | 8 | 12.31% |
| video doorbell installation near me | Exact | Removed | €14.93 | 7 | **33.33%** ⭐ |

**Note on "Removed" status:** these keywords are flagged as Removed but still show recent
spend. Probably auto-removed by Google Ads as low-volume. Worth confirming in account.

**Star performers** (high CTR = strong relevance):
- `smart doorbell installer` (Phrase) — 25.22% CTR, 29 clicks
- `video doorbell installation near me` (Exact) — 33.33% CTR, 7 clicks
- `eufy doorbell installation service` (Phrase) — 75% CTR, 3 clicks
- `nest camera installer` (Phrase) — 100% CTR, 1 click
- `eufy camera installers near me` (Phrase) — 100% CTR, 1 click

**Action after conversion fix:** restore "smart doorbell installation" as Phrase
match (it was the top spender — €91.53 — but flagged Removed). Re-enable
"security camera installation near me".

### Negative keyword opportunities (from search-term cards)

These are real searches that hit your ads but are off-target. Add as **Phrase match**
negatives (never broad — too aggressive):

| Add as phrase negative | Why |
|---|---|
| `"jec waterford"` | Irrelevant — Waterford-based competitor (2 clicks, €4.62 wasted) |
| `"feale security"` | Limerick-area competitor — outside your geo |
| `"abbeyfeale"` | Geographic — Limerick, outside Leinster |
| `"hkc alarms"` | Competitor brand search |
| `"be at ease alarms"` | Competitor brand search |
| `"phone watch"` | Optional — keep if you want to compete on comparison intent |

**Don't add as negatives:**
- `amazon ring doorbell` — this IS your audience (post-Amazon installer)
- `harvey norman doorbell camera` — same, post-purchase intent
- `ring com ireland` — manufacturer search, qualified

### Specialist April 2026 campaign (paused)

- 47 clicks, €34.60 spend, **CTR 1.18%** ← bad
- Final URL: `https://www.smart-space.ie` (homepage)
- Headlines focus on "Smart Home Security Specialist", "Whole Home Security Systems",
  "Custom Security System Design"

**Hypothesis on why it underperformed:** keywords were broader / less commercial intent
than the Installer campaign. "Specialist" framing is more upper-funnel. Pause is the
right call.

**Future:** if conversions start landing on Installer, consider testing a
"whole home" campaign with explicit pricing in headlines (€987 Whole Home Bundle)
and the dedicated `/services/bundles/whole-home` LP.

### SmartCareLiving campaign (paused)

Zero impressions, zero spend. Was paused before the period started. Skipping analysis —
revisit only if/when SmartCareLiving comes back online.

---

## Action priority list (updated Apr 28)

| # | Action | Owner | Time | Impact |
|---|---|---|---|---|
| 1 | Disable/archive 2 broken Import conversions (SmartGuardian Bookings, SmartGuardian Installations) | User | 2 min | 🟢 Cleans diagnostics noise |
| 2 | Test conversion firing: hit `/smartspace-payment-success?free=true&e=test@smartspace.test&p=0871234567` in incognito; check "All conversions" column tomorrow | User | 5 min + wait | 🔴 Proves tracking |
| 3 | **Force ALL ad traffic to /ring-installation, not homepage.** Update Final URL on the enabled ad in Installer April 2026 | User | 5 min | 🔴 Highest CVR leverage |
| 4 | Delete paused ad with `/pages/your-5-star...` Final URL | User | 30 sec | 🟢 €132 saved going forward |
| 5 | Add 5 phrase-match negatives (jec waterford, feale, abbeyfeale, hkc, be at ease) | User | 5 min | 🟢 Small spend save |
| 6 | Add "All conversions" column to next CSV export so we can see website conversions vs primary-only conversions | User | 30 sec | 🟡 Better signal |
| 7 | Once 5+ conversions accrue: switch Installer to Maximize Conversions bidding | User | 2 min | 🔴 Major bidding upgrade |
| 8 | Re-enable top removed keywords as Phrase match (smart doorbell installation, ring doorbell installation, video doorbell installation near me) | User | 5 min | 🟢 Reach gain |

---

## Baseline to compare against next snapshot

Next export (recommended: 1 week from today, **Mon 4 May 2026** or earliest after the
conversion-tracking fix): re-export the same 9 files. I'll diff the numbers.

**Numbers to watch most:**

| Metric | Today | Target by next snapshot |
|---|---|---|
| Conversions | 0 | ≥1 (any non-zero proves tracking fixed) |
| Impressions | 8,838 | flat or up |
| Clicks | 268 | flat or up |
| CTR | 3.03% | ≥4% |
| Avg CPC | €1.47 | flat or down |
| Spend | €394.61 | within 10% of budget |
| Impression share (auction insights) | 13.82% | ≥15% |
| Outranking share vs phonewatch | 11.91% | ≥15% |

**Search terms to watch:** see if "ring doorbell installation dublin" volume rises (this is
the highest commercial-intent local keyword in your account).

---

## Export checklist for next time

When exporting, grab the same set so the diff is clean:

1. Campaign report (Campaigns tab → Download CSV)
2. Search terms report (Insights & reports → Search terms → all rows, no filter)
3. Ad report (Ads tab)
4. Landing page report (Insights & reports → Landing pages)
5. Device report (Settings → Devices)
6. Auction insights (Campaigns → check the Installer campaign → Auction insights tab)
7. Asset association report (Assets → Asset details → Download)
8. Time series chart (Overview → top chart)
9. Overview cards CSV bundle (Overview → "Download all" button — gives the zip)

**Important:** for the Search Terms Report, make sure to export with NO filter applied —
last time the export only contained 2 rows (filtered down to one term). Use the bundled
`Searches(Search_*.csv)` from the Overview Cards zip if the standalone export keeps
filtering.

---
