-- Sign-off, and mail to customers that nobody is waiting on.
--
-- crm_signoffs is Nigel's record of what he approved. Append only: a decision
-- is a new row, and the current state of an item is its newest row. Each row
-- carries the hash of the exact content that was on screen when he decided,
-- so an email edited after approval no longer matches its approval and stops
-- sending until it is approved again. No update or delete policy exists, so
-- the record cannot be rewritten through the API.
--
-- crm_message_log holds one row for each automatic message sent outside a
-- visitor's request (day-before reminders, review requests), so a cron that
-- runs twice cannot send twice. Also append only.
--
-- crm_mailings and crm_mailing_recipients are announcements to past customers,
-- sent in daily batches. Every recipient records the basis they can be emailed
-- on. Under Irish rules (S.I. 336 of 2011, regulation 13(11)) email to an
-- existing customer without consent is limited to similar products from the
-- same business, within 12 months of the sale, with an opt-out in every
-- message; the date of the last purchase is stored so the send can hold to
-- that. The opt-out list is the existing crm_outreach_blocks, checked before
-- every message.
--
-- Row level security as on every other CRM table: crm_key_ok(), which compares
-- the X-CRM-Key header against a row in a schema PostgREST does not serve.

create table if not exists public.crm_signoffs (
  id           uuid primary key default gen_random_uuid(),
  site         crm_site not null,
  item         text not null,
  content_hash text not null,
  decision     text not null check (decision in ('approved', 'changes')),
  choice       text,
  comment      text,
  decided_by   text not null,
  decided_at   timestamptz not null default now()
);
create index if not exists crm_signoffs_by_item on public.crm_signoffs (site, item, decided_at desc);

create table if not exists public.crm_message_log (
  id          uuid primary key default gen_random_uuid(),
  site        crm_site not null,
  kind        text not null,
  ref         text not null,
  channel     text not null check (channel in ('email', 'sms')),
  to_address  text not null,
  provider_id text,
  sent_at     timestamptz not null default now(),
  unique (site, kind, ref, channel)
);

create table if not exists public.crm_mailings (
  id          uuid primary key default gen_random_uuid(),
  site        crm_site not null,
  template    text not null,
  status      text not null default 'draft' check (status in ('draft', 'sending', 'paused', 'done')),
  daily_limit integer not null default 50 check (daily_limit between 1 and 500),
  created_by  text not null,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz
);

create table if not exists public.crm_mailing_recipients (
  id               uuid primary key default gen_random_uuid(),
  mailing_id       uuid not null references public.crm_mailings (id) on delete cascade,
  email            text not null,
  first_name       text,
  basis            text not null check (basis in ('customer', 'consent')),
  last_purchase_on date,
  source           text,
  status           text not null default 'queued' check (status in ('queued', 'sent', 'skipped', 'failed')),
  skip_reason      text,
  provider_id      text,
  failure          text,
  added_by         text not null,
  added_at         timestamptz not null default now(),
  sent_at          timestamptz,
  -- A customer can only be emailed on the customer basis with a sale date to
  -- measure the twelve months from.
  check (basis <> 'customer' or last_purchase_on is not null)
);
create unique index if not exists crm_mailing_recipients_once on public.crm_mailing_recipients (mailing_id, lower(email));

alter table public.crm_signoffs           enable row level security;
alter table public.crm_message_log        enable row level security;
alter table public.crm_mailings           enable row level security;
alter table public.crm_mailing_recipients enable row level security;

drop policy if exists crm_key_read   on public.crm_signoffs;
drop policy if exists crm_key_insert on public.crm_signoffs;
create policy crm_key_read   on public.crm_signoffs for select to anon, authenticated using (crm_key_ok());
create policy crm_key_insert on public.crm_signoffs for insert to anon, authenticated with check (crm_key_ok());

drop policy if exists crm_key_read   on public.crm_message_log;
drop policy if exists crm_key_insert on public.crm_message_log;
create policy crm_key_read   on public.crm_message_log for select to anon, authenticated using (crm_key_ok());
create policy crm_key_insert on public.crm_message_log for insert to anon, authenticated with check (crm_key_ok());

drop policy if exists crm_key_access on public.crm_mailings;
drop policy if exists crm_key_access on public.crm_mailing_recipients;
create policy crm_key_access on public.crm_mailings
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
create policy crm_key_access on public.crm_mailing_recipients
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());

comment on table public.crm_signoffs is
  'Nigel''s approvals, append only. The newest row per item is its state; content_hash ties it to the exact content approved.';
comment on table public.crm_message_log is
  'One row per automatic customer message sent outside a request, so a re-run cannot send twice. Append only.';
comment on table public.crm_mailing_recipients is
  'Who an announcement goes to and on what basis. crm_outreach_blocks is checked before every send.';
