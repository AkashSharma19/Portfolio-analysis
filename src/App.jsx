import React, { useEffect, useState, useMemo } from "react";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";

export default function App() {
  const [tab, setTab] = useState("analytics");
  const [transactions, setTransactions] = useState([]);
  const [tickers, setTickers] = useState([]);
  const [portfolioData, setPortfolioData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const tickerPrices = useMemo(() => {
    const map = {};
    tickers.forEach(t => map[t.Tickers] = parseFloat(t['Current Value']) || 0);
    return map;
  }, [tickers]);

  const analytics = useMemo(() => {
    // Total Investment: sum of (qty * price) for BUY transactions only
    const totalInvestment = transactions
      .filter(t => t.type === 'BUY')
      .reduce((s, t) => s + t.qty * t.price, 0);

    // FIFO processing for realized profit and current investment
    const fifoResult = (() => {
      // Sort transactions by date
      const sortedTransactions = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

      // Map of ticker to array of buy lots: [{qty, price}]
      const buyLots = {};
      let realizedProfit = 0;

      sortedTransactions.forEach(t => {
        if (!buyLots[t.ticker]) buyLots[t.ticker] = [];

        if (t.type === 'BUY') {
          // Add buy lot
          buyLots[t.ticker].push({ qty: t.qty, price: t.price });
        } else if (t.type === 'SELL') {
          // Process sell using FIFO
          let remainingSellQty = t.qty; // positive for sell
          const lots = buyLots[t.ticker] || [];
          let sellPrice = t.price;
          while (remainingSellQty > 0 && lots.length > 0) {
            const lot = lots[0];
            const matchedQty = Math.min(lot.qty, remainingSellQty);
            // Realized profit: (sell_price - buy_price) * matched_qty
            realizedProfit += (sellPrice - lot.price) * matchedQty;
            remainingSellQty -= matchedQty;
            lot.qty -= matchedQty;
            if (lot.qty === 0) lots.shift();
          }
          // If remainingSellQty > 0, short position, ignore excess
        }
      });

      // Current Investment: sum remaining lots qty * price
      let currentInvestment = 0;
      Object.values(buyLots).forEach(lots => {
        lots.forEach(lot => {
          currentInvestment += lot.qty * lot.price;
        });
      });

      return { currentInvestment, realizedProfit, buyLots };
    })();

    const { currentInvestment, realizedProfit, buyLots } = fifoResult;

    // Unrealized Profit: for remaining lots, (current_price - buy_price) * qty
    let unrealizedProfit = 0;
    Object.entries(buyLots).forEach(([ticker, lots]) => {
      const currentPrice = tickerPrices[ticker] || 0;
      lots.forEach(lot => {
        unrealizedProfit += (currentPrice - lot.price) * lot.qty;
      });
    });

    const totalProfit = realizedProfit + unrealizedProfit;
    const profitPercentage = totalInvestment === 0 ? 0 : (totalProfit / totalInvestment) * 100;

    const currentValue = transactions.reduce((s, t) => s + t.qty * (tickerPrices[t.ticker] || t.price), 0);

    return {
      totalInvestment,
      currentInvestment,
      currentValue,
      realizedProfit,
      unrealizedProfit,
      totalProfit,
      profitPercentage
    };
  }, [transactions, tickerPrices]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchTransactions(), fetchTickers(), fetchPortfolio()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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
      const res = await fetch("https://script.google.com/macros/s/AKfycbwOeMng4mG4DBztvrhFTm4f9iIVtMlrQHhz1IPFER5PGbx9AJKMZYjcecJ4oI7JqwQh/exec?action=get_portfolio");
      const text = await res.text();
      console.log('Portfolio response text:', text.substring(0, 200));
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        // Parse HTML response
        const match = text.match(/window\.apiResponse\s*=\s*({.+});/);
        if (match) {
          data = JSON.parse(match[1]);
        } else {
          data = { data: [] };
        }
      }
      console.log('Parsed portfolio data:', data);
      setPortfolioData(data.data || []);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setPortfolioData([]);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="max-w-6xl mx-auto sm:p-6">
        <div className="mt-6 bg-white rounded-2xl shadow-md">
          <div className="sticky top-0 bg-white z-10 flex items-center gap-2 p-4 border-b">
            <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")}>Analytics</TabButton>
            <TabButton active={tab === "transactions"} onClick={() => setTab("transactions")}>Transactions</TabButton>
            <div className="ml-auto flex items-center gap-2">
              <ConnectivityIndicator isOnline={isOnline} />
            </div>
          </div>

          <div className="sm:p-6">
            {tab === "analytics" ? (
              <Analytics analytics={analytics} transactions={transactions} tickerPrices={tickerPrices} portfolioData={portfolioData} profitData={portfolioData} loading={loading} />
            ) : (
              <Transactions transactions={transactions} setTransactions={setTransactions} tickers={tickers} />
            )}
          </div>
        </div>
      </div>
    </div>
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

function ConnectivityIndicator({ isOnline }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      {isOnline ? (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 9.636c5.076 5.076 13.308 5.076 18.384 0a1 1 0 01-1.414-1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.879a3 3 0 00-4.242 0 1 1 0 01-1.415-1.415 5 5 0 017.072 0 1 1 0 01-1.415 1.415zM10 16a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3c-2.25 0-4.33.855-6.032 2.293L3.707 2.293zm1.988 4.011A7.009 7.009 0 0110 5c2.717 0 5.187 1.544 6.542 4H16a1 1 0 100 2h3a1 1 0 001-1c0-3.74-2.553-7-6.542-8.978L8.695 6.304zM10 15a1 1 0 100-2 1 1 0 000 2zm-3-3a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      )}
      <span>{isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
}

