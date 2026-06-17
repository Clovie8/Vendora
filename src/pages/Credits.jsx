import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, formatDateCell } from '../utils/formatters';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function Credits() {
  useDocumentTitle('Credits');
  const [activeTab, setActiveTab] = useState('receivable'); 
  const [credits, setCredits] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // NEW: Search & Date Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Payment Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [amountPaying, setAmountPaying] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Individual History Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- NEW: Invoice Products Modal States (For the Eye Icon) ---
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [invoiceProducts, setInvoiceProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      if (activeTab === 'receivable' || activeTab === 'payable') {
        const type = activeTab === 'receivable' ? 'sale' : 'purchase';
        const res = await apiFetch(`transaction_history&type=${type}&limit=2000`);
        if (res.status === 'success') {
          const pendingDebts = (res.data || []).filter(t => t.payment_status === 'credit' || t.payment_status === 'partial');
          setCredits(pendingDebts);
          
          const totalRemaining = pendingDebts.reduce((sum, r) => {
            // FAIL-SAFE MATH: Uses invoice total if available, otherwise falls back to quantity * price
            const total = r.total_amount !== undefined ? parseFloat(r.total_amount) : (r.quantity * r.price_at_time);
            const paid = parseFloat(r.amount_paid || 0);
            return sum + (total - paid);
          }, 0);
          // setTotals(totalRemaining);
        }
      } else {
        const type = activeTab === 'receivable_history' ? 'sale' : 'purchase';
        const res = await apiFetch(`get_all_payment_history&type=${type}`);
        if (res.status === 'success') {
          setHistoryData(res.data || []);
          const totalPaid = (res.data || []).reduce((sum, item) => sum + parseFloat(item.amount_paid || 0), 0);
          // setTotals(totalPaid);
        }
      }
    } catch (err) {
      Swal.fire('Error', 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reset search and filter when changing tabs
  useEffect(() => { 
    setSearchTerm('');
    setFilterDate('');
    fetchCredits(); 
  }, [activeTab]);

  // REFINED: Made async to fetch the products for the payment modal!
  const openPayModal = async (debt) => {
    const total = debt.total_amount !== undefined ? parseFloat(debt.total_amount) : (debt.quantity * debt.price_at_time);
    const paid = parseFloat(debt.amount_paid || 0);
    const remaining = debt.balance_due !== undefined ? parseFloat(debt.balance_due) : (total - paid);
    
    setSelectedDebt({ ...debt, total, paid, remaining });
    setAmountPaying(remaining);
    setPaymentMethod('Cash');
    
    // Clear previous products and open modal immediately for a snappy UI
    setInvoiceProducts([]); 
    setIsPayModalOpen(true);
    setProductsLoading(true);

    try {
      const res = await apiFetch(`get_invoice_products&invoice_id=${debt.id}`);
      if (res.status === 'success') {
        setInvoiceProducts(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load items for payment modal");
    } finally {
      setProductsLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    // --- REFINED: Strict Number Parsing ---
    const payAmount = parseFloat(amountPaying);
    
    if (payAmount <= 0 || payAmount > selectedDebt.remaining) {
      return Toast.fire({ 
        icon: 'error', 
        title: `Invalid amount! Max is Rwf ${selectedDebt.remaining.toLocaleString()}` 
      });
    }
    // --------------------------------------

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('id', selectedDebt.id); // This is the Invoice ID
    formData.append('amount_paying', payAmount);
    formData.append('payment_method', paymentMethod);

    try {
      const res = await apiFetch('pay_debt', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Payment recorded successfully!' });
        setIsPayModalOpen(false);
        fetchCredits();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (err) { 
      Swal.fire('Error', 'Request failed', 'error'); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const openHistoryModal = async (debt) => {
    setSelectedDebt(debt);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    
    try {
      const res = await apiFetch(`get_payment_history&transaction_id=${debt.id}`);
      if (res.status === 'success') {
        setPaymentHistory(res.data || []);
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Failed to load history' });
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- NEW: Open Products Modal ---
  const openProductsModal = async (debt) => {
    setSelectedDebt(debt);
    setIsProductsModalOpen(true);
    setProductsLoading(true);
    
    try {
      const res = await apiFetch(`get_invoice_products&invoice_id=${debt.id}`);
      if (res.status === 'success') {
        setInvoiceProducts(res.data || []);
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Failed to load products' });
    } finally {
      setProductsLoading(false);
    }
  };

  const isReceivable = activeTab.includes('receivable');
  const isHistoryTab = activeTab.includes('history');

  // NEW: Search & Date Filtering Logic (Bug Fixed)
  const processedCredits = credits
    .filter(r => {
      const matchesSearch = (r.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (r.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (r.receipt_number || r.id?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (r.contact_code || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = filterDate ? (r.date && r.date.startsWith(filterDate)) : true;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const processedHistory = historyData
    .filter(h => {
      const matchesSearch = (h.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (h.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (h.receipt_number || h.transaction_id?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = filterDate ? (h.payment_date && h.payment_date.startsWith(filterDate)) : true;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  // ✅ PASTED HERE: Now it knows what processedHistory and processedCredits are!
  const dynamicTotal = isHistoryTab
    ? processedHistory.reduce((sum, h) => sum + parseFloat(h.amount_paid || 0), 0)
    : processedCredits.reduce((sum, r) => {
        // FAIL-SAFE MATH
        const total = r.total_amount !== undefined ? parseFloat(r.total_amount) : (r.quantity * r.price_at_time);
        const paid = parseFloat(r.amount_paid || 0);
        return sum + (total - paid);
      }, 0);

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Credit Management</h2>
        <p className="text-slate-500 text-sm mt-1">Manage accounts receivable, payable, and track payment installments.</p>
      </div>

      {/* TABS CONFIGURATION */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 border-b border-slate-200">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('receivable')} 
            className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'receivable' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Customer Debts (Owed to Us)
          </button>
          <button 
            onClick={() => setActiveTab('receivable_history')} 
            className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'receivable_history' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            History
          </button>
        </div>

        <div className="hidden sm:block w-px h-6 bg-slate-200 my-auto"></div>

        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('payable')} 
            className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'payable' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Supplier Debts (We Owe)
          </button>
          <button 
            onClick={() => setActiveTab('payable_history')} 
            className={`pb-3 px-2 font-bold text-sm transition-colors border-b-2 ${activeTab === 'payable_history' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            History
          </button>
        </div>
      </div>

      {/* KPI Card */}
      <div className={`mb-6 p-5 rounded-2xl border flex justify-between items-center shadow-sm ${isReceivable ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isReceivable ? 'text-amber-700' : 'text-red-700'}`}>
            {isHistoryTab 
              ? (isReceivable ? 'Total Amount Collected' : 'Total Amount Paid Out')
              : 'Total Remaining Balance'
            }
          </p>
          <h3 className={`text-2xl font-black ${isReceivable ? 'text-amber-600' : 'text-red-600'}`}>
            Rwf {dynamicTotal.toLocaleString()}
          </h3>
        </div>
        <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-white shadow-sm ${isReceivable ? 'text-amber-500' : 'text-red-500'}`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
      </div>

      {/* DATA TABLES */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* UPDATED: SEARCH & DATE FILTER HEADER */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input 
              type="text" 
              placeholder="Search Customer, Product, or Invoice #..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 shadow-sm" 
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Filter Date:</span>
            <input 
              type="date"
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700 shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
              {isHistoryTab ? (
                <tr>
                  <th className="px-5 py-4">Payment Date</th>
                  <th className="px-5 py-4">{isReceivable ? 'Customer Name' : 'Supplier Name'}</th>
                  <th className="px-5 py-4">Items / Product / Invoice #</th>
                  <th className="px-5 py-4">Payment Method</th>
                  <th className="px-5 py-4">Cashier / Staff</th>
                  <th className="px-5 py-4 text-right">Amount Paid</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-5 py-4">Status & Deadline</th>
                  <th className="px-5 py-4">{isReceivable ? 'Customer Name' : 'Supplier Name'}</th>
                  <th className="px-5 py-4">Items / Product / Invoice #</th>
                  <th className="px-5 py-4">Total Amount</th>
                  <th className="px-5 py-4">Amount Paid</th>
                  <th className="px-5 py-4">Remaining</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center"><div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></td></tr>
              ) : isHistoryTab ? (
                /* HISTORY TABLE RENDERING */
                processedHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span className="font-bold text-sm">No historical payments found!</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                processedHistory.map((h, index) => {
                  const { date, time } = formatDateCell(h.payment_date);
                  return (
                    <tr key={`hist-${h.id || 'x'}-${index}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 text-sm text-slate-500"><div className="font-bold text-slate-700">{date}</div><div className="text-xs">{time}</div></td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800">{h.client_name || 'Unknown'}</div>
                          {h.contact_code && <div className="text-[10px] text-blue-600 font-bold mt-0.5">{h.contact_code}</div>}
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs"><span className="font-bold text-slate-700">{h.quantity ? `${h.quantity}x ` : ''}</span>{h.product_name || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium tracking-wide">{h.receipt_number || `#${h.transaction_id}`}</div>
                        </td>
                        <td className="px-5 py-4"><span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">{h.payment_method}</span></td>
                        <td className="px-5 py-4 text-sm font-medium text-slate-600">{h.user_name || 'System'}</td>
                        <td className="px-5 py-4 font-black text-right text-emerald-600">{formatRwf(h.amount_paid)}</td>
                      </tr>
                    )
                  })
                )
              ) : (
                /* PENDING DEBT TABLE RENDERING */
                processedCredits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="h-48 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <svg className="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span className="font-bold text-sm">No pending debts found!</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedCredits.map((r, index) => {
                    // FAIL-SAFE MATH AGAIN FOR RENDERING
                    const total = r.total_amount !== undefined ? parseFloat(r.total_amount) : (r.quantity * r.price_at_time);
                    const paid = parseFloat(r.amount_paid || 0);
                    const remaining = r.balance_due !== undefined ? parseFloat(r.balance_due) : (total - paid);
                    const isOverdue = r.deadline_date && new Date(r.deadline_date) < new Date();

                    return (
                      <tr key={`cred-${r.id || 'x'}-${index}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            {r.payment_status === 'partial' 
                              ? <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">Partial</span>
                              : <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Credit</span>
                            }
                            {r.deadline_date && (
                              <span className={`text-[10px] font-bold ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                                Due: {r.deadline_date}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800">{r.client_name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500 font-medium mt-0.5">
                            {r.contact_code && <span className="text-blue-600 text-[10px] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-bold mr-1.5">{r.contact_code}</span>}
                            {r.client_phone || '-'}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-xs"><span className="font-bold text-slate-700">{r.total_amount ? 'Multiple' : (r.quantity ? `${r.quantity}x` : '')}</span> {r.total_amount ? 'Items' : (r.product_name || 'N/A')}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium tracking-wide">{r.receipt_number || `#${r.id}`}</div>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-500">{formatRwf(total)}</td>
                        <td className="px-5 py-4 font-bold text-emerald-600">{formatRwf(paid)}</td>
                        <td className="px-5 py-4 font-black text-red-600">{formatRwf(remaining)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* --- NEW: EYE ICON FOR PRODUCTS --- */}
                            <button onClick={() => openProductsModal(r)} className="text-slate-400 hover:text-emerald-600 transition-colors p-2" title="View Products">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                            </button>
                            <button onClick={() => openHistoryModal(r)} className="text-slate-400 hover:text-blue-600 transition-colors p-2" title="View History">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </button>
                            <button 
                              onClick={() => openPayModal(r)}
                              className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm uppercase tracking-wider ml-1"
                            >
                              Pay
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: MAKE PAYMENT */}
      {isPayModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-slate-800">Record Payment</h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                <p className="text-xs text-blue-600 font-bold uppercase mb-1">Paying for Invoice #{selectedDebt.receipt_number || selectedDebt.id}</p>
                <p className="text-sm font-black text-slate-800">{selectedDebt.client_name}</p>

                {/* --- REFINED: DISPLAY INVOICE ITEMS --- */}
                <div className="mt-3 pt-3 border-t border-blue-200/60 max-h-32 overflow-y-auto custom-scrollbar">
                  {productsLoading ? (
                    <div className="text-xs text-blue-500 font-medium animate-pulse">Loading items...</div>
                  ) : invoiceProducts.length > 0 ? (
                    <ul className="space-y-1">
                      {invoiceProducts.map((p, idx) => (
                        <li key={idx} className="flex justify-between text-xs text-blue-900 font-medium">
                          <span>{p.quantity}x {p.product_name}</span>
                          <span>{formatRwf(p.quantity * p.price_at_time)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-400">No specific items found.</div>
                  )}
                </div>
                {/* -------------------------------------- */}
                
                <div className="mt-3 flex justify-between items-end">
                  <span className="text-xs font-medium text-slate-500">Remaining Balance:</span>
                  <span className="text-lg font-black text-red-600">Rwf {selectedDebt.remaining.toLocaleString()}</span>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Amount Paying Today (Rwf)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={selectedDebt.remaining}
                    step="0.01"
                    required
                    value={amountPaying}
                    onChange={(e) => setAmountPaying(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-800 transition-all text-lg" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Payment Method</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 transition-all text-sm"
                  >
                    <option value="Cash">Cash</option>
                    <option value="MoMo">Mobile Money (MoMo)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsPayModalOpen(false)} className="flex-1 px-4 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-sm">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 rounded-xl transition-all text-sm flex justify-center items-center">
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Confirm Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: AUDIT LEDGER HISTORY */}
      {isHistoryModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800">Payment Audit Ledger</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Invoice #{selectedDebt.receipt_number || selectedDebt.id} • {selectedDebt.client_name}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {historyLoading ? (
                <div className="py-12 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></div>
              ) : paymentHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium text-sm">No partial payments recorded yet.</div>
              ) : (
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-white text-slate-400 text-[9px] uppercase font-bold tracking-wider sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Cashier</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paymentHistory.map(h => {
                      const { date, time } = formatDateCell(h.payment_date);
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3 text-xs"><span className="font-bold text-slate-700">{date}</span> <span className="text-slate-400 ml-1">{time}</span></td>
                          <td className="px-6 py-3"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{h.payment_method}</span></td>
                          <td className="px-6 py-3 text-xs font-medium text-slate-600">{h.user_name || 'System'}</td>
                          <td className="px-6 py-3 text-right font-black text-emerald-600">{formatRwf(h.amount_paid)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- NEW MODAL 3: VIEW INVOICE PRODUCTS --- */}
      {isProductsModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800">Invoice Items</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Invoice #{selectedDebt.receipt_number || selectedDebt.id} • {selectedDebt.client_name}</p>
              </div>
              <button onClick={() => setIsProductsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {productsLoading ? (
                <div className="py-12 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full"></div></div>
              ) : invoiceProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium text-sm">No items found for this invoice.</div>
              ) : (
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-white text-slate-400 text-[10px] uppercase font-bold tracking-wider sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-3">Product Name</th>
                      <th className="px-6 py-3 text-right">Qty</th>
                      <th className="px-6 py-3 text-right">Unit Price</th>
                      <th className="px-6 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoiceProducts.map((p, idx) => {
                      const total = p.quantity * p.price_at_time;
                      return (
                        <tr key={p.id || idx} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3">
                            <div className="font-bold text-slate-800 text-xs">{p.product_name}</div>
                          </td>
                          <td className="px-6 py-3 text-right text-xs font-bold text-slate-700">{p.quantity}</td>
                          <td className="px-6 py-3 text-right text-xs text-slate-500">{formatRwf(p.price_at_time)}</td>
                          <td className="px-6 py-3 text-right font-black text-slate-800">{formatRwf(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}