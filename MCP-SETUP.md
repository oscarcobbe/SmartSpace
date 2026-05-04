# MCP Setup Guide — Google Analytics 4 + Google Ads

Goal: connect both MCPs to Claude Code so I can query your real GA4 + Google Ads data without you exporting CSVs.

**Status (as of 2026-04-27):**

| MCP | Status | Time remaining |
|---|---|---|
| GA4 MCP | 🟡 Partway done — Steps 1+2 complete | ~15 min |
| Google Ads MCP | 🔴 Not started | ~30-45 min + 24-48h dev token approval wait |

**Total active work:** ~45 min split across both. The Google Ads developer token approval is a wait, not active time.

---

# Part A — GA4 MCP (finish from where we left off)

## ✅ Already done
- Step 1: Homebrew + pipx installed in Terminal
- Step 2: IDs captured — GA4 Property ID `534445467`, GCP Project ID `astute-tome-492923-i0`

## 🟡 Step 3 — Confirm 2 APIs are enabled (~2 min)

Click each link, confirm project at top is `My First Project (astute-tome-492923-i0)`. If you see a blue **ENABLE** button, click it. If it says "API enabled" with a green check, skip.

1. https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com?project=astute-tome-492923-i0
2. https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com?project=astute-tome-492923-i0

## ❌ Step 4 — Create service account + download JSON key (~5 min)

You'll need to use the **Service Accounts** page (not the Credentials page you were on).

1. Open: https://console.cloud.google.com/iam-admin/serviceaccounts?project=astute-tome-492923-i0
2. Top of page → **+ CREATE SERVICE ACCOUNT**
3. **Service account name:** `claude-ga4-reader` → click **CREATE AND CONTINUE**
4. **Grant access** step → **CONTINUE** with NO role selected (we grant access on GA4 itself)
5. **Grant users access** step → **DONE** (skip)
6. You're back on the Service Accounts list. Click into the new `claude-ga4-reader@…` row.
7. Top tabs → **KEYS** → **ADD KEY** → **Create new key** → **JSON** → **CREATE**
8. A `.json` file downloads. **Don't open, email, or paste it.**

Now in Terminal:

```bash
mkdir -p ~/.gcp-credentials
mv ~/Downloads/astute-tome-492923-i0-*.json ~/.gcp-credentials/ga4-key.json
chmod 600 ~/.gcp-credentials/ga4-key.json
ls -l ~/.gcp-credentials/ga4-key.json
```

The last command should show one line ending in `ga4-key.json` with permissions `-rw-------`.

## ❌ Step 5 — Grant service account Viewer on GA4 (~2 min)

The service account email is:
```
claude-ga4-reader@astute-tome-492923-i0.iam.gserviceaccount.com
```

1. https://analytics.google.com → confirm property is **smart-space.ie** (top dropdown)
2. Bottom-left **gear (Admin)** → **Property access management**
3. Top-right **+** → **Add users**
4. **Email:** paste the service-account email above
5. Uncheck "Notify by email"
6. Role: **Viewer**
7. **ADD**

## ❌ Step 6 — Register MCP with Claude Code (~1 min)

In Terminal:

```bash
claude mcp add analytics-mcp \
  --env GOOGLE_APPLICATION_CREDENTIALS="$HOME/.gcp-credentials/ga4-key.json" \
  --env GOOGLE_PROJECT_ID="astute-tome-492923-i0" \
  -- pipx run analytics-mcp
```

Verify:
```bash
claude mcp list
```

You should see `analytics-mcp` listed alongside `shopify-dev-mcp`.

## ❌ Step 7 — Restart Claude Code

Cmd+Q to quit, then reopen. Open this conversation and say "ga4 mcp ready".

---

# Part B — Google Ads MCP (fresh setup, more complex)

The Google Ads MCP is more involved than GA4 because the Google Ads API requires:
- A **Developer Token** from Google Ads (separate from Google Cloud credentials)
- An **OAuth 2.0 refresh token** generated through a one-time auth flow

## Step 1 — Apply for Google Ads API Developer Token (~10 min, then 24-48h wait for approval)

This is the part that takes the longest because it's a manual approval by Google.

1. Go to https://ads.google.com (sign in as the Smart Space owner)
2. Top right → **Tools** (wrench icon)
3. Scroll to bottom of menu → **API Center**
4. Click **Apply for access** (or "Apply for token" — wording varies)
5. Fill in the form:
   - **API contact email:** your email
   - **Company name:** Smart Space
   - **Company website:** smart-space.ie
   - **Use case:** "Internal reporting and audit assistance for our own Smart Space Google Ads account. Using the Anthropic Claude Code AI assistant via the official googleads/google-ads-mcp MCP server to query account data for ongoing optimization."
   - **Tool used:** "Anthropic Claude Code + official googleads/google-ads-mcp MCP server (https://github.com/googleads/google-ads-mcp)"
6. Submit. Google emails you within 24-48 hours.

**Tier to request:**
- **Test access** (instant) — only works against test accounts. Useless for real Smart Space data.
- **Basic access** (24-48h approval) — 15,000 operations/day, free. **THIS IS WHAT YOU WANT.**
- Standard access (a few days) — unlimited; not needed for a single-account audit.

**While you wait** for the developer token, do steps 2-3 below (they don't require it).

## Step 2 — Get your real Customer ID (~30 sec)

1. Go to https://ads.google.com
2. **Top-right corner**, next to your email, you'll see a 10-digit number formatted as `XXX-XXX-XXXX` (e.g. `123-456-7890`)
3. Write it down — call this `CUSTOMER_ID`. **NOT** `999-404-1488` from earlier (that wasn't a real CID).

If you also have a Manager Account (MCC), there's a second ID at the top of the manager account view — that's your `LOGIN_CUSTOMER_ID`. If you don't see one, you don't have an MCC and can skip that field.

## Step 3 — Enable Google Ads API in Google Cloud (~30 sec)

Click: https://console.cloud.google.com/apis/library/googleads.googleapis.com?project=astute-tome-492923-i0

Click **ENABLE**.

## Step 4 — Use your existing OAuth client (~2 min)

You already have an OAuth 2.0 Desktop Client called **"Smart Space Google Ads"** in the Credentials page (from your screenshot earlier). We'll reuse that.

1. Open: https://console.cloud.google.com/apis/credentials?project=astute-tome-492923-i0
2. Under **OAuth 2.0 Client IDs**, click into **"Smart Space Google Ads"** (the Desktop one)
3. Top right → **Download JSON** (small download icon next to the trash icon)
4. Save the file

In Terminal:

```bash
mv ~/Downloads/client_secret_*.json ~/.gcp-credentials/google-ads-oauth.json
chmod 600 ~/.gcp-credentials/google-ads-oauth.json
```

## Step 5 — Generate a refresh token (~3 min, one-off)

This is a one-time browser auth flow that produces a long-lived refresh token. Two ways:

**Option A (easier): use Google's official quickstart Python script**

```bash
pipx run --spec google-ads-tools generate_refresh_token \
  --client_secrets_path=$HOME/.gcp-credentials/google-ads-oauth.json
```

(If that command doesn't work, alternative Option B below.)

**Option B (manual): use the Google Ads API quickstart**

```bash
pipx install google-ads
python3 -c "
from google_auth_oauthlib.flow import InstalledAppFlow
flow = InstalledAppFlow.from_client_secrets_file(
    '$HOME/.gcp-credentials/google-ads-oauth.json',
    scopes=['https://www.googleapis.com/auth/adwords']
)
credentials = flow.run_local_server(port=0)
print('REFRESH_TOKEN:', credentials.refresh_token)
"
```

Either way:
1. Browser opens automatically asking you to log in
2. Sign in as the Smart Space owner
3. Allow the requested permission
4. Browser shows "Authentication flow has completed"
5. Terminal prints `REFRESH_TOKEN: 1//0g...` — copy this whole token

Save it:
```bash
echo "REFRESH_TOKEN=1//0g..." >> ~/.gcp-credentials/google-ads-config.env
chmod 600 ~/.gcp-credentials/google-ads-config.env
```

## Step 6 — Once dev token arrives, register the MCP (~2 min)

When Google emails you the developer token (Step 1 outcome), come back and:

1. Open `~/.gcp-credentials/google-ads-config.env` in any text editor
2. Add the developer token line so the file looks like:
```
DEVELOPER_TOKEN=AbCdEf123456_yourActualToken
REFRESH_TOKEN=1//0g...your-refresh-token-from-step-5
CUSTOMER_ID=1234567890   # remove the dashes
LOGIN_CUSTOMER_ID=        # leave empty if no MCC
```

3. In Terminal, register the MCP:

```bash
# Read the values into env vars then register
source ~/.gcp-credentials/google-ads-config.env

claude mcp add google-ads-mcp \
  --env GOOGLE_ADS_DEVELOPER_TOKEN="$DEVELOPER_TOKEN" \
  --env GOOGLE_ADS_CLIENT_ID="$(jq -r '.installed.client_id' ~/.gcp-credentials/google-ads-oauth.json)" \
  --env GOOGLE_ADS_CLIENT_SECRET="$(jq -r '.installed.client_secret' ~/.gcp-credentials/google-ads-oauth.json)" \
  --env GOOGLE_ADS_REFRESH_TOKEN="$REFRESH_TOKEN" \
  --env GOOGLE_ADS_LOGIN_CUSTOMER_ID="$LOGIN_CUSTOMER_ID" \
  -- pipx run google-ads-mcp
```

(If `jq` isn't installed: `brew install jq` first.)

4. Verify:
```bash
claude mcp list
```

You should see THREE servers now:
```
shopify-dev-mcp:  ✓ Connected
analytics-mcp:    ✓ Connected
google-ads-mcp:   ✓ Connected
```

## Step 7 — Restart Claude Code

Cmd+Q, reopen. Tell me "both mcps connected".

---

# How I'll verify it works (when you ping me)

Once you say "ga4 mcp ready" or "both mcps connected", I'll run a sanity check by calling each MCP's most basic query:

**GA4:**
```
- list_property_users → confirms auth works
- run_report (date range: last 7 days, metric: sessions) → confirms data flows
```

**Google Ads:**
```
- list_accessible_customers → returns your Customer ID
- search_stream (campaigns last 30 days) → returns Installer April 2026 spend
```

If anything fails I'll see the exact error and fix it on the spot.

---

# What unlocks once both are connected

I can answer questions like (no manual exports):

- "What's our Google Ads CPA this week vs last week?"
- "How many `generate_lead` events fired today, broken down by source/medium?"
- "Compare Quality Score on the Installer April 2026 keywords before vs after the LP launch."
- "Which landing pages have the highest engagement-to-conversion rate?"
- "Did Consent Mode v2 measurably increase the volume of EEA conversions?"
- "Show me wasted-spend keywords from the last 7 days that I should add as negatives."

Without these MCPs, every one of those questions requires you to manually export a CSV first.

---

# When you get stuck

| Symptom | Likely cause | Fix |
|---|---|---|
| `pipx run analytics-mcp` says "command not found: pipx" | Terminal not finding pipx in PATH | Close + reopen Terminal, or run `pipx ensurepath` then reopen |
| `claude mcp list` shows MCP as ✗ failed | env vars not passed correctly | Re-run `claude mcp add` exactly as shown above; check no typos in paths |
| GA4 MCP returns "Permission denied" | Service account wasn't granted Viewer on GA4 property | Repeat Part A Step 5 |
| Google Ads MCP returns "Customer not found" | LOGIN_CUSTOMER_ID is set but you don't have an MCC | Set `LOGIN_CUSTOMER_ID=` (empty) and re-register |
| Google Ads MCP returns "Authentication failed" | Refresh token expired or wrong dev token | Re-run Part B Step 5 to get a new refresh token |

If anything blocks for more than 5 minutes, paste me the exact error and I'll debug.

---

# Calendar reminder

You already have a calendar event for **Sat 2 May, 14:00–15:00** that covers Part A (GA4 MCP). Nothing for Part B yet — once you've sent the developer token application (Part B Step 1), set yourself a follow-up reminder for 24-48h after for when Google emails the approval.

Tell me if you want me to add a Part B calendar event now.
