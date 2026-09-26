"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, Upload } from "lucide-react";
import { readStatement, commitStatement, type PreviewState } from "./actions";
import { Panel, Note } from "../../ui";

const initial: PreviewState = { status: "idle" };

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? "Working" : children}
    </button>
  );
}

const money = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function ImportForm() {
  const [readState, read] = useFormState(readStatement, initial);
  const [writeState, write] = useFormState(commitStatement, initial);

  if (writeState.status === "done") {
    return (
      <Note>
        <span className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          {writeState.message} They are counted on Finance from now on. Importing the same file
          again updates these lines rather than adding them twice.
        </span>
      </Note>
    );
  }

  return (
    <div className="space-y-6">
      <form action={read} className="space-y-3">
        <label htmlFor="file" className="block text-sm font-medium text-slate-700">
          Statement file
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
        />
        <Submit>
          <Upload className="h-4 w-4" aria-hidden="true" />
          Read the file
        </Submit>
      </form>

      {readState.status === "error" && <Note tone="warn">{readState.message}</Note>}
      {writeState.status === "error" && <Note tone="warn">{writeState.message}</Note>}

      {readState.status === "ready" && readState.result && (
        <>
          {/* Shown before anything is written, because this parser has never
              seen a real Revolut export and a wrong column is far cheaper to
              catch here than in a reconciled total. */}
          <Panel title="What was read">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-4 text-sm sm:grid-cols-3">
              {Object.entries(readState.result.mapping).map(([field, column]) => (
                <div key={field}>
                  <dt className="text-xs text-slate-500">{field}</dt>
                  <dd className={column ? "text-slate-900" : "text-slate-400"}>{column ?? "not found"}</dd>
                </div>
              ))}
            </dl>
            {readState.result.unmapped.length > 0 && (
              <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
                Ignored columns: {readState.result.unmapped.join(", ")}
              </p>
            )}
          </Panel>

          <Panel title={`First lines of ${readState.result.lines.length}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th scope="col" className="px-4 py-2 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Description</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Amount</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {readState.result.lines.slice(0, 8).map((l) => (
                    <tr key={l.external_id}>
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums text-slate-600">{l.happened_on}</td>
                      <td className="max-w-[18rem] px-4 py-2">
                        <span className="block truncate text-slate-900" title={l.description}>{l.description}</span>
                      </td>
                      <td className={`px-4 py-2 text-right tabular-nums ${l.amount_cents < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        {money(l.amount_cents)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                        {l.balance_cents == null ? "None" : money(l.balance_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {readState.result.skipped.length > 0 && (
              <div className="border-t border-slate-200 px-4 py-3">
                <p className="text-xs font-medium text-amber-800">
                  {readState.result.skipped.length} line{readState.result.skipped.length === 1 ? "" : "s"} could not be read and will not be imported:
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {readState.result.skipped.map((s) => (
                    <li key={s.row}>Row {s.row}: {s.reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <form action={write} className="space-y-3">
            <input type="hidden" name="payload" value={readState.payload ?? ""} />
            <p className="text-sm text-slate-600">
              Check the dates and the amounts above against the statement in front of you. If a
              column is wrong, nothing has been saved and you can close this page.
            </p>
            <Submit>Import {readState.result.lines.length} lines</Submit>
          </form>
        </>
      )}
    </div>
  );
}
