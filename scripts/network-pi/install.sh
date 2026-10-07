#!/bin/bash
# install.sh - put the Smart Space assessment program on a Pi, from the Mac.
#
# Usage, from the SmartSpace folder, on the same network as the Pi:
#   scripts/network-pi/install.sh smartspace-node1.local node
#   scripts/network-pi/install.sh smartspace-server.local server
#   scripts/network-pi/install.sh smartspace-node1.local --key      a new key only
#   scripts/network-pi/install.sh smartspace-node1.local --remove   take it off again
#
# First add the Pi in the CRM (Network service, Pis): that shows its key once.
# This asks for the key and sends it to the Pi over SSH's input, so it is
# never on a command line, in shell history or in any file on the Mac.
#
# Run by Claude Code, which cannot type into a prompt: give the key as
# SMARTSPACE_PI_KEY instead, and make sure the Mac signs in to the Pi without
# a password first (ssh-copy-id, once, in Terminal). The script says so if not.
#
# On the Pi it installs /opt/smartspace-agent/agent.py, runs it as the
# smartspace user under systemd (so it starts again after a power cut), and
# keeps the key in ~/.smartspace-agent/key, readable by that user only.
# Nothing else on the Pi changes, except on the Pi at the router, where it
# makes sure the iperf3 server starts at boot, as check.sh expects.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HOST="${1:-}"
ROLE="${2:-}"
PI_USER="${PI_USER:-smartspace}"
URL="${PORTAL_URL:-https://smart-space.ie}"
SERVER_HOST="${SERVER_HOST:-smartspace-server.local}"
SSH=(ssh -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new)
# A terminal can answer password prompts; Claude Code cannot.
if [ -t 0 ]; then TTY=1; SSH_T=(-t); else TTY=0; SSH_T=(); fi

usage() {
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

[ -n "$HOST" ] || usage
case "$ROLE" in node|server|--key|--remove) ;; *) usage ;; esac

if [ "$TTY" = 0 ] && ! "${SSH[@]}" -o BatchMode=yes "$PI_USER@$HOST" true 2>/dev/null; then
  echo
  echo "Cannot sign in to $HOST without a password, or cannot reach it. Nothing has been changed."
  echo
  echo "If the Pi is powered and on this network, run this once in Terminal (it asks for the Pi's password):"
  echo "  ssh-copy-id $PI_USER@$HOST"
  echo "then run this script again."
  exit 1
fi

if ! "${SSH[@]}" "$PI_USER@$HOST" true 2>/dev/null; then
  echo
  echo "Cannot reach $HOST. Nothing has been changed."
  echo
  echo "Check, in this order:"
  echo "  1. Is the Pi powered and on the network?"
  echo "  2. Is this Mac on the SAME network as the Pi?"
  echo "  3. If the name will not resolve, use the Pi's IP address instead of $HOST."
  exit 1
fi

if [ "$ROLE" = "--remove" ]; then
  "${SSH[@]}" ${SSH_T[@]+"${SSH_T[@]}"} "$PI_USER@$HOST" "sudo systemctl disable --now smartspace-agent 2>/dev/null; sudo rm -f /etc/systemd/system/smartspace-agent.service; sudo rm -rf /opt/smartspace-agent; sudo systemctl daemon-reload; rm -f ~/.smartspace-agent/key"
  echo "Removed from $HOST. The logs and the archive folder are left exactly as they are."
  exit 0
fi

read_key() {
  local key="${SMARTSPACE_PI_KEY:-}"
  if [ -z "$key" ]; then
    if [ "$TTY" = 0 ]; then
      echo "No key given. Set SMARTSPACE_PI_KEY to the key the CRM showed for $HOST. Nothing has been changed."
      exit 1
    fi
    read -r -s -p "Paste the key the portal showed for $HOST, then press Return: " key
    echo
  fi
  if ! [[ "$key" =~ ^ssn_[A-Za-z0-9_-]{43}$ ]]; then
    echo "That is not a portal key. It starts ssn_ and is 47 characters long. Nothing has been changed."
    exit 1
  fi
  KEY="$key"
}

STARTED="$("${SSH[@]}" "$PI_USER@$HOST" 'date -u +%Y-%m-%dT%H:%M:%S')"

if [ "$TTY" = 0 ] && ! "${SSH[@]}" "$PI_USER@$HOST" 'sudo -n true' 2>/dev/null; then
  echo "sudo on $HOST asks for a password, which only a person can type. Run this script yourself in Terminal. Nothing has been changed."
  exit 1
fi

if [ "$ROLE" = "--key" ]; then
  read_key
  printf '%s\n' "$KEY" | "${SSH[@]}" "$PI_USER@$HOST" 'umask 077; mkdir -p ~/.smartspace-agent; cat > ~/.smartspace-agent/key'
  "${SSH[@]}" ${SSH_T[@]+"${SSH_T[@]}"} "$PI_USER@$HOST" 'sudo systemctl restart smartspace-agent'
else
  if ! "${SSH[@]}" "$PI_USER@$HOST" 'command -v python3 >/dev/null && command -v iperf3 >/dev/null'; then
    echo "The Pi needs python3 and iperf3. Installing them (this asks for the Pi's password if sudo needs it)."
    "${SSH[@]}" ${SSH_T[@]+"${SSH_T[@]}"} "$PI_USER@$HOST" 'sudo apt-get update -qq && sudo apt-get install -y -qq python3 iperf3'
  fi
  read_key
  PI_HOME="$("${SSH[@]}" "$PI_USER@$HOST" 'printf %s "$HOME"')"
  scp -q -o ConnectTimeout=8 "$HERE/agent.py" "$HERE/smartspace-agent.service" "$PI_USER@$HOST:/tmp/"
  printf '%s\n' "$KEY" | "${SSH[@]}" "$PI_USER@$HOST" 'umask 077; mkdir -p ~/.smartspace-agent; cat > ~/.smartspace-agent/key'
  printf '{"url": "%s", "role": "%s", "server_host": "%s", "home": "%s"}\n' "$URL" "$ROLE" "$SERVER_HOST" "$PI_HOME" \
    | "${SSH[@]}" "$PI_USER@$HOST" 'umask 077; cat > ~/.smartspace-agent/config.json'
  "${SSH[@]}" ${SSH_T[@]+"${SSH_T[@]}"} "$PI_USER@$HOST" "sudo install -d /opt/smartspace-agent \
    && sudo install -m 0755 /tmp/agent.py /opt/smartspace-agent/agent.py \
    && sed 's/^User=.*/User=$PI_USER/' /tmp/smartspace-agent.service | sudo tee /etc/systemd/system/smartspace-agent.service >/dev/null \
    && rm -f /tmp/agent.py /tmp/smartspace-agent.service \
    && sudo systemctl daemon-reload \
    && sudo systemctl enable smartspace-agent >/dev/null 2>&1 \
    && sudo systemctl restart smartspace-agent"
  if [ "$ROLE" = "server" ]; then
    # check.sh's two server checks: iperf3 running, and an @reboot line so a power cut does not end the trial.
    "${SSH[@]}" "$PI_USER@$HOST" '(crontab -l 2>/dev/null | grep -q "@reboot.*iperf3") || ( (crontab -l 2>/dev/null; echo "@reboot iperf3 -s -D") | crontab - ); pgrep -x iperf3 >/dev/null || iperf3 -s -D'
  fi
fi

echo "Waiting for the portal to hear from $HOST..."
for _ in $(seq 1 20); do
  LAST="$("${SSH[@]}" "$PI_USER@$HOST" 'python3 -c "import json,os;print(json.load(open(os.path.expanduser(\"~/.smartspace-agent/state.json\"))).get(\"last_ok\",\"\"))" 2>/dev/null' || true)"
  if [ -n "$LAST" ] && [[ "${LAST:0:19}" > "$STARTED" || "${LAST:0:19}" == "$STARTED" ]]; then
    echo
    echo "Done. The portal heard from $HOST at $LAST (UTC)."
    echo "It shows as On in the CRM under Network service, Pis."
    exit 0
  fi
  sleep 3
done

echo
echo "The program is installed but the portal has not heard from it yet. Its last words:"
"${SSH[@]}" "$PI_USER@$HOST" 'journalctl -u smartspace-agent -n 12 --no-pager 2>/dev/null || sudo journalctl -u smartspace-agent -n 12 --no-pager'
exit 1
