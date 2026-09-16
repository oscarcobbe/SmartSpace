/**
 * The pieces every CRM section is built from.
 *
 * One definition each, so a figure on Finance sits on the same baseline and
 * carries the same padding as one on Marketing. Written inline per page, these
 * drifted apart within a day.
 *
 * The palette is deliberate and narrow. Slate carries the whole interface;
 * green, amber and red mean only good, needs-attention and bad; and the brand
 * orange is reserved for marks that represent money, which is why it appears on
 * chart bars and the site dot and nowhere else. An accent spent on chrome stops
 * being able to point at anything.
 */
import type { ReactNode } from "react";

export function PageHeader({ title, sub, aside }: { title: string; sub?: string; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-slate-600">{sub}</p>}
      </div>
      {aside && <div className="shrink-0 text-sm text-slate-500">{aside}</div>}
    </div>
  );
}

export function Panel({ title, children, aside }: { title?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Figures carry no border of their own. Everything on these pages is a number,
 * and an outline around each one produced a grid of equally important boxes
 * with no hierarchy left to spend.
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
    /* Five tiles into two columns leaves the fifth alone with an empty cell
       beside it, and into three columns leaves two in a row of three. Letting
       the last one span the gap fills both, and at five across it is a no-op. */
    <div className="flex flex-col px-4 py-3.5 last:col-span-2 lg:last:col-span-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-[26px] font-semibold leading-none tabular-nums ${toneClass}`}>{value}</p>
      {/* Reserved height rather than conditional, so tiles with a note and
          tiles without still sit on the same baseline in the same row. */}
      <p className="mt-1.5 min-h-[2rem] text-xs leading-4 text-slate-500">{note ?? ""}</p>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
      {children}
    </div>
  );
}

const PILL: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  upcoming: "bg-sky-50 text-sky-800 ring-sky-600/20",
  enquiry: "bg-slate-100 text-slate-700 ring-slate-500/20",
  consult: "bg-amber-50 text-amber-800 ring-amber-600/20",
  install: "bg-amber-50 text-amber-800 ring-amber-600/20",
};

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className ?? PILL.enquiry}`}>
      {children}
    </span>
  );
}

export const PILL_KIND = PILL;

export function Note({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  const cls = tone === "warn"
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : "border-slate-200 bg-white text-slate-700";
  return <p className={`rounded-xl border px-4 py-3 text-sm ${cls}`}>{children}</p>;
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div role="status" className="px-4 py-14 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{detail}</p>}
    </div>
  );
}

/**
 * Finance waits on Stripe and Marketing waits on Google, several seconds each.
 * Without these the page was blank for the whole of that wait and the app read
 * as broken rather than busy.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} aria-hidden="true" />;
}

export function LoadingPage({ title, rows = 6 }: { title: string; rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
      <PageHeader title={title} />
      <div className="mb-6 grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2.5 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0">
            <Skeleton className="h-3 w-16 shrink-0" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
