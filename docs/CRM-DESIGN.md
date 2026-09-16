# CRM design notes

The CRM at `/crm` is an application, not a page on the website. These are the
decisions behind how it looks, written down so the next change to it does not
have to re-derive them.

## Colour

| Token | Value | Used for |
|---|---|---|
| Ground | `slate-50` | the page behind everything |
| Surface | `white` | panels, the rail, the table |
| Hairline | `slate-200` | every border and divider |
| Ink | `slate-900` | headings, figures, the primary button |
| Muted | `slate-500` | labels, timestamps, secondary text |
| Brand | `brand-500` `#f48222` | the site dot and chart bars, nothing else |

Semantic colour is separate from the accent and means one thing each: emerald
for money and won, amber for needs attention, rose for overdue and lost, sky
for new. Statuses were six hues, which put "quoted" at the same visual weight
as "won" and made teal and green indistinguishable at pill size. They are now
four.

The brand orange appears only on marks that represent money. An accent spent on
chrome stops being able to point at anything.

## Type

Plus Jakarta Sans, already self-hosted by the site. Scale: 11 uppercase label,
12 meta, 14 body and table, 16 panel title, 20 page title, 26 figure. Anything
with digits in a column carries `tabular-nums`.

## Layout

- 240px rail on `lg` and up, sticky, grouped into Today and Performance because
  the two halves of the job are different jobs.
- Under `lg`, a sticky top bar and a horizontally scrolling strip of sections
  that scrolls the current one into view, since Marketing sat off the right edge
  with nothing to say it was there.
- Content is capped at 1400px.
- Under `sm`, tables become cards. A seven column table at 375px is a sideways
  scroll nobody reads, and the thing being looked for is a person, not a cell.

## Rules that came from something going wrong

- **The CRM does not inherit the marketing site.** It used to. The fixed navbar
  sat over the rail, the footer bracketed a customer database, and every
  tracker mounted, so scrolling through orders filed `scroll_depth` and
  `rage_click` into the GA4 property the ads are judged by. `SiteChrome` draws
  the furniture for every route except `/crm`.
- **Tap targets are at least 40px.** The done checkbox was an 18px square.
- **Every wait has a skeleton.** Finance waits on Stripe and Marketing on
  Google, several seconds each, and the page was blank for all of it.
- **A part month says so.** The current month's bar is always shorter and
  always read as a collapse.
- **Nothing shows a raw key.** `contact_form`, `lead_created` and `stripe` are
  column names. `src/lib/crm/labels.ts` is the only place they become words.
- **A failed source is named, not hidden.** A page that drops Calendly and still
  prints a confident total is the failure this repository keeps having.

## Still open

Nothing from the first pass. The three that were open have been closed and
checked:

- The base gtag page view no longer fires on `/crm`. Only the `config` calls
  are guarded; `gtag('js')` and the consent default still run on every page
  without exception, because the consent default must. `gtag.js` still loads on
  `/crm` and, with nothing configured, sends no hit. Verified twice: the
  shipped inline script was run per path in a VM and its `dataLayer` counted
  (`/ring-installation` configures Ads, GA4 and the call label, `/crm/...`
  configures nothing, `/crmsomething` is treated as the website), and then in
  the browser, where the marketing page fires `g/collect` and `ccm/collect` and
  `/crm/orders` fires neither.
- There is an overview at `/crm`, and signing in lands there. Four panels, each
  behind its own Suspense boundary, because they read three different services
  and the slowest should not decide when the first one appears.
- Marketing reports the business, not the account. SmartCare Living ran from
  the Smart Space account before it had its own, and its €926 was being counted
  as Smart Space spend, which read as 1.2x return where the truth is 1.5x. The
  foreign campaign is identified by id, verified against the API rather than
  guessed, with a name pattern as a second net so a new cross-business campaign
  is caught rather than quietly counted. Its spend is shown in its own panel
  rather than dropped.

## Signing in

Anyone with a mailbox on the business's own domain can sign in. The mailbox is
the credential: the link goes to it and only whoever can open it can use it. A
named row in `crm_users` still wins, because it can grant both businesses and
can be removed to revoke somebody.

Deliberately not `fourwindsdigital.com`. This is the client's customer data and
our access is a named row, not a standing right for a whole domain. A
deployment only ever admits its own site's domain, so an address at the other
business is not a way into this one.

**A local run never sends real email.** This repository's `.env.local` carries
Smart Space's production Resend credentials, so typing an address into the
sign-in box on localhost once sent that person a real sign-in link from the
client's own account. Outside production the link is printed to the server log
and shown on the page as an "Open the CRM" button.
`CRM_ALLOW_REAL_EMAIL=true` is the deliberate override.

## Two businesses, one build

`CRM_SITE` decides which business a deployment is. Everything downstream follows
from it: which orders feed is read, what the second nav item is called, which
Google Ads account is queried, which stats make sense, and whether Outreach
exists at all.

- **Orders.** Smart Space has `/api/admin/leads`, which reconciles Stripe,
  Calendly and a sheet. SmartCare Living has a Google Sheet its own site writes
  to, read back through `api/dashboard-data.js`. `lib/crm/leads-scl.ts` maps
  those rows onto the same shape, so no page knows which site it is showing.
- **Words.** SmartCare Living takes enquiries, not orders. Nothing is paid for
  on the way in, so a "Revenue: €0" tile would be a wrong answer rather than an
  empty one, and filters that can only return nothing are hidden.
- **Outreach** appears for SmartCare Living only, and sends nothing. A prospect
  can only be written to once a person has read it and written down why we may.
  `crm_outreach_blocks` is never deleted from: an opt-out a later import can
  undo is not an opt-out.

## Guards

`npm run build` runs `scripts/check-crm-dates.mjs`, which fails if any date
formatter under `src/app/crm` or `src/lib/crm` omits `timeZone:
"Europe/Dublin"`. This machine is set to America/Denver and Vercel functions
run in UTC; a date-only column parses as UTC midnight, so without the timezone
every next step on the overview rendered a day early. Removing the timezone
from one call turns the guard red, which has been run rather than assumed.

`npm run check:crm-inbound` exercises the lead intake against a stubbed
PostgREST. `scripts/crm-design-stub.mjs` serves invented customers so every
screen can be looked at with content on it.
