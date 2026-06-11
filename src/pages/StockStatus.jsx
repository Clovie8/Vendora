import { useState, useEffect, useMemo } from 'react';
import { apiFetch, API_BASE_URL } from '../config/api';
import { formatRwf, getImageUrl } from '../utils/formatters';
import Swal from 'sweetalert2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import useDocumentTitle from '../hooks/useDocumentTitle';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, zoomPlugin);

export default function StockStatus() {
  useDocumentTitle('Stock Status');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tableSearch, setTableSearch] = useState('');
  
  const [timeframe, setTimeframe] = useState('month'); // Changed default to month
  
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);


  const [businessSettings, setBusinessSettings] = useState(null);
  useEffect(() => {
    apiFetch('get_company').then(res => { if (res.status === 'success') setBusinessSettings(res.data); });
  }, []);
  
  // VAT CALCULATION
  const isVatRegistered = businessSettings?.vat_registered == 1;
  // const vatMultiplier = isVatRegistered ? 0.82 : 1;
  const vatMultiplier = isVatRegistered ? 1 : 1;


  const fetchStatusData = async () => {
    setLoading(true);
    try {
      // FIXED: Passed timeframe parameter to backend
      const res = await apiFetch(`stock_status_data&start=${startDate}&end=${endDate}&timeframe=${timeframe}`);
      if (res.status === 'success') {
        setData(res);
      } else {
        Swal.fire('Error', res.message || 'Error loading stock status', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Connection Error', 'Failed to connect to server', 'error');
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Trigger fetch whenever timeframe changes
  useEffect(() => {
    fetchStatusData();
  }, [timeframe]);

  // const handleFixData = () => {
  //   Swal.fire({
  //     title: 'Fix Stock History?',
  //     html: `
  //       <div class="text-sm text-left text-slate-600 mt-2">
  //         <p class="mb-3">This tool fixes <b>"Start Qty: 0"</b> issues for existing products.</p>
  //         <div class="bg-slate-50 p-3 rounded border">
  //           <strong>What it does:</strong><br/>
  //           1. Scans all products.<br/>
  //           2. Calculates missing stock history.<br/>
  //           3. Creates a "Purchase" record dated Jan 1, 2020 for missing initial stock.
  //         </div>
  //       </div>
  //     `,
  //     icon: 'warning',
  //     showCancelButton: true,
  //     confirmButtonText: 'Run Fix Script',
  //     cancelButtonText: 'Cancel',
  //     customClass: { popup: 'rounded-2xl shadow-xl', confirmButton: 'bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-lg ml-2', cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-lg' },
  //     buttonsStyling: false
  //   }).then((result) => {
  //     if (result.isConfirmed) {
  //       window.location.href = API_BASE_URL.replace('api.php', 'fix_stock.php');
  //     }
  //   });
  // };

  const renderDelta = (startVal, endVal) => {
    const diff = endVal - startVal;
    const isPositive = diff >= 0;
    return (
      <div className="text-xs font-bold mt-1.5 flex items-center gap-1">
        <span className={isPositive ? 'text-green-600' : 'text-red-500'}>{isPositive ? '▲' : '▼'} {formatRwf(Math.abs(diff))}</span>
        <span className="text-slate-400 font-normal">vs start</span>
      </div>
    );
  };

  const filteredTable = data?.table?.filter(row => row.name.toLowerCase().includes(tableSearch.toLowerCase()) || row.sku.toLowerCase().includes(tableSearch.toLowerCase())) || [];

  // --- FIXED: REAL CALENDAR DATA AGGREGATION ---
  const { labels: chartLabels, capital: capitalData, profit: profitData } = useMemo(() => {
    const chartData = data?.chart || [];
    
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    
    const continuousLabels = [];
    let current = new Date(startD);
    
    if (timeframe === 'month') {
      current.setDate(1); 
    } else if (timeframe === 'week') {
      const day = current.getDay() || 7;
      current.setDate(current.getDate() - day + 1);
    } else {
      current.setHours(0,0,0,0);
    }

    const dataMap = {}; 

    while (current <= endD) {
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
      dataMap[key] = { capital_change: 0, profit_change: 0 };
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
          dataMap[key].capital_change += parseFloat(d.capital_change || 0);
          dataMap[key].profit_change += parseFloat(d.profit_change || 0) * vatMultiplier;
      }
    });

    let runningCapital = parseFloat(data?.financials?.start_capital || 0);
    let runningProfit = parseFloat(data?.financials?.start_profit || 0);
    
    const mappedCapital = [];
    const mappedProfit = [];

    continuousLabels.forEach(key => {
        runningCapital += dataMap[key].capital_change;
        runningProfit += dataMap[key].profit_change;
        mappedCapital.push(runningCapital);
        mappedProfit.push(runningProfit);
    });

    return {
      labels: continuousLabels,
      capital: mappedCapital,
      profit: mappedProfit
    };
  }, [data, timeframe, startDate, endDate, vatMultiplier]);

  const chartConfig = {
    labels: chartLabels.length > 0 ? chartLabels : ['No Data'],
    datasets: [
      { 
        label: 'Inventory Capital', 
        data: chartLabels.length > 0 ? capitalData : [0], 
        borderColor: '#64748b', 
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(100, 116, 139, 0.4)');
          gradient.addColorStop(1, 'rgba(100, 116, 139, 0.0)');
          return gradient;
        }, 
        fill: true, 
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#64748b',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      },
      { 
        label: 'Cumulative Profit', 
        data: chartLabels.length > 0 ? profitData : [0], 
        borderColor: '#10b981', 
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
          return gradient;
        }, 
        fill: true, 
        tension: 0.4,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#10b981',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true, 
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Inter', weight: '600' } } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#f8fafc', bodyColor: '#cbd5e1', padding: 12, cornerRadius: 8 },
      zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Inter', maxRotation: 45, minRotation: 45 } } },
      y: { 
        beginAtZero: true, 
        suggestedMax: 10,
        border: { display: false, dash: [4, 4] }, 
        grid: { color: '#e2e8f0' }, 
        ticks: { font: { family: 'Inter' }, padding: 10, precision: 0 }
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 w-full">
        <h2 className="text-xl font-bold text-slate-800">Stock Performance Audit</h2>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-2 bg-white p-3 sm:p-2 rounded-xl shadow-sm border border-slate-200 section-to-print-hide w-full xl:w-auto">
          
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:px-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-400 uppercase w-10 sm:w-auto">From</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 text-sm rounded-lg px-2 py-2 sm:py-1.5 outline-none focus:border-blue-500 font-medium w-full sm:w-auto" />
          </div>
          
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:px-2 sm:border-l border-slate-100 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0">
            <span className="text-xs font-bold text-slate-400 uppercase w-10 sm:w-auto">To</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 text-sm rounded-lg px-2 py-2 sm:py-1.5 outline-none focus:border-blue-500 font-medium w-full sm:w-auto" />
          </div>
          
          <button onClick={fetchStatusData} disabled={loading} className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 sm:ml-2">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            Recalc
          </button>
          
          {/* <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 sm:px-3 py-2 sm:py-1.5 rounded-lg text-sm transition-colors flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          </button>
          
          <button onClick={handleFixData} className="w-full sm:w-auto justify-center bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-2 sm:py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors sm:ml-auto xl:ml-2 flex items-center gap-1 mt-1 sm:mt-0">
            <svg 
              className="w-4 h-4 flex-shrink-0" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Fix Data
          </button> */}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-slate-400 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Starting Capital</div>
              <div className="text-xl font-bold text-slate-800">{formatRwf(Number(data.financials.start_capital) || 0)}</div>
              <div className="text-xs text-slate-400 mt-1.5">At start of period</div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border-l-4 border-blue-500 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ending Capital</div>
              <div className="text-xl font-bold text-slate-800">{formatRwf(Number(data.financials.end_capital) || 0)}</div>
              {renderDelta(data.financials.start_capital, data.financials.end_capital)}
            </div>

            <div className="bg-white rounded-xl shadow-sm border-l-4 border-slate-400 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isVatRegistered ? "Starting Profit." : "Starting Profit"}
              </div>
              {/* FIXED: Safe Number fallback with VAT applied */}
              <div className="text-xl font-bold text-green-600">{formatRwf((Number(data.financials.start_profit) || 0) * vatMultiplier)}</div>
              <div className="text-xs text-slate-400 mt-1.5">Cumulative before period</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border-l-4 border-green-500 p-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isVatRegistered ? "Ending Profit." : "Ending Profit"}
              </div>
              {/* FIXED: Safe Number fallback with VAT applied */}
              <div className="text-xl font-bold text-green-600">{formatRwf((Number(data.financials.end_profit) || 0) * vatMultiplier)}</div>
              {renderDelta((Number(data.financials.start_profit) || 0) * vatMultiplier, (Number(data.financials.end_profit) || 0) * vatMultiplier)}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6 section-to-print">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                Value & Profit Timeline <span className="text-sm font-normal text-slate-400 ml-2 hidden sm:inline">(Scroll to zoom)</span>
              </h3>
              
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-1.5 font-medium outline-none focus:ring-2 focus:ring-blue-500 section-to-print-hide"
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden section-to-print">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Product Movement Ledger
              </h3>
              <div className="relative section-to-print-hide w-full sm:w-auto">
                <input 
                  type="text" 
                  placeholder="Filter products..." 
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-white text-slate-400 text-[11px] uppercase tracking-wider border-b-2 border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-bold">Img</th>
                    <th className="px-4 py-3 font-bold">Product</th>
                    <th className="px-4 py-3 font-bold text-right">Start Qty</th>
                    <th className="px-4 py-3 font-bold text-right text-blue-500">In (Buy)</th>
                    <th className="px-4 py-3 font-bold text-right text-red-500">Out (Sell)</th>
                    <th className="px-4 py-3 font-bold text-right text-slate-800">End Qty</th>
                    <th className="px-4 py-3 font-bold text-right">End Value</th>
                    <th className="px-4 py-3 font-bold text-right text-green-600">Period Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTable.length === 0 ? (
                    <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-400 text-sm">No movement data found.</td></tr>
                  ) : (
                    filteredTable.map((row, i) => {
                      const endValue = row.end_qty * row.buy_price;
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 align-middle">
                            {row.image ? (
                              <img src={getImageUrl(row.image)} alt="Img" className="w-8 h-8 rounded object-cover border border-slate-200" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-300 border border-slate-200"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg></div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 align-middle">
                            <div className="font-bold text-slate-800 text-sm">{row.name}</div>
                            <div className="text-xs text-slate-400">{row.sku}</div>
                          </td>
                          <td className="px-4 py-2.5 align-middle text-right font-bold text-slate-500">{row.start_qty}</td>
                          <td className="px-4 py-2.5 align-middle text-right font-bold text-blue-500">+{row.in_qty}</td>
                          <td className="px-4 py-2.5 align-middle text-right font-bold text-red-500">-{row.out_qty}</td>
                          <td className="px-4 py-2.5 align-middle text-right font-bold bg-slate-50/50 text-slate-800">{row.end_qty}</td>
                          <td className="px-4 py-2.5 align-middle text-right text-sm">{formatRwf(row.end_value)}</td>
                          <td className="px-4 py-2.5 align-middle text-right font-bold text-green-600">+{formatRwf(row.period_profit * vatMultiplier)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

    </div>
  );
}