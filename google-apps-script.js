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
    if (action === 'update') return updateTransaction(e);
    if (action === 'delete') return deleteTransaction(e);
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Transactions') || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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

function updateTransaction(e) {
  if (!e.parameter || !e.parameter.id || !e.parameter.data) return jsonError('Missing id or data parameter');
  try {
    const id = e.parameter.id;
    const data = JSON.parse(decodeURIComponent(e.parameter.data));
    Logger.log('Update data received:', data);
    Logger.log('Updating id:', id);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Transactions') || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const actualHeaders = headerRange.getValues()[0].map(h => String(h).trim());
    // Ensure 'type' is in headers
    if (!actualHeaders.includes('type')) {
      actualHeaders.push('type');
      headerRange.clearContent();
      sheet.getRange(1, 1, 1, actualHeaders.length).setValues([actualHeaders]);
    }
    const dataRange = sheet.getDataRange().getValues();
    if (dataRange.length <= 1) return jsonError('No transactions to update');
    for (let i = 1; i < dataRange.length; i++) {
      Logger.log('Checking row', i, 'id:', dataRange[i][0]);
      if (String(dataRange[i][0]) === String(id)) {
        Logger.log('Found row', i, 'updating');
        const row = [
          id,
          data.date || dataRange[i][1],
          data.ticker || dataRange[i][2],
          data.company || dataRange[i][3],
          Number(data.qty) || dataRange[i][4],
          Number(data.price) || dataRange[i][5],
          data.broker || dataRange[i][6],
          data.assetType || dataRange[i][7] || '',
          data.sector || dataRange[i][8] || '',
          data.type || dataRange[i][9] || ''
        ];
        Logger.log('Setting row:', row);
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        Logger.log('Updated successfully');
        return jsonSuccess({ success: true });
      }
    }
    return jsonError('Transaction not found');
  } catch (err) {
    Logger.log(err);
    return jsonError(err.message || 'Failed to update transaction');
  }
}

function deleteTransaction(e) {
  if (!e.parameter || !e.parameter.id) return jsonError('Missing id parameter');
  try {
    const id = e.parameter.id;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Transactions') || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const dataRange = sheet.getDataRange().getValues();
    if (dataRange.length <= 1) return jsonError('No transactions to delete');
    for (let i = 1; i < dataRange.length; i++) {
      if (String(dataRange[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return jsonSuccess({ success: true });
      }
    }
    return jsonError('Transaction not found');
  } catch (err) {
    Logger.log(err);
    return jsonError(err.message || 'Failed to delete transaction');
  }
}

function addTransactionRow(data) {
  try {
    Logger.log('Add data received:', data);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Transactions') || SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    const actualHeaders = headerRange.getValues()[0].map(h => String(h).trim());
    // If sheet is empty, create header row
    if (!actualHeaders || actualHeaders.length === 0 || actualHeaders[0] === '') {
      sheet.appendRow(['id', 'date', 'ticker', 'company', 'qty', 'price', 'broker', 'Asset Type', 'sector', 'type']);
    } else {
      // Ensure 'sector' is in headers
      if (!actualHeaders.includes('sector')) {
        actualHeaders.push('sector');
        headerRange.clearContent();
        sheet.getRange(1, 1, 1, actualHeaders.length).setValues([actualHeaders]);
      }
      // Ensure 'type' is in headers
      if (!actualHeaders.includes('type')) {
        actualHeaders.push('type');
        headerRange.clearContent();
        sheet.getRange(1, 1, 1, actualHeaders.length).setValues([actualHeaders]);
      }
    }
    const row = [
      Date.now(), // id
      data.date || '',
      data.ticker || '',
      data.company || '',
      Number(data.qty) || 0,
      Number(data.price) || 0,
      data.broker || '',
      data.assetType || '',
      data.sector || '',
      data.type || ''
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