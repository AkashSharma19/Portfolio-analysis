import React, { useEffect, useState, useMemo } from "react";
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

// Single-file React component for a clean Portfolio Analyzer UI
// Drop this file into frontend/src/App.jsx (overwrite existing App.jsx)
// Requires: recharts, TailwindCSS
// Uses Google Sheets via Apps Script for data persistence

export default function App() {
  const [tab, setTab] = useState("analytics");
  const [transactions, setTransactions] = useState([]);
  const [tickers, setTickers] = useState([]);

  const tickerPrices = useMemo(() => {
    const map = {};
    tickers.forEach(t => map[t.Tickers] = parseFloat(t['Current Value']) || 0);
    return map;
  }, [tickers]);

  const analytics = useMemo(() => {
    const totalInvestment = transactions.reduce((s, t) => s + t.qty * t.price, 0);
    const currentValue = transactions.reduce((s, t) => s + t.qty * (tickerPrices[t.ticker] || t.price), 0);
    const profit = currentValue - totalInvestment;
    return { totalInvestment, currentValue, profit };
  }, [transactions, tickerPrices]);

  useEffect(() => {
    fetchTransactions();
    fetchTickers();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch("https://script.google.com/macros/s/AKfycby9LFCG_TaFKxMSszFGB1stAuKETwbgOftF0oGBf7n0e2IHhR1afC7THiygwEHz8FTQ/exec?action=get");
      const data = await res.json();
      setTransactions(data.data || []);
    } catch {
      setTransactions([]);
    }
  };

  const fetchTickers = async () => {
    try {
      const res = await fetch("https://script.google.com/macros/s/AKfycbxD2Y90raZVlijC5WgdkqE_SK_O7Dcqfl8uP_aieZDFdgkrITv7SFaMZeBCq3W-xSiCHw/exec?action=get_tickers");
      const data = await res.json();
      setTickers(data.data || []);
    } catch {
      setTickers([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="max-w-6xl mx-auto p-6">
        <Header />

        <div className="mt-6 bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="flex items-center gap-2 p-4 border-b">
            <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")}>Analytics</TabButton>
            <TabButton active={tab === "transactions"} onClick={() => setTab("transactions")}>Transactions</TabButton>
            <div className="ml-auto flex items-center gap-2">
              {/* Refresh not needed for local storage */}
            </div>
          </div>

          <div className="p-6">
            {tab === "analytics" ? (
              <AnalyticsPanel analytics={analytics} transactions={transactions} />
            ) : (
              <TransactionsPanel transactions={transactions} setTransactions={setTransactions} tickers={tickers} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold">Portfolio Analyzer</h1>
        <p className="text-sm text-slate-500 mt-1">Track holdings, transactions and profit & loss at a glance.</p>
      </div>
      <div className="hidden md:flex items-center gap-3">
        <div className="text-right">
          <div className="text-xs text-slate-500">You</div>
          <div className="text-sm font-medium">Akash</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">A</div>
      </div>
    </header>
  );
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

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
          <div style={{ height: 220 }} className="w-full">
            <ResponsiveContainer>
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
          <div style={{ height: 220 }} className="w-full">
            <ResponsiveContainer>
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

function TransactionsPanel({ transactions, setTransactions, tickers }) {
  const [form, setForm] = useState({ date: "", ticker: "", company: "", qty: "", price: "", broker: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...form,
        date: new Date(form.date).toISOString(),
        qty: parseInt(form.qty || 0),
        price: parseFloat(form.price || 0),
      };
      await fetch(`https://script.google.com/macros/s/AKfycby9LFCG_TaFKxMSszFGB1stAuKETwbgOftF0oGBf7n0e2IHhR1afC7THiygwEHz8FTQ/exec?action=add&data=${encodeURIComponent(JSON.stringify(data))}`);
      // Refresh transactions
      const res = await fetch("https://script.google.com/macros/s/AKfycby9LFCG_TaFKxMSszFGB1stAuKETwbgOftF0oGBf7n0e2IHhR1afC7THiygwEHz8FTQ/exec?action=get");
      const tx = await res.json();
      setTransactions(tx.data || []);
      setForm({ date: "", ticker: "", company: "", qty: "", price: "", broker: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    }
    setSaving(false);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <form onSubmit={submit} className="md:col-span-1 space-y-3 bg-white border p-4 rounded">
        <h3 className="text-sm font-medium">Add transaction</h3>
        <input value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})} type="date" className="w-full p-2 border rounded" required />
        <select value={form.ticker} onChange={(e)=>{
          const selectedTicker = e.target.value.toUpperCase();
          const selected = tickers.find(t => t.Tickers === selectedTicker);
          setForm({...form, ticker: selectedTicker, company: selected ? selected['Company Name'] : ''});
        }} className="w-full p-2 border rounded" required>
          <option value="">Select Ticker</option>
          {tickers.map(t => <option key={t.Tickers} value={t.Tickers}>{t.Tickers} - {t['Company Name']}</option>)}
        </select>
        <input value={form.company} placeholder="Company" className="w-full p-2 border rounded bg-gray-100" readOnly />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.qty} onChange={(e)=>setForm({...form,qty:e.target.value})} type="number" placeholder="Qty" className="p-2 border rounded" required />
          <input value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} type="number" step="0.01" placeholder="Price" className="p-2 border rounded" required />
        </div>
        <select value={form.broker} onChange={(e)=>setForm({...form,broker:e.target.value})} className="w-full p-2 border rounded">
          <option value="">Select Broker</option>
          <option value="Upstox">Upstox</option>
          <option value="Groww">Groww</option>
          <option value="IND Money">IND Money</option>
        </select>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-slate-900 text-white rounded" disabled={saving}>{saving ? 'Saving...' : 'Add'}</button>
          <button type="button" onClick={()=>{ setForm({ date: "", ticker: "", company: "", qty: "", price: "", broker: "" }); }} className="px-3 py-2 border rounded">Reset</button>
        </div>
      </form>

      <div className="md:col-span-2 bg-white border rounded p-2 overflow-auto">
        <h3 className="text-sm font-medium p-3 border-b">Transactions</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="p-2">Date</th>
              <th className="p-2">Ticker</th>
              <th className="p-2">Qty</th>
              <th className="p-2">Price</th>
              <th className="p-2">Broker</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-500">No transactions yet</td></tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 align-top">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="p-2 font-medium">{t.ticker}</td>
                  <td className="p-2">{t.qty}</td>
                  <td className="p-2">{formatCurrency(t.price)}</td>
                  <td className="p-2">{t.broker}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
