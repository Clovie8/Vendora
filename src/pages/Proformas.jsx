import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';
import useDocumentTitle from '../hooks/useDocumentTitle';
import CreatableSelect from 'react-select/creatable';

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
  customClass: { popup: 'rounded-xl shadow-lg border border-slate-100 bg-white py-2 px-4', title: 'text-sm font-bold text-slate-700 ml-2' }
});

export default function Proformas() {
  useDocumentTitle('Proforma Invoices');
  
  // Data States
  const [proformas, setProformas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessSettings, setBusinessSettings] = useState(null);
  const [userRole, setUserRole] = useState('Cashier');
  const [searchTerm, setSearchTerm] = useState('');

  // Builder States
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Invoice Form State
  const [clientName, setClientName] = useState('');
  const [clientTin, setClientTin] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // CRM States ---
  const [contactId, setContactId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const [status, setStatus] = useState('Draft');
  const [cart, setCart] = useState([]);
  
  // Product Search State
  const [products, setProducts] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [profRes, compRes, authRes, prodRes, custRes] = await Promise.all([
        apiFetch('get_proformas'),
        apiFetch('get_company'),
        apiFetch('get_profile'),
        apiFetch('fetch&limit=1000'),
        apiFetch('get_contacts&type=Customer') // <-- NEW: Fetch Directory
      ]);
      
      if (profRes.status === 'success') setProformas(profRes.data);
      if (compRes.status === 'success') setBusinessSettings(compRes.data);
      if (authRes.status === 'success') setUserRole(authRes.data.role);
      if (prodRes.status === 'success') setProducts(prodRes.data);
      
      // --- NEW: Format Customers for Dropdown ---
      if (custRes.status === 'success') {
        setCustomers(custRes.data.map(c => ({
          value: c.id,
          label: `${c.contact_code} - ${c.name} ${c.phone ? `(${c.phone})` : ''}`,
          contact: c
        })));
      }
      // ------------------------------------------
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isVatRegistered = businessSettings?.vat_registered == 1;
  const totalAmount = cart.reduce((sum, item) => sum + (item.sell_price * item.cartQty), 0);
  const taxAmount = isVatRegistered ? Math.round((totalAmount * 18) / 118) : 0;
  const subtotal = totalAmount - taxAmount;
  

  // --- NEW: Smart Dropdown Actions ---
  const handleCustomerChange = (selectedOption) => {
    if (selectedOption) {
      setContactId(selectedOption.value);
      setClientName(selectedOption.contact.name);
      setClientTin(selectedOption.contact.tin_number || '');
      setClientPhone(selectedOption.contact.phone || '');
      setClientEmail(selectedOption.contact.email || '');
    } else {
      setContactId(null);
      setClientName('');
      setClientTin('');
      setClientPhone('');
      setClientEmail('');
    }
  };

  const handleCreateCustomer = async (inputValue) => {
    const result = await Swal.fire({
      title: `Customer: ${inputValue}`,
      html: `
        <div class="text-xs font-semibold text-slate-600 mb-1.5 text-left pl-1">Phone Number (Optional)</div>
        <input id="swal-phone" type="tel" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all box-border mb-3" placeholder="e.g., 078...">
        
        <div class="text-xs font-semibold text-slate-600 mb-1.5 text-left pl-1">TIN Number (Optional)</div>
        <input id="swal-tin" type="number" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all box-border mb-3" placeholder="e.g., 101234567">
        
        <div class="text-xs font-semibold text-slate-600 mb-1.5 text-left pl-1">Email Address (Optional)</div>
        <input id="swal-email" type="email" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all box-border mb-2" placeholder="name@example.com">
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Save to CRM',
      denyButtonText: 'Proforma Only',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
      denyButtonColor: '#64748b',
      customClass: { popup: 'rounded-2xl shadow-xl' },
      preConfirm: () => ({
        phone: document.getElementById('swal-phone').value,
        tin: document.getElementById('swal-tin').value,
        email: document.getElementById('swal-email').value
      })
    });

    if (result.isDismissed && result.dismiss !== Swal.DismissReason.deny) return;

    if (result.isDenied) {
      setContactId(null);
      setClientName(inputValue);
      setClientPhone(document.getElementById('swal-phone').value);
      setClientTin(document.getElementById('swal-tin').value);
      setClientEmail(document.getElementById('swal-email').value);
      Toast.fire({ icon: 'info', title: 'Using details for this quote only' });
      return;
    }

    const { phone, tin, email } = result.value;
    setIsLoadingCustomers(true);
    try {
      const formPayload = new FormData();
      formPayload.append('name', inputValue);
      formPayload.append('phone', phone || '');
      formPayload.append('tin_number', tin || '');
      formPayload.append('email', email || '');
      formPayload.append('type', 'Customer');
      
      const res = await apiFetch('create_contact', { method: 'POST', body: formPayload });
      if (res.status === 'success') {
        const newCustomer = {
          value: res.data.id,
          label: `${res.data.contact_code} - ${res.data.name} ${phone ? `(${phone})` : ''}`,
          contact: res.data
        };
        // 1. Add them to the dropdown list
        setCustomers((prev) => [...prev, newCustomer]);
        
        // 2. Select them in the dropdown
        setContactId(newCustomer.value);
        setClientName(newCustomer.contact.name);
        
        // 3. --- REFINED: Update the local preview states instantly! ---
        setClientPhone(phone || '');
        setClientTin(tin || '');
        setClientEmail(email || '');
        // --------------------------------------------------------------
        
        Toast.fire({ icon: 'success', title: 'Customer saved to CRM!' });
      } else {
        Toast.fire({ icon: 'error', title: res.message || 'Failed to save customer' });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Failed to save customer' });
    } finally {
      setIsLoadingCustomers(false);
    }
  };


  const handleOpenBuilder = () => {
    setEditingId(null);
    setContactId(null);
    setCart([]); setClientName(''); setClientTin(''); setClientPhone(''); setClientEmail('');
    setStatus('Draft');
    setIsBuilderOpen(true);
  };

  const handleEdit = async (proformaId) => {
    const res = await apiFetch(`get_single_proforma&id=${proformaId}`);
    if (res.status === 'success') {
      const pi = res.data;
      setEditingId(pi.id);
      setClientName(pi.client_name);
      setClientTin(pi.client_tin || '');
      setClientPhone(pi.client_phone || '');
      setClientEmail(pi.client_email || '');
      setContactId(pi.contact_id || null);
      setStatus(pi.status || 'Draft');
      
      setCart(pi.items.map(i => ({
        row_id: Math.random().toString(36).substring(2, 9), // Inject unique frontend ID
        product_id: i.product_id, // Keep the real ID (or null) for the database
        customDesc: i.description,
        cartQty: Number(i.quantity),
        sell_price: Number(i.unit_price)
      })));
      
      setIsBuilderOpen(true);
    } else {
      Toast.fire({ icon: 'error', title: 'Could not load document.' });
    }
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product_id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item));
    } else {
      setCart([...cart, { 
        row_id: Math.random().toString(36).substring(2, 9), 
        product_id: product.id, 
        customDesc: product.name, 
        sell_price: product.sell_price, 
        cartQty: 1 
      }]);
    }
    Toast.fire({ icon: 'success', title: 'Added to invoice' });
  };

  const updateCartQty = (rowId, newQty) => {
    if (newQty < 1) return setCart(cart.filter(item => item.row_id !== rowId));
    setCart(cart.map(item => item.row_id === rowId ? { ...item, cartQty: newQty } : item));
  };

  const updateCartPrice = (rowId, newPrice) => {
    setCart(cart.map(item => item.row_id === rowId ? { ...item, sell_price: Number(newPrice) } : item));
  };

  const handleSaveProforma = async () => {
    if (cart.length === 0) return Toast.fire({ icon: 'error', title: 'Invoice cannot be empty!' });
    if (!clientName) return Toast.fire({ icon: 'error', title: 'Client Name is required!' });

    setIsSubmitting(true);
    const payload = {
      contact_id: contactId,
      id: editingId,
      status: status,
      client_name: clientName,
      client_tin: clientTin,
      client_phone: clientPhone,
      client_email: clientEmail,
      subtotal: subtotal,
      tax_rate: isVatRegistered ? 18 : 0,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      items: cart.map(i => ({
        product_id: i.product_id,
        description: i.customDesc,
        quantity: i.cartQty,
        unit_price: i.sell_price,
        total_price: i.cartQty * i.sell_price
      }))
    };

    const endpoint = editingId ? 'update_proforma' : 'save_proforma';

    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: editingId ? 'Proforma Updated!' : 'Proforma Saved!' });
        setIsBuilderOpen(false);
        fetchInitialData();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Proforma?',
      text: "This document will be permanently removed.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete it',
      customClass: { popup: 'rounded-2xl' }
    });

    if (result.isConfirmed) {
      const fd = new FormData(); fd.append('id', id);
      const res = await apiFetch('delete_proforma', { method: 'POST', body: fd });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Deleted successfully' });
        fetchInitialData();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    }
  };

  // --- A4 PRINT ENGINE ---
  // --- SHARED INVOICE GENERATOR ---
const fetchAndGenerateInvoiceHtml = async (proformaId) => {
  const res = await apiFetch(`get_single_proforma&id=${proformaId}`);
  if (res.status !== 'success') {
    Toast.fire({ icon: 'error', title: 'Failed to load document.' });
    return null;
  }
  
  const pi = res.data;
  const items = pi.items;
  
  const piDate = new Date(pi.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  const logoUrl = businessSettings?.logo ? `http://localhost/stock-manager/backend/public/${businessSettings.logo}` : '';
  const stampUrl = businessSettings?.stamp_signature ? `http://localhost/stock-manager/backend/public/${businessSettings.stamp_signature}` : '';
  const compName = businessSettings?.name || 'YOUR COMPANY LTD';
  
  let itemsHtml = '';
  const minRows = 15;
  for (let i = 0; i < Math.max(items.length, minRows); i++) {
    if (i < items.length) {
      itemsHtml += `
        <tr>
          <td style="text-align: left; padding-left: 5px;">${items[i].description}</td>
          <td>${items[i].quantity}</td>
          <td>${Number(items[i].unit_price).toLocaleString()}</td>
          <td style="text-align: right; padding-right: 5px;">${Number(items[i].total_price).toLocaleString()}</td>
        </tr>
      `;
    } else {
      itemsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>`;
    }
  }

  // Return the pure HTML string AND the invoice data
  const htmlString = `
    <div id="invoice-wrapper" style="padding: 10mm 15mm; background: white; font-family: 'Arial', sans-serif; color: #000; font-size: 12px;">
      <style>
        .flex { display: flex; }
        .company-info { flex: 1; padding: 0 15px; }
        .comp-name { font-weight: bold; font-style: italic; font-size: 14px; margin-bottom: 5px; }
        .comp-details { font-size: 11px; line-height: 1.6; }
        .doc-type { width: 220px; text-align: right; }
        .doc-title { color: #94a3b8; font-weight: bold; letter-spacing: 1px; margin-bottom: 15px; font-size: 14px; }
        .doc-date { font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 10px; }
        .doc-no { font-weight: bold; color: #334155; }
        .bill-title { color: #1e3a8a; font-weight: bold; border-bottom: 1px solid #1e3a8a; display: inline-block; padding-bottom: 2px; margin-bottom: 10px; }
        .client-grid { display: grid; grid-template-columns: 120px 1fr; row-gap: 5px; font-weight: bold; font-size: 11px; }
        .client-grid span:nth-child(even) { font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 5px; margin-top: 20px;}
        th { background-color: #b4c6e7; color: #000; padding: 8px 5px; border: 1px solid #cbd5e1; text-align: center; font-size: 11px; }
        td { border: 1px solid #cbd5e1; padding: 6px 5px; text-align: center; height: 20px; }
        .footer-grid { display: flex; justify-content: space-between; margin-top: 0px; }
        .remarks { width: 50%; text-align: center; padding-top: 5px; }
        .totals-box { width: 35%; border: 1px solid #cbd5e1; border-top: none; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-size: 12px; }
        .total-row:last-child { border-bottom: none; background-color: #f8cbad; font-weight: bold; }
      </style>
      
      <div class="flex" style="border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-bottom: 20px; align-items: flex-start;">
        <div style="width: 150px;">
          ${logoUrl ? `<img src="${logoUrl}" style="max-width: 150px; max-height: 80px;" crossorigin="anonymous" />` : `<div style="height:60px; background:#f1f5f9; text-align:center; line-height:60px; color:#94a3b8; font-weight:bold;">LOGO</div>`}
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
          <div class="doc-title">PROFORMA INVOICE</div>
          <div class="doc-date">${piDate}</div>
          <div class="doc-no">PROFORMA INVOICE NO. ${pi.proforma_number.split('-')[1]}</div>
        </div>
      </div>

      <div>
        <div class="bill-title">BILL TO</div>
        <div class="client-grid">
          <span>COMPANY NAME:</span> <span>${pi.client_name}</span>
          <span>TIN:</span> <span>${pi.client_tin || '-'}</span>
          <span>PHONE:</span> <span>${pi.client_phone || '-'}</span>
          <span>EMAIL:</span> <span>${pi.client_email || '-'}</span>
        </div>
      </div>

      <table>
        <thead style="background-color: #dbeafe;">
          <tr><th style="width: 50%;">DESCRIPTION</th><th style="width: 15%;">QTY</th><th style="width: 15%;">UNIT PRICE</th><th style="width: 20%;">TOTAL</th></tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="footer-grid">
        <div class="remarks">
          <div style="font-style: italic; font-weight: bold; font-size: 11px;">Remarks / Payment Instructions:</div>
          <div>cash or cheque</div>
          <div style="height: 100px; margin-top: 10px; display: flex; align-items: center; justify-content: center;">
            ${stampUrl ? `<img src="${stampUrl}" style="max-height: 90px; opacity: 0.8;" crossorigin="anonymous" />` : ``}
          </div>
        </div>
        <div class="totals-box">
          <div class="total-row"><span>SUBTOTAL</span> <span style="font-weight: bold;">RWF ${Number(pi.subtotal).toLocaleString()}</span></div>
          <div class="total-row"><span>TAX RATE</span> <span style="font-weight: bold;">${pi.tax_rate}%</span></div>
          <div class="total-row" style="padding-top: 15px; padding-bottom: 15px;"><span>Balance Due</span> <span>RWF &nbsp;&nbsp;&nbsp;&nbsp; ${Number(pi.total_amount).toLocaleString()}</span></div>
        </div>
      </div>
    </div>
  `;

  return { htmlString, pi };
};

// --- BUTTON 1: A4 PRINT ENGINE ---
const handlePrint = async (proformaId) => {
  const data = await fetchAndGenerateInvoiceHtml(proformaId);
  if (!data) return; // Stop if it failed to load

  const printWindow = window.open('', '_blank', 'width=800,height=1100');
  printWindow.document.write(`
    <html>
      <head><title>${data.pi.proforma_number}</title></head>
      <body style="margin:0; padding:0;">
        ${data.htmlString}
        <script>
          window.onload = function() { 
            window.print(); 
            setTimeout(function() { window.close(); }, 500); 
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// --- BUTTON 2: PDF DOWNLOAD ENGINE (Refined) ---
const handleDownloadPDF = async (proformaId) => {
  // 1. Tell the user we are working on it!
  Toast.fire({ icon: 'info', title: 'Generating PDF...', timer: 3000 });

  const data = await fetchAndGenerateInvoiceHtml(proformaId);
  if (!data) return;

  const options = {
    margin: 0, 
    filename: `Proforma_${data.pi.proforma_number}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      logging: false,
      // THE FIX: Delete Tailwind's global oklch stylesheet from the PDF clone before rendering
      onclone: (clonedDoc) => {
        const headStyles = clonedDoc.querySelectorAll('head style, head link[rel="stylesheet"]');
        headStyles.forEach(el => el.remove());
      }
    },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  // 2. Natively pass the HTML string directly (No need for a fake DOM element)
  html2pdf().set(options).from(data.htmlString).save().then(() => {
    // 3. Confirm success
    Toast.fire({ icon: 'success', title: 'PDF Downloaded!' });
  });
};

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-2xl font-black text-slate-800 tracking-tight">Proforma Invoices</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Generate and manage formal price quotations for clients.</p>
        </div>
        <button onClick={handleOpenBuilder} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          Create Proforma
        </button>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-200/60 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" placeholder="Search invoices or clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-700" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap border-collapse min-w-[850px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Document</th>
                <th className="px-6 py-4">Client Details</th>
                <th className="px-6 py-4">Amount & Tax</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan="5" className="text-center py-10"><div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div></td></tr> : null}
              {!loading && proformas.filter(p => p.proforma_number.toLowerCase().includes(searchTerm.toLowerCase()) || p.client_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400 text-sm font-medium">No proforma invoices found.</td></tr>
              ) : (
                proformas.filter(p => p.proforma_number.toLowerCase().includes(searchTerm.toLowerCase()) || p.client_name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3">{proformas.indexOf(p) + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[13px] text-slate-800">{p.proforma_number}</div>
                      <div className="text-[12px] text-slate-500 mt-0.5">{new Date(p.date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[13px] text-slate-800">{p.client_name}</div>
                      <div className="text-[12px] text-slate-500 mt-0.5">{p.client_phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[14px] text-blue-600">Rwf {Number(p.total_amount).toLocaleString()}</div>
                      {Number(p.tax_amount) > 0 && <div className="text-[11px] text-slate-400 mt-0.5">Incl. 18% VAT</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${
                        p.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        p.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        p.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handlePrint(p.id)} className="hidden md:flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-md transition-colors" title="Print Document">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                        </button>
                        <button 
                          onClick={() => handleDownloadPDF(p.id)} 
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 rounded-md transition-colors" 
                          title="Download PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                          </svg>
                        </button>
                        <button 
                          onClick={() => p.status !== 'Approved' && handleEdit(p.id)} 
                          className={`p-1.5 border rounded-md transition-colors ${
                            p.status === 'Approved' 
                              ? 'text-slate-200 border-slate-100 cursor-not-allowed' 
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border-slate-200'
                          }`} 
                          title={p.status === 'Approved' ? "Cannot edit approved quote" : "Edit Document"}
                          disabled={p.status === 'Approved'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        {userRole === 'Admin' && (
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-md transition-colors" title="Delete Document">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PROFORMA BUILDER MODAL --- */}
      {isBuilderOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            
            <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-slate-200 shrink-0">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">{editingId ? 'Edit Proforma' : 'Draft New Proforma'}</h3>
              <button onClick={() => setIsBuilderOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col lg:flex-row gap-6">
              
              <div className="flex-1 space-y-6">
                
                {/* Client Details Box */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Client Information *</h4>
                  
                  <CreatableSelect
                    isClearable
                    isLoading={isLoadingCustomers}
                    options={customers}
                    placeholder="Search or type a new company name..."
                    value={
                      contactId 
                        ? customers.find(c => c.value === contactId) 
                        : clientName 
                          ? { label: `${clientName} (Proforma Only)`, value: 'custom' }
                          : null
                    }
                    onChange={handleCustomerChange}
                    onCreateOption={handleCreateCustomer}
                    formatCreateLabel={(inputValue) => `+ Save & Use "${inputValue}"`}
                    styles={{
                      control: (base) => ({
                        ...base,
                        backgroundColor: '#f8fafc',
                        borderColor: '#e2e8f0',
                        borderRadius: '0.75rem',
                        padding: '2px',
                        fontSize: '0.875rem',
                        fontWeight: '700'
                      })
                    }}
                  />

                  {/* Clean summary of what will be printed */}
                  {(clientPhone || clientTin || clientEmail) && (
                    <div className="mt-4 p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs flex flex-wrap gap-x-6 gap-y-2 text-slate-600">
                      {clientPhone && <div className="flex items-center gap-1.5"><span className="font-bold text-blue-800">Phone:</span> {clientPhone}</div>}
                      {clientTin && <div className="flex items-center gap-1.5"><span className="font-bold text-blue-800">TIN:</span> {clientTin}</div>}
                      {clientEmail && <div className="flex items-center gap-1.5"><span className="font-bold text-blue-800">Email:</span> {clientEmail}</div>}
                    </div>
                  )}
                </div>

                {/* Add Items Box */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative">
                  
                  {/* NEW: Flex container with Custom Item Button */}
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Add Items to Quote</h4>
                    <button 
                      onClick={() => setCart([...cart, { 
                        row_id: Math.random().toString(36).substring(2, 9), 
                        product_id: 'custom-' + Date.now(), 
                        customDesc: 'Custom Product / Service', 
                        sell_price: 0, 
                        cartQty: 1 
                      }])}
                      className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      Add Custom Item
                    </button>
                  </div>

                  <div className="relative" ref={dropdownRef}>
                    <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input 
                      type="text" placeholder="Search catalog to add items..." 
                      value={prodSearch} onChange={(e) => { setProdSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 font-bold text-sm" 
                    />
                    
                    {showDropdown && prodSearch.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 max-h-60 overflow-y-auto custom-scrollbar z-20">
                        {products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.sku.toLowerCase().includes(prodSearch.toLowerCase())).length === 0 ? (
                          <div className="p-4 text-slate-500 text-center text-sm font-medium">No products found</div>
                        ) : (
                          products.filter(p => p.name.toLowerCase().includes(prodSearch.toLowerCase()) || p.sku.toLowerCase().includes(prodSearch.toLowerCase())).map(p => (
                            <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left px-4 py-3 border-b border-slate-50 flex justify-between hover:bg-blue-50 transition-colors">
                              <div><div className="font-bold text-slate-800 text-sm">{p.name}</div><div className="text-[10px] text-slate-500">SKU: {p.sku}</div></div>
                              <div className="font-black text-blue-600 text-sm">Rwf {Number(p.sell_price).toLocaleString()}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cart Table */}
                  <div className="mt-4 border border-slate-100 rounded-xl overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                        <tr>
                          <th className="px-4 py-2 min-w-[180px]">Item Description</th>
                          <th className="px-4 py-2 w-24 min-w-[80px]">Qty</th>
                          <th className="px-4 py-2 w-32 min-w-[100px]">Unit Price</th>
                          <th className="px-4 py-2 text-right min-w-[80px]">Total</th>
                          <th className="px-4 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {cart.length === 0 ? (
                          <tr><td colSpan="5" className="text-center py-6 text-slate-400 text-xs">No items added to quote yet.</td></tr>
                        ) : 
                        cart.map(item => (
                          <tr key={item.row_id} className="hover:bg-slate-50">
                            <td className="px-4 py-2">
                              <input type="text" value={item.customDesc} onChange={(e) => setCart(cart.map(i => i.row_id === item.row_id ? {...i, customDesc: e.target.value} : i))} className="w-full min-w-[150px] bg-transparent border-none outline-none font-bold text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 rounded px-1" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" min="1" value={item.cartQty} onChange={(e) => updateCartQty(item.row_id, parseInt(e.target.value) || 1)} className="w-full min-w-[60px] bg-white border border-slate-200 rounded px-2 py-1 outline-none text-xs font-bold text-center" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" min="0" value={item.sell_price} onChange={(e) => updateCartPrice(item.row_id, e.target.value)} className="w-full min-w-[80px] bg-white border border-slate-200 rounded px-2 py-1 outline-none text-xs font-bold" />
                            </td>
                            <td className="px-4 py-2 text-right font-black text-slate-800 text-xs">
                              {(item.cartQty * item.sell_price).toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button onClick={() => setCart(cart.filter(i => i.row_id !== item.row_id))} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Totals Box */}
              <div className="w-full lg:w-80 flex flex-col gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Financial Summary</h4>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center text-slate-600 font-bold">
                      <span>Subtotal (Net)</span>
                      <span>Rwf {subtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-slate-600 font-bold pb-3 border-b border-slate-100">
                      <span>VAT ({isVatRegistered ? '18%' : '0%'})</span>
                      <span>Rwf {taxAmount.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-end pt-2">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider">Total Due</span>
                      <span className="text-2xl font-black text-blue-600">Rwf {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* --- ADD THIS STATUS DROPDOWN --- */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Document Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)} 
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold cursor-pointer transition-colors ${
                      status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <option value="Draft" className="bg-white text-slate-700">Draft</option>
                    <option value="Pending" className="bg-white text-slate-700">Pending / Sent</option>
                    <option value="Approved" className="bg-white text-slate-700">Approved / Accepted</option>
                    <option value="Rejected" className="bg-white text-slate-700">Rejected</option>
                  </select>
                </div>
                {/* -------------------------------- */}

                <button onClick={handleSaveProforma} disabled={isSubmitting || cart.length === 0} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (editingId ? 'Update Proforma' : 'Save Proforma')}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}