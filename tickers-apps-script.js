// Apps Script - Tickers API (GET)
// Deploy as Web App (Execute as: Me, Access: Anyone, even anonymous)
// Sheet should have headers: Tickers, Current Value, Company Name

function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return jsonError('No query parameters provided');
    }
    Logger.log('doGet params: %s', JSON.stringify(e.parameter));
    const action = e.parameter.action;
    if (action === 'get_tickers') return getTickers();
    return jsonError('Invalid action: ' + action);
  } catch (err) {
    Logger.log(err);
    return jsonError(err.message || 'Server error');
  }
}

/* ---------- Helpers ---------- */

function getTickers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return jsonSuccess([]); // no rows
  const headers = data[0].map(h => String(h).trim());
  const tickers = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  return jsonSuccess(tickers);
}

/* JSON response helpers */
function jsonSuccess(obj) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: obj })).setMimeType(ContentService.MimeType.JSON);
}
function jsonError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(msg) })).setMimeType(ContentService.MimeType.JSON);
}