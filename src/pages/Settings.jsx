import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../config/api';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

// Upgraded Toast to match Dashboard
const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true,
  customClass: { popup: 'rounded-xl shadow-lg border border-slate-100 bg-white py-3 px-4', title: 'text-sm font-bold text-slate-800 ml-2' }
});

export default function Settings() {
  useDocumentTitle('Settings');
  const [activeTab, setActiveTab] = useState('business');

  const [showPassword, setShowPassword] = useState(false);
  
  // Data States
  const [profile, setProfile] = useState({ name: '', email: '', password: '' });
  const [team, setTeam] = useState([]);
  
  const [business, setBusiness] = useState({ name: '', phone: '', email: '', location: '', tin_number: '', receipt_message: '', vat_registered: 1, logo: null, stamp_signature: null, bank_name: '', bank_account: '' });
  const [billing, setBilling] = useState(null);

  // Form States
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'Cashier' });
  const [editMember, setEditMember] = useState(null); 

  const [resendingId, setResendingId] = useState(null);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const logoFormRef = useRef(null);

  useEffect(() => {
    fetchProfile();
    fetchTeam();
    fetchBusiness();
    fetchBilling();
  }, []);


  const fetchBilling = async () => {
    try {
      const res = await apiFetch('get_billing_info'); 
      if (res.status === 'success') {
        setBilling(res.data);
      }
    } catch (e) {
      console.error("Failed to load billing", e);
    }
  };

  const fetchProfile = async () => {
    const res = await apiFetch('get_profile');
    if (res.status === 'success') setProfile({ ...res.data, password: '' });
  };

  const fetchTeam = async () => {
    const res = await apiFetch('get_team');
    if (res.status === 'success') setTeam(res.data);
  };

  const fetchBusiness = async () => {
    const res = await apiFetch('get_company');
    if (res.status === 'success' && res.data) {
      setBusiness({ 
        name: res.data.name || '', 
        phone: res.data.phone || '', 
        email: res.data.email || '', 
        location: res.data.location || '', 
        tin_number: res.data.tin_number || '',
        receipt_message: res.data.receipt_message || '',
        vat_registered: res.data.vat_registered ?? 1, 
        logo: res.data.logo || null,
        stamp_signature: res.data.stamp_signature || null,
        bank_name: res.data.bank_name || '',
        bank_account: res.data.bank_account || ''
      });
    }
  };

  // --- BUSINESS LOGIC ---
  const handleBusinessUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(logoFormRef.current);
    try {
      const res = await apiFetch('update_company', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Settings Saved! Refreshing...' });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        Toast.fire({ icon: 'error', title: res.message });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Connection Error' });
    } finally {
      setLoading(false);
    }
  };

  // --- PROFILE LOGIC ---
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    Object.keys(profile).forEach(key => formData.append(key, profile[key]));
    try {
      const res = await apiFetch('update_profile', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Profile Updated!' });
        setProfile({ ...profile, password: '' });
      } else {
        Toast.fire({ icon: 'error', title: res.message });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Connection Error' });
    } finally {
      setLoading(false);
    }
  };

  // --- TEAM MANAGEMENT LOGIC ---
  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    Object.keys(newMember).forEach(key => formData.append(key, newMember[key]));
    try {
      const res = await apiFetch('add_team_member', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Team Member Added!' });
        setNewMember({ name: '', email: '', password: '', role: 'Cashier' });
        fetchTeam(); 
      } else {
        Toast.fire({ icon: 'error', title: res.message });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Connection Error' });
    } finally {
      setLoading(false);
    }
  };

  // --- REFINED: Accept email and send as JSON ---
  const handleResendVerification = async (memberId, memberEmail) => {
    setResendingId(memberId);
    try {
      const res = await apiFetch('resend_verification', { 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: memberEmail }) 
      });
      
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Verification email resent successfully!' });
      } else {
        Toast.fire({ icon: 'error', title: res.message || 'Failed to resend email.' });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Network error. Please try again.' });
    } finally {
      setResendingId(null);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    
    Object.keys(editMember).forEach(key => {
      if (key === 'status') {
        formData.append('status', editMember.status || 'active');
      } else {
        formData.append(key, editMember[key]);
      }
    });

    try {
      const res = await apiFetch('update_team_member', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Member Updated!' });
        setIsEditModalOpen(false);
        fetchTeam();
      } else {
        Swal.fire({ title: 'Error', text: res.message, icon: 'error', customClass: { popup: 'rounded-2xl' } });
      }
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'Connection Error', icon: 'error', customClass: { popup: 'rounded-2xl' } });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "This user will lose all access immediately.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, remove them',
      customClass: { popup: 'rounded-2xl' }
    });

    if (result.isConfirmed) {
      const formData = new FormData();
      formData.append('id', id);
      try {
        const res = await apiFetch('delete_team_member', { method: 'POST', body: formData });
        if (res.status === 'success') {
          Toast.fire({ icon: 'success', title: 'Member removed.' });
          fetchTeam();
        } else {
          Swal.fire({ title: 'Failed', text: res.message, icon: 'error', customClass: { popup: 'rounded-2xl' } });
        }
      } catch (err) {
        Swal.fire({ title: 'Error', text: 'Failed to remove member.', icon: 'error', customClass: { popup: 'rounded-2xl' } });
      }
    }
  };

  const openEditModal = (member) => {
    setEditMember({ ...member, password: '', status: member.status || 'active' }); 
    setIsEditModalOpen(true);
  };

  // Reusable input classes
  const inputClass = "w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-[13px] font-semibold text-slate-800 placeholder-slate-400";
  const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2";

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-slate-200/60 pb-4">
        <div>
          <h1 className="text-2xl sm:text-2xl font-black text-slate-800 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1 text-[13px] font-medium">Manage your account preferences and business configuration.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
        
        {/* SIDEBAR TABS */}
        <div className="w-full md:w-56 shrink-0 flex overflow-x-auto md:flex-col gap-2 custom-scrollbar pb-2 md:pb-0">
          <button 
            onClick={() => setActiveTab('business')} 
            className={`flex items-center gap-3 whitespace-nowrap text-left px-4 py-3 rounded-xl font-bold text-[13px] transition-all duration-200 ${
              activeTab === 'business' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            Business & Receipt
          </button>
          
          <button 
            onClick={() => setActiveTab('profile')} 
            className={`flex items-center gap-3 whitespace-nowrap text-left px-4 py-3 rounded-xl font-bold text-[13px] transition-all duration-200 ${
              activeTab === 'profile' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            My Profile
          </button>
          
          <button 
            onClick={() => setActiveTab('team')} 
            className={`flex items-center gap-3 whitespace-nowrap text-left px-4 py-3 rounded-xl font-bold text-[13px] transition-all duration-200 ${
              activeTab === 'team' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Team & Roles
          </button>

          <button 
            onClick={() => setActiveTab('billing')} 
            className={`flex items-center gap-3 whitespace-nowrap text-left px-4 py-3 rounded-xl font-bold text-[13px] transition-all duration-200 ${
              activeTab === 'billing' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
            Billing & Plan
          </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 min-w-0">
          
          {/* 1. BUSINESS PROFILE TAB */}
          {activeTab === 'business' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-5">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">SaaS Branding</h2>
                <p className="text-slate-500 text-[13px] mt-1 font-medium">This information will appear dynamically on your POS thermal receipts.</p>
              </div>
              
              <form ref={logoFormRef} onSubmit={handleBusinessUpdate} className="space-y-5">
                
                {/* Logo Uploader */}
                <div className="flex items-center gap-4 p-4 bg-white shadow-sm border border-slate-200/60 rounded-2xl transition-all hover:border-slate-300">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {business.logo ? (
                      <img src={`https://vendora-htcbbye5c0b3h8gn.southafricanorth-01.azurewebsites.net/backend/public/${business.logo}`} className="w-full h-full object-contain p-1" alt="Logo" />
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold uppercase text-center leading-tight p-2">Upload<br/>Logo</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelClass}>Store Logo File</label>
                    <input type="file" name="logo" accept="image/*" className="w-full text-[12px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-colors outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>

                {/* Stamp/Signature Uploader */}
                <div className="flex items-center gap-4 p-4 bg-white shadow-sm border border-slate-200/60 rounded-2xl transition-all hover:border-slate-300">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {business.stamp_signature ? (
                      <img src={`https://vendora-htcbbye5c0b3h8gn.southafricanorth-01.azurewebsites.net/backend/public/${business.stamp_signature}`} className="w-full h-full object-contain p-1" alt="Stamp" />
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold uppercase text-center leading-tight p-2">Upload<br/>Stamp</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className={labelClass}>Authorized Stamp / Signature</label>
                    <input type="file" name="stamp_signature" accept="image/*" className="w-full text-[12px] text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-colors outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>

                {/* Form Fields */}
                <div className="bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-200/60 rounded-2xl p-5 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Business Name</label>
                      <input type="text" name="name" required value={business.name} onChange={(e) => setBusiness({...business, name: e.target.value})} className={inputClass} placeholder="Company Ltd" />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="text" name="phone" value={business.phone} onChange={(e) => setBusiness({...business, phone: e.target.value})} className={inputClass} placeholder="+250 788 000 000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <input type="email" name="email" value={business.email} onChange={(e) => setBusiness({...business, email: e.target.value})} className={inputClass} placeholder="info@company.com" />
                    </div>
                    <div>
                      <label className={labelClass}>Location / Address</label>
                      <input type="text" name="location" value={business.location} onChange={(e) => setBusiness({...business, location: e.target.value})} className={inputClass} placeholder="Kigali, Rwanda" />
                    </div>
                    <div>
                      <label className={labelClass}>TIN Number</label>
                      <input type="text" name="tin_number" value={business.tin_number} onChange={(e) => setBusiness({...business, tin_number: e.target.value})} className={inputClass} placeholder="10xxxxxxx" />
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Bank Name</label>
                      <input type="text" name="bank_name" value={business.bank_name || ''} onChange={(e) => setBusiness({...business, bank_name: e.target.value})} className={inputClass} placeholder="e.g. Bank of Kigali" />
                    </div>
                    <div>
                      <label className={labelClass}>Bank Account Number</label>
                      <input type="text" name="bank_account" value={business.bank_account || ''} onChange={(e) => setBusiness({...business, bank_account: e.target.value})} className={inputClass} placeholder="e.g. 000123456789" />
                    </div>
                  </div>

                  {/* --- TACTILE VAT TOGGLE --- */}
                  <div className="pt-2">
                    <label className={labelClass}>VAT Registration Status</label>
                    <input type="hidden" name="vat_registered" value={business.vat_registered} />
                    
                    <button
                      type="button"
                      onClick={() => setBusiness({ ...business, vat_registered: Number(business.vat_registered) === 1 ? 0 : 1 })}
                      className={`relative flex items-center justify-between w-full p-4 border rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${
                        Number(business.vat_registered) === 1 ? "bg-blue-50/50 border-blue-200" : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className={`font-black text-[13px] tracking-tight transition-colors duration-300 ${Number(business.vat_registered) === 1 ? "text-blue-700" : "text-slate-700"}`}>
                          {Number(business.vat_registered) === 1 ? "Registered for VAT" : "Not Registered"}
                        </span>
                        <span className={`text-[11px] font-medium mt-0.5 transition-colors duration-300 ${Number(business.vat_registered) === 1 ? "text-blue-500" : "text-slate-500"}`}>
                          {Number(business.vat_registered) === 1 ? "System will apply 18% Tax to sales" : "System will apply 0% Tax"}
                        </span>
                      </div>
                  
                      <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ease-in-out shadow-inner ${Number(business.vat_registered) === 1 ? 'bg-blue-600' : 'bg-slate-300'}`}>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.2)] ring-0 transition duration-300 ease-in-out ${Number(business.vat_registered) === 1 ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </button>
                  </div>

                  <div className="pt-2">
                    <label className={labelClass}>Receipt Footer Message</label>
                    <textarea name="receipt_message" value={business.receipt_message} onChange={(e) => setBusiness({...business, receipt_message: e.target.value})} rows="2" className={`${inputClass} resize-none`} placeholder="Thank you for shopping with us!"></textarea>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:-translate-y-0.5 flex items-center justify-center min-w-[180px]">
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Business Settings'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-2xl">
              <div className="mb-5">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Personal Profile</h2>
                <p className="text-slate-500 text-[13px] mt-1 font-medium">Update your login credentials and personal details.</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-200/60 rounded-2xl p-5 sm:p-6 space-y-5">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input type="text" required value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" required value={profile.email} onChange={(e) => setProfile({...profile, email: e.target.value})} className={inputClass} />
                </div>

                <div className="pt-5 border-t border-slate-100">
                  <h3 className="text-[14px] font-black tracking-tight text-slate-800 mb-3">Security</h3>
                  <label className={labelClass}>
                    New Password <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">(Leave blank to keep current)</span>
                  </label>
                  
                  <div className="relative w-full">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={profile.password} 
                      onChange={(e) => setProfile({...profile, password: e.target.value})} 
                      className={`${inputClass} pr-12`} 
                      placeholder="••••••••" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl transition-all shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:-translate-y-0.5 flex items-center justify-center min-w-[180px]">
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. TEAM TAB */}
          {activeTab === 'team' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Team Management</h2>
                <p className="text-slate-500 text-[14px] mt-1">Add cashiers or additional admins to your business.</p>
              </div>
              
              {/* Add Member Box (Clean, no background container) */}
              <div className="mb-8">
                <h3 className="text-[15px] font-bold text-slate-900 mb-4">Add New Member</h3>
                
                <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <input type="text" required value={newMember.name} onChange={(e) => setNewMember({...newMember, name: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                    <input type="email" required value={newMember.email} onChange={(e) => setNewMember({...newMember, email: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required minLength="6" 
                        value={newMember.password} 
                        onChange={(e) => setNewMember({...newMember, password: e.target.value})} 
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm shadow-sm pr-10" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
                    <select required value={newMember.role} onChange={(e) => setNewMember({...newMember, role: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm appearance-none shadow-sm cursor-pointer">
                      <option value="Cashier">Cashier (Sales Only)</option>
                      <option value="Manager">Manager (No Delete/Settings)</option>
                      <option value="Admin">Admin (Full Access)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex justify-end mt-4">
                    <button type="submit" disabled={loading} className="w-full sm:w-auto px-6 py-2.5 bg-[#1e293b] hover:bg-slate-900 text-white font-bold rounded-xl transition-colors text-sm flex items-center justify-center min-w-[150px]">
                      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '+ Create Account'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Team Table (Reduced Padding) */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap min-w-[600px]">
                    <thead className="bg-[#f8fafc] border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Name & Email</th>
                        <th className="px-4 py-2.5">Role & Status</th>
                        <th className="px-4 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {team.map((member) => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 text-[13px]">{member.name}</div>
                            <div className="text-[12px] text-slate-500 mt-0.5">{member.email}</div>
                          </td>
                          <td className="px-4 py-3">
                             <div className="flex flex-col items-start gap-1.5">
                               <div className="flex items-center gap-2">
                                 <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${member.role === 'Admin' ? 'bg-[#f3e8ff] text-[#7e22ce]' : 'bg-[#e0e7ff] text-[#1d4ed8]'}`}>
                                   {member.role}
                                 </span>
                                 <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${member.status === 'active' ? 'bg-[#dcfce7] text-[#15803d]' : 'bg-amber-100 text-amber-700'}`}>
                                   {member.status === 'pending' ? 'Pending Verification' : (member.status || 'Active')}
                                 </span>
                               </div>
                               
                               {/* --- NEW: Resend Email Logic --- */}
                               {member.status === 'pending' && (
                                 resendingId === member.id ? (
                                   <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 ml-1">
                                     <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                                     Sending...
                                   </span>
                                 ) : (
                                   <button 
                                     onClick={() => handleResendVerification(member.id, member.email)}
                                     className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline hover:no-underline ml-1 transition-colors"
                                   >
                                     Resend verification email
                                   </button>
                                 )
                               )}
                               {/* ------------------------------- */}
                             </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button onClick={() => openEditModal(member)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Edit Profile">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                              </button>
                              
                              {member.role !== 'Admin' && (
                                <button onClick={() => handleDeleteMember(member.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Revoke Access">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'billing' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 max-w-3xl">
              <div className="mb-5">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Billing & Subscription</h2>
                <p className="text-slate-500 text-[13px] mt-1 font-medium">Manage your current plan, view invoice history, and check limits.</p>
              </div>

              <div className="bg-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.03)] border border-slate-200/60 rounded-2xl p-5 sm:p-6 space-y-6">
                {!billing ? (
                  <div className="p-10 flex justify-center"><div className="w-6 h-6 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div></div>
                ) : (
                  <>
                    <div className="flex justify-between items-center pb-5 border-b border-slate-100">
                      <div>
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Plan</h3>
                        <p className="text-xl font-black text-blue-600 uppercase tracking-tight">{billing.plan_tier || ''} Plan</p>
                      </div>
                      <div className="text-right">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Status</h3>
                        <span className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg border ${
                          billing.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {billing.status || 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subscription Ends</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{billing.subscription_ends_at || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Users Limit</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{billing.current_users || 0} / <span className="text-slate-400">{billing.max_users || 0}</span></p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branches Limit</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{billing.current_branches || 0} / <span className="text-slate-400">{billing.max_branches || 0}</span></p>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                       <button className="w-full sm:w-auto px-6 py-3 bg-[#0B2B5E] hover:bg-blue-900 text-white text-[13px] font-bold rounded-xl transition-all shadow-[0_4px_12px_rgba(11,43,94,0.2)] hover:-translate-y-0.5">
                         Contact Support to Renew/Upgrade
                       </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- EDIT MEMBER MODAL --- */}
      {isEditModalOpen && editMember && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md my-auto overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="px-6 py-5 border-b border-slate-100/80 flex justify-between items-center">
              <div>
                <h3 className="text-[16px] font-black text-slate-800 tracking-tight">Edit Team Member</h3>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">Modify permissions and access</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 p-2 rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" required value={editMember.name} onChange={(e) => setEditMember({...editMember, name: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" required value={editMember.email} onChange={(e) => setEditMember({...editMember, email: e.target.value})} className={inputClass} />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>System Role</label>
                  <select required value={editMember.role} onChange={(e) => setEditMember({...editMember, role: e.target.value})} className={`${inputClass} appearance-none cursor-pointer`}>
                    <option value="Cashier">Cashier</option>
                    <option value="Manager">Manager</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Account Status</label>
                  <select required value={editMember.status || 'active'} onChange={(e) => setEditMember({...editMember, status: e.target.value})} className={`${inputClass} appearance-none cursor-pointer`}>
                    <option value="active">Active Access</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100/80">
                <label className={labelClass}>Force Password Reset <span className="normal-case tracking-normal font-medium text-slate-400 ml-1">(Optional)</span></label>
                <input type="password" minLength="6" value={editMember.password} onChange={(e) => setEditMember({...editMember, password: e.target.value})} className={inputClass} placeholder="Leave blank to keep unchanged" />
              </div>
              
              <div className="mt-8 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-3 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-6 py-3 text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:-translate-y-0.5 flex items-center justify-center min-w-[140px]">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Update Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}