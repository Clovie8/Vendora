import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, formatDateCell, getImageUrl } from '../utils/formatters';
import PosSaleModal from '../components/PosSaleModal';
import CreatableSelect from 'react-select/creatable';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 2500,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function Sales() {
  useDocumentTitle('Sales');
  const [sales, setSales] = useState([]);
  const [totals, setTotals] = useState({ amount: 0, profit: 0 });
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
  
  // Dropdown State
  const [printDropdownOpen, setPrintDropdownOpen] = useState(null);

  // --- NEW: Invoice Products Modal States (For the Eye Icon) ---
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [invoiceProducts, setInvoiceProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // --- NEW: CRM Customers State ---
  const [customers, setCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Fetch the customers list once when the component loads
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await apiFetch('get_contacts&type=Customer');
        if (res.status === 'success') {
          // Format the database data so react-select can read it safely
          const formatted = res.data.map(c => ({
            value: c.id,
            label: `${c.contact_code} - ${c.name} ${c.phone ? `(${c.phone})` : ''}`,
            contact: c
          }));
          setCustomers(formatted);
        }
      } catch (e) { console.error("Failed to fetch customers"); }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    apiFetch('get_company').then(res => { if (res.status === 'success') setBusinessSettings(res.data); });
  }, []);

  useEffect(() => { setPage(1); }, [search]);

  useEffect(() => { 
    const delay = setTimeout(() => { fetchSales(); }, 400);
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

  // Global click listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = () => setPrintDropdownOpen(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const url = `transaction_history?type=sale&search=${encodeURIComponent(search)}&start_date=${startDate}&end_date=${endDate}&page=${page}`;
      const res = await apiFetch(url);
      setSales(res.data || []);
      if (res.sums) setTotals({ amount: parseFloat(res.sums.total_amount || 0), profit: parseFloat(res.sums.total_profit || 0) });
      if (res.total && res.limit) setTotalPages(Math.ceil(res.total / res.limit));
    } catch (err) { Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load sales history' }); } 
    finally { setLoading(false); }
  };

  const handleFilter = (e) => { e?.preventDefault(); setPage(1); fetchSales(); };
  const clearFilters = () => { setSearch(''); setStartDate(''); setEndDate(''); setPage(1); setTimeout(fetchSales, 0); };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Transaction?', text: "Revert stock and remove profit?", icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Yes, delete', cancelButtonText: 'Cancel', reverseButtons: true,
      customClass: { popup: 'rounded-2xl shadow-xl', confirmButton: 'bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl ml-2 font-bold', cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-800 px-6 py-2.5 rounded-xl font-bold' },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      const formData = new FormData(); formData.append('id', id);
      try {
        const res = await apiFetch('delete_transaction', { method: 'POST', body: formData });
        if (res.status === 'success') { Toast.fire({ icon: 'success', title: 'Transaction deleted' }); fetchSales(); }
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



  // --- NEW: Smart Dropdown Actions ---
  const handleCustomerChange = (selectedOption) => {
    if (selectedOption) {
      // Auto-fill the form with the chosen customer's details!
      setEditTransaction({
        ...editTransaction,
        contact_id: selectedOption.value,
        client_name: selectedOption.contact.name,
        client_phone: selectedOption.contact.phone || ''
      });
    } else {
      // They cleared the dropdown (Walk-in)
      setEditTransaction({ ...editTransaction, contact_id: null, client_name: 'Walk-in', client_phone: '' });
    }
  };

  const handleCreateCustomer = async (inputValue) => {
    const result = await Swal.fire({
      title: `Customer: ${inputValue}`,
      html: `
        <div class="text-sm text-slate-500 mb-3">Enter phone number (optional)</div>
        <input id="swal-phone" class="swal2-input" style="margin-top: 0;" placeholder="e.g., 078...">
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Save to CRM',
      denyButtonText: 'Receipt Only',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      denyButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl shadow-xl' },
      preConfirm: () => {
        return document.getElementById('swal-phone').value;
      }
    });

    if (result.isDismissed && result.dismiss !== Swal.DismissReason.deny) {
      return;
    }

    if (result.isDenied) {
      const phone = document.getElementById('swal-phone').value;
      // --- THE FIX FOR SALES.JSX ---
      setEditTransaction({
        ...editTransaction,
        contact_id: null,
        client_name: inputValue,
        client_phone: phone
      });
      // -----------------------------
      Toast.fire({ icon: 'info', title: 'Using name for this receipt only' });
      return;
    }

    const phoneNumber = result.value;
    setIsLoadingCustomers(true);
    try {
      const formPayload = new FormData();
      formPayload.append('name', inputValue);
      formPayload.append('phone', phoneNumber || '');
      formPayload.append('type', 'Customer');
      
      const res = await apiFetch('create_contact', { method: 'POST', body: formPayload });
      if (res.status === 'success') {
        const newCustomer = {
          value: res.data.id,
          label: `${res.data.contact_code} - ${res.data.name} ${phoneNumber ? `(${phoneNumber})` : ''}`,
          contact: res.data
        };
        setCustomers((prev) => [...prev, newCustomer]);
        handleCustomerChange(newCustomer);
        Toast.fire({ icon: 'success', title: 'Customer saved to Directory!' });
      } else {
        Toast.fire({ icon: 'error', title: res.message || 'Failed to save customer' });
      }
    } catch (err) { 
      console.error(err);
      Toast.fire({ icon: 'error', title: 'Failed to save customer' }); 
    } finally { 
      setIsLoadingCustomers(false); 
    }
  };



  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('id', editTransaction.id);

    formData.append('contact_id', editTransaction.contact_id || '');
    
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
        fetchSales(); 
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
  
  // VAT CALCULATION
  const isVatRegistered = businessSettings?.vat_registered == 1;
  const vatMultiplier = isVatRegistered ? 1 : 1;

  // --- REFINED PRINT HELPER (NOW ASYNC) ---
  const fetchReceiptItems = async (invoiceId) => {
    try {
      const res = await apiFetch(`get_invoice_products&invoice_id=${invoiceId}`);
      return res.status === 'success' ? res.data : [];
    } catch (e) {
      return [];
    }
  };

  // 1. THERMAL RECEIPT
  const printThermal = async (invoice) => {
    if (!invoice.id) { Swal.fire('Error', 'No invoice ID found.', 'error'); return; }
    
    const receiptItems = await fetchReceiptItems(invoice.id);
    if (!receiptItems || receiptItems.length === 0) return;

    const total = parseFloat(invoice.total_amount || 0);
    const clientName = invoice.client_name || '';
    const clientPhone = invoice.client_phone || '';
    const date = new Date(invoice.date || invoice.created_at).toLocaleString();
    const paymentStatus = invoice.payment_status;
    const ebmNumber = invoice.ebm_number || '';

    let itemsHtml = '';
    receiptItems.forEach(item => {
      let serialsHtml = item.serials ? `<br><small style="color:#666; font-size: 10px;">SN: ${item.serials}</small>` : '';
      itemsHtml += `<tr><td style="padding: 5px 0; font-size: 13px;">${item.product_name}${serialsHtml}<br><small style="color:#666">${item.quantity} x Rwf ${Number(item.price_at_time).toLocaleString()}</small></td><td style="text-align: right; padding: 5px 0; font-size: 13px; font-weight: bold;">Rwf ${(item.price_at_time * item.quantity).toLocaleString()}</td></tr>`;
    });

    const vatHtml = isVatRegistered ? `<tr><td>SUBTOTAL (NET):</td><td style="text-align: right;">Rwf ${(total * 0.82).toLocaleString()}</td></tr><tr><td>VAT (18%):</td><td style="text-align: right;">Rwf ${(total * 0.18).toLocaleString()}</td></tr>` : '';
    const logoImg = businessSettings?.logo ? `<img src="http://localhost/stock-manager/backend/public/${businessSettings.logo}" style="max-height: 50px; margin-bottom: 5px;" />` : '';

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
      <html><head><title>Receipt Archive</title><style>@page { margin: 0; } body { font-family: 'Courier New', Courier, monospace; width: 76mm; padding: 10px; margin: 0; color: #000; background: #fff; } .text-center { text-align: center; } .bold { font-weight: bold; } .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; } .info { font-size: 11px; margin-bottom: 15px; line-height: 1.4; color: #333; } .divider { border-top: 1px dashed #000; margin: 10px 0; } table { width: 100%; border-collapse: collapse; } .totals td { padding: 4px 0; font-size: 13px; } .footer { font-size: 11px; margin-top: 20px; line-height: 1.4; }</style></head><body>
          <div class="text-center">${logoImg}<div class="header">${businessSettings?.name || "STOCKMGR"}</div><div class="info">Receipt No: ${invoice.receipt_number}<br>Date: ${date}${ebmNumber ? '<br>EBM No: ' + ebmNumber : ''}</div></div>
          ${clientName ? `<div style="font-size: 12px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Customer: <b>${clientName}</b> ${clientPhone ? `<br>Tel: ${clientPhone}` : ''}</div>` : ''}
          <div class="divider"></div><table><tbody>${itemsHtml}</tbody></table><div class="divider"></div>
          <table class="totals">
            ${vatHtml}
            <tr><td class="bold">TOTAL DUE:</td><td style="text-align: right;" class="bold">Rwf ${total.toLocaleString()}</td></tr>
            <tr><td>STATUS:</td><td style="text-align: right; font-weight: bold;">${paymentStatus === 'credit' ? 'CREDIT / UNPAID' : 'PAID IN FULL'}</td></tr>
          </table><div class="divider"></div><div class="text-center footer">*** DUPLICATE COPY ***<br>Powered by Vendora SaaS</div>
          <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
        </body></html>
    `);
    printWindow.document.close();
  };

  // 2. A4 INVOICE
  const printA4Invoice = async (invoice) => {
    if (!invoice.id) return;
    
    const receiptItems = await fetchReceiptItems(invoice.id);
    if (!receiptItems || receiptItems.length === 0) return;

    const total = parseFloat(invoice.total_amount || 0);
    const subtotal = isVatRegistered ? total * (100 / 118) : total;
    const taxAmount = isVatRegistered ? total * (18 /118) : 0;

    const clientName = invoice.client_name || 'Walk-in Customer';
    const clientPhone = invoice.client_phone || '-';
    const rawDate = new Date(invoice.date || invoice.created_at);
    const printDate = rawDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const ebmNumber = invoice.ebm_number || '';
    
    const logoUrl = businessSettings?.logo ? `http://localhost/stock-manager/backend/public/${businessSettings.logo}` : '';
    const compName = businessSettings?.name || 'YOUR COMPANY LTD';

    let itemsHtml = '';
    const minRows = 15;
    for (let i = 0; i < Math.max(receiptItems.length, minRows); i++) {
      if (i < receiptItems.length) {
        let serialsHtml = receiptItems[i].serials ? `<br><span style="font-size: 10px; color: #666;">SN: ${receiptItems[i].serials}</span>` : '';
        itemsHtml += `
          <tr>
            <td style="text-align: left; padding-left: 5px;">${receiptItems[i].product_name}${serialsHtml}</td>
            <td>${receiptItems[i].quantity}</td>
            <td>${Number(receiptItems[i].price_at_time).toLocaleString()}</td>
            <td style="text-align: right; padding-right: 5px;">${Number(receiptItems[i].price_at_time * receiptItems[i].quantity).toLocaleString()}</td>
          </tr>
        `;
      } else {
        itemsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>`;
      }
    }

    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    printWindow.document.write(`
      <html>
      <head>
        <title>Invoice - ${invoice.receipt_number}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 8mm 0; box-sizing: border-box; font-size: 12px; }
          .blue-bar { background-color: #3b5b8d; height: 12px; width: 100%; margin-bottom: 20px; }
          .container { padding: 0 15mm; }
          .flex { display: flex; }
          .company-info { flex: 1; padding: 0 15px; }
          .comp-name { font-weight: bold; font-style: italic; font-size: 14px; margin-bottom: 5px; }
          .comp-details { font-size: 11px; line-height: 1.6; }
          .doc-type { width: 220px; text-align: right; }
          .doc-title { color: #94a3b8; font-size: 24px; margin-bottom: 15px; }
          .doc-date { font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 10px; }
          .doc-no { font-weight: bold; color: #3b5b8d; }
          .bill-title { color: #1e3a8a; font-weight: bold; border-bottom: 1px solid #1e3a8a; display: inline-block; padding-bottom: 2px; margin-bottom: 10px; }
          .client-grid { display: grid; grid-template-columns: 120px 1fr; row-gap: 5px; font-weight: bold; font-size: 11px; margin-bottom: 10px; }
          .client-grid span:nth-child(even) { font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
          th { background-color: #b4c6e7; color: #000; padding: 8px 5px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; }
          td { border: 1px solid #cbd5e1; padding: 6px 5px; text-align: center; height: 20px; }
          .footer-grid { display: flex; justify-content: space-between; margin-top: 0px; }
          .remarks { width: 50%; text-align: center; padding-top: 5px; }
          .totals-box { width: 35%; border: 1px solid #cbd5e1; border-top: none; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-size: 12px; }
          .total-row:last-child { border-bottom: none; background-color: #f8cbad; font-weight: bold; }
          .bottom-bar { background-color: #b4c6e7; height: 12px; width: 100%; margin-top: 20px; position: fixed; bottom: 0; }
        </style>
      </head>
      <body>
        <div class="blue-bar"></div>
        <div class="container">
          <div class="flex" style="border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; align-items: flex-start;">
            <div style="width: 150px;">
              ${logoUrl ? `<img src="${logoUrl}" style="max-width: 150px; max-height: 80px;" />` : `<div style="height:60px; background:#f1f5f9; text-align:center; line-height:60px; color:#94a3b8; font-weight:bold;">LOGO</div>`}
            </div>
            <div class="company-info">
              <div class="comp-name">${compName}</div>
              <div class="comp-details">
                <b>${businessSettings?.location || 'Rwanda'}</b><br/>
                Email: <a href="mailto:${businessSettings?.email || ''}">${businessSettings?.email || ''}</a><br/>
                Tel: <a href="tel:${businessSettings?.phone || ''}">${businessSettings?.phone || ''}</a><br/>
                <b>TIN: ${businessSettings?.tin_number || ''}</b><br/>
                <b>A/C: ${businessSettings?.bank_account || ''} / ${businessSettings?.bank_name || ''}</b>
              </div>
            </div>
            <div class="doc-type">
              <div class="doc-title">INVOICE</div>
              <div class="doc-date">${printDate}</div>
              <div class="doc-no">${invoice.receipt_number}</div>${ebmNumber ? `<div class="doc-no" style="margin-top: 4px; font-size: 11px;">EBM: ${ebmNumber}</div>` : ''}
            </div>
          </div>

          <div>
            <div class="bill-title">BILL TO</div>
            <div class="client-grid">
              <span>COMPANY NAME:</span> <span>${clientName}</span>
              <span>TIN:</span> <span>${invoice.tin_number || '-'}</span>
              <span>PHONE:</span> <span>${clientPhone}</span>
              <span style="text-transform: lowercase;">EMAIL:</span> <span style="text-transform: lowercase;">${invoice.client_email || '-'}</span>
            </div>
          </div>

          <table style="background-color: #dbeafe;">
            <thead>
              <tr><th style="width: 50%;">DESCRIPTION</th><th style="width: 15%;">QTY</th><th style="width: 15%;">UNIT PRICE</th><th style="width: 20%;">TOTAL</th></tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="footer-grid">
            <div class="remarks">
              <div style="font-style: italic; font-weight: bold; font-size: 11px;">Remarks / Payment Instructions:</div>
              <div>cash or cheque</div>
              <div style="height: 100px; margin-top: 10px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #cbd5e1;">
                stamp & signature
              </div>
            </div>
              <div class="totals-box">
                <div class="total-row"><span>SUBTOTAL</span> <span style="font-weight: bold;">RWF ${Number(subtotal).toLocaleString()}</span></div>
              <div class="total-row"><span>VAT</span> <span style="font-weight: bold;">RWF ${Number(taxAmount).toLocaleString()}</span></div>
              <div class="total-row"><span>TAX RATE</span> <span style="font-weight: bold;">${isVatRegistered ? '18%' : '0%'}</span></div>
              <div class="total-row" style="padding-top: 15px; padding-bottom: 15px;"><span>Balance Due</span> <span>RWF &nbsp;&nbsp;&nbsp;&nbsp; ${Number(total).toLocaleString()}</span></div>
            </div>
          </div>
        </div>
        <div class="bottom-bar"></div>
        <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // 3. A4 DELIVERY NOTE
  const printDeliveryNote = async (invoice) => {
    if (!invoice.id) return;
    
    const receiptItems = await fetchReceiptItems(invoice.id);
    if (!receiptItems || receiptItems.length === 0) return;

    const clientName = invoice.client_name || 'Walk-in Customer';
    const clientPhone = invoice.client_phone || '-';
    const rawDate = new Date(invoice.date || invoice.created_at);
    const printDate = rawDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const ebmNumber = invoice.ebm_number || '';
    
    const logoUrl = businessSettings?.logo ? `http://localhost/stock-manager/backend/public/${businessSettings.logo}` : '';
    const compName = businessSettings?.name || 'YOUR COMPANY LTD';

    let itemsHtml = '';
    const minRows = 12;
    for (let i = 0; i < Math.max(receiptItems.length, minRows); i++) {
      if (i < receiptItems.length) {
        let serialsHtml = receiptItems[i].serials ? `<br><span style="font-size: 10px; color: #666;">SN: ${receiptItems[i].serials}</span>` : '';
        itemsHtml += `
          <tr>
            <td>${i + 1}</td>
            <td style="text-align: left; padding-left: 5px;">${receiptItems[i].product_name}${serialsHtml}</td>
            <td>${receiptItems[i].quantity}</td>
          </tr>
        `;
      } else {
        itemsHtml += `<tr><td>&nbsp;</td><td></td><td></td></tr>`;
      }
    }

    const printWindow = window.open('', '_blank', 'width=800,height=1100');
    printWindow.document.write(`
      <html>
      <head>
        <title>Delivery Note - ${invoice.receipt_number}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 15mm; box-sizing: border-box; font-size: 13px; }
          .flex { display: flex; align-items: center; margin-bottom: 10px; }
          .company-info { flex: 1; padding: 0 15px; }
          .comp-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
          .comp-details { font-size: 12px; line-height: 1.4; }
          .title { text-align: center; font-weight: bold; font-style: italic; text-decoration: underline; font-size: 16px; margin: 20px 0; border-top: 1px solid #000; padding-top: 10px; }
          /* Merged Table Design */
          table.grid-table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 13px; border-left: 1px solid #94a3b8; border-right: 1px solid #94a3b8; border-top: 1px solid #94a3b8; }
          table.grid-table td { border: 1px solid #94a3b8; padding: 8px; }
          table.grid-table tr:first-child td { border-bottom: 1px solid #000; } /* The specific black line below invoice/date */
          
          table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-left: 1px solid #94a3b8; border-right: 1px solid #94a3b8; border-bottom: 1px solid #94a3b8; }
          table.items-table th { border: 1px solid #94a3b8; padding: 8px; text-align: center; font-weight: bold; }
          /* Removes horizontal lines in data rows but keeps vertical lines */
          table.items-table tbody td { border-left: 1px solid #94a3b8; border-right: 1px solid #94a3b8; border-top: none; border-bottom: none; padding: 8px; text-align: center; height: 25px; }
          .footer-section { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-weight: bold; line-height: 2.5; }
          .bottom-logo { color: #22c55e; font-style: italic; text-align: right; margin-top: 40px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="flex">
          <div style="width: 150px;">
            ${logoUrl ? `<img src="${logoUrl}" style="max-width: 150px; max-height: 80px;" />` : `<div style="height:60px; background:#f1f5f9; text-align:center; line-height:60px; color:#94a3b8; font-weight:bold;">LOGO</div>`}
          </div>
          <div class="company-info">
            <div class="comp-name">${compName}</div>
            <div class="comp-details">
              Email: <a href="mailto:${businessSettings?.email || ''}">${businessSettings?.email || ''}</a><br/>
              Tel: <a href="tel:${businessSettings?.phone || ''}">${businessSettings?.phone || ''}</a><br/>
              TIN: ${businessSettings?.tin_number || ''}<br/>
              A/C: ${businessSettings?.bank_account || ''} / ${businessSettings?.bank_name || ''}
            </div>
          </div>
        </div>

        <div class="title">FULL DELIVERY NOTE</div>

        <table class="grid-table">
          <tr>
            <td style="width: 50%;">INVOICE N&deg;: ${invoice.receipt_number.replace('INV-', '')}${ebmNumber ? `<br/>EBM N&deg;: ${ebmNumber}` : ''}</td>
            <td>Date: ${printDate}</td>
          </tr>
          <tr>
            <td>Client name: ${clientName}</td>
            <td>Client Address: .........</td>
          </tr>
          <tr>
            {/* --- REFINED: Inject dynamic TIN --- */}
            <td>TIN: ${invoice.tin_number || '-'}</td>
            <td>Tel: ${clientPhone}</td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 10%;">Item</th>
              <th style="width: 70%; text-align: left; padding-left: 5px;">Description</th>
              <th style="width: 20%;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="text-align: right; font-weight: bold; margin-bottom: 20px;">
          ${compName}
        </div>

        <div class="footer-section">
          <div>
            Received by: ................................................<br/>
            Position: ................................................<br/>
            Phone: ................................................<br/>
            Signature
          </div>
          <div style="text-align: center; padding-top: 20px;">
            <span style="font-style: italic; font-weight: normal;">Sales</span><br/>
            <span style="font-weight: normal;">Stamp</span>
          </div>
        </div>
        
        <div class="bottom-logo">${compName}</div>

        <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800">Sales History</h2>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-red-500/20 transition-all text-sm w-full sm:w-auto justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Record Bulk Sale
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <form onSubmit={handleFilter} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input type="text" placeholder="Search Invoice, EBM, product, SKU, or Customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          
          <div className="grid grid-cols-[auto_1fr] lg:flex lg:items-center gap-3 w-full lg:w-auto items-center">
            <span className="text-sm font-semibold text-slate-500">From</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full lg:w-auto py-2 px-3 border border-slate-200 rounded-lg outline-none text-sm text-slate-700 focus:border-blue-500" />
            <span className="text-sm font-semibold text-slate-500">To</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full lg:w-auto py-2 px-3 border border-slate-200 rounded-lg outline-none text-sm text-slate-700 focus:border-blue-500" />
          </div>
      
          <div className="flex gap-2 w-full lg:w-auto">
            <button type="submit" className="flex-1 lg:flex-none bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Filter</button>
            <button type="button" onClick={clearFilters} className="flex-1 lg:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Clear</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left whitespace-nowrap min-w-[900px]">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Date & Invoice</th>
                <th className="px-3 py-2.5">Products (Summary)</th>
                <th className="px-3 py-2.5">Customer</th>
                <th className="px-3 py-2.5">Cashier</th>
                <th className="px-3 py-2.5">Total Amount</th>
                <th className="px-3 py-2.5">Amount Paid</th>
                <th className="px-3 py-2.5">Balance Due</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan="11" className="px-6 py-10 text-center"><div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></td></tr>
              : sales.length === 0 ? <tr><td colSpan="11" className="px-6 py-10 text-center text-slate-400 text-sm">No sales records found.</td></tr>
              : sales.map((r) => {
                  const { date, time } = formatDateCell(r.date || r.created_at);
                  
                  const total = (r.total_amount !== undefined ? parseFloat(r.total_amount) : (r.quantity * r.price_at_time)) * vatMultiplier;

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
                        <div className="font-bold text-slate-700 text-[11px] truncate max-w-[100px]">{r.client_name || 'Walk-in'}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {r.contact_code && <span className="text-[10px] text-blue-600 font-bold mt-0.5 mr-1">{r.contact_code}</span>}
                          {r.client_phone || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-bold text-blue-600 text-[11px] truncate max-w-[80px]">{r.user_name || 'System'}</td>
                      
                      {/* New Invoice-Level Financials */}
                      <td className="px-3 py-2 font-black text-slate-900 text-xs">{formatRwf(total)}</td>
                      <td className="px-3 py-2 font-black text-emerald-600 text-[11px]">{formatRwf(r.amount_paid || 0)}</td>
                      <td className="px-3 py-2 font-black text-red-500 text-[11px]">{formatRwf(r.balance_due || 0)}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${r.payment_status === 'credit' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {r.payment_status || 'Paid'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* --- NEW: EYE ICON FOR PRODUCTS --- */}
                          <button onClick={() => openProductsModal(r)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-md border border-transparent hover:border-blue-200 transition-colors" title="View Items">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          </button>

                          {/* --- PRINT DROPDOWN MENU --- */}
                          <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => setPrintDropdownOpen(printDropdownOpen === r.id ? null : r.id)}
                              className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors flex items-center gap-1.5 shadow-sm ${printDropdownOpen === r.id ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:text-blue-600'}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                              <svg className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${printDropdownOpen === r.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>

                            {printDropdownOpen === r.id && (
                              <div className="absolute right-0 top-[calc(100%+6px)] w-40 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-slate-200 py-1.5 z-[9999] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <button onClick={() => { printThermal(r); setPrintDropdownOpen(null); }} className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-50">
                                  Thermal Receipt
                                </button>
                                <button onClick={() => { printA4Invoice(r); setPrintDropdownOpen(null); }} className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-50">
                                  A4 Invoice
                                </button>
                                <button onClick={() => { printDeliveryNote(r); setPrintDropdownOpen(null); }} className="w-full text-left px-4 py-2.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors">
                                  A4 Delivery Note
                                </button>
                              </div>
                            )}
                          </div>
                          {/* ------------------------------- */}

                          <button onClick={() => openEditModal(r)} className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md border border-transparent hover:border-emerald-200 transition-colors" title="Edit Quantity">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          
                          {userRole === 'Admin' && (
                            <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md border border-transparent hover:border-red-200 transition-colors" title="Delete Sale">
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
        
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap justify-end gap-6">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isVatRegistered ? "Total Sales Amount." : "Total Sales Amount"}
            </div>
            <div className="text-lg font-black text-slate-800">
              {formatRwf(totals.amount * vatMultiplier)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {isVatRegistered ? "Total Profit." : "Total Profit"}
            </div>
            <div className="text-lg font-black text-green-600">
              +{formatRwf(totals.profit * vatMultiplier)}
            </div>
          </div>
        </div>

        <div className="bg-white px-4 py-3 border-t border-slate-200 flex justify-between items-center">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">Prev</button>
          <span className="text-xs text-slate-500 font-bold">Page {page} of {totalPages || 1}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50">Next</button>
        </div>
      </div>

      <PosSaleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => { setIsModalOpen(false); fetchSales(); }} 
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
                    <CreatableSelect
                      isClearable
                      isLoading={isLoadingCustomers}
                      options={customers}
                      placeholder="Search or add customer..."
                      value={
                        editTransaction.contact_id
                          ? customers.find(c => c.value === editTransaction.contact_id)
                          : editTransaction.client_name && editTransaction.client_name !== 'Walk-in'
                            ? { label: `${editTransaction.client_name} (Receipt Only)`, value: 'walk-in' }
                            : null
                      }
                      onChange={handleCustomerChange}
                      onCreateOption={handleCreateCustomer}
                      formatCreateLabel={(inputValue) => `+ Save "${inputValue}" to CRM`}
                      styles={{
                        control: (base) => ({
                          ...base,
                          backgroundColor: '#f8fafc',
                          borderColor: '#cbd5e1',
                          borderRadius: '0.5rem',
                          padding: '1px',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        })
                      }}
                    />
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
                      min={new Date().toISOString().split('T')[0]}
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