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
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { GLOSSARY, type GlossaryKey } from "@/lib/crm/glossary";
import { SlowNote } from "./slow-note";

/**
 * One title size for every page, and room for the aside to drop under it on a
 * phone rather than squeezing the title into two lines beside a button.
 */
export function PageHeader({ title, sub, aside }: { title: string; sub?: string; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-slate-900 sm:text-2xl">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">{sub}</p>}
      </div>
      {aside && <div className="min-w-0 max-w-full text-sm text-slate-500">{aside}</div>}
    </div>
  );
}

/**
 * Two weights of panel, because a page of one weight has no hierarchy left.
 *
 * Finance drew its chart, its Stripe balances and its bank-import prompt in
 * three identical white cards with the same border and the same radius, so
 * nothing on the page said which of them was the point of it. "card" is the
 * thing the page is about; "quiet" is the supporting note that sits under it.
 */
export function Panel({ title, children, aside, tone = "card" }: {
  title?: string; children: ReactNode; aside?: ReactNode; tone?: "card" | "quiet";
}) {
  const shell = tone === "quiet"
    ? "border-slate-200/80 bg-slate-50"
    : "border-slate-200 bg-white";
  const rule = tone === "quiet" ? "border-slate-200/80" : "border-slate-200";
  return (
    <section className={`crm-enter overflow-hidden rounded-xl border shadow-[0_1px_2px_rgb(15_23_42/0.04)] ${shell}`}>
      {(title || aside) && (
        <div className={`flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b ${rule} px-4 py-2.5`}>
          {title && <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>}
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
/**
 * What a figure means, one click away from the figure itself.
 *
 * A details element rather than a hover tooltip: it works with a keyboard and
 * on a phone without any script, and the text is in the page for a screen
 * reader whether it is open or not. The panel is positioned over its
 * neighbours rather than pushing them, so opening one does not shuffle the row.
 */
export function Explain({ term, label }: { term: GlossaryKey; label?: string }) {
  const d = GLOSSARY[term];
  if (!d) return null;
  return (
    /*
     * Three layers inside a Stat, and they have to stay in this order:
     *   z-0   the full-tile link overlay, so the whole card is clickable
     *   z-10  the sparkline, so it still answers the pointer
     *   z-30  this, so the open panel covers both
     * Pinning the glossary and the sparkline to the same level left the order
     * to the DOM, and the sparkline comes later, so its line was drawn through
     * the sentence explaining the figure.
     */
    <details className="relative z-30 inline-block align-middle">
      <summary
        className="ml-1 inline-flex h-4 w-4 cursor-pointer list-none items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold leading-none text-slate-500 hover:border-slate-500 hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-900 [&::-webkit-details-marker]:hidden"
        aria-label={label ? `What ${label} means` : "What this figure means"}
      >
        ?
      </summary>
      <div className="absolute left-0 top-6 z-20 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg">
        <p className="text-xs font-normal normal-case tracking-normal text-slate-700">{d.plain}</p>
        <p className="mt-1.5 text-[11px] font-normal normal-case tracking-normal text-slate-500">
          <span className="font-semibold text-slate-600">Made of: </span>{d.madeOf}
        </p>
        {d.caution && (
          <p className="mt-1.5 border-l-2 border-slate-300 pl-2 text-[11px] font-normal normal-case tracking-normal text-slate-600">
            {d.caution}
          </p>
        )}
      </div>
    </details>
  );
}

export function Stat({ label, value, note, tone = "plain", explain, source, trend }: {
  label: string; value: string; note?: string; tone?: "plain" | "good" | "warn" | "bad" | "cost" | "muted";
  explain?: GlossaryKey;
  /**
   * Where the rows behind this figure live. Nigel's rule: no number that
   * cannot be checked. A definition says what a figure is made of; this is
   * how he gets to the thing it is made of.
   */
  source?: { href: string; label: string };
  /**
   * The same figure's recent shape, drawn under it.
   *
   * Marketing used to carry a row of four sparkline cards directly above a row
   * of five figures, both saying spend, enquiries, cost each and work won. Two
   * rows answering one question is exactly the clutter D2 is about.
   */
  trend?: ReactNode;
}) {
  /*
   * Colour by what the figure means, not by how it felt when it was written.
   * Finance had card fees in black and refunds in orange, which are the same
   * kind of number, and the reader has to learn the exception.
   *
   *   money in  → slate, the default, because most figures are neutral
   *   kept      → emerald, the one number that is genuinely good news
   *   cost      → amber, anything that leaves
   *   bad       → rose, reserved for something actually wrong
   */
  const toneClass = {
    plain: "text-slate-900",
    good: "text-emerald-700",
    warn: "text-amber-700",
    bad: "text-rose-700",
    cost: "text-amber-700",
    /* A figure that could not be read, or that does not exist yet. Grey, so
       "Not read" never looks like a number. */
    muted: "text-slate-400",
  }[tone];
  /*
   * A tile with rows behind it is the whole target, not just the small link
   * under it. The underlined words stay: they say where the click goes, which
   * a whole-card hover state cannot.
   */
  const interactive = source
    ? "group relative cursor-pointer hover:bg-slate-50 focus-within:bg-slate-50"
    : "";
  return (
    <div className={`flex flex-col px-4 py-3.5 ${interactive}`}>
      {/* A div, not a p. Explain renders a details with a div inside it, and
          neither is legal inside a paragraph: the browser closed the p early
          and React failed to hydrate the whole page. */}
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {explain && <Explain term={explain} label={label} />}
      </div>
      <p className={`mt-1.5 text-[27px] font-semibold leading-none tracking-[-0.02em] tabular-nums ${toneClass}`}>{value}</p>
      {/* Reserved height rather than conditional, so tiles with a note and
          tiles without still sit on the same baseline in the same row. */}
      <p className="mt-1.5 min-h-[2rem] text-xs leading-4 text-slate-500">{note ?? ""}</p>
      {trend && <div className="relative z-10 mt-1.5">{trend}</div>}
      {source && (
        <a href={source.href}
           /* Deliberately NOT relative. before:inset-0 resolves against the
              nearest positioned ancestor, which has to be the tile: making the
              anchor itself positioned shrinks the overlay to the width of the
              words and the rest of the card stops being clickable. */
           className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 before:absolute before:inset-0 before:z-0 before:content-[''] group-hover:text-slate-900 group-hover:decoration-slate-600">
          {source.label}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
        </a>
      )}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    /* Five tiles into two columns leaves the fifth alone with an empty cell
       beside it, and into three columns leaves two in a row of three. Letting
       the last one span the gap fills both, and at five across it is a no-op.
       It lives here rather than on Stat because it is a fact about this row of
       five, and on Stat it also fired inside every other grid a figure sits in. */
    /* Deliberately not overflow-hidden. The glossary panel opens below its
       figure and is taller than the row, so clipping the row cut the
       explanation off mid-sentence. */
    <div className="mb-6 grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5 [&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1">
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

/**
 * A sentence the reader needs, above all when a source did not answer.
 *
 * The warning tone carries an icon and role="status", because it is the one
 * thing on a page that says the figures around it are incomplete, and a pale
 * amber box on its own was easy to read past.
 */
export function Note({ tone = "info", children }: { tone?: "info" | "warn"; children: ReactNode }) {
  if (tone === "warn") {
    return (
      <div role="status" className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        {/* anywhere, because these name environment variables, and
            SCL_DASHBOARD_PASSWORD as one unbreakable word pushed the whole
            overview eight pixels wider than a phone. */}
        <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
      </div>
    );
  }
  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{children}</div>;
}

/** Link a panel header offers, as a real target rather than a word. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="-mr-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:min-h-[32px]">
      {children}
      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
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
  return <div className={`crm-skeleton animate-pulse rounded-md bg-slate-200/70 ${className}`} aria-hidden="true" />;
}

export function LoadingPage({ title, rows = 6, slow }: { title: string; rows?: number; slow?: string | null }) {
  return (
    <div role="status" aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
      <PageHeader title={title} />
      {slow && <SlowNote>{slow}</SlowNote>}
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
