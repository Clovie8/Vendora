import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, formatDateCell } from '../utils/formatters';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function Expenses() {
  useDocumentTitle('Expenses');
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [userRole, setUserRole] = useState(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const url = `fetch_expenses?search=${encodeURIComponent(search)}&start=${startDate}&end=${endDate}&page=${page}`;
      const res = await apiFetch(url);
      
      setExpenses(res.data || []);
      if (res.total_amount !== undefined) setTotalAmount(parseFloat(res.total_amount || 0));
      if (res.total && res.limit) setTotalPages(Math.ceil(res.total / res.limit));
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load expenses' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { 
    const delay = setTimeout(() => { fetchExpenses(); }, 400);
    return () => clearTimeout(delay);
  }, [page, search, startDate, endDate]);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await apiFetch('get_profile');
        if (res.status === 'success') setUserRole(res.data.role); 
      } catch (err) { console.error("Failed to fetch role"); }
    };
    fetchRole();
  }, []);

  const handleFilter = (e) => { e?.preventDefault(); setPage(1); fetchExpenses(); };
  const clearFilters = () => { setSearch(''); setStartDate(''); setEndDate(''); setPage(1); setTimeout(fetchExpenses, 0); };

  const handleOpenRecord = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Expense?', text: "This cannot be undone.", icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes, delete', cancelButtonText: 'Cancel', reverseButtons: true,
      customClass: { popup: 'rounded-2xl shadow-xl', confirmButton: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg ml-2', cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg' },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      const formData = new FormData(); formData.append('id', id);
      try {
        const res = await apiFetch('delete_expense', { method: 'POST', body: formData });
        if (res.status === 'success') { Toast.fire({ icon: 'success', title: 'Expense deleted' }); fetchExpenses(); } 
        else { Swal.fire('Error', res.message || 'Could not delete', 'error'); }
      } catch (err) { Swal.fire('Error', 'Request Failed', 'error'); }
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(formRef.current);
    const endpoint = editingExpense ? 'update_expense' : 'add_expense';

    try {
      const res = await apiFetch(endpoint, { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: editingExpense ? 'Expense Updated!' : 'Expense Recorded!' });
        setIsModalOpen(false);
        fetchExpenses();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Request Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      
      {/* HEADER & NEW EXPENSE BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800">Operational Expenses</h2>
        <button onClick={handleOpenRecord} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all text-sm w-full sm:w-auto justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Record Expense
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <form onSubmit={handleFilter} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input type="text" placeholder="Search expenses, authorized names..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div className="grid grid-cols-[auto_1fr] lg:flex lg:items-center gap-3 w-full lg:w-auto items-center">
            <span className="text-sm font-semibold text-slate-500">From</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full lg:w-auto py-2 px-3 border border-slate-200 rounded-lg outline-none text-sm text-slate-700 focus:border-blue-500" />
            <span className="text-sm font-semibold text-slate-500">To</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full lg:w-auto py-2 px-3 border border-slate-200 rounded-lg outline-none text-sm text-slate-700 focus:border-blue-500" />
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <button type="submit" className="flex-1 lg:flex-none justify-center bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">Filter</button>
            <button type="button" onClick={clearFilters} className="flex-1 lg:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Clear</button>
          </div>
        </form>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 font-semibold">Date & Time</th>
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Expense Title</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Qty</th>
                <th className="px-5 py-4 font-semibold">Amount</th>
                <th className="px-5 py-4 font-semibold">Method</th>
                <th className="px-5 py-4 font-semibold">Authorized By</th>
                <th className="px-5 py-4 font-semibold text-center">Status</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="10" className="px-6 py-10 text-center"><div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan="10" className="px-6 py-10 text-center text-slate-400">No expenses recorded yet.</td></tr>
              ) : (
                expenses.map((e) => {
                  const { date, time } = formatDateCell(e.date);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-[12px] text-slate-800">{date}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{time}</div>
                      </td>
                      <td className="px-5 py-3 text-[12px] font-bold text-blue-600">{e.user_name || 'System'}</td>
                      <td className="px-5 py-3 font-bold text-slate-800 text-[13px]">{e.title}</td>
                      <td className="px-5 py-3">
                        <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-black text-slate-700 text-xs">{e.qty}</td>
                      <td className="px-5 py-3 font-bold text-red-500 text-[13px]">{formatRwf(e.amount)}</td>
                      <td className="px-5 py-3 font-bold text-slate-700 text-[11px]">{e.payment_method}</td>
                      <td className="px-5 py-3">
                        <div className="font-bold text-slate-800 text-[11px]">{e.auth_name || '-'}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{e.auth_phone ? `${e.auth_phone} | ` : ''}{e.auth_place || '-'}</div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${
                          e.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          e.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          e.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                          {e.status || 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => e.status !== 'Approved' && handleEdit(e)} 
                            className={`p-1.5 border rounded-md transition-colors ${
                              e.status === 'Approved' 
                                ? 'text-slate-200 border-slate-100 cursor-not-allowed' 
                                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border-slate-200'
                            }`} 
                            title={e.status === 'Approved' ? "Cannot edit approved expense" : "Edit Expense"}
                            disabled={e.status === 'Approved'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          {userRole === 'Admin' && (
                            <button onClick={() => handleDelete(e.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md transition-colors" title="Delete Expense">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* TOTALS FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-end">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Expenses</div>
            <div className="text-2xl font-bold text-red-500">{formatRwf(totalAmount)}</div>
          </div>
        </div>

        {/* PAGINATION */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">Previous</button>
          <span className="text-sm text-slate-500 font-medium">Page {page} of {totalPages || 1}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">Next</button>
        </div>
      </div>

      {/* RECORD / EDIT EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-auto overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                {editingExpense ? 'Edit Expense' : 'Record Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form ref={formRef} onSubmit={handleExpenseSubmit} className="p-6">
              {editingExpense && <input type="hidden" name="id" value={editingExpense.id} />}
              
              <div className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Expense Title *</label>
                    <input type="text" name="title" defaultValue={editingExpense?.title || ''} required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none font-bold text-sm text-slate-800" placeholder="e.g. Shop Rent" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category *</label>
                    <select name="category" defaultValue={editingExpense?.category || 'Other'} required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none font-bold text-sm text-slate-800 appearance-none">
                      <option value="Rent">Rent</option>
                      <option value="Utilities">Utilities (Electricity/Water)</option>
                      <option value="Salary">Salary</option>
                      <option value="Transport">Transport</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Amount (Rwf) *</label>
                    <input type="number" name="amount" min="0" step="0.01" defaultValue={editingExpense?.amount || ''} required className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none font-black text-sm text-slate-800" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                    <input type="number" name="qty" min="1" defaultValue={editingExpense?.qty || 1} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none font-bold text-sm text-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Payment Method</label>
                    <select name="payment_method" defaultValue={editingExpense?.payment_method || 'Cash'} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none font-bold text-sm text-slate-800 appearance-none">
                      <option value="Cash">Cash</option>
                      <option value="MoMo">Mobile Money (MoMo)</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date *</label>
                    <input type="date" name="date" required defaultValue={editingExpense ? editingExpense.date.split(' ')[0] : new Date().toISOString().split('T')[0]} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none font-bold text-sm text-slate-800" />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Authorization Details (Optional)</h4>
                  <div className="space-y-3">
                    <input type="text" name="auth_name" defaultValue={editingExpense?.auth_name || ''} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 outline-none text-xs font-bold text-slate-800" placeholder="Authorized Name" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" name="auth_phone" defaultValue={editingExpense?.auth_phone || ''} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 outline-none text-xs font-bold text-slate-800" placeholder="Phone" />
                      <input type="text" name="auth_place" defaultValue={editingExpense?.auth_place || ''} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-800 outline-none text-xs font-bold text-slate-800" placeholder="Place" />
                    </div>
                  </div>
                </div>
                
                {editingExpense && userRole === 'Admin' &&(
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                    <select name="status" defaultValue={editingExpense.status} className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm text-slate-800">
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                )}

              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-colors flex items-center justify-center">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editingExpense ? 'Update Expense' : 'Save Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}