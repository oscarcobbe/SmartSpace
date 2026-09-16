"use client";

import { Download } from "lucide-react";
import { toCsv, downloadCsv } from "@/lib/crm/csv";

/**
 * Built on the server and handed down as plain arrays, so the page does not
 * ship a second copy of the data it already rendered as HTML.
 */
export default function ExportButton({
  filename, headers, rows, label = "Export",
}: {
  filename: string;
  headers: string[];
  rows: (string | number | null)[][];
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(`${filename}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows))}
      className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
