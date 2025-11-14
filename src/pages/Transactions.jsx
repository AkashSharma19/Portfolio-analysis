import React, { useState } from "react";

export default function Transactions({ transactions, setTransactions, tickers }){
  const [form, setForm] = useState({ date: "", ticker: "", company: "", assetType: "", sector: "", qty: 0, price: 0, broker: "", type: "" });
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);
  async function submit(e){
    e.preventDefault();
    setLoading(true);
    setShowModal(false);
    try {
      const data = {
        ...form,
        date: new Date(form.date).toISOString(),
        qty: parseInt(form.qty || 0),
        price: parseFloat(form.price || 0),
        sector: form.sector,
      };
      console.log('Sending data:', data);
      if (isEditing) {
        const updateRes = await fetch(`https://script.google.com/macros/s/AKfycbx2RvfJT7AcUMLDXRMJNqf8HavKhoA6k5FdGNieehzAiKXkYhpCiERni9JvYNFm7kEE/exec?action=update&id=${editingId}&data=${encodeURIComponent(JSON.stringify(data))}`);
        const updateResult = await updateRes.json();
        if (!updateResult.ok) {
          console.error('Update failed:', updateResult.error);
          alert('Update failed: ' + updateResult.error);
          setShowModal(true);
          return;
        }
        setIsEditing(false);
        setEditingId(null);
      } else {
        const addRes = await fetch(`https://script.google.com/macros/s/AKfycbx2RvfJT7AcUMLDXRMJNqf8HavKhoA6k5FdGNieehzAiKXkYhpCiERni9JvYNFm7kEE/exec?action=add&data=${encodeURIComponent(JSON.stringify(data))}`);
        const addResult = await addRes.json();
        if (!addResult.ok) {
          console.error('Add failed:', addResult.error);
          alert('Add failed: ' + addResult.error);
          setShowModal(true);
          return;
        }
      }
      // Refresh transactions
      const res = await fetch("https://script.google.com/macros/s/AKfycbx2RvfJT7AcUMLDXRMJNqf8HavKhoA6k5FdGNieehzAiKXkYhpCiERni9JvYNFm7kEE/exec?action=get");
      const tx = await res.json();
      console.log('Received transactions:', tx.data);
      setTransactions(tx.data || []);
      setForm({date:"",ticker:"",company:"",assetType:"",qty:0,price:0,broker:""});
    } catch (err) {
      console.error(err);
      alert("Failed to save");
      setShowModal(true); // reopen modal on error
    }
    setLoading(false);
  }

  function handleEdit(t) {
    console.log('Editing transaction:', t);
    setEditingId(t.id);
    setIsEditing(true);
    setForm({ date: t.date.split('T')[0], ticker: t.ticker, company: t.company, assetType: t['Asset Type'] || "", sector: t.sector || "", qty: t.qty, price: t.price, broker: t.broker, type: t['type'] || "" });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      setLoading(true);
      setDeletingId(id);
      await fetch(`https://script.google.com/macros/s/AKfycbx2RvfJT7AcUMLDXRMJNqf8HavKhoA6k5FdGNieehzAiKXkYhpCiERni9JvYNFm7kEE/exec?action=delete&id=${id}`);
      // Refresh transactions
      const res = await fetch("https://script.google.com/macros/s/AKfycbx2RvfJT7AcUMLDXRMJNqf8HavKhoA6k5FdGNieehzAiKXkYhpCiERni9JvYNFm7kEE/exec?action=get");
      const tx = await res.json();
      setTransactions(tx.data || []);
      setDeletingId(null);
      setLoading(false);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    setEditingId(null);
    setForm({date:"",ticker:"",company:"",assetType:"",sector:"",qty:0,price:0,broker:"",type:""});
    setShowModal(false);
  }

  function handleAdd() {
    setIsEditing(false);
    setEditingId(null);
    setForm({date:"",ticker:"",company:"",assetType:"",sector:"",qty:0,price:0,broker:"",type:""});
    setShowModal(false);
    setShowModal(true);
  }

  return (
    <div>
      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="loader">
            <div className="box1"></div>
            <div className="box2"></div>
            <div className="box3"></div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Transactions</h2>
        <button onClick={handleAdd} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium">Add Transaction</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sector</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broker</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.ticker}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.company}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t['Asset Type']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.sector}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.qty}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{t.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.broker}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t['type']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleEdit(t)} className="text-indigo-600 hover:text-indigo-900 mr-4 text-lg" title="Edit">✏️</button>
                  <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="text-red-600 hover:text-red-900 text-lg disabled:opacity-50" title="Delete">
                    {deletingId === t.id ? (
                      <div className="loader" style={{transform: 'scale(0.3)'}}>
                        <div className="box1"></div>
                        <div className="box2"></div>
                        <div className="box3"></div>
                      </div>
                    ) : '🗑️'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">{isEditing ? "Edit Transaction" : "Add Transaction"}</h3>
            <form onSubmit={submit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ticker</label>
                    <select value={form.ticker} onChange={(e)=>{
                      const selectedTicker = e.target.value.toUpperCase();
                      const selected = tickers.find(t => t.Tickers === selectedTicker);
                      setForm({...form, ticker: selectedTicker, company: selected ? selected['Company Name'] : '', assetType: selected ? selected['Asset Type'] : '', sector: selected ? selected['Sector'] : ''});
                    }} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required>
                      <option value="">Select Ticker</option>
                      {tickers.map(t => <option key={t.Tickers} value={t.Tickers}>{t.Tickers} - {t['Company Name']}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input placeholder="e.g., Apple Inc." value={form.company} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100" readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                    <input placeholder="e.g., Equity" value={form.assetType} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100" readOnly />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                  <input placeholder="e.g., Technology" value={form.sector} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100" readOnly />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input required type="number" placeholder="e.g., 100" value={form.qty} onChange={e=>setForm({...form,qty:parseInt(e.target.value||0)})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                    <input required type="number" step="0.01" placeholder="e.g., 150.50" value={form.price} onChange={e=>setForm({...form,price:parseFloat(e.target.value||0)})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
                  <input placeholder="e.g., Zerodha" value={form.broker} onChange={e=>setForm({...form,broker:e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required>
                    <option value="">Select Type</option>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium">{isEditing ? "Update" : "Add"}</button>
                <button type="button" onClick={handleCancel} className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
