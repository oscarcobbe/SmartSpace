-- Every Google ad click, with the ad group and keyword it came from.
--
-- An enquiry or a payment carries the click id (gclid) of the ad that brought
-- it. Google can say which keyword that click was, but only for ninety days
-- (click_view), and only one day at a time. So the nightly snapshot writes
-- each day's clicks here, and Marketing joins an enquiry's click to its
-- keyword whenever it likes, however old the click.
--
-- Read on 1 October 2026: 24 of Smart Space's last 30 ad leads and 7 of 7 of
-- SmartCare Living's resolved to a keyword this way. Google's own conversion
-- count gave SmartCare Living's best ad group none of its four.
--
-- Row level security as on every other CRM table: one policy requiring
-- crm_key_ok(), so the publishable key alone reads [] and writes nothing.

create table if not exists public.crm_ad_clicks (
  gclid          text primary key,
  site           text not null check (site in ('smart-space','smartcareliving')),
  click_date     date not null,
  campaign_id    text not null,
  campaign_name  text not null default '',
  ad_group_id    text not null,
  ad_group_name  text not null default '',
  -- The ad group criterion's id, from click_view.keyword. Empty for a click
  -- that matched no keyword (a dynamic or broad audience click).
  criterion_id   text not null default '',
  keyword        text not null default '',
  match_type     text not null default '',
  device         text not null default '',
  captured_at    timestamptz not null default now()
);

create index if not exists crm_ad_clicks_site_date on public.crm_ad_clicks (site, click_date);

alter table public.crm_ad_clicks enable row level security;

drop policy if exists crm_key_access on public.crm_ad_clicks;

create policy crm_key_access on public.crm_ad_clicks
  for all to anon, authenticated using (crm_key_ok()) with check (crm_key_ok());
