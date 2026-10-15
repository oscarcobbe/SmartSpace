-- The broadband evidence test.
--
-- The Pi wired into a customer's router can now run the broadband test on its
-- own (start_broadband) and send its log (collect_broadband), and the portal
-- keeps that log, broadband.csv, beside iperf.log and devices.log as kind
-- 'broadband'. Only the two check constraints change; no column is added.

alter table public.network_commands drop constraint if exists network_commands_action_check;
alter table public.network_commands add constraint network_commands_action_check
  check (action in ('measure', 'check', 'start_trial', 'watch_devices', 'stop_watch', 'collect', 'clear_logs',
                    'start_broadband', 'collect_broadband'));

alter table public.network_logs drop constraint if exists network_logs_kind_check;
alter table public.network_logs add constraint network_logs_kind_check
  check (kind in ('iperf', 'devices', 'broadband'));
