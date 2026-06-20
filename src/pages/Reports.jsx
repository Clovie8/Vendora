import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../config/api';
import { formatRwf, formatDateCell, getImageUrl } from '../utils/formatters';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';
import html2pdf from 'html2pdf.js';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function Reports() {
  const { type } = useParams(); 
  const navigate = useNavigate();
  useDocumentTitle('Reports');

  // Filter States
  const [reportType, setReportType] = useState(type || 'financial');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [productId, setProductId] = useState('0');
  
  // Data States
  const [products, setProducts] = useState([]);
  const [reportData, setReportData] = useState({ columns: [], data: [] });
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentReportTitle, setCurrentReportTitle] = useState('Report Results');
  const [hasRun, setHasRun] = useState(false); 
  const [businessSettings, setBusinessSettings] = useState(null); // Added for Professional Printing

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await apiFetch('fetch&limit=1000');
        setProducts(res.data || res);
        
        // Fetch company data for the print header
        const compRes = await apiFetch('get_company');
        if (compRes.status === 'success') setBusinessSettings(compRes.data);
      } catch (e) { console.error(e); }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (type) {
      setReportType(type);
      setReportData({ columns: [], data: [] }); 
      setHasRun(false);

      const typeLabels = {
        financial: 'Income & Expense Statement (Net Profit)',
        valuation: 'Stock Valuation',
        low_stock: 'Low Stock Alerts',
        sales: 'Sales Summary',
        purchases: 'Purchase Summary',
        expenses: 'Expenses Summary',
        ledger: 'Stock Movement Ledger',
        audit: 'Audit Log'
      };
      setCurrentReportTitle(typeLabels[type]);

      if (type !== 'ledger' || productId !== '0') {
        handleGenerate(null, type);
      }
    } else {
      setReportType('financial');
      navigate('/reports/financial', { replace: true });
    }
  }, [type]);

  const handleDropdownChange = (e) => {
    const newType = e.target.value;
    navigate(`/reports/${newType}`);
  };

  const showDateFilters = ['sales', 'purchases', 'expenses', 'ledger', 'audit', 'financial'].includes(reportType);
  const showProductFilter = ['sales', 'purchases', 'ledger'].includes(reportType);

  const handleGenerate = async (e, overrideType = null) => {
    if (e) e.preventDefault();
    
    const activeType = overrideType || reportType;

    if (activeType === 'ledger' && productId === '0') {
      if(e) {
        Swal.fire({ icon: 'info', title: 'Product Required', text: 'Please select a specific product to view its ledger.', customClass: { popup: 'rounded-2xl shadow-xl', confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded-lg' }, buttonsStyling: false });
      }
      return;
    }

    setIsGenerating(true);
    setHasRun(true);
    try {
      const url = `generate_report&type=${activeType}&start=${startDate}&end=${endDate}&product_id=${productId}`;
      const res = await apiFetch(url);
      
      if (res.status === 'success') {
        let finalColumns = res.columns;
        if (activeType === 'low_stock') {
          finalColumns = finalColumns.filter(col => col !== 'Img' && col !== 'Image');
        }
        setReportData({ columns: finalColumns, data: res.data });
      } else {
        if(e) Swal.fire('Report Failed', res.message, 'error');
      }
    } catch (err) {
      if(e) Swal.fire('Error', 'Server not responding', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (reportData.data.length === 0) return;
    let csv = [];
    csv.push(['#', ...reportData.columns].join(","));
    reportData.data.forEach((row, i) => {
      const rowData = [i + 1];
      if (reportType === 'low_stock') {
         rowData.push(`"${row.name}"`, `"${row.sku}"`, row.stock_quantity, row.is_requested == 1 ? 'Requested' : 'Unrequested');
      } else { Object.values(row).forEach(val => rowData.push(`"${String(val).replace(/\n/g, ' ')}"`)); }
      csv.push(rowData.join(","));
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentReportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const toggleRequest = async (id, status) => {
    const formData = new FormData(); formData.append('id', id); formData.append('status', status);
    try {
      const res = await apiFetch('toggle_request', { method: 'POST', body: formData });
      if (res.status === 'success') { Toast.fire({ icon: 'success', title: res.message }); handleGenerate(); }
    } catch (e) { console.error(e); }
  };

  // --- NEW PROFESSIONAL PRINT ENGINE ---
  // --- SHARED REPORT HTML GENERATOR ---
  const getReportHtmlString = () => {
    // 1. Grab the raw HTML from the React DOM
    let rawTableHtml = document.getElementById('print-table').outerHTML;
    
    // 2. THE FIREWALL: Completely strip all Tailwind classes from the HTML string.
    // This stops the browser from computing 'oklch' colors and crashing html2pdf!
    let safeTableHtml = rawTableHtml.replace(/class="[^"]*"/g, '');

    const currentDate = new Date().toLocaleString();
    const compName = businessSettings?.name || "";
    const compPhone = businessSettings?.phone ? `Tel: ${businessSettings.phone}` : "";
    const compLocation = businessSettings?.location ? `${businessSettings.location}` : "";
    const compTin = businessSettings?.tin_number ? `TIN: ${businessSettings.tin_number}` : "";
    const logoImg = businessSettings?.logo ? `<img src="http://localhost/stock-manager/backend/public/${businessSettings.logo}" style="max-height: 70px; margin-bottom: 10px;" crossorigin="anonymous" />` : '';

    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #1e293b; background: #fff;">
        <style>
          /* We use pure HTML element selectors here because we stripped the classes */
          .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 26px; font-weight: 900; margin: 0 0 5px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
          .company-info { font-size: 13px; color: #64748b; font-weight: 500; }
          .company-info span { margin: 0 8px; }
          
          .report-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; }
          .report-title { font-size: 20px; font-weight: 800; margin: 0; color: #1e293b; text-transform: uppercase; }
          .report-meta { font-size: 12px; color: #64748b; text-align: right; line-height: 1.5; }
          
          /* Safe, Hardcoded Hex CSS for the Table */
          table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; }
          th { background-color: #f1f5f9; color: #475569; font-weight: bold; text-transform: uppercase; padding: 12px 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: middle; }
          tr:nth-child(even) td { background-color: #f8fafc; }
          
          /* Safe styling for SVGs */
          svg { width: 16px; height: 16px; display: inline-block; vertical-align: middle; margin-right: 6px; stroke: #64748b; }
          
          /* Hide UI elements during print */
          button { display: none !important; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; font-weight: 500; }
        </style>
        
        <div class="header">
          ${logoImg}
          <h2 class="company-name">${compName}</h2>
          <div class="company-info">
            ${compLocation ? `<span>${compLocation}</span>` : ''}
            ${compPhone ? `<span>|</span><span>${compPhone}</span>` : ''}
            ${compTin ? `<span>|</span><span>${compTin}</span>` : ''}
          </div>
        </div>
        
        <div class="report-header">
          <h2 class="report-title">${currentReportTitle} ${(businessSettings?.vat_registered == 1 && reportType === 'sales') ? '(Net)' : ''}</h2>
          <div class="report-meta">
            ${showDateFilters ? `<strong>Period:</strong> ${startDate} to ${endDate} <br>` : ''}
            <strong>Generated On:</strong> ${currentDate}
          </div>
        </div>
        
        ${safeTableHtml}
        
        <div class="footer">
          End of Report &bull; Printed by Vendora SaaS
        </div>
      </div>
    `;
  };

  // --- BUTTON 1: A4 PRINT ENGINE ---
  const handlePrint = () => {
    if (reportData.data.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    const htmlContent = getReportHtmlString();

    printWindow.document.write(`
      <html>
        <head><title>${currentReportTitle}</title></head>
        <body style="margin:0; padding:0;">
          ${htmlContent}
          <script>
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- BUTTON 2: PDF DOWNLOAD ENGINE ---
  // --- BUTTON 2: PDF DOWNLOAD ENGINE (Reports) ---
  const handleDownloadPDF = async () => {
    if (reportData.data.length === 0) return;
    Toast.fire({ icon: 'info', title: 'Generating PDF...', timer: 3000 });

    // Grab our perfectly sterile HTML string
    const htmlContent = getReportHtmlString();

    const options = {
      margin: 0.2, 
      filename: `${currentReportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' } 
    };

    // Generate directly from the sterile string!
    html2pdf().set(options).from(htmlContent).save().then(() => {
      Toast.fire({ icon: 'success', title: 'PDF Downloaded!' });
    });
  };


  const renderTableContent = () => {
    // VAT CALCULATION
    const isVatRegistered = businessSettings?.vat_registered == 1;
    // const vatMultiplier = (isVatRegistered && reportType === 'sales') ? 0.82 : 1;
    const vatMultiplier = (isVatRegistered && reportType === 'sales') ? 1 : 1;

    // 1. DYNAMIC EMPTY STATES
    if (reportData.data.length === 0) {
      if (reportType === 'ledger' && productId === '0') {
        return {
          rows: <tr><td colSpan="100%" className="text-center py-16 whitespace-normal">
            <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 mx-auto">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">Product Selection Required</h4>
              <p className="text-slate-500 text-sm max-w-md text-center px-4">To view the Movement Ledger, please select a specific product from the dropdown above and click <span className="font-bold text-slate-700">Run Report</span>.</p>
            </div>
          </td></tr>,
          totals: [], hasTotals: false
        };
      }

      if (hasRun && !isGenerating) {
        return {
          rows: <tr><td colSpan="100%" className="text-center py-16 whitespace-normal">
            <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 mx-auto">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">No Records Found</h4>
              <p className="text-slate-500 text-sm max-w-md text-center px-4">We couldn't find any data matching your current {showDateFilters ? 'date range' : 'parameters'}. Try adjusting the filters above.</p>
            </div>
          </td></tr>,
          totals: [], hasTotals: false
        };
      }

      return { rows: <tr><td colSpan="100%" className="text-center py-16 text-slate-400 whitespace-normal">Loading data...</td></tr>, totals: [], hasTotals: false };
    }

    // 2. STANDARD TABLE RENDERING
    let totals = new Array(reportData.columns.length).fill(0);
    let hasTotals = false;

    const rows = reportData.data.map((row, i) => {
      let trClass = "hover:bg-slate-50 transition-colors";
      let icon = null;

      if (reportType === 'financial') {
        if (row.type === 'Income') { icon = <svg className="w-4 h-4 text-blue-500 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>; }
        else if (row.type === 'Cost') { icon = <svg className="w-4 h-4 text-slate-500 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>; }
        else if (row.type === 'PROFIT') { trClass = "bg-slate-100 font-bold"; icon = <svg className="w-4 h-4 text-slate-800 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>; }
        else if (row.type === 'Expense') { trClass = "text-red-600 font-bold bg-red-50/30"; icon = <svg className="w-4 h-4 text-red-500 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>; }
        else if (row.type === 'NET') { trClass = "bg-green-100 border-t-2 border-b-2 border-green-200 font-bold text-green-700 text-lg"; icon = <svg className="w-5 h-5 text-green-600 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>; }
      }

      return (
        <tr key={i} className={trClass}>
          <td className="px-4 py-2.5 text-slate-400 text-sm align-middle">{i + 1}</td>
          
          {reportType === 'low_stock' ? (
            <>
              {/* <td className="px-4 py-2.5 align-middle"><img src={getImageUrl(row.image)} alt="Img" className="w-8 h-8 rounded object-cover border border-slate-200" onError={(e) => e.target.style.display='none'}/></td> */}
              <td className="px-4 py-2.5 align-middle font-bold text-slate-800">{row.name}</td>
              <td className="px-4 py-2.5 align-middle text-sm text-slate-500">{row.sku}</td>
              <td className="px-4 py-2.5 align-middle"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold text-xs">{row.stock_quantity}</span></td>
              <td className="px-4 py-2.5 align-middle section-to-print-hide">
                {row.is_requested == 1 
                  ? <button onClick={() => toggleRequest(row.id, 0)} className="text-xs bg-yellow-400 text-yellow-900 font-bold px-3 py-1.5 rounded transition-colors">Unrequest</button>
                  : <button onClick={() => toggleRequest(row.id, 1)} className="text-xs bg-white border border-blue-200 text-blue-600 font-bold hover:bg-blue-50 px-3 py-1.5 rounded transition-colors">Request</button>
                }
              </td>
            </>
          ) : (
            Object.values(row).map((val, cIdx) => {
              let displayVal = val;
              const colName = reportData.columns[cIdx] ? reportData.columns[cIdx].toLowerCase() : '';
              const isCurrencyCol = ['amount', 'price', 'cost', 'profit', 'value', 'revenue'].some(kw => colName.includes(kw));
              const isDateCol = ['date', 'time', 'created_at'].some(kw => colName.includes(kw));

              if (isCurrencyCol && !isNaN(val) && val !== null && val !== '') {
                const netValue = parseFloat(val) * vatMultiplier;
                displayVal = formatRwf(netValue);
                if (reportType !== 'financial') {
                  if (!isNaN(netValue)) { totals[cIdx] += netValue; hasTotals = true; }
                }
              } else if (isDateCol) {
                const { date, time } = formatDateCell(val);
                displayVal = <><div className="font-bold leading-tight">{date}</div><div className="text-[10px] opacity-75">{time}</div></>;
              } else if (typeof val === 'string' && val.includes('uploads/')) {
                displayVal = <img src={getImageUrl(val)} alt="Img" className="w-8 h-8 rounded object-cover border border-slate-200" onError={(e) => e.target.style.display='none'}/>;
              }

              if (cIdx === 0 && icon) displayVal = <div className="flex items-center">{icon}<span>{val}</span></div>;
              return <td key={cIdx} className="px-4 py-2.5 align-middle whitespace-nowrap text-sm">{displayVal}</td>;
            })
          )}
        </tr>
      );
    });

    return { rows, totals, hasTotals };
  };

  const { rows, totals, hasTotals } = renderTableContent();

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">System Reports</h2>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 section-to-print-hide">
        <form className="flex flex-wrap items-end gap-4" onSubmit={(e) => handleGenerate(e)}>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Report Type</label>
            <select 
              value={reportType} 
              onChange={handleDropdownChange}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm font-semibold text-slate-700"
            >
              <option value="financial">Income & Expense Statement (Net Profit)</option>
              <option value="valuation">Stock Valuation</option>
              <option value="low_stock">Low Stock Alerts</option>
              <option value="sales">Sales Summary</option>
              <option value="purchases">Purchase Summary</option>
              <option value="expenses">Expenses Summary</option>
              <option value="ledger">Stock Movement Ledger</option>
              <option value="audit">Audit Log</option>
            </select>
          </div>

          {showDateFilters && (
            <>
              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Start Date</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:ring-2 focus:ring-blue-600" /></div>
              <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">End Date</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm text-slate-700 focus:ring-2 focus:ring-blue-600" /></div>
            </>
          )}

          {showProductFilter && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Product</label>
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none text-sm text-slate-700">
                <option value="0">All Products</option>
                {products.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.sku})</option>))}
              </select>
            </div>
          )}

          <div>
            <button type="submit" disabled={isGenerating} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all text-sm flex items-center justify-center min-w-[140px]">
              {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path></svg> Run Report</>}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden section-to-print">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 sm:gap-0 bg-slate-50">
          <h3 className="font-bold text-slate-800 tracking-wide flex items-center gap-2">
            {currentReportTitle}
            {businessSettings?.vat_registered == 1 && reportType === 'sales' && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider">Net of VAT</span>
            )}
          </h3>
          <div className="flex justify-center gap-2 section-to-print-hide">
            <button onClick={handleExportCSV} disabled={reportData.data.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>Export CSV</button>
            <button onClick={handleDownloadPDF} disabled={reportData.data.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> 
              Download PDF
            </button>
            <button onClick={handlePrint} disabled={reportData.data.length === 0} className="hidden md:flex flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Print</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap" id="print-table">
            {reportData.columns.length > 0 && (
              <thead className="bg-white text-slate-400 text-[11px] uppercase tracking-wider border-b-2 border-slate-100">
                <tr><th className="px-4 py-3 font-bold">#</th>{reportData.columns.map((col, i) => (<th key={i} className="px-4 py-3 font-bold">{col}</th>))}</tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-50">{rows}</tbody>
            {hasTotals && reportType !== 'low_stock' && reportType !== 'financial' && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 shadow-inner">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-500 uppercase text-xs">Total</td>
                  
                  {reportData.columns.map((col, i) => {
                    // 1. Skip columns that shouldn't be added together (Added 'Price' to the skip list)
                    if (['Image', 'Date', 'Product', 'SKU', 'Type', 'Qty', 'Buy Price', 'Sell Price', 'Date & Time', 'Expense Title', 'Category', 'Authorized By', 'Customer', 'Supplier', 'Customer/Supplier', 'Status', 'Method', 'User', 'Unit Price', 'Price'].includes(col)) {
                      return <td key={i} className="px-4 py-3 text-center text-slate-400 font-medium">-</td>;
                    }
                    
                    // 2. NEW: Display separate Sales and Purchases totals specifically for the Ledger!
                    if (reportType === 'ledger' && col === 'Total Amount') {
                        const totalSales = reportData.data
                            .filter(r => r.type === 'sale')
                            .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
                        const totalPurch = reportData.data.filter(r => r.type === 'purchase').reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
                        return (
                            <td key={i} className="px-4 py-2 font-bold whitespace-nowrap text-xs">
                                <div className="text-blue-600 mb-1">Sales: {formatRwf(totalSales)}</div>
                                <div className="text-slate-600">Purch: {formatRwf(totalPurch)}</div>
                            </td>
                        );
                    }

                    // 3. Normal Calculation for other columns
                    const total = reportData.data.reduce((sum, row) => {
                      const val = Object.values(row)[i]; 
                      return sum + (Number(val) || 0);
                    }, 0);

                    const isMoney = col.includes('Price') || col.includes('Amount') || col.includes('Cost') || col.includes('Value') || col.includes('Profit');
                    
                    return (
                      <td key={i} className={`px-4 py-3 font-bold whitespace-nowrap ${total !== 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                        {isMoney ? formatRwf(total) : total}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}