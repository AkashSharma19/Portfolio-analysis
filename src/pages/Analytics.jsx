
import React, { useEffect, useState } from "react";
import axios from "axios";


export default function Analytics(){
  const [s, setS] = useState(null);
  useEffect(()=>{ axios.get("http://localhost:4000/api/analytics").then(r=>setS(r.data)).catch(()=>setS({totalInvestment:0,currentValue:0,profit:0})); }, []);
  if(!s) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Portfolio Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl shadow-xl text-white hover:shadow-2xl transition-shadow duration-300">
          <div className="text-4xl mb-2">💰</div>
          <h4 className="text-sm font-medium opacity-90">Total Investment</h4>
          <div className="text-3xl font-bold mt-2">₹{s.totalInvestment.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl shadow-xl text-white hover:shadow-2xl transition-shadow duration-300">
          <div className="text-4xl mb-2">📈</div>
          <h4 className="text-sm font-medium opacity-90">Current Value</h4>
          <div className="text-3xl font-bold mt-2">₹{s.currentValue.toLocaleString()}</div>
        </div>
        <div className={`p-6 rounded-xl shadow-xl text-white hover:shadow-2xl transition-shadow duration-300 ${s.profit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
          <div className="text-4xl mb-2">{s.profit >= 0 ? '📊' : '📉'}</div>
          <h4 className="text-sm font-medium opacity-90">Profit/Loss</h4>
          <div className="text-3xl font-bold mt-2">₹{s.profit.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
