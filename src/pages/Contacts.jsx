import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config/api'; // Adjust path if needed
import Swal from 'sweetalert2';
// If you use lucide-react for icons, keep these. If not, you can replace them with text or your icon library!
import { Search, Plus, Edit2, Trash2, X, User } from 'lucide-react'; 

const Toast = Swal.mixin({ 
  toast: true, 
  position: 'top-end', 
  showConfirmButton: false, 
  timer: 3000,
  timerProgressBar: true
});

export default function Contacts() {
  // --- STATE MANAGEMENT ---
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(''); // '' = All, 'Customer', 'Supplier'

  // --- MODAL & FORM STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const initialForm = { name: '', phone: '', email: '', tin_number: '', type: 'Customer' };
  const [formData, setFormData] = useState(initialForm);

  // --- DATA FETCHING ---
  const fetchContacts = async () => {
    setLoading(true);
    try {
      // Bulletproof fetch using encodeURIComponent
      const res = await apiFetch(`get_contacts&type=${encodeURIComponent(typeFilter)}`);
      if (res.status === 'success') {
        setContacts(res.data || []);
      } else {
        Toast.fire({ icon: 'error', title: res.message || 'Failed to load contacts' });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Network error while loading contacts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [typeFilter]);

  // --- FORM HANDLERS ---
  const openModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        tin_number: contact.tin_number || '',
        type: contact.type || 'Customer'
      });
    } else {
      setEditingContact(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setFormData(initialForm);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formPayload = new FormData();
      Object.keys(formData).forEach(key => formPayload.append(key, formData[key]));
      
      let endpoint = 'create_contact';
      if (editingContact) {
        endpoint = 'update_contact';
        formPayload.append('id', editingContact.id);
      }

      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: formPayload
      });

      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: res.message });
        closeModal();
        fetchContacts(); // Refresh the table
      } else {
        Toast.fire({ icon: 'error', title: res.message });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Failed to save contact' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    // 1. Ask for confirmation before hitting the API
    const confirm = await Swal.fire({
      title: `Delete ${name}?`,
      text: "This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, delete it!'
    });

    if (confirm.isConfirmed) {
      try {
        const formPayload = new FormData();
        formPayload.append('id', id);

        const res = await apiFetch('delete_contact', {
          method: 'POST',
          body: formPayload
        });

        if (res.status === 'success') {
          Toast.fire({ icon: 'success', title: res.message || 'Contact deleted successfully' });
          fetchContacts();
        } else {
          // 2. This catches the safety block if they have existing invoices!
          Swal.fire('Action Blocked', res.message, 'error');
        }
      } catch (err) {
        Swal.fire('Error', 'Failed to delete contact. Check your connection.', 'error');
      }
    }
  };

  // --- SEARCH FILTERING ---
  const filteredContacts = contacts.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.contact_code && c.contact_code.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query))
    );
  });

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in zoom-in duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <User className="text-blue-600" size={28} />
            Master Directory
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage your Customers and Suppliers.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md active:scale-95"
        >
          <Plus size={18} /> Add New Contact
        </button>
      </div>

      {/* CONTROLS (Search & Tabs) */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
        
        {/* Type Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {['', 'Customer', 'Supplier'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                typeFilter === type 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {type === '' ? 'All Contacts' : type + 's'}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search name, phone, or code..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium transition-all"
          />
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Code</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Info</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">TIN Number</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">Loading directory...</td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 font-medium">No contacts found.</td>
                </tr>
              ) : (
                filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-md text-xs">
                        {contact.contact_code}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{contact.name}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        contact.type === 'Supplier' ? 'bg-purple-100 text-purple-700' :
                        contact.type === 'Both' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {contact.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-700">{contact.phone || '-'}</div>
                      <div className="text-xs text-slate-400">{contact.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {contact.tin_number ? (
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          {contact.tin_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openModal(contact)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(contact.id, contact.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">
                {editingContact ? 'Edit Contact' : 'New Contact'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5">
              
              {!editingContact && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Contact Type</label>
                  <select 
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                  placeholder="e.g. Mugabo Eric"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Phone</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                    placeholder="e.g. 078..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium"
                    placeholder="name@example.com"
                  />
                </div>
                
                {/* --- REFINED: Made full-width and updated styles to match --- */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    TIN Number <span className="text-slate-400 font-medium normal-case tracking-normal">(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    value={formData.tin_number || ''} 
                    onChange={(e) => setFormData({...formData, tin_number: e.target.value})} 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-medium" 
                    placeholder="e.g., 101234567"
                  />
                </div>
                {/* ------------------------------------------------------------ */}
              </div>

              

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end mt-2">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : 'Save Contact'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}