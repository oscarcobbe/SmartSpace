-- The daily record of what the advertising cost and what came back.
--
-- These three tables were created through the Supabase MCP and existed in the
-- database with no file anywhere describing them, which is how a schema stops
-- being reviewable. Written down after the fact, matching what is live.
--
-- Row level security is the important part and was missing. Every other CRM
-- table has it on with one policy requiring crm_key_ok(), which compares the
-- X-CRM-Key request header against a row in a schema PostgREST does not serve.
-- These three were created without it, so the publishable key on its own, which
-- ships in the browser bundle of a public marketing site, could read and rewrite
-- both businesses' spend and revenue history.
--
-- Verified after applying: a read with the publishable key alone returns [],
-- the same as an already-protected table, and a write returns 401. The app is
-- unaffected because src/lib/crm/db.ts has always sent both credentials.

create table if not exists public.crm_ads_daily (
  site             text not null check (site in ('smart-space','smartcareliving')),
  on_date          date not null,
  cost_cents       bigint  not null default 0,
  clicks           integer not null default 0,
  impressions      bigint  not null default 0,
  conversions      numeric not null default 0,
  conv_value_cents bigint  not null default 0,
  captured_at      timestamptz not null default now(),
  primary key (site, on_date)
);

create table if not exists public.crm_revenue_daily (
  site             text not null check (site in ('smart-space','smartcareliving')),
  on_date          date not null,
  gross_cents      bigint  not null default 0,
  orders           integer not null default 0,
  -- Money on a checkout that carried a Google click id. Null is not the same
  -- as zero here: zero means nothing was attributable, null means we did not
  -- look.
  attributed_cents bigint,
  captured_at      timestamptz not null default now(),
  primary key (site, on_date)
);

-- A run that writes nothing and says nothing is indistinguishable from a quiet
-- week, which is the confusion the whole daily record exists to remove.
create table if not exists public.crm_ads_snapshot_runs (
  id           bigserial primary key,
  site         text not null,
  ran_at       timestamptz not null default now(),
  days_written integer not null default 0,
  ok           boolean not null default true,
  detail       text
);

alter table public.crm_ads_daily         enable row level security;
alter table public.crm_revenue_daily     enable row level security;
alter table public.crm_ads_snapshot_runs enable row level security;

drop policy if exists crm_key_access on public.crm_ads_daily;
drop policy if exists crm_key_access on public.crm_revenue_daily;
drop policy if exists crm_key_access on public.crm_ads_snapshot_runs;

create policy crm_key_access on public.crm_ads_daily
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());

create policy crm_key_access on public.crm_revenue_daily
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());

create policy crm_key_access on public.crm_ads_snapshot_runs
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
