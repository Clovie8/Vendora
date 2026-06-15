import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, formatDateCell, getImageUrl } from '../utils/formatters';
import PosRestockModal from '../components/PosRestockModal';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 2500,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function Purchases() {
  useDocumentTitle('Purchases');
  const [purchases, setPurchases] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [businessSettings, setBusinessSettings] = useState(null);

  const [userRole, setUserRole] = useState(null);

  
  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW: Invoice Products Modal States (For the Eye Icon) ---
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [invoiceProducts, setInvoiceProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    apiFetch('get_company').then(res => { if (res.status === 'success') setBusinessSettings(res.data); });
  }, []);

  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => { 
    const delay = setTimeout(() => { fetchPurchases(); }, 400);
    return () => clearTimeout(delay);
  }, [page, search, startDate, endDate]);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await apiFetch('get_profile');
        if (res.status === 'success') {
          setUserRole(res.data.role); 
        }
      } catch (err) {
        console.error("Failed to fetch role");
      }
    };
    
    fetchRole();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const url = `transaction_history?type=purchase&search=${encodeURIComponent(search)}&start_date=${startDate}&end_date=${endDate}&page=${page}`;
      const res = await apiFetch(url);
      setPurchases(res.data || []);
      if (res.sums) setTotalAmount(parseFloat(res.sums.total_amount || 0));
      if (res.total && res.limit) setTotalPages(Math.ceil(res.total / res.limit));
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load purchase history' }); }
    finally { setLoading(false); }
  };

  const handleFilter = (e) => { e?.preventDefault(); setPage(1); fetchPurchases(); };
  const clearFilters = () => { setSearch(''); setStartDate(''); setEndDate(''); setPage(1); setTimeout(fetchPurchases, 0); };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Purchase?', text: "This will remove the items from your stock.", icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes, delete', cancelButtonText: 'Cancel', reverseButtons: true,
      customClass: { popup: 'rounded-2xl shadow-xl', confirmButton: 'bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl ml-2 font-bold', cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-2.5 rounded-xl font-bold' },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      const formData = new FormData(); formData.append('id', id);
      try {
        const res = await apiFetch('delete_transaction', { method: 'POST', body: formData });
        if (res.status === 'success') { Toast.fire({ icon: 'success', title: 'Purchase deleted' }); fetchPurchases(); }
        else Swal.fire('Error', res.message || 'Could not delete', 'error');
      } catch (err) { Swal.fire('Error', 'Request Failed', 'error'); }
    }
  };

  const openEditModal = (transaction) => { 
    if (!transaction.receipt_number) {
      Toast.fire({ 
        icon: 'error', 
        title: 'Action Denied: Invoice number not found for this older transaction.' 
      });
      return; 
    }
    setEditTransaction(transaction); 
    setIsEditModalOpen(true); 
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('id', editTransaction.id);
    
    formData.append('client_name', editTransaction.client_name || '');
    formData.append('client_phone', editTransaction.client_phone || '');
    formData.append('payment_method_used', editTransaction.payment_method_used || '');
    formData.append('deadline_date', editTransaction.deadline_date || '');
    formData.append('ebm_number', editTransaction.ebm_number || '');

    try {
      const res = await apiFetch('update_transaction', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: res.message });
        setIsEditModalOpen(false);
        fetchPurchases(); 
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (error) {
      console.error("Error updating:", error);
      Swal.fire('Error', 'Failed to update transaction', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW FEATURE: Open Products Modal (Eye Icon) ---
  const openProductsModal = async (invoice) => {
    setEditTransaction(invoice);
    setIsProductsModalOpen(true);
    setProductsLoading(true);
    
    try {
      // CHANGED: Now uses invoice_id=${invoice.id}
      const res = await apiFetch(`get_invoice_products&invoice_id=${invoice.id}`);
      if (res.status === 'success') {
        setInvoiceProducts(res.data || []);
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Failed to load products' });
    } finally {
      setProductsLoading(false);
    }
  };

  // --- REFINED PRINT HELPER (NOW ASYNC) ---
  const fetchReceiptItems = async (invoiceId) => {
    try {
      const res = await apiFetch(`get_invoice_products&invoice_id=${invoiceId}`);
      return res.status === 'success' ? res.data : [];
    } catch (e) {
      return [];
    }
  };

  const handleReprint = async (invoice) => {
    if (!invoice.id) {
      return Swal.fire('Error', 'No voucher ID found for this older transaction.', 'error');
    }

    const receiptItems = await fetchReceiptItems(invoice.id);
    if (!receiptItems || receiptItems.length === 0) return;

    const total = parseFloat(invoice.total_amount || 0);
    const supplierName = invoice.client_name || '';
    const supplierPhone = invoice.client_phone || '';
    const date = new Date(invoice.date || invoice.created_at).toLocaleString();
    const paymentStatus = invoice.payment_status;

    let itemsHtml = '';
    receiptItems.forEach(item => {
      itemsHtml += `<tr><td style="padding: 5px 0; font-size: 13px;">${item.product_name}<br><small style="color:#666">${item.quantity} x Rwf ${Number(item.price_at_time).toLocaleString()}</small></td><td style="text-align: right; padding: 5px 0; font-size: 13px; font-weight: bold;">Rwf ${(item.price_at_time * item.quantity).toLocaleString()}</td></tr>`;
    });

    const logoImg = businessSettings?.logo ? `<img src="http://localhost/stock-manager/backend/public/${businessSettings.logo}" style="max-height: 50px; margin-bottom: 5px;" />` : '';

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <html><head><title>Receiving Voucher Archive</title><style>@page { margin: 0; } body { font-family: 'Courier New', Courier, monospace; width: 76mm; padding: 10px; margin: 0; color: #000; background: #fff; } .text-center { text-align: center; } .bold { font-weight: bold; } .header { font-size: 16px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; } .info { font-size: 11px; margin-bottom: 15px; line-height: 1.4; color: #333; } .divider { border-top: 1px dashed #000; margin: 10px 0; } table { width: 100%; border-collapse: collapse; } .totals td { padding: 4px 0; font-size: 13px; } .footer { font-size: 11px; margin-top: 20px; line-height: 1.4; }</style></head><body>
          <div class="text-center">${logoImg}<div class="header">RECEIVING VOUCHER</div><div class="info">${businessSettings?.name || "STOCKMGR"}<br>Voucher No: ${invoice.receipt_number}<br>Date: ${date}</div></div>
          ${supplierName ? `<div style="font-size: 12px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Supplier: <b>${supplierName}</b> ${supplierPhone ? `<br>Tel: ${supplierPhone}` : ''}</div>` : ''}
          <div class="divider"></div><table><tbody>${itemsHtml}</tbody></table><div class="divider"></div>
          <table class="totals">
            <tr><td class="bold">TOTAL COST:</td><td style="text-align: right;" class="bold">Rwf ${total.toLocaleString()}</td></tr>
            <tr><td>STATUS:</td><td style="text-align: right; font-weight: bold;">${paymentStatus === 'credit' ? 'CREDIT / UNPAID' : 'PAID IN FULL'}</td></tr>
          </table><div class="divider"></div><div class="text-center footer">*** DUPLICATE COPY ***<br>Powered by Vendora SaaS</div>
          <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
        </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* HEADER & NEW PURCHASE BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800">Purchase History</h2>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all text-sm w-full sm:w-auto justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Record Bulk Restock
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <form onSubmit={handleFilter} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input type="text" placeholder="Search Invoice, EBM, product, SKU, or Supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[850px]">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Date & Invoice</th>
                <th className="px-3 py-2.5">Products (Summary)</th>
                <th className="px-3 py-2.5">Supplier</th>
                <th className="px-3 py-2.5">Cashier</th>
                <th className="px-3 py-2.5">Total Cost</th>
                <th className="px-3 py-2.5">Amount Paid</th>
                <th className="px-3 py-2.5">Balance Due</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="10" className="px-6 py-10 text-center"><div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></td></tr>
              : purchases.length === 0 ? <tr><td colSpan="10" className="px-6 py-10 text-center text-slate-400 text-sm">No purchase records found.</td></tr>
              : purchases.map((r) => {
                  const { date, time } = formatDateCell(r.date || r.created_at);
                  
                  const total = r.total_amount !== undefined ? parseFloat(r.total_amount) : (r.quantity * r.price_at_time);

                  return (
                    <tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100">
                      <td className="px-3 py-2 text-slate-500">
                        <div className="font-bold text-slate-700 text-[11px] leading-tight">{date}</div>
                        <div className="text-[10px]">{time}</div>
                        <div className="text-[9px] font-bold text-slate-400 mt-1">{r.receipt_number || `#${r.id}`}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-800 text-[11px] truncate max-w-[160px]">{r.product_name || 'Multiple Items'}</div>
                        <div className="text-[9px] font-bold text-slate-400 mt-1">{r.ebm_number || ``}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold text-slate-700 text-[11px] truncate max-w-[100px]">{r.client_name || 'Unknown'}</div>
                        <div className="text-[10px] text-slate-400">{r.client_phone || '-'}</div>
                      </td>
                      <td className="px-3 py-2 font-bold text-blue-600 text-[11px] truncate max-w-[80px]">{r.user_name || 'System'}</td>
                      
                      {/* New Invoice-Level Financials */}
                      <td className="px-3 py-2 font-black text-red-600 text-xs">-{formatRwf(total)}</td>
                      <td className="px-3 py-2 font-black text-emerald-600 text-[11px]">{formatRwf(r.amount_paid || 0)}</td>
                      <td className="px-3 py-2 font-black text-red-500 text-[11px]">{formatRwf(r.balance_due || 0)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${r.payment_status === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {r.payment_status || 'Paid'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* --- NEW: EYE ICON FOR PRODUCTS --- */}
                          <button onClick={() => openProductsModal(r)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md border border-transparent hover:border-blue-200 transition-colors" title="View Items">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          </button>

                          <button 
                            onClick={() => handleReprint(r)}
                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md border border-transparent hover:border-blue-200 transition-colors ml-1"
                            title="Print Voucher"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                          </button>
                          
                          <button onClick={() => openEditModal(r)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors" title="Edit Details">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          
                          {userRole === 'Admin' && (
                            <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Delete Purchase">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-end">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Money Spent</div>
            <div className="text-lg font-black text-red-600">-{formatRwf(totalAmount)}</div>
          </div>
        </div>

        <div className="bg-white px-4 py-3 border-t border-slate-200 flex justify-between items-center">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">Prev</button>
          <span className="text-xs text-slate-500 font-bold">Page {page} of {totalPages || 1}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">Next</button>
        </div>
      </div>

      <PosRestockModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => { setIsModalOpen(false); fetchPurchases(); }} 
        businessSettings={businessSettings} 
      />

      {/* EDIT DETAILS MODAL (IMMUTABLE LEDGER) */}
      {isEditModalOpen && editTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-auto max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-blue-600 px-5 py-3 flex justify-between items-center text-white shrink-0">
              <h3 className="text-sm font-bold flex items-center gap-2">Update Invoice Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-5 overflow-y-auto">
              <div className="space-y-4">
                
                {/* READ ONLY SECTION */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-2">
                  <div className="flex justify-between items-start">
                    <p className="text-xs text-slate-500 font-bold uppercase">Invoice #{editTransaction.receipt_number || editTransaction.id}</p>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Locked</span>
                  </div>
                  <p className="font-bold text-slate-800 text-sm mt-1">{editTransaction.product_name || 'Multiple Items'}</p>
                  <p className="text-xs font-bold text-blue-600 mt-1">Total: {formatRwf(editTransaction.total_amount)}</p>
                  <p className="text-[10px] text-red-500 mt-2 leading-tight">
                    * Line items and totals are locked for inventory integrity. To modify products, delete and recreate this invoice.
                  </p>
                </div>

                {/* EDITABLE FIELDS */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Client/Supplier Name</label>
                    <input type="text" value={editTransaction.client_name || ''} onChange={(e) => setEditTransaction({...editTransaction, client_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                    <input type="text" value={editTransaction.client_phone || ''} onChange={(e) => setEditTransaction({...editTransaction, client_phone: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium text-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">EBM Number</label>
                    <input type="text" value={editTransaction.ebm_number || ''} onChange={(e) => setEditTransaction({...editTransaction, ebm_number: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium text-slate-800" />
                  </div>
                   <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                    <select value={editTransaction.payment_method_used || ''} onChange={(e) => setEditTransaction({...editTransaction, payment_method_used: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none text-sm font-medium text-slate-800">
                       <option value="">Select...</option>
                       <option value="Cash">Cash</option>
                       <option value="MoMo">Mobile Money (MoMo)</option>
                       <option value="Card">Bank Card</option>
                       <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {(editTransaction.payment_status === 'credit' || editTransaction.payment_status === 'partial') && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Payment Deadline Date</label>
                    <input 
                      type="date" 
                      value={editTransaction.deadline_date || ''} 
                      onChange={(e) => setEditTransaction({...editTransaction, deadline_date: e.target.value})} 
                      className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm font-medium text-slate-800" 
                    />
                  </div>
                )}

              </div>

              <div className="mt-6 flex gap-3 shrink-0">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors flex items-center justify-center">
                  {isSubmitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW MODAL 3: VIEW INVOICE PRODUCTS --- */}
      {isProductsModalOpen && editTransaction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800">Invoice Items</h3>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Invoice #{editTransaction.receipt_number || editTransaction.id}</p>
              </div>
              <button onClick={() => setIsProductsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {productsLoading ? (
                <div className="py-12 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></div>
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