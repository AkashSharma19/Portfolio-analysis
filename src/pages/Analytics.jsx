import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts';

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
  // Ensure we display two decimal places
  return v.toFixed(2) + '%';
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
    map[dateKey] = { date: dateKey, value: runningValue };
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
 * A wrapper component for all Recharts charts to ensure consistent styling.
 * @param {Object} props
 * @param {string} props.title
 * @param {number} [props.height=220]
 * @param {JSX.Element} props.children
 * @returns {JSX.Element}
 */
const ChartContainer = ({ title, height = 220, children }) => (
  <div className="bg-white border border-slate-100 rounded-xl p-4 sm:p-6 shadow-lg">
    <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-4">{title}</h3>
    <div style={{ height, minHeight: height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={height}>
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);

/**
 * Renders the main analytics dashboard panel.
 */
function AnalyticsPanel({ analytics, transactions, tickerPrices, portfolioData }) {
  console.log('AnalyticsPanel portfolioData:', portfolioData);
  const { totalInvestment, currentValue, profit } = analytics;

  // Calculate percentage
  const profitPercentage = useMemo(() => {
    // Guard against division by zero
    if (totalInvestment === 0) return 0;
    return (profit / totalInvestment) * 100;
  }, [profit, totalInvestment]);

  // Use useMemo for aggregation performance
  const byDate = useMemo(
    () => portfolioData && portfolioData.length > 0
      ? portfolioData.map(p => ({ date: p.Date, value: parseFloat(p['Current Value']) || 0 }))
      : aggregateByDate(transactions, tickerPrices),
    [transactions, tickerPrices, portfolioData]
  );
  console.log('byDate:', byDate);
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

  // Helper for BarChart Tooltip formatting
  const barTooltipFormatter = (v, name) => {
    const label =
      name === 'investment'
        ? 'Investment'
        : name === 'profit'
        ? 'Profit'
        : 'Current Value';
    return [formatCurrency(v), label];
  };

  return (
    // Main layout is fully responsive: single column on mobile, 2/3 + 1/3 split on desktop
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 font-sans">
      
      {/* Left Column (Charts - takes up full width on mobile) */}
      <div className="md:col-span-2 space-y-4 sm:space-y-6">
        
        {/* Stat Cards Section - 2 columns on mobile, 4 columns on desktop/tablet */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            label="Total Investment"
            value={formatCurrency(totalInvestment)}
          />
          <StatCard
            label="Current Value"
            value={formatCurrency(currentValue)}
          />
          <StatCard
            label="Profit / Loss"
            value={formatCurrency(profit)}
            positive={profit >= 0}
          />
          <StatCard
            label="Profit / Loss %"
            value={formatPercentage(profitPercentage)}
            positive={profit >= 0}
          />
        </div>
        
        {/* Portfolio Value Over Time (Line Chart) */}
        <ChartContainer title="Portfolio Value Over Time">
          <LineChart data={byDate}>
            <CartesianGrid strokeDasharray="5 5" stroke="#e0e0e0" />
            <XAxis dataKey="date" stroke="#64748B" />
            <YAxis tickFormatter={(v) => formatCurrency(v, false)} stroke="#64748B" />
            <Tooltip formatter={(v) => [formatCurrency(v), 'Value']} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>

        {/* Investment and Profit by Company (Bar Chart) */}
        <ChartContainer title="Investment and Profit by Company">
          <BarChart data={Object.values(holdings)}>
            <CartesianGrid strokeDasharray="5 5" stroke="#e0e0e0" />
            <XAxis dataKey="ticker" stroke="#64748B" />
            <YAxis tickFormatter={(v) => formatCurrency(v, false)} stroke="#64748B" />
            <Tooltip formatter={barTooltipFormatter} />
            <Bar dataKey="investment" fill={INVESTMENT_COLOR} name="Investment" />
            <Bar dataKey="profit" fill={PROFIT_COLOR} name="Profit" />
          </BarChart>
        </ChartContainer>

        {/* Investment and Profit by Sector (Bar Chart) */}
        <ChartContainer title="Investment and Profit by Sector">
          <BarChart data={bySector}>
            <CartesianGrid strokeDasharray="5 5" stroke="#e0e0e0" />
            <XAxis dataKey="sector" stroke="#64748B" />
            <YAxis tickFormatter={(v) => formatCurrency(v, false)} stroke="#64748B" />
            <Tooltip formatter={barTooltipFormatter} />
            <Bar dataKey="investment" fill={INVESTMENT_COLOR} name="Investment" />
            <Bar dataKey="profit" fill={PROFIT_COLOR} name="Profit" />
          </BarChart>
        </ChartContainer>

        {/* Investment and Current Value by Asset Type (Bar Chart) */}
        <ChartContainer title="Investment and Current Value by Asset Type">
          <BarChart data={byAssetType}>
            <CartesianGrid strokeDasharray="5 5" stroke="#e0e0e0" />
            <XAxis dataKey="Asset Type" stroke="#64748B" />
            <YAxis tickFormatter={(v) => formatCurrency(v, false)} stroke="#64748B" />
            <Tooltip formatter={barTooltipFormatter} />
            <Bar dataKey="investment" fill={INVESTMENT_COLOR} name="Investment" />
            <Bar dataKey="currentValue" fill={PROFIT_COLOR} name="Current Value" />
          </BarChart>
        </ChartContainer>

        {/* Investment and Current Value by Broker (Bar Chart) */}
        <ChartContainer title="Investment and Current Value by Broker">
          <BarChart data={byBroker}>
            <CartesianGrid strokeDasharray="5 5" stroke="#e0e0e0" />
            <XAxis dataKey="broker" stroke="#64748B" />
            <YAxis tickFormatter={(v) => formatCurrency(v, false)} stroke="#64748B" />
            <Tooltip formatter={barTooltipFormatter} />
            <Bar dataKey="investment" fill={INVESTMENT_COLOR} name="Investment" />
            <Bar dataKey="currentValue" fill={PROFIT_COLOR} name="Current Value" />
          </BarChart>
        </ChartContainer>
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
              Total tickers:
              <strong>{Object.keys(holdings).length}</strong>
            </li>
            <li>
              Avg investment / tx:
              <strong>
                {formatCurrency(
                  totalInvestment / Math.max(1, transactions.length)
                )}
              </strong>
            </li>
          </ul>
        </div>

        {/* Current Value by Sector (Pie Chart - Converted to Internal Label/Legend Style) */}
        <ChartContainer title="Current Value by Sector" height={350}>
          <PieChart>
            <Pie
              data={bySector}
              dataKey="currentValue"
              nameKey="sector"
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={120} // Maintains the size
              paddingAngle={2}
              // REMOVE external label and labelLine props
              // label={...}
              // labelLine={...}
              fill="#8884d8"
            >
              {bySector.map((entry, index) => (
                <Cell
                  key={`cell-${entry.sector}`}
                  fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]}
                />
              ))}

              {/* ADD LabelList for internal percentage labels (like the example image) */}
              <LabelList
                // Calculate percentage for display inside the slice
                formatter={(value) => {
                  // Find the entry to get total value for percentage calculation
                  const total = bySector.reduce((sum, entry) => sum + entry.currentValue, 0);
                  const percent = (value / total) * 100;
                  return `${Math.round(percent)}%`; // Format as integer percentage
                }}
                dataKey="currentValue" // We use currentValue to calculate the percentage
                position="inside"
                fill="#ffffff" // White text for visibility inside colored slices
                fontWeight="bold"
                fontSize={14}
              />
            </Pie>

            {/* Add Legend below Tooltip for sector names */}
            <Tooltip formatter={(v) => [formatCurrency(v), 'Current Value']} />
            <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ paddingTop: '20px' }} // Spacing for the legend
            />
          </PieChart>
        </ChartContainer>

      </div>
    </div>
  );
}


export default function Analytics({ analytics, transactions, tickerPrices, portfolioData, loading }) {
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
      />
    </div>
  );
}
