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
const INVESTMENT_COLOR = '#6B7280'; // Neutral grey
const PROFIT_COLOR = '#10B981'; // Green for profit
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

  transactions.forEach(({ ticker, qty, price, type, sector }) => {
    if (!map[ticker])
      map[ticker] = { ticker, qty: 0, investment: 0, currentValue: 0, sector: sector || 'Unknown' };

    if (type === 'BUY') {
      map[ticker].qty += qty;
      map[ticker].investment += qty * price;
    } else if (type === 'SELL') {
      map[ticker].qty -= qty;
      // Investment is sum of buys, so don't subtract for sells
    }
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

/**
 * Calculates detailed investment and profit metrics per company using FIFO matching.
 * @param {Array<Object>} transactions
 * @param {Object} tickerPrices - Map of ticker to current price
 * @returns {Array<Object>} - Array of company metrics
 */
const calculateCompanyMetrics = (transactions = [], tickerPrices = {}) => {
  const companyMap = {};

  // Group transactions by ticker
  transactions.forEach(tx => {
    const qty = parseFloat(tx.qty) || 0;
    const price = parseFloat(tx.price) || 0;
    if (!companyMap[tx.ticker]) {
      companyMap[tx.ticker] = {
        ticker: tx.ticker,
        sector: tx.sector || 'Unknown Sector',
        assetType: tx['Asset Type'] || 'Unknown Asset Type',
        broker: tx.broker || 'Unknown Broker',
        buys: [],
        sells: [],
        overallInvestment: 0,
        realizedProfit: 0,
        unrealizedProfit: 0,
        currentInvestment: 0,
        currentProfit: 0,
        currentValue: 0,
        remainingQty: 0,
        remainingLots: []
      };
    }
    if (tx.type === 'BUY') {
      companyMap[tx.ticker].buys.push({ qty, price, date: tx.date });
      companyMap[tx.ticker].overallInvestment += qty * price;
    } else if (tx.type === 'SELL') {
      companyMap[tx.ticker].sells.push({ qty, price, date: tx.date });
    }
  });

  // Process each company
  Object.values(companyMap).forEach(company => {
    const { buys, sells, ticker } = company;
    const currentPrice = tickerPrices[ticker] || 0;

    // Sort buys and sells by date
    buys.sort((a, b) => new Date(a.date) - new Date(b.date));
    sells.sort((a, b) => new Date(a.date) - new Date(b.date));

    // FIFO matching for sells
    const buyQueue = [...buys]; // Copy buys for processing
    let realizedProfit = 0;
    let remainingLots = [];

    sells.forEach(sell => {
      let sellQty = sell.qty;
      while (sellQty > 0 && buyQueue.length > 0) {
        const buy = buyQueue[0];
        const matchQty = Math.min(sellQty, buy.qty);
        const profit = (sell.price - buy.price) * matchQty;
        realizedProfit += profit;
        buy.qty -= matchQty;
        sellQty -= matchQty;
        if (buy.qty === 0) {
          buyQueue.shift();
        }
      }
    });

    // Remaining lots after sells
    remainingLots = buyQueue.filter(b => b.qty > 0);

    // Calculate remaining qty and current investment
    let remainingQty = 0;
    let currentInvestment = 0;
    let totalCostRemaining = 0;
    remainingLots.forEach(lot => {
      remainingQty += lot.qty;
      currentInvestment += lot.qty * lot.price;
      totalCostRemaining += lot.qty * lot.price;
    });

    // Unrealized profit
    let unrealizedProfit = 0;
    remainingLots.forEach(lot => {
      unrealizedProfit += (currentPrice - lot.price) * lot.qty;
    });

    // Current profit (unrealized for remaining shares)
    let currentProfit = 0;
    if (remainingQty > 0) {
      const avgCost = totalCostRemaining / remainingQty;
      currentProfit = (currentPrice - avgCost) * remainingQty;
    }

    // Update company data
    company.realizedProfit = realizedProfit;
    company.unrealizedProfit = unrealizedProfit;
    company.overallTotalProfit = realizedProfit + unrealizedProfit;
    company.currentInvestment = currentInvestment;
    company.currentProfit = currentProfit;
    company.currentValue = remainingQty * currentPrice;
    company.remainingQty = remainingQty;
    company.remainingLots = remainingLots;
  });

  return Object.values(companyMap);
};

/**
 * Aggregates company metrics by sector.
 * @param {Array<Object>} companyData - Array of company metrics from calculateCompanyMetrics
 * @returns {Array<Object>} - Array of sector metrics
 */
const calculateSectorMetrics = (companyData = []) => {
  const sectorMap = {};

  companyData.forEach(company => {
    const sector = company.sector || 'Unknown Sector';
    if (!sectorMap[sector]) {
      sectorMap[sector] = {
        sector,
        overallInvestment: 0,
        realizedProfit: 0,
        unrealizedProfit: 0,
        overallTotalProfit: 0,
        currentInvestment: 0,
        currentProfit: 0,
        currentValue: 0,
        tickerCount: 0
      };
    }
    sectorMap[sector].overallInvestment += company.overallInvestment;
    sectorMap[sector].realizedProfit += company.realizedProfit;
    sectorMap[sector].unrealizedProfit += company.unrealizedProfit;
    sectorMap[sector].overallTotalProfit += company.overallTotalProfit;
    sectorMap[sector].currentInvestment += company.currentInvestment;
    sectorMap[sector].currentProfit += company.currentProfit;
    sectorMap[sector].currentValue += company.currentValue;
    sectorMap[sector].tickerCount += 1;
  });

  return Object.values(sectorMap);
};

/**
 * Aggregates company metrics by asset type.
 * @param {Array<Object>} companyData - Array of company metrics from calculateCompanyMetrics
 * @returns {Array<Object>} - Array of asset type metrics
 */
const calculateAssetTypeMetrics = (companyData = []) => {
  const assetTypeMap = {};

  companyData.forEach(company => {
    const assetType = company.assetType || 'Unknown Asset Type';
    if (!assetTypeMap[assetType]) {
      assetTypeMap[assetType] = {
        assetType,
        overallInvestment: 0,
        realizedProfit: 0,
        unrealizedProfit: 0,
        overallTotalProfit: 0,
        currentInvestment: 0,
        currentProfit: 0,
        currentValue: 0,
        tickerCount: 0
      };
    }
    assetTypeMap[assetType].overallInvestment += company.overallInvestment;
    assetTypeMap[assetType].realizedProfit += company.realizedProfit;
    assetTypeMap[assetType].unrealizedProfit += company.unrealizedProfit;
    assetTypeMap[assetType].overallTotalProfit += company.overallTotalProfit;
    assetTypeMap[assetType].currentInvestment += company.currentInvestment;
    assetTypeMap[assetType].currentProfit += company.currentProfit;
    assetTypeMap[assetType].currentValue += company.currentValue;
    assetTypeMap[assetType].tickerCount += 1;
  });

  return Object.values(assetTypeMap);
};

/**
 * Aggregates company metrics by broker.
 * @param {Array<Object>} companyData - Array of company metrics from calculateCompanyMetrics
 * @returns {Array<Object>} - Array of broker metrics
 */
const calculateBrokerMetrics = (companyData = []) => {
  const brokerMap = {};

  companyData.forEach(company => {
    const broker = company.broker || 'Unknown Broker';
    if (!brokerMap[broker]) {
      brokerMap[broker] = {
        broker,
        overallInvestment: 0,
        realizedProfit: 0,
        unrealizedProfit: 0,
        overallTotalProfit: 0,
        currentInvestment: 0,
        currentProfit: 0,
        currentValue: 0,
        tickerCount: 0
      };
    }
    brokerMap[broker].overallInvestment += company.overallInvestment;
    brokerMap[broker].realizedProfit += company.realizedProfit;
    brokerMap[broker].unrealizedProfit += company.unrealizedProfit;
    brokerMap[broker].overallTotalProfit += company.overallTotalProfit;
    brokerMap[broker].currentInvestment += company.currentInvestment;
    brokerMap[broker].currentProfit += company.currentProfit;
    brokerMap[broker].currentValue += company.currentValue;
    brokerMap[broker].tickerCount += 1;
  });

  return Object.values(brokerMap);
};


// --- Components ---

/**
 * Renders a single statistic card with icons and enhanced styling.
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {boolean} [props.positive=true] - Used to determine text color for profit/loss
 * @param {string} [props.icon] - Icon SVG as string
 * @returns {JSX.Element}
 */
function StatCard({ label, value, positive = true, icon }) {
  const valueColor = positive === false ? 'text-red-500' : 'text-green-600';
  const bgGradient = positive === false ? 'from-red-50 to-red-100' : 'from-green-50 to-green-100';

  const getIcon = (label) => {
    if (label.includes('Investment')) return (
      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    );
    if (label.includes('Value')) return (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    );
    if (label.includes('P/L')) return (
      <svg className={`w-6 h-6 ${valueColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={positive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
      </svg>
    );
    return (
      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
  };

  return (
    <div className={`p-3 sm:p-4 rounded-xl bg-gradient-to-br ${bgGradient} border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-slate-600 font-medium">{label}</div>
        {getIcon(label)}
      </div>
      <div
        className={`text-sm sm:text-base font-bold ${
          label.includes('P/L') ? valueColor : 'text-slate-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * SVG component for no data state.
 * @returns {JSX.Element}
 */
const NoDataSVG = () => (
  <div className="flex flex-col items-center justify-center h-full text-gray-500">
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="45" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
      <path d="M45 45 L75 45 L75 75 L45 75 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M60 35 L60 45 M50 40 L70 40" stroke="currentColor" strokeWidth="2"/>
      <circle cx="60" cy="60" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M55 55 L65 65 M65 55 L55 65" stroke="currentColor" strokeWidth="2"/>
    </svg>
    <p className="mt-4 text-lg font-medium text-center">No Analytics Data Yet</p>
    <p className="mt-2 text-sm text-center text-gray-400">Add transactions to get started with portfolio insights</p>
  </div>
);

/**
 * A wrapper component for all ApexCharts charts with modern styling and animations.
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.infoText] - Optional tooltip text for info icon
 * @param {number} [props.height=220]
 * @param {Object} props.options
 * @param {Array} props.series
 * @param {string} props.type
 * @returns {JSX.Element}
 */
const ChartContainer = ({ title, infoText, height = 300, options, series, type }) => {
  // Check if there's data to display
  const hasData = type === 'pie'
    ? series && series.length > 0
    : series && series.length > 0 && series[0] && series[0].data && series[0].data.length > 0;

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-3 sm:p-5 shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-[1.02] animate-fade-in">
      <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-4 flex items-center">
        <span className="mr-2">📊</span>
        {title}
        {infoText && (
          <span
            className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs font-bold cursor-help"
            title={infoText}
          >
            i
          </span>
        )}
      </h3>
      <div style={{ height, minHeight: height }} className="w-full">
        {hasData ? (
          <ReactApexChart
            options={options}
            series={series}
            type={type}
            height="100%"
            width="100%"
          />
        ) : (
          <NoDataSVG />
        )}
      </div>
    </div>
  );
};

/**
 * Renders the main analytics dashboard panel.
 */
function AnalyticsPanel({ analytics, transactions, tickerPrices, portfolioData, profitData }) {
  const { totalInvestment, currentInvestment, currentValue, realizedProfit, unrealizedProfit, totalProfit, profitPercentage } = analytics;

  const [timeRange, setTimeRange] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('Overall');
  const [sectorFilter, setSectorFilter] = useState('Overall');
  const [assetTypeFilter, setAssetTypeFilter] = useState('Overall');
  const [brokerFilter, setBrokerFilter] = useState('Overall');

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
  const bySector = useMemo(() => {
    const sectorMap = {};
    Object.values(holdings).forEach(holding => {
      if (holding.qty <= 0) return; // Skip if no remaining shares
      const sector = holding.sector || 'Unknown';
      if (!sectorMap[sector]) {
        sectorMap[sector] = { sector, qty: 0, investment: 0, currentValue: 0 };
      }
      sectorMap[sector].qty += holding.qty;
      sectorMap[sector].investment += holding.investment;
      sectorMap[sector].currentValue += holding.currentValue;
    });
    Object.values(sectorMap).forEach(item => {
      item.profit = item.currentValue - item.investment;
    });
    return Object.values(sectorMap);
  }, [holdings]);
  const byBroker = useMemo(
    () => aggregateByBroker(transactions, tickerPrices),
    [transactions, tickerPrices]
  );
  const byAssetType = useMemo(
    () => aggregateByAssetType(transactions, tickerPrices),
    [transactions, tickerPrices]
  );
  const companyData = useMemo(
    () => calculateCompanyMetrics(transactions, tickerPrices),
    [transactions, tickerPrices]
  );
  const sectorData = useMemo(
    () => calculateSectorMetrics(companyData),
    [companyData]
  );
  const filteredSectorData = useMemo(() => {
    let data = [...sectorData];
    if (sectorFilter === 'Current Investment') {
      data = data.filter(s => s.currentInvestment > 0);
    }
    data.sort((a, b) => {
      const aInv = sectorFilter === 'Overall' ? a.overallInvestment : a.currentInvestment;
      const bInv = sectorFilter === 'Overall' ? b.overallInvestment : b.currentInvestment;
      return bInv - aInv;
    });
    return data;
  }, [sectorData, sectorFilter]);
  const assetTypeData = useMemo(
    () => calculateAssetTypeMetrics(companyData),
    [companyData]
  );
  const filteredAssetTypeData = useMemo(() => {
    let data = [...assetTypeData];
    if (assetTypeFilter === 'Current Investment') {
      data = data.filter(a => a.currentInvestment > 0);
    }
    data.sort((a, b) => {
      const aInv = assetTypeFilter === 'Overall' ? a.overallInvestment : a.currentInvestment;
      const bInv = assetTypeFilter === 'Overall' ? b.overallInvestment : b.currentInvestment;
      return bInv - aInv;
    });
    return data;
  }, [assetTypeData, assetTypeFilter]);
  const brokerData = useMemo(
    () => calculateBrokerMetrics(companyData),
    [companyData]
  );
  const filteredBrokerData = useMemo(() => {
    let data = [...brokerData];
    if (brokerFilter === 'Current Investment') {
      data = data.filter(b => b.currentInvestment > 0);
    }
    data.sort((a, b) => {
      const aInv = brokerFilter === 'Overall' ? a.overallInvestment : a.currentInvestment;
      const bInv = brokerFilter === 'Overall' ? b.overallInvestment : b.currentInvestment;
      return bInv - aInv;
    });
    return data;
  }, [brokerData, brokerFilter]);
  const filteredCompanyData = useMemo(() => {
    let data = [...companyData];
    if (companyFilter === 'Current Investment') {
      data = data.filter(c => c.currentInvestment > 0);
    }
    // Sort by investment descending
    data.sort((a, b) => {
      const aInv = companyFilter === 'Overall' ? a.overallInvestment : a.currentInvestment;
      const bInv = companyFilter === 'Overall' ? b.overallInvestment : b.currentInvestment;
      return bInv - aInv;
    });
    return data;
  }, [companyData, companyFilter]);
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


  // Calculate top performer
  const topCompany = filteredCompanyData.length > 0 ? filteredCompanyData.reduce((prev, current) =>
    (companyFilter === 'Overall' ? current.overallTotalProfit : current.currentProfit) >
    (companyFilter === 'Overall' ? prev.overallTotalProfit : prev.currentProfit) ? current : prev
  ) : null;

  return (
    <div className="font-sans">

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 sm:gap-8">

        {/* Highlights Section (2 parts) */}
        <div className="md:col-span-2 space-y-4 sm:space-y-6">

          {/* Summary Header */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 sm:p-10 text-white shadow-lg relative">
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={() => {
                    const csv = [
                      ['Ticker', 'Investment', 'Current Value', 'Profit/Loss', 'Remaining Qty'],
                      ...filteredCompanyData.map(c => [
                        c.ticker,
                        companyFilter === 'Overall' ? c.overallInvestment : c.currentInvestment,
                        c.currentValue,
                        companyFilter === 'Overall' ? c.overallTotalProfit : c.currentProfit,
                        c.remainingQty
                      ])
                    ].map(row => row.join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.download = 'portfolio-data.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition duration-200"
                  title="Export Data as CSV"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              </div>
              <h2 className="text-base sm:text-lg font-bold mb-4">Portfolio Analytics Dashboard</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-blue-100 text-xs">Total Portfolio Value</p>
                  <p className="text-base sm:text-lg font-bold">{formatCurrency(currentValue)}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-xs">Total P/L</p>
                  <p className={`text-base sm:text-lg font-bold ${totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {formatCurrency(totalProfit)} ({formatPercentage(profitPercentage)})
                  </p>
                </div>
                {topCompany && (
                  <div>
                    <p className="text-blue-100 text-xs">Top Performer</p>
                    <p className="text-sm sm:text-base font-bold">{topCompany.ticker}</p>
                    <p className="text-xs text-blue-100">
                      {formatCurrency(companyFilter === 'Overall' ? topCompany.overallTotalProfit : topCompany.currentProfit)} profit
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stat Cards Section - 2 columns on mobile, 4 columns on medium and larger screens for better spacing */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
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
          {/* Current Value by Sector (Pie Chart) */}
          <ChartContainer
            title="Current Value by Sector"
            infoText="Visualize your current portfolio allocation by sector. The pie chart shows the percentage distribution of your holdings, helping you assess diversification."
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

          {/* Quick Stats Card */}
          <div className="bg-white border border-slate-100 rounded-xl p-3 sm:p-4 shadow-lg">
            <h3 className="text-xs font-semibold text-slate-700 mb-4">Quick Stats 📊</h3>
            <ul className="text-xs text-slate-700 space-y-2">
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

        </div>

        {/* Graphs Section (3 parts) */}
        <div className="md:col-span-3 space-y-4 sm:space-y-6">

          {/* Time Range Selector */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-700 mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full sm:w-auto px-3 py-1 text-xs border border-slate-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            >
              <option value="30d">Last 30 Days</option>
              <option value="3m">Last 3 Months</option>
              <option value="1y">Last 1 Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Portfolio Value Over Time (Line Chart) */}
          <ChartContainer
            title="Portfolio Value Over Time"
            infoText="Track how your portfolio value has changed over time. Use the time range selector above to focus on specific periods and identify growth trends."
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

          {/* Company Filter Selector */}
          <div className="mb-4">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setCompanyFilter('Overall')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  companyFilter === 'Overall'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => setCompanyFilter('Current Investment')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  companyFilter === 'Current Investment'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Current Investment
              </button>
            </div>
          </div>

          {/* Investment and Profit by Company (Bar Chart) */}
          <ChartContainer
            title={`Investment and Profit by Company (${companyFilter})`}
            infoText="Compare investments and profits across different companies. Switch between Overall and Current Investment views using the filter above to see different perspectives on your holdings."
            type="bar"
            options={{
              chart: { type: 'bar', toolbar: { show: false } },
              xaxis: { categories: filteredCompanyData.map(c => c.ticker) },
              yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
              tooltip: {
                custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                  const company = filteredCompanyData[dataPointIndex];
                  const investment = companyFilter === 'Overall' ? company.overallInvestment : company.currentInvestment;
                  const profit = companyFilter === 'Overall' ? company.overallTotalProfit : company.currentProfit;
                  const profitPct = investment > 0 ? (profit / investment * 100).toFixed(2) : 0;
                  return `
                    <div class="p-2 bg-white border border-gray-300 rounded shadow">
                      <div class="font-bold">${company.ticker}</div>
                      <div>Investment: ${formatCurrency(investment)}</div>
                      <div>Profit/Loss: ${formatCurrency(profit)}</div>
                      <div>Profit %: ${profitPct}%</div>
                      <div>Remaining Shares: ${company.remainingQty.toFixed(2)}</div>
                    </div>
                  `;
                }
              },
              colors: [INVESTMENT_COLOR, ...filteredCompanyData.map(c => (companyFilter === 'Overall' ? c.overallTotalProfit : c.currentProfit) >= 0 ? PROFIT_COLOR : LOSS_COLOR)],
              plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
              dataLabels: { enabled: false },
              grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
            }}
            series={[
              {
                name: 'Investment',
                data: filteredCompanyData.map(c => companyFilter === 'Overall' ? c.overallInvestment : c.currentInvestment)
              },
              {
                name: 'Profit/Loss',
                data: filteredCompanyData.map(c => companyFilter === 'Overall' ? c.overallTotalProfit : c.currentProfit)
              }
            ]}
          />

          {/* Sector Filter Selector */}
          <div className="mb-4">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setSectorFilter('Overall')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  sectorFilter === 'Overall'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => setSectorFilter('Current Investment')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  sectorFilter === 'Current Investment'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Current Investment
              </button>
            </div>
          </div>

          {/* Investment and Profit by Sector (Bar Chart) */}
          <ChartContainer
            title={`Investment and Profit by Sector (${sectorFilter})`}
            infoText="Analyze performance by sector allocation. See which sectors are contributing most to your portfolio's growth and identify areas for rebalancing."
            type="bar"
            options={{
              chart: { type: 'bar', toolbar: { show: false } },
              xaxis: { categories: filteredSectorData.map(s => s.sector) },
              yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
              tooltip: {
                custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                  const sector = filteredSectorData[dataPointIndex];
                  const investment = sectorFilter === 'Overall' ? sector.overallInvestment : sector.currentInvestment;
                  const profit = sectorFilter === 'Overall' ? sector.overallTotalProfit : sector.currentProfit;
                  const profitPct = investment > 0 ? (profit / investment * 100).toFixed(2) : 0;
                  return `
                    <div class="p-2 bg-white border border-gray-300 rounded shadow">
                      <div class="font-bold">${sector.sector}</div>
                      <div>Investment: ${formatCurrency(investment)}</div>
                      <div>Profit/Loss: ${formatCurrency(profit)}</div>
                      <div>Profit %: ${profitPct}%</div>
                      <div>Number of Tickers: ${sector.tickerCount}</div>
                    </div>
                  `;
                }
              },
              colors: [INVESTMENT_COLOR, ...filteredSectorData.map(s => (sectorFilter === 'Overall' ? s.overallTotalProfit : s.currentProfit) >= 0 ? PROFIT_COLOR : LOSS_COLOR)],
              plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
              dataLabels: { enabled: false },
              grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
            }}
            series={[
              {
                name: 'Investment',
                data: filteredSectorData.map(s => sectorFilter === 'Overall' ? s.overallInvestment : s.currentInvestment)
              },
              {
                name: 'Profit/Loss',
                data: filteredSectorData.map(s => sectorFilter === 'Overall' ? s.overallTotalProfit : s.currentProfit)
              }
            ]}
          />

          {/* Asset Type Filter Selector */}
          <div className="mb-4">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setAssetTypeFilter('Overall')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  assetTypeFilter === 'Overall'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => setAssetTypeFilter('Current Investment')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  assetTypeFilter === 'Current Investment'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Current Investment
              </button>
            </div>
          </div>

          {/* Investment and Current Value by Asset Type (Bar Chart) */}
          <ChartContainer
            title={`Investment and Current Value by Asset Type (${assetTypeFilter})`}
            infoText="View your portfolio breakdown by asset type. Understand diversification and current valuations across different investment categories to optimize your asset allocation."
            type="bar"
            options={{
              chart: { type: 'bar', toolbar: { show: false } },
              xaxis: { categories: filteredAssetTypeData.map(a => a.assetType) },
              yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
              tooltip: {
                custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                  const assetType = filteredAssetTypeData[dataPointIndex];
                  const investment = assetTypeFilter === 'Overall' ? assetType.overallInvestment : assetType.currentInvestment;
                  const currentValue = assetType.currentValue;
                  const profit = currentValue - investment;
                  const profitPct = investment > 0 ? (profit / investment * 100).toFixed(2) : 0;
                  return `
                    <div class="p-2 bg-white border border-gray-300 rounded shadow">
                      <div class="font-bold">${assetType.assetType}</div>
                      <div>Investment: ${formatCurrency(investment)}</div>
                      <div>Current Value: ${formatCurrency(currentValue)}</div>
                      <div>Profit/Loss: ${formatCurrency(profit)}</div>
                      <div>Return %: ${profitPct}%</div>
                    </div>
                  `;
                }
              },
              colors: [INVESTMENT_COLOR, '#10B981'], // Grey for investment, green for current value
              plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
              dataLabels: { enabled: false },
              grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
            }}
            series={[
              {
                name: 'Investment',
                data: filteredAssetTypeData.map(a => assetTypeFilter === 'Overall' ? a.overallInvestment : a.currentInvestment)
              },
              {
                name: 'Current Value',
                data: filteredAssetTypeData.map(a => a.currentValue)
              }
            ]}
          />

          {/* Broker Filter Selector */}
          <div className="mb-4">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setBrokerFilter('Overall')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  brokerFilter === 'Overall'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => setBrokerFilter('Current Investment')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                  brokerFilter === 'Current Investment'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Current Investment
              </button>
            </div>
          </div>

          {/* Investment and Current Value by Broker (Bar Chart) */}
          <ChartContainer
            title={`Investment and Current Value by Broker (${brokerFilter})`}
            infoText="Compare performance across different brokers. See which brokers are handling your most valuable investments and assess their contribution to your portfolio."
            type="bar"
            options={{
              chart: { type: 'bar', toolbar: { show: false } },
              xaxis: { categories: filteredBrokerData.map(b => b.broker) },
              yaxis: { labels: { formatter: (v) => formatAbbreviated(v) } },
              tooltip: {
                custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                  const broker = filteredBrokerData[dataPointIndex];
                  const investment = brokerFilter === 'Overall' ? broker.overallInvestment : broker.currentInvestment;
                  const currentValue = broker.currentValue;
                  const profit = currentValue - investment;
                  const profitPct = investment > 0 ? (profit / investment * 100).toFixed(2) : 0;
                  return `
                    <div class="p-2 bg-white border border-gray-300 rounded shadow">
                      <div class="font-bold">${broker.broker}</div>
                      <div>Investment: ${formatCurrency(investment)}</div>
                      <div>Current Value: ${formatCurrency(currentValue)}</div>
                      <div>Profit/Loss: ${formatCurrency(profit)}</div>
                      <div>Return %: ${profitPct}%</div>
                    </div>
                  `;
                }
              },
              colors: [INVESTMENT_COLOR, '#10B981'], // Grey for investment, green for current value
              plotOptions: { bar: { horizontal: false, columnWidth: '55%', endingShape: 'rounded' } },
              dataLabels: { enabled: false },
              grid: { borderColor: '#e0e0e0', strokeDashArray: 5 }
            }}
            series={[
              {
                name: 'Investment',
                data: filteredBrokerData.map(b => brokerFilter === 'Overall' ? b.overallInvestment : b.currentInvestment)
              },
              {
                name: 'Current Value',
                data: filteredBrokerData.map(b => b.currentValue)
              }
            ]}
          />


        </div>

      </div>

    </div>
  );
}


export default function Analytics({ analytics, transactions, tickerPrices, portfolioData, profitData, loading }) {
  return (
    <div className="font-sans p-2 sm:p-4">
      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="loader">
            <div className="box1"></div>
            <div className="box2"></div>
            <div className="box3"></div>
          </div>
        </div>
      )}
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
