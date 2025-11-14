import React, { useEffect, useState, useMemo } from "react";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";

export default function App() {
  const [tab, setTab] = useState("analytics");
  const [transactions, setTransactions] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [portfolioData, setPortfolioData] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const loadData = async () => {
      await Promise.all([fetchTransactions(), fetchTickers(), fetchPortfolio()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch("https://script.google.com/macros/s/AKfycbytNIkwskGlr-Uf6Ug9kmKoLSUvhfVXOF6-qIig9NPAnpfMk_tAn8K-8jcnk_Bvu3s/exec?action=get", { cache: 'no-cache' });
      const data = await res.json();
      setTransactions(data.data || []);
    } catch {
      setTransactions([]);
    }
  };

  const fetchTickers = async () => {
    try {
      const res = await fetch("https://script.google.com/macros/s/AKfycbxD2Y90raZVlijC5WgdkqE_SK_O7Dcqfl8uP_aieZDFdgkrITv7SFaMZeBCq3W-xSiCHw/exec?action=get_tickers", { cache: 'no-cache' });
      const data = await res.json();
      setTickers(data.data || []);
    } catch {
      setTickers([]);
    }
  };

  const fetchPortfolio = async () => {
    try {
      console.log('Fetching portfolio...');
      const res = await fetch("https://script.google.com/macros/s/AKfycbwOeMng4mG4DBztvrhFTm4f9iIVtMlrQHhz1IPFER5PGbx9AJKMZYjcecJ4oI7JqwQh/exec?action=get_portfolio", { cache: 'no-cache' });
      console.log('Portfolio response status:', res.status);
      const data = await res.json();
      console.log('Portfolio data:', data);
      setPortfolioData(data.data || []);
      console.log('Set portfolioData to:', data.data || []);
    } catch (error) {
      console.log('Portfolio fetch error:', error);
      setPortfolioData([]);
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
              <Analytics analytics={analytics} transactions={transactions} tickerPrices={tickerPrices} portfolioData={portfolioData} loading={loading} />
            ) : (
              <Transactions transactions={transactions} setTransactions={setTransactions} tickers={tickers} />
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

