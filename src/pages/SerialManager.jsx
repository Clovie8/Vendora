import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import { formatDateCell } from '../utils/formatters';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function SerialManager() {
  useDocumentTitle('Serial Lifecycle Tracking');
  const [serials, setSerials] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '' = All, 'In Stock', 'Sold'
  const [loading, setLoading] = useState(true);

  const fetchSerials = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`get_serials&search=${search}&status=${filterStatus}`);
      if (res.status === 'success') {
        setSerials(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load serials");
    } finally {
      setLoading(false);
    }
  };

  // Smart debounce for the search bar
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSerials();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, filterStatus]);

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Serial Lifecycle Tracking</h2>
        <p className="text-slate-500 text-sm mt-1">Track warranties, check stock status, and view the full history of serialized items.</p>
      </div>

      {/* FILTER HEADER */}
      <div className="bg-white p-4 rounded-t-2xl border-x border-t border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="relative w-full sm:w-96">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            type="text" 
            placeholder="Scan Barcode, IMEI, or search Customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 shadow-sm" 
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setFilterStatus('')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterStatus === '' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>All</button>
          <button onClick={() => setFilterStatus('In Stock')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterStatus === 'In Stock' ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>In Stock</button>
          <button onClick={() => setFilterStatus('Sold')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterStatus === 'Sold' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sold</button>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-b-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-4">Serial / IMEI</th>
                <th className="px-5 py-4">Product Name</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Date Added (Purchased)</th>
                <th className="px-5 py-4 border-l border-slate-100">Sale Info (Warranty)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center"><div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></td></tr>
              ) : serials.length === 0 ? (
                <tr><td colSpan="5" className="h-48 text-center text-slate-400 font-bold text-sm">No serial numbers found.</td></tr>
              ) : (
                serials.map((s) => {
                  const added = s.date_added ? formatDateCell(s.date_added) : null;
                  const sold = s.date_sold ? formatDateCell(s.date_sold) : null;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-mono font-black text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200">{s.serial_number}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-700">{s.product_name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">SKU: {s.sku}</div>
                      </td>
                      <td className="px-5 py-4">
                        {s.status === 'In Stock' 
                          ? <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">In Stock</span>
                          : <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">Sold</span>
                        }
                      </td>
                      <td className="px-5 py-4">
                        {added ? (
                          <>
                            <div className="text-sm font-bold text-slate-600">{added.date}</div>
                            <div className="text-[10px] text-slate-400">PO: {s.purchase_receipt || `#${s.purchase_transaction_id}`}</div>
                          </>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-5 py-4 border-l border-slate-100">
                        {s.status === 'Sold' ? (
                          <>
                            <div className="text-sm font-bold text-slate-800">{s.client_name || 'Walk-in Customer'}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Sold on: {sold?.date} • INV: {s.sale_receipt || `#${s.sale_transaction_id}`}</div>
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 italic flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
                            Waiting on shelf
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}