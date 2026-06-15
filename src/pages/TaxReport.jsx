import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState, useEffect } from 'react';
import { apiFetch } from '../config/api';
import { formatRwf, formatDateCell } from '../utils/formatters';
import useDocumentTitle from '../hooks/useDocumentTitle';
import Swal from 'sweetalert2';
import html2pdf from 'html2pdf.js';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2500,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function TaxReport() {
  useDocumentTitle('Tax Report');
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('sale');
  const [businessSettings, setBusinessSettings] = useState(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const compRes = await apiFetch('get_company');
        if (compRes.status === 'success') {
          setBusinessSettings(compRes.data);
        }
      } catch (e) {
        console.error("Failed to fetch company data", e);
      }
    };
    
    fetchCompanyData();
  }, []);


  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // NEW: Fetch history when they click the tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('http://localhost/stock-manager/backend/public/api.php?action=get_tax_history', {
        credentials: 'include'
      });
      const res = await response.json();
      if (res.status === 'success') {
        setHistoryData(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchTaxReport();
  }, [selectedMonth]);

  const fetchTaxReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`get_tax_report&month=${selectedMonth}`);
      if (res.status === 'success') {
        setReport(res);
      }
    } catch (error) {
      console.error("Failed to fetch tax report", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    setSelectedMonth(`${year}-${month}`);
  };

  const summary = report?.summary || { output_vat: 0, input_vat: 0, net_payable: 0 };
  const details = report?.details || [];
  const filteredDetails = details.filter(row => row.type === activeTab);
  
  const totalGross = filteredDetails.reduce((sum, row) => sum + parseFloat(row.total_value), 0);
  const totalAmountWithoutVat = filteredDetails.reduce((sum, row) => sum + parseFloat(row.amount_without_vat), 0);
  const totalTaxAmount = filteredDetails.reduce((sum, row) => sum + parseFloat(row.tax_amount), 0);

  const handleDeclareMonth = async () => {
    // 1. The Beautiful SweetAlert Confirmation Dialog
    const confirmResult = await Swal.fire({
      title: 'Lock Declaration?',
      html: `Are you sure you want to lock the VAT declaration for <b>${selectedMonth}</b>?<br><br><span style="color: #ef4444; font-size: 13px;">⚠️ This action is permanent and cannot be undone.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0B2B5E', // Vendora Blue
      cancelButtonColor: '#f1f5f9',  // Slate-100
      cancelButtonText: '<span style="color: #475569; font-weight: bold;">Cancel</span>',
      confirmButtonText: 'Yes, Lock it!',
      reverseButtons: true, // Puts primary action on the right
      customClass: {
        popup: 'rounded-3xl shadow-2xl border border-slate-100',
        title: 'text-2xl font-black text-slate-800',
        confirmButton: 'rounded-xl font-bold px-6 py-3 shadow-md',
        cancelButton: 'rounded-xl font-bold px-6 py-3 border border-slate-200 hover:bg-slate-200'
      }
    });

    // 2. If they clicked Cancel or clicked outside the box, stop here.
    if (!confirmResult.isConfirmed) return; 
    
    try {
      // 3. Proceed with the secure session fetch
      const response = await fetch('http://localhost/stock-manager/backend/public/api.php?action=declare_tax_month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json' 
        },
        credentials: 'include', 
        body: JSON.stringify({
          month: selectedMonth,
          output_vat: summary.output_vat,
          input_vat: summary.input_vat,
          previous_credit: summary.previous_credit,
          net_payable: summary.net_payable
        })
      });

      const res = await response.json();

      if(res.status === 'success') {
        // Beautiful Success Message instead of window.alert()
        Swal.fire({
          title: 'Locked & Declared!',
          text: `Your VAT report for ${selectedMonth} has been safely archived.`,
          icon: 'success',
          confirmButtonColor: '#10b981', // Emerald green
          customClass: {
            popup: 'rounded-3xl shadow-xl',
            confirmButton: 'rounded-xl font-bold px-8 py-3'
          }
        });
        
        fetchTaxReport(); // Refresh to show the UI as locked
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch(e) {
      console.error(e);
      Swal.fire({
        title: 'Network Error', 
        text: 'Could not reach the server. Please check your connection.', 
        icon: 'error',
        confirmButtonColor: '#0B2B5E'
      });
    }
  };

  // --- CSV Export Logic ---
  const handleExportCSV = () => {
    // --- NEW: History Export Logic ---
    if (activeTab === 'history') {
      if (!historyData || historyData.length === 0) return;
      
      // ADDED: "Declared By" to headers
      const headers = ["Tax Month", "Declared By", "Output VAT", "Input VAT", "Prev. Credit", "Net Paid (RRA)", "Carried Forward", "Declared On"];
      
      const csvRows = historyData.map(row => [
        `"${row.month}"`,
        `"${row.declared_by_name || 'System'}"`, // ADDED: User Name mapping
        row.output_vat,
        row.input_vat,
        row.previous_credit,
        row.net_payable,
        row.carried_forward,
        `"${new Date(row.declared_at).toLocaleString()}"` 
      ].join(","));

      const csvString = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `VAT_Declaration_History.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // --- EXISTING: Sales/Purchases Export Logic ---
    if (!filteredDetails || filteredDetails.length === 0) return;

    const headers = [
      "Date", "Time", "Product", "SKU", "Qty", 
      "Total Amount", "Amount w/o VAT", "Tax Amount"
    ];

    const csvRows = filteredDetails.map(row => {
      const { date, time } = formatDateCell(row.date);
      return [
        `"${date}"`,
        `"${time}"`,
        `"${row.name.replace(/"/g, '""')}"`,
        `"${row.sku}"`,
        row.quantity,
        row.total_value,
        row.amount_without_vat,
        row.tax_amount
      ].join(",");
    });

    csvRows.push([
      '"TOTALS"', '""', '""', '""', '""',
      totalGross, totalAmountWithoutVat, totalTaxAmount
    ].join(","));

    const csvString = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `VAT_Report_${activeTab}_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Custom Print Logic ---
  // --- SHARED REPORT HTML GENERATOR (With Firewall) ---
  const getReportHtmlString = () => {
    // 1. Grab raw table HTML
    let rawTableHtml = document.getElementById('print-table').outerHTML;
    
    // 2. THE FIREWALL: Strip Tailwind classes to prevent 'oklch' PDF crash
    let safeTableHtml = rawTableHtml.replace(/class="[^"]*"/g, '');

    const currentDate = new Date().toLocaleString();
    const currentReportTitle = activeTab === 'history' 
      ? 'VAT Declaration History' 
      : (activeTab === 'sale' ? 'Output VAT Report (Sales)' : 'Input VAT Report (Purchases)');
    
    const compName = businessSettings?.name || businessSettings?.company_name || "VENDORA STORE";
    const compPhone = businessSettings?.phone ? `Tel: ${businessSettings.phone}` : "";
    const compLocation = businessSettings?.location || businessSettings?.address || "";
    const compTin = businessSettings?.tin_number || businessSettings?.tin ? `TIN: ${businessSettings.tin_number || businessSettings.tin}` : "";
    const logoImg = businessSettings?.logo ? `<img src="http://localhost/stock-manager/backend/public/${businessSettings.logo}" style="max-height: 70px; margin-bottom: 10px;" crossorigin="anonymous" />` : '';

    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #1e293b; background: #fff;">
        <style>
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
          <h2 class="report-title">${currentReportTitle}</h2>
          <div class="report-meta">
            <strong>Report Month:</strong> ${selectedMonth} <br>
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

  // --- BUTTON 1: PRINT ENGINE ---
  const handlePrint = () => {
    if ((activeTab !== 'history' && filteredDetails.length === 0) || 
        (activeTab === 'history' && historyData.length === 0)) return;
    
    const printWindow = window.open('', '_blank');
    const htmlContent = getReportHtmlString();
    const currentReportTitle = activeTab === 'history' ? 'VAT Declaration History' : (activeTab === 'sale' ? 'Output VAT Report (Sales)' : 'Input VAT Report (Purchases)');

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
  const handleDownloadPDF = async () => {
    if ((activeTab !== 'history' && filteredDetails.length === 0) || 
        (activeTab === 'history' && historyData.length === 0)) return;

    Toast.fire({ icon: 'info', title: 'Generating PDF...', timer: 3000 });

    const htmlContent = getReportHtmlString();
    const currentReportTitle = activeTab === 'history' ? 'VAT_History' : (activeTab === 'sale' ? 'Output_VAT' : 'Input_VAT');

    const options = {
      margin: 0.2, 
      filename: `${currentReportTitle}_${selectedMonth}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' } 
    };

    html2pdf().set(options).from(htmlContent).save().then(() => {
      Toast.fire({ icon: 'success', title: 'PDF Downloaded!' });
    });
  };

  if (loading && !report) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const isCredit = summary.net_payable < 0;
  const netAmount = Math.abs(summary.net_payable);

  return (
    <div className="max-w-7xl mx-auto pb-10 animate-in fade-in duration-500">
      
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-2xl font-black text-slate-800 tracking-tight">RRA VAT Declaration</h2>
          <p className="text-slate-500 mt-1 text-sm">Calculate your monthly Input and Output VAT automatically.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
          <label className="text-sm font-bold text-slate-600 uppercase tracking-wider">Select Month:</label>
          <div className="relative flex items-center">
            <DatePicker
              selected={selectedMonth} 
              onChange={handleMonthChange}
              dateFormat="MMMM yyyy"
              showMonthYearPicker
              showFullMonthYearPicker
              onKeyDown={(e) => e.preventDefault()} 
              className="font-black text-blue-600 outline-none bg-transparent cursor-pointer w-[150px] z-10 relative pr-6"
            />
            <svg className="w-5 h-5 text-blue-600 absolute right-0 z-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          </div>
        </div>
      </div>

      {report?.is_declared && (
         <div className="bg-emerald-100 text-emerald-800 p-3 rounded-lg mb-4 font-bold text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            This month has been officially declared and locked.
         </div>
      )}

      {/* KPI Cards */}
      {activeTab !== 'history' && ( 
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            
            {/* Output VAT */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 print:hidden"></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Output VAT (From Sales)</p>
              <h3 className="text-xl font-black text-slate-800 mb-2">{formatRwf(summary.output_vat)}</h3>
              <p className="text-[10px] font-medium text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded-md print:border print:border-slate-200">
                Tax collected from customers
              </p>
            </div>
    
            {/* Input VAT */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-8 -mt-8 print:hidden"></div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Input VAT (From Purchases)</p>
              <h3 className="text-xl font-black text-slate-800 mb-2">{formatRwf(summary.input_vat)}</h3>
              <p className="text-[10px] font-medium text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded-md print:border print:border-slate-200">
                Tax paid to suppliers (Deductible)
              </p>
            </div>
    
            {/* Previous Month Credit */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Previous Month Credit</p>
              <h3 className="text-xl font-black text-slate-800 mb-2">{formatRwf(summary.previous_credit || 0)}</h3>
              <p className="text-[10px] font-medium text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded-md print:border print:border-slate-200">
                Carried forward from last month
              </p>
            </div>
    
            {/* Final Net Payable / Actions */}
            <div className={`p-4 rounded-2xl shadow-sm border relative overflow-hidden flex flex-col justify-between ${isCredit ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${isCredit ? 'text-emerald-700' : 'text-red-700'}`}>
                  {isCredit ? 'New VAT Credit (Saved)' : 'Final Net VAT to Pay RRA'}
                </p>
                <h3 className={`text-xl font-black mb-1 ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatRwf(netAmount)}
                </h3>
              </div>
              
              {/* Dynamic Action Button */}
              <div className="print:hidden">
                {!report?.is_declared ? (
                  <button 
                    onClick={handleDeclareMonth}
                    className="mt-1 w-full bg-[#0B2B5E] text-white text-[11px] font-bold py-2 rounded-lg hover:bg-blue-900 transition-colors"
                  >
                    Mark as Declared
                  </button>
                ) : (
                  <p className="text-[10px] font-bold inline-block px-2 py-1 rounded-md bg-slate-200 text-slate-600 mt-1">
                    Locked
                  </p>
                )}
              </div>
            </div>
            
          </div>
        </>
      )}

      {/* Itemized Breakdown Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        {/* Table Header / Tabs / Export Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-5 p-4 border-b border-slate-100 bg-slate-50/50">
  
          {/* Left Section: Tabs Group */}
          <div className="flex gap-2 bg-slate-200/50 p-1 rounded-lg w-full lg:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('sale')}
              className={`flex justify-center items-center px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'sale' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sales (Output VAT)
            </button>
            <button 
              onClick={() => setActiveTab('purchase')}
              className={`flex justify-center items-center px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'purchase' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Purchases (Input VAT)
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex justify-center items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="whitespace-nowrap">Audit History</span>
            </button>
          </div>
        
          {/* Right Section: Action Buttons Group */}
          <div className="grid grid-cols-2 sm:flex sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0">
            <button 
              onClick={handleExportCSV}
              disabled={activeTab === 'history' ? historyData.length === 0 : filteredDetails.length === 0}
             className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span className="whitespace-nowrap">Export CSV</span>
            </button>

            <button 
              onClick={handleDownloadPDF}
              disabled={activeTab === 'history' ? historyData.length === 0 : filteredDetails.length === 0}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <span className="whitespace-nowrap">Download PDF</span>
            </button>

            <button 
              onClick={handlePrint}
              disabled={activeTab === 'history' ? historyData.length === 0 : filteredDetails.length === 0}
              className="hidden md:flex flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
              </svg>
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Render Table Area */}
          {loading || (activeTab === 'history' && loadingHistory) ? (
            <div className="p-10 flex justify-center"><div className="w-6 h-6 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div></div>
          ) : activeTab === 'history' ? (
            
            /* --- NEW: DECLARATION HISTORY LEDGER --- */
            <div className="overflow-x-auto custom-scrollbar">
            <table id="print-table" className="w-full text-left whitespace-nowrap min-w-[900px]">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">#</th>
                  <th className="px-4 py-3 rounded-tl-lg">Tax Month</th>
                  <th className="px-4 py-3">Declared By</th>
                  <th className="px-4 py-3 text-right">Output VAT</th>
                  <th className="px-4 py-3 text-right">Input VAT</th>
                  <th className="px-4 py-3 text-right">Prev. Credit</th>
                  <th className="px-4 py-3 text-right">Net Paid (RRA)</th>
                  <th className="px-4 py-3 text-right">Carried Forward</th>
                  <th className="px-4 py-3 rounded-tr-lg">Declared On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyData.length === 0 ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400 text-sm font-medium">No past declarations found.</td></tr>
                ) : (
                  historyData.map((row, idx) => {
                    const { date, time } = formatDateCell(row.declared_at);
                    return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      {/* REDUCED PADDING to py-2.5 */}
                      <td className="px-4 py-2.5 text-[13px] font-bold text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2.5 text-[13px]" >
                        <span className="font-black text-slate-800 bg-slate-100 px-3 py-1 rounded-md">{row.month}</span>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] font-bold text-slate-600">
                        {row.declared_by_name || ''}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-right font-bold text-blue-600">{formatRwf(row.output_vat)}</td>
                      <td className="px-4 py-2.5 text-[13px] text-right font-bold text-amber-600">{formatRwf(row.input_vat)}</td>
                      <td className="px-4 py-2.5 text-[13px] text-right font-bold text-slate-500">{formatRwf(row.previous_credit)}</td>
                      <td className="px-4 py-2.5 text-[13px] text-right font-black text-red-600 bg-red-50/30">{formatRwf(row.net_payable)}</td>
                      <td className="px-4 py-2.5 text-[13px] text-right font-black text-emerald-600 bg-emerald-50/30">{formatRwf(row.carried_forward)}</td>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-500">
                        <div className="font-semibold text-[12px] text-slate-800">{date}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{time}</div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
  
          ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table id="print-table" className="w-full text-left whitespace-nowrap min-w-[900px]">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">#</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-right">Amount w/o VAT</th>
                  <th className="px-4 py-3 text-right">VAT Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDetails.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400 text-sm font-medium">No {activeTab === 'sale' ? 'sales' : 'purchases'} found for this month.</td></tr>
                ) : (
                  filteredDetails.map((row, idx) => {
                    const { date, time } = formatDateCell(row.date);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5 text-right font-black text-slate-700 text-[12px]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          <div className="font-bold text-slate-700 text-[12px] leading-tight">{date}</div>
                          <div className="text-[12px]">{time}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-800 text-[12px]">{row.name}</div>
                          <div className="text-[11px] text-slate-400">{row.sku}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-700 text-[12px]">
                          {row.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600 text-[12px] font-bold">
                          {formatRwf(row.total_value)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600 text-[12px] font-bold">
                          {formatRwf(row.amount_without_vat)}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-black text-xs ${activeTab === 'sale' ? 'text-blue-600' : 'text-amber-600'}`}>
                          {activeTab === 'sale' ? '+' : '-'}{formatRwf(row.tax_amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              
              {/* Footer Totals */}
              {filteredDetails.length > 0 && (
                <tfoot className="bg-slate-50/80 border-t-2 border-slate-200">
                  <tr>
                    <td colSpan="3" className="px-4 py-3.5 text-right font-black text-slate-600 text-sm tracking-wider uppercase">
                      Category Totals:
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-800 text-sm">
                      {formatRwf(totalGross)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-slate-800 text-sm">
                      {formatRwf(totalAmountWithoutVat)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-black text-sm ${activeTab === 'sale' ? 'text-blue-600' : 'text-amber-600'}`}>
                      {formatRwf(totalTaxAmount)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 