# Bookings: Nigel's Google Calendar (replacing Calendly)

Both sites book visits into Nigel's Google Calendar through one engine in this
app (`src/lib/booking/`). Calendly did this until October 2026. SmartCare
Living's server calls the engine at `/api/booking/engine`; it never talks to
Google itself.

## How it works

- **Slots.** 2-hour visits starting 10:00, 12:30 and 15:00 Dublin time, Monday
  to Friday (each site narrows that: Smart Space drops Fridays, both have
  blackout ranges and lead times). A slot is free when nothing on
  `BOOKING_BUSY_CALENDARS` (default: Nigel's own) overlaps it.
- **One booking per slot, across both sites.** The event id is derived from the
  slot (`ssb` + date + time + generation), so Google refuses a second insert
  with 409. Cancelled slots are taken back conditionally (ETag).
- **One change at a time per booking.** Moves and cancels hold a lock event
  (`ssk` + reference, marked free on 1 Jan 2000, deleted after; taken over
  after a minute if a function died holding it).
- **A booking is the calendar event.** Its details are in the event's private
  extended properties (`ssbooking=1`), so there is no other store.
- **Google failing.** Retries with backoff on 5xx, timeouts and the rate limit
  (about a hundred writes to one calendar in a minute trips it); an unclear
  answer is settled by reading the slot's event before replying.
- **Customer links.** Reschedule and cancel links carry an HMAC of the
  reference (`BOOKING_LINK_SECRET`). Smart Space: `/booking/[ref]`. SmartCare
  Living: `www.smartcareliving.ie/booking/<ref>` (its own page and emails).
- **Emails.** Confirmed, moved and cancelled (with an .ics) replace Calendly's,
  behind Nigel's Sign-off like every customer message.

## Google access (keyless)

The smart-space.ie organisation forbids service account keys, so:

- Service account `site-bookings@smartspace-492216.iam.gserviceaccount.com`
  (client ID 104474558146808062751) has domain-wide delegation in the
  Workspace admin for `calendar.events` and `calendar.freebusy`.
- Vercel's OIDC token is exchanged through workload identity pool `vercel` in
  project `smartspace-492216`; only this project's production and preview
  deployments may act as the service account.

## Settings (Vercel, production)

| Smart Space | |
|---|---|
| `BOOKING_BACKEND` | `google` switches both sites on; unset means Calendly |
| `GOOGLE_BOOKING_SA_EMAIL`, `GOOGLE_WIF_PROVIDER` | the keyless Google sign-in |
| `BOOKING_CALENDAR_OWNER` | `nigel@smart-space.ie` |
| `BOOKING_LINK_SECRET`, `BOOKING_API_SECRET` | random; the API secret is shared with SmartCare Living |

SmartCare Living needs `BOOKING_BACKEND=google` and the same
`BOOKING_API_SECRET`.

## Checking, switching, rolling back

- **Health:** `GET /api/booking/engine?health=1` with
  `Authorization: Bearer $BOOKING_API_SECRET` reads free/busy for the next
  weekday and reports which system books and whether the three booking emails
  are approved. Nothing is booked.
- **Switch on:** `node scripts/booking-switch.mjs go` (checks the health and approvals first). By hand: set `BOOKING_BACKEND=google` on both projects and redeploy
  both. Prove it with one booking through the engine, cancelled at once.
- **Roll back:** `node scripts/booking-switch.mjs rollback`, or remove `BOOKING_BACKEND` from both and redeploy. Calendly takes
  over again; bookings already on Google stay in Nigel's calendar and the jobs
  keep reading them while Google is configured.
- **Calendly's leftovers:** the reminder, review, recovery and admin jobs read
  Calendly too while `CALENDLY_PERSONAL_TOKEN` is set. Unset it once the last
  Calendly booking has passed.

## Tests

- `scripts/check-booking-engine.mjs` (in the build): the engine against a fake
  Google with injected outages, timeouts, rate limits, lost answers, races,
  dragged events, the clock change. Run it many times when changing the
  engine; one flaky ordering bug only showed in 4 runs of 8.
- The checks that run real routes switch Google off for themselves, so they
  behave the same in a Vercel build with the switch on.
