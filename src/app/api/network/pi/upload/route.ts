/**
 * Where a Pi sends iperf.log and devices.log when it is told to collect them.
 *
 * Only while carrying out a "collect" instruction that was sent to this Pi,
 * for the assessment that instruction names. The file arrives gzipped (three
 * days of iperf.log is about 200 KB, a few tens gzipped, far inside the
 * platform's 4.5 MB request limit) with its length and SHA-256, and is kept
 * only if both match what arrived. The answer repeats the SHA-256: the Pi
 * deletes nothing on the strength of an upload, but it does refuse to call a
 * collection done without this.
 */
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { gunzipSync } from "zlib";
import { authorisedPi } from "@/lib/network/pi-auth";
import { getCommand, storeLog } from "@/lib/network/store";
import { ARCHIVE_DIR_RE } from "@/lib/network/pi-protocol";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_LOG_BYTES = 20 * 1024 * 1024;

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "Content-Type": "text/plain" } });
const refuse = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const pi = await authorisedPi(req);
  if (!pi) return notFound();

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return refuse(400, "The body was not JSON.");
  }

  const cmd = typeof b.command === "string" ? await getCommand(b.command) : null;
  if (!cmd || cmd.pi_id !== pi.id || cmd.action !== "collect" || cmd.state !== "sent") {
    return refuse(409, "There is no collection under way on this Pi for that instruction.");
  }
  if (b.assessment !== cmd.assessment_id || b.assessment !== (cmd.args as { assessment?: string }).assessment) {
    return refuse(409, "That file is for a different assessment from the one being collected.");
  }
  const kind = b.kind === "iperf" || b.kind === "devices" ? b.kind : null;
  const source = typeof b.source === "string" && (b.source === "current" || ARCHIVE_DIR_RE.test(b.source)) ? b.source : null;
  const sha256 = typeof b.sha256 === "string" && /^[0-9a-f]{64}$/.test(b.sha256) ? b.sha256 : null;
  const bytes = typeof b.bytes === "number" && Number.isInteger(b.bytes) && b.bytes >= 0 && b.bytes <= MAX_LOG_BYTES ? b.bytes : null;
  if (!kind || !source || !sha256 || bytes == null || typeof b.gzip_b64 !== "string") {
    return refuse(400, "The file was not described properly.");
  }

  let raw: Buffer;
  try {
    raw = gunzipSync(Buffer.from(b.gzip_b64, "base64"), { maxOutputLength: MAX_LOG_BYTES });
  } catch {
    return refuse(400, "The file could not be unpacked.");
  }
  if (raw.length !== bytes || createHash("sha256").update(raw).digest("hex") !== sha256) {
    return refuse(422, "The file did not arrive intact: its length or fingerprint does not match.");
  }

  const stored = await storeLog({
    assessment_id: cmd.assessment_id!,
    pi_id: pi.id,
    command_id: cmd.id,
    kind,
    final: (cmd.args as { final?: boolean }).final === true,
    source,
    /* A power cut mid-write can leave a run of NUL bytes in a log on an SD
       card. Postgres text cannot hold them, so they are dropped from the
       stored copy; the fingerprint stays the Pi's, of the file as it is. */
    content: raw.toString("utf8").replace(/\u0000/g, ""),
    bytes,
    sha256,
  });
  return NextResponse.json({ ok: true, id: stored.id, duplicate: stored.duplicate, sha256 });
}

export function GET() {
  return notFound();
}
