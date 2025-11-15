import React, { useState, useMemo } from "react";

export default function Transactions({ transactions, setTransactions, tickers }){
  const [form, setForm] = useState({ date: "", ticker: "", company: "", assetType: "", sector: "", qty: "", price: "", broker: "", type: "" });
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter(t =>
      t.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.broker.toLowerCase().includes(searchTerm.toLowerCase())
    );
    filtered.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      if (sortColumn === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [transactions, searchTerm, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredAndSortedTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const uniqueBrokers = useMemo(() => {
    const brokers = new Set();
    transactions.forEach(t => {
      if (t.broker) brokers.add(t.broker);
    });
    return Array.from(brokers).sort();
  }, [transactions]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };
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
      setForm({date:"",ticker:"",company:"",assetType:"",qty:"",price:"",broker:""});
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
    setForm({ date: t.date.split('T')[0], ticker: t.ticker, company: t.company, assetType: t['Asset Type'] || "", sector: t.sector || "", qty: t.qty.toString(), price: t.price.toString(), broker: t.broker, type: t['type'] || "" });
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
    setForm({date:"",ticker:"",company:"",assetType:"",sector:"",qty:"",price:"",broker:"",type:""});
    setShowModal(false);
  }

  function handleAdd() {
    setIsEditing(false);
    setEditingId(null);
    setForm({date:"",ticker:"",company:"",assetType:"",sector:"",qty:"",price:"",broker:"",type:""});
    setShowModal(false);
    setShowModal(true);
  }

  const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );

  const Loader = () => (
    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
  );

  return (
    <div>
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Loader />
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Transactions</h2>
        <button onClick={handleAdd} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium">Add Transaction</button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by ticker, company, or broker..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('date')}>
                Date {sortColumn === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('ticker')}>
                Ticker {sortColumn === 'ticker' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('company')}>
                Company {sortColumn === 'company' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Asset Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sector</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('qty')}>
                Qty {sortColumn === 'qty' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('price')}>
                Price {sortColumn === 'price' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('broker')}>
                Broker {sortColumn === 'broker' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('type')}>
                Type {sortColumn === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider sticky right-0 bg-slate-50">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {paginatedTransactions.map(t => (
              <tr key={t.id} className={`hover:bg-slate-50 ${t['type'] === 'BUY' ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{new Date(t.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{t.ticker}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t.company}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t['Asset Type']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t.sector}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t.qty}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">₹{t.price}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t.broker}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{t['type']}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white">
                  <button onClick={() => handleEdit(t)} className="text-indigo-600 hover:text-indigo-900 mr-4" title="Edit"><EditIcon /></button>
                  <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="text-red-600 hover:text-red-900 disabled:opacity-50" title="Delete">
                    {deletingId === t.id ? <Loader /> : <DeleteIcon />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {paginatedTransactions.map(t => (
          <div key={t.id} className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${t['type'] === 'BUY' ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-slate-900">{t.ticker}</h3>
                <p className="text-sm text-slate-600">{t.company}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(t)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit">
                  <EditIcon />
                </button>
                <button onClick={() => handleDelete(t.id)} disabled={deletingId === t.id} className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50" title="Delete">
                  {deletingId === t.id ? <Loader /> : <DeleteIcon />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Date:</span> {new Date(t.date).toLocaleDateString()}</div>
              <div><span className="font-medium">Qty:</span> {t.qty}</div>
              <div><span className="font-medium">Price:</span> ₹{t.price}</div>
              <div><span className="font-medium">Type:</span> {t['type']}</div>
              <div><span className="font-medium">Broker:</span> {t.broker}</div>
              <div><span className="font-medium">Asset:</span> {t['Asset Type']}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-slate-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of {filteredAndSortedTransactions.length} transactions
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-slate-200 text-slate-700 rounded disabled:opacity-50">Prev</button>
            <span className="px-3 py-1">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-slate-200 text-slate-700 rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">{isEditing ? "Edit Transaction" : "Add Transaction"}</h3>
            <form onSubmit={submit}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ticker</label>
                    <input
                      list="tickers"
                      value={form.ticker}
                      onChange={(e) => {
                        const selectedTicker = e.target.value.toUpperCase();
                        const selected = tickers.find(t => t.Tickers === selectedTicker);
                        setForm({...form, ticker: selectedTicker, company: selected ? selected['Company Name'] : '', assetType: selected ? selected['Asset Type'] : '', sector: selected ? selected['Sector'] : ''});
                      }}
                      placeholder="Search and select ticker..."
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                {form.ticker && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Ticker Information</h4>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div><strong>Company:</strong> {form.company || 'N/A'}</div>
                      <div><strong>Asset Type:</strong> {form.assetType || 'N/A'}</div>
                      <div><strong>Sector:</strong> {form.sector || 'N/A'}</div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input required type="number" placeholder="e.g., 100" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
                    <input required type="number" step="0.01" placeholder="e.g., 150.50" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Broker</label>
                  <input list="brokers" placeholder="e.g., Zerodha" value={form.broker} onChange={e=>setForm({...form,broker:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" required>
                    <option value="">Select Type</option>
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium">{isEditing ? "Update" : "Add"}</button>
                <button type="button" onClick={handleCancel} className="flex-1 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 font-medium">Cancel</button>
              </div>
            </form>
            <datalist id="brokers">
              {uniqueBrokers.map(broker => <option key={broker} value={broker} />)}
            </datalist>
            <datalist id="tickers">
              {tickers.map(t => <option key={t.Tickers} value={t.Tickers}>{t.Tickers} - {t['Company Name']}</option>)}
            </datalist>
          </div>
        </div>
      )}
    </div>
  );
}
