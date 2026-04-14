/**
 * Google Apps Script — paste this into Extensions > Apps Script
 * in a new Google Sheet called "Smart Space Leads".
 *
 * Then: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
 * Copy the URL and set it as GOOGLE_SHEET_WEBHOOK_URL in Vercel.
 *
 * IMPORTANT: After pasting, run setupHeaders() once from the Apps Script editor
 * to create the column headers.
 */

function setupHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.setName("Leads");

  var headers = [
    "Date",
    "Type",
    "Name",
    "Email",
    "Phone",
    "Address",
    "Product",
    "Amount",
    "Currency",
    "Booking Date",
    "Booking Slot",
    "Order ID",
    "Source",
    "Notes",
    "Status",
    "GCLID"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1a1a1a");
  headerRange.setFontColor("#ffffff");

  // Set column widths
  sheet.setColumnWidth(1, 140); // Date
  sheet.setColumnWidth(2, 140); // Type
  sheet.setColumnWidth(3, 160); // Name
  sheet.setColumnWidth(4, 220); // Email
  sheet.setColumnWidth(5, 140); // Phone
  sheet.setColumnWidth(6, 250); // Address
  sheet.setColumnWidth(7, 200); // Product
  sheet.setColumnWidth(8, 80);  // Amount
  sheet.setColumnWidth(9, 70);  // Currency
  sheet.setColumnWidth(10, 140); // Booking Date
  sheet.setColumnWidth(11, 120); // Booking Slot
  sheet.setColumnWidth(12, 160); // Order ID
  sheet.setColumnWidth(13, 120); // Source
  sheet.setColumnWidth(14, 250); // Notes
  sheet.setColumnWidth(15, 100); // Status
  sheet.setColumnWidth(16, 200); // GCLID

  // Freeze header row
  sheet.setFrozenRows(1);

  // Add Status column data validation (dropdown)
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["New", "Contacted", "Quoted", "Sold", "Lost", "No Show"], true)
    .build();
  sheet.getRange(2, 15, 500, 1).setDataValidation(statusRule);

  // Set default Status to "New" with conditional formatting
  var rules = sheet.getConditionalFormatRules();

  // Green for Sold
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Sold")
    .setBackground("#d4edda")
    .setFontColor("#155724")
    .setRanges([sheet.getRange("O2:O500")])
    .build());

  // Red for Lost
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Lost")
    .setBackground("#f8d7da")
    .setFontColor("#721c24")
    .setRanges([sheet.getRange("O2:O500")])
    .build());

  // Yellow for Quoted
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Quoted")
    .setBackground("#fff3cd")
    .setFontColor("#856404")
    .setRanges([sheet.getRange("O2:O500")])
    .build());

  // Blue for Contacted
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("Contacted")
    .setBackground("#cce5ff")
    .setFontColor("#004085")
    .setRanges([sheet.getRange("O2:O500")])
    .build());

  // Light grey for New
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("New")
    .setBackground("#e2e3e5")
    .setFontColor("#383d41")
    .setRanges([sheet.getRange("O2:O500")])
    .build());

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

  var row = [
    formatted,
    data.type || "",
    data.name || "",
    data.email || "",
    data.phone || "",
    data.address || "",
    data.product || "",
    data.amount !== undefined ? data.amount : "",
    data.currency || "",
    data.bookingDate || "",
    data.bookingSlot || "",
    data.orderId || "",
    data.source || "",
    data.notes || "",
    "New",
    data.gclid || ""
  ];

  sheet.appendRow(row);

  // Colour-code the Type column for easy scanning
  var lastRow = sheet.getLastRow();
  var typeCell = sheet.getRange(lastRow, 2);
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
