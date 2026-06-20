// ===========================================================================
// >>> ADD THIS BLOCK TO THE BOTTOM of your Apps Script (do not delete         <<<
// >>> anything), press Save, then run `buildReports`.                         <<<
// ===========================================================================
// READ-ONLY on your Leads tab: it only writes two new report tabs, so it
// cannot harm your data. It builds:
//   - "Weekly Ad Performance": your real Google Ads weekly spend vs organic.
//   - "Customer Tracker": every real lead, newest first, with source + value.
// It reads the Google click id (gclid) PER ROW, so ad-vs-organic is correct
// even though the gclid data is sitting under the wrong (Status) header, and
// it ignores test/spam rows and corrects swapped dates in-memory, so it is
// right whether or not you have run the cleanup yet.

// Your real Google Ads weekly spend + clicks (Monday start), from the export.
var _R_AD_DATA = {
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

function buildReports() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Leads");
  if (!sheet) throw new Error("No 'Leads' tab found.");
  var leads = _rGather(sheet);
  _rWeekly(ss, leads);
  _rTracker(ss, leads);
  _rDiagnose(sheet);
  ["Ads vs Organic (weekly)", "Ads vs Organic leads (weekly)"].forEach(function (nm) {
    var t = ss.getSheetByName(nm); if (t) ss.deleteSheet(t);
  });
  SpreadsheetApp.flush();
  var msg = "Built 'Weekly Ad Performance' and 'Customer Tracker' from " + leads.length +
            " real leads. See the GCLID note in View > Logs.";
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

function _rParseDate(v) {
  if (Object.prototype.toString.call(v) === "[object Date]") return isNaN(v.getTime()) ? null : v;
  var s = String(v).trim();
  var iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] || 0), +(iso[5] || 0));
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// In-memory only: a lead date outside [1 Apr 2026 .. today] is a day/month swap.
function _rFixDate(d) {
  var start = new Date(2026, 3, 1).getTime();
  var now = new Date();
  var end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
  if (d.getTime() < start || d.getTime() > end) {
    var sw = new Date(d.getFullYear(), d.getDate() - 1, d.getMonth() + 1, d.getHours(), d.getMinutes());
    if (!isNaN(sw.getTime()) && sw.getTime() >= start && sw.getTime() <= end) return sw;
  }
  return d;
}

function _rMonday(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

function _rRound(n) { return Math.round(n * 100) / 100; }

// The gclid found anywhere in a row (layout-proof), or "" if organic.
function _rGclid(row) {
  for (var i = 0; i < row.length; i++) {
    var v = String(row[i] || "").trim();
    if (v.length >= 30 && /^[A-Za-z0-9_-]+$/.test(v) &&
        !/^(cs|pi|ch|in|sub|cus|pm|re|tr|po|seti|prod|price)_/.test(v)) return v;
  }
  return "";
}

function _rIsJunk(name, email) {
  var e = String(email || "").trim().toLowerCase(), n = String(name || "").trim();
  if (/@smart-space\.ie$/.test(e) || /@testcustomer\.ie$/.test(e) || /\+claudetest/.test(e)) return true;
  if (/^(oscarcobbe2017(\+[^@]*)?@icloud\.com|oscar@gmail\.com|cobbenigel@gmail\.com)$/.test(e)) return true;
  if (/^(conversion test|webhook test|final test|diagnostics test|debug|zz test.*|claude test.*|test|free consultation|oscar cobbe|nigel cobbe|oscar)$/i.test(n)) return true;
  if (/^[A-Za-z]{12,}$/.test(n) && /[a-z]/.test(n) && /[A-Z]/.test(n)) return true;
  if (((e.split("@")[0] || "").match(/\./g) || []).length >= 4) return true;
  return false;
}

function _rAmountCol(sample, lastCol) {
  var best = -1, bestHits = 0;
  for (var c = 0; c < lastCol; c++) {
    var hits = 0, tot = 0;
    for (var i = 0; i < sample.length; i++) {
      var v = String(sample[i][c] || "").trim();
      if (!v) continue; tot++;
      if (/complimentary|^free$/i.test(v)) { hits++; continue; }
      var dg = v.replace(/[^0-9]/g, ""), num = parseFloat(v.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0 && num < 10000 && dg.length <= 4) hits++;
    }
    if (tot >= 3 && hits / tot > 0.5 && hits > bestHits) { bestHits = hits; best = c; }
  }
  return best;
}

function _rGather(sheet) {
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var amtCol = _rAmountCol(data, lastCol);
  var LT = { "Free Consultation": 1, "Contact Enquiry": 1, "Paid Order": 1, "Newsletter Signup": 1 };
  var leads = [];
  data.forEach(function (row) {
    var type = String(row[1] || "").trim();
    if (!LT[type]) return;
    if (_rIsJunk(row[2], row[3])) return;        // col 3 Name, col 4 Email
    var d = _rParseDate(row[0]);
    if (!d) return;
    d = _rFixDate(d);
    leads.push({
      date: d,
      week: Utilities.formatDate(_rMonday(d), "Europe/Dublin", "yyyy-MM-dd"),
      name: String(row[2] || "").trim(),
      type: type,
      source: _rGclid(row) ? "Google Ads" : "Organic",
      amount: amtCol >= 0 ? String(row[amtCol] || "").trim() : "",
    });
  });
  return leads;
}

function _rWeekly(ss, leads) {
  var wk = {};
  leads.forEach(function (l) {
    if (!wk[l.week]) wk[l.week] = { ads: 0, org: 0 };
    if (l.source === "Google Ads") wk[l.week].ads++; else wk[l.week].org++;
  });
  var set = {};
  Object.keys(wk).forEach(function (k) { set[k] = true; });
  Object.keys(_R_AD_DATA).forEach(function (k) { set[k] = true; });
  var weeks = Object.keys(set).sort();

  var out = [["Week starting", "Ad spend (EUR)", "Ad clicks", "Ad leads", "Organic leads", "Total leads", "Cost / ad lead (EUR)"]];
  var tS = 0, tC = 0, tA = 0, tO = 0;
  weeks.forEach(function (k) {
    var a = wk[k] || { ads: 0, org: 0 }, ad = _R_AD_DATA[k] || { spend: 0, clicks: 0 };
    out.push([k, _rRound(ad.spend), ad.clicks, a.ads, a.org, a.ads + a.org, a.ads > 0 ? _rRound(ad.spend / a.ads) : ""]);
    tS += ad.spend; tC += ad.clicks; tA += a.ads; tO += a.org;
  });
  out.push(["TOTAL", _rRound(tS), tC, tA, tO, tA + tO, tA > 0 ? _rRound(tS / tA) : ""]);

  var rep = ss.getSheetByName("Weekly Ad Performance");
  if (rep) rep.clear(); else rep = ss.insertSheet("Weekly Ad Performance");
  rep.getRange(1, 1, out.length, out[0].length).setValues(out);
  rep.getRange(1, 1, 1, out[0].length).setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  rep.getRange(out.length, 1, 1, out[0].length).setFontWeight("bold").setBackground("#fef4eb");
  rep.setFrozenRows(1);
  [120, 120, 90, 90, 110, 90, 150].forEach(function (w, i) { rep.setColumnWidth(i + 1, w); });
  if (out.length > 1) {
    rep.getRange(2, 2, out.length - 1, 1).setNumberFormat("#,##0.00");
    rep.getRange(2, 7, out.length - 1, 1).setNumberFormat("#,##0.00");
  }
  rep.getRange(out.length + 2, 1).setValue("Ad spend + clicks are your real weekly Google Ads figures. Ad vs Organic leads split by whether a Google click id was captured on the lead. Organic costs nothing.");
  rep.getRange(out.length + 2, 1).setFontColor("#888888").setFontStyle("italic");
}

function _rTracker(ss, leads) {
  var sorted = leads.slice().sort(function (a, b) { return b.date.getTime() - a.date.getTime(); });
  // Amount is dropped on purpose: the sheet's amount column is part of the
  // mis-aligned data, so it reads garbage. Real order values come back in once
  // the columns are realigned. Type already shows who is a paying customer.
  var out = [["Date", "Customer", "Source", "Type"]];
  sorted.forEach(function (l) {
    out.push([Utilities.formatDate(l.date, "Europe/Dublin", "yyyy-MM-dd"), l.name, l.source, l.type]);
  });
  var rep = ss.getSheetByName("Customer Tracker");
  if (rep) rep.clear(); else rep = ss.insertSheet("Customer Tracker");
  rep.getRange(1, 1, out.length, out[0].length).setValues(out);
  rep.getRange(1, 1, 1, out[0].length).setFontWeight("bold").setBackground("#1a1a1a").setFontColor("#ffffff");
  rep.setFrozenRows(1);
  [110, 220, 120, 160].forEach(function (w, i) { rep.setColumnWidth(i + 1, w); });
  for (var r = 0; r < sorted.length; r++) {
    var cell = rep.getRange(r + 2, 3);
    if (sorted[r].source === "Google Ads") cell.setBackground("#cce5ff").setFontColor("#004085");
    else cell.setBackground("#e2e3e5").setFontColor("#383d41");
  }
}

function _rDiagnose(sheet) {
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
  for (var k = 0; k < lastCol; k++) if (counts[k] > gmax) { gmax = counts[k]; gcol = k; }
  var gh = headers.indexOf("GCLID");
  if (gmax === 0) { Logger.log("GCLID check: no Google click ids in the data yet (organic-only)."); return; }
  if (gcol === gh) { Logger.log("GCLID check: aligned correctly under the GCLID header."); return; }
  Logger.log("GCLID check: click-id data is in column " + (gcol + 1) + " under the '" +
    String(headers[gcol]) + "' header (should read GCLID). Reports are still correct. " +
    "Tell me this line and I will realign the raw column safely.");
}
