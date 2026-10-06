#!/usr/bin/env node
/**
 * A stand-in for the CRM database's REST API, for trying the assessment
 * portal and the Pi program end to end on a laptop without the production
 * key.
 *
 * It answers the requests src/lib/network/store.ts and upsertContact make,
 * the way PostgREST does: eq, in, is, gt, gte, lt, lte filters, select lists,
 * order (with nullsfirst and nullslast), limit, Prefer return=representation,
 * and network_capture_set. Columns are the migration's, and anything else is
 * refused with a 400, as PostgREST refuses it, so a misspelt column fails
 * here rather than in production.
 *
 * Every request shape it answers is written to the file given second, so the
 * same shapes can be replayed against the real API with the publishable key
 * alone: row security then returns nothing, but a malformed query still gets
 * its 400.
 *
 *   node scripts/network-postgrest-stub.mjs 3997 /tmp/shapes.json
 *
 * Then run next dev with SMARTCRM_URL=http://127.0.0.1:3997 and any
 * SMARTCRM_ANON_KEY and SMARTCRM_KEY.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const PORT = Number(process.argv[2] ?? 3997);
const SHAPES = process.argv[3] ?? null;

const now = () => new Date().toISOString();
const TABLES = {
  network_pis: {
    cols: ["id", "name", "role", "key_hash", "key_hint", "key_set_at", "revoked_at", "created_at", "last_seen_at", "last_ip", "agent_version", "status", "fast_until"],
    defaults: () => ({ id: randomUUID(), key_hint: "", key_set_at: now(), revoked_at: null, created_at: now(), last_seen_at: null, last_ip: null, agent_version: null, status: {}, fast_until: null }),
    unique: ["name", "key_hash"],
  },
  network_assessments: {
    cols: ["id", "site", "contact_id", "customer_name", "email", "phone", "address", "eircode", "stage", "visit_at", "collection_at", "review_call_at", "paid_ref", "capture", "node_pi_id", "server_pi_id", "trial_started_at", "trial_ended_at", "drive", "created_by", "created_at", "updated_at"],
    defaults: () => ({ id: randomUUID(), site: "smart-space", contact_id: null, email: null, phone: null, address: null, eircode: null, stage: "booked", visit_at: null, collection_at: null, review_call_at: null, paid_ref: null, capture: {}, node_pi_id: null, server_pi_id: null, trial_started_at: null, trial_ended_at: null, drive: {}, created_by: null, created_at: now(), updated_at: now() }),
  },
  network_commands: {
    cols: ["id", "pi_id", "assessment_id", "action", "purpose", "args", "state", "result", "error", "requested_by", "created_at", "expires_at", "sent_at", "finished_at"],
    defaults: () => ({ id: randomUUID(), assessment_id: null, purpose: null, args: {}, state: "queued", result: null, error: null, requested_by: null, created_at: now(), sent_at: null, finished_at: null }),
  },
  network_logs: {
    cols: ["id", "assessment_id", "pi_id", "command_id", "kind", "final", "source", "content", "bytes", "sha256", "received_at", "drive_file_id", "filed_at", "cleared_on_pi_at"],
    defaults: () => ({ id: randomUUID(), pi_id: null, command_id: null, final: false, source: "current", received_at: now(), drive_file_id: null, filed_at: null, cleared_on_pi_at: null }),
  },
  network_reports: {
    cols: ["id", "assessment_id", "version", "state", "data", "html_hash", "created_by", "created_at", "approved_by", "approved_at", "drive_file_id"],
    defaults: () => ({ id: randomUUID(), created_by: null, created_at: now(), approved_by: null, approved_at: null, drive_file_id: null }),
  },
  network_events: {
    cols: ["id", "assessment_id", "pi_id", "kind", "summary", "detail", "actor", "at"],
    defaults: () => ({ id: randomUUID(), assessment_id: null, pi_id: null, detail: {}, actor: null, at: now() }),
  },
  crm_contacts: {
    cols: ["id", "site", "name", "first_name", "last_name", "email", "phone", "address_line1", "address_line2", "city", "county", "eircode", "notes", "created_at", "updated_at"],
    defaults: () => ({ id: randomUUID(), first_name: null, last_name: null, email: null, phone: null, address_line1: null, address_line2: null, city: null, county: null, eircode: null, notes: null, created_at: now(), updated_at: now() }),
  },
  crm_ads_snapshot_runs: { cols: ["id"], defaults: () => ({ id: randomUUID() }), seed: [{ id: randomUUID() }] },
};
const db = Object.fromEntries(Object.entries(TABLES).map(([k, t]) => [k, [...(t.seed ?? [])]]));
const shapes = new Set();

class Bad extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function value(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function compare(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

function filtersFrom(params, table) {
  const cols = TABLES[table].cols;
  const out = [];
  for (const [k, v] of params) {
    if (["select", "order", "limit", "offset"].includes(k)) continue;
    if (!cols.includes(k)) throw new Bad(400, `column ${table}.${k} does not exist`);
    const m = /^(eq|neq|gt|gte|lt|lte|in|is)\.(.*)$/s.exec(v);
    if (!m) throw new Bad(400, `"${v}" is not a filter PostgREST understands`);
    const [, op, arg] = m;
    if (op === "in") {
      const list = /^\((.*)\)$/s.exec(arg);
      if (!list) throw new Bad(400, `in. needs a list in brackets: ${v}`);
      const items = list[1] ? list[1].split(",").map(value) : [];
      out.push((r) => items.map(String).includes(String(r[k])));
    } else if (op === "is") {
      if (!["null", "true", "false"].includes(arg)) throw new Bad(400, `is.${arg} is not allowed`);
      out.push((r) => r[k] === value(arg));
    } else {
      const want = value(arg);
      out.push((r) => {
        const c = compare(typeof r[k] === "number" ? r[k] : r[k], typeof r[k] === "number" ? Number(want) : want);
        return op === "eq" ? String(r[k]) === String(want) : op === "neq" ? String(r[k]) !== String(want)
          : op === "gt" ? r[k] != null && c > 0 : op === "gte" ? r[k] != null && c >= 0 : op === "lt" ? r[k] != null && c < 0 : r[k] != null && c <= 0;
      });
    }
  }
  return out;
}

function project(rows, select, table) {
  if (!select || select === "*") return rows.map((r) => ({ ...r }));
  const cols = select.split(",").map((s) => s.trim());
  for (const c of cols) if (!TABLES[table].cols.includes(c)) throw new Bad(400, `column ${table}.${c} does not exist`);
  return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
}

function order(rows, spec, table) {
  if (!spec) return rows;
  const keys = spec.split(",").map((part) => {
    const [col, ...mods] = part.split(".");
    if (!TABLES[table].cols.includes(col)) throw new Bad(400, `column ${table}.${col} does not exist`);
    const desc = mods.includes("desc");
    const nullsFirst = mods.includes("nullsfirst") ? true : mods.includes("nullslast") ? false : desc;
    return { col, desc, nullsFirst };
  });
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const x = a[k.col], y = b[k.col];
      if (x == null && y == null) continue;
      if (x == null) return k.nullsFirst ? -1 : 1;
      if (y == null) return k.nullsFirst ? 1 : -1;
      const c = compare(x, y);
      if (c) return k.desc ? -c : c;
    }
    return 0;
  });
}

function checkBody(table, body) {
  for (const k of Object.keys(body)) if (!TABLES[table].cols.includes(k)) throw new Bad(400, `Could not find the '${k}' column of '${table}'`);
}

function shapeOf(method, url) {
  const u = new URL(url, "http://x");
  const parts = [...u.searchParams].map(([k, v]) => `${k}=${v.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "00000000-0000-4000-8000-000000000000").replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, "2026-01-01T00:00:00.000Z").replace(/[0-9a-f]{64}/g, "0".repeat(64))}`);
  return `${method} ${u.pathname}?${parts.join("&")}`;
}

function handle(req, body) {
  const u = new URL(req.url, "http://x");
  const m = /^\/rest\/v1\/(rpc\/)?([a-z_]+)$/.exec(u.pathname);
  if (!m) throw new Bad(404, "not found");
  if (!req.headers["x-crm-key"]) return { status: 200, json: [] }; // as row security does
  const prefer = String(req.headers.prefer ?? "");
  const representation = prefer.includes("return=representation");
  if (m[1]) {
    if (m[2] !== "network_capture_set") throw new Bad(404, `function ${m[2]} not found`);
    const { p_id, p_section, p_values } = body ?? {};
    const row = db.network_assessments.find((r) => r.id === p_id);
    if (row) { row.capture = { ...(row.capture ?? {}), [p_section]: p_values ?? {} }; row.updated_at = now(); }
    return { status: 204 };
  }
  const table = m[2];
  if (!TABLES[table]) throw new Bad(404, `relation ${table} does not exist`);
  const rows = db[table];
  const where = filtersFrom(u.searchParams, table);
  const match = (r) => where.every((f) => f(r));
  if (req.method === "GET") {
    let out = order(rows.filter(match), u.searchParams.get("order"), table);
    const limit = u.searchParams.get("limit");
    if (limit) out = out.slice(0, Number(limit));
    return { status: 200, json: project(out, u.searchParams.get("select"), table) };
  }
  if (req.method === "POST") {
    const list = Array.isArray(body) ? body : [body];
    const made = [];
    for (const item of list) {
      checkBody(table, item);
      const row = { ...TABLES[table].defaults(), ...item };
      for (const k of TABLES[table].unique ?? []) if (rows.some((r) => r[k] === row[k])) throw new Bad(409, `duplicate key value violates unique constraint on ${k}`);
      rows.push(row);
      made.push(row);
    }
    return representation ? { status: 201, json: project(made, u.searchParams.get("select"), table) } : { status: 201 };
  }
  if (req.method === "PATCH") {
    checkBody(table, body ?? {});
    const hit = rows.filter(match);
    for (const r of hit) Object.assign(r, body);
    return representation ? { status: 200, json: project(hit, u.searchParams.get("select"), table) } : { status: 204 };
  }
  if (req.method === "DELETE") {
    const keep = rows.filter((r) => !match(r));
    db[table] = keep;
    return { status: 204 };
  }
  throw new Bad(405, "method not allowed");
}

createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    if (req.url === "/__dump") { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(db, null, 2)); return; }
    shapes.add(shapeOf(req.method, req.url));
    if (SHAPES) writeFileSync(SHAPES, JSON.stringify([...shapes], null, 2));
    try {
      const out = handle(req, raw ? JSON.parse(raw) : null);
      res.statusCode = out.status;
      if (out.json !== undefined) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(out.json)); }
      else res.end();
    } catch (err) {
      res.statusCode = err.status ?? 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: err.message }));
      console.error(`${req.method} ${req.url}: ${err.message}`);
    }
  });
}).listen(PORT, "127.0.0.1", () => console.log(`network stub on ${PORT}`));
