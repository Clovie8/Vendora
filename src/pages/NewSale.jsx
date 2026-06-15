import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf } from '../utils/formatters';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
  customClass: { popup: 'rounded-xl shadow-xl border border-slate-100 bg-white py-2 px-4', title: 'text-sm font-bold text-slate-700 ml-2' }
});

export default function NewSale() {
  useDocumentTitle('POS');
  const [activeShift, setActiveShift] = useState(null);
  const [startingCash, setStartingCash] = useState('');
  
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // NEW: ERP Customer & Payment States
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [ebmNumber, setEbmNumber] = useState('');
  
  const [businessSettings, setBusinessSettings] = useState(null);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => { 
    checkShiftStatus(); 
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    const res = await apiFetch('get_company');
    if (res.status === 'success') setBusinessSettings(res.data);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch initial products for the grid
  useEffect(() => { 
    apiFetch(`fetch?search=&limit=50&status=Active`).then(res => {
      if(res.status === 'success') setProducts(res.data);
    }); 
  }, []);

  useEffect(() => {
    if (activeShift && searchInputRef.current && window.innerWidth > 1024) {
      searchInputRef.current.focus();
    }
  }, [activeShift, cart]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.sell_price * item.cartQty), 0);

  const checkShiftStatus = async () => {
    const res = await apiFetch('check_shift');
    if (res.status === 'success' && res.data) setActiveShift(res.data);
    else setActiveShift(null);
  };

  const handleStartShift = async (e) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.append('starting_cash', startingCash || 0);
    
    try {
      const res = await apiFetch('start_shift', { method: 'POST', body: fd });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Register Opened!' });
        checkShiftStatus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async () => {
    const { value: actualCash } = await Swal.fire({
      title: 'End of Day Handover',
      text: 'Count the physical cash in your drawer and enter the total amount below:',
      input: 'number',
      inputPlaceholder: 'Enter total cash...',
      showCancelButton: true,
      confirmButtonText: 'Close Register',
      confirmButtonColor: '#0f172a',
    });

    if (actualCash) {
      const fd = new FormData();
      fd.append('shift_id', activeShift.id);
      fd.append('actual_cash', actualCash);
      
      const res = await apiFetch('end_shift', { method: 'POST', body: fd });
      if (res.status === 'success') {
        Swal.fire('Shift Closed', res.message, 'success');
        setActiveShift(null);
        setCart([]);
      } else {
        Toast.fire({ icon: 'error', title: res.message });
      }
    }
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  };

  // ✅ CHANGE TO THIS (Added item_type checks):
  const addToCart = (product) => {
    if (product.item_type !== 'service' && product.stock_quantity <= 0) return Toast.fire({ icon: 'error', title: 'Out of stock!' });
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        if (product.item_type !== 'service' && existing.cartQty >= product.stock_quantity) {
           Toast.fire({ icon: 'error', title: `Only ${product.stock_quantity} available.` });
           return prevCart;
        }
        return prevCart.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      }
      return [...prevCart, { ...product, cartQty: 1, serialText: '' }];
    });
    setSearch('');
    setShowDropdown(false);
  };

  const addToCartWithSerial = (product, serialNumber) => {
    if (product.stock_quantity <= 0) return Toast.fire({ icon: 'error', title: 'Out of stock!' });

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        if (existing.cartQty >= product.stock_quantity) {
           Toast.fire({ icon: 'error', title: `Only ${product.stock_quantity} available.` });
           return prevCart;
        }
        
        const currentSerials = existing.serialText ? existing.serialText.split(/[\n,]+/).map(s => s.trim()).filter(s => s) : [];
        if (currentSerials.includes(serialNumber)) {
           Toast.fire({ icon: 'warning', title: 'Serial already scanned in cart!' });
           return prevCart;
        }

        const newSerialText = existing.serialText ? existing.serialText + '\n' + serialNumber : serialNumber;
        return prevCart.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1, serialText: newSerialText } : item);
      }
      return [...prevCart, { ...product, cartQty: 1, serialText: serialNumber }];
    });
  };

  // ✅ CHANGE TO THIS:
  const updateCartQty = (id, newQty) => {
    if (newQty < 1) return setCart(cart.filter(item => item.id !== id));
    const prod = products.find(p => p.id === id);
    if (prod && prod.item_type !== 'service' && newQty > prod.stock_quantity) return Toast.fire({ icon: 'error', title: `Max stock is ${prod.stock_quantity}` });
    setCart(cart.map(item => item.id === id ? { ...item, cartQty: newQty } : item));
  };

  const updateCartPrice = (id, newPrice) => {
    setCart(cart.map(item => item.id === id ? { ...item, sell_price: newPrice } : item));
  };

  // SMART SCANNER INTERCEPTOR (Keydown)
  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cleanedSearch = search.trim().toUpperCase();
      if (!cleanedSearch) return;

      const exactMatchSku = products.find(p => (p?.sku || '').toUpperCase() === cleanedSearch);
      if (exactMatchSku) return; 

      try {
         const res = await apiFetch(`get_product_by_serial&serial=${encodeURIComponent(cleanedSearch)}`);
         if (res.status === 'success' && res.data) {
            const product = products.find(p => p.id === res.data.product_id);
            if (product) {
               addToCartWithSerial(product, cleanedSearch);
               playBeep();
               setSearch('');
               setShowDropdown(false);
            } else {
               Toast.fire({ icon: 'error', title: 'Product linked to this serial is not loaded.' });
            }
         } else {
            Toast.fire({ icon: 'error', title: 'Invalid Serial or Out of Stock!' });
         }
      } catch(err) { console.error(err); }
    }
  };

  // SMART DEBOUNCE SEARCH ENGINE (Typing/Paste)
  useEffect(() => {
    if (!search) return;

    const timer = setTimeout(async () => {
      const searchValue = search.trim();
      if (!searchValue) return;

      const exactMatchSku = products.find(p => (p?.sku || '').toUpperCase() === searchValue.toUpperCase());
      
      if (exactMatchSku) {
        if (exactMatchSku.is_serialized == 1) {
            Toast.fire({ icon: 'warning', title: 'Please scan the Serial Number, not the SKU!' });
            setSearch('');
            setShowDropdown(false);
            return;
        }
        addToCart(exactMatchSku);
        playBeep();
        setSearch('');
        setShowDropdown(false);
        return;
      }

      try {
        const res = await apiFetch(`get_product_by_serial&serial=${encodeURIComponent(searchValue)}`);
        if (res.status === 'success' && res.data) {
          const product = products.find(p => p.id === res.data.product_id);
          if (product) {
            addToCartWithSerial(product, searchValue);
            playBeep();
            setSearch('');
            setShowDropdown(false);
          }
        }
      } catch (err) {}
    }, 400);

    return () => clearTimeout(timer);
  }, [search, products]);

  // UPDATED RECEIPT ENGINE WITH SERIALS
  const printThermalReceipt = (finalCart, total, receiptNo) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    const currentDate = new Date().toLocaleString();
    let itemsHtml = '';
    
    finalCart.forEach(item => {
      let serialsHtml = '';
      if (item.is_serialized == 1 && item.parsedSerials && item.parsedSerials.length > 0) {
        serialsHtml = `<br><small style="color:#666; font-size: 10px;">SN: ${item.parsedSerials.join(', ')}</small>`;
      }
      itemsHtml += `
        <tr>
          <td style="padding: 5px 0; font-size: 13px;">${item.name}${serialsHtml}<br><small style="color:#666">${item.cartQty} x Rwf ${Number(item.sell_price).toLocaleString()}</small></td>
          <td style="text-align: right; padding: 5px 0; font-size: 13px; font-weight: bold;">Rwf ${(item.sell_price * item.cartQty).toLocaleString()}</td>
        </tr>
      `;
    });

    const storeName = businessSettings?.name || "STOCKMGR STORE";
    const storePhone = businessSettings?.phone || "";
    const storeLocation = businessSettings?.location || "";
    const storeTin = businessSettings?.tin_number ? `TIN: ${businessSettings.tin_number}<br>` : "";
    const storeMsg = businessSettings?.receipt_message || "Thank you for shopping with us!";
    const logoImg = businessSettings?.logo ? `<img src="http://localhost/stock-manager/backend/public/${businessSettings.logo}" style="max-height: 50px; margin-bottom: 5px;" />` : '';

    const customerInfo = clientName ? `<div style="font-size: 12px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Customer: <b>${clientName}</b> ${clientPhone ? `<br>Tel: ${clientPhone}` : ''}</div>` : '';
    
    let paymentTypeLabel = 'PAID IN FULL';
    if (paymentStatus === 'credit') paymentTypeLabel = 'CREDIT / UNPAID';
    if (paymentStatus === 'partial') paymentTypeLabel = `PARTIAL (Paid: Rwf ${Number(amountPaid).toLocaleString()})`;

    const isVatRegistered = businessSettings?.vat_registered == 1;
    const netAmount = total * 0.82;
    const vatAmount = total * 0.18;
    const vatHtml = isVatRegistered ? `
      <tr><td>SUBTOTAL (NET):</td><td style="text-align: right;">Rwf ${netAmount.toLocaleString()}</td></tr>
      <tr><td>VAT (18%):</td><td style="text-align: right;">Rwf ${vatAmount.toLocaleString()}</td></tr>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; width: 76mm; padding: 10px; margin: 0; color: #000; background: #fff; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
            .info { font-size: 11px; margin-bottom: 15px; line-height: 1.4; color: #333; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            .totals td { padding: 4px 0; font-size: 13px; }
            .footer { font-size: 11px; margin-top: 20px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="text-center">
            ${logoImg}
            <div class="header">${storeName}</div>
            <div class="info">${storeLocation}<br>${storeTin}${storePhone ? 'Tel: ' + storePhone + '<br>' : ''}Receipt No: ${receiptNo}<br>Date: ${currentDate}</div>
          </div>
          ${customerInfo}
          <div class="divider"></div>
          <table><tbody>${itemsHtml}</tbody></table>
          <div class="divider"></div>
          <table class="totals">
            ${vatHtml}
            <tr><td class="bold">TOTAL DUE:</td><td style="text-align: right;" class="bold">Rwf ${total.toLocaleString()}</td></tr>
            <tr><td>STATUS:</td><td style="text-align: right; font-weight: bold;">${paymentTypeLabel}</td></tr>
          </table>
          <div class="divider"></div>
          <div class="text-center footer">${storeMsg}<br>Powered by Vendora SaaS</div>
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // VALIDATE PAYMENTS
    if ((paymentStatus === 'credit' || paymentStatus === 'partial') && clientName.trim() === '') {
      return Toast.fire({ icon: 'error', title: 'Customer Name is required for Credit/Partial sales!' });
    }
    if (paymentStatus === 'partial') {
      const paidVal = Number(amountPaid);
      if (!amountPaid || paidVal <= 0) {
        return Toast.fire({ 
          icon: 'error', 
          title: 'Amount must be greater than 0. If nothing is paid, select "On Credit".' 
        });
      }
      if (paidVal >= cartTotal) {
        return Toast.fire({ 
          icon: 'error', 
          title: `Amount cannot be ${formatRwf(cartTotal)} or more. If fully paid, select "Fully Paid".` 
        });
      }
    }
    if ((paymentStatus === 'partial' || paymentStatus === 'credit') && !deadlineDate) {
      return Toast.fire({ icon: 'error', title: 'Please select a deadline date to clear the debt!' });
    }

    // VALIDATE SERIALS
    for (let item of cart) {
      if (item.is_serialized == 1) {
        const serials = item.serialText ? item.serialText.split(/[\n,]+/).map(s => s.trim()).filter(s => s) : [];
        if (serials.length !== item.cartQty) {
          return Swal.fire('Error', `Need exactly ${item.cartQty} serials for ${item.name}. You entered ${serials.length}.`, 'error');
        }
        
        const uniqueSerials = new Set(serials);
        if (uniqueSerials.size !== serials.length) {
          return Swal.fire('Duplicate Input', `You scanned duplicate serial numbers for ${item.name}.`, 'error');
        }

        item.parsedSerials = serials; 
      }
    }

    setLoading(true);

    try {
      const receiptNumber = `INV-${Date.now()}${Math.floor(Math.random() * 100)}`;

      const promises = cart.map(item => {
        const formData = new FormData();
        formData.append('type', 'sale');
        formData.append('product_id', item.id);
        formData.append('quantity', item.cartQty);
        formData.append('price_at_time', item.sell_price);
        
        formData.append('client_name', clientName);
        formData.append('client_phone', clientPhone);
        formData.append('payment_status', paymentStatus);
        formData.append('receipt_number', receiptNumber);

        let itemAmountPaid = 0;
        if (paymentStatus === 'paid') {
          itemAmountPaid = item.sell_price * item.cartQty;
        } else if (paymentStatus === 'partial') {
          const itemRatio = (item.sell_price * item.cartQty) / cartTotal;
          itemAmountPaid = (amountPaid * itemRatio).toFixed(2);
        }
        
        formData.append('amount_paid', itemAmountPaid);
        formData.append('payment_method_used', paymentStatus === 'credit' ? '' : paymentMethod);
        formData.append('deadline_date', (paymentStatus === 'partial' || paymentStatus === 'credit') ? deadlineDate : '');
        formData.append('ebm_number', ebmNumber);

        if (item.is_serialized == 1) {
          formData.append('serials', JSON.stringify(item.parsedSerials));
        }

        return apiFetch('transaction', { method: 'POST', body: formData });
      });

      const results = await Promise.all(promises);
      const hasError = results.find(res => res.status === 'error');

      if (hasError) {
        Swal.fire('Failed', hasError.message || 'Some items failed to process. Check stock.', 'error');
      } else {
        const msg = paymentStatus === 'credit' ? 'Added to Accounts Receivable.' : (paymentStatus === 'partial' ? 'Partial payment recorded.' : 'Sale finalized successfully.');
        
        const result = await Swal.fire({ 
          html: `<div class="flex flex-col items-center"><div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 mt-2"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div><h2 class="text-2xl font-black text-slate-800 mb-1">Rwf ${cartTotal.toLocaleString()}</h2><p class="text-slate-500 text-sm font-medium">${msg}</p></div>`, 
          // showCancelButton: true,
          confirmButtonText: 'Next Customer', 
          // cancelButtonText:'Print Receipt',
          buttonsStyling: false, 
          returnFocus: false,
          customClass: { 
            popup: 'rounded-[24px] p-6', 
            confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl mt-4 text-sm transition-colors shadow-md ml-2',
            cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-8 rounded-xl mt-4 text-sm transition-colors shadow-sm mr-2' 
          } 
        });
        
        if (result.dismiss === Swal.DismissReason.cancel) {
          printThermalReceipt(cart, cartTotal, receiptNumber);
        }
        
        setCart([]);
        setClientName('');
        setClientPhone('');
        setPaymentStatus('paid');
        setPaymentMethod('Cash');
        setAmountPaid('');
        setDeadlineDate('');
        setEbmNumber('');
        
        // Refresh grid
        apiFetch(`fetch?search=&limit=50&status=Active`).then(res => {
          if(res.status === 'success') setProducts(res.data);
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // SHIFT OVERLAY
  if (!activeShift) {
    return (
      <div className="h-full flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white max-w-sm w-full rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Open Register</h2>
          <p className="text-slate-500 mb-6 text-sm">Declare your starting cash before making sales.</p>
          
          <form onSubmit={handleStartShift}>
            <div className="text-left mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1">Starting Cash (Rwf)</label>
              <input type="number" required min="0" value={startingCash} onChange={(e) => setStartingCash(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-base font-bold text-slate-800" placeholder="0" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all text-sm">
              Start Shift
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN UI
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-auto lg:h-[calc(100vh-90px)] pb-6 lg:pb-0 animate-in fade-in duration-500">
      
      {/* LEFT: Item Catalog */}
      <div className="flex-none h-[65vh] min-h-[550px] lg:h-auto lg:flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 relative min-h-0">
        
        {/* Responsive Header */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 rounded-t-2xl z-20">
          <div className="flex justify-between items-center lg:hidden">
            <h1 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Point of Sale</h1>
            <button onClick={handleEndShift} className="px-3 py-1.5 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100 transition-colors border border-red-100 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              Close
            </button>
          </div>

          <div className="flex gap-3 justify-between items-center w-full">
            <h1 className="text-xl font-black text-slate-800 hidden lg:block tracking-tight shrink-0 mr-4">Point of Sale</h1>
            
            <div className="relative w-full max-w-md z-50 flex-1" ref={dropdownRef}>
              <div className="relative">
                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input 
                  type="text" 
                  ref={searchInputRef}
                  placeholder="Scan Barcode or Search..." 
                  value={search} 
                  onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }} 
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleSearchKeyDown}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-700 font-bold shadow-sm transition-all text-sm" 
                />
              </div>
              
              {showDropdown && search.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
                  {products.filter(p => (p?.name || '').toLowerCase().includes(search.toLowerCase()) || (p?.sku || '').toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                    <div className="p-4 text-slate-500 text-center text-sm font-medium">No products found</div>
                  ) : (
                    products.filter(p => (p?.name || '').toLowerCase().includes(search.toLowerCase()) || (p?.sku || '').toLowerCase().includes(search.toLowerCase())).map(p => (
                      <button 
                        key={p.id} onClick={() => addToCart(p)} disabled={p.item_type !== 'service' && p.stock_quantity <= 0}
                        className={`w-full text-left px-4 py-3 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-colors ${(p.item_type !== 'service' && p.stock_quantity <= 0) ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                            {p.image ? <img src={`http://localhost/stock-manager/backend/public/${p.image}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">
                              {p.name}
                              {p.is_serialized == 1 && <span className="ml-2 text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">Serialized</span>}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">SKU: {p.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600 text-sm">Rwf {Number(p.sell_price).toLocaleString()}</div>
                          
                          {/* Dynamic Dropdown Badge */}
                          {p.item_type === 'service' ? (
                            <div className="text-[10px] font-bold mt-0.5 text-blue-500 flex items-center gap-1 justify-end">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> 
                              Service
                            </div>
                          ) : (
                            <div className={`text-[10px] font-bold mt-0.5 ${p.stock_quantity > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{p.stock_quantity} in stock</div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button onClick={handleEndShift} className="hidden lg:flex shrink-0 px-4 py-2.5 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100 transition-colors border border-red-100 items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              Close Register
            </button>
          </div>
        </div>

        {/* Scrollable Products Area */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar rounded-b-2xl">
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map(p => (
              // ✅ REPLACE THE ENTIRE BUTTON WITH THIS:
              <button key={p.id} onClick={() => addToCart(p)} disabled={p.item_type !== 'service' && p.stock_quantity <= 0} className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all ${(p.item_type === 'service' || p.stock_quantity > 0) ? 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'} relative`}>
                {p.is_serialized == 1 && <span className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm z-10">Serialized</span>}
                <div className="w-full aspect-square bg-slate-100 rounded-lg mb-2 overflow-hidden border border-slate-100/50">
                  {p.image ? <img src={`http://localhost/stock-manager/backend/public/${p.image}`} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>}
                </div>
                <h3 className="font-bold text-slate-800 text-[11px] sm:text-xs truncate">{p.name}</h3>
                <p className="text-blue-600 font-black text-xs sm:text-sm mt-0.5">Rwf {Number(p.sell_price).toLocaleString()}</p>
                
                {/* Dynamic Grid Badge */}
                {p.item_type === 'service' ? (
                  <p className="text-[10px] font-bold mt-0.5 text-blue-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> 
                    Service
                  </p>
                ) : (
                  <p className="text-[10px] font-medium mt-0.5 text-slate-500">{p.stock_quantity} items</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Active Order Sidebar */}
      <div className="flex-none h-[65vh] min-h-[500px] lg:h-auto lg:flex-none w-full lg:w-[340px] xl:w-[380px] flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-0">
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">Current Order</h2>
          <span className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">{cart.length} Lines</span>
        </div>

        {/* Scrollable Cart Area */}
        <div className="flex-1 p-3 overflow-y-auto bg-slate-50/50 custom-scrollbar space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              <p className="font-medium text-[11px] sm:text-xs">Empty Basket</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-slate-800 text-[11px] sm:text-xs truncate mb-1">{item.name}</h4>
                    <div className="flex items-center gap-1.5">
                        <span className="text-blue-600 text-[11px] font-bold">Rwf</span>
                        <input 
                          type="number" min="0" value={item.sell_price} onChange={(e) => updateCartPrice(item.id, e.target.value)}
                          className="w-24 px-1.5 py-0.5 text-[11px] font-bold text-blue-600 border border-blue-200 bg-blue-50/30 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" 
                        />
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                    <h4 className="font-bold text-slate-800 text-[10px] truncate">Qty</h4>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-md p-1 border border-slate-200 shrink-0">
                      <button onClick={() => updateCartQty(item.id, item.cartQty - 1)} className="w-6 h-6 text-sm font-black bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 rounded hover:bg-slate-100">-</button>
                      <span className="text-[11px] sm:text-xs font-bold w-4 text-center text-slate-800">{item.cartQty}</span>
                      <button onClick={() => updateCartQty(item.id, item.cartQty + 1)} className="w-6 h-6 text-sm font-black bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 rounded hover:bg-slate-100">+</button>
                    </div>
                  </div>  
                </div>
                {item.is_serialized == 1 && (
                  <div className="w-full mt-1 border-t border-slate-100 pt-2">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Scan <span className="text-blue-600">{item.cartQty}</span> Serial(s)</label>
                    <textarea 
                      placeholder={`Scan/Type exactly ${item.cartQty} serial/IMEI numbers...`}
                      value={item.serialText || ''}
                      onChange={(e) => setCart(cart.map(i => i.id === item.id ? {...i, serialText: e.target.value} : i))}
                      className="w-full px-3 py-2 text-[10px] border border-blue-200 rounded-md outline-none focus:border-blue-500 bg-blue-50/30 placeholder-slate-400 custom-scrollbar"
                      rows="2"
                    ></textarea>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* CUSTOMER & PAYMENT CONFIGURATION */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="Customer Name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            <input type="text" placeholder="Phone Number"  value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
          </div>

          <div className="mt-3 mb-1">
            <input type="text" placeholder="EBM Receipt Number (Optional)" value={ebmNumber} onChange={(e) => setEbmNumber(e.target.value)} className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none font-bold text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500" />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setAmountPaid(''); setDeadlineDate(''); }} className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="paid">✔️ Fully Paid</option>
              <option value="partial">🌗 Partially Paid</option>
              <option value="credit">⏳ Give on Credit</option>
            </select>
            
            {(paymentStatus === 'paid' || paymentStatus === 'partial') && (
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                <option value="Cash">Cash</option>
                <option value="MoMo">Mobile Money (MoMo)</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            )}
          </div>

          {paymentStatus === 'partial' && (
            <input 
              type="number" 
              min="1" 
              max={cartTotal - 1} 
              placeholder={`Enter amount (1 to ${cartTotal - 1})`} 
              value={amountPaid} 
              onChange={(e) => setAmountPaid(e.target.value)} 
              className="w-full px-3 py-1.5 text-xs lg:text-sm border border-slate-300 rounded-lg outline-none font-bold text-slate-800 focus:border-blue-600 focus:ring-1" 
            />
          )}

          {(paymentStatus === 'partial' || paymentStatus === 'credit') && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-300 rounded-lg transition-all focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Deadline Date:</span>
              <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className="w-full outline-none text-[11px] font-bold text-slate-800 bg-transparent" />
            </div>
          )}
        </div>

        {/* FINANCIAL SUMMARY */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.03)] space-y-3 shrink-0">
          
          <div className="flex justify-between items-end pb-1">
            <span className="text-slate-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-wider">Total Amount</span>
            <span className="text-xl sm:text-2xl font-black text-blue-600">Rwf {cartTotal.toLocaleString()}</span>
          </div>
          
          <button 
            onClick={handleCheckout} 
            disabled={cart.length === 0 || loading} 
            className={`w-full py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base flex justify-center items-center transition-all ${cart.length > 0 ? 'bg-slate-900 hover:bg-black text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            {loading ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Finalize Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}