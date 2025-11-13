
import React from "react";
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
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

function AnalyticsPanel({ analytics, transactions, tickerPrices }) {
  // prepare data for charts (group by date)
  const byDate = aggregateByDate(transactions);
  const holdings = aggregateHoldings(transactions, tickerPrices);
  const bySector = aggregateBySector(transactions, tickerPrices);
  const byBroker = aggregateByBroker(transactions, tickerPrices);
  const byAssetType = aggregateByAssetType(transactions, tickerPrices);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Investment" value={formatCurrency(analytics.totalInvestment)} />
          <StatCard label="Current Value" value={formatCurrency(analytics.currentValue)} />
          <StatCard label="Profit / Loss" value={formatCurrency(analytics.profit)} positive={analytics.profit >= 0} />
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="text-sm font-medium mb-2">Portfolio value over time</h3>
          <div style={{ height: 220, minHeight: 220 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <LineChart data={byDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="text-sm font-medium mb-2">Investment and Profit by Company</h3>
          <div style={{ height: 220, minHeight: 220 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={Object.values(holdings)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ticker" />
                <YAxis />
                <Tooltip formatter={(v, name) => [formatCurrency(v), name === 'investment' ? 'Investment' : 'Profit']} />
                <Bar dataKey="investment" fill="#10b981" />
                <Bar dataKey="profit" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="text-sm font-medium mb-2">Investment and Profit by Sector</h3>
          <div style={{ height: 220, minHeight: 220 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={bySector}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sector" />
                <YAxis />
                <Tooltip formatter={(v, name) => [formatCurrency(v), name === 'investment' ? 'Investment' : 'Profit']} />
                <Bar dataKey="investment" fill="#10b981" />
                <Bar dataKey="profit" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="text-sm font-medium mb-2">Investment and Current Value by Broker</h3>
          <div style={{ height: 220, minHeight: 220 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={byBroker}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="broker" />
                <YAxis />
                <Tooltip formatter={(v, name) => [formatCurrency(v), name === 'investment' ? 'Investment' : 'Current Value']} />
                <Bar dataKey="investment" fill="#10b981" />
                <Bar dataKey="currentValue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="text-sm font-medium mb-2">Investment and Current Value by Asset Type</h3>
          <div style={{ height: 220, minHeight: 220 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={byAssetType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="assetType" />
                <YAxis />
                <Tooltip formatter={(v, name) => [formatCurrency(v), name === 'investment' ? 'Investment' : 'Current Value']} />
                <Bar dataKey="investment" fill="#10b981" />
                <Bar dataKey="currentValue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border rounded p-4">
          <h3 className="text-sm font-medium mb-2">Quick stats</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>Total transactions: <strong>{transactions.length}</strong></li>
            <li>Total tickers: <strong>{Object.keys(aggregateHoldings(transactions)).length}</strong></li>
            <li>Avg investment / tx: <strong>{formatCurrency(analytics.totalInvestment / Math.max(1, transactions.length))}</strong></li>
          </ul>
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="text-sm font-medium mb-2">Current Value by Sector</h3>
          <div style={{ height: 300, minHeight: 300 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <PieChart>
                <Pie
                  data={bySector}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ sector, percent }) => `${sector} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="currentValue"
                >
                  {bySector.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded p-4">
          <h3 className="text-sm font-medium mb-2">Next steps</h3>
          <ol className="text-sm text-slate-600 list-decimal ml-5 space-y-1">
            <li>Integrate live price API</li>
            <li>CSV import / export</li>
            <li>Add authentication</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, positive }) {
  return (
    <div className="p-3 rounded border bg-white">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold mt-2 ${positive === false ? "text-rose-600" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

// --- Helpers ---
function aggregateByDate(tx = []) {
  if (!tx || tx.length === 0) return [];
  const map = {};
  // naive approach: sort by date, compute running value using purchase price
  const sorted = [...tx].sort((a,b)=> new Date(a.date) - new Date(b.date));
  let running = 0;
  sorted.forEach(t => {
    running += (t.qty * t.price);
    const d = new Date(t.date).toLocaleDateString();
    map[d] = { date: d, value: running };
  });
  return Object.values(map);
}

function aggregateHoldings(tx = [], tickerPrices = {}) {
  const map = {};
  tx.forEach(t => {
    if (!map[t.ticker]) map[t.ticker] = { ticker: t.ticker, qty: 0, investment: 0 };
    map[t.ticker].qty += t.qty;
    map[t.ticker].investment += t.qty * t.price;
  });
  // Calculate current value and profit
  Object.keys(map).forEach(ticker => {
    const currentPrice = tickerPrices[ticker] || 0;
    const currentValue = map[ticker].qty * currentPrice;
    const profit = currentValue - map[ticker].investment;
    map[ticker].profit = profit;
  });
  return map;
}

function aggregateBySector(tx = [], tickerPrices = {}) {
  const map = {};
  tx.forEach(t => {
    const sector = t.sector || 'Unknown';
    if (!map[sector]) map[sector] = { sector, qty: 0, investment: 0, currentValue: 0 };
    map[sector].qty += t.qty;
    map[sector].investment += t.qty * t.price;
    const currentPrice = tickerPrices[t.ticker] || 0;
    map[sector].currentValue += t.qty * currentPrice;
  });
  // Calculate profit for each sector
  Object.keys(map).forEach(sector => {
    map[sector].profit = map[sector].currentValue - map[sector].investment;
  });
  return Object.values(map);
}

function aggregateByBroker(tx = [], tickerPrices = {}) {
  const map = {};
  tx.forEach(t => {
    const broker = t.broker || 'Unknown';
    if (!map[broker]) map[broker] = { broker, qty: 0, investment: 0, currentValue: 0 };
    map[broker].qty += t.qty;
    map[broker].investment += t.qty * t.price;
    const currentPrice = tickerPrices[t.ticker] || 0;
    map[broker].currentValue += t.qty * currentPrice;
  });
  return Object.values(map);
}

function aggregateByAssetType(tx = [], tickerPrices = {}) {
  const map = {};
  tx.forEach(t => {
    const assetType = t['Asset Type'] || 'Unknown';
    if (!map[assetType]) map[assetType] = { assetType, qty: 0, investment: 0, currentValue: 0 };
    map[assetType].qty += t.qty;
    map[assetType].investment += t.qty * t.price;
    const currentPrice = tickerPrices[t.ticker] || 0;
    map[assetType].currentValue += t.qty * currentPrice;
  });
  return Object.values(map);
}

function formatCurrency(v = 0) {
  if (typeof v !== 'number') v = parseFloat(v) || 0;
  return '₹' + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function Analytics({ analytics, transactions, tickerPrices }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Portfolio Analytics</h2>
      <AnalyticsPanel analytics={analytics} transactions={transactions} tickerPrices={tickerPrices} />
    </div>
  );
}
