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
  { key: "gclid",         label: "GCLID",         width: 200 },
  // Attribution columns (added 2026-04-23):
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

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads");
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  }

  var data = JSON.parse(e.postData.contents);

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
  var TEST_EMAILS = [
    "oscarcobbe2017@icloud.com",
    "oscarcobbe2017+claudetest@icloud.com",
  ];
  var TEST_NAME_PREFIXES = ["Claude Test", "Test "];

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
  if (emailCol === 0 || nameCol === 0 || amountCol === 0) {
    Logger.log("ERROR: Could not locate Email/Name/Amount columns. Re-run setupHeaders() first.");
    return;
  }

  var data = sheet.getRange(2, 1, lastRow - 1, COLUMNS.length).getValues();
  var rowsToDelete = []; // collect 1-indexed row numbers

  for (var i = 0; i < data.length; i++) {
    var rowNum = i + 2; // sheet rows are 1-indexed and we start at row 2
    var email = String(data[i][emailCol - 1] || "").trim().toLowerCase();
    var name = String(data[i][nameCol - 1] || "").trim();
    var amountRaw = data[i][amountCol - 1];
    var amount = typeof amountRaw === "number" ? amountRaw : parseFloat(amountRaw) || 0;

    var matchEmail = TEST_EMAILS.indexOf(email) !== -1;
    var matchName = TEST_NAME_PREFIXES.some(function (p) { return name.indexOf(p) === 0; });
    var matchAmount = amount > 0 && amount < 5;

    if (matchEmail || matchName || matchAmount) {
      rowsToDelete.push({ row: rowNum, email: email, name: name, amount: amount });
    }
  }

  if (rowsToDelete.length === 0) {
    Logger.log("No test rows found. Nothing to delete.");
    return;
  }

  Logger.log("Will delete " + rowsToDelete.length + " test row(s):");
  rowsToDelete.forEach(function (r) {
    Logger.log("  row " + r.row + ": " + r.name + " <" + r.email + "> €" + r.amount);
  });

  // Delete from bottom up so row numbers don't shift mid-deletion
  rowsToDelete.sort(function (a, b) { return b.row - a.row; });
  rowsToDelete.forEach(function (r) {
    sheet.deleteRow(r.row);
  });

  Logger.log("Done. Deleted " + rowsToDelete.length + " test row(s).");
}
