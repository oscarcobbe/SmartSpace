"use server";

/**
 * Importing a bank statement, in two deliberate halves.
 *
 * `readStatement` parses and returns what it understood, writing nothing.
 * `commitStatement` writes what the person confirmed. They are separate because
 * this parser has never seen a real Revolut export: the preview is where a
 * wrong column mapping gets caught, rather than in a table full of zeroes that
 * somebody later reconciles against.
 */
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/crm/session";
import { crm, crmConfigured } from "@/lib/crm/db";
import { parseRevolutCsv, ParseError, type ParseResult } from "@/lib/crm/revolut";

export interface PreviewState {
  status: "idle" | "ready" | "error" | "done";
  message?: string;
  result?: ParseResult;
  /** The parsed lines, carried through the confirm step in the form. */
  payload?: string;
  written?: number;
}

/* A statement is a few hundred lines. Anything much past that is not a
   statement, and parsing it would tie up the request for no good reason. */
const MAX_BYTES = 4_000_000;

export async function readStatement(_prev: PreviewState, formData: FormData): Promise<PreviewState> {
  requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a CSV file first." };
  }
  if (file.size > MAX_BYTES) {
    return { status: "error", message: "That file is larger than four megabytes, which is bigger than any statement. Check it is the right file." };
  }

  try {
    const result = parseRevolutCsv(await file.text());
    if (result.lines.length === 0) {
      return { status: "error", message: "Nothing in that file could be read as a statement line.", result };
    }
    return {
      status: "ready",
      result,
      payload: JSON.stringify(result.lines),
      message: `${result.lines.length} lines read from ${file.name}.`,
    };
  } catch (err) {
    if (err instanceof ParseError) return { status: "error", message: err.message };
    return { status: "error", message: "That file could not be read." };
  }
}

export async function commitStatement(_prev: PreviewState, formData: FormData): Promise<PreviewState> {
  const { site, email } = requireSession();
  if (!crmConfigured()) {
    return { status: "error", message: "The database is not connected on this deployment." };
  }

  const raw = String(formData.get("payload") ?? "");
  let lines: Record<string, unknown>[];
  try {
    lines = JSON.parse(raw);
  } catch {
    return { status: "error", message: "The preview expired. Choose the file again." };
  }
  if (!Array.isArray(lines) || lines.length === 0) {
    return { status: "error", message: "There was nothing to import." };
  }

  /*
   * Only the columns a bank statement has.
   *
   * The payload is a hidden form field that round trips through the browser,
   * so a signed-in user editing it could set ANY column on crm_bank_lines to
   * any value: `{ ...l }` spread whatever the field contained. site and
   * imported_by were overridden so tenancy held, and nothing else was. An
   * allow-list is the only version of this that stays correct when a column is
   * added to the table.
   */
  const KEEP = [
    "external_id", "happened_on", "description", "counterparty",
    "amount_cents", "fee_cents", "balance_cents", "kind",
  ] as const;
  const rows = lines.map((l) => {
    const row: Record<string, unknown> = { site, imported_by: email };
    for (const k of KEEP) if (k in l) row[k] = l[k];
    return row;
  });

  try {
    /* merge-duplicates on the unique index, so the same statement imported
       twice updates its own rows instead of doubling the balance. Chunked
       because PostgREST has a request size limit and a year of statements is
       thousands of lines. */
    for (let i = 0; i < rows.length; i += 500) {
      await crm("crm_bank_lines?on_conflict=site,external_id", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: JSON.stringify(rows.slice(i, i + 500)),
      });
    }
    revalidatePath("/crm/finance");
    return { status: "done", written: rows.length, message: `${rows.length} lines imported.` };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "The lines could not be written.",
    };
  }
}
