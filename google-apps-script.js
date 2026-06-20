/**
 * Google Apps Script — paste this into Extensions > Apps Script
 * in a new (or existing) Google Sheet called "Smart Space Leads".
 *
 * Then: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 * Copy the URL and set it as GOOGLE_SHEET_WEBHOOK_URL in Vercel.
 *
 * IMPORTANT: After pasting, run setupHeaders() once from the Apps Script editor
 * to create (or upgrade) the column headers. Safe to re-run — it adds any
 * missing columns without touching existing rows.
 */

// ============================================================================
// >>> CLEAN + FIX. Pick `cleanAndFixLeads` in the dropdown, press Run.     <<<
// ============================================================================
//
// Verified against the Gmail lead notifications: the smart-space site had NO
// real customer leads before late April 2026 (April was setup tests + bot
// spam). So this function, safely and reversibly:
//   1. Backs up the Leads tab first.
//   2. MOVES (never deletes) test rows + bot-spam rows to a "Quarantine" tab.
//   3. Un-swaps any lead date that lands outside the real window (before
//      1 Apr 2026, or in the future) - those are guaranteed day/month swaps.
//   4. Builds two clean tabs: "Weekly Ad Performance" (real Google Ads spend
//      vs organic, per week) and "Customer Tracker" (every lead with its
//      source and value, newest first).
//   5. Diagnoses the GCLID/Status column mix-up and logs the exact layout.
//      The reports are correct either way because the gclid is read per-row.
// Check the Quarantine tab after; anything real in there is one copy-paste back.
var LEADS_START = "2026-04-01"; // first real lead month (Gmail-verified)

function cleanAndFixLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads");
  if (!sheet) throw new Error("No 'Leads' tab found.");
  var log = [];

  var stamp = Utilities.formatDate(new Date(), "Europe/Dublin", "yyyy-MM-dd HHmmss");
  sheet.copyTo(ss).setName("Leads (backup " + stamp + ")");
  log.push("Backup saved as 'Leads (backup " + stamp + ")'.");

  if (ss.getSpreadsheetLocale() !== "en_IE") {
    try { ss.setSpreadsheetLocale("en_IE"); } catch (e) { ss.setSpreadsheetLocale("en_GB"); }
  }

  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 2) { Logger.log("No data rows."); return; }
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var iName = headers.indexOf("Name"), iEmail = headers.indexOf("Email");
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var junkRowNums = [], junkData = [];
  data.forEach(function (row, idx) {
    var name = iName >= 0 ? String(row[iName] || "") : "";
    var email = iEmail >= 0 ? String(row[iEmail] || "") : "";
    if (isJunkRow_(name, email)) { junkRowNums.push(idx + 2); junkData.push(row); }
  });

  // Safety: refuse to gut nearly everything (catches a bad pattern before harm).
  if (junkRowNums.length > data.length * 0.9) {
    throw new Error("Aborted for safety: " + junkRowNums.length + "/" + data.length +
      " rows flagged as junk (over 90%). That looks like a matching bug, not reality. " +
      "Nothing was changed. Send me a screenshot of the Leads Name + Email columns.");
  }

  var q = ss.getSheetByName("Quarantine (test + spam)"); if (q) ss.deleteSheet(q);
  q = ss.insertSheet("Quarantine (test + spam)");
  q.getRange(1, 1, 1, lastCol).setValues([headers])
    .setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  if (junkData.length) q.getRange(2, 1, junkData.length, lastCol).setValues(junkData);
  q.setFrozenRows(1);

  junkRowNums.sort(function (a, b) { return b - a; })
             .forEach(function (rn) { sheet.deleteRow(rn); });
  log.push("Moved " + junkRowNums.length + " test/spam rows to 'Quarantine (test + spam)'.");

  var changes = repairDatesWindowed_(sheet);
  writeChangeLog_(ss, "Date Repair Log", ["Row", "Column", "Before", "After"], changes,
                  changes.length ? null : "No out-of-window dates found.");
  log.push(changes.length + " corrupted date(s) un-swapped (see 'Date Repair Log').");

  organizeLeadsByCategory();
  diagnoseGclid_(sheet, log);
  var leads = gatherLeads_(sheet);
  try { buildWeeklyAdPerformance_(ss, leads); log.push("Built 'Weekly Ad Performance' (real ad spend vs organic)."); }
  catch (e) { log.push("Weekly report failed: " + e.message); }
  try { buildCustomerTracker_(ss, leads); log.push("Built 'Customer Tracker' (" + leads.length + " leads)."); }
  catch (e) { log.push("Tracker failed: " + e.message); }
  // Remove the old/confusing estimate-based report tabs.
  ["Ads vs Organic (weekly)", "Ads vs Organic leads (weekly)"].forEach(function (nm) {
    var t = ss.getSheetByName(nm); if (t) ss.deleteSheet(t);
  });

  SpreadsheetApp.flush();
  var summary = "CLEAN + FIX COMPLETE\n - " + log.join("\n - ") +
    "\n\nCheck the 'Quarantine (test + spam)' tab. Anything real in there copies straight back. " +
    "Then redeploy: Deploy > Manage deployments > New version.";
  Logger.log(summary);
  try { SpreadsheetApp.getUi().alert(summary); } catch (e) {}
  return summary;
}

function isoOf_(d) {
  var hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  return Utilities.formatDate(d, "Europe/Dublin", hasTime ? "yyyy-MM-dd HH:mm" : "yyyy-MM-dd");
}

// Conservative, high-confidence test/spam classifier. When unsure, KEEPS the row.
function isJunkRow_(name, email) {
  var e = String(email || "").trim().toLowerCase();
  var n = String(name || "").trim();
  if (/@smart-space\.ie$/.test(e)) return true;                    // staff, never a customer
  if (/@testcustomer\.ie$/.test(e)) return true;
  if (/\+claudetest/.test(e)) return true;
  if (/^(oscarcobbe2017(\+[^@]*)?@icloud\.com|oscar@gmail\.com|cobbenigel@gmail\.com)$/.test(e)) return true;
  if (/^(conversion test|webhook test|final test|diagnostics test|debug|zz test.*|claude test.*|test|free consultation|oscar cobbe|nigel cobbe|oscar)$/i.test(n)) return true;
  if (/^[A-Za-z]{12,}$/.test(n) && /[a-z]/.test(n) && /[A-Z]/.test(n)) return true; // bot gibberish name
  var local = e.split("@")[0] || "";
  if ((local.match(/\./g) || []).length >= 4) return true;          // bot gibberish email
  return false;
}

// Like repairDates_, but treats anything OUTSIDE [1 Apr 2026 .. today] on the
// lead Date column as a guaranteed day/month swap and transposes it back.
function repairDatesWindowed_(sheet) {
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var startMs = new Date(2026, 3, 1).getTime();
  var now = new Date();
  var endMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
  var changes = [];
  var plan = [
    { col: headers.indexOf("Date") + 1, swap: true },
    { col: headers.indexOf("Booking Date") + 1, swap: false },
  ].filter(function (p) { return p.col >= 1; });

  plan.forEach(function (p) {
    var rng = sheet.getRange(2, p.col, lastRow - 1, 1);
    var vals = rng.getValues(), out = [];
    for (var r = 0; r < vals.length; r++) {
      var v = vals[r][0];
      if (v === "" || v === null) { out.push([v]); continue; }
      var d = parseSheetDate_(v);
      if (!d) { out.push([v]); continue; }
      var before = (Object.prototype.toString.call(v) === "[object Date]") ? isoOf_(d) : String(v).trim();
      var fixed = d, note = "";
      if (p.swap && (d.getTime() < startMs || d.getTime() > endMs)) {
        var sw = new Date(d.getFullYear(), d.getDate() - 1, d.getMonth() + 1, d.getHours(), d.getMinutes());
        if (!isNaN(sw.getTime()) && sw.getTime() >= startMs && sw.getTime() <= endMs) {
          fixed = sw; note = "  (day/month un-swapped)";
        }
      }
      var iso = isoOf_(fixed);
      out.push([iso]);
      if (before !== iso) changes.push([r + 2, headers[p.col - 1], before, iso + note]);
    }
    rng.setNumberFormat("@");
    rng.setValues(out);
  });
  return changes;
}

function writeChangeLog_(ss, tabName, header, rows, emptyNote) {
  var ex = ss.getSheetByName(tabName); if (ex) ss.deleteSheet(ex);
  var s = ss.insertSheet(tabName);
  s.getRange(1, 1, 1, header.length).setValues([header])
    .setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  if (rows && rows.length) s.getRange(2, 1, rows.length, header.length).setValues(rows);
  else if (emptyNote) s.getRange(2, 1).setValue(emptyNote);
  s.setFrozenRows(1);
  s.setColumnWidth(Math.min(3, header.length), 210);
  s.setColumnWidth(header.length, 240);
}

// ---------------------------------------------------------------------------
// Real Google Ads spend + clicks per week (Monday start), from your Google Ads
// "Time series" export (2026-02-23 to 2026-06-20). Update these when you pull a
// fresh export; weeks not listed count as zero spend. Organic always costs 0.
var WEEKLY_AD_DATA = {
  "2026-04-13": { spend: 133.69, clicks: 88 },
  "2026-04-20": { spend: 217.42, clicks: 127 },
  "2026-04-27": { spend: 49.11,  clicks: 34 },
  "2026-05-04": { spend: 81.98,  clicks: 56 },
  "2026-05-11": { spend: 127.99, clicks: 68 },
  "2026-05-18": { spend: 120.20, clicks: 60 },
  "2026-05-25": { spend: 98.63,  clicks: 49 },
  "2026-06-01": { spend: 117.77, clicks: 58 },
  "2026-06-08": { spend: 121.12, clicks: 46 },
  "2026-06-15": { spend: 145.03, clicks: 40 },
};

// Returns the Google click ID (gclid) found anywhere in a row, or "". Scans
// every cell so it works even if the GCLID column is mislabelled or out of
// place: a long alphanumeric token, not a Stripe id, no @/space/URL characters.
function rowGclid_(row) {
  for (var i = 0; i < row.length; i++) {
    var v = String(row[i] || "").trim();
    if (v.length >= 30 && /^[A-Za-z0-9_-]+$/.test(v) &&
        !/^(cs|pi|ch|in|sub|cus|pm|re|tr|po|seti|prod|price)_/.test(v)) return v;
  }
  return "";
}

// Best-effort detection of the Amount column by content (small money values or
// "Complimentary"), so it survives the column mis-alignment. -1 if not found.
function detectAmountCol_(sample, lastCol) {
  var best = -1, bestHits = 0;
  for (var c = 0; c < lastCol; c++) {
    var hits = 0, tot = 0;
    for (var i = 0; i < sample.length; i++) {
      var v = String(sample[i][c] || "").trim();
      if (!v) continue;
      tot++;
      if (/complimentary|^free$/i.test(v)) { hits++; continue; }
      var digits = v.replace(/[^0-9]/g, "");
      var num = parseFloat(v.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0 && num < 10000 && digits.length <= 4) hits++;
    }
    if (tot >= 3 && hits / tot > 0.5 && hits > bestHits) { bestHits = hits; best = c; }
  }
  return best;
}

// Pull real leads into objects {date, week, name, type, source, amount}.
// Date/Type/Name are columns 1-3 (identical in every layout); source comes from
// rowGclid_ (per-row, layout-proof); amount from detectAmountCol_.
function gatherLeads_(sheet) {
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var amtCol = detectAmountCol_(data, lastCol);
  var leadSet = {};
  LEAD_TYPES.forEach(function (t) { leadSet[t] = true; });
  var leads = [];
  data.forEach(function (row) {
    var type = String(row[1] || "").trim();
    if (!leadSet[type]) return;
    var d = parseSheetDate_(row[0]);
    if (!d) return;
    leads.push({
      date: d,
      week: Utilities.formatDate(mondayOf_(d), "Europe/Dublin", "yyyy-MM-dd"),
      name: String(row[2] || "").trim(),
      type: type,
      source: rowGclid_(row) ? "Google Ads" : "Organic",
      amount: amtCol >= 0 ? String(row[amtCol] || "").trim() : "",
    });
  });
  return leads;
}

// Tab 1: weekly real ad spend vs organic, with cost per ad-driven lead.
function buildWeeklyAdPerformance_(ss, leads) {
  var wk = {};
  leads.forEach(function (l) {
    if (!wk[l.week]) wk[l.week] = { ads: 0, org: 0 };
    if (l.source === "Google Ads") wk[l.week].ads++; else wk[l.week].org++;
  });
  var weekSet = {};
  Object.keys(wk).forEach(function (k) { weekSet[k] = true; });
  Object.keys(WEEKLY_AD_DATA).forEach(function (k) { weekSet[k] = true; });
  var weeks = Object.keys(weekSet).sort();

  var out = [["Week starting", "Ad spend (EUR)", "Ad clicks", "Ad leads", "Organic leads", "Total leads", "Cost / ad lead (EUR)"]];
  var tS = 0, tC = 0, tA = 0, tO = 0;
  weeks.forEach(function (k) {
    var a = wk[k] || { ads: 0, org: 0 };
    var ad = WEEKLY_AD_DATA[k] || { spend: 0, clicks: 0 };
    out.push([k, round2_(ad.spend), ad.clicks, a.ads, a.org, a.ads + a.org, a.ads > 0 ? round2_(ad.spend / a.ads) : ""]);
    tS += ad.spend; tC += ad.clicks; tA += a.ads; tO += a.org;
  });
  out.push(["TOTAL", round2_(tS), tC, tA, tO, tA + tO, tA > 0 ? round2_(tS / tA) : ""]);

  var rep = ss.getSheetByName("Weekly Ad Performance");
  if (rep) { rep.clear(); } else { rep = ss.insertSheet("Weekly Ad Performance"); }
  rep.getRange(1, 1, out.length, out[0].length).setValues(out);
  rep.getRange(1, 1, 1, out[0].length).setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  rep.getRange(out.length, 1, 1, out[0].length).setFontWeight("bold").setBackground("#fef4eb");
  rep.setFrozenRows(1);
  [120, 120, 90, 90, 110, 90, 150].forEach(function (w, i) { rep.setColumnWidth(i + 1, w); });
  if (out.length > 1) {
    rep.getRange(2, 2, out.length - 1, 1).setNumberFormat("#,##0.00");
    rep.getRange(2, 7, out.length - 1, 1).setNumberFormat("#,##0.00");
  }
  rep.getRange(out.length + 2, 1).setValue("Ad spend + clicks are your real weekly Google Ads figures. Ad vs Organic leads are split by whether a Google click ID was captured on the lead. Organic costs nothing.");
  rep.getRange(out.length + 2, 1).setFontColor("#888888").setFontStyle("italic");
}

// Tab 2: every lead, newest first, with its source and value - easy to scan.
function buildCustomerTracker_(ss, leads) {
  var sorted = leads.slice().sort(function (a, b) { return b.date.getTime() - a.date.getTime(); });
  var out = [["Date", "Customer", "Source", "Type", "Amount (EUR)"]];
  sorted.forEach(function (l) {
    var digits = String(l.amount).replace(/[^0-9]/g, "");
    var num = parseFloat(String(l.amount).replace(/[^0-9.]/g, ""));
    var amt = (!isNaN(num) && num > 0 && digits.length <= 4) ? num
            : (/complimentary|^free$/i.test(l.amount) ? "Free" : "");
    out.push([Utilities.formatDate(l.date, "Europe/Dublin", "yyyy-MM-dd"), l.name, l.source, l.type, amt]);
  });
  var rep = ss.getSheetByName("Customer Tracker");
  if (rep) { rep.clear(); } else { rep = ss.insertSheet("Customer Tracker"); }
  rep.getRange(1, 1, out.length, out[0].length).setValues(out);
  rep.getRange(1, 1, 1, out[0].length).setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  rep.setFrozenRows(1);
  [110, 210, 110, 150, 110].forEach(function (w, i) { rep.setColumnWidth(i + 1, w); });
  for (var r = 0; r < sorted.length; r++) {
    var cell = rep.getRange(r + 2, 3);
    if (sorted[r].source === "Google Ads") cell.setBackground("#cce5ff").setFontColor("#004085");
    else cell.setBackground("#e2e3e5").setFontColor("#383d41");
  }
}

// Diagnoses the GCLID/Status column mix-up. Reports stay correct regardless,
// because source is read per-row. Logs the exact layout for a safe realign.
function diagnoseGclid_(sheet, log) {
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var sample = sheet.getRange(2, 1, Math.min(lastRow - 1, 100), lastCol).getValues();
  var counts = []; for (var c = 0; c < lastCol; c++) counts[c] = 0;
  sample.forEach(function (row) {
    for (var c = 0; c < lastCol; c++) {
      var v = String(row[c] || "").trim();
      if (v.length >= 30 && /^[A-Za-z0-9_-]+$/.test(v) &&
          !/^(cs|pi|ch|in|sub|cus|pm|re|tr|po|seti|prod|price)_/.test(v)) counts[c]++;
    }
  });
  var gcol = -1, gmax = 0;
  for (var k = 0; k < lastCol; k++) { if (counts[k] > gmax) { gmax = counts[k]; gcol = k; } }
  var gclidHeader = headers.indexOf("GCLID");
  if (gmax === 0) { log.push("GCLID check: no Google click IDs in the data yet (organic-only)."); return; }
  if (gcol === gclidHeader) { log.push("GCLID check: correctly aligned under the GCLID header."); return; }
  log.push("GCLID check: click-ID data is in column " + (gcol + 1) + " under the '" +
    String(headers[gcol]) + "' header (should read 'GCLID'). Reports are still correct (gclid read per-row). " +
    "Tell me this line and I will realign the raw column safely.");
}

// Column list in order. Used by both setupHeaders and doPost.
var COLUMNS = [
  { key: "date",          label: "Date",          width: 140 },
  { key: "type",          label: "Type",          width: 140 },
  { key: "name",          label: "Name",          width: 160 },
  { key: "email",         label: "Email",         width: 220 },
  { key: "gclid",         label: "GCLID",         width: 200 },
  { key: "phone",         label: "Phone",         width: 140 },
  { key: "address",       label: "Address",       width: 250 },
  { key: "product",       label: "Product",       width: 200 },
  { key: "amount",        label: "Amount",        width: 80  },
  { key: "currency",      label: "Currency",      width: 70  },
  { key: "bookingDate",   label: "Booking Date",  width: 140 },
  { key: "bookingSlot",   label: "Booking Slot",  width: 120 },
  { key: "orderId",       label: "Order ID",      width: 160 },
  { key: "source",        label: "Source",        width: 120 },
  { key: "notes",         label: "Notes",         width: 250 },
  { key: "status",        label: "Status",        width: 100 },
  // Attribution columns (added 2026-04-23). GCLID moved up next to the
  // contact details (after Email, before Phone) on 2026-06-17 so the
  // came-from-an-ad signal sits beside the lead, not out past the notes.
  { key: "landingPage",   label: "Landing Page",  width: 200 },
  { key: "referrer",      label: "Referrer",      width: 180 },
  { key: "utmSource",     label: "UTM Source",    width: 120 },
  { key: "utmMedium",     label: "UTM Medium",    width: 120 },
  { key: "utmCampaign",   label: "UTM Campaign",  width: 160 },
  { key: "utmContent",    label: "UTM Content",   width: 140 },
  { key: "utmTerm",       label: "UTM Term",      width: 140 },
];

function setupHeaders() {
  // Operate on the existing "Leads" tab if there is one; only fall back to
  // the active sheet for a brand-new spreadsheet. Renaming the active sheet
  // to "Leads" when a "Leads" tab already exists throws
  // ("A sheet with the name 'Leads' already exists") — this guard avoids it.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads") || ss.getActiveSheet();
  if (sheet.getName() !== "Leads") sheet.setName("Leads");

  var headers = COLUMNS.map(function (c) { return c.label; });
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1a1a1a");
  headerRange.setFontColor("#ffffff");

  // Set column widths
  COLUMNS.forEach(function (c, i) {
    sheet.setColumnWidth(i + 1, c.width);
  });

  // Freeze header row
  sheet.setFrozenRows(1);

  // Add Status column data validation (dropdown)
  var statusCol = COLUMNS.findIndex(function (c) { return c.key === "status"; }) + 1;
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["New", "Contacted", "Quoted", "Sold", "Lost", "No Show"], true)
    .build();
  sheet.getRange(2, statusCol, 500, 1).setDataValidation(statusRule);

  // Conditional formatting for the Status column
  var statusRangeA1 = (function () {
    var col = String.fromCharCode(64 + statusCol); // A=1, B=2, ...
    return col + "2:" + col + "500";
  })();
  var rules = sheet.getConditionalFormatRules();
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Sold").setBackground("#d4edda").setFontColor("#155724")
    .setRanges([sheet.getRange(statusRangeA1)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Lost").setBackground("#f8d7da").setFontColor("#721c24")
    .setRanges([sheet.getRange(statusRangeA1)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Quoted").setBackground("#fff3cd").setFontColor("#856404")
    .setRanges([sheet.getRange(statusRangeA1)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Contacted").setBackground("#cce5ff").setFontColor("#004085")
    .setRanges([sheet.getRange(statusRangeA1)]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("New").setBackground("#e2e3e5").setFontColor("#383d41")
    .setRanges([sheet.getRange(statusRangeA1)]).build());
  sheet.setConditionalFormatRules(rules);
}

/**
 * ONE-TIME migration — run ONCE from the Apps Script editor after pasting
 * this updated file (select `migrateGclidColumn` in the function dropdown,
 * click Run). It physically moves the existing GCLID column so it sits
 * between Email and Phone, carrying all its existing data with it, so old
 * rows stay aligned with the new column order above.
 *
 * Do NOT use setupHeaders() for this — that only rewrites the header labels
 * by position and would leave the existing GCLID data stranded under the
 * wrong heading. This function moves the whole column (header + data).
 *
 * Idempotent: safe to re-run; does nothing if GCLID is already in place.
 *
 * AFTER running it, redeploy the web app so new rows are written in the
 * matching order: Deploy > Manage deployments > (edit, pencil icon) >
 * Version: New version > Deploy. The webhook URL does not change.
 */
function migrateGclidColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads") || ss.getActiveSheet();
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var gclidCol = headers.indexOf("GCLID") + 1; // 1-based; 0 means not found
  var phoneCol = headers.indexOf("Phone") + 1;
  if (gclidCol === 0 || phoneCol === 0) {
    throw new Error("Could not find a 'GCLID' and/or 'Phone' header in row 1. Check the header labels.");
  }
  if (gclidCol === phoneCol - 1) {
    Logger.log("GCLID is already directly before Phone (column " + gclidCol + "). Nothing to do.");
    return;
  }
  // Current real layout has GCLID to the RIGHT of Phone (e.g. col 16 vs 5).
  // Moving that column to Phone's index drops it in just before Phone, and
  // Phone (plus everything between) shifts one to the right.
  var gclidRange = sheet.getRange(1, gclidCol, sheet.getMaxRows(), 1);
  sheet.moveColumns(gclidRange, phoneCol);
  Logger.log("Moved GCLID from column " + gclidCol + " to before Phone (column " + phoneCol + ").");
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  }

  var data = JSON.parse(e.postData.contents);

  // Idempotency: if this payload has a Stripe-style orderId and a row with
  // the same orderId already exists, treat as a duplicate and skip. Stripe
  // webhook retries (network blips, late deliveries, post-recovery retries)
  // would otherwise append the same paid order multiple times.
  if (data.orderId && /^cs_(live|test)_/.test(String(data.orderId)) && sheet.getLastRow() > 1) {
    var orderIdColIdx = COLUMNS.findIndex(function (c) { return c.key === "orderId"; });
    if (orderIdColIdx >= 0) {
      var existing = sheet.getRange(2, orderIdColIdx + 1, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < existing.length; i++) {
        if (String(existing[i][0]) === String(data.orderId)) {
          return ContentService.createTextOutput(
            JSON.stringify({ success: true, deduped: true, existingRow: i + 2 })
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
  }

  // Format timestamp to Dublin time
  var timestamp = data.timestamp || new Date().toISOString();
  var date = new Date(timestamp);
  // ISO yyyy-MM-dd HH:mm, locale-proof: Google Sheets can never reinterpret it
  // as US MM/dd (the bug that scattered weekly-report dates into the future).
  // It also sorts chronologically as plain text.
  var formatted = Utilities.formatDate(date, "Europe/Dublin", "yyyy-MM-dd HH:mm");

  // Map each column (in order) to its value from the payload.
  // "date" and "status" are derived; every other key matches a field on the payload.
  var row = COLUMNS.map(function (c) {
    if (c.key === "date") return formatted;
    if (c.key === "status") return "New";
    var v = data[c.key];
    if (v === undefined || v === null) return "";
    return v;
  });

  sheet.appendRow(row);

  // Colour-code the Type column for easy scanning
  var typeCol = COLUMNS.findIndex(function (c) { return c.key === "type"; }) + 1;
  var lastRow = sheet.getLastRow();
  var typeCell = sheet.getRange(lastRow, typeCol);
  switch (data.type) {
    case "Free Consultation":
      typeCell.setBackground("#d4edda").setFontColor("#155724");
      break;
    case "Paid Order":
      typeCell.setBackground("#cce5ff").setFontColor("#004085");
      break;
    case "Contact Enquiry":
      typeCell.setBackground("#fff3cd").setFontColor("#856404");
      break;
    case "Newsletter Signup":
      typeCell.setBackground("#e2e3e5").setFontColor("#383d41");
      break;
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: true })
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * One-shot cleanup of test rows. Run from the Apps Script editor:
 * 1. Open Extensions > Apps Script from the leads sheet.
 * 2. Replace the file contents with this updated version (or paste this
 *    function below the existing code).
 * 3. Select `cleanTestRows` from the function dropdown at the top.
 * 4. Click ▶ Run. Authorize if prompted.
 * 5. Open View > Logs to see what was deleted.
 *
 * Deletes rows where ANY of the following is true:
 *   - email exactly matches a known test address
 *   - name starts with "Claude Test" or "Test "
 *   - amount > 0 AND amount < 5 (€1 test orders)
 *
 * Real customer rows (Helen O'Reilly, Cecile Grand, etc.) are preserved.
 * Safe to re-run — does nothing if no test rows are present.
 */
function cleanTestRows() {
  var TEST_EMAIL_PATTERNS = [
    /^oscarcobbe2017(\+[^@]*)?@icloud\.com$/i,
    /@claude-tests\.invalid$/i,
    /^test@example\.com$/i,
    /\+audittest@/i,
    /\+claudetest@/i,
    /\+e2e@/i,
  ];
  var TEST_NAME_PATTERNS = [
    /^claude\s*test/i,
    /^test\s/i,
    /e2e/i,
    /audit/i,
    /^smart\s*space\s*test/i,
  ];

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads");
  if (!sheet) {
    Logger.log("ERROR: 'Leads' sheet not found");
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("Sheet is empty (no data rows).");
    return;
  }

  var headerRow = sheet.getRange(1, 1, 1, COLUMNS.length).getValues()[0];
  var emailCol = headerRow.indexOf("Email") + 1;
  var nameCol = headerRow.indexOf("Name") + 1;
  var amountCol = headerRow.indexOf("Amount") + 1;
  var orderIdCol = headerRow.indexOf("Order ID") + 1;
  if (emailCol === 0 || nameCol === 0 || amountCol === 0) {
    Logger.log("ERROR: Could not locate Email/Name/Amount columns. Re-run setupHeaders() first.");
    return;
  }

  var data = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  var rowsToDelete = []; // 1-indexed row numbers

  // First pass: tag test rows
  for (var i = 0; i < data.length; i++) {
    var rowNum = i + 2;
    var email = String(data[i][emailCol - 1] || "").trim().toLowerCase();
    var name = String(data[i][nameCol - 1] || "").trim();
    var amountRaw = data[i][amountCol - 1];
    var amount = typeof amountRaw === "number" ? amountRaw : parseFloat(amountRaw) || 0;

    var matchEmail = TEST_EMAIL_PATTERNS.some(function (re) { return re.test(email); });
    var matchName = TEST_NAME_PATTERNS.some(function (re) { return re.test(name); });
    var matchAmount = amount > 0 && amount < 5;

    if (matchEmail || matchName || matchAmount) {
      rowsToDelete.push({ row: rowNum, email: email, name: name, amount: amount, reason: "test" });
    }
  }

  // Second pass: deduplicate non-test rows that share an Order ID
  // (Stripe webhook retries can create duplicates when the original
  // delivery was missed and the order was manually recovered.)
  if (orderIdCol > 0) {
    var seenOrderIds = {};
    for (var j = 0; j < data.length; j++) {
      var rn = j + 2;
      // Skip rows already flagged for deletion
      if (rowsToDelete.some(function (r) { return r.row === rn; })) continue;

      var oid = String(data[j][orderIdCol - 1] || "").trim();
      if (!oid || oid === "—") continue;
      // Only consider Stripe session IDs as canonical order keys
      if (!/^cs_(live|test)_/.test(oid)) continue;

      if (seenOrderIds[oid]) {
        // Duplicate — delete this row, keep the one we saw first (lower row number)
        rowsToDelete.push({
          row: rn,
          email: String(data[j][emailCol - 1] || ""),
          name: String(data[j][nameCol - 1] || ""),
          amount: data[j][amountCol - 1],
          reason: "dup of row " + seenOrderIds[oid],
        });
      } else {
        seenOrderIds[oid] = rn;
      }
    }
  }

  if (rowsToDelete.length === 0) {
    Logger.log("No test or duplicate rows found. Nothing to delete.");
    return;
  }

  Logger.log("Will delete " + rowsToDelete.length + " row(s):");
  rowsToDelete.forEach(function (r) {
    Logger.log("  row " + r.row + " [" + r.reason + "]: " + r.name + " <" + r.email + "> €" + r.amount);
  });

  // Delete from bottom up so row numbers don't shift mid-deletion
  rowsToDelete.sort(function (a, b) { return b.row - a.row; });
  rowsToDelete.forEach(function (r) {
    sheet.deleteRow(r.row);
  });

  Logger.log("Done. Deleted " + rowsToDelete.length + " row(s).");
}

/**
 * GET endpoint — returns recent rows as JSON, used by the admin dashboard
 * at /admin/leads to display contact-form submissions alongside Stripe
 * orders and Calendly events.
 *
 * Query params:
 *   token=<READ_TOKEN>     required. Must match READ_TOKEN below.
 *                          Set the SAME value in Vercel env vars as
 *                          GOOGLE_SHEET_READ_TOKEN (Production + Preview).
 *   type=Contact Enquiry   optional. Filter by exact Type column value
 *                          (URL-encode the space). Omit or "All" returns
 *                          every row.
 *   limit=200              optional. Max rows returned, newest first.
 *
 * To deploy after editing:
 *   Deploy > Manage deployments > pencil icon (Edit) >
 *   Version: "New version" > Deploy.
 *   The web-app URL stays the same; the redeploy is required for the
 *   new doGet to take effect.
 */
// READ_TOKEN MUST live in PropertiesService — NOT in this file. Anyone
// with read access to this committed source code (anyone with repo
// access) would otherwise have a complete read-handle to every lead
// row in the Sheet. Set it once in the Apps Script editor:
//
//   File > Project Properties > Script Properties > +
//     Property: READ_TOKEN
//     Value:    <long random hex from `openssl rand -hex 32`>
//
// Then mirror that value into Vercel as GOOGLE_SHEET_READ_TOKEN. The
// admin/leads route on the Next.js side reads through this token; both
// sides must hold the same value.
function getReadToken() {
  return PropertiesService.getScriptProperties().getProperty("READ_TOKEN") || "";
}

function doGet(e) {
  var params = (e && e.parameter) || {};
  var token = params.token || "";
  var expected = getReadToken();

  if (!token || !expected || token !== expected) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "Unauthorized" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads");
  if (!sheet || sheet.getLastRow() < 2) {
    return ContentService
      .createTextOutput(JSON.stringify({ rows: [], count: 0 }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var lastRow = sheet.getLastRow();
  var data = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();

  // Map each row array → object keyed by COLUMNS[i].key
  var rows = data.map(function (rowArr) {
    var obj = {};
    for (var i = 0; i < COLUMNS.length; i++) {
      var val = rowArr[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Europe/Dublin", "yyyy-MM-dd HH:mm");
      }
      obj[COLUMNS[i].key] = (val === null || val === undefined) ? "" : val;
    }
    return obj;
  });

  // Type filter (exact match against the Type column)
  var typeFilter = params.type || "";
  if (typeFilter && typeFilter !== "All") {
    rows = rows.filter(function (r) { return String(r.type) === typeFilter; });
  }

  // Newest first, capped
  rows.reverse();
  var limit = parseInt(params.limit, 10) || 200;
  if (rows.length > limit) rows = rows.slice(0, limit);

  return ContentService
    .createTextOutput(JSON.stringify({ rows: rows, count: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Week-on-week order value: Google Ads vs Organic.
 *
 * Run from the Apps Script editor (pick `buildAdsVsOrganicWeekly` > Run).
 * Reads the Leads sheet, takes "Paid Order" rows (the only rows with real
 * order value), and splits them by whether the GCLID column is filled:
 *   - GCLID present  -> the customer arrived via a Google Ad   ("Ads")
 *   - GCLID blank    -> organic / direct / Maps / referral      ("Organic")
 * Buckets by week (Monday-Sunday, Dublin time) and writes a refreshable
 * tab "Ads vs Organic (weekly)" with a line chart. Safe to re-run; it
 * rebuilds the tab each time.
 *
 * Attribution caveats (worth knowing when reading the numbers):
 *   - GCLID is captured on the ad click and kept for ~90 days, so an order
 *     counts as "Ads" if the buyer clicked a Google ad any time in the
 *     prior 90 days on that device. It is last-known ad attribution.
 *   - If the GCLID didn't survive the journey into Stripe checkout, an
 *     ad-driven order can look Organic. So "Ads" here is a LOWER BOUND on
 *     ad-influenced revenue; Google Ads' own conversion count may differ.
 */
function buildAdsVsOrganicWeekly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads") || ss.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log("No data rows."); return; }

  var headers = data[0];
  function col(label) {
    var i = headers.indexOf(label);
    if (i < 0) throw new Error("Missing column header: " + label);
    return i;
  }
  // Look up by header name so this keeps working regardless of column order.
  var cType = col("Type"), cAmount = col("Amount"), cGclid = col("GCLID"), cDate = col("Date");

  var weeks = {}; // 'yyyy-MM-dd' (Monday) -> {adsN, adsV, orgN, orgV}
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (String(row[cType]).trim() !== "Paid Order") continue;
    var amt = parseFloat(String(row[cAmount]).replace(/[^0-9.\-]/g, "")) || 0;
    if (amt <= 0) continue;
    var d = parseSheetDate_(row[cDate]);
    if (!d) continue;
    var monday = mondayOf_(d);
    var key = Utilities.formatDate(monday, "Europe/Dublin", "yyyy-MM-dd");
    if (!weeks[key]) weeks[key] = { adsN: 0, adsV: 0, orgN: 0, orgV: 0 };
    if (String(row[cGclid]).trim() !== "") { weeks[key].adsN++; weeks[key].adsV += amt; }
    else { weeks[key].orgN++; weeks[key].orgV += amt; }
  }

  var keys = Object.keys(weeks).sort();
  var out = [["Week starting", "Ads orders", "Ads value (EUR)", "Organic orders", "Organic value (EUR)", "Total value (EUR)", "Ads % of value"]];
  var tA = 0, tAv = 0, tO = 0, tOv = 0;
  keys.forEach(function (k) {
    var w = weeks[k];
    var tot = w.adsV + w.orgV;
    out.push([k, w.adsN, round2_(w.adsV), w.orgN, round2_(w.orgV), round2_(tot), tot ? Math.round(w.adsV / tot * 100) + "%" : "0%"]);
    tA += w.adsN; tAv += w.adsV; tO += w.orgN; tOv += w.orgV;
  });
  var grand = tAv + tOv;
  out.push(["TOTAL", tA, round2_(tAv), tO, round2_(tOv), round2_(grand), grand ? Math.round(tAv / grand * 100) + "%" : "0%"]);

  var name = "Ads vs Organic (weekly)";
  var rep = ss.getSheetByName(name);
  if (rep) { rep.clear(); rep.getCharts().forEach(function (c) { rep.removeChart(c); }); }
  else { rep = ss.insertSheet(name); }

  rep.getRange(1, 1, out.length, out[0].length).setValues(out);
  rep.getRange(1, 1, 1, out[0].length).setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  rep.getRange(out.length, 1, 1, out[0].length).setFontWeight("bold").setBackground("#fef4eb");
  rep.setFrozenRows(1);
  [140, 90, 130, 110, 150, 140, 110].forEach(function (wd, i) { rep.setColumnWidth(i + 1, wd); });

  // Line chart: Ads value vs Organic value per week (exclude the TOTAL row).
  if (keys.length >= 1) {
    var chart = rep.newChart()
      .asLineChart()
      .addRange(rep.getRange(1, 1, keys.length + 1, 1))   // Week starting
      .addRange(rep.getRange(1, 3, keys.length + 1, 1))   // Ads value
      .addRange(rep.getRange(1, 5, keys.length + 1, 1))   // Organic value
      .setMergeStrategy(Charts.ChartMergeStrategy.MERGE_COLUMNS)
      .setNumHeaders(1)
      .setOption("title", "Order value per week: Google Ads vs Organic (EUR)")
      .setOption("legend", { position: "bottom" })
      .setOption("colors", ["#f48222", "#1C1A18"])
      .setPosition(2, out[0].length + 2, 0, 0)
      .build();
    rep.insertChart(chart);
  }
  Logger.log("Built '" + name + "' across " + keys.length + " week(s). Ads EUR " + round2_(tAv) + " vs Organic EUR " + round2_(tOv) + ".");
}

function parseSheetDate_(v) {
  if (Object.prototype.toString.call(v) === "[object Date]") return isNaN(v.getTime()) ? null : v;
  var s = String(v).trim();
  // ISO yyyy-MM-dd [HH:mm] (the format doPost writes now, unambiguous).
  var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 0), +(iso[5] || 0));
  // Legacy dd/MM/yyyy [HH:mm] text rows.
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function mondayOf_(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var day = x.getDay();              // 0 Sun .. 6 Sat
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day)); // back to Monday
  return x;
}

function round2_(n) { return Math.round(n * 100) / 100; }

/**
 * Week-on-week LEADS + ESTIMATED VALUE: Google Ads vs Organic.
 *
 * Companion to buildAdsVsOrganicWeekly. Most installer sales close offline
 * (no Stripe "Paid Order" row), so real order VALUE is mostly empty — this
 * counts inbound LEADS and attaches an ESTIMATED euro value so you can put
 * the weekly Ads number next to your weekly Google Ads spend.
 *
 * A lead is any row whose Type is in LEAD_TYPES; split by GCLID present
 * (Google Ads) vs blank (organic/direct), bucketed by week (Mon-Sun, Dublin).
 *
 * VALUE per lead:
 *   - A "Paid Order" row with a real Amount uses that actual Amount.
 *   - Every other lead (consultation / enquiry) is valued at VALUE_PER_LEAD
 *     below — an ESTIMATE you set. A sensible figure is:
 *         average job value  ×  the share of leads that become paying jobs
 *     e.g. avg job €350 × 40% close rate = €140 per lead.
 *   EDIT VALUE_PER_LEAD to your real number before trusting the euro columns.
 *
 * Run from the editor: pick `buildAdsVsOrganicLeadsWeekly` > Run.
 * Writes a refreshable tab "Ads vs Organic leads (weekly)" with a value chart.
 *
 * Note: QR Scan and Booking Reminder rows are excluded — passive/system
 * events, never carry a GCLID, not inbound leads.
 */
var LEAD_TYPES = ["Free Consultation", "Contact Enquiry", "Paid Order", "Newsletter Signup"];

// >>> What one lead is worth on average (avg job value × close rate).
// Set to €250 on 2026-06-17 (Oscar). Paid Order rows ignore this and use
// their real Amount. Change this one number any time to re-value leads.
var VALUE_PER_LEAD = 250;

function buildAdsVsOrganicLeadsWeekly() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads") || ss.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log("No data rows."); return; }

  var headers = data[0];
  function col(label) {
    var i = headers.indexOf(label);
    if (i < 0) throw new Error("Missing column header: " + label);
    return i;
  }
  var cType = col("Type"), cGclid = col("GCLID"), cDate = col("Date"), cAmount = col("Amount");
  var leadSet = {};
  LEAD_TYPES.forEach(function (t) { leadSet[t] = true; });

  var weeks = {}; // 'yyyy-MM-dd' (Monday) -> {ads, org, adsV, orgV}
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var type = String(row[cType]).trim();
    if (!leadSet[type]) continue;
    var d = parseSheetDate_(row[cDate]);
    if (!d) continue;
    var key = Utilities.formatDate(mondayOf_(d), "Europe/Dublin", "yyyy-MM-dd");
    if (!weeks[key]) weeks[key] = { ads: 0, org: 0, adsV: 0, orgV: 0 };

    // Real money where we have it (a paid Stripe order), else the estimate.
    var amt = parseFloat(String(row[cAmount]).replace(/[^0-9.\-]/g, "")) || 0;
    var val = (type === "Paid Order" && amt > 0) ? amt : VALUE_PER_LEAD;

    if (String(row[cGclid]).trim() !== "") { weeks[key].ads++; weeks[key].adsV += val; }
    else { weeks[key].org++; weeks[key].orgV += val; }
  }

  var keys = Object.keys(weeks).sort();
  var out = [["Week starting", "Ads leads", "Organic leads", "Ads value (EUR)", "Organic value (EUR)", "Total value (EUR)", "Ads % of value"]];
  var tA = 0, tO = 0, tAv = 0, tOv = 0;
  keys.forEach(function (k) {
    var w = weeks[k];
    var totV = w.adsV + w.orgV;
    out.push([k, w.ads, w.org, round2_(w.adsV), round2_(w.orgV), round2_(totV), totV ? Math.round(w.adsV / totV * 100) + "%" : "0%"]);
    tA += w.ads; tO += w.org; tAv += w.adsV; tOv += w.orgV;
  });
  var grandV = tAv + tOv;
  out.push(["TOTAL", tA, tO, round2_(tAv), round2_(tOv), round2_(grandV), grandV ? Math.round(tAv / grandV * 100) + "%" : "0%"]);

  var name = "Ads vs Organic leads (weekly)";
  var rep = ss.getSheetByName(name);
  if (rep) { rep.clear(); rep.getCharts().forEach(function (c) { rep.removeChart(c); }); }
  else { rep = ss.insertSheet(name); }

  rep.getRange(1, 1, out.length, out[0].length).setValues(out);
  rep.getRange(1, 1, 1, out[0].length).setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  rep.getRange(out.length, 1, 1, out[0].length).setFontWeight("bold").setBackground("#fef4eb");
  rep.setFrozenRows(1);
  [140, 90, 110, 130, 150, 140, 110].forEach(function (wd, i) { rep.setColumnWidth(i + 1, wd); });

  // Force the formats explicitly so a stray inherited percentage format can
  // never render a euro value (250) as "25000%". Columns D,E,F are euro
  // amounts; only column G (Ads share) is a percentage. Data + TOTAL rows.
  if (out.length > 1) {
    rep.getRange(2, 4, out.length - 1, 3).setNumberFormat("#,##0"); // D,E,F euro values
    rep.getRange(2, 7, out.length - 1, 1).setNumberFormat("0%");    // G  ads % of value
  }

  // Note under the table so nobody mistakes the estimate for booked revenue.
  rep.getRange(out.length + 2, 1).setValue("Estimated value = Paid Order rows use real Amount; all other leads valued at EUR " + VALUE_PER_LEAD + " each (edit VALUE_PER_LEAD in the script).");
  rep.getRange(out.length + 2, 1).setFontColor("#888888").setFontStyle("italic");

  // Value chart: Ads value vs Organic value per week (cols 4 and 5).
  if (keys.length >= 1) {
    var chart = rep.newChart()
      .asLineChart()
      .addRange(rep.getRange(1, 1, keys.length + 1, 1))   // Week starting
      .addRange(rep.getRange(1, 4, keys.length + 1, 1))   // Ads value
      .addRange(rep.getRange(1, 5, keys.length + 1, 1))   // Organic value
      .setMergeStrategy(Charts.ChartMergeStrategy.MERGE_COLUMNS)
      .setNumHeaders(1)
      .setOption("title", "Estimated lead value per week: Google Ads vs Organic (EUR)")
      .setOption("legend", { position: "bottom" })
      .setOption("colors", ["#f48222", "#1C1A18"])
      .setPosition(2, out[0].length + 2, 0, 0)
      .build();
    rep.insertChart(chart);
  }
  Logger.log("Built '" + name + "' across " + keys.length + " week(s). Ads " + tA + " leads / EUR " + round2_(tAv) + " vs Organic " + tO + " leads / EUR " + round2_(tOv) + " (at EUR " + VALUE_PER_LEAD + "/lead).");
}

/**
 * SIMPLE total: real money made from customers who came via Google Ads.
 *
 * Sums the Amount column for every row that has a GCLID (= clicked a Google
 * ad). No dates, no weekly buckets, no estimate — just actual order amounts.
 * Rows with no amount (consultations, enquiries) contribute 0, so this is
 * effectively "total order revenue from ad-driven customers".
 *
 * Run from the editor: pick `totalRevenueFromAds` > Run, then read the log.
 */
function totalRevenueFromAds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads") || ss.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log("No data rows."); return; }

  var headers = data[0];
  function col(label) {
    var i = headers.indexOf(label);
    if (i < 0) throw new Error("Missing column header: " + label);
    return i;
  }
  var cGclid = col("GCLID"), cAmount = col("Amount");

  var adsTotal = 0, adsCount = 0, otherTotal = 0, otherCount = 0;
  for (var r = 1; r < data.length; r++) {
    var amt = parseFloat(String(data[r][cAmount]).replace(/[^0-9.\-]/g, "")) || 0;
    if (amt <= 0) continue;
    if (String(data[r][cGclid]).trim() !== "") { adsTotal += amt; adsCount++; }
    else { otherTotal += amt; otherCount++; }
  }

  Logger.log("TOTAL made from Google Ads customers (gclid present): EUR " + round2_(adsTotal) + " across " + adsCount + " order(s).");
  Logger.log("(For comparison — no gclid / organic+other: EUR " + round2_(otherTotal) + " across " + otherCount + " order(s).)");
}

// Canonical OLD column order (before GCLID was moved). The existing DATA in
// the sheet is still in this order, because the column was never physically
// moved — only the header labels were relabelled by setupHeaders.
var OLD_COLUMN_ORDER = ["Date","Type","Name","Email","Phone","Address","Product","Amount","Currency","Booking Date","Booking Slot","Order ID","Source","Notes","Status","GCLID","Landing Page","Referrer","UTM Source","UTM Medium","UTM Campaign","UTM Content","UTM Term"];

/**
 * Repair the Leads sheet after a setupHeaders() relabel left the columns
 * misaligned (GCLID data showing under the "Status" label). The DATA was
 * never moved, so it is still in OLD_COLUMN_ORDER (GCLID in column 16).
 * This:
 *   1. Verifies that layout BY CONTENT, so it can't corrupt a sheet that's
 *      in a different state (aborts with a clear message if unexpected).
 *   2. Rewrites row 1 to the original labels so headers match the data.
 *   3. Moves the GCLID column (header + data together) to between Email and
 *      Phone — the intended final order.
 *   4. Re-applies the header formatting.
 *
 * Run once: pick repairLeadsSheet > Run. AFTER it succeeds, redeploy the web
 * app (Deploy > Manage deployments > edit > New version) so doPost writes new
 * rows in the same order. THEN re-run the report functions.
 */
function repairLeadsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads");
  if (!sheet) throw new Error("No 'Leads' tab found. Open the leads spreadsheet and run this again.");

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastCol < OLD_COLUMN_ORDER.length) {
    throw new Error("Only " + lastCol + " columns found; expected at least " + OLD_COLUMN_ORDER.length + ". Send a screenshot and I'll adjust.");
  }

  // Content sample (up to 50 rows) to identify columns by what they hold,
  // not by the (currently unreliable) header labels.
  var n = Math.max(0, Math.min(lastRow - 1, 50));
  var sample = n > 0 ? sheet.getRange(2, 1, n, lastCol).getValues() : [];
  function shareWith(col1, test) {
    var hit = 0, tot = 0;
    for (var i = 0; i < sample.length; i++) {
      var v = String(sample[i][col1 - 1] || "").trim();
      if (v) { tot++; if (test(v)) hit++; }
    }
    return tot === 0 ? -1 : hit / tot; // -1 = no data to judge
  }
  var emailCol = OLD_COLUMN_ORDER.indexOf("Email") + 1;  // 4
  var gclidCol = OLD_COLUMN_ORDER.indexOf("GCLID") + 1;  // 16
  var phoneCol = OLD_COLUMN_ORDER.indexOf("Phone") + 1;  // 5

  var emailShare = shareWith(emailCol, function (v) { return v.indexOf("@") >= 0; });
  var gclidNonId = shareWith(gclidCol, function (v) { return v.indexOf("@") >= 0 || v.length < 12; }); // short/@ = NOT a gclid

  if (emailShare !== -1 && emailShare < 0.6) {
    throw new Error("Stopped for safety: column " + emailCol + " doesn't look like Email (only " + Math.round(emailShare * 100) + "% have @). Send a screenshot and I'll adjust.");
  }
  if (gclidNonId > 0.5) {
    throw new Error("Stopped for safety: column " + gclidCol + " doesn't look like GCLID (looks like short/email values). The sheet may already be realigned, or in a different state. Send a screenshot and I'll adjust.");
  }

  // 1. Restore OLD-order labels so headers line up with the unmoved data.
  sheet.getRange(1, 1, 1, OLD_COLUMN_ORDER.length).setValues([OLD_COLUMN_ORDER]);

  // 2. Move GCLID (col 16) to before Phone (col 5) — header + data together.
  sheet.moveColumns(sheet.getRange(1, gclidCol, sheet.getMaxRows(), 1), phoneCol);

  // 3. Re-apply header formatting.
  var hdr = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  hdr.setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  sheet.setFrozenRows(1);

  Logger.log("Repaired. GCLID is now between Email and Phone, aligned with its data. " +
             "Check: the GCLID column should show click IDs (or be blank), and Phone should show phone numbers. " +
             "Now redeploy the web app (Manage deployments > New version), then re-run the reports.");
}

/**
 * Organize the Leads sheet by category, chronological within each.
 *
 * Groups every row by its Type into a fixed, business-sensible order
 * (Contact Enquiry, then Free Consultation, then Paid Order, then the rest)
 * and sorts each group oldest-to-newest. The header row is left untouched and
 * NO data is ever deleted, rows are only reordered.
 *
 * Run it manually any time the sheet looks jumbled: pick organizeLeadsByCategory
 * in the function dropdown and press Run. Or run setupAutoOrganize() once to
 * keep it grouped automatically every few hours (new website leads append at
 * the bottom until the next organize runs, so the auto trigger is the
 * set-and-forget option).
 */
var CATEGORY_ORDER = [
  "Contact Enquiry",
  "Free Consultation",
  "Paid Order",
  "Newsletter Signup",
  "QR Scan",
  "Booking Reminder",
];

function organizeLeadsByCategory() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads");
  if (!sheet) { throw new Error("No sheet named 'Leads' found."); }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) { return; }  // 0 or 1 data row, nothing to group

  // Resolve Type and Date columns by header so this survives column moves.
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var typeCol = headers.indexOf("Type");
  var dateCol = headers.indexOf("Date");
  if (typeCol === -1) { typeCol = 1; }  // fallback to the known layout
  if (dateCol === -1) { dateCol = 0; }

  var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
  var rows = range.getValues();

  function catRank(type) {
    var i = CATEGORY_ORDER.indexOf(String(type).trim());
    return i === -1 ? CATEGORY_ORDER.length : i;  // unknown types sort last
  }

  // Parse the Date cell robustly: ISO yyyy-MM-dd (what doPost now writes),
  // legacy dd/MM/yyyy text, or a real Date object all resolve correctly.
  function timeOf(v) {
    var d = parseSheetDate_(v);
    return d ? d.getTime() : 0;
  }

  rows.sort(function (a, b) {
    var ra = catRank(a[typeCol]);
    var rb = catRank(b[typeCol]);
    if (ra !== rb) { return ra - rb; }            // group by category
    var ta = timeOf(a[dateCol]);
    var tb = timeOf(b[dateCol]);
    if (ta !== tb) { return ta - tb; }            // oldest first within a category
    return String(a[typeCol]).localeCompare(String(b[typeCol]));
  });

  range.setValues(rows);
  SpreadsheetApp.flush();
  Logger.log("Organized " + rows.length + " leads by category, chronological within each.");
}

/**
 * Install a time trigger so organizeLeadsByCategory runs automatically every
 * 6 hours, keeping the Leads sheet grouped without manual runs. Run once.
 * Safe to re-run, it clears any existing trigger for this function first.
 */
function setupAutoOrganize() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "organizeLeadsByCategory") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger("organizeLeadsByCategory").timeBased().everyHours(6).create();
  Logger.log("Auto-organize installed: the Leads sheet will regroup every 6 hours.");
}
