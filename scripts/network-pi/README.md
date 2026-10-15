# The assessment Pis

`agent.py` runs on both measuring Pis and lets the CRM's assessment portal
(smart-space.ie/crm/network/assessments) work them without SSH. The Pis sit
behind the customer's router, so nothing can reach them; instead each calls in
to `/api/network/pi` every minute (every five seconds while an assessment is
open), reports its health, and picks up anything waiting for it.

## Setting one up

1. In the CRM, Network service, Pis: add the Pi by its hostname
   (`smartspace-node1` on the trial floor, `smartspace-server` at the router).
   Its key is shown once.
2. From the Mac, on the same network as the Pi:

   ```
   scripts/network-pi/install.sh smartspace-node1.local node
   scripts/network-pi/install.sh smartspace-server.local server
   ```

   It asks for the key, installs the program under systemd as the
   `smartspace` user, and waits until the portal hears from the Pi.

## Setting them up with Claude Code

Claude Code can do the installing, run from Nigel's Mac at home with both Pis
powered and on the same network. It cannot type into a prompt, so:

1. **The CRM must be live.** This prints 200 once it is (404 until the change is merged):

   ```
   curl -s -o /dev/null -w "%{http_code}\n" https://smart-space.ie/crm/network/pis
   ```

2. **The Mac must sign in to each Pi without a password.** This must succeed for both:

   ```
   ssh -o BatchMode=yes smartspace@smartspace-node1.local true
   ssh -o BatchMode=yes smartspace@smartspace-server.local true
   ```

   If one fails, Nigel runs `ssh-copy-id smartspace@<that Pi>.local` once,
   himself, in Terminal. It asks for the Pi's password.

3. **Each Pi's key** comes from the CRM (Network service, Pis, Add a Pi).
   Nigel pastes it into the chat, and Claude passes it as an environment
   variable, never into a file:

   ```
   SMARTSPACE_PI_KEY='<the server key>' scripts/network-pi/install.sh smartspace-server.local server
   SMARTSPACE_PI_KEY='<the node key>' scripts/network-pi/install.sh smartspace-node1.local node
   ```

   Each ends "Done. The portal heard from ..." when it has worked.

A lost or stolen Pi: Switch off in the CRM. Its key stops working at once and
the other Pi is unaffected. `install.sh <host> --key` puts a new key on.

## What it will do

Only these nine things, named in `ACTIONS` in `agent.py` and in
`src/lib/network/pi-protocol.ts`. `scripts/check-network-assessments.mjs`
fails the build if the two lists differ, or if `agent.py` ever passes a string
to a shell.

| Instruction | What happens on the Pi |
| --- | --- |
| measure | iperf3 to the Pi at the router, down (`-R`) then up |
| check | the facts `check.sh` reads, a five-second live test, a ping to each watched device |
| start_trial | moves `iperf.log` and `devices.log` into `~/archive/<when>-<assessment>/`, writes `devices.conf`, `devicewatch.sh` and the cron lines exactly as `watch.sh` does, writes one reading straight away |
| watch_devices | changes the watched devices, keeps the logs |
| stop_watch | removes the devicewatch cron line |
| collect | sends both logs to the portal; a final collection moves them into the archive first |
| clear_logs | deletes archived logs, each only if its SHA-256 matches the copy the portal holds |
| start_broadband | on the Pi wired into the customer's router (either Pi): every minute 20 pings to 1.1.1.1 and 20 to the router, and a Cloudflare speed test every 30, 60 or 180 minutes (or none), into `~/broadband.csv`; a log from before is moved into the archive first |
| collect_broadband | sends `broadband.csv` to the portal; a final collection stops the test and moves the log into the archive first |

The broadband test runs inside the agent, so it carries on after a power cut
for as long as the test is started. Each speed test uses about 140 MB, so ask
about a data allowance before choosing how often. A Pi set up before 15
October 2026 needs `install.sh` run again to learn the two broadband
instructions; the portal's other buttons work either way.

It never deletes a log the portal does not hold. The files and formats are
those of Nigel's Mac scripts (`check`, `targetdevicewatch`, `collect`,
`parse_iperf.py`), which keep working beside it.
