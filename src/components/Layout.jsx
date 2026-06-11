import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../config/api';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Loading...');
  const [userRole, setUserRole] = useState(null); 
  const [isVatRegistered, setIsVatRegistered] = useState(true); 
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  
  // UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // NEW: Desktop Collapse State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(location.pathname.includes('/reports'));

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await apiFetch('get_profile');
        if (res.status === 'success') {
          setUserName(res.data.name);
          setUserRole(res.data.role); 
        } else {
          navigate('/login', { replace: true });
        }

        const compRes = await apiFetch('get_company');
        if (compRes.status === 'success' && compRes.data) {
           setIsVatRegistered(compRes.data.vat_registered == 1);
        }
      } catch (err) {
        navigate('/login', { replace: true });
      }
    };
    fetchInitialData();
  }, [navigate]);

  useEffect(() => {
    if (userRole === 'Cashier' && location.pathname !== '/pos') {
      navigate('/pos', { replace: true });
    }
    if (userRole === 'Manager' && location.pathname === '/settings') {
      navigate('/', { replace: true }); // Send them to Dashboard
    }
    setIsMobileMenuOpen(false);
  }, [location.pathname, userRole, navigate]);

  const handleLogout = async () => {
    try {
      await apiFetch('logout');
      setIsDropdownOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      navigate('/login', { replace: true });
    }
  };

  const isActive = (path) => location.pathname === path;
  const isReportActive = (type) => location.pathname === `/reports/${type}`;

  const pageTitle = location.pathname === '/' ? 'Dashboard' 
                  : location.pathname === '/pos' ? 'Point of Sale' 
                  : location.pathname.substring(1).replace('_', ' ').replace(/\//g, ' > ');

  if (!userRole) return <div className="h-screen w-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-20 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* --- SIDEBAR --- */}
      <div 
        className={`fixed inset-y-0 left-0 bg-[#1e293b] text-white flex flex-col z-30 transform transition-all duration-300 ease-in-out shadow-2xl md:shadow-none md:relative
          ${isMobileMenuOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0'} 
          ${isSidebarCollapsed ? 'md:w-[84px]' : 'md:w-[260px]'}
        `}
      >
        {/* Sidebar Header / Logo */}
        <div className={`p-6 border-b border-slate-700/50 flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between gap-3'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 bg-blue-600/20 p-1.5 rounded-lg">
              <img src="/favicon.png" alt="Vendora Logo" className="w-10 h-10" />
            </div>
            {!isSidebarCollapsed && (
              <span className="text-xl font-black tracking-wider uppercase whitespace-nowrap animate-in fade-in duration-300">Vendora</span>
            )}
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          
          {/* SECURE SIDEBAR: Admins and Managers see the Dashboard */}
          {(userRole === 'Admin' || userRole === 'Manager') && (
            <SidebarLink to="/" label="Dashboard" active={isActive('/')} isCollapsed={isSidebarCollapsed}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </SidebarLink>
          )}
          
          {/* POS is visible to everyone */}
          <SidebarLink to="/pos" label="Point of Sale" active={isActive('/pos')} isCollapsed={isSidebarCollapsed}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
          </SidebarLink>

          {/* SECURE SIDEBAR: Hidden from Cashiers. Visible to Admins and Managers. */}
          {(userRole === 'Admin' || userRole === 'Manager') && (
            <>
              <div>
                <button 
                  onClick={() => {
                    // If collapsed, clicking Inventory expands the sidebar automatically
                    if (isSidebarCollapsed) {
                      setIsSidebarCollapsed(false);
                      setIsInventoryOpen(true);
                    } else {
                      setIsInventoryOpen(!isInventoryOpen);
                    }
                  }}
                  title={isSidebarCollapsed ? "Inventory" : ""}
                  className={`w-full flex items-center transition-all duration-300 border-l-4 overflow-hidden ${
                    location.pathname.includes('/inventory') || location.pathname.includes('/serials')
                      ? 'border-blue-500 text-blue-400 bg-gradient-to-r from-blue-500/10 to-transparent' 
                      : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 hover:border-slate-700'
                  } ${isSidebarCollapsed ? 'justify-center px-0 py-3.5' : 'justify-between px-6 py-3'}`}
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                    </svg>
                    {!isSidebarCollapsed && <span className="font-medium text-[14px] whitespace-nowrap">Inventory</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isInventoryOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  )}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${isInventoryOpen && !isSidebarCollapsed ? 'max-h-100 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-slate-900/50 py-2 space-y-1">
                    <SubSidebarLink to="/inventory" label="Products List" active={location.pathname === '/inventory'} />
                    <SubSidebarLink to="/serials" label="Serial Tracking" active={location.pathname === '/serials'} />
                    <SubSidebarLink to="/batches" label="Batch Management" active={location.pathname === '/batches'} />
                  </div>
                </div>
              </div>

              <SidebarLink to="/sales" label="Sales History" active={isActive('/sales')} isCollapsed={isSidebarCollapsed}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
              </SidebarLink>
              
              <SidebarLink to="/purchases" label="Purchases" active={isActive('/purchases')} isCollapsed={isSidebarCollapsed}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              </SidebarLink>
              
              <SidebarLink to="/expenses" label="Expenses" active={isActive('/expenses')} isCollapsed={isSidebarCollapsed}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </SidebarLink>

              <SidebarLink to="/credits" label="Credit Management" active={isActive('/credits')} isCollapsed={isSidebarCollapsed}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
              </SidebarLink>

              <SidebarLink to="/proformas" label="Proforma Invoices" active={isActive('/proformas')} isCollapsed={isSidebarCollapsed}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </SidebarLink>
              
              <div>
                <button 
                  onClick={() => {
                    // If collapsed, clicking Reports expands the sidebar automatically
                    if (isSidebarCollapsed) {
                      setIsSidebarCollapsed(false);
                      setIsReportsOpen(true);
                    } else {
                      setIsReportsOpen(!isReportsOpen);
                    }
                  }}
                  title={isSidebarCollapsed ? "Reports" : ""}
                  className={`w-full flex items-center transition-all duration-300 border-l-4 overflow-hidden ${
                    location.pathname.includes('/reports')
                      ? 'border-blue-500 text-blue-400 bg-gradient-to-r from-blue-500/10 to-transparent' 
                      : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 hover:border-slate-700'
                  } ${isSidebarCollapsed ? 'justify-center px-0 py-3.5' : 'justify-between px-6 py-3'}`}
                >
                  <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    {!isSidebarCollapsed && <span className="font-medium text-[14px] whitespace-nowrap">Reports</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isReportsOpen ? 'rotate-180 text-blue-400' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  )}
                </button>
                
                <div className={`overflow-hidden transition-all duration-300 ${isReportsOpen && !isSidebarCollapsed ? 'max-h-100 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-slate-900/50 py-2 space-y-1">
                    {isVatRegistered && (
                      <SubSidebarLink to="/reports/tax" label="VAT Declaration" active={isReportActive('tax')} />
                    )}
                    <SubSidebarLink to="/reports/financial" label="Income & Expense" active={isReportActive('financial')} />
                    <SubSidebarLink to="/reports/valuation" label="Stock Valuation" active={isReportActive('valuation')} />
                    <SubSidebarLink to="/reports/low_stock" label="Low Stock Alerts" active={isReportActive('low_stock')} />
                    <SubSidebarLink to="/reports/sales" label="Sales Summary" active={isReportActive('sales')} />
                    <SubSidebarLink to="/reports/purchases" label="Purchase Summary" active={isReportActive('purchases')} />
                    <SubSidebarLink to="/reports/expenses" label="Expenses Summary" active={isReportActive('expenses')} />
                    <SubSidebarLink to="/reports/ledger" label="Movement Ledger" active={isReportActive('ledger')} />
                    <SubSidebarLink to="/reports/audit" label="Audit Log" active={isReportActive('audit')} />
                  </div>
                </div>
              </div>

              <SidebarLink to="/status" label="Stock Status" active={isActive('/status')} isCollapsed={isSidebarCollapsed}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
              </SidebarLink>

              <SidebarLink to="/shift-analytics" label="Shift Analytics" active={isActive('/shift-analytics')} isCollapsed={isSidebarCollapsed}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </SidebarLink>
              
              {/* ONLY Admins can see the Settings Page button */}
              {userRole === 'Admin' && (
                <SidebarLink to="/settings" label="Settings" active={isActive('/settings')} isCollapsed={isSidebarCollapsed}>
                  <svg 
                    className="w-5 h-5 flex-shrink-0" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </SidebarLink>
              )}
            </>
          )}
        </nav>


        {/* Sidebar Footer (Logout) */}
        <div className="mt-auto mb-5 px-0 border-t border-slate-700/50 pt-4">
          <button 
            onClick={handleLogout} 
            title={isSidebarCollapsed ? "Logout" : ""}
            className={`w-full flex items-center transition-all duration-300 border-l-4 border-transparent text-red-500 hover:bg-slate-800/50 hover:border-red-500 overflow-hidden ${isSidebarCollapsed ? 'justify-center px-0 py-3.5' : 'gap-3 px-6 py-3'}`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            {!isSidebarCollapsed && <span className="font-medium whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] relative">
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-[70px] flex items-center justify-between px-4 sm:px-8 z-20 shrink-0 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Mobile Hamburger */}
            <button className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            
            {/* Desktop Collapse Toggle */}
            <button 
              className="hidden md:flex p-2 -ml-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title="Toggle Sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
              </svg>
            </button>

            <h2 className="text-lg font-black text-slate-800 tracking-tight">
              {pageTitle}
            </h2>
          </div>
          
          <div className="relative flex items-center gap-3">
            <span className={`hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold ring-1 ring-inset ${userRole === 'Admin' ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${userRole === 'Admin' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
              {userRole}
            </span>

            <NotificationBell userRole="Admin" />

            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 hover:bg-slate-50 py-1.5 px-2 rounded-xl transition-colors border border-transparent hover:border-slate-200">
              <div className="bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-300 rounded-full w-9 h-9 flex items-center justify-center text-slate-600 shadow-sm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
              </div>
              <span className="font-bold text-slate-700 text-sm hidden sm:block tracking-tight pr-1">{userName}</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                <div className="absolute top-12 right-0 mt-2 w-56 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1 sm:hidden">
                    <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{userName}</p>
                  </div>
                  <button onClick={() => { setIsDropdownOpen(false); navigate('/settings'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    Account Settings
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-semibold flex items-center gap-2 mt-1">
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* --- MAIN SCROLLABLE APP BODY --- */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8 flex flex-col custom-scrollbar">
          
          <div className="flex-1">
            <Outlet />
          </div>

          {/* GLOBAL SAAS FOOTER */}
          <footer className="mt-12 pt-6 border-t border-slate-200/60 shrink-0">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-slate-500 text-sm font-medium text-center md:text-left">
                &copy; {new Date().getFullYear()} <span className="font-bold text-slate-700">Vendora SaaS</span>. All rights reserved.
                <span className="hidden sm:inline text-slate-400"> &nbsp;|&nbsp; Last synced: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
              <div className="flex items-center gap-6 text-sm font-semibold text-slate-500">
                <Link to="/user-guide" className={`transition-colors ${isActive('/user-guide') ? 'text-blue-600' : 'hover:text-blue-600'}`}>
                  Documentation
                </Link>
                <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
                <span className="text-slate-300">|</span>
                <span className="text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded text-xs ring-1 ring-slate-200">v1.0.0</span>
              </div>
            </div>
          </footer>
        </main>

      </div>
    </div>
  );
}

// Reusable Sidebar Link Component
function SidebarLink({ to, label, children, active, isCollapsed }) {
  return (
    <Link 
      to={to} 
      title={isCollapsed ? label : ""} // Show tooltip only when collapsed
      className={`flex items-center transition-all duration-300 border-l-4 overflow-hidden ${
        active 
          ? 'border-blue-500 text-blue-400 bg-gradient-to-r from-blue-500/10 to-transparent' 
          : 'border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 hover:border-slate-700'
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
    </Link>
  );
}

// Reusable Sub-Menu Link Component
function SubSidebarLink({ to, label, active }) {
  return (
    <Link 
      to={to} 
      className={`block pl-[52px] pr-6 py-2.5 text-[13px] whitespace-nowrap overflow-hidden transition-colors border-l-4 ${
        active 
          ? 'border-blue-500 text-white font-bold' 
          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
      }`}
    >
      {label}
    </Link>
  );
}