#!/usr/bin/env python3
"""
The Smart Space assessment agent, one copy on each measuring Pi.

The Pis sit behind the customer's router, where nothing outside can reach
them. So this calls out instead: every minute (every five seconds while Nigel
has the assessment open on his phone) it tells smart-space.ie how the Pi is,
and collects any instruction waiting for it in the portal.

It does what Nigel's Mac scripts did over SSH, on the Pi itself, and keeps
their files exactly as they were, so his own scripts keep working beside it:

  check.sh     the "check" instruction reads the same facts
  watch.sh     "start_trial" and "watch_devices" write the same devices.conf,
               the same devicewatch.sh and the same cron line
  collect.sh   "collect" sends iperf.log and devices.log to the portal

It only ever does the nine things in ACTIONS. It never runs anything the
portal sends as a command: every program it starts is named here, with its
arguments as a list (never through a shell), and the only values that come
from the portal are an assessment id, device names that are only ever written
to a file, and addresses that must be private IPv4 addresses before anything
pings them.

The Pi at a customer's router can also run the broadband test on its own
(the broadband evidence service): "start_broadband" pings the internet and
the router every minute, runs a speed test as often as the portal says, and
writes broadband.csv, which "collect_broadband" sends to the portal. The test
runs in this program, so systemd starts it again after a power cut.

It never deletes a log. "start_trial" and a final "collect" move the logs
into ~/archive/<when>-<assessment>/ and start empty ones in their place.
Archived logs are deleted only by "clear_logs", which names each file with
its SHA-256 as the portal received it, so nothing is deleted that the portal
does not hold.

Python 3 standard library only. Installed by install.sh, run by systemd.
"""
import csv
import gzip
import base64
import hashlib
import ipaddress
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

VERSION = "2026-10-15.1"

AGENT_HOME = os.environ.get("SMARTSPACE_AGENT_HOME", os.path.expanduser("~/.smartspace-agent"))

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)
ARCHIVE_DIR_RE = re.compile(r"^\d{8}-\d{6}(?:-[0-9a-f]{8})?$")
TRIAL_LOGS = ("iperf.log", "devices.log")
BB_LOG = "broadband.csv"
LOG_NAMES = TRIAL_LOGS + (BB_LOG,)
HOST_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9.-]{0,252}$")


def say(*parts):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), *parts, flush=True)


# ── Configuration ──────────────────────────────────────────────────────────

def load_config():
    with open(os.path.join(AGENT_HOME, "config.json")) as fh:
        cfg = json.load(fh)
    with open(os.path.join(AGENT_HOME, "key")) as fh:
        cfg["key"] = fh.read().strip()
    if not re.match(r"^ssn_[A-Za-z0-9_-]{43}$", cfg["key"]):
        raise SystemExit("The key file does not hold a portal key. Run install.sh again.")
    if cfg.get("role") not in ("node", "server"):
        raise SystemExit("config.json must say whether this is the node Pi or the server Pi.")
    cfg.setdefault("home", os.path.expanduser("~"))
    cfg.setdefault("server_host", "smartspace-server.local")
    if not os.path.isabs(cfg["home"]) or re.search(r"[\s'\"\\$`]", cfg["home"]):
        raise SystemExit("config.json home must be a plain absolute path.")
    if not HOST_RE.match(cfg["server_host"]):
        raise SystemExit("config.json server_host is not a host name.")
    return cfg


def paths(cfg):
    home = cfg["home"]
    return {
        "iperf": os.path.join(home, "iperf.log"),
        "devices_log": os.path.join(home, "devices.log"),
        "devices_conf": os.path.join(home, "devices.conf"),
        "devicewatch": os.path.join(home, "devicewatch.sh"),
        "broadband": os.path.join(home, BB_LOG),
        "archive": os.path.join(home, "archive"),
    }


def load_state():
    try:
        with open(os.path.join(AGENT_HOME, "state.json")) as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {}


def save_state(state):
    tmp = os.path.join(AGENT_HOME, "state.json.tmp")
    with open(tmp, "w") as fh:
        json.dump(state, fh)
    os.replace(tmp, os.path.join(AGENT_HOME, "state.json"))


# ── Running the few programs it uses ────────────────────────────────────────

def run(argv, timeout=20, stdin=None):
    """Runs a named program with a list of arguments. Never a shell."""
    exe = shutil.which(argv[0])
    if not exe:
        return 127, "", "%s is not installed" % argv[0]
    try:
        p = subprocess.run([exe] + list(argv[1:]), input=stdin, capture_output=True, text=True, timeout=timeout)
        return p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired:
        return 124, "", "%s took longer than %ss" % (argv[0], timeout)


def read_crontab():
    code, out, err = run(["crontab", "-l"])
    if code != 0:
        return []  # "no crontab for smartspace"
    return [line for line in out.splitlines()]


def write_crontab(lines):
    text = "\n".join(l for l in lines if l.strip()) + "\n"
    code, out, err = run(["crontab", "-"], stdin=text)
    if code != 0:
        raise RuntimeError("could not write the schedule: %s" % (err.strip() or out.strip()))


def iperf_cron_line(cfg):
    p = paths(cfg)
    host = cfg["server_host"]
    return ('10 * * * * (date; echo "--- down ---"; iperf3 -c %s -R -f m; echo "--- up ---"; iperf3 -c %s -f m) >> %s 2>&1'
            % (host, host, p["iperf"]))


def devicewatch_line(cfg):
    return "*/2 * * * * %s # devicewatch" % paths(cfg)["devicewatch"]


def devicewatch_script(cfg):
    p = paths(cfg)
    # watch.sh's devicewatch.sh, word for word, with this Pi's paths.
    return """#!/bin/bash
# Pings every device in devices.conf once and appends the result.
CONF=%s
LOG=%s
STAMP=$(/bin/date '+%%Y-%%m-%%d %%H:%%M')
while IFS='|' read -r name ip; do
  [ -z "$ip" ] && continue
  if ping -c 2 -W 2 "$ip" >/dev/null 2>&1; then
    echo "$STAMP|$name|$ip|up" >> "$LOG"
  else
    echo "$STAMP|$name|$ip|DOWN" >> "$LOG"
  fi
done < "$CONF"
""" % (p["devices_conf"], p["devices_log"])


# ── Reading the Pi ──────────────────────────────────────────────────────────

def ipv4_of(dev):
    code, out, _ = run(["ip", "-4", "addr", "show", dev])
    m = re.search(r"inet ([0-9.]+)", out) if code == 0 else None
    return m.group(1) if m else None


def gateway():
    code, out, _ = run(["ip", "route"])
    for line in out.splitlines() if code == 0 else []:
        parts = line.split()
        if parts[:1] == ["default"] and "via" in parts:
            return parts[parts.index("via") + 1]
    return None


def vcgencmd(arg):
    code, out, _ = run(["vcgencmd", arg])
    return out.strip() if code == 0 else None


def temp_c():
    raw = vcgencmd("measure_temp")
    m = re.search(r"([0-9.]+)", raw or "")
    return float(m.group(1)) if m else None


def throttled():
    raw = vcgencmd("get_throttled")
    return raw.split("=", 1)[1] if raw and "=" in raw else raw


def uptime_s():
    try:
        with open("/proc/uptime") as fh:
            return int(float(fh.read().split()[0]))
    except (OSError, ValueError, IndexError):
        return None


def disk_pct(cfg):
    try:
        u = shutil.disk_usage(cfg["home"])
        return "%d%%" % round(u.used * 100 / u.total)
    except OSError:
        return None


def count_processes(name):
    code, out, _ = run(["pgrep", "-c", name])
    try:
        return int(out.strip() or 0)
    except ValueError:
        return 0


def rpi_connect():
    code, out, err = run(["rpi-connect", "status"])
    text = (out or err or "").strip().splitlines()
    return " ".join(text[:2]) if text else None


_sha_cache = {}


def sha256_of(path):
    st = os.stat(path)
    key = (path, st.st_size, st.st_mtime_ns)
    if key not in _sha_cache:
        h = hashlib.sha256()
        with open(path, "rb") as fh:
            for chunk in iter(lambda: fh.read(65536), b""):
                h.update(chunk)
        _sha_cache[key] = h.hexdigest()
    return _sha_cache[key]


def archive_listing(cfg):
    root = paths(cfg)["archive"]
    out = []
    if not os.path.isdir(root):
        return out
    for d in sorted(os.listdir(root)):
        full = os.path.join(root, d)
        if not ARCHIVE_DIR_RE.match(d) or not os.path.isdir(full):
            continue
        files = []
        for name in LOG_NAMES:
            f = os.path.join(full, name)
            if os.path.isfile(f):
                files.append({"name": name, "bytes": os.path.getsize(f), "sha256": sha256_of(f)})
        out.append({"dir": d, "files": files})
    return out


DATE_LINE = re.compile(r"^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s")


def log_facts(cfg):
    p = paths(cfg)
    facts = {"log_bytes": 0, "log_lines": 0, "log_first": None, "log_last_stamp": None}
    try:
        with open(p["iperf"], errors="replace") as fh:
            lines = fh.read().splitlines()
    except OSError:
        return facts
    facts["log_bytes"] = os.path.getsize(p["iperf"])
    facts["log_lines"] = sum(1 for l in lines if "Mbits" in l)
    facts["log_first"] = lines[0][:80] if lines else None
    for l in reversed(lines):
        if DATE_LINE.match(l):
            facts["log_last_stamp"] = l.strip()[:80]
            break
    return facts


def devices_conf(cfg):
    try:
        with open(paths(cfg)["devices_conf"]) as fh:
            out = []
            for line in fh.read().splitlines():
                if "|" in line:
                    name, ip = line.split("|", 1)
                    if ip.strip():
                        out.append({"name": name, "ip": ip.strip()})
            return out
    except OSError:
        return None


def count_lines(path):
    try:
        with open(path, "rb") as fh:
            return sum(1 for _ in fh)
    except OSError:
        return 0


def today_label():
    # check.sh's  date "+%e %b" | sed 's/^ //'
    return time.strftime("%d %b").lstrip("0")


def status(cfg, state):
    s = {
        "role": cfg["role"],
        "hostname": socket.gethostname(),
        "time": datetime.now(timezone.utc).isoformat(),
        "uptime_s": uptime_s(),
        "ip_eth0": ipv4_of("eth0"),
        "wlan_inet": 1 if ipv4_of("wlan0") else 0,
        "gateway": gateway(),
        "throttled": throttled(),
        "temp_c": temp_c(),
        "disk_pct": disk_pct(cfg),
        "today": today_label(),
    }
    s.update(bb_facts(cfg, state))
    s["archive"] = archive_listing(cfg)
    cron = read_crontab()
    if cfg["role"] == "server":
        s["iperf3_running"] = count_processes("iperf3")
        s["reboot_cron"] = sum(1 for l in cron if re.search(r"@reboot.*iperf3", l))
        return s
    iperf_lines = [l for l in cron if "iperf.log" in l and not l.lstrip().startswith("#")]
    s["cron_iperf"] = len(iperf_lines)
    s["cron_sched"] = " ".join(iperf_lines[0].split()[:2]) if iperf_lines else None
    s["cron_both"] = sum(1 for l in cron if "-R" in l and not l.lstrip().startswith("#"))
    s.update(log_facts(cfg))
    s["devices_conf"] = devices_conf(cfg)
    s["devices_cron"] = sum(1 for l in cron if "devicewatch" in l and not l.lstrip().startswith("#"))
    s["devices_lines"] = count_lines(paths(cfg)["devices_log"])
    s["rpi_connect"] = rpi_connect()
    s["job"] = state.get("job")
    return s


# ── Checking what the portal sends ──────────────────────────────────────────

class Refused(Exception):
    """An instruction this Pi will not carry out, with the reason in plain words."""


def need_assessment(args):
    a = args.get("assessment")
    if not isinstance(a, str) or not UUID_RE.match(a):
        raise Refused("No assessment given.")
    return a.lower()


def clean_name(raw):
    return re.sub(r"\s+", " ", re.sub(r"[|\x00-\x1f\x7f]", " ", str(raw or ""))).strip()[:40]


def private_ipv4(raw):
    s = str(raw or "").strip()
    if not re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", s):
        return None
    try:
        ip = ipaddress.IPv4Address(s)
    except ValueError:
        return None
    octets = s.split(".")
    if any(str(int(o)) != o for o in octets):
        return None
    a, b = int(octets[0]), int(octets[1])
    ok = a == 10 or (a == 172 and 16 <= b <= 31) or (a == 192 and b == 168)
    if not ok or octets[3] in ("0", "255"):
        return None
    return str(ip)


def need_devices(args):
    raw = args.get("devices") or []
    if not isinstance(raw, list) or len(raw) > 12:
        raise Refused("The device list is not a list of up to twelve devices.")
    out, seen = [], set()
    for d in raw:
        name = clean_name((d or {}).get("name"))
        ip = private_ipv4((d or {}).get("ip"))
        if not name or not ip:
            raise Refused("Every watched device needs a name and an address on the home network.")
        if name in seen:
            raise Refused("%s is listed twice." % name)
        seen.add(name)
        out.append((name, ip))
    return out


# ── The broadband test ──────────────────────────────────────────────────────
#
# What the customer's broadband actually delivers, from a Pi wired into their
# router: every minute 20 pings to the internet (1.1.1.1) and 20 to the router
# itself, and every so often a speed test with pings running during it (lag
# under load). The pings to the router tell the two failures apart: the
# internet silent while the router answers is the broadband; both silent is
# the cable, the Pi or the power.
#
# The speed test is Cloudflare's (speed.cloudflare.com), four downloads of
# 25 MB and four uploads of 10 MB at once: about 140 MB a test, so hourly is
# about 3.4 GB a day. The portal chooses 30, 60 or 180 minutes, or none, so a
# customer with a data cap is not charged for the evidence.

BB_INTERNET = "1.1.1.1"
BB_FIELDS = ["epoch", "local_time", "kind", "target", "sent", "lost", "avg_ms", "max_ms", "jitter_ms",
             "down_mbps", "up_mbps", "loaded_sent", "loaded_lost", "loaded_avg_ms", "error"]
BB_SPEED_EVERY = (0, 30, 60, 180)
BB_STREAMS = 4
BB_DOWN_BYTES = 25000000
BB_UP_BYTES = 10000000

_bb_lock = threading.Lock()


def ping_stats(target, count=20, interval=0.2):
    """Loss, average, worst and jitter (the average change between one reply
    and the next, which is what breaks up a video call) for count pings."""
    code, out, err = run(["ping", "-n", "-c", str(count), "-i", str(interval), "-W", "2", target],
                         timeout=int(count * interval) + 15)
    times = [float(t) for t in re.findall(r"time=([\d.]+) ms", out)]
    r = {"sent": count, "lost": count - len(times), "avg_ms": None, "max_ms": None, "jitter_ms": None, "error": ""}
    if times:
        r["avg_ms"] = round(sum(times) / len(times), 1)
        r["max_ms"] = round(max(times), 1)
        if len(times) > 1:
            r["jitter_ms"] = round(sum(abs(b - a) for a, b in zip(times, times[1:])) / (len(times) - 1), 1)
    elif code not in (0, 1):
        r["error"] = (err.strip() or "ping did not run")[:120]
    return r


def _bb_base(kind, target):
    now = time.time()
    return {"epoch": int(now), "local_time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)),
            "kind": kind, "target": target}


def bb_write(cfg, job, rows):
    """Appends rows to broadband.csv, only while the test is still this
    assessment's: a minute in flight when the log is collected is dropped,
    rather than starting a new log in the next customer's name."""
    path = paths(cfg)["broadband"]
    with _bb_lock:
        if ((load_state().get("bb") or {}).get("job")) != job:
            return False
        new = not os.path.isfile(path) or os.path.getsize(path) == 0
        with open(path, "a", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=BB_FIELDS, extrasaction="ignore", lineterminator="\n")
            if new:
                w.writeheader()
            for row in rows:
                w.writerow(row)
    return True


def bb_minute(cfg, job):
    """One minute's pings, to the internet and the router at the same time."""
    gw = gateway()
    got = {}

    def one(name, target):
        got[name] = ping_stats(target)

    threads = [threading.Thread(target=one, args=("internet", BB_INTERNET))]
    if gw and private_ipv4(gw):
        threads.append(threading.Thread(target=one, args=("router", gw)))
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    rows = [dict(_bb_base("ping", "internet"), **got["internet"])]
    if "router" in got:
        rows.append(dict(_bb_base("ping", "router"), **got["router"]))
    else:
        rows.append(dict(_bb_base("ping", "router"), sent=0, lost=0, error="no router address on this network"))
    bb_write(cfg, job, rows)
    return {"internet": got["internet"], "router": got.get("router"), "gateway": gw}


def _curl_total(argv_list):
    """Runs the curls at once and returns megabits a second over the time they took together."""
    sizes = []

    def one(argv):
        code, out, _ = run(argv, timeout=45)
        parts = out.split()
        if len(parts) == 2:
            try:
                sizes.append(float(parts[0]) + float(parts[1]))
            except ValueError:
                pass

    start = time.time()
    threads = [threading.Thread(target=one, args=(a,)) for a in argv_list]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    took = time.time() - start
    total = sum(sizes)
    return round(total * 8 / took / 1e6, 1) if took > 0 and total else None


def bb_speed(cfg, job):
    curl = ["curl", "-s", "-o", "/dev/null", "--max-time", "30", "-w", "%{size_download} %{size_upload}"]
    loaded = {}

    def under_load():
        loaded["r"] = ping_stats(BB_INTERNET, 40, 0.25)

    t = threading.Thread(target=under_load)
    t.start()
    down = _curl_total([curl + ["https://speed.cloudflare.com/__down?bytes=%d" % BB_DOWN_BYTES]] * BB_STREAMS)
    fd, blob = tempfile.mkstemp(prefix="smartspace-up-")
    try:
        with os.fdopen(fd, "wb") as fh:
            fh.write(os.urandom(BB_UP_BYTES))
        up = _curl_total([curl + ["-X", "POST", "--data-binary", "@" + blob, "-H", "Content-Type: application/octet-stream",
                                  "https://speed.cloudflare.com/__up"]] * BB_STREAMS)
    finally:
        os.unlink(blob)
    t.join()
    l = loaded.get("r") or {}
    row = dict(_bb_base("speed", "internet"), down_mbps=down, up_mbps=up, loaded_sent=l.get("sent"),
               loaded_lost=l.get("lost"), loaded_avg_ms=l.get("avg_ms"),
               error="" if down or up else "the speed test reached nothing")
    bb_write(cfg, job, [row])
    return row


def broadband_loop(cfg):
    """Runs beside the calls to the portal for as long as the agent runs, and
    tests only while a broadband test is started on this Pi."""
    next_speed, job_seen = 0.0, None
    while True:
        tick = time.time()
        try:
            bb = load_state().get("bb") or {}
            job = bb.get("job")
            if job != job_seen:
                next_speed, job_seen = 0.0, job  # a new test starts with a speed test
            if job:
                bb_minute(cfg, job)
                every = bb.get("speed_every") or 0
                if every and time.time() >= next_speed:
                    next_speed = time.time() + every * 60
                    bb_speed(cfg, job)
        except Exception as e:  # the watch must outlive any one bad minute
            say("broadband test:", "%s: %s" % (type(e).__name__, str(e)[:200]))
        time.sleep(max(1, 60 - (time.time() - tick)))


_bb_facts_cache = {}


def bb_facts(cfg, state):
    bb = state.get("bb") or {}
    facts = {"bb_job": bb.get("job"), "bb_started": bb.get("started"), "bb_every": bb.get("speed_every"),
             "bb_bytes": 0, "bb_minutes": 0, "bb_last": None}
    path = paths(cfg)["broadband"]
    try:
        st = os.stat(path)
    except OSError:
        return facts
    key = (st.st_size, st.st_mtime_ns)
    if _bb_facts_cache.get("key") != key:
        minutes, last = 0, None
        with open(path, errors="replace") as fh:
            for line in fh:
                if ",ping,internet," in line:
                    minutes += 1
                    last = line.split(",", 2)[1]
        _bb_facts_cache.update({"key": key, "minutes": minutes, "last": last})
    facts.update({"bb_bytes": st.st_size, "bb_minutes": _bb_facts_cache["minutes"], "bb_last": _bb_facts_cache["last"]})
    return facts


def archive_broadband(cfg, job):
    """Files broadband.csv away in the archive, as archive_logs does the
    trial's logs. Returns what was filed, or None if there was nothing."""
    p = paths(cfg)
    with _bb_lock:
        src = p["broadband"]
        if not os.path.isfile(src) or os.path.getsize(src) == 0:
            return None
        name = time.strftime("%Y%m%d-%H%M%S") + ("-" + job[:8] if job else "")
        folder = os.path.join(p["archive"], name)
        os.makedirs(folder, exist_ok=True)
        dest = os.path.join(folder, BB_LOG)
        os.rename(src, dest)
    return {"dir": name, "files": [{"name": BB_LOG, "bytes": os.path.getsize(dest), "sha256": sha256_of(dest)}]}


# ── The actions ─────────────────────────────────────────────────────────────

def clear_of_the_hourly_test():
    """The hourly test starts at ten past and takes about twenty-five seconds.
    A measurement in the same moment would fail, and so would the hour's
    entry in the trial log, so wait for it to finish."""
    t = time.localtime()
    secs = t.tm_min * 60 + t.tm_sec
    if 9 * 60 + 40 <= secs < 10 * 60 + 45:
        time.sleep(10 * 60 + 45 - secs)


def iperf_once(cfg, seconds, reverse):
    argv = ["iperf3", "-c", cfg["server_host"], "-t", str(seconds), "-f", "m", "-J"] + (["-R"] if reverse else [])
    for attempt in range(2):
        code, out, err = run(argv, timeout=seconds + 25)
        try:
            data = json.loads(out)
        except ValueError:
            data = {}
        if data.get("error"):
            err = data["error"]
        bps = (((data.get("end") or {}).get("sum_received") or {}).get("bits_per_second"))
        if code == 0 and bps:
            return round(bps / 1e6, 1), None
        # "the server is busy running a test": try once more in a few seconds.
        if attempt == 0 and "busy" in str(err).lower():
            time.sleep(4)
            continue
        return None, (str(err).strip() or "iperf3 did not answer")[:200]
    return None, "iperf3 did not answer"


def act_measure(cfg, args, cmd):
    if cfg["role"] != "node":
        raise Refused("Measurements are taken from the node Pi.")
    seconds = args.get("seconds", 10)
    if not isinstance(seconds, int) or not 3 <= seconds <= 30:
        raise Refused("A measurement runs for 3 to 30 seconds.")
    clear_of_the_hourly_test()
    down, e1 = iperf_once(cfg, seconds, True)
    up, e2 = iperf_once(cfg, seconds, False)
    if down is None and up is None:
        raise Refused("Neither direction could be measured: %s" % (e1 or e2))
    return {"down": down, "up": up, "seconds": seconds, "errors": [e for e in (e1, e2) if e]}


def ping(ip):
    code, _, _ = run(["ping", "-c", "2", "-W", "2", ip], timeout=10)
    return code == 0


def act_check(cfg, args, cmd):
    if cfg["role"] != "node":
        raise Refused("The check runs on the node Pi.")
    state = load_state()
    s = status(cfg, state)
    clear_of_the_hourly_test()
    down, e1 = iperf_once(cfg, 5, True)
    up, e2 = iperf_once(cfg, 5, False)
    conf = devices_conf(cfg)
    results = [{"name": d["name"], "ip": d["ip"], "up": ping(d["ip"])} for d in (conf or []) if private_ipv4(d["ip"])]
    return {
        "hostname": s["hostname"], "ip_eth0": s["ip_eth0"], "gateway": s["gateway"],
        "cron_iperf": s["cron_iperf"], "cron_sched": s["cron_sched"], "cron_both": s["cron_both"],
        "log_lines": s["log_lines"], "log_first": s["log_first"], "today": s["today"],
        "throttled": s["throttled"], "temp_c": s["temp_c"], "rpi_connect": s["rpi_connect"],
        "disk_pct": s["disk_pct"], "uptime_s": s["uptime_s"],
        "live": {"down": down, "up": up, "error": e1 or e2},
        "devices": {"conf": conf, "cron": s["devices_cron"], "log_lines": s["devices_lines"], "results": results},
    }


def archive_logs(cfg, job):
    """Moves iperf.log and devices.log into a new archive folder and starts
    empty ones in their place. A move within the same disk is a single step,
    so a line being written at that instant lands in one file or the other,
    never neither. The hourly test holds iperf.log open for about twenty-five
    seconds, so this waits until it has finished. Returns what was filed away,
    or None if the logs were empty."""
    p = paths(cfg)
    clear_of_the_hourly_test()
    present = [(n, p["iperf"] if n == "iperf.log" else p["devices_log"]) for n in TRIAL_LOGS]
    present = [(n, f) for n, f in present if os.path.isfile(f) and os.path.getsize(f) > 0]
    if not present:
        return None
    name = time.strftime("%Y%m%d-%H%M%S") + ("-" + job[:8] if job else "")
    folder = os.path.join(p["archive"], name)
    os.makedirs(folder, exist_ok=False)
    for n, src in present:
        os.rename(src, os.path.join(folder, n))
        open(src, "a").close()
    time.sleep(2)  # let a device check already writing finish its line
    filed = [{"name": n, "bytes": os.path.getsize(os.path.join(folder, n)), "sha256": sha256_of(os.path.join(folder, n))}
             for n, _ in present]
    return {"dir": name, "files": filed}


def newest_archive_for(cfg, job, names=TRIAL_LOGS):
    """The newest archive folder for this assessment holding any of these logs.
    The trial's logs and the broadband log are filed in separate folders."""
    root = paths(cfg)["archive"]
    if not os.path.isdir(root):
        return None
    mine = sorted(d for d in os.listdir(root) if ARCHIVE_DIR_RE.match(d) and d.endswith("-" + job[:8])
                  and any(os.path.isfile(os.path.join(root, d, n)) for n in names))
    return mine[-1] if mine else None


def set_devices(cfg, devices):
    p = paths(cfg)
    with open(p["devices_conf"], "w") as fh:
        for name, ip in devices:
            fh.write("%s|%s\n" % (name, ip))
    with open(p["devicewatch"], "w") as fh:
        fh.write(devicewatch_script(cfg))
    os.chmod(p["devicewatch"], 0o755)
    cron = [l for l in read_crontab() if "devicewatch" not in l]
    if not any("iperf.log" in l and not l.lstrip().startswith("#") for l in cron):
        cron.append(iperf_cron_line(cfg))
    if devices:
        cron.append(devicewatch_line(cfg))
    write_crontab(cron)
    return [{"name": n, "ip": ip, "up": ping(ip)} for n, ip in devices]


def first_reading(cfg):
    """One entry written straight away, in the cron line's exact form, so the
    log is not empty until ten past the hour."""
    p = paths(cfg)
    host = cfg["server_host"]
    parts = []
    for argv in (["date"], None, ["iperf3", "-c", host, "-R", "-f", "m"], "--- up ---", ["iperf3", "-c", host, "-f", "m"]):
        if argv is None:
            parts.append("--- down ---\n")
            continue
        if isinstance(argv, str):
            parts.append(argv + "\n")
            continue
        code, out, err = run(argv, timeout=40)
        parts.append(out + err)
    with open(p["iperf"], "a") as fh:
        fh.write("".join(parts))


def act_start_trial(cfg, args, cmd):
    if cfg["role"] != "node":
        raise Refused("The trial runs on the node Pi.")
    job = need_assessment(args)
    devices = need_devices(args)
    state = load_state()
    # Stop the last house's device watch before its log is filed away, so
    # none of its lines can start the new log.
    write_crontab([l for l in read_crontab() if "devicewatch" not in l])
    archived = archive_logs(cfg, state.get("job"))
    seen = set_devices(cfg, devices)
    open(paths(cfg)["devices_log"], "a").close()
    state.update({"job": job, "job_started": datetime.now(timezone.utc).isoformat()})
    save_state(state)
    first_reading(cfg)
    s = log_facts(cfg)
    return {"archived": archived, "devices": seen, "log_lines": s["log_lines"], "job": job}


def act_watch_devices(cfg, args, cmd):
    if cfg["role"] != "node":
        raise Refused("The device watch runs on the node Pi.")
    job = need_assessment(args)
    state = load_state()
    if state.get("job") and state["job"] != job:
        raise Refused("This Pi is running the trial for another assessment.")
    return {"devices": set_devices(cfg, need_devices(args))}


def act_stop_watch(cfg, args, cmd):
    need_assessment(args)
    cron = read_crontab()
    write_crontab([l for l in cron if "devicewatch" not in l])
    return {"stopped": True}


def upload(cfg, cmd, job, kind, path, source, final):
    raw = open(path, "rb").read()
    payload = {
        "command": cmd["id"], "assessment": job, "kind": kind, "source": source, "final": final,
        "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest(),
        "gzip_b64": base64.b64encode(gzip.compress(raw)).decode("ascii"),
    }
    answer = post(cfg, "/api/network/pi/upload", payload, timeout=120)
    if answer.get("sha256") != payload["sha256"]:
        raise Refused("The portal did not confirm %s arrived intact." % kind)
    return {"kind": kind, "source": source, "bytes": len(raw), "sha256": payload["sha256"], "stored": True}


def act_collect(cfg, args, cmd):
    if cfg["role"] != "node":
        raise Refused("The logs are on the node Pi.")
    job = need_assessment(args)
    final = args.get("final") is True
    state = load_state()
    p = paths(cfg)
    resend = final and state.get("job") != job and state.get("last_job") == job
    if state.get("job") != job and not resend:
        if state.get("job"):
            raise Refused("These logs are another assessment's: the trial on this Pi was started for %s." % state["job"][:8])
        raise Refused("No trial is running on this Pi for this assessment, so there are no logs to collect.")
    if resend:
        # The trial was already collected and filed on the Pi; send that copy again.
        name = newest_archive_for(cfg, job)
        if not name:
            raise Refused("The logs for this assessment are no longer on the Pi.")
        folder = os.path.join(p["archive"], name)
        files = [(n, os.path.join(folder, n), name) for n in TRIAL_LOGS if os.path.isfile(os.path.join(folder, n))]
    elif final:
        write_crontab([l for l in read_crontab() if "devicewatch" not in l])
        filed = archive_logs(cfg, job)
        if not filed:
            raise Refused("The logs are empty. Nothing to collect.")
        folder = os.path.join(p["archive"], filed["dir"])
        files = [(f["name"], os.path.join(folder, f["name"]), filed["dir"]) for f in filed["files"]]
    else:
        files = [(n, p["iperf"] if n == "iperf.log" else p["devices_log"], "current") for n in TRIAL_LOGS]
        files = [(n, f, s) for n, f, s in files if os.path.isfile(f) and os.path.getsize(f) > 0]
        if not files:
            raise Refused("The logs are empty. Nothing to collect.")
    sent = [upload(cfg, cmd, job, "iperf" if n == "iperf.log" else "devices", path, source, final)
            for n, path, source in files]
    if final and not resend:
        state["job"] = None
        state["last_job"] = job
        save_state(state)
    return {"files": sent, "final": final}


def act_clear_logs(cfg, args, cmd):
    need_assessment(args)
    root = os.path.realpath(paths(cfg)["archive"])
    deleted, kept = [], []
    for f in args.get("files") or []:
        d, n, sha = str(f.get("dir", "")), str(f.get("name", "")), str(f.get("sha256", ""))
        if not ARCHIVE_DIR_RE.match(d) or n not in LOG_NAMES or not re.match(r"^[0-9a-f]{64}$", sha):
            raise Refused("A file to clear was not named properly, so nothing was deleted.")
        path = os.path.realpath(os.path.join(root, d, n))
        if not path.startswith(root + os.sep):
            raise Refused("A file to clear is outside the archive, so nothing was deleted.")
        if not os.path.isfile(path):
            kept.append({"dir": d, "name": n, "why": "not on the Pi"})
            continue
        if sha256_of(path) != sha:
            kept.append({"dir": d, "name": n, "why": "differs from the portal's copy"})
            continue
        os.remove(path)
        deleted.append({"dir": d, "name": n, "sha256": sha})
        folder = os.path.dirname(path)
        if not os.listdir(folder):
            os.rmdir(folder)
    return {"deleted": deleted, "kept": kept}


def act_start_broadband(cfg, args, cmd):
    job = need_assessment(args)
    every = args.get("speed_every", 60)
    if every not in BB_SPEED_EVERY:
        raise Refused("A speed test runs every 30, 60 or 180 minutes, or not at all.")
    state = load_state()
    running = (state.get("bb") or {}).get("job")
    if running and running != job:
        raise Refused("This Pi is running the broadband test for another assessment (%s). Collect that first." % running[:8])
    # Starting again for the same assessment files the log so far away, as starting a trial again does.
    archived = archive_broadband(cfg, running or state.get("last_bb_job"))
    state = load_state()
    state["bb"] = {"job": job, "started": datetime.now(timezone.utc).isoformat(), "speed_every": every}
    save_state(state)
    first = bb_minute(cfg, job)
    return {"job": job, "speed_every": every, "archived": archived, "first": first}


def act_collect_broadband(cfg, args, cmd):
    job = need_assessment(args)
    final = args.get("final") is True
    state = load_state()
    p = paths(cfg)
    running = (state.get("bb") or {}).get("job")
    resend = final and running != job and state.get("last_bb_job") == job
    if running != job and not resend:
        if running:
            raise Refused("This Pi's broadband test is another assessment's (%s)." % running[:8])
        raise Refused("No broadband test is running on this Pi for this assessment, so there is no log to collect.")
    if resend:
        name = newest_archive_for(cfg, job, (BB_LOG,))
        if not name:
            raise Refused("The broadband log for this assessment is no longer on the Pi.")
        path, source = os.path.join(p["archive"], name, BB_LOG), name
    elif final:
        # Stop first, so no minute lands after the log is filed.
        state["bb"] = None
        state["last_bb_job"] = job
        save_state(state)
        filed = archive_broadband(cfg, job)
        if not filed:
            raise Refused("The broadband log is empty. Nothing to collect.")
        path, source = os.path.join(p["archive"], filed["dir"], BB_LOG), filed["dir"]
    else:
        path, source = p["broadband"], "current"
        if not os.path.isfile(path) or os.path.getsize(path) == 0:
            raise Refused("The broadband log is empty so far. Nothing to collect.")
    return {"files": [upload(cfg, cmd, job, "broadband", path, source, final)], "final": final}


ACTIONS = {
    "measure": act_measure,
    "check": act_check,
    "start_trial": act_start_trial,
    "watch_devices": act_watch_devices,
    "stop_watch": act_stop_watch,
    "collect": act_collect,
    "clear_logs": act_clear_logs,
    "start_broadband": act_start_broadband,
    "collect_broadband": act_collect_broadband,
}


def carry_out(cfg, cmd):
    action = cmd.get("action")
    fn = ACTIONS.get(action)
    expires = cmd.get("expires_at")
    try:
        if not fn:
            raise Refused("%s is not something this Pi does." % action)
        # Five minutes' grace, for a Pi whose clock has not yet caught up after a power cut.
        if expires and datetime.fromisoformat(expires.replace("Z", "+00:00")).timestamp() + 300 < time.time():
            raise Refused("This instruction had expired by the time the Pi saw it.")
        args = cmd.get("args") if isinstance(cmd.get("args"), dict) else {}
        say("doing", action, cmd.get("id"))
        return {"id": cmd["id"], "ok": True, "result": fn(cfg, args, cmd)}
    except Refused as e:
        return {"id": cmd["id"], "ok": False, "error": str(e)}
    except Exception as e:  # anything unexpected is reported, never fatal
        return {"id": cmd["id"], "ok": False, "error": "%s: %s" % (type(e).__name__, str(e)[:300])}


# ── Talking to the portal ───────────────────────────────────────────────────

class KeyRefused(Exception):
    pass


def post(cfg, path, payload, timeout=40):
    req = urllib.request.Request(
        cfg["url"].rstrip("/") + path,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": "Bearer " + cfg["key"],
            "Content-Type": "application/json",
            "User-Agent": "smartspace-agent/" + VERSION,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read().decode("utf-8") or "{}"
            return json.loads(body)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise KeyRefused("the portal does not know this key (switched off, replaced, or not set up yet)")
        detail = e.read().decode("utf-8", "replace")[:300]
        raise RuntimeError("the portal answered %s: %s" % (e.code, detail))


def main():
    cfg = load_config()
    os.makedirs(AGENT_HOME, exist_ok=True)
    say("smartspace-agent", VERSION, "starting as the", cfg["role"], "Pi, calling", cfg["url"])
    results, backoff = [], 15
    once = "--once" in sys.argv
    if not once:
        threading.Thread(target=broadband_loop, args=(cfg,), daemon=True).start()
    while True:
        try:
            state = load_state()
            answer = post(cfg, "/api/network/pi", {"version": VERSION, "status": status(cfg, state), "results": results})
            results = []
            state["last_ok"] = datetime.now(timezone.utc).isoformat()
            save_state(state)
            backoff = 15
            commands = answer.get("commands") or []
            for cmd in commands:
                results.append(carry_out(cfg, cmd))
            if results:
                continue  # report straight away
            if once:
                return
            time.sleep(max(3, min(300, int(answer.get("poll_seconds") or 60))))
        except KeyRefused as e:
            say(str(e))
            if once:
                raise SystemExit(2)
            time.sleep(300)
        except Exception as e:
            say("could not reach the portal:", str(e)[:200])
            if once:
                raise SystemExit(1)
            time.sleep(backoff)
            backoff = min(backoff * 2, 300)


if __name__ == "__main__":
    main()
