// Apps Script - Portfolio Tracking (Hourly Updates)
// Deploy as Web App (Execute as: Me, Access: Anyone, even anonymous)
// Fetches data from deployed transaction and ticker scripts

function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return jsonError('No query parameters provided');
    }
    Logger.log('doGet params: %s', JSON.stringify(e.parameter));
    const action = e.parameter.action;
    if (action === 'get_portfolio') return getPortfolioDataHtml();
    return jsonError('Invalid action: ' + action);
  } catch (err) {
    Logger.log(err);
    return jsonError(err.message || 'Server error');
  }
}

function getPortfolioData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Portfolio');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return [];

  const headers = data[0].map(h => String(h).trim());
  const portfolio = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
  return portfolio;
}

function getPortfolioDataHtml() {
  const portfolio = getPortfolioData();
  const json = JSON.stringify({ ok: true, data: portfolio });
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Portfolio API</title>
</head>
<body>
<script>
window.apiResponse = ${json};
</script>
</body>
</html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function updatePortfolioValue() {
  try {
    // URLs from your deployed scripts
    const transactionsUrl = 'https://script.google.com/macros/s/AKfycbytNIkwskGlr-Uf6Ug9kmKoLSUvhfVXOF6-qIig9NPAnpfMk_tAn8K-8jcnk_Bvu3s/exec?action=get';
    const tickersUrl = 'https://script.google.com/macros/s/AKfycbxD2Y90raZVlijC5WgdkqE_SK_O7Dcqfl8uP_aieZDFdgkrITv7SFaMZeBCq3W-xSiCHw/exec?action=get_tickers';

    // Fetch transactions
    const transactionsResponse = UrlFetchApp.fetch(transactionsUrl);
    const transactionsData = JSON.parse(transactionsResponse.getContentText());
    const transactions = transactionsData.ok ? transactionsData.data : [];

    // Fetch tickers
    const tickersResponse = UrlFetchApp.fetch(tickersUrl);
    const tickersData = JSON.parse(tickersResponse.getContentText());
    const tickers = tickersData.ok ? tickersData.data : [];

    // Create ticker prices map
    const tickerPrices = {};
    tickers.forEach(t => {
      tickerPrices[t.Tickers] = parseFloat(t['Current Value']) || 0;
    });

    // Calculate portfolio metrics
    const { totalInvestment, currentValue, profit, profitPercentage } = calculatePortfolio(transactions, tickerPrices);

    // Get active spreadsheet for portfolio tracking
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let portfolioSheet = spreadsheet.getSheetByName('Portfolio');
    if (!portfolioSheet) {
      portfolioSheet = spreadsheet.insertSheet('Portfolio');
      portfolioSheet.appendRow(['Date', 'Current Value', 'Profit %']);
    }

    // Append current data
    const now = new Date();
    const dateStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    portfolioSheet.appendRow([dateStr, currentValue, profitPercentage]);

    Logger.log(`Portfolio updated: ${dateStr}, Value: ${currentValue}, Profit%: ${profitPercentage}`);

  } catch (err) {
    Logger.log('Error updating portfolio: ' + err.message);
  }
}


function calculatePortfolio(transactions, tickerPrices) {
  let totalInvestment = 0;
  let currentValue = 0;

  transactions.forEach(tx => {
    const qty = parseFloat(tx.qty) || 0;
    const price = parseFloat(tx.price) || 0;
    const ticker = String(tx.ticker).trim();
    const currentPrice = tickerPrices[ticker] || 0;

    totalInvestment += qty * price;
    currentValue += qty * currentPrice;
  });

  const profit = currentValue - totalInvestment;
  const profitPercentage = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

  return { totalInvestment, currentValue, profit, profitPercentage };
}


// Function to set up hourly trigger (run this manually once)
function setupHourlyTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'updatePortfolioValue') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new hourly trigger
  ScriptApp.newTrigger('updatePortfolioValue')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('Hourly trigger set up for updatePortfolioValue');
}

// Manual test function
function testUpdate() {
  updatePortfolioValue();
}

// Test authorization function
function testAuth() {
  try {
    UrlFetchApp.fetch('https://www.google.com');
    Logger.log('Authorization successful');
  } catch (err) {
    Logger.log('Auth error: ' + err.message);
  }
}

/* JSON response helpers (if needed for web app) */
function jsonSuccess(obj) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data: obj })).setMimeType(ContentService.MimeType.JSON);
}
function jsonError(msg) {
  return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(msg) })).setMimeType(ContentService.MimeType.JSON);
}