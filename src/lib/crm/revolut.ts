/**
 * Reading a Revolut Business statement.
 *
 * Written without a real statement in front of me, which is the important
 * thing to know about it. So it does not assume a column order and it does not
 * assume one set of header names: it looks for each field among several
 * spellings Revolut has used, and if it cannot find the date or the amount it
 * says so and imports nothing rather than filing a pile of zeroes.
 *
 * The page that calls it shows what it understood before anything is written,
 * so the first real file proves the parser rather than corrupting a table.
 */

export interface BankLine {
  happened_on: string;      // YYYY-MM-DD
  description: string;
  counterparty: string | null;
  reference: string | null;
  amount_cents: number;     // negative is money out
  fee_cents: number;
  balance_cents: number | null;
  currency: string;
  kind: string | null;
  state: string | null;
  external_id: string;
}

export interface ParseResult {
  lines: BankLine[];
  /** Header names the file had that nothing was mapped from. */
  unmapped: string[];
  /** Rows that could not be read, with the reason, capped for display. */
  skipped: { row: number; reason: string }[];
  /** How each field was resolved, so the person importing can check it. */
  mapping: Record<string, string | null>;
}

export class ParseError extends Error {}

/** Splits one CSV line, honouring quotes and doubled quotes inside them. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** The first header that matches, or null. Matching is on the normalised name. */
function pick(headers: string[], candidates: string[]): number {
  const normalised = headers.map(norm);
  for (const candidate of candidates) {
    const i = normalised.indexOf(norm(candidate));
    if (i !== -1) return i;
  }
  return -1;
}

/** "12/03/2026", "2026-03-12" and "2026-03-12 14:03:11" all become 2026-03-12. */
function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  /* Day first. Revolut exports in the account's locale and an Irish account is
     day first, so 03/12 is the third of December, not the twelfth of March.
     Where the first number is above twelve this is certain; where it is not,
     day first is still the right reading for this account, and the import
     preview is where a wrong one would be caught. */
  m = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/.exec(s);
  if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

/** "-1,234.56" and "(1234.56)" both become -123456. Blank becomes null. */
function toCents(raw: string): number | null {
  let s = raw.trim().replace(/[€£$\s,]/g, "");
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (s.startsWith("-")) { negative = true; s = s.slice(1); }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return negative ? -cents : cents;
}

export function parseRevolutCsv(text: string): ParseResult {
  const rows = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (rows.length < 2) throw new ParseError("That file has no rows under its header.");

  const headers = splitLine(rows[0]);
  const at = {
    date: pick(headers, ["Date completed (UTC)", "Date completed", "Completed date", "Date", "Date started (UTC)", "Date started"]),
    description: pick(headers, ["Description", "Reference", "Details"]),
    counterparty: pick(headers, ["Payer", "Beneficiary", "Counterparty", "Name"]),
    reference: pick(headers, ["Reference", "Payment reference"]),
    amount: pick(headers, ["Amount", "Payment amount", "Total amount", "Orig amount"]),
    fee: pick(headers, ["Fee", "Fees"]),
    balance: pick(headers, ["Balance", "Running balance"]),
    currency: pick(headers, ["Payment currency", "Currency", "Orig currency"]),
    kind: pick(headers, ["Type", "Transaction type"]),
    state: pick(headers, ["State", "Status"]),
    id: pick(headers, ["ID", "Transaction ID", "Reference ID"]),
  };

  if (at.date === -1 || at.amount === -1) {
    throw new ParseError(
      `That does not look like a Revolut statement. It needs a date column and an amount column; this file has ${headers.join(", ")}.`,
    );
  }

  const used = new Set(Object.values(at).filter((i) => i !== -1));
  const unmapped = headers.filter((_, i) => !used.has(i));

  const lines: BankLine[] = [];
  const skipped: { row: number; reason: string }[] = [];
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = splitLine(rows[r]);
    const get = (i: number) => (i === -1 ? "" : cells[i] ?? "");

    const happened_on = toIsoDate(get(at.date));
    const amount_cents = toCents(get(at.amount));
    if (!happened_on) { skipped.push({ row: r + 1, reason: `Could not read the date "${get(at.date)}"` }); continue; }
    if (amount_cents === null) { skipped.push({ row: r + 1, reason: `Could not read the amount "${get(at.amount)}"` }); continue; }

    const description = get(at.description) || get(at.kind) || "Bank line";

    /* Where the statement gives no id, one is built from the fields that
       together identify a line, so re-importing the same file updates rather
       than duplicates. Two genuinely identical lines on one day collapse into
       one, which is wrong but is the lesser wrong: a duplicated statement is
       the thing that actually happens. */
    let external_id = get(at.id).trim();
    if (!external_id) {
      external_id = `${happened_on}|${amount_cents}|${description}`.slice(0, 200);
    }
    if (seen.has(external_id)) { skipped.push({ row: r + 1, reason: "Same line as one already read" }); continue; }
    seen.add(external_id);

    lines.push({
      happened_on,
      description,
      counterparty: get(at.counterparty) || null,
      reference: at.reference !== at.description ? get(at.reference) || null : null,
      amount_cents,
      fee_cents: toCents(get(at.fee)) ?? 0,
      balance_cents: toCents(get(at.balance)),
      currency: (get(at.currency) || "EUR").toUpperCase().slice(0, 8),
      kind: get(at.kind) || null,
      state: get(at.state) || null,
      external_id,
    });
  }

  const name = (i: number) => (i === -1 ? null : headers[i]);
  return {
    lines,
    unmapped,
    skipped: skipped.slice(0, 20),
    mapping: {
      Date: name(at.date), Amount: name(at.amount), Description: name(at.description),
      Counterparty: name(at.counterparty), Fee: name(at.fee), Balance: name(at.balance),
      Currency: name(at.currency), Type: name(at.kind), State: name(at.state), Id: name(at.id),
    },
  };
}
