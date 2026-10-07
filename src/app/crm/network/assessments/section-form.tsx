"use client";

/**
 * One section of the capture sheet, as a form.
 *
 * Drawn from the section's description in src/lib/network/capture.ts, so the
 * screen follows the paper sheet's order and wording without a page of
 * hand-written inputs per section. Tables are edited in place and sent as one
 * JSON field. Every button saves the whole section first and then does what
 * it says (measure a socket, start the trial), so nothing on screen is ever
 * lost to a button press.
 *
 * Built for a phone held in one hand on site: every control is at least 44
 * pixels, and table rows are cards rather than a table wider than the screen.
 */
import { useRef, useState, type ReactNode } from "react";
import { Plus, Trash2, Gauge, Loader2 } from "lucide-react";
import { ActionForm } from "../../action-form";
import type { ActionState } from "../../action-state";
import type { Section, SectionValues, Row, TableSpec, Field } from "@/lib/network/capture";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

export interface Reading { down: number | null; up: number | null; at: string }

export interface SectionButton { intent: string; label: string; tone?: "primary" | "plain"; note?: string; disabled?: string }

const input = "min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:text-sm";
const primary = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800";
const plain = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50";

function newId(): string {
  const a = new Uint8Array(5);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function FieldInput({ f, value, sectionId }: { f: Field; value: unknown; sectionId: string }) {
  /* Sections share field names ("provider" is a tick in Booking and a text
     field in the complaint), so the id carries the section. */
  const id = `f-${sectionId}-${f.key}`;
  if (f.kind === "tick") {
    return (
      <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-1 py-2 text-sm text-slate-800 hover:bg-slate-50 sm:col-span-2">
        <input id={id} name={f.key} type="checkbox" defaultChecked={value === true} className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400 accent-slate-900" />
        <span>{f.label}</span>
      </label>
    );
  }
  if (f.kind === "choice") {
    return (
      <fieldset className="sm:col-span-2">
        <legend className="sr-only">{f.label}</legend>
        <div className="grid gap-1">
          {(f.options ?? []).map((o) => (
            <label key={o.value} className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg px-1 py-2 text-sm text-slate-800 hover:bg-slate-50">
              <input type="radio" name={f.key} value={o.value} defaultChecked={value === o.value} className="mt-0.5 h-5 w-5 shrink-0 accent-slate-900" />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  const common = { id, name: f.key, placeholder: f.placeholder };
  return (
    <div className={f.wide || f.kind === "long" ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{f.label}</label>
      {f.kind === "long" ? (
        <textarea {...common} rows={4} defaultValue={typeof value === "string" ? value : ""}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 sm:text-sm" />
      ) : (
        <input {...common}
          type={f.kind === "date" ? "date" : f.kind === "datetime" ? "datetime-local" : "text"}
          inputMode={f.kind === "number" ? "decimal" : undefined}
          defaultValue={value == null ? "" : String(value)}
          className={input} />
      )}
      {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
    </div>
  );
}

function band(down: number | null, up: number | null, line: number | null): { label: string; tone: string } | null {
  if (down == null) return null;
  const asym = up != null && up > 0 && down > 0 && (up / down >= 2 || down / up >= 2);
  const base = down < 100
    ? { label: "Marginal: below 100. Try more sockets.", tone: "text-rose-700" }
    : line != null && down > line * 1.2
      ? { label: "Good: above the line speed with headroom.", tone: "text-emerald-700" }
      : { label: "Usable: quote a stated ceiling.", tone: "text-amber-700" };
  return asym ? { label: `${base.label} The two directions differ by a factor of two: a finding.`, tone: base.tone } : base;
}

function TableEditor({ spec, initial, measure, pings, lineSpeed, setIntent }: {
  spec: TableSpec;
  initial: Row[];
  measure?: { readings: Record<string, Reading>; pending: string[] };
  pings?: Record<string, boolean>;
  lineSpeed?: number | null;
  setIntent: (v: string) => void;
}) {
  const [rows, setRows] = useState<Row[]>(initial.length ? initial : []);
  const blank = (): Row => {
    const r: Row = { id: newId() };
    for (const c of spec.columns) r[c.key] = c.kind === "tick" ? false : c.kind === "number" ? null : "";
    /* A new socket starts on the same floor as the one above it, because
       three or four are tried on each floor in turn. */
    if (spec.columns.some((c) => c.key === "floor") && rows.length) r.floor = rows[rows.length - 1].floor ?? "";
    return r;
  };
  const set = (i: number, key: string, v: string | number | boolean | null) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));

  return (
    <div className="space-y-3">
      <input type="hidden" name={`table:${spec.key}`} value={JSON.stringify(rows)} />
      {rows.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
      {rows.map((r, i) => {
        const m = measure?.readings[r.id];
        const waiting = measure?.pending.includes(r.id);
        const shown = { down: m?.down ?? (typeof r.down === "number" ? r.down : null), up: m?.up ?? (typeof r.up === "number" ? r.up : null) };
        const b = measure ? band(shown.down, shown.up, lineSpeed ?? null) : null;
        const answered = pings && typeof r.device === "string" ? pings[r.device.trim()] : undefined;
        return (
          <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spec.columns.map((c) => {
                const cid = `t-${spec.key}-${r.id}-${c.key}`;
                if (c.kind === "tick") {
                  return (
                    <label key={c.key} htmlFor={cid} className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-slate-800">
                      <input id={cid} type="checkbox" checked={r[c.key] === true} onChange={(e) => set(i, c.key, e.target.checked)} className="h-5 w-5 accent-slate-900" />
                      {c.label}
                    </label>
                  );
                }
                const measured = measure && (c.key === "down" || c.key === "up") && m?.[c.key] != null;
                return (
                  <div key={c.key}>
                    <label htmlFor={cid} className="mb-1 block text-xs font-medium text-slate-600">
                      {c.label}{measured ? " (measured by the Pi)" : ""}
                    </label>
                    <input id={cid} className={input} placeholder={c.placeholder}
                      inputMode={c.kind === "number" ? "decimal" : undefined}
                      value={measured ? String(m![c.key as "down" | "up"]) : r[c.key] == null ? "" : String(r[c.key])}
                      readOnly={!!measured}
                      onChange={(e) => set(i, c.key, c.kind === "number" ? (e.target.value === "" ? null : e.target.value as unknown as number) : e.target.value)} />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {measure && (
                <button type="submit" onClick={() => setIntent(`measure:${r.id}`)} className={plain} disabled={waiting}>
                  {waiting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Gauge className="h-4 w-4" aria-hidden="true" />}
                  {waiting ? "Measuring" : m ? "Measure again" : "Measure"}
                </button>
              )}
              <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
              </button>
              {b && <span className={`text-sm font-medium ${b.tone}`}>{b.label}</span>}
              {answered === true && <span className="text-sm font-medium text-emerald-700">Answers a ping</span>}
              {answered === false && <span className="text-sm font-medium text-rose-700">Does NOT answer a ping. Fix the IP, or leave it empty and use the Deco log.</span>}
            </div>
          </div>
        );
      })}
      {rows.length < spec.maxRows && (
        <button type="button" onClick={() => setRows((rs) => [...rs, blank()])} className={plain}>
          <Plus className="h-4 w-4" aria-hidden="true" /> {spec.addLabel}
        </button>
      )}
    </div>
  );
}

export default function SectionForm({
  assessmentId, section, values, action, measure, pings, lineSpeed, buttons = [], children,
}: {
  assessmentId: string;
  section: Section;
  values: SectionValues;
  action: Action;
  measure?: { readings: Record<string, Reading>; pending: string[] };
  pings?: Record<string, boolean>;
  lineSpeed?: number | null;
  buttons?: SectionButton[];
  children?: ReactNode;
}) {
  const intent = useRef<HTMLInputElement>(null);
  const setIntent = (v: string) => { if (intent.current) intent.current.value = v; };

  return (
    <ActionForm action={action} className="space-y-6 px-4 py-4">
      <input type="hidden" name="id" value={assessmentId} />
      <input type="hidden" name="section" value={section.id} />
      <input ref={intent} type="hidden" name="intent" defaultValue="save" />

      {section.doThis && (
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Do this</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {section.doThis.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </div>
      )}

      {section.groups.map((g, gi) => (
        <div key={gi} className="space-y-3">
          {g.heading && <h3 className="text-sm font-semibold text-slate-900">{g.heading}</h3>}
          {g.note && <p className="text-sm leading-relaxed text-slate-600">{g.note}</p>}
          {"table" in g ? (
            <TableEditor
              spec={g.table}
              initial={(values?.[g.table.key] as Row[] | undefined) ?? []}
              measure={section.id === "sockets" ? measure : undefined}
              pings={section.id === "trial" && g.table.key === "devices" ? pings : undefined}
              lineSpeed={lineSpeed}
              setIntent={setIntent}
            />
          ) : (
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {g.fields.map((f) => <FieldInput key={f.key} f={f} value={values?.[f.key]} sectionId={section.id} />)}
            </div>
          )}
        </div>
      ))}

      {children}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
        <button type="submit" onClick={() => setIntent("save")} className={primary}>Save</button>
        {buttons.map((b) => (
          <span key={b.intent} className="inline-flex flex-col">
            <button type="submit" onClick={() => setIntent(b.intent)} disabled={!!b.disabled}
              title={b.disabled} className={`${b.tone === "primary" ? primary : plain} disabled:cursor-not-allowed disabled:opacity-50`}>
              {b.label}
            </button>
          </span>
        ))}
      </div>
      {buttons.some((b) => b.disabled || b.note) && (
        <ul className="space-y-1 text-xs text-slate-500">
          {buttons.filter((b) => b.disabled || b.note).map((b) => <li key={b.intent}><span className="font-medium text-slate-600">{b.label}:</span> {b.disabled ?? b.note}</li>)}
        </ul>
      )}
    </ActionForm>
  );
}
