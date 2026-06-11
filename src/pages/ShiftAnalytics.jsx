import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../config/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function ShiftAnalytics() {
  useDocumentTitle('Shift Analytics');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive States
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest) or 'asc' (oldest)

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const res = await apiFetch('get_shifts');
      if (res.status === 'success') {
        setShifts(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GB', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    });
  };

  // ============================================================================
  // DYNAMIC DATA ENGINE
  // ============================================================================
  const { filteredShifts, summary } = useMemo(() => {
    let processed = shifts.filter(shift => {
      const term = searchTerm.toLowerCase();
      const matchName = shift.cashier_name?.toLowerCase().includes(term);
      const matchStatus = shift.status?.toLowerCase().includes(term);
      return matchName || matchStatus;
    });

    processed.sort((a, b) => {
      const dateA = new Date(a.start_time).getTime();
      const dateB = new Date(b.start_time).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    let totalExpected = 0;
    let totalActual = 0;

    processed.forEach(s => {
      if (s.status === 'closed') {
        totalExpected += Number(s.expected_cash || 0);
        totalActual += Number(s.actual_cash || 0);
      }
    });

    let netShortage = totalExpected - totalActual;
    if (netShortage < 0) netShortage = 0;

    return {
      filteredShifts: processed,
      summary: {
        expected: totalExpected,
        actual: totalActual,
        shortage: netShortage
      }
    };
  }, [shifts, searchTerm, sortOrder]);

  if (loading) return <div className="flex justify-center items-center h-[70vh]"><div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600"></div></div>;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-5">
        <div>
          <h1 className="text-2xl sm:text-2xl font-black text-slate-800 tracking-tight">Shift Analytics</h1>
          <p className="text-slate-500 mt-1 text-[13px] font-semibold">Track cashier performance and drawer cash accuracy.</p>
        </div>
        
        {/* INTERACTIVE FILTERS */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Search cashiers or status..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-[13px] font-bold text-slate-700 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] transition-all placeholder-slate-400"
            />
          </div>
          <div className="relative w-full sm:w-auto">
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full sm:w-auto bg-white border border-slate-200/80 text-slate-700 text-[13px] rounded-xl pl-4 pr-10 py-2.5 font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.02)] appearance-none cursor-pointer transition-all"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
            <svg className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      {/* BENTO GRID: KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 relative overflow-hidden hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col justify-center">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1.5">Total Expected Cash</span>
          <span className="text-xl font-black text-slate-800 tracking-tight">Rwf {summary.expected.toLocaleString()}</span>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200/70 p-4 relative overflow-hidden hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col justify-center">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mb-1.5">Total Actual Cash</span>
          <span className="text-xl font-black text-blue-600 tracking-tight">Rwf {summary.actual.toLocaleString()}</span>
        </div>
        
        <div className="bg-white rounded-2xl border border-rose-200/70 p-4 relative overflow-hidden hover:shadow-[0_4px_15px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col justify-center">
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
          <span className="text-rose-500/80 font-bold uppercase text-[10px] tracking-wider mb-1.5">Net Drawer Shortages</span>
          <span className="text-xl font-black text-rose-600 tracking-tight">Rwf {summary.shortage.toLocaleString()}</span>
        </div>
      </div>

      {/* SHIFTS TABLE CARD */}
      <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-200/60 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 p-2">
          <table className="w-full text-left whitespace-nowrap border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100/80 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-5 py-3.5 rounded-tl-xl">Cashier</th>
                <th className="px-5 py-3.5">Time Window</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Starting Cash</th>
                <th className="px-5 py-3.5 text-right">Expected</th>
                <th className="px-5 py-3.5 text-right">Actual Cash</th>
                <th className="px-5 py-3.5 text-right rounded-tr-xl">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
              {filteredShifts.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400 text-sm font-medium">No shifts match your search criteria.</td></tr>
              ) : (
                filteredShifts.map(shift => {
                  const variance = shift.status === 'closed' ? (Number(shift.actual_cash) - Number(shift.expected_cash)) : 0;
                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-5 py-4 font-black text-[13px] text-slate-800">{shift.cashier_name}</td>
                      <td className="px-5 py-4">
                        <div className="text-[12px] font-bold text-slate-700">{formatDate(shift.start_time)}</div>
                        <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{shift.end_time ? `To: ${formatDate(shift.end_time)}` : 'In Progress...'}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          shift.status === 'open' 
                            ? 'bg-amber-50 text-amber-600 border-amber-100' 
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {shift.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-[13px] text-slate-500">
                        {Number(shift.starting_cash).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-[13px] text-slate-500">
                        {Number(shift.expected_cash || 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-[14px] text-slate-800">
                        {shift.status === 'closed' ? `${Number(shift.actual_cash).toLocaleString()}` : '-'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {shift.status === 'open' ? <span className="text-slate-300 font-bold">-</span> : (
                          <span className={`px-2.5 py-1 rounded-md text-[12px] font-black border ${
                            variance < 0 
                              ? 'bg-rose-50 text-rose-600 border-rose-100' 
                              : variance > 0 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : 'bg-slate-50 text-slate-400 border-transparent'
                          }`}>
                            {variance > 0 ? '+' : ''}{variance.toLocaleString()}
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