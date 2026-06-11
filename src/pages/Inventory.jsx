import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, getImageUrl } from '../utils/formatters';
import Swal from 'sweetalert2';

import BulkImportModal from '../components/BulkImportModal';
import useDocumentTitle from '../hooks/useDocumentTitle'

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function Inventory() {
  useDocumentTitle('Inventory');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemType, setItemType] = useState('product');

  const [userRole, setUserRole] = useState(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic Form State for Serials
  const [isSerialized, setIsSerialized] = useState(false);
  const [initialQty, setInitialQty] = useState(0);
  const [serialNumbers, setSerialNumbers] = useState('');

  const formRef = useRef(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`fetch&search=${search}&page=${page}`);
      const list = res.data || res; 
      setProducts(list);
      if (res.total && res.limit) {
        setTotalPages(Math.ceil(res.total / res.limit));
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load inventory' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, page]);

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

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Product?',
      text: "This will permanently remove the product and its stock history.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-2xl shadow-xl',
        confirmButton: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg ml-2',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg'
      },
      buttonsStyling: false
    });

    if (result.isConfirmed) {
      const formData = new FormData();
      formData.append('id', id);
      try {
        const res = await apiFetch('delete', { method: 'POST', body: formData });
        
        if (res.status === 'success') {
          
          // SMART UI: Show different alerts based on what the backend actually did
          if (res.action === 'archived') {
            // Show a large informational popup so they read WHY it was archived
            Swal.fire({
              title: 'Product Archived',
              text: res.message,
              icon: 'info',
              confirmButtonText: 'Got it',
              confirmButtonColor: '#3b82f6',
              customClass: { popup: 'rounded-2xl shadow-xl' }
            });
          } else {
            // Standard small toast for a clean permanent deletion
            Toast.fire({ icon: 'success', title: res.message });
          }

          fetchProducts();
        } else {
          Swal.fire('Error', res.message || 'Failed to delete', 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Request Failed', 'error');
      }
    }
  };

  const openModal = (product = null) => {
    setEditingProduct(product);
    setIsSerialized(product?.is_serialized == 1);
    
    setItemType(product?.item_type || 'product'); 
    
    setInitialQty(0);
    setSerialNumbers('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // SMART LOGIC: Determine if we need to ask for serials right now
  const isMigratingToSerialized = editingProduct && editingProduct.is_serialized != 1 && isSerialized && editingProduct.stock_quantity > 0;
  const isNewSerialized = !editingProduct && isSerialized && initialQty > 0;
  const needsSerialsNow = isNewSerialized || isMigratingToSerialized;
  const requiredSerialCount = isNewSerialized ? initialQty : (editingProduct?.stock_quantity || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- PHASE 3: CHECK IF TURNING OFF SERIALIZATION ---
    const isTurningOffSerial = editingProduct && editingProduct.is_serialized == 1 && !isSerialized;
    
    if (isTurningOffSerial) {
      const confirmResult = await Swal.fire({
        title: 'Disable Serialization?',
        text: "This will permanently delete all tracked serial numbers currently assigned to this product. Are you sure you want to proceed?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, disable and delete',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        customClass: {
          popup: 'rounded-2xl shadow-xl',
          confirmButton: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg ml-2',
          cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg'
        },
        buttonsStyling: false
      });
      
      if (!confirmResult.isConfirmed) return; // Stop submission if they cancel
    }
    // ---------------------------------------------------

    if (needsSerialsNow) {
      const serialsList = serialNumbers.split(/[\n,]+/).map(s => s.trim()).filter(s => s);
      
      if (serialsList.length !== requiredSerialCount) {
        return Toast.fire({ icon: 'error', title: `Please provide exactly ${requiredSerialCount} serial numbers.` });
      }

      // --- PHASE 3: FRONTEND DUPLICATE CHECK ---
      const uniqueSerials = new Set(serialsList);
      if (uniqueSerials.size !== serialsList.length) {
        return Swal.fire('Duplicate Input', 'You have entered duplicate serial numbers in the box. Each line must be a unique barcode.', 'error');
      }
      // -----------------------------------------
    }

    setIsSubmitting(true);
    
    const formData = new FormData(formRef.current);
    if (editingProduct) formData.append('id', editingProduct.id);
    
    if (needsSerialsNow) {
      const serialsList = serialNumbers.split(/[\n,]+/).map(s => s.trim()).filter(s => s);
      formData.append('serials', JSON.stringify(serialsList));
    }

    formData.append('status', editingProduct ? (editingProduct.status || 'Active') : 'Active');
    
    const action = editingProduct ? 'update_product' : 'add';

    try {
      const res = await apiFetch(action, { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: editingProduct ? 'Product updated!' : 'Product added!' });
        closeModal();
        fetchProducts();
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
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search by Name or SKU..." 
            value={search}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm"
          />
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => setIsImportModalOpen(true)} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
            </svg>
            Import Excel (CSV)
          </button>
          
          <button onClick={() => openModal()} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-colors text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {/* INVENTORY TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Img</th>
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">SKU</th>
                <th className="px-6 py-4 font-semibold">Buy Price</th>
                <th className="px-6 py-4 font-semibold">Sell Price</th>
                <th className="px-6 py-4 font-semibold">Stock</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center"><div className="animate-spin inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">No products found.</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3">
                      {p.image ? (
                        <img src={getImageUrl(p.image)} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg></div>
                      )}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-6 py-3 text-slate-500 text-sm">{p.sku}</td>
                    <td className="px-6 py-3 text-slate-700">
                      {p.item_type === 'service' ? '-' : formatRwf(p.buy_price)}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">{formatRwf(p.sell_price)}</td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1.5 items-start">
                        
                        {/* DYNAMIC BADGE: Check if Service vs Product */}
                        {p.item_type === 'service' ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            Service
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${p.stock_quantity < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {p.stock_quantity}
                          </span>
                        )}
                    
                        {/* SERIALIZED BADGE (Remains untouched) */}
                        {p.is_serialized == 1 && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Serialized
                          </span>
                        )}
                        
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                        p.status === 'Archived' 
                          ? 'bg-slate-50 text-slate-500 border-slate-200' 
                          : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {p.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button 
                          onClick={() => openModal(p)} 
                          title="Edit"
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors border border-transparent hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                          </svg>
                        </button>
                        
                        {userRole === 'Admin' && (
                          <button 
                            onClick={() => handleDelete(p.id)} 
                            title="Delete"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors border border-transparent hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
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
        
        {/* Pagination */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
          <button 
            disabled={page <= 1} 
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500 font-medium">Page {page} of {totalPages || 1}</span>
          <button 
            disabled={page >= totalPages} 
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">{editingProduct ? 'Edit Product' : 'Add New Item'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form ref={formRef} onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                
                {/* --- NEW: ITEM TYPE TOGGLE --- */}
                {!editingProduct && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="item_type" value="product" checked={itemType === 'product'} onChange={() => setItemType('product')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-bold text-slate-700">📦 Product</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="item_type" value="service" checked={itemType === 'service'} onChange={() => setItemType('service')} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-bold text-slate-700">🛠️ Service</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{itemType === 'service' ? 'Service Image' : 'Product Image'}</label>
                  <input type="file" name="image" accept="image/*" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg p-1" />
                  {editingProduct?.image && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={getImageUrl(editingProduct.image)} alt="Current" className="w-10 h-10 rounded border object-cover" />
                      <span className="text-xs text-slate-400">Current Image</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">{itemType === 'service' ? 'Service Name' : 'Product Name'}</label>
                  <input type="text" name="name" defaultValue={editingProduct?.name || ''} required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={itemType === 'service' ? "e.g. Phone Repair" : "e.g. iPhone 14"} />
                </div>

                {/* DYNAMIC PRICING GRID */}
                <div className={`grid gap-4 ${itemType === 'product' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {itemType === 'product' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Buy Price (Rwf)</label>
                      <input type="number" name="buy_price" defaultValue={editingProduct?.buy_price || ''} step="0.01" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Sell Price / Rate (Rwf)</label>
                    <input type="number" name="sell_price" defaultValue={editingProduct?.sell_price || ''} step="0.01" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                {/* STATUS DROPDOWN */}
                {editingProduct && (
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                    <select 
                      name="status"
                      value={editingProduct?.status || 'Active'} 
                      onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium text-slate-700"
                    >
                      <option value="Active">🟢 Active (Visible in POS)</option>
                      <option value="Archived">⚪ Archived (Hidden from POS)</option>
                    </select>
                  </div>
                )}

                {/* --- HIDE THESE ENTIRE BLOCKS IF IT IS A SERVICE --- */}
                {itemType === 'product' && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl mt-4">
                      <div className="relative flex items-start">
                        <div className="flex items-center h-5">
                          <input 
                            id="is_serialized" 
                            name="is_serialized" 
                            type="checkbox" 
                            value="1"
                            checked={isSerialized}
                            onChange={(e) => setIsSerialized(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" 
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="is_serialized" className="font-bold text-slate-800 cursor-pointer">Requires Serial/IMEI Tracking</label>
                          <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">Enable this for phones, laptops, or items needing unique warranty tracking.</p>
                        </div>
                      </div>
                    </div>

                    {/* DYNAMIC QTY INPUT FOR NEW PRODUCTS */}
                    {!editingProduct && (
                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Initial Stock Quantity</label>
                        <input 
                          type="number" 
                          name="stock_quantity" 
                          value={initialQty}
                          onChange={(e) => setInitialQty(Number(e.target.value))}
                          min="0" 
                          required 
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                      </div>
                    )}

                    {/* DYNAMIC SERIAL ENTRY BOX */}
                    {needsSerialsNow && (
                      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in duration-300">
                        <label className="block text-xs font-bold text-slate-700 mb-2">
                          Enter Serial Numbers <span className="text-blue-600">({requiredSerialCount} required)</span>
                        </label>
                        <textarea
                          value={serialNumbers}
                          onChange={(e) => setSerialNumbers(e.target.value)}
                          placeholder="Paste barcodes or IMEIs here, separated by commas or new lines..."
                          className="w-full px-3 py-2 text-xs border border-blue-200 rounded-md outline-none focus:border-blue-500 bg-white placeholder-slate-400 custom-scrollbar"
                          rows="3"
                          required
                        ></textarea>
                        {isMigratingToSerialized && (
                          <p className="text-[10px] text-amber-600 mt-2 font-medium leading-tight">
                            * You are enabling serialization for an existing product. Please provide serials for the {requiredSerialCount} items currently in stock.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>

              <div className="mt-8 flex gap-3 justify-end">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center justify-center min-w-[120px]">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BulkImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onSuccess={fetchProducts} 
      />

    </div>
  );
}