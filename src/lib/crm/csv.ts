/**
 * One CSV writer, because Nigel opens these in Excel.
 *
 * Every field is quoted and every quote doubled, so a customer whose address
 * contains a comma does not silently shift every column after it. Values that
 * begin with =, +, - or @ are prefixed with an apostrophe: Excel and Sheets
 * treat those as formulas, and a name or message starting with one becomes
 * live code in the sheet the moment it is opened. The same rule already
 * guards the SmartCare Living sheet writer, for the same reason.
 */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (s === "-") s = "";
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n");
}

/** Prompts the browser to save the text as a file. Client side only. */
export function downloadCsv(filename: string, contents: string) {
  /* The BOM is what makes Excel on Windows read this as UTF-8. Without it an
     Eircode is fine and "Máire Ní Dhomhnaill" is not. */
  const blob = new Blob(["﻿" + contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
