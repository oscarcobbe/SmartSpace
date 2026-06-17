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
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.setName("Leads");

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
  var formatted = Utilities.formatDate(date, "Europe/Dublin", "dd/MM/yyyy HH:mm");

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
  if (Object.prototype.toString.call(v) === "[object Date]") return v;
  var s = String(v).trim();
  var m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/); // doPost writes dd/MM/yyyy HH:mm
  if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
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

// >>> SET THIS to what one lead is worth to you (avg job value × close rate).
// Placeholder until you confirm your real number.
var VALUE_PER_LEAD = 150;

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
