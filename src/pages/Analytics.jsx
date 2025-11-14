import React, { useMemo, useState } from 'react';
import ReactApexChart from 'react-apexcharts';

// --- Constants & Configuration ---

const PIE_CHART_COLORS = [
  '#0088FE', // Brighter Blue
  '#00C49F', // Emerald Green
  '#FFBB28', // Yellow/Orange
  '#FF8042', // Coral Orange
  '#8884D8', // Light Purple
  '#413EA0', // Darker Blue
  '#A3E635', // Lime Green
];

// Enhanced color palette for charts
const LINE_COLOR = '#1D4ED8'; // Tailwind blue-700
const INVESTMENT_COLOR = '#059669'; // Tailwind emerald-600
const PROFIT_COLOR = '#3B82F6'; // Tailwind blue-500
const LOSS_COLOR = '#EF4444'; // Tailwind red-500

// --- Helper Functions ---

/**
 * Formats a number as currency (Indian Rupee, 2 decimal places).
 * @param {number} value
 * @returns {string}
 */
const formatCurrency = (value = 0) => {
  const v = typeof value !== 'number' ? parseFloat(value) || 0 : value;
  // Use 'en-IN' locale for Indian Rupee presentation (₹)
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

/**
 * Formats a number as a percentage (2 decimal places).
 * @param {number} value
 * @returns {string}
 */
const formatPercentage = (value = 0) => {
  const v = typeof value !== 'number' ? parseFloat(value) || 0 : value;
  // Display as whole number percentage
  return v.toFixed(0) + '%';
};

/**
 * Formats a number with abbreviated notation (K for thousand, etc.).
 * @param {number} value
 * @returns {string}
 */
const formatAbbreviated = (value = 0) => {
  const v = typeof value !== 'number' ? parseFloat(value) || 0 : value;
  const abs = Math.abs(v);
  let num = abs;
  let suffix = '';
  if (abs >= 1000000) {
    num = abs / 1000000;
    suffix = 'M';
  } else if (abs >= 1000) {
    num = abs / 1000;
    suffix = 'K';
  }
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(1);
  return (v < 0 ? '-' : '') + formatted + suffix;
};

/**
 * Formats a date as "DD MMM" if current year, "DD MMM YYYY" if previous year.
 * @param {string|Date} date
 * @returns {string}
 */
const formatDate = (date) => {
  const d = new Date(date);
  const currentYear = new Date().getFullYear();
  const year = d.getFullYear();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  if (year === currentYear) {
    return `${day} ${month}`;
  } else {
    return `${day} ${month} ${year}`;
  }
};

/**
 * Aggregates portfolio current value over time based on current market prices.
 * @param {Array<Object>} transactions
 * @param {Object} tickerPrices - Map of ticker to current price
 * @returns {Array<Object>}
 */
const aggregateByDate = (transactions = [], tickerPrices = {}) => {
  if (!transactions || transactions.length === 0) return [];

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let runningValue = 0;
  const map = {};

  sorted.forEach((t) => {
    const currentPrice = tickerPrices[t.ticker] || 0;
    runningValue += t.qty * currentPrice;
    const dateKey = new Date(t.date).toLocaleDateString();
    const formattedDate = formatDate(t.date);
    map[dateKey] = { date: formattedDate, value: runningValue };
  });

  return Object.values(map);
};

/**
 * Aggregates holdings by ticker, calculating investment, current value, and profit.
 * @param {Array<Object>} transactions
 * @param {Object} tickerPrices - Map of ticker to current price
 * @returns {Object<string, Object>} - Map of ticker to holding data
 */
const aggregateHoldings = (transactions = [], tickerPrices = {}) => {
  const map = {};

  transactions.forEach(({ ticker, qty, price }) => {
    if (!map[ticker])
      map[ticker] = { ticker, qty: 0, investment: 0, currentValue: 0 };
    
    map[ticker].qty += qty;
    map[ticker].investment += qty * price;
  });

  // Calculate current value and profit
  Object.keys(map).forEach((ticker) => {
    const holding = map[ticker];
    const currentPrice = tickerPrices[ticker] || 0;
    holding.currentValue = holding.qty * currentPrice;
    holding.profit = holding.currentValue - holding.investment;
  });

  return map;
};

// Generic aggregation function for grouping by a dynamic key
const aggregateByKey = (transactions = [], tickerPrices = {}, key) => {
  const map = {};

  transactions.forEach((t) => {
    const groupKeyName = key === 'Asset Type' ? 'Asset Type' : key;
    const groupKey = t[groupKeyName] || 'Unknown';
    if (!map[groupKey])
      map[groupKey] = { [groupKeyName]: groupKey, qty: 0, investment: 0, currentValue: 0 };

    map[groupKey].qty += t.qty;
    map[groupKey].investment += t.qty * t.price;

    const currentPrice = tickerPrices[t.ticker] || 0;
    map[groupKey].currentValue += t.qty * currentPrice;
  });

  // Calculate profit
  Object.values(map).forEach(item => {
    item.profit = item.currentValue - item.investment;
  });

  return Object.values(map);
};

// Specific aggregators using the generic function
const aggregateBySector = (tx, prices) => aggregateByKey(tx, prices, 'sector');
const aggregateByBroker = (tx, prices) => aggregateByKey(tx, prices, 'broker');
const aggregateByAssetType = (tx, prices) => aggregateByKey(tx, prices, 'Asset Type');


// --- Components ---

/**
 * Renders a single statistic card.
 * Enhanced for mobile readability and visual appeal.
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {boolean} [props.positive=true] - Used to determine text color for profit/loss
 * @returns {JSX.Element}
 */
function StatCard({ label, value, positive = true }) {
  // Use explicit color for positive and negative profit/loss
  const valueColor = positive === false ? 'text-rose-600' : 'text-emerald-600';

  return (
    // Mobile: p-3, Desktop: p-4. Uses transition and shadow for polish.
    <div className="p-3 sm:p-4 rounded-lg border border-slate-200 bg-white shadow-md transition duration-300 ease-in-out hover:shadow-lg">
      <div className="text-xs sm:text-sm text-slate-500 font-medium">{label}</div>
      {/* Font size is slightly larger on desktop for prominence */}
      <div
        className={`text-lg sm:text-xl font-bold mt-1 ${
          label.includes('Profit / Loss') ? valueColor : 'text-slate-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * A wrapper component for all ApexCharts charts to ensure consistent styling.
 * @param {Object} props
 * @param {string} props.title
 * @param {number} [props.height=220]
 * @param {Object} props.options
 * @param {Array} props.series
 * @param {string} props.type
 * @returns {JSX.Element}
 */
const ChartContainer = ({ title, height = 220, options, series, type }) => (
  <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 shadow-lg">
    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4">{title}</h3>
    <div style={{ height, minHeight: height }} className="w-full">
      <ReactApexChart
        options={options}
        series={series}
        type={type}
        height="100%"
        width="100%"
      />
    </div>
  </div>
);

/**
 * Renders the main analytics dashboard panel.
 */
function AnalyticsPanel({ analytics, transactions, tickerPrices, portfolioData, profitData }) {
  const { totalInvestment, currentInvestment, currentValue, realizedProfit, unrealizedProfit, totalProfit, profitPercentage } = analytics;

  const [timeRange, setTimeRange] = useState('all');

  // Use useMemo for aggregation performance
  const byDate = useMemo(
    () => portfolioData && portfolioData.length > 0
      ? portfolioData.map(p => ({
          date: formatDate(p.Date),
          timestamp: new Date(p.Date).getTime(),
          value: parseFloat(p['Current Value']) || 0
        }))
      : aggregateByDate(transactions, tickerPrices).map(d => ({
          date: d.date,
          timestamp: new Date(d.date).getTime(),
          value: d.value
        })),
    [transactions, tickerPrices, portfolioData]
  );
  const holdings = useMemo(
    () => aggregateHoldings(transactions, tickerPrices),
    [transactions, tickerPrices]
  );
  const bySector = useMemo(
    () => aggregateBySector(transactions, tickerPrices),
    [transactions, tickerPrices]
  );
  const byBroker = useMemo(
    () => aggregateByBroker(transactions, tickerPrices),
    [transactions, tickerPrices]
  );
  const byAssetType = useMemo(
    () => aggregateByAssetType(transactions, tickerPrices),
    [transactions, tickerPrices]
  );
  const profitOverTime = useMemo(() => {
    if (!portfolioData || portfolioData.length === 0 || !transactions || transactions.length === 0) return [];

    // Sort portfolio data by date
    const sortedPortfolio = [...portfolioData].sort((a, b) => new Date(a.Date) - new Date(b.Date));

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

    const result = sortedPortfolio.map(p => {
      const date = new Date(p.Date);
      const portfolioValue = parseFloat(p['Current Value']) || 0;

      // Calculate net invested up to this date
      let netInvested = 0;
      for (const tx of sortedTransactions) {
        if (new Date(tx.date) > date) break;
        const amount = tx.qty * tx.price;
        if (tx.type === 'BUY') {
          netInvested += amount;
        } else if (tx.type === 'SELL') {
          netInvested -= amount;
        }
      }

      // If net invested is zero or negative, set to zero
      if (netInvested <= 0) netInvested = 0;

      const profit = portfolioValue - netInvested;
      const profitPct = netInvested > 0 ? (profit / netInvested) * 100 : 0;

      return {
        timestamp: date.getTime(),
        profit: profitPct,
        date: formatDate(p.Date),
        portfolioValue,
        netInvested,
        absoluteProfit: profit
      };
    });

    console.log('Calculated Profit over time:', result);
    return result;
  }, [portfolioData, transactions]);

  const filteredByDate = useMemo(() => {
    if (!byDate || byDate.length === 0) return [];

    const now = new Date();
    let days = 0;
    switch (timeRange) {
      case '30d': days = 30; break;
      case '3m': days = 90; break;
      case '1y': days = 365; break;
      default: return byDate;
    }
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return byDate.filter(d => new Date(d.timestamp) >= cutoff);
  }, [byDate, timeRange]);


  return (
    // Main layout is fully responsive: single column on mobile, 2/3 + 1/3 split on desktop
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 font-sans">
      
      {/* Left Column (Charts - takes up full width on mobile) */}
      <div className="md:col-span-2 space-y-4 sm:space-y-6">
        
        {/* Stat Cards Section - 2 columns on mobile, 7 columns on desktop/tablet */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 sm:gap-6">
          <StatCard
            label="Total Investment"
            value={formatCurrency(totalInvestment)}
          />
          <StatCard
            label="Current Investment"
            value={formatCurrency(currentInvestment)}
          />
          <StatCard
            label="Current Value"
            value={formatCurrency(currentValue)}
          />
          <StatCard
            label="Realized P/L"
            value={formatCurrency(realizedProfit)}
            positive={realizedProfit >= 0}
          />
          <StatCard
            label="Unrealized P/L"
            value={formatCurrency(unrealizedProfit)}
            positive={unrealizedProfit >= 0}
          />
          <StatCard
            label="Total P/L"
            value={formatCurrency(totalProfit)}
            positive={totalProfit >= 0}
          />
          <StatCard
            label="P/L %"
            value={formatPercentage(profitPercentage)}
            positive={totalProfit >= 0}
          />
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 rounded text-sm ${timeRange === '30d' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('3m')}
            className={`px-3 py-1 rounded text-sm ${timeRange === '3m' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Last 3 Months
          </button>
          <button
            onClick={() => setTimeRange('1y')}
            className={`px-3 py-1 rounded text-sm ${timeRange === '1y' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Last 1 Year
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1 rounded text-sm ${timeRange === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            All Time
          </button>
        </div>

        {/* Portfolio Value Over Time (Line Chart) */}
        <ChartContainer
          title="Portfolio Value Over Time"
          type="line"
          options={{
            chart: { type: 'line', toolbar: { show: false } },
            xaxis: { type: 'datetime' },
            yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
            tooltip: { y: { formatter: (v) => formatCurrency(v) } },
            colors: [LINE_COLOR],
            stroke: { curve: 'smooth', width: 3 },
            markers: { size: 0 },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
          }}
          series={[
            { name: 'Portfolio Value', data: filteredByDate.map(d => [d.timestamp, d.value]) }
          ]}
        />

        {/* Investment and Profit by Company (Bar Chart) */}
        <ChartContainer
          title="Investment and Profit by Company"
          type="bar"
          options={{
            chart: { type: 'bar', toolbar: { show: false } },
            xaxis: { categories: Object.values(holdings).map(h => h.ticker) },
            yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
            tooltip: { y: { formatter: (v) => formatAbbreviated(v) } },
            colors: [INVESTMENT_COLOR, PROFIT_COLOR],
            plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
          }}
          series={[
            { name: 'Investment', data: Object.values(holdings).map(h => h.investment) },
            { name: 'Profit', data: Object.values(holdings).map(h => h.profit) }
          ]}
        />

        {/* Investment and Profit by Sector (Bar Chart) */}
        <ChartContainer
          title="Investment and Profit by Sector"
          type="bar"
          options={{
            chart: { type: 'bar', toolbar: { show: false } },
            xaxis: { categories: bySector.map(s => s.sector) },
            yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
            tooltip: { y: { formatter: (v) => formatAbbreviated(v) } },
            colors: [INVESTMENT_COLOR, PROFIT_COLOR],
            plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
          }}
          series={[
            { name: 'Investment', data: bySector.map(s => s.investment) },
            { name: 'Profit', data: bySector.map(s => s.profit) }
          ]}
        />

        {/* Investment and Current Value by Asset Type (Bar Chart) */}
        <ChartContainer
          title="Investment and Current Value by Asset Type"
          type="bar"
          options={{
            chart: { type: 'bar', toolbar: { show: false } },
            xaxis: { categories: byAssetType.map(a => a['Asset Type']) },
            yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
            tooltip: { y: { formatter: (v) => formatAbbreviated(v) } },
            colors: [INVESTMENT_COLOR, PROFIT_COLOR],
            plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
          }}
          series={[
            { name: 'Investment', data: byAssetType.map(a => a.investment) },
            { name: 'Current Value', data: byAssetType.map(a => a.currentValue) }
          ]}
        />

        {/* Investment and Current Value by Broker (Bar Chart) */}
        <ChartContainer
          title="Investment and Current Value by Broker"
          type="bar"
          options={{
            chart: { type: 'bar', toolbar: { show: false } },
            xaxis: { categories: byBroker.map(b => b.broker) },
            yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
            tooltip: { y: { formatter: (v) => formatAbbreviated(v) } },
            colors: [INVESTMENT_COLOR, PROFIT_COLOR],
            plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
          }}
          series={[
            { name: 'Investment', data: byBroker.map(b => b.investment) },
            { name: 'Current Value', data: byBroker.map(b => b.currentValue) }
          ]}
        />
      </div>

      {/* Right Column (Side Panel - stacks below charts on mobile) */}
      <div className="space-y-4 sm:space-y-6">
        
        {/* Quick Stats Card */}
        <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 shadow-lg">
          <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4">Quick Stats 📊</h3>
          <ul className="text-sm sm:text-base text-slate-700 space-y-2">
            <li>
              Total transactions: <strong>{transactions.length}</strong>
            </li>
            <li>
              Total tickers: <strong>{Object.keys(holdings).length}</strong>
            </li>
            <li>
              Avg investment / tx: <strong>
                {formatCurrency(
                  totalInvestment / Math.max(1, transactions.length)
                )}
              </strong>
            </li>
          </ul>
        </div>

        {/* Current Value by Sector (Pie Chart) */}
        <ChartContainer
          title="Current Value by Sector"
          height={350}
          type="pie"
          options={{
            labels: bySector.map(s => s.sector),
            colors: PIE_CHART_COLORS,
            tooltip: { y: { formatter: (v) => formatAbbreviated(v) } },
            legend: { position: 'bottom' },
            dataLabels: {
              enabled: true,
              formatter: (val) => `${Math.round(val)}%`,
              style: { fontSize: '14px', fontWeight: 'bold', colors: ['#ffffff'] }
            }
          }}
          series={bySector.map(s => s.currentValue)}
        />

      </div>
    </div>
  );
}


export default function Analytics({ analytics, transactions, tickerPrices, portfolioData, profitData, loading }) {
  return (
    <div className="font-sans p-4 sm:p-0">
      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="loader">
            <div className="box1"></div>
            <div className="box2"></div>
            <div className="box3"></div>
          </div>
        </div>
      )}
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 sm:mb-8">
        Portfolio Analytics
      </h2>
      <AnalyticsPanel
        analytics={analytics}
        transactions={transactions}
        tickerPrices={tickerPrices}
        portfolioData={portfolioData}
        profitData={profitData}
      />
    </div>
  );
}
