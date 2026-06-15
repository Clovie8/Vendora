import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, getImageUrl } from '../utils/formatters';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });

export default function Batches() {
  useDocumentTitle('Batch Management');
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');

  // --- NEW STATES FOR HISTORY PANEL ---
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [activeBatch, setActiveBatch] = useState(null);
  const [batchHistory, setBatchHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredBatches = batches.filter(b => {
    const query = searchQuery.toLowerCase();
    return (
      (b.product_name && b.product_name.toLowerCase().includes(query)) ||
      (b.sku && b.sku.toLowerCase().includes(query)) ||
      (b.id && b.id.toString().includes(query))
    );
  });


  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`batches&status=${statusFilter}`);
      if (res.status === 'success') setBatches(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  // --- NEW FUNCTION TO FETCH HISTORY ---
  const handleViewHistory = async (batch) => {
    setActiveBatch(batch);
    setHistoryPanelOpen(true);
    setLoadingHistory(true);
    try {
      const res = await apiFetch(`get_batch_history&batch_id=${batch.id}`);
      if (res.status === 'success') {
        setBatchHistory(res.data);
      } else {
        Toast.fire({ icon: 'error', title: res.message });
      }
    } catch (e) {
      console.error(e);
      Toast.fire({ icon: 'error', title: 'Failed to load history' });
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-10 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">FIFO Batch Management</h2>
          <p className="text-sm text-slate-500 mt-1">Monitor and audit the physical batches tying up your capital.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
          <div className="flex gap-2 bg-slate-200/50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
            <button 
              onClick={() => setStatusFilter('active')} 
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all whitespace-nowrap ${statusFilter === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active Shelf Stock
            </button>
            <button 
              onClick={() => setStatusFilter('depleted')} 
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all whitespace-nowrap ${statusFilter === 'depleted' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sold Out (Depleted)
            </button>
            <button 
              onClick={() => setStatusFilter('all')} 
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all whitespace-nowrap ${statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              All Batches History
            </button>
          </div>

          {/* NEW: LIVE SEARCH BAR */}
          <div className="relative w-full sm:w-72">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Search product, SKU, or Batch ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-white text-slate-400 text-[11px] uppercase tracking-wider border-b-2 border-slate-100">
              <tr>
                <th className="px-5 py-3 font-bold">#</th>
                <th className="px-5 py-3 font-bold">Product</th>
                <th className="px-5 py-3 font-bold text-center">Status</th>
                <th className="px-5 py-3 font-bold text-center">Initial Qty</th>
                <th className="px-5 py-3 font-bold text-center text-blue-600">Remaining</th>
                <th className="px-5 py-3 font-bold text-right">Unit Buy Price</th>
                <th className="px-5 py-3 font-bold text-right">Capital Value</th>
                <th className="px-5 py-3 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-10 text-slate-400">Loading batches...</td></tr>
              ) : filteredBatches.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-10 text-slate-400">No batches matched your search.</td></tr>
              ) : (
                filteredBatches.map((b, index) => {
                  const isDepleted = b.quantity_remaining == 0;
                  const capValue = b.quantity_remaining * b.buy_price;
                  return (
                    <tr key={b.id} className={`hover:bg-slate-50 transition-colors ${isDepleted ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="px-5 py-3 text-center text-sm font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {/* <img src={getImageUrl(b.image)} alt="Img" className="w-8 h-8 rounded object-cover border border-slate-200" /> */}
                          <div>
                            <div className="text-sm font-bold text-slate-800">{b.product_name}</div>
                            <div className="text-[11px] text-slate-400">{b.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {isDepleted 
                          ? <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md uppercase">Depleted</span>
                          : <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold rounded-md uppercase">Active</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-slate-500">{b.quantity_initial}</td>
                      <td className={`px-5 py-3 text-center text-sm font-bold ${isDepleted ? 'text-slate-400' : 'text-blue-600'}`}>{b.quantity_remaining}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-600 font-medium">{formatRwf(b.buy_price)}</td>
                      <td className="px-5 py-3 text-right text-sm font-bold text-slate-800">{formatRwf(capValue)}</td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <button 
                            onClick={() => handleViewHistory(b)}
                            className="bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            View Ledger
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* NEW: BATCH HISTORY SLIDE-OVER PANEL */}
      {/* ========================================================= */}
      {historyPanelOpen && activeBatch && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
            
            {/* Panel Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Batch Ledger</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Batch #{activeBatch.id} • {activeBatch.product_name}
                </p>
              </div>
              <button 
                onClick={() => setHistoryPanelOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 p-2 rounded-full shadow-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {loadingHistory ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading ledger records...</div>
              ) : batchHistory.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <span className="text-slate-300 text-2xl">📋</span>
                  </div>
                  <p className="text-slate-500 font-medium text-sm">No sales history found.</p>
                  <p className="text-slate-400 text-xs mt-1">This batch has not been touched by any transactions yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {batchHistory.map((record, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors">
                      <div className="mt-1">
                        {record.type === 'sale' ? (
                          <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold text-lg">
                            -
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-lg">
                            +
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-bold text-slate-800">
                            {record.type === 'sale' ? 'Sale Deduction' : 'Transaction'}
                          </p>
                          <span className="text-sm font-black text-slate-800">
                            {record.quantity_deducted} units
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Client: <span className="font-medium text-slate-700">{record.client_name || 'Walk-in'}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-wider">
                          Trx #{record.transaction_id} • {new Date(record.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Panel Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
              End of Ledger History
            </div>
          </div>
        </div>
      )}
    </div>
  );
}