// src/pages/Dashboard.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, formatDateCell, getImageUrl } from '../utils/formatters';
import Swal from 'sweetalert2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';

import PosSaleModal from '../components/PosSaleModal';
import PosRestockModal from '../components/PosRestockModal';
import useDocumentTitle from '../hooks/useDocumentTitle';
import InstallAppBanner from '../components/InstallAppBanner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, zoomPlugin);

// Setup modern Toast notification
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  // Main Data States
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncTime, setSyncTime] = useState('');
  const [timeframe, setTimeframe] = useState('month'); // Changed default to month for a better initial view

  // Action/Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [transType, setTransType] = useState('sale'); // 'sale' or 'purchase'
  const [transProductId, setTransProductId] = useState('');
  const [products, setProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPosSaleOpen, setIsPosSaleOpen] = useState(false);
  const [isPosRestockOpen, setIsPosRestockOpen] = useState(false);
  // const [businessSettings, setBusinessSettings] = useState(null);

  const addFormRef = useRef(null);
  const transFormRef = useRef(null);


  const [businessSettings, setBusinessSettings] = useState(null);

  // 1. ADD THIS EFFECT: Fetch the company VAT settings when dashboard loads
  useEffect(() => {
    apiFetch('get_company').then(res => { 
      if (res.status === 'success') setBusinessSettings(res.data); 
    });
  }, []);

  // 2. VAT CALCULATION
  const isVatRegistered = businessSettings?.vat_registered == 1;
  // const vatMultiplier = isVatRegistered ? 0.82 : 1;
  const vatMultiplier = isVatRegistered ? 1 : 1;


  useEffect(() => {
    const runAuditor = async () => {
       try {
           await apiFetch('run_daily_checks');
           console.log("Daily Auditor finished running.");
       } catch (error) {
           console.error("Auditor failed:", error);
       }
    };
    
    runAuditor();
    
  }, []);


  const fetchDashboardData = async () => {
    try {
      // FIXED: Passed timeframe parameter to backend
      const result = await apiFetch(`dashboard_data&timeframe=${timeframe}`);
      if (result.status === 'success') {
        setData(result);
        setSyncTime(new Date().toLocaleTimeString());
      } else {
        setError(result.message || 'Failed to load dashboard data.');
      }
    } catch (err) {
      setError('Connection error. Is the PHP server running?');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Trigger fetch whenever timeframe changes
  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  // --- ACTION 1: TOGGLE REQUEST (Unrequest) - ORIGINAL KEPT ---
  const handleToggleRequest = async (id, status) => {
    const formData = new FormData();
    formData.append('id', id);
    formData.append('status', status);
    try {
      const res = await apiFetch('toggle_request', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: res.message });
        fetchDashboardData(); 
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- ACTION 2: ADD PRODUCT ---
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(addFormRef.current);
    try {
      const res = await apiFetch('add', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Product Added Successfully!' });
        setIsAddModalOpen(false);
        fetchDashboardData();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Request Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACTION 3: OPEN TRANSACTION MODAL ---
  const openTransModal = async (type, pid = '') => {
    setTransType(type);
    setTransProductId(pid);
    setIsTransModalOpen(true);
    if (products.length === 0) {
      try {
        const res = await apiFetch('fetch&limit=1000');
        setProducts(res.data || res);
      } catch (e) { console.error(e); }
    }
  };

  const handleTransSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(transFormRef.current);
    formData.append('type', transType);

    try {
      const res = await apiFetch('transaction', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Transaction Successful!' });
        setIsTransModalOpen(false);
        fetchDashboardData();
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Request Failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- DYNAMIC DATA AGGREGATION FOR CHART ---
  const { labels: chartLabels, revenue: revData, profit: profData } = useMemo(() => {
    const chartData = data?.chart || [];
    if (chartData.length === 0) return { labels: [], revenue: [], profit: [] };
    
    let minDate = new Date(chartData[0].date);
    chartData.forEach(d => {
      const dateObj = new Date(d.date);
      if (dateObj < minDate) minDate = dateObj;
    });
    const maxDate = new Date();

    const continuousLabels = [];
    const dataMap = {};
    
    let current = new Date(minDate);
    if (timeframe === 'month') {
      current.setDate(1); 
    } else if (timeframe === 'week') {
      const day = current.getDay() || 7;
      current.setDate(current.getDate() - day + 1);
    } else {
      current.setHours(0,0,0,0);
    }

    while (current <= maxDate) {
      let key = '';
      if (timeframe === 'month') {
        key = current.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        continuousLabels.push(key);
        current.setMonth(current.getMonth() + 1);
      } else if (timeframe === 'week') {
        key = "Wk of " + current.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        continuousLabels.push(key);
        current.setDate(current.getDate() + 7);
      } else {
        key = current.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        continuousLabels.push(key);
        current.setDate(current.getDate() + 1);
      }
      dataMap[key] = { rev: 0, prof: 0 };
    }

    chartData.forEach(d => {
      const dateObj = new Date(d.date);
      let key = '';
      if (timeframe === 'month') {
        key = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      } else if (timeframe === 'week') {
        const day = dateObj.getDay() || 7;
        dateObj.setDate(dateObj.getDate() - day + 1);
        key = "Wk of " + dateObj.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      } else {
        key = dateObj.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      }

      if (dataMap[key]) {
        dataMap[key].rev += parseFloat(d.daily_revenue || 0) * vatMultiplier;
        dataMap[key].prof += parseFloat(d.daily_profit || 0) * vatMultiplier;
      }
    });

    return {
      labels: continuousLabels,
      revenue: continuousLabels.map(l => dataMap[l].rev),
      profit: continuousLabels.map(l => dataMap[l].prof)
    };
  }, [data, timeframe]);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
  if (!data) return null;

  const chartConfig = {
    labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
    datasets: [
      { 
        label: 'Gross Revenue', 
        data: chartLabels.length > 0 ? revData : [0], 
        borderColor: '#3b82f6', 
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
          return gradient;
        }, 
        fill: true, tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#3b82f6', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6
      },
      { 
        label: 'Net Profit', 
        data: chartLabels.length > 0 ? profData : [0], 
        borderColor: '#10b981', 
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
          return gradient;
        },
        fill: true, tension: 0.4, pointBackgroundColor: '#fff', pointBorderColor: '#10b981', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Inter', weight: '600' } } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 12, cornerRadius: 8 },
      zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', maxRotation: 45, minRotation: 45 } } },
      y: { beginAtZero: true, suggestedMax: 5000, border: { dash: [4, 4], display: false }, grid: { color: '#e2e8f0' }, ticks: { font: { family: 'Inter' }, padding: 10, precision: 0 } }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 relative">

      <InstallAppBanner />
      
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard title="Total Products" value={data.kpi.total_products} colorClass="border-blue-500 text-blue-600 bg-blue-50" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>} />
        <KpiCard title="Stock Value" value={formatRwf(data.kpi.stock_value)} colorClass="border-slate-500 text-slate-500 bg-slate-100" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>} />
        {/* Update your Sales Today Card */}
        <KpiCard 
          title={isVatRegistered ? "Sales Today." : "Sales Today"} 
          value={formatRwf(data.kpi.today_sales * vatMultiplier)} 
          colorClass="border-yellow-400 text-yellow-500 bg-yellow-50" 
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>} 
        />
        
        {/* Update your Profit Today Card */}
        <KpiCard 
          title={isVatRegistered ? "Profit Today." : "Profit Today"} 
          value={(data.kpi.today_profit >= 0 ? '+' : '') + formatRwf(data.kpi.today_profit * vatMultiplier)} 
          colorClass="border-green-500 text-green-600 bg-green-50" 
          valueClass={data.kpi.today_profit >= 0 ? 'text-green-600' : 'text-red-600'} 
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>} 
        />
        <KpiCard title="Purchases Today" value={formatRwf(data.kpi.today_purchases)} colorClass="border-cyan-500 text-cyan-500 bg-cyan-50" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} />
      </div>

      {/* CHART AND QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
              Financial Performance <span className="text-sm font-normal text-slate-400 hidden sm:inline">(Revenue vs Profit)</span>
            </h3>
            
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-1.5 font-medium outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <Line data={chartConfig} options={chartOptions} />
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-700 mb-4">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <QuickActionButton onClick={() => setIsAddModalOpen(true)} title="Add Product" subtitle="Create new item" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>} iconBg="bg-blue-100 text-blue-600" hoverColor="hover:border-l-blue-600" />
            
            <QuickActionButton onClick={() => setIsPosSaleOpen(true)} title="New Sale" subtitle="Record transaction" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>} iconBg="bg-red-100 text-red-500" hoverColor="hover:border-l-red-500" />
            
            <QuickActionButton onClick={() => setIsPosRestockOpen(true)} title="New Purchase" subtitle="Restock inventory" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>} iconBg="bg-green-100 text-green-500" hoverColor="hover:border-l-green-500" />
          </div>
        </div>
      </div>

      {/* TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* NEW: Top Performers Leaderboard (Spans both columns) */}
        <div className="lg:col-span-2">
          <TableCard title="🏆 Top Selling Products" titleClass="text-slate-800 border-t-4 border-blue-500">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 text-left">Img</th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Units Sold</th><th className="p-3 text-left">Revenue Generated</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.top_sellers?.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-slate-400 text-sm font-medium">No sales data available</td></tr>}
              {data.top_sellers?.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3"><ProductImage src={item.image} /></td>
                  <td className="p-3 font-semibold text-sm text-slate-700">{item.name}</td>
                  <td className="p-3 text-sm"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-black text-sm">{item.total_sold}</span></td>
                  <td className="p-3 text-sm font-black text-xs text-blue-600">{formatRwf(item.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </div>

        {/* ORIGINAL TABLES KEPT INTACT */}
        <TableCard title="⚠️ Low Stock Alerts" titleClass="text-red-600 border-t-4 border-red-500">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 text-left">Img</th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Qty</th><th className="p-3 text-left">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.low_stock.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-slate-400 text-sm">No low stock</td></tr>}
            {data.low_stock.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-3"><ProductImage src={item.image} /></td>
                <td className="p-3 font-semibold text-sm text-slate-700">{item.name}</td>
                <td className="p-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{item.stock_quantity}</span></td>
                <td className="p-3">
                  <button onClick={() => setIsPosRestockOpen(true)} className="text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors font-bold">Restock</button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>

        {/* ORIGINAL REQUESTED PRODUCTS TABLE KEPT INTACT */}
        <TableCard title="📋 Requested Products" titleClass="text-slate-800 border-t-4 border-yellow-400">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 text-left">Img</th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Qty</th><th className="p-3 text-left">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.requested.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-slate-400 text-sm">No requests</td></tr>}
            {data.requested.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-3"><ProductImage src={item.image} /></td>
                <td className="p-3 font-semibold text-sm text-slate-700">{item.name}</td>
                <td className="p-3"><span className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold">{item.stock_quantity}</span></td>
                <td className="p-3">
                  <button onClick={() => handleToggleRequest(item.id, 0)} className="text-xs bg-yellow-400 text-yellow-900 font-bold hover:bg-yellow-500 px-3 py-1.5 rounded transition-colors">Unrequest</button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableCard>

        <TableCard title="Recent Sales" titleClass="border-t-[1px] border-slate-200">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 text-left">Img</th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Amt</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.recent_sales.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-slate-400 text-sm">No sales yet</td></tr>}
            {data.recent_sales.map((item, i) => {
              const { date, time } = formatDateCell(item.date);
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3"><ProductImage src={item.image || item.product_image} /></td>
                  <td className="p-3 text-sm text-slate-700 truncate max-w-[100px]">{item.product_name}</td>
                  <td className="p-3 text-sm text-slate-500"><div className="font-bold leading-tight">{date}</div><div className="text-[10px] opacity-75">{time}</div></td>
                  <td className="p-3 text-sm font-bold text-emerald-500">+{formatRwf(item.quantity * item.price_at_time)}</td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>

        <TableCard title="Recent Purchases" titleClass="border-t-[1px] border-slate-200">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 text-left">Img</th><th className="p-3 text-left">Product</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Amt</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.recent_purchases.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-slate-400 text-sm">No purchases yet</td></tr>}
            {data.recent_purchases.map((item, i) => {
              const { date, time } = formatDateCell(item.date);
              return (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-3"><ProductImage src={item.image || item.product_image} /></td>
                  <td className="p-3 text-sm text-slate-700 truncate max-w-[100px]">{item.product_name}</td>
                  <td className="p-3 text-sm text-slate-500"><div className="font-bold leading-tight">{date}</div><div className="text-[10px] opacity-75">{time}</div></td>
                  <td className="p-3 text-sm font-bold text-blue-500">-{formatRwf(item.quantity * item.price_at_time)}</td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>

      </div>

      {/* --- ADD PRODUCT MODAL (ORIGINAL KEPT) --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Add New Product</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form ref={addFormRef} onSubmit={handleAddSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Product Image</label>
                  <input type="file" name="image" accept="image/*" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-lg p-1" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Product Name</label>
                  <input type="text" name="name" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. iPhone 14" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Buy Price (Rwf)</label>
                    <input type="number" name="buy_price" step="0.01" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Sell Price (Rwf)</label>
                    <input type="number" name="sell_price" step="0.01" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Initial Stock Quantity</label>
                  <input type="number" name="stock_quantity" defaultValue="0" min="0" required className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="mt-8 flex gap-3 justify-end">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center justify-center min-w-[120px]">
                  {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PosSaleModal 
        isOpen={isPosSaleOpen} 
        onClose={() => setIsPosSaleOpen(false)} 
        onSuccess={() => { 
          setIsPosSaleOpen(false); 
          fetchDashboardData(); 
        }} 
        businessSettings={businessSettings} 
      />

      <PosRestockModal 
        isOpen={isPosRestockOpen} 
        onClose={() => setIsPosRestockOpen(false)} 
        onSuccess={() => { 
          setIsPosRestockOpen(false); 
          fetchDashboardData(); 
        }} 
        businessSettings={businessSettings} 
      />

    </div>
  );
}

// --- SUB-COMPONENTS (ORIGINAL KEPT) ---
function KpiCard({ title, value, icon, colorClass, valueClass = "text-slate-800" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 p-4 flex justify-between items-center ${colorClass.split(' ')[0]}`}>
      <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{title}</p><h4 className={`text-xl font-bold ${valueClass}`}>{value}</h4></div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${colorClass.split(' ').slice(1).join(' ')}`}>{icon}</div>
    </div>
  );
}

function QuickActionButton({ title, subtitle, icon, iconBg, hoverColor, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center p-3 rounded-lg border border-slate-100 hover:shadow-md transition-all border-l-4 border-l-transparent ${hoverColor} bg-white group`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${iconBg}`}>{icon}</div>
      <div className="text-left flex-1"><h4 className="text-sm font-bold text-slate-800 group-hover:text-slate-900">{title}</h4><p className="text-xs text-slate-400">{subtitle}</p></div>
      <div className="text-slate-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></div>
    </button>
  );
}

function TableCard({ title, titleClass, children }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${titleClass}`}>
      <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-sm tracking-wide">{title}</h3></div>
      <div className="overflow-x-auto"><table className="w-full text-left whitespace-nowrap">{children}</table></div>
    </div>
  );
}

function ProductImage({ src }) {
  const url = getImageUrl(src);
  if (url) return <img src={url} alt="Product" className="w-9 h-9 rounded-md object-cover border border-slate-200" />;
  return <div className="w-9 h-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg></div>;
}