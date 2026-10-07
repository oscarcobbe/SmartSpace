/**
 * Where the measuring Pis call in.
 *
 * Each Pi sits behind a customer's router, so it calls out rather than being
 * called: it POSTs its health and the answers to anything it was asked, and
 * gets back whatever instructions are waiting for it and how long to wait
 * before calling again (five seconds while Nigel has the assessment open,
 * a minute otherwise).
 *
 * Every Pi has its own key, sent as "Authorization: Bearer ssn_...". Only the
 * key's SHA-256 is stored. A missing, wrong, replaced or switched-off key gets
 * the same plain 404 as a URL that does not exist, so this answers nobody
 * else and says nothing about why. The same 404 while the CRM is not set up.
 */
import { NextResponse } from "next/server";
import { claimCommands, finishCommand, recordPiCall, type PiStatus } from "@/lib/network/store";
import { authorisedPi } from "@/lib/network/pi-auth";
import { afterCommand, fileLogsInDrive } from "@/lib/network/flow";
import { pollSeconds } from "@/lib/network/pi-protocol";
import { afterResponse } from "@/lib/after-response";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });

/* What a Pi may say about itself, and how much. A stolen key must not be
   able to fill the table with junk, so only known fields are kept, short. */
const STATUS_KEYS = new Set([
  "role", "hostname", "time", "uptime_s", "ip_eth0", "wlan_inet", "gateway", "throttled", "temp_c", "disk_pct",
  "iperf3_running", "reboot_cron", "cron_iperf", "cron_sched", "cron_both", "log_bytes", "log_lines", "log_first",
  "log_last_stamp", "devices_conf", "devices_cron", "devices_lines", "rpi_connect", "job", "archive", "today",
]);

function cleanStatus(raw: unknown): PiStatus {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!STATUS_KEYS.has(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 50);
  }
  return JSON.stringify(out).length > 30_000 ? {} : (out as PiStatus);
}

export async function POST(req: Request) {
  const pi = await authorisedPi(req);
  if (!pi) return notFound();

  let body: { status?: unknown; results?: unknown; version?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "The body was not JSON." }, { status: 400 });
  }

  /* The answers to what it was given last time. Only instructions sent to
     this Pi can be answered by it (finishCommand filters on pi_id). */
  let fileLogs: string | null = null;
  const results = Array.isArray(body.results) ? body.results.slice(0, 20) : [];
  for (const r of results as { id?: unknown; ok?: unknown; result?: unknown; error?: unknown }[]) {
    if (typeof r?.id !== "string") continue;
    const cmd = await finishCommand(pi.id, r.id, r.ok === true, r.result, typeof r.error === "string" ? r.error : null);
    if (!cmd) continue;
    const next = await afterCommand(pi, cmd);
    if (next.fileLogs && cmd.assessment_id) fileLogs = cmd.assessment_id;
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await recordPiCall(pi.id, {
    status: cleanStatus(body.status),
    last_ip: forwarded,
    agent_version: typeof body.version === "string" ? body.version.slice(0, 40) : null,
  });

  const commands = await claimCommands(pi.id);
  const fast = commands.length > 0 || (pi.fast_until != null && Date.parse(pi.fast_until) > Date.now());

  if (fileLogs) {
    const id = fileLogs;
    afterResponse("network:file-logs", 60_000, () => fileLogsInDrive(id));
  }

  return NextResponse.json({
    commands: commands.map((c) => ({ id: c.id, action: c.action, args: c.args, expires_at: c.expires_at })),
    poll_seconds: pollSeconds(fast),
    server_time: new Date().toISOString(),
  });
}

export function GET() {
  return notFound();
}
