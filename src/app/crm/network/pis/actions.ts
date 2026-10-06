"use server";

/**
 * Adding a Pi, replacing its key, and switching it off.
 *
 * A key is shown once, when it is made, and never again: only its SHA-256 is
 * stored. It goes onto the Pi through install.sh on Nigel's Mac, which reads
 * it from the keyboard rather than the command line, so it lands in no shell
 * history and no file in the repository.
 */
import { requireSession } from "@/lib/crm/session";
import { addEvent, createPi, getPi, listPis, newPiKey, revokePi, setPiKey } from "@/lib/network/store";
import { UUID_RE } from "@/lib/network/pi-protocol";

export interface KeyState { status: "idle" | "ok" | "error"; message: string; key?: string; name?: string; role?: string }

function guard(): { email: string } | KeyState {
  const s = requireSession();
  if (s.site !== "smart-space") return { status: "error", message: "The network service is Smart Space's. Switch to Smart Space first." };
  return { email: s.email };
}

export async function addPi(_prev: KeyState, form: FormData): Promise<KeyState> {
  const g = guard();
  if ("status" in g) return g;
  const name = String(form.get("name") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "");
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(name)) return { status: "error", message: "The name is the Pi's hostname: lower case letters, numbers and hyphens, like smartspace-node1." };
  if (role !== "node" && role !== "server") return { status: "error", message: "Say whether this Pi sits at the router or on the trial floor." };
  try {
    if ((await listPis()).some((p) => p.name === name)) return { status: "error", message: `${name} is already set up. Replace its key below instead.` };
    const k = newPiKey();
    const pi = await createPi(name, role, k.hash, k.hint);
    await addEvent({ pi_id: pi.id, kind: "pi:added", summary: `${name} added`, actor: g.email });
    return { status: "ok", message: `${name} added.`, key: k.key, name, role };
  } catch (err) {
    return { status: "error", message: `Not added: ${err instanceof Error ? err.message.slice(0, 160) : "no answer"}` };
  }
}

export async function replaceKey(_prev: KeyState, form: FormData): Promise<KeyState> {
  const g = guard();
  if ("status" in g) return g;
  const id = String(form.get("id") ?? "");
  if (!UUID_RE.test(id)) return { status: "error", message: "That Pi could not be found." };
  try {
    const pi = await getPi(id);
    if (!pi) return { status: "error", message: "That Pi could not be found." };
    const k = newPiKey();
    await setPiKey(id, k.hash, k.hint);
    await addEvent({ pi_id: id, kind: "pi:key", summary: `${pi.name}: new key made; the old one no longer works`, actor: g.email });
    return { status: "ok", message: `New key for ${pi.name}. The old key stopped working just now.`, key: k.key, name: pi.name, role: pi.role };
  } catch (err) {
    return { status: "error", message: `Not changed: ${err instanceof Error ? err.message.slice(0, 160) : "no answer"}` };
  }
}

export async function switchOff(_prev: KeyState, form: FormData): Promise<KeyState> {
  const g = guard();
  if ("status" in g) return g;
  const id = String(form.get("id") ?? "");
  if (!UUID_RE.test(id)) return { status: "error", message: "That Pi could not be found." };
  try {
    const pi = await getPi(id);
    if (!pi) return { status: "error", message: "That Pi could not be found." };
    await revokePi(id);
    await addEvent({ pi_id: id, kind: "pi:off", summary: `${pi.name} switched off: its key no longer works`, actor: g.email });
    return { status: "ok", message: `${pi.name} is switched off. It gets "not found" from now on. Replace its key to bring it back.` };
  } catch (err) {
    return { status: "error", message: `Not switched off: ${err instanceof Error ? err.message.slice(0, 160) : "no answer"}` };
  }
}
