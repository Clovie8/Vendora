import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { hqFetch } from '../config/hq-api';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

// Enterprise Top-Right Toast Notification
const Toast = Swal.mixin({
  toast: true, 
  position: 'top-end', 
  showConfirmButton: false, 
  timer: 3000,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

// Reusable SVG Spinner
const Spinner = ({ className = "" }) => (
  <svg className={`animate-spin w-4 h-4 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
    <path className="opacity-75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10"></path>
  </svg>
);

// Reusable HQ Sidebar Link Component
function HQSidebarLink({ onClick, label, children, active, isCollapsed }) {
  return (
    <button 
      onClick={onClick} 
      title={isCollapsed ? label : ""} 
      className={`w-full flex items-center transition-all duration-300 border-l-4 overflow-hidden ${
        active 
          ? 'border-emerald-500 text-emerald-400 bg-gradient-to-r from-emerald-500/10 to-transparent' 
          : 'border-transparent text-white/60 hover:text-white hover:bg-white/5 hover:border-white/20'
      } ${isCollapsed ? 'justify-center px-0 py-3.5' : 'gap-3 px-6 py-3'}`}
    >
      <div className="flex-shrink-0 flex items-center justify-center">
        {children}
      </div>
      {!isCollapsed && (
        <span className="font-medium text-[14px] whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}
    </button>
  );
}

// --- NEW: Mobile Bottom Navigation Link ---
function BottomNavLink({ onClick, active, children, label, isDanger }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full py-1 transition-colors ${
        isDanger ? 'text-red-400 hover:text-red-300' :
        active ? 'text-emerald-400' : 'text-white/50 hover:text-white'
      }`}
    >
      <div className={`transition-all duration-300 ${active ? 'bg-emerald-500/20 p-1.5 rounded-xl mb-0.5' : 'p-1 mb-1'}`}>
        {children}
      </div>
      <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-emerald-400' : ''}`}>{label}</span>
    </button>
  );
}

export default function VendoraHQ() {
  useDocumentTitle('Vendora HQ | Super Admin');
  const navigate = useNavigate();

  // --- NEW: UI STATE ---
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // For modal forms
  const [actionId, setActionId] = useState(null); // For individual row buttons

  const [users, setUsers] = useState([]);
  const [billingData, setBillingData] = useState({ companies: [], kpis: { healthy: 0, at_risk: 0, expired: 0, mrr_at_risk: 0 } });
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewData, setRenewData] = useState({ company_id: '', company_name: '', months: 1, method: 'momo' });

  // User Search & Filter State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [processingEmail, setProcessingEmail] = useState({ email: null, type: null });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [stats, setStats] = useState({ 
    activeCompanies: 0, trialCompanies: 0, suspendedCompanies: 0, mrr: 0, 
    transactionsToday: 0, topStores: [], heaviestUsers: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedTenant, setSelectedTenant] = useState(null); 
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeData, setUpgradeData] = useState({ company_id: '', plan_tier: 'pro', max_users: 10, max_branches: 3 });
  
  const [companies, setCompanies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({ 
    name: '', email: '', password: '', plan_tier: 'basic', max_users: 5, max_branches: 1 
  });

  // --- AUTH & HEADERS ---
  const handleLogout = async (silent = false) => {
    try { await hqFetch('logout', { method: 'POST', credentials: 'include' }); } catch (e) {}
    localStorage.removeItem('vendora_hq_user');
    if (!silent) Toast.fire({ icon: 'info', title: 'Terminal Locked.' });
    navigate('/hq-login');
  };

  const getHeaders = () => ({ 'Content-Type': 'application/json' });

  // --- LIFECYCLE ---
  useEffect(() => {
    if (activeTab === 'dashboard') fetchHQStats();
    if (activeTab === 'tenants') fetchTenants();
    if (activeTab === 'users') fetchUsers(); 
    if (activeTab === 'billing') fetchBilling(); 
  }, [activeTab]);

  // --- API CALLS ---
  const fetchHQStats = async () => {
    setIsLoading(true);
    try {
      const res = await hqFetch('hq_dashboard_stats', { credentials: 'include', headers: getHeaders() });
      if (res.status === 'success') {
        setStats(res.data);
      } else {
        if (res.message?.toLowerCase().includes('expired') || res.message?.toLowerCase().includes('denied')) handleLogout(true);
        else Toast.fire({ icon: 'error', title: res.message });
      }
    } catch (error) { Toast.fire({ icon: 'error', title: 'Could not reach the HQ server.' }); } 
    finally { setIsLoading(false); }
  };

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await hqFetch('hq_get_tenants', { credentials: 'include', headers: getHeaders() });
      if (res.status === 'success') setCompanies(res.data);
      else Toast.fire({ icon: 'error', title: res.message });
    } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); } 
    finally { setIsLoading(false); }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await hqFetch('hq_get_users', { credentials: 'include', headers: getHeaders() });
      if (res.status === 'success') setUsers(res.data);
    } catch (err) {} finally { setIsLoading(false); }
  };

  const handleResetPassword = async (userId, userName) => {
    const confirm = await Swal.fire({
      title: `Reset password for ${userName}?`,
      text: "This will instantly generate a new secure password.",
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Generate Password'
    });

    if (confirm.isConfirmed) {
      setActionId(`reset-${userId}`);
      try {
        const res = await hqFetch('hq_override_password', {
          method: 'POST', credentials: 'include', headers: getHeaders(), body: JSON.stringify({ user_id: userId })
        });
        if (res.status === 'success') {
          Swal.fire({
            title: 'Password Reset Successful!',
            html: `Copy this temporary password and send it to the user:<br><br><b style="font-size: 24px; letter-spacing: 2px; color: #059669; background: #ecfdf5; padding: 10px 20px; border-radius: 8px; border: 1px solid #10b981;">${res.new_password}</b>`,
            icon: 'success'
          });
        } else Toast.fire({ icon: 'error', title: res.message });
      } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); }
      finally { setActionId(null); }
    }
  };

  const handleToggleUser = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    setActionId(`toggle-user-${userId}`);
    try {
      const res = await hqFetch('hq_toggle_user', {
        method: 'POST', credentials: 'include', headers: getHeaders(), body: JSON.stringify({ user_id: userId, status: newStatus })
      });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: res.message });
        fetchUsers();
      } else Toast.fire({ icon: 'error', title: res.message });
    } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); }
    finally { setActionId(null); }
  };

  const handleSendResetLink = async (email) => {
    setProcessingEmail({ email: email, type: 'reset' });
    try {
      const res = await hqFetch('hq_send_reset', {
        method: 'POST', credentials: 'include', headers: getHeaders(), body: JSON.stringify({ email: email })
      });
      if (res.status === 'success') Toast.fire({ icon: 'success', title: res.message });
      else Toast.fire({ icon: 'error', title: res.message });
    } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); } 
    finally { setProcessingEmail({ email: null, type: null }); }
  };

  const handleSendVerification = async (email) => {
    setProcessingEmail({ email: email, type: 'verify' });
    try {
      const res = await hqFetch('hq_send_verify', {
        method: 'POST', credentials: 'include', headers: getHeaders(), body: JSON.stringify({ email: email })
      });
      if (res.status === 'success') Toast.fire({ icon: 'success', title: res.message });
      else Toast.fire({ icon: 'error', title: res.message });
    } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); } 
    finally { setProcessingEmail({ email: null, type: null }); }
  };

  const fetchBilling = async () => {
    setIsLoading(true);
    try {
      const res = await hqFetch('hq_get_billing', { credentials: 'include', headers: getHeaders() });
      if (res.status === 'success') setBillingData(res.data);
    } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); } 
    finally { setIsLoading(false); }
  };

  const handleImpersonate = async (userId, userName) => {
    const confirm = await Swal.fire({ 
      title: `Login as ${userName}?`, text: "You will securely bypass their password and access their POS.", 
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, Enter POS' 
    });

    if (confirm.isConfirmed) {
      setActionId(`impersonate-${userId}`);
      try {
        const res = await hqFetch('hq_impersonate_user', { 
          method: 'POST', headers: getHeaders(), credentials: 'include', body: JSON.stringify({ user_id: userId }) 
        });
        if (res.status === 'success') {
          Toast.fire({ icon: 'success', title: 'Session Overridden. Opening POS...' });
          window.open('https://dashboard.vendorapos.app', '_blank'); 
        } else Toast.fire({ icon: 'error', title: res.message });
      } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); }
      finally { setActionId(null); }
    }
  };

  const submitRenewal = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await hqFetch('hq_renew_sub', { 
        method: 'POST', headers: getHeaders(), credentials: 'include', body: JSON.stringify(renewData) 
      });
      if (res.status === 'success') { 
        Toast.fire({ icon: 'success', title: res.message }); 
        setIsRenewModalOpen(false);
        fetchBilling();
      } else Toast.fire({ icon: 'error', title: res.message });
    } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); }
    finally { setIsSubmitting(false); }
  };

  const handleAutoSuspend = async () => {
    setIsSubmitting(true);
    try {
      const res = await hqFetch('hq_run_auto_suspend', { credentials: 'include', headers: getHeaders() });
      if (res.status === 'success') { Toast.fire({ icon: 'info', title: res.message }); fetchBilling(); }
    } catch(e) { Toast.fire({ icon: 'error', title: 'Network Error' }); }
    finally { setIsSubmitting(false); }
  };

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await hqFetch('hq_create_tenant', {
        method: 'POST', headers: getHeaders(), credentials: 'include', body: JSON.stringify(newTenant)
      });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: res.message });
        setIsModalOpen(false);
        setNewTenant({ name: '', email: '', password: '', plan_tier: 'basic', max_users: 5, max_branches: 1 });
        fetchTenants(); 
      } else Toast.fire({ icon: 'error', title: res.message });
    } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); }
    finally { setIsSubmitting(false); }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const confirm = await Swal.fire({
      title: 'Are you sure?', text: `This will instantly ${newStatus === 'suspended' ? 'lock' : 'unlock'} this company's POS.`,
      icon: 'warning', showCancelButton: true, 
      confirmButtonColor: newStatus === 'suspended' ? '#ef4444' : '#10b981', confirmButtonText: `Yes, ${newStatus} it!`
    });

    if (confirm.isConfirmed) {
      setActionId(`toggle-tenant-${id}`);
      try {
        const res = await hqFetch('hq_toggle_tenant', {
          method: 'POST', headers: getHeaders(), credentials: 'include', body: JSON.stringify({ company_id: id, status: newStatus })
        });
        if (res.status === 'success') {
          Toast.fire({ icon: 'success', title: res.message });
          // Update selected tenant locally so drawer reflects it instantly
          setSelectedTenant(prev => prev ? {...prev, status: newStatus} : null);
          fetchTenants();
        } else Toast.fire({ icon: 'error', title: res.message });
      } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); }
      finally { setActionId(null); }
    }
  };

  const handleUpgradePlan = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await hqFetch('hq_update_plan', {
        method: 'POST', credentials: 'include', headers: getHeaders(), body: JSON.stringify(upgradeData)
      });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: res.message });
        setIsUpgradeModalOpen(false);
        fetchTenants(); 
        setSelectedTenant(null); 
      } else Toast.fire({ icon: 'error', title: res.message });
    } catch (err) { Toast.fire({ icon: 'error', title: 'Network Error' }); }
    finally { setIsSubmitting(false); }
  };

  // --- RENDERERS ---
  const renderUsers = () => {
    const filteredUsers = users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                            u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                            (u.company_name && u.company_name.toLowerCase().includes(userSearchQuery.toLowerCase()));
      const matchesRole = userRoleFilter === 'all' || u.role.toLowerCase() === userRoleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });

    return (
      <div className="animate-in fade-in duration-300 relative h-full flex flex-col">
        <div className="mb-4 md:mb-6 shrink-0">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Global User Management</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Audit, assist, and manage access for all platform users.</p>
        </div>

        <div className="bg-white p-3 md:p-4 rounded-t-2xl border border-slate-200 border-b-0 flex flex-col sm:flex-row gap-3 md:gap-4 items-center shrink-0">
          <div className="relative w-full sm:flex-1">
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" placeholder="Search by User Name, Email..." 
              value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none cursor-pointer">
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="manager">Managers</option>
            <option value="cashier">Cashiers</option>
          </select>
        </div>

        <div className="bg-white rounded-b-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 relative">
          <div className="overflow-x-auto h-full custom-scrollbar">
            <table className="w-full min-w-[800px] text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Company & Role</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4 text-right">Support Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{u.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                      {u.company_name} 
                      <span className="block mt-1 text-[10px] uppercase tracking-wider text-slate-400">{u.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${
                        u.status === 'suspended' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {u.status === 'suspended' ? 'Locked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex flex-col items-end gap-2 h-full">
                      <div className="flex gap-2">
                        <button 
                          disabled={actionId === `toggle-user-${u.id}`}
                          onClick={() => handleToggleUser(u.id, u.status)} 
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center justify-center min-w-[90px] transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${u.status === 'suspended' ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100' : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200'}`}
                        >
                          {actionId === `toggle-user-${u.id}` ? <Spinner /> : (u.status === 'suspended' ? 'Unlock' : 'Lock User')}
                        </button>
                        <button 
                          disabled={actionId === `reset-${u.id}`}
                          onClick={() => handleResetPassword(u.id, u.name)} 
                          className="text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 flex items-center justify-center min-w-[120px] rounded-lg border border-amber-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {actionId === `reset-${u.id}` ? <Spinner /> : 'Gen. Password'}
                        </button>
                        <button 
                          onClick={() => handleImpersonate(u.id, u.name)} 
                          disabled={u.status === 'suspended' || actionId === `impersonate-${u.id}`}
                          className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 flex items-center justify-center min-w-[85px] rounded-lg border border-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {actionId === `impersonate-${u.id}` ? <Spinner /> : 'Login As'}
                        </button>
                      </div>

                      <div className="flex gap-4 mt-1">
                        <button 
                          onClick={() => handleSendVerification(u.email)}
                          disabled={processingEmail.email === u.email && processingEmail.type === 'verify'}
                          className="text-[10px] font-bold text-slate-400 hover:text-blue-600 underline decoration-slate-300 hover:decoration-blue-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                        >
                          {processingEmail.email === u.email && processingEmail.type === 'verify' && <Spinner className="w-3 h-3 text-blue-600" />}
                          {processingEmail.email === u.email && processingEmail.type === 'verify' ? 'Sending...' : 'Resend Verification'}
                        </button>

                        <button 
                          onClick={() => handleSendResetLink(u.email)}
                          disabled={processingEmail.email === u.email && processingEmail.type === 'reset'}
                          className="text-[10px] font-bold text-slate-400 hover:text-amber-600 underline decoration-slate-300 hover:decoration-amber-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                        >
                          {processingEmail.email === u.email && processingEmail.type === 'reset' && <Spinner className="w-3 h-3 text-amber-600" />}
                          {processingEmail.email === u.email && processingEmail.type === 'reset' ? 'Sending...' : 'Email Reset Link'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && !isLoading && (
                   <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400 font-bold">No users match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderBilling = () => (
    <div className="animate-in fade-in duration-300 relative h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Billing & Subscriptions</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Track expiry dates, collect revenue, and enforce payments.</p>
        </div>
        <button 
          onClick={handleAutoSuspend} 
          disabled={isSubmitting}
          className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 disabled:opacity-70 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-bold shadow-sm text-sm transition-colors flex justify-center items-center gap-2"
        >
          {isSubmitting ? <Spinner className="w-5 h-5" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          {isSubmitting ? 'Running Engine...' : 'Run Auto-Suspend Engine'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 shrink-0">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
          <div><p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Healthy Accounts</p><h3 className="text-xl md:text-2xl font-black text-slate-800">{billingData.kpis.healthy}</h3></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0"><svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
          <div><p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiring Soon</p><h3 className="text-xl md:text-2xl font-black text-slate-800">{billingData.kpis.at_risk} <span className="text-xs md:text-sm font-bold text-amber-500 ml-1">(Rwf {billingData.kpis.mrr_at_risk.toLocaleString()})</span></h3></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0"><svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
          <div><p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue</p><h3 className="text-xl md:text-2xl font-black text-slate-800">{billingData.kpis.expired}</h3></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 relative">
        <div className="overflow-x-auto h-full custom-scrollbar">
          <table className="w-full min-w-[700px] text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200">
              <tr><th className="px-6 py-4">Company</th><th className="px-6 py-4">Current Plan</th><th className="px-6 py-4">Subscription Health</th><th className="px-6 py-4 text-right">Log Payment</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {billingData.companies.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{b.name}</td>
                  <td className="px-6 py-4 uppercase text-[10px] font-black text-slate-500 tracking-wider">{b.plan_tier} Plan</td>
                  <td className="px-6 py-4">
                    {b.days_left < 0 ? (
                      <span className="text-red-600 bg-red-50 font-bold px-2.5 py-1.5 rounded-lg text-xs border border-red-100 flex items-center w-fit gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Overdue ({Math.abs(b.days_left)} days)</span>
                    ) : b.days_left <= 7 ? (
                      <span className="text-amber-600 bg-amber-50 font-bold px-2.5 py-1.5 rounded-lg text-xs border border-amber-100 flex items-center w-fit gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Expiring ({b.days_left} days)</span>
                    ) : (
                      <span className="text-emerald-600 bg-emerald-50 font-bold px-2.5 py-1.5 rounded-lg text-xs border border-emerald-100 flex items-center w-fit gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Healthy ({b.days_left} days left)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => { setRenewData({ company_id: b.id, company_name: b.name, months: 1, method: 'momo' }); setIsRenewModalOpen(true); }} 
                      className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg border border-blue-100 transition-colors"
                    >
                      Process Renewal
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RENEWAL MODAL */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-slate-800">Log Payment</h3>
                <p className="text-xs font-bold text-slate-400">{renewData.company_name}</p>
              </div>
              <button onClick={() => setIsRenewModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submitRenewal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Extension Period</label>
                <select value={renewData.months} onChange={e => setRenewData({...renewData, months: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                  <option value="1">1 Month</option>
                  <option value="6">6 Months (Half Year)</option>
                  <option value="12">12 Months (Full Year)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
                <select value={renewData.method} onChange={e => setRenewData({...renewData, method: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                  <option value="momo">MTN Mobile Money</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash Payment</option>
                </select>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#0B2B5E] hover:bg-blue-900 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl mt-4 transition-all flex justify-center items-center">
                {isSubmitting ? <><Spinner className="mr-2" /> Renewing...</> : 'Confirm & Renew'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderDashboard = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Global SaaS Overview</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Real-time infrastructure and financial health.</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold">
            <Spinner className="w-4 h-4 text-blue-600" /> Syncing Data...
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tenant Status</p>
          <div className="flex items-end gap-2">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800">{stats.activeCompanies}</h3>
            <span className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5">Paid</span>
          </div>
          <div className="mt-3 flex gap-2 text-[10px] md:text-xs font-bold">
            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">{stats.trialCompanies} Trial</span>
            <span className="bg-red-50 text-red-600 px-2 py-1 rounded">{stats.suspendedCompanies} Churned</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Revenue (MRR)</p>
          <h3 className="text-2xl md:text-3xl font-black text-emerald-600">Rwf {Number(stats.mrr).toLocaleString()}</h3>
          <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-2">Estimated Monthly Income</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Global System Load</p>
          <h3 className="text-2xl md:text-3xl font-black text-amber-600">{stats.transactionsToday}</h3>
          <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-2">Transactions Processed Today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-black text-sm md:text-base text-slate-800">🔥 Top Active Stores (Today)</h3>
            <span className="text-[10px] md:text-xs font-bold text-slate-400">By Txn Volume</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
            {stats.topStores && stats.topStores.length > 0 ? stats.topStores.map((store, i) => (
              <div key={i} className="p-3 md:p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] md:text-xs font-black">{i + 1}</div>
                  <span className="font-bold text-slate-700 text-xs md:text-sm">{store.name}</span>
                </div>
                <span className="text-[10px] md:text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                  {store.txn_count} Sales
                </span>
              </div>
            )) : <div className="p-6 text-center text-xs md:text-sm font-bold text-slate-400">No transactions recorded today yet.</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-black text-sm md:text-base text-slate-800">💾 Heaviest Data Tenants</h3>
            <span className="text-[10px] md:text-xs font-bold text-slate-400">By Database Size</span>
          </div>
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
            {stats.heaviestUsers && stats.heaviestUsers.length > 0 ? stats.heaviestUsers.map((user, i) => (
              <div key={i} className="p-3 md:p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 md:w-6 md:h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] md:text-xs font-black">{i + 1}</div>
                  <span className="font-bold text-slate-700 text-xs md:text-sm">{user.name}</span>
                </div>
                <span className="text-[10px] md:text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                  {user.product_count} Products Saved
                </span>
              </div>
            )) : <div className="p-6 text-center text-xs md:text-sm font-bold text-slate-400">No products found.</div>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTenants = () => {
    const filteredCompanies = companies.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (c.owner_email && c.owner_email.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return (
      <div className="animate-in fade-in duration-300 relative h-full flex flex-col">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Tenant Management</h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Provision, upgrade, and monitor client resources.</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            Provision New Tenant
          </button>
        </div>
        
        <div className="bg-white p-3 md:p-4 rounded-t-2xl border border-slate-200 border-b-0 flex flex-col sm:flex-row gap-3 md:gap-4 items-center shrink-0">
          <div className="relative w-full sm:flex-1">
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" placeholder="Search by Company Name or Admin Email..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-auto px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none cursor-pointer">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="trial">Trial</option>
          </select>
        </div>

        <div className="bg-white rounded-b-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 relative">
          <div className="overflow-x-auto h-full custom-scrollbar">
            <table className="w-full min-w-[600px] text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-6 py-4">Company Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Plan Tier</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCompanies.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => setSelectedTenant(c)}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{c.owner_email || 'No Admin Email'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        c.status === 'suspended' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>{c.status}</span>
                    </td>
                    <td className="px-6 py-4 uppercase text-xs font-black text-slate-500">{c.plan_tier}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedTenant(c); }} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100">
                        View Deep Dive
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCompanies.length === 0 && !isLoading && (
                   <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400 font-bold">No tenants match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* THE DEEP DIVE DRAWER */}
          {selectedTenant && (
            <div className="absolute top-0 right-0 h-full w-full sm:w-96 bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.05)] border-l border-slate-200 p-5 md:p-6 z-20 animate-in slide-in-from-right-full duration-300 flex flex-col">
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight pr-4">{selectedTenant.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedTenant.plan_tier} Plan</p>
                </div>
                <button onClick={() => setSelectedTenant(null)} className="p-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-500 shrink-0">✕</button>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-wider">Resource Usage</h4>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-700">Staff Accounts</span>
                      <span className={selectedTenant.current_users >= selectedTenant.max_users ? "text-red-500" : "text-emerald-600"}>
                        {selectedTenant.current_users} / {selectedTenant.max_users} Used
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((selectedTenant.current_users / selectedTenant.max_users) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-600">Total Products Hosted</span>
                    <span className="text-lg font-black text-blue-600">{selectedTenant.current_products}</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-wider">Account Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-bold text-slate-500 flex flex-col sm:inline">Owner Email: </span><span className="font-semibold text-slate-800">{selectedTenant.owner_email || 'N/A'}</span></p>
                    <p><span className="font-bold text-slate-500">Sub Expires: </span><span className="font-semibold text-slate-800">{selectedTenant.subscription_ends_at}</span></p>
                    <p><span className="font-bold text-slate-500">Join Date: </span><span className="font-semibold text-slate-800">{selectedTenant.created_at}</span></p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2 shrink-0">
                <button 
                  onClick={() => { setUpgradeData({ company_id: selectedTenant.id, plan_tier: 'pro', max_users: 10, max_branches: 3 }); setIsUpgradeModalOpen(true); }} 
                  className="w-full py-2.5 bg-[#0B2B5E] hover:bg-blue-900 text-white text-sm font-bold rounded-xl transition-colors">
                  Upgrade Plan Limits
                </button>
                <button 
                  disabled={actionId === `toggle-tenant-${selectedTenant.id}`}
                  onClick={() => handleToggleStatus(selectedTenant.id, selectedTenant.status)} 
                  className={`w-full py-2.5 text-sm font-bold rounded-xl flex justify-center items-center transition-colors border disabled:opacity-70 disabled:cursor-not-allowed ${selectedTenant.status === 'suspended' ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'}`}>
                  {actionId === `toggle-tenant-${selectedTenant.id}` ? <Spinner /> : (selectedTenant.status === 'suspended' ? 'Reactivate Tenant' : 'Suspend Tenant')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* UPGRADE MODAL */}
        {isUpgradeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">Upgrade Tenant</h3>
                <button onClick={() => setIsUpgradeModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <form onSubmit={handleUpgradePlan} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Plan Tier</label>
                  <select value={upgradeData.plan_tier} onChange={e => setUpgradeData({...upgradeData, plan_tier: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                    <option value="basic">Basic</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Max Users</label>
                    <input type="number" min="1" value={upgradeData.max_users} onChange={e => setUpgradeData({...upgradeData, max_users: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Max Branches</label>
                    <input type="number" min="1" value={upgradeData.max_branches} onChange={e => setUpgradeData({...upgradeData, max_branches: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold" />
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl mt-4 transition-colors flex justify-center items-center">
                  {isSubmitting ? <><Spinner className="mr-2" /> Applying...</> : 'Apply Upgrade'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CREATION MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg sm:text-xl font-black text-slate-800">Provision New Tenant</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleCreateTenant} className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Company Name</label>
                  <input type="text" required value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})} className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Owner Email</label>
                    <input type="email" required value={newTenant.email} onChange={e => setNewTenant({...newTenant, email: e.target.value})} className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Temp Password</label>
                    <input type="text" required value={newTenant.password} onChange={e => setNewTenant({...newTenant, password: e.target.value})} className="w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4 border-t border-slate-100 pt-4 mt-2">
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Plan Tier</label>
                    <select value={newTenant.plan_tier} onChange={e => setNewTenant({...newTenant, plan_tier: e.target.value})} className="w-full px-2 py-2 sm:px-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs sm:text-sm font-bold">
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Max Users</label>
                    <input type="number" min="1" required value={newTenant.max_users} onChange={e => setNewTenant({...newTenant, max_users: e.target.value})} className="w-full px-2 py-2 sm:px-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs sm:text-sm font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Max Branches</label>
                    <input type="number" min="1" required value={newTenant.max_branches} onChange={e => setNewTenant({...newTenant, max_branches: e.target.value})} className="w-full px-2 py-2 sm:px-3 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs sm:text-sm font-bold" />
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-[#0B2B5E] hover:bg-blue-900 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl mt-4 transition-colors flex justify-center items-center">
                  {isSubmitting ? <><Spinner className="mr-2" /> Provisioning...</> : 'Provision Infrastructure'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- MAIN LAYOUT ---
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans">
      
      {/* MOBILE TOP NAVBAR (Visible only on small screens) */}
      <div className="md:hidden bg-[#0B2B5E] text-white p-4 flex justify-between items-center z-30 shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="Vendora Logo" className="w-8 h-8" />
          <h1 className="text-lg font-black tracking-tight leading-none">Vendora HQ</h1>
        </div>
        {/* Hamburger Menu removed - Handled by Bottom Nav now! */}
      </div>

      {/* SIDEBAR (DESKTOP ONLY NOW: hidden md:flex) */}
      <div className={`hidden md:flex flex-col shrink-0 shadow-xl transition-all duration-300 bg-[#0B2B5E] text-white ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        
        {/* Header / Logo */}
        <div className={`p-6 border-b border-white/10 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/favicon.png" alt="Vendora Logo" className="w-10 h-10" />
            {!isSidebarCollapsed && (
              <div className="animate-in fade-in duration-300">
                <h1 className="text-xl font-black tracking-tight leading-none">Vendora</h1>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Super Admin</span>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="w-full flex justify-center py-2 bg-black/10 hover:bg-black/20 text-white/50 hover:text-white transition-colors border-b border-white/10"
        >
          <svg className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>

        {/* Desktop Navigation */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <HQSidebarLink onClick={() => setActiveTab('dashboard')} label="Dashboard" active={activeTab === 'dashboard'} isCollapsed={isSidebarCollapsed}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </HQSidebarLink>
          <HQSidebarLink onClick={() => setActiveTab('tenants')} label="Tenants" active={activeTab === 'tenants'} isCollapsed={isSidebarCollapsed}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </HQSidebarLink>
          <HQSidebarLink onClick={() => setActiveTab('users')} label="Global Users" active={activeTab === 'users'} isCollapsed={isSidebarCollapsed}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </HQSidebarLink>
          <HQSidebarLink onClick={() => setActiveTab('billing')} label="Billing" active={activeTab === 'billing'} isCollapsed={isSidebarCollapsed}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          </HQSidebarLink>
        </nav>

        {/* Desktop Footer (Lock Terminal) */}
        <div className="p-4 border-t border-white/10 mt-auto">
          <button 
            onClick={() => handleLogout(false)} 
            title={isSidebarCollapsed ? "Lock Terminal" : ""}
            className={`w-full flex items-center justify-center py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20 ${isSidebarCollapsed ? 'px-0' : 'gap-2 px-4'}`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            {!isSidebarCollapsed && <span className="text-xs font-bold whitespace-nowrap">Lock Terminal</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      {/* Notice the pb-24 (Padding Bottom) added here so content isn't hidden behind the mobile nav! */}
      <div className="flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-8 custom-scrollbar relative z-10">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'tenants' && renderTenants()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'billing' && renderBilling()}
      </div>

      {/* --- NEW: MOBILE BOTTOM NAVIGATION --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0B2B5E] border-t border-white/10 flex justify-around items-end px-2 pt-1 pb-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
        <BottomNavLink onClick={() => setActiveTab('dashboard')} active={activeTab === 'dashboard'} label="Home">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
        </BottomNavLink>
        
        <BottomNavLink onClick={() => setActiveTab('tenants')} active={activeTab === 'tenants'} label="Tenants">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </BottomNavLink>
        
        <BottomNavLink onClick={() => setActiveTab('users')} active={activeTab === 'users'} label="Users">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </BottomNavLink>
        
        <BottomNavLink onClick={() => setActiveTab('billing')} active={activeTab === 'billing'} label="Billing">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        </BottomNavLink>
        
        <BottomNavLink onClick={() => handleLogout(false)} isDanger label="Lock">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </BottomNavLink>
      </div>

    </div>
  );
}