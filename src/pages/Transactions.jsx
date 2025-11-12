import React, { useState, useEffect } from "react";
import axios from "axios";

export default function Transactions(){
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ date: "", ticker: "", company: "", qty: 0, price: 0, broker: "" });

  useEffect(()=>{ fetchList(); }, []);
  async function fetchList(){
    try {
      const res = await axios.get("http://localhost:4000/api/transactions");
      setList(res.data);
    } catch { setList([]); }
  }
  async function submit(e){
    e.preventDefault();
    await axios.post("http://localhost:4000/api/transactions", form);
    setForm({date:"",ticker:"",company:"",qty:0,price:0,broker:""});
    fetchList();
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Transactions</h2>
      <form onSubmit={submit} className="bg-gray-50 p-6 rounded-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
            <input required placeholder="e.g., AAPL" value={form.ticker} onChange={e=>setForm({...form,ticker:e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input placeholder="e.g., Apple Inc." value={form.company} onChange={e=>setForm({...form,company:e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input required type="number" placeholder="e.g., 100" value={form.qty} onChange={e=>setForm({...form,qty:parseInt(e.target.value||0)})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
            <input required type="number" step="0.01" placeholder="e.g., 150.50" value={form.price} onChange={e=>setForm({...form,price:parseFloat(e.target.value||0)})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
            <input placeholder="e.g., Zerodha" value={form.broker} onChange={e=>setForm({...form,broker:e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
          </div>
        </div>
        <div className="mt-6">
          <button className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium">Add Transaction</button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broker</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {list.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.ticker}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.company}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.qty}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{t.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.broker}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
