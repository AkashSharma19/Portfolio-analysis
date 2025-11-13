
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
} from "recharts";

function AnalyticsPanel({ analytics, transactions }) {
  // prepare data for charts (group by date)
  const byDate = aggregateByDate(transactions);
  const holdings = aggregateHoldings(transactions);

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
          <h3 className="text-sm font-medium mb-2">Holdings</h3>
          <div style={{ height: 220, minHeight: 220 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={Object.values(holdings)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ticker" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" fill="#10b981" />
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

function aggregateHoldings(tx = []) {
  const map = {};
  tx.forEach(t => {
    if (!map[t.ticker]) map[t.ticker] = { ticker: t.ticker, qty: 0, value: 0 };
    map[t.ticker].qty += t.qty;
    map[t.ticker].value += t.qty * t.price;
  });
  return map;
}

function formatCurrency(v = 0) {
  if (typeof v !== 'number') v = parseFloat(v) || 0;
  return '₹' + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function Analytics({ analytics, transactions }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Portfolio Analytics</h2>
      <AnalyticsPanel analytics={analytics} transactions={transactions} />
    </div>
  );
}
