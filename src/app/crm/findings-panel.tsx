import { TrendingUp, AlertTriangle, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import type { Finding } from "@/lib/crm/findings";
import { Panel } from "./ui";

const STYLE: Record<Finding["kind"], { ring: string; icon: typeof Info; tint: string; word: string }> = {
  win: { ring: "border-l-emerald-500", icon: TrendingUp, tint: "text-emerald-600", word: "Working" },
  risk: { ring: "border-l-amber-500", icon: AlertTriangle, tint: "text-amber-600", word: "Watch" },
  next: { ring: "border-l-sky-500", icon: ArrowRight, tint: "text-sky-600", word: "Do next" },
  note: { ring: "border-l-slate-300", icon: Info, tint: "text-slate-500", word: "Note" },
};

/* Do-next first, then what is going wrong, then what is going right. A page
   nobody has time to read should open on the thing to act on. */
const ORDER: Record<Finding["kind"], number> = { next: 0, risk: 1, win: 2, note: 3 };

export default function Findings({ findings, title = "What this says" }: { findings: Finding[]; title?: string }) {
  const sorted = [...findings].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  return (
    <Panel title={title}>
      <ul className="divide-y divide-slate-100">
        {sorted.map((f, i) => {
          const s = STYLE[f.kind];
          const Icon = s.icon;
          return (
            <li key={i} className={`border-l-4 ${s.ring} px-4 py-3`}>
              <div className="flex items-start gap-2.5">
                <Icon className={`mt-0.5 h-4 w-4 flex-none ${s.tint}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    <span className="sr-only">{s.word}: </span>{f.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{f.detail}</p>
                  {f.href && (
                    <Link href={f.href} className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline">
                      {f.hrefLabel ?? "Open"} →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
