// Apps Script - Transactions API (GET/POST)
// Deploy as Web App (Execute as: Me, Access: Anyone, even anonymous)

function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return jsonError('No query parameters provided');
    }
    Logger.log('doGet params: %s', JSON.stringify(e.parameter));
    const action = e.parameter.action;
    if (action === 'get') return getTransactions();
    if (action === 'add') return addTransactionFromParam(e);
    return jsonError('Invalid action: ' + action);
  } catch (err) {
    Logger.log(err);
    return jsonError(err.message || 'Server error');
  }
}

function doPost(e) {
  try {
    Logger.log('doPost received: %s', JSON.stringify(e));
    // Accept JSON body
    const payload = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : null;
    if (!payload || !payload.action) return jsonError('Missing action in POST body');
    if (payload.action === 'add') {
      return addTransactionFromBody(payload);
    }
    if (payload.action === 'get') {
      return getTransactions();
    }
    return jsonError('Invalid action in POST: ' + payload.action);
  } catch (err) {
    Logger.log(err);
    return jsonError(err.message || 'Server error');
  }
}

/* ---------- Helpers ---------- */

function getTransactions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return jsonSuccess([]); // no rows
  const headers = data[0].map(h => String(h).trim());
  const transactions = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      // use header as-is (lowercase mapping removed - keep original)
      obj[header] = row[i];
    });
    // ensure id exists (if first column is id)
    if (!obj[headers[0]]) obj[headers[0]] = Date.now();
    return obj;
  });
  return jsonSuccess(transactions);
}

function addTransactionFromParam(e) {
  if (!e.parameter || !e.parameter.data) return jsonError('Missing data parameter');
  try {
    const data = JSON.parse(e.parameter.data);
    return addTransactionRow(data);
  } catch (err) {
    Logger.log('JSON parse error: ' + err);
    return jsonError('Invalid JSON in data parameter');
  }
}

function addTransactionFromBody(payload) {
  // payload expected: { action: 'add', data: { date, ticker, company, qty, price, broker } }
  if (!payload.data) return jsonError('Missing data property in POST body');
  return addTransactionRow(payload.data);
}

function addTransactionRow(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    // Ensure sheet has header row. Expected columns: id, date, ticker, company, qty, price, broker
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
    // If sheet is empty, create header row
    if (!headerRow || headerRow.length === 0 || headerRow[0] === '') {
      sheet.appendRow(['id', 'date', 'ticker', 'company', 'qty', 'price', 'broker']);
    }
    const row = [
      Date.now(), // id
      data.date || '',
      data.ticker || '',
      data.company || '',
      Number(data.qty) || 0,
      Number(data.price) || 0,
      data.broker || ''
    ];
    sheet.appendRow(row);
    return jsonSuccess({ success: true });
  } catch (err) {
    Logger.log(err);
    return jsonError(err.message || 'Failed to append row');
  }
}

/* JSON response helpers */
function jsonSuccess(obj) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: obj })).setMimeType(ContentService.MimeType.JSON);
}
function jsonError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(msg) })).setMimeType(ContentService.MimeType.JSON);
}