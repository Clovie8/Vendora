import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, getImageUrl } from '../utils/formatters';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 3000,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function PosSaleModal({ isOpen, onClose, onSuccess, businessSettings }) {
  const [products, setProducts] = useState([]);
  const [posSearch, setPosSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [ebmNumber, setEbmNumber] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      apiFetch('fetch&limit=1000&status=Active').then(res => { 
        if (res && res.data && Array.isArray(res.data)) {
          setProducts(res.data);
        } else if (Array.isArray(res)) {
          setProducts(res);
        } else {
          setProducts([]);
        }
      }).catch(err => console.error("Failed to load products", err));
    }
  }, [isOpen]);

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

  // ✅ TO THIS (Added item_type checks):
  const addToCart = (product) => {
    if (product.item_type !== 'service' && product.stock_quantity <= 0) return Toast.fire({ icon: 'error', title: 'Out of stock!' });
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        // Bypass maximum cart limit for services
        if (product.item_type !== 'service' && existing.cartQty >= product.stock_quantity) {
           Toast.fire({ icon: 'error', title: `Only ${product.stock_quantity} available.` });
           return prevCart;
        }
        return prevCart.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      }
      return [...prevCart, { ...product, cartQty: 1, serialText: '' }];
    });
    setPosSearch('');
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

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cleanedSearch = posSearch.trim().toUpperCase();
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
               setPosSearch('');
            } else {
               Toast.fire({ icon: 'error', title: 'Product linked to this serial is not loaded.' });
            }
         } else {
            Toast.fire({ icon: 'error', title: 'Invalid Serial or Out of Stock!' });
         }
      } catch(err) { console.error(err); }
    }
  };

  useEffect(() => {
    if (!posSearch) return;

    const timer = setTimeout(async () => {
      const searchValue = posSearch.trim();
      if (!searchValue) return;

      const exactMatchSku = products.find(p => (p?.sku || '').toUpperCase() === searchValue.toUpperCase());
      
      if (exactMatchSku) {
        if (exactMatchSku.is_serialized == 1) {
            Toast.fire({ icon: 'warning', title: 'Please scan the Serial Number, not the SKU!' });
            setPosSearch('');
            return;
        }
        addToCart(exactMatchSku);
        playBeep();
        setPosSearch('');
        return;
      }

      try {
        const res = await apiFetch(`get_product_by_serial&serial=${encodeURIComponent(searchValue)}`);
        if (res.status === 'success' && res.data) {
          const product = products.find(p => p.id === res.data.product_id);
          if (product) {
            addToCartWithSerial(product, searchValue);
            playBeep();
            setPosSearch('');
          }
        }
      } catch (err) {}
    }, 400);

    return () => clearTimeout(timer);
  }, [posSearch, products]);

  if (!isOpen) return null;

  const filteredProducts = (products || []).filter(p => 
    (p?.name || '').toLowerCase().includes((posSearch || '').toLowerCase()) || 
    (p?.sku || '').toLowerCase().includes((posSearch || '').toLowerCase())
  );
  
  const cartTotal = cart.reduce((sum, item) => sum + (item.sell_price * item.cartQty), 0);
  
  // ✅ TO THIS (Added item_type check):
  const updateCartQty = (id, newQty) => {
    if (newQty < 1) return setCart(cart.filter(item => item.id !== id));
    const prod = products.find(p => p.id === id);
    if (prod && prod.item_type !== 'service' && newQty > prod.stock_quantity) return Toast.fire({ icon: 'error', title: `Max stock is ${prod.stock_quantity}` });
    setCart(cart.map(item => item.id === id ? { ...item, cartQty: newQty } : item));
  };

  const updateCartPrice = (id, newPrice) => {
    setCart(cart.map(item => item.id === id ? { ...item, sell_price: newPrice } : item));
  };

  const printThermalReceipt = (finalCart, total, receiptNo) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    const currentDate = new Date().toLocaleString();
    let itemsHtml = '';
    
    finalCart.forEach(item => {
      let serialsHtml = '';
      if (item.is_serialized == 1 && item.parsedSerials && item.parsedSerials.length > 0) {
        serialsHtml = `<br><small style="color:#666; font-size: 10px;">SN: ${item.parsedSerials.join(', ')}</small>`;
      }
      itemsHtml += `<tr><td style="padding: 5px 0; font-size: 13px;">${item.name}${serialsHtml}<br><small style="color:#666">${item.cartQty} x Rwf ${Number(item.sell_price).toLocaleString()}</small></td><td style="text-align: right; padding: 5px 0; font-size: 13px; font-weight: bold;">Rwf ${(item.sell_price * item.cartQty).toLocaleString()}</td></tr>`;
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
      <html><head><title>Receipt</title><style>@page { margin: 0; } body { font-family: 'Courier New', Courier, monospace; width: 76mm; padding: 10px; margin: 0; color: #000; background: #fff; } .text-center { text-align: center; } .bold { font-weight: bold; } .header { font-size: 18px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; } .info { font-size: 11px; margin-bottom: 15px; line-height: 1.4; color: #333; } .divider { border-top: 1px dashed #000; margin: 10px 0; } table { width: 100%; border-collapse: collapse; } .totals td { padding: 4px 0; font-size: 13px; } .footer { font-size: 11px; margin-top: 20px; line-height: 1.4; }</style></head><body>
          <div class="text-center">${logoImg}<div class="header">${storeName}</div><div class="info">${storeLocation}<br>${storeTin}${storePhone ? 'Tel: ' + storePhone + '<br>' : ''}Receipt No: ${receiptNo}<br>Date: ${currentDate}</div></div>
          ${customerInfo}<div class="divider"></div><table><tbody>${itemsHtml}</tbody></table><div class="divider"></div>
          <table class="totals">
            ${vatHtml}
            <tr><td class="bold">TOTAL DUE:</td><td style="text-align: right;" class="bold">Rwf ${total.toLocaleString()}</td></tr><tr><td>STATUS:</td><td style="text-align: right; font-weight: bold; font-size: 11px;">${paymentTypeLabel}</td></tr>
          </table><div class="divider"></div><div class="text-center footer">${storeMsg}<br>Powered by Vendora SaaS</div>
          <script>window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };</script>
        </body></html>
    `);
    printWindow.document.close();
  };

  const handleMultiCheckout = async () => {
    if (cart.length === 0) return;
    
    if ((paymentStatus === 'credit' || paymentStatus === 'partial') && clientName.trim() === '') {
      return Toast.fire({ icon: 'error', title: 'Customer Name required for Credit/Partial payments!' });
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

    setIsSubmitting(true);
    try {
      const receiptNumber = `INV-${Date.now()}${Math.floor(Math.random() * 100)}`;

      const promises = cart.map(item => {
        const fd = new FormData();
        fd.append('type', 'sale'); 
        fd.append('product_id', item.id); 
        fd.append('quantity', item.cartQty);
        fd.append('price_at_time', item.sell_price); 
        
        fd.append('client_name', clientName); 
        fd.append('client_phone', clientPhone); 
        fd.append('payment_status', paymentStatus);
        fd.append('receipt_number', receiptNumber);
        
        let itemAmountPaid = 0;
        if (paymentStatus === 'paid') {
          itemAmountPaid = item.sell_price * item.cartQty;
        } else if (paymentStatus === 'partial') {
          const itemRatio = (item.sell_price * item.cartQty) / cartTotal;
          itemAmountPaid = (amountPaid * itemRatio).toFixed(2);
        }
        
        fd.append('amount_paid', itemAmountPaid);
        fd.append('payment_method_used', paymentStatus === 'credit' ? '' : paymentMethod);
        fd.append('deadline_date', (paymentStatus === 'partial' || paymentStatus === 'credit') ? deadlineDate : '');
        fd.append('ebm_number', ebmNumber);

        if (item.is_serialized == 1) {
          fd.append('serials', JSON.stringify(item.parsedSerials));
        }
        
        return apiFetch('transaction', { method: 'POST', body: fd });
      });

      const results = await Promise.all(promises);
      const errorResult = results.find(res => res.status === 'error');
      
      if (errorResult) {
        Swal.fire('Failed', errorResult.message || 'Some items failed. Check stock.', 'error');
      } else {
        const msg = paymentStatus === 'credit' ? 'Added to Accounts Receivable.' : (paymentStatus === 'partial' ? 'Partial payment recorded.' : 'Sale finalized successfully.');
        
        const result = await Swal.fire({ 
          html: `<div class="flex flex-col items-center"><div class="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4 mt-2"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg></div><h2 class="text-2xl font-black text-slate-800 mb-1">Rwf ${cartTotal.toLocaleString()}</h2><p class="text-slate-500 text-sm font-medium">${msg}</p></div>`, 
          // showCancelButton: true,
          confirmButtonText: 'Great!', 
          // cancelButtonText: 'Print Receipt',
          buttonsStyling: false, 
          returnFocus: false,
          customClass: { 
            popup: 'rounded-[24px] p-6', 
            confirmButton: 'bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl mt-4 text-sm transition-colors shadow-md ml-2',
            cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl mt-4 text-sm transition-colors shadow-sm mr-2' 
          } 
        });
        
        if (result.dismiss === Swal.DismissReason.cancel) {
          printThermalReceipt(cart, cartTotal, receiptNumber);
        }
        
        setCart([]); setClientName(''); setClientPhone(''); 
        setPaymentStatus('paid'); setPaymentMethod('Cash'); setAmountPaid(''); setDeadlineDate(''); setEbmNumber('');
        
        onSuccess(); 
      }
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-100 z-[100] flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="bg-red-500 px-4 py-3 lg:px-6 lg:py-4 flex justify-between items-center text-white shrink-0 shadow-md">
        <h3 className="text-lg lg:text-xl font-bold flex items-center gap-2 lg:gap-3">
          <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg> 
          Bulk Sales Checkout
        </h3>
        <button onClick={onClose} className="hover:text-white/70 transition-colors bg-red-600/50 p-1.5 lg:p-2 rounded-full cursor-pointer">
          <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      {/* BODY - PERFECT MOBILE SPLIT (flex-1 on both cols) */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden p-3 lg:p-6 gap-3 lg:gap-6 custom-scrollbar">
        
        {/* LEFT: PRODUCT GRID */}
        <div className="flex-1 flex flex-col bg-white rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[60vh] lg:min-h-0 shrink-0 lg:shrink">
          <div className="p-3 lg:p-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="relative">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                placeholder="Scan Barcode or Search by Name/SKU..." 
                value={posSearch} 
                onChange={(e) => setPosSearch(e.target.value)} 
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-9 lg:pl-10 pr-3 py-2 lg:py-2.5 bg-white border border-slate-300 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold text-slate-700 shadow-sm" 
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 lg:p-4 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-5 gap-3 content-start custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full h-full min-h-[200px] flex justify-center items-center w-full select-none pointer-events-none">
                <div className="flex flex-col items-center gap-2 opacity-40">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                  <span className="text-slate-400 font-bold text-sm lg:text-base tracking-widest uppercase">No products</span>
                </div>
              </div>
            ) : (
            // ✅ TO THIS:
            filteredProducts.map(p => (
              // Button is now ONLY disabled if it's a physical product AND out of stock
              <button key={p.id} onClick={() => addToCart(p)} disabled={p.item_type !== 'service' && p.stock_quantity <= 0} className="text-left p-2.5 lg:p-3 rounded-xl border bg-white border-slate-200 hover:border-red-500 hover:shadow-md transition-all relative group disabled:opacity-50 disabled:cursor-not-allowed">
                {p.is_serialized == 1 && <span className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm z-10">Serial</span>}
                <div className="w-full aspect-square bg-slate-50 rounded-lg mb-2 overflow-hidden border border-slate-100/50 group-hover:scale-[1.02] transition-transform">
                  {p.image ? <img src={getImageUrl(p.image)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>}
                </div>
                <h3 className="font-bold text-slate-800 text-[11px] lg:text-[12px] truncate">{p.name}</h3>
                <p className="text-red-600 font-black text-xs lg:text-sm mt-0.5">{formatRwf(p.sell_price)}</p>
                
                {/* Dynamic Badge: Show '🛠️ Service' instead of 'Stock: 0' */}
                {p.item_type === 'service' ? (
                  <p className="text-[10px] font-bold mt-0.5 text-blue-500 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg> 
                    Service
                  </p>
                ) : (
                  <p className="text-[10px] font-medium mt-0.5 text-slate-400">Stock: {p.stock_quantity}</p>
                )}
              </button>
            )))}
          </div>
        </div>

        {/* RIGHT: TIGHT CART */}
        <div className="flex-1 lg:flex-none w-full lg:w-[340px] xl:w-[380px] flex flex-col bg-white rounded-xl lg:rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0 min-h-[60vh] lg:min-h-0">
          <div className="p-3 bg-slate-900 text-white flex justify-between items-center shrink-0">
            <h2 className="text-sm font-bold">Active Cart</h2>
            <span className="bg-red-500 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">{cart.length} Items</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 lg:p-3 bg-slate-50/50 space-y-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 font-medium text-xs lg:text-sm gap-2">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                Scan barcode or select
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="bg-white p-2.5 lg:p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-bold text-slate-800 text-[12px] truncate mb-1">{item.name}</h4>
                      <div className="flex items-center gap-1.5">
                        <span className="text-red-600 text-[10px] font-bold">Rwf</span>
                        <input 
                          type="number" 
                          min="0" 
                          value={item.sell_price} 
                          onChange={(e) => updateCartPrice(item.id, e.target.value)}
                          className="w-20 px-1.5 py-1 text-xs font-bold text-red-600 border border-red-200 bg-red-50/50 rounded flex-1 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20" 
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                      <h4 className="font-bold text-slate-800 text-[10px] truncate">Qty</h4>
                      <div className="flex items-center gap-1.5 bg-slate-50 rounded-md p-1 border border-slate-200 shrink-0">
                        <button onClick={() => updateCartQty(item.id, item.cartQty - 1)} className="w-6 h-6 text-sm font-black bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 rounded hover:bg-slate-100">-</button>
                        <span className="text-xs font-bold w-5 text-center text-slate-800">{item.cartQty}</span>
                        <button onClick={() => updateCartQty(item.id, item.cartQty + 1)} className="w-6 h-6 text-sm font-black bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 rounded hover:bg-slate-100">+</button>
                      </div>
                    </div>  
                  </div>
                  {item.is_serialized == 1 && (
                    <div className="w-full pt-2 border-t border-slate-100">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Scan <span className="text-red-500">{item.cartQty}</span> Serial(s)</label>
                      <textarea 
                        placeholder={`Scan/Type exactly ${item.cartQty} serials...`}
                        value={item.serialText || ''}
                        onChange={(e) => setCart(cart.map(i => i.id === item.id ? {...i, serialText: e.target.value} : i))}
                        className="w-full px-2.5 py-1.5 text-xs border border-red-200 rounded-lg outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 bg-white placeholder-slate-300 custom-scrollbar"
                        rows="2"
                      ></textarea>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Customer Name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-1.5 text-xs lg:text-sm border border-slate-300 rounded-lg outline-none font-bold text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500/20" />
              <input type="text" placeholder="Phone Number" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full px-3 py-1.5 text-xs lg:text-sm border border-slate-300 rounded-lg outline-none font-bold text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500/20" />
            </div>

            <div className="mt-2 mb-1">
              <input type="text" placeholder="EBM Receipt Number (Optional)" value={ebmNumber} onChange={(e) => setEbmNumber(e.target.value)} className="w-full px-3 py-1.5 text-xs lg:text-sm border border-slate-300 rounded-lg outline-none font-bold text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500/20" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setAmountPaid(''); setDeadlineDate(''); }} className="w-full px-3 py-1.5 text-xs lg:text-sm font-bold bg-white border border-slate-300 rounded-lg outline-none focus:border-red-500 focus:ring-1">
                <option value="paid">✔️ Fully Paid</option>
                <option value="partial">🌗 Partially Paid</option>
                <option value="credit">⏳ On Credit</option>
              </select>
              
              {(paymentStatus === 'paid' || paymentStatus === 'partial') && (
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-1.5 text-xs lg:text-sm font-bold bg-white border border-slate-300 rounded-lg outline-none focus:border-red-500 focus:ring-1">
                  <option value="Cash">Cash</option>
                  <option value="MoMo">Mobile Money</option>
                  <option value="Bank Transfer">Bank</option>
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
              <div className="flex items-center gap-2 bg-white px-3 py-1 border border-slate-300 rounded-lg focus-within:border-red-500 focus-within:ring-1">
                <span className="text-[10px] lg:text-xs font-bold text-slate-500 whitespace-nowrap">Deadline:</span>
                <input type="date" value={deadlineDate} onChange={(e) => setDeadlineDate(e.target.value)} className="w-full outline-none text-xs lg:text-sm font-bold text-slate-800 bg-transparent" />
              </div>
            )}
          </div>

          <div className="p-3 lg:p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="flex justify-between items-end mb-3">
              <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Total Amount</span>
              <span className="text-xl lg:text-2xl font-black text-red-600">{formatRwf(cartTotal)}</span>
            </div>
            <button onClick={handleMultiCheckout} disabled={cart.length === 0 || isSubmitting} className={`w-full py-2.5 lg:py-3 rounded-lg lg:rounded-xl font-bold text-sm lg:text-base flex justify-center items-center ${cart.length > 0 ? 'bg-red-500 hover:bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              {isSubmitting ? <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : 'Confirm Bulk Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}