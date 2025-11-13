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

// Enhanced color palette for charts (using Tailwind shades for better visual appeal)
const LINE_COLOR = '#1D4ED8'; // Tailwind blue-700
const INVESTMENT_COLOR = '#059669'; // Tailwind emerald-600
const PROFIT_COLOR = '#3B82F6'; // Tailwind blue-500
const LOSS_COLOR = '#EF4444'; // Tailwind red-500

// --- Helper Functions (No change in logic, only presentation logic included here) ---

const formatCurrency = (value = 0) => {
  const v = typeof value !== 'number' ? parseFloat(value) || 0 : value;
  // Use 'en-IN' locale for Indian Rupee presentation (₹)
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

// ... (Keep the aggregation helper functions: aggregateByDate, aggregateHoldings, aggregateByKey, aggregateBySector, aggregateByBroker, aggregateByAssetType unchanged here) ...

/**
 * Aggregates portfolio value over time based on transaction purchase price.
 * NOTE: This is a naive calculation based on cost, not current market value.
 * @param {Array<Object>} transactions
 * @returns {Array<Object>}
 */
const aggregateByDate = (transactions = []) => {
  if (!transactions || transactions.length === 0) return [];

  // Sort by date to calculate running total
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let runningValue = 0;
  const map = {};

  sorted.forEach((t) => {
    runningValue += t.qty * t.price;
    const dateKey = new Date(t.date).toLocaleDateString();
    // Only record the value at the time of the latest transaction on that day
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
    // Handle 'Asset Type' key which has a space
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
 * **UI Enhancement:** Added shadow, slightly better border color, and a subtle hover effect.
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
    // Updated: added shadow-md, border-slate-200, hover:shadow-lg
    <div className="p-4 rounded-lg border border-slate-200 bg-white shadow-md transition duration-300 ease-in-out hover:shadow-lg">
      <div className="text-sm text-slate-500 font-medium">{label}</div>
      {/* Profit/Loss uses a dynamic color; others use slate-900 */}
      <div
        className={`text-xl font-bold mt-1 ${
          label === 'Profit / Loss' ? valueColor : 'text-slate-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * A wrapper component for all Recharts charts to reduce repetition.
 * **UI Enhancement:** Added `shadow-lg` and rounded corners for a premium feel.
 * @param {Object} props
 * @param {string} props.title
 * @param {number} [props.height=220]
 * @param {JSX.Element} props.children
 * @returns {JSX.Element}
 */
const ChartContainer = ({ title, height = 220, children }) => (
  // Updated: added shadow-lg, rounded-xl, and slightly larger padding
  <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-lg">
    <h3 className="text-lg font-semibold text-slate-700 mb-4">{title}</h3>
    <div style={{ height, minHeight: height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={height}>
        {children}
      </ResponsiveContainer>
    </div>
  </div>
);


function AnalyticsPanel({ analytics, transactions, tickerPrices }) {
  // Use useMemo to avoid recalculating aggregations on every render
  const { totalInvestment, currentValue, profit } = analytics;

  const byDate = useMemo(
    () => aggregateByDate(transactions),
    [transactions]
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-sans">
      {/* Left Column (Main Charts) */}
      <div className="md:col-span-2 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-6">
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
            // Use the LOSS_COLOR for negative profit
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
              strokeWidth={3} // Thicker line
              dot={false}
              activeDot={{ r: 4 }} // Highlight active point on hover
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
            {/* Conditional color for profit bar based on value (positive/negative) is more complex in recharts but we can use PROFIT_COLOR/LOSS_COLOR based on context here, using PROFIT_COLOR as standard for blue for now */}
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
      </div>

      {/* Right Column (Quick Stats & Pie Chart) */}
      <div className="space-y-6">
        {/* Quick Stats Card */}
        {/* Updated: Added shadow-lg, rounded-xl */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Quick Stats 📊</h3>
          <ul className="text-base text-slate-700 space-y-2">
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

        {/* Current Value by Sector (Pie Chart) */}
        <ChartContainer title="Current Value by Sector" height={400}>
          <PieChart>
            <Pie
              data={bySector}
              dataKey="currentValue"
              nameKey="sector"
              cx="50%"
              cy="45%"
              outerRadius={80}
              labelLine={false}
              paddingAngle={2}
            >
              {bySector.map((entry, index) => (
                <Cell
                  key={`cell-${entry.sector}`}
                  fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [formatCurrency(v), 'Current Value']} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span style={{ color: '#64748B' }}>{value}</span>}
            />
          </PieChart>
        </ChartContainer>

        {/* Next Steps Card */}
        {/* Updated: Added shadow-lg, rounded-xl */}
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Next Steps 🚀</h3>
          <ol className="text-base text-slate-700 list-decimal ml-5 space-y-2">
            <li>Integrate live price API</li>
            <li>CSV import / export</li>
            <li>Add authentication</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// --- Main Export ---

export default function Analytics({ analytics, transactions, tickerPrices }) {
  // Global font setting is often done in the index.css/tailwind.css, but we'll apply it here for component-level scope
  return (
    <div className="font-sans">
      <h2 className="text-3xl font-bold text-gray-800 mb-8">
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

// ... (Aggregation helpers should be kept outside or in a separate file for production)
