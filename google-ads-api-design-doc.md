# Google Ads API – Application Design Documentation
**Company:** Smart Space  
**Website:** smart-space.ie  
**Contact:** nigel@smart-space.ie  
**Date:** April 2026

---

## 1. Business Overview

Smart Space is Dublin's only 5-star authorised Ring installer and smart home security provider, serving over 5,000 homes and businesses across Leinster, Ireland. The company sells Ring security products (video doorbells, floodlight cameras, whole-home bundles) and provides professional installation services, with an end-to-end customer journey from product discovery through to installation booking.

The website (smart-space.ie) is a fullstack e-commerce and service booking platform built on Next.js, integrated with Shopify for product and checkout management, and Calendly for installation scheduling.

---

## 2. Purpose of Google Ads API Access

Smart Space is applying for Basic Access to the Google Ads API in order to programmatically manage and optimise paid advertising campaigns that drive traffic to smart-space.ie.

### Primary Use Cases

**Campaign Management**
- Create, update, and pause Google Ads campaigns for specific product categories (video doorbells, floodlight cameras, bundles)
- Adjust budgets and bidding strategies based on product availability and seasonal demand
- Manage ad copy and creative assets across campaigns

**Performance Reporting**
- Pull campaign metrics (impressions, clicks, conversions, cost-per-acquisition) to build internal dashboards
- Track which products and keywords drive the most installation bookings and Shopify checkout completions
- Monitor return on ad spend (ROAS) per product category

**Audience and Keyword Management**
- Upload customer match lists (e.g. past customers for upsell/cross-sell campaigns)
- Manage keyword lists and negative keywords programmatically
- Create and update remarketing audiences based on site behaviour (e.g. users who viewed a product but did not convert)

**Conversion Tracking**
- Import conversion data (completed bookings, Shopify orders) back into Google Ads via the API to improve automated bidding performance

---

## 3. Technical Architecture

### Platform
- **Framework:** Next.js 14 (React, App Router, TypeScript)
- **Hosting:** Vercel
- **E-commerce:** Shopify Storefront API (product catalog, cart, checkout)
- **Booking:** Calendly API (installation appointment scheduling)
- **Email:** Resend API (transactional email)

### Google Ads API Integration Plan
- **Language/Runtime:** Node.js (≥20.0.0) / TypeScript
- **Library:** `google-ads-api` (Node.js client)
- **Authentication:** OAuth 2.0 with offline access (refresh token stored securely in environment variables)
- **Access level requested:** Basic Access
- **Manager account:** Linked to Smart Space Google Ads account (customer ID: 999-404-1488)

### Data Flow
1. Shopify order webhooks trigger conversion events → forwarded to Google Ads API as offline conversions
2. Internal reporting dashboard fetches campaign metrics via Google Ads API on a scheduled basis
3. Campaign adjustments (budgets, bids, ad copy) are made via API calls triggered by internal tooling or automated rules

### Data Handled
- Google Ads campaign configuration data (budgets, bids, keywords, ad copy)
- Aggregate performance metrics (no personally identifiable information stored beyond what Google Ads already holds)
- Hashed customer email addresses for Customer Match audiences (SHA-256 hashed before upload, in compliance with Google policy)

---

## 4. Compliance and Data Handling

- All customer data used for Customer Match is collected with explicit consent in accordance with GDPR (Ireland/EU)
- Email addresses are SHA-256 hashed before being sent to the Google Ads API
- No raw PII is stored in the application beyond what is required for order fulfilment
- API credentials (developer token, OAuth tokens) are stored as encrypted environment variables on Vercel — never hardcoded or exposed client-side
- Access to the integration is restricted to authorised Smart Space personnel only

---

## 5. Account Details

| Field | Value |
|-------|-------|
| Business name | Smart Space |
| Website | smart-space.ie |
| Google Ads customer ID | 999-404-1488 |
| Industry | Retail / Home Security Services |
| Target market | Ireland (Leinster region) |
| Monthly ad spend (approx.) | To be confirmed |
| API use type | First-party (managing own account only) |

---

## 6. Summary

Smart Space is a legitimate local business using the Google Ads API solely to manage its own advertising account more efficiently. The integration will be used to automate campaign management, pull performance data for reporting, and feed offline conversion data back into Google Ads to improve bidding. All data handling follows GDPR requirements and Google's API usage policies.
