/**
 * The pieces every CRM section is built from.
 *
 * One definition each, so a figure tile on Finance sits on the same baseline
 * and carries the same padding as one on Marketing. When these were written
 * inline per page the three pages drifted within a day.
 */
import type { ReactNode } from "react";

export function PageHeader({ title, sub, aside }: { title: string; sub?: string; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-600">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

export function Panel({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      {(title || aside) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Figure tiles carry no border and no shadow. Everything on these pages is a
 * number, and giving each one a card outline made the whole page read as a
 * grid of equally important boxes with no hierarchy left to spend.
 */
export function Stat({ label, value, note, tone = "plain" }: {
  label: string; value: string; note?: string; tone?: "plain" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    plain: "text-slate-900",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-rose-700",
  }[tone];
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-2 divide-slate-200 rounded-lg border border-slate-200 bg-white sm:grid-cols-3 sm:divide-x lg:grid-cols-5">
      {children}
    </div>
  );
}

const PILL: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  upcoming: "bg-sky-50 text-sky-700 ring-sky-600/20",
  enquiry: "bg-slate-100 text-slate-700 ring-slate-500/20",
  consult: "bg-violet-50 text-violet-700 ring-violet-600/20",
  install: "bg-amber-50 text-amber-800 ring-amber-600/20",
};

export function Pill({ children, kind = "enquiry" }: { children: ReactNode; kind?: keyof typeof PILL }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PILL[kind] ?? PILL.enquiry}`}>
      {children}
    </span>
  );
}

export function Note({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  const cls = tone === "warn"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-slate-200 bg-white text-slate-700";
  return <p className={`rounded-md border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div role="status" className="px-4 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </div>
  );
}
