import type { ApprovalState } from "@/lib/signoff/verdict";

/** How each sign-off state reads on screen, the same on every CRM page. */
export const SIGNOFF_BADGE: Record<ApprovalState, { label: string; className: string }> = {
  waiting: { label: "Waiting for you", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  changes: { label: "Changes asked for", className: "bg-rose-50 text-rose-800 ring-rose-600/20" },
  stale: { label: "Changed since approval", className: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  unknown: { label: "Could not be read", className: "bg-slate-100 text-slate-700 ring-slate-500/20" },
};
