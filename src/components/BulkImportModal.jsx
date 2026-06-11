import { useState, useRef } from 'react';
import { apiFetch } from '../config/api';
import Swal from 'sweetalert2';

export default function BulkImportModal({ isOpen, onClose, onSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [parsedData, setParsedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 1. Generate & Download CSV Template
  const downloadTemplate = () => {
    const headers = "name,sku,buy_price,sell_price,stock_quantity\n";
    const sampleRow = "Sample Phone Case,CASE-001,2500,5000,50\n";
    const blob = new Blob([headers + sampleRow], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Vendora_Import_Template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // 2. CSV Parser (Frontend)
  const handleFileUpload = (file) => {
    if (!file || !file.name.endsWith('.csv')) {
      return Swal.fire('Invalid File', 'Please upload a valid .csv file.', 'error');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      // Basic comma split (Assuming no commas inside product names for simplicity)
      const data = lines.slice(1).map(line => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
        return {
          name: values[0]?.trim(),
          sku: values[1]?.trim(),
          buy_price: parseFloat(values[2]) || 0,
          sell_price: parseFloat(values[3]) || 0,
          stock_quantity: parseInt(values[4]) || 0
        };
      }).filter(item => item.name && item.sku); // Remove empty rows

      setParsedData(data);
    };
    reader.readAsText(file);
  };

  // Drag & Drop Handlers
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files[0]);
  };

  // 3. Send Data to PHP Backend
  const handleImportSubmit = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);

    try {
      const res = await apiFetch('bulk_import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: parsedData })
      });

      if (res.status === 'success') {
        Swal.fire('Import Successful!', res.message, 'success');
        setParsedData([]);
        onSuccess(); // Refresh inventory table
        onClose();   // Close modal
      } else {
        Swal.fire('Error', res.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Failed to communicate with server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            Bulk Import CSV
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="p-6">
          {parsedData.length === 0 ? (
            <>
              {/* Instructions */}
              <div className="mb-6 flex justify-between items-center bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div className="text-xs text-slate-600 font-medium leading-relaxed">
                  1. Download the strict CSV template.<br/>
                  2. Fill in your products (No commas in names!).<br/>
                  3. Upload the file below.
                </div>
                <button onClick={downloadTemplate} className="text-xs bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg font-bold shadow-sm transition-colors flex items-center gap-1.5 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Template
                </button>
              </div>

              {/* Drag & Drop Zone */}
              <div 
                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'}`}
              >
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files[0])} />
                <svg className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p className="text-sm font-bold text-slate-700">Click or drag CSV file here</p>
                <p className="text-xs text-slate-500 mt-1">Maximum file size: 5MB</p>
              </div>
            </>
          ) : (
            // Preview State
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h2 className="text-2xl font-black text-slate-800">{parsedData.length} Products Found</h2>
              <p className="text-slate-500 text-sm mt-1 mb-6">Your data has been formatted and is ready to import. Existing SKUs will be updated with new stock and prices.</p>
              
              <div className="flex gap-3 justify-center">
                <button onClick={() => setParsedData([])} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
                <button onClick={handleImportSubmit} disabled={loading} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Confirm Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}