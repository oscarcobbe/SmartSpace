-- The home network assessment, from booking to report.
--
-- network_assessments holds one row per assessment: the customer, the dates,
-- the stage it has reached, every field of Nigel's capture sheet (capture, as
-- jsonb, so a new line on the paper sheet is a new key rather than a
-- migration), which two measuring Pis are in the house, and the Google Drive
-- folder made for it.
--
-- network_pis holds one row per Pi. Each Pi has its own key. Only the SHA-256
-- of the key is stored, so a copy of this table opens nothing; a Pi that goes
-- missing is switched off by setting revoked_at, and the other Pi carries on.
--
-- network_commands is the queue of instructions for the Pis. The Pis sit
-- behind the customer's router and cannot be reached from outside, so each
-- one calls in, reports its health and collects what is waiting for it. Every
-- instruction has an expiry, so one queued for a house the Pi never reached
-- cannot run days later in a different house.
--
-- network_logs holds every copy of iperf.log and devices.log a Pi sent, with
-- its SHA-256. The Pi deletes its own copy only after it is told this hash
-- arrived, and only after Nigel asks for it.
--
-- network_reports is each drafted and approved report, with the figures it
-- was drawn from and the hash of the page that was approved.
--
-- network_events is the history of an assessment, in sentences.
--
-- Row level security as on every other CRM table: one policy requiring
-- crm_key_ok(), so the publishable key alone reads [] and writes nothing.

create table if not exists public.network_pis (
  id             uuid primary key default gen_random_uuid(),
  name           text not null unique check (name ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  role           text not null check (role in ('node', 'server')),
  key_hash       text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  -- The last four characters of the key, so two keys can be told apart on
  -- screen without the key itself being kept anywhere.
  key_hint       text not null default '',
  key_set_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz,
  last_ip        text,
  agent_version  text,
  -- The latest health report the Pi sent: addresses, gateway, schedules, log
  -- sizes, temperature, power, what it holds in its archive.
  status         jsonb not null default '{}'::jsonb,
  -- Call in every few seconds until this time, rather than every minute.
  -- Set when an assessment page is open or an instruction is queued.
  fast_until     timestamptz
);

create table if not exists public.network_assessments (
  id                uuid primary key default gen_random_uuid(),
  site              crm_site not null default 'smart-space',
  contact_id        uuid references public.crm_contacts (id) on delete set null,
  customer_name     text not null,
  email             text,
  phone             text,
  address           text,
  eircode           text,
  stage             text not null default 'booked'
                    check (stage in ('booked', 'visit', 'trial', 'collected', 'reported', 'closed', 'cancelled')),
  visit_at          timestamptz,
  collection_at     timestamptz,
  review_call_at    timestamptz,
  paid_ref          text,
  capture           jsonb not null default '{}'::jsonb,
  node_pi_id        uuid references public.network_pis (id) on delete set null,
  server_pi_id      uuid references public.network_pis (id) on delete set null,
  trial_started_at  timestamptz,
  trial_ended_at    timestamptz,
  -- The Drive folder: ids of the folder, Data, Photos, Report and the capture
  -- sheet copy, and the folder's name.
  drive             jsonb not null default '{}'::jsonb,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists network_assessments_by_stage on public.network_assessments (site, stage, visit_at);

-- One section of the capture sheet, written without touching the others, so
-- the phone and the Mac saving two sections at the same moment cannot undo
-- each other. Security invoker: the table's crm_key_ok() policy still
-- decides whether the update happens at all.
create or replace function public.network_capture_set(p_id uuid, p_section text, p_values jsonb)
returns void
language sql
security invoker
set search_path = public, pg_temp
as $$
  update public.network_assessments
     set capture = jsonb_set(coalesce(capture, '{}'::jsonb), array[p_section], coalesce(p_values, '{}'::jsonb), true),
         updated_at = now()
   where id = p_id;
$$;

create table if not exists public.network_commands (
  id             uuid primary key default gen_random_uuid(),
  pi_id          uuid not null references public.network_pis (id) on delete cascade,
  assessment_id  uuid references public.network_assessments (id) on delete cascade,
  action         text not null
                 check (action in ('measure', 'check', 'start_trial', 'watch_devices', 'stop_watch', 'collect', 'clear_logs')),
  -- What the result is for: a socket row, the baseline, the final reading.
  purpose        text,
  args           jsonb not null default '{}'::jsonb,
  state          text not null default 'queued'
                 check (state in ('queued', 'sent', 'done', 'failed', 'expired', 'cancelled')),
  result         jsonb,
  error          text,
  requested_by   text,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  sent_at        timestamptz,
  finished_at    timestamptz
);
create index if not exists network_commands_waiting on public.network_commands (pi_id, state, created_at);
create index if not exists network_commands_by_assessment on public.network_commands (assessment_id, created_at desc);

create table if not exists public.network_logs (
  id                uuid primary key default gen_random_uuid(),
  assessment_id     uuid not null references public.network_assessments (id) on delete cascade,
  pi_id             uuid references public.network_pis (id) on delete set null,
  command_id        uuid references public.network_commands (id) on delete set null,
  kind              text not null check (kind in ('iperf', 'devices')),
  -- true for the copy taken at collection, false for a look during the trial.
  final             boolean not null default false,
  -- Where it came from on the Pi: "current", or the archive folder's name.
  source            text not null default 'current',
  content           text not null,
  bytes             integer not null,
  sha256            text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  received_at       timestamptz not null default now(),
  drive_file_id     text,
  filed_at          timestamptz,
  cleared_on_pi_at  timestamptz
);
create index if not exists network_logs_by_assessment on public.network_logs (assessment_id, kind, received_at desc);

create table if not exists public.network_reports (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid not null references public.network_assessments (id) on delete cascade,
  version        integer not null,
  state          text not null check (state in ('draft', 'approved')),
  data           jsonb not null,
  html_hash      text not null check (html_hash ~ '^[0-9a-f]{64}$'),
  created_by     text,
  created_at     timestamptz not null default now(),
  approved_by    text,
  approved_at    timestamptz,
  drive_file_id  text,
  unique (assessment_id, version)
);

create table if not exists public.network_events (
  id             uuid primary key default gen_random_uuid(),
  assessment_id  uuid references public.network_assessments (id) on delete cascade,
  pi_id          uuid references public.network_pis (id) on delete set null,
  kind           text not null,
  summary        text not null,
  detail         jsonb not null default '{}'::jsonb,
  actor          text,
  at             timestamptz not null default now()
);
create index if not exists network_events_by_assessment on public.network_events (assessment_id, at desc);
create index if not exists network_events_by_pi on public.network_events (pi_id, at desc);

alter table public.network_pis          enable row level security;
alter table public.network_assessments  enable row level security;
alter table public.network_commands     enable row level security;
alter table public.network_logs         enable row level security;
alter table public.network_reports      enable row level security;
alter table public.network_events       enable row level security;

drop policy if exists crm_key_access on public.network_pis;
drop policy if exists crm_key_access on public.network_assessments;
drop policy if exists crm_key_access on public.network_commands;
drop policy if exists crm_key_access on public.network_logs;
drop policy if exists crm_key_access on public.network_reports;
drop policy if exists crm_key_access on public.network_events;

create policy crm_key_access on public.network_pis
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
create policy crm_key_access on public.network_assessments
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
create policy crm_key_access on public.network_commands
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
create policy crm_key_access on public.network_logs
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
create policy crm_key_access on public.network_reports
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
create policy crm_key_access on public.network_events
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
