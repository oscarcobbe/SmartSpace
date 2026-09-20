/**
 * Yesterday, in a sentence, before anything else on the page.
 *
 * "A report each day of the day before, up or down." It reads the most recent
 * COMPLETE day rather than today, because today is still filling: reporting a
 * half day as a fall is how a dashboard lies before lunch.
 *
 * The headline follows enquiries, not spend. Spending more is not good news on
 * its own, and a card that says "up 40%" about cost reads as a win to anybody
 * skimming.
 */
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { DailyReport as Report } from "@/lib/crm/ads-periods";

const TONE = {
  up:   { ring: "ring-emerald-200", bg: "from-emerald-50 to-white", dot: "bg-emerald-500", text: "text-emerald-800", Icon: ArrowUpRight },
  down: { ring: "ring-rose-200",    bg: "from-rose-50 to-white",    dot: "bg-rose-500",    text: "text-rose-800",    Icon: ArrowDownRight },
  flat: { ring: "ring-slate-200",   bg: "from-slate-50 to-white",   dot: "bg-slate-400",   text: "text-slate-800",   Icon: Minus },
} as const;

export function DailyReport({ report }: { report: Report }) {
  const t = TONE[report.direction];
  return (
    <section
      className={`mb-6 overflow-hidden rounded-xl bg-gradient-to-br ${t.bg} p-4 shadow-sm ring-1 ${t.ring} transition-shadow duration-300 hover:shadow-md`}
      aria-label={`Report for ${report.label}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full ${t.dot}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Yesterday
          </p>
          <h2 className={`mt-1 flex items-center gap-1.5 text-base font-semibold ${t.text}`}>
            <t.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {report.headline}
          </h2>
          <ul className="mt-2 space-y-1">
            {report.lines.map((line, i) => (
              <li
                key={i}
                className="animate-[fadeIn_400ms_ease-out_both] text-sm text-slate-700"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
