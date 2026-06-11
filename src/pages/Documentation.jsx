import { useState } from 'react';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function Documentation() {
  useDocumentTitle('Documentation');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navGroups = [
    {
      title: "Platform",
      items: [
        { id: 'overview', label: 'Overview & Dashboard' },
        { id: 'auth', label: 'Registration & Security' },
        { id: 'settings', label: 'Settings & Team Roles' },
      ]
    },
    {
      title: "Operations",
      items: [
        { id: 'pos', label: 'POS & Shift Analytics' },
        { id: 'inventory', label: 'Inventory & Purchases' },
        { id: 'notifications', label: 'Automated Notifications' },
      ]
    },
    {
      title: "Finance & Accounting",
      items: [
        { id: 'cashflow', label: 'Sales, Expenses & Credit' },
        { id: 'reports', label: 'Financial Reports & Audits' },
        { id: 'tax', label: 'VAT & Tax Compliance' },
      ]
    },
    {
      title: "Help & Resources",
      items: [
        { id: 'hardware', label: 'Hardware Setup' },
        { id: 'shortcuts', label: 'Keyboard Shortcuts' },
        { id: 'faq', label: 'FAQ & Troubleshooting' },
      ]
    }
  ];

  // UI Components for Premium Formatting
  const ProTip = ({ children }) => (
    <div className="my-8 flex gap-4 rounded-2xl bg-indigo-50/80 p-5 ring-1 ring-inset ring-indigo-100 shadow-sm">
      <svg className="h-6 w-6 shrink-0 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.829 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.487 1.509 1.333 1.509 2.316V18" /></svg>
      <div className="text-sm leading-relaxed text-indigo-900">{children}</div>
    </div>
  );

  const FormulaBox = ({ title, logic, description }) => (
    <div className="my-6 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm">
      <div className="bg-slate-100/50 px-4 py-2 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
        System Logic: {title}
      </div>
      <div className="p-5">
        <code className="block rounded-lg bg-white px-4 py-3 text-pink-600 font-mono text-sm shadow-sm ring-1 ring-slate-200 mb-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">
          {logic}
        </code>
        <p className="text-sm text-slate-600 m-0 leading-relaxed">{description}</p>
      </div>
    </div>
  );

  const ScreenshotSpace = ({ alt, imagePath }) => (
    <div className="my-10 rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
      {imagePath ? (
        <img src={imagePath} alt={alt} className="w-full rounded-xl border border-slate-100" />
      ) : (
        <div className="aspect-[16/9] w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
          <svg className="w-10 h-10 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          <span className="font-semibold text-sm">Screenshot Space</span>
          <span className="text-xs mt-1">{alt}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 animate-in fade-in duration-500 relative">
      
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6 sticky top-4 z-40">
        <div className="flex items-center gap-3">
          <a href="/" className="p-2 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </a>
          <h2 className="font-bold text-slate-800 tracking-tight">Documentation</h2>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-50 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </div>

      {/* Desktop Header */}
      <div className="relative mb-8 lg:mb-12 rounded-3xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 px-6 py-10 lg:px-8 lg:py-14 shadow-xl overflow-hidden hidden lg:block">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl mb-4">Vendora Documentation</h1>
            <p className="text-lg font-medium text-slate-300 leading-relaxed">
              The comprehensive guide to operating your enterprise. Master your inventory, track cash flow with precision, and automate your financial compliance down to the exact decimal.
            </p>
          </div>
          <a href="/" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-xl font-bold transition-all backdrop-blur-sm shrink-0 shadow-lg hover:-translate-y-0.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard
          </a>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 relative">
        
        {/* Sidebar Navigation */}
        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out lg:static lg:w-64 lg:shrink-0 lg:p-0 lg:shadow-none lg:bg-transparent lg:transform-none lg:z-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex items-center justify-between lg:hidden mb-8">
            <span className="font-black text-xl text-slate-800">Menu</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
          </div>

          <nav className="sticky top-8 space-y-8">
            {navGroups.map((group, idx) => (
              <div key={idx}>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{group.title}</h3>
                <ul className="space-y-1 border-l-2 border-slate-100">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <button onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`block w-full -ml-[2px] border-l-2 py-2 pl-4 text-left text-sm font-semibold transition-all ${activeTab === item.id ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-r-lg' : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 pb-20">
          <div className="prose prose-slate prose-headings:text-slate-900 prose-headings:tracking-tight prose-a:text-blue-600 max-w-none">
            
            {/* 1. OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Overview & Dashboard</h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Vendora is not just a Point of Sale; it is a real-time, enterprise-grade ERP (Enterprise Resource Planning) platform. It unifies your front-of-house customer transactions with rigorous back-office accounting, ensuring that every item sold instantly reflects in your financial ledgers.
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/Dashboard.png'} alt="Main Dashboard showcasing KPI cards and financial charts" />

                <h3 className="text-xl font-bold mt-10 mb-4">Understanding the Dashboard Metrics</h3>
                <p className="text-slate-600 mb-6">
                  The Dashboard is designed to give business owners immediate, actionable intelligence the second they log in. The financial charts map Gross Revenue against Net Profit over time, allowing you to quickly spot trends (e.g., "Are we selling a lot but making very little profit?"). The top KPI cards evaluate your current standing based on strict financial logic:
                </p>

                <FormulaBox 
                  title="Stock Value (Asset Valuation)" 
                  logic="Σ (Product Current Stock × Product Buy Price)" 
                  description="This represents your liquidity trap. It is the total amount of your company's capital currently locked in physical warehouse inventory. Monitoring this prevents over-purchasing and dead stock." 
                />
                
                <FormulaBox 
                  title="Sales Today (Revenue Generation)" 
                  logic="[If No VAT]: Σ (Quantity Sold Today × Sell Price)&#10;[If VAT Registered (Net)]: Σ (Quantity Sold Today × Sell Price) × (100 / 118)" 
                  description="Your real-time topline revenue. If your business is VAT Registered, this metric automatically strips out the 18% tax. This is crucial because tax money belongs to the RRA, not your business, and inflating your revenue numbers with tax money leads to poor financial planning." 
                />

                <FormulaBox 
                  title="Profit Today (Gross Margin)" 
                  logic="[If No VAT]: Sales Today (No VAT) - Σ (Quantity Sold Today × Buy Price)&#10;[If VAT Registered (Net)]: Sales Today (Net) - Σ (Quantity Sold Today × Buy Price)" 
                  description="The lifeblood of your operations. This is your Gross Profit for the current day, updating the exact second a cashier hits 'Checkout'." 
                />

                <FormulaBox 
                  title="Purchases Today (Capital Expenditure)" 
                  logic="Σ (Quantity Restocked Today × Buy Price)" 
                  description="The total financial cost of incoming supplier inventory recorded on the current day. Spikes here indicate recent vendor deliveries." 
                />
              </div>
            )}

            {/* 2. AUTHENTICATION & SECURITY */}
            {activeTab === 'auth' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Registration & Data Security</h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Enterprise data requires enterprise-grade security. Vendora utilizes modern cryptographic standards to ensure your financial data, customer details, and inventory counts remain strictly confidential and tamper-proof.
                </p>

                <h3 className="text-xl font-bold mt-8 mb-4">Creating a Business Account</h3>
                <p className="text-slate-600 mb-6">
                  During registration, you establish your isolated "Tenant" environment. This guarantees that your company's data is logically separated from all other businesses on the platform. You must provide core details (Company Name, Location) and designate the primary Super Admin profile.
                </p>
                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/Register.png'} alt="Registration interface for creating a new business account" />

                <h3 className="text-xl font-bold mt-10 mb-4">Authentication & Access Control</h3>
                <p className="text-slate-600 mb-6">
                  Every user logs in via a secure session token. Passwords are never stored in plain text; they are hashed using bcrypt. Upon successful authentication, the system's routing engine evaluates the user's role:
                </p>
                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-8">
                  <li><strong>Admins</strong> are routed to the master dashboard with full visibility.</li>
                  <li><strong>Cashiers</strong> are blocked from accessing financial reports and are routed directly to the POS terminal to begin their shift.</li>
                </ul>
                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/Login.png'} alt="Secure login screen for Admins and Cashiers" />

                <ProTip>
                  <strong>Account Recovery:</strong> If a user forgets their password, they must use the "Forgot Password" flow to receive a secure, time-sensitive reset link via email. Admins can also manually force a password reset for cashiers via the Team Management portal.
                </ProTip>
              </div>
            )}

            {/* 3. SETTINGS */}
            {activeTab === 'settings' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Settings & Team Roles</h2>
                
                <h3 className="text-xl font-bold mt-8 mb-4">SaaS Branding, Billing & Thermal Receipts</h3>
                <p className="text-slate-600 mb-6">
                  Navigate to <strong>Settings &gt; Business & Receipt</strong>. This is where you configure the public-facing identity of your enterprise, ensuring compliance and professionalism in every customer interaction.
                </p>
                
                <ul className="space-y-3 text-slate-600 list-disc pl-5 mb-6">
                  <li><strong>Compliance Identity:</strong> Upload your Store Logo, Business Name, Phone, and crucially, your TIN Number. This information is dynamically injected into the header of every thermal receipt generated by the POS, satisfying basic RRA identification requirements.</li>
                  <li><strong>Professional Billing (Invoices):</strong> To facilitate seamless B2B transactions, upload your <strong>Authorized Stamp/Signature</strong> and input your <strong>Bank Name & Account Number</strong>. These details print automatically on A4 Proforma and Final Invoices, providing legally binding documentation and explicit payment routing instructions for your corporate clients.</li>
                </ul>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/settings.png'} alt="Settings page showing Business & Receipt configuration" />

                <h3 className="text-xl font-bold mt-10 mb-4">Granular Team Management</h3>
                <p className="text-slate-600 mb-6">
                  Under <strong>Settings &gt; Team & Roles</strong>, Admins can invite staff and enforce strict internal controls. By defining roles, you protect your sensitive financial data from unauthorized viewing or tampering.
                </p>

                <div className="grid sm:grid-cols-2 gap-6 my-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      </span>
                      Cashiers (Front-of-House)
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Severely restricted access. Cashiers can only open their register drawer, process standard POS transactions, and view their own localized sales history to process refunds. They cannot view inventory costs, total business profit, or alter the product catalog.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04z" /></svg>
                      </span>
                      Admins (Back-Office)
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">Full, unrestricted platform access. Admins can view granular financial reports, manage the product catalog, execute bulk restocks, alter team credentials, and audit the global action logs.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. POS & SHIFTS */}
            {activeTab === 'pos' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">POS & Shift Analytics</h2>
                
                <h3 className="text-xl font-bold mt-8 mb-4">Register Initialization (The Float)</h3>
                <p className="text-slate-600 mb-6">
                  Accountability begins before the first sale. Upon logging in, cashiers are locked out of the POS until they declare their <strong>Starting Cash (Float)</strong>. This is the change given to them by the manager in the morning (e.g., 20,000 Rwf in small bills). This establishes the mathematical baseline for the entire day's drawer audit.
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/pos.png'} alt="Point of Sale interface with active shopping cart" />

                <h3 className="text-xl font-bold mt-8 mb-4">The Checkout Pipeline</h3>
                <ol className="space-y-4 text-slate-600 list-decimal pl-5 mb-8">
                  <li><strong>Cart Assembly:</strong> Type a SKU, search by name, or fire a barcode scanner. Exact matches are instantly appended to the active cart. Quantities can be adjusted via the touchscreen or keyboard.</li>
                  <li><strong>Tender & Change Calculation:</strong> Select the payment method (Cash, Card, Mobile Money). If a customer hands over a large bill (e.g., 5,000 Rwf for a 3,200 Rwf item), the cashier enters the tendered amount, and the POS automatically displays the exact change due, eliminating mental math errors.</li>
                  <li><strong>Finalization:</strong> Clicking 'Checkout' triggers a massive background chain reaction: inventory is deducted, revenue is logged, the transaction is permanently sealed in the database, and the thermal receipt is spooled to the printer.</li>
                </ol>

                <h3 className="text-xl font-bold mt-10 mb-4">Proforma Invoices (The Quote-to-Cash Workflow)</h3>
                <p className="text-slate-600 mb-4">
                  For B2B clients and corporate procurement, you often need to provide official pricing before securing a PO (Purchase Order). Vendora handles this gracefully:
                </p>
                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-8">
                  <li>Build the requested cart in the POS as usual.</li>
                  <li>Instead of clicking "Checkout" (which finalizes the sale), click <strong>Print Proforma</strong>.</li>
                  <li>The system generates a branded "PROFORMA INVOICE" containing your authorized stamp, bank details, and validity terms. Crucially, <strong>no stock is deducted and no revenue is recorded</strong> during this action.</li>
                </ul>

                <h3 className="text-xl font-bold mt-10 mb-4">Shift Analytics & The Z-Report</h3>
                <p className="text-slate-600 mb-4">
                  Found in the Admin sidebar, the <strong>Shift Analytics</strong> dashboard is your primary anti-theft countermeasure. When a cashier finishes their shift, they must count their physical drawer and declare their "Actual Cash." The system then compares this against its internal mathematical ledger to expose any missing funds.
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/shift.png'} alt="Shift Analytics dashboard showing drawer cash accuracy" />

                <FormulaBox 
                  title="Total Expected Cash (System Truth)" 
                  logic="Σ (Cashier Starting Float) + Σ (All Cash Sales executed during Shift)" 
                  description="The exact amount of physical cash that the software mathematically demands to be inside the physical drawer at the time of closure." 
                />

                <FormulaBox 
                  title="Total Actual Cash (Human Declaration)" 
                  logic="Σ (Cash amount manually counted and submitted by the cashier during register closure)" 
                  description="The real-world cash drop submitted by the staff. This creates the 'Z-Report' finalization." 
                />

                <FormulaBox 
                  title="Net Drawer Variance" 
                  logic="Total Expected Cash - Total Actual Cash" 
                  description="The absolute cash variance. If positive (marked in red), the cashier has 'shorted' the drawer and cash is missing. If zero, the shift balanced with mathematical perfection." 
                />
              </div>
            )}

            {/* 5. INVENTORY */}
            {activeTab === 'inventory' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Inventory & Enterprise Tracking</h2>
                
                <h3 className="text-xl font-bold mt-8 mb-4">Product Catalog & Bulk Data Ingestion</h3>
                <p className="text-slate-600 mb-6">
                  The <strong>Inventory</strong> tab is the master database of your catalog. Every product must be rigorously defined with a unique SKU, an acquisition cost (Buy Price), and a retail value (Sell Price).
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/inventory.png'} alt="Inventory table showing products, stock levels, and import options" />

                <ProTip>
                  <strong>Migrating from Legacy Systems?</strong> Click <strong>Import Excel (CSV)</strong>. Download our strict formatting template, populate it with your historical data (ensuring no commas exist in product names to avoid CSV breaking), and upload it. The engine will parse and construct hundreds of product profiles in milliseconds.
                </ProTip>

                <h3 className="text-xl font-bold mt-10 mb-4">Purchases & Capital Expenditure</h3>
                <p className="text-slate-600 mb-4">
                  Manual inventory editing is strictly forbidden to maintain audit integrity. When supplier shipments arrive, Admins must navigate to <strong>Purchases &gt; Record Bulk Restock</strong>.
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/bulk.png'} alt="Purchases ledger showing incoming stock history" />

                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-8">
                  <li>Processing items here performs a dual-action ledger entry: it instantly increases your physical stock levels while simultaneously logging a financial outflow (Capital Expenditure) in your accounting reports.</li>
                  <li>Upon finalization, Admins can print a <strong>Receiving Voucher</strong> to physically staple to the supplier's delivery note for paper trail compliance.</li>
                </ul>

                <h3 className="text-xl font-bold mt-10 mb-4">Batch Management & FEFO Expiry Routing</h3>
                <p className="text-slate-600 mb-4">
                  For perishable goods (Pharmacies, Supermarkets), standard bulk counting is dangerous. Vendora supports splitting inventory into distinct lifecycle batches.
                </p>
                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-8">
                  <li>During restock, Admins assign a <strong>Batch ID</strong> and an explicit <strong>Expiry Date</strong> to the incoming shipment.</li>
                  <li>During checkout, the POS engine abandons basic FIFO (First In, First Out) and applies <strong>FEFO (First Expire, First Out)</strong> logic. It automatically deducts stock from the batch closest to expiration, drastically reducing spoilage waste.</li>
                  <li>The Daily Auditor acts as a safeguard, proactively pushing alerts to the Admin dashboard for any batches expiring within a 30-day window.</li>
                </ul>

                <h3 className="text-xl font-bold mt-10 mb-4">Serial Number (IMEI) Lifecycle Tracking</h3>
                <p className="text-slate-600 mb-4">
                  For high-value electronics and appliances, warranty fraud is a massive liability. Vendora's Serial Tracking engine enforces absolute item accountability.
                </p>
                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-8">
                  <li><strong>Inbound Pipeline:</strong> During restock, the Admin is forced to scan the unique manufacturer barcode (e.g., IMEI, MAC address) for *every individual unit* inside the shipment box.</li>
                  <li><strong>Outbound Pipeline:</strong> Cashiers cannot simply increase quantity on the POS screen. The system locks the transaction until the cashier explicitly scans the exact serial number on the physical box they are handing over the counter.</li>
                  <li><strong>RMA & Warranty:</strong> This process explicitly hardcodes the serial number onto the customer's digital and printed receipt. If a customer returns a broken device, scanning the serial number instantly verifies if it was genuinely purchased from your store and if the warranty period is still active.</li>
                </ul>
              </div>
            )}

            {/* 6. NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Automated Notifications Engine</h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Enterprise managers shouldn't have to spend hours digging through static reports to find problems. Vendora acts as your Virtual Store Manager—featuring a proactive notification engine that continuously monitors operations, identifies liabilities, and brings them directly to the Admin's attention.
                </p>

                <h3 className="text-xl font-bold mt-8 mb-4">Real-Time Inventory Alerts</h3>
                <p className="text-slate-600 mb-6">
                  These alerts bypass the database polling and trigger the exact second a front-of-house sale breaches your critical inventory minimums. Clicking the notification acts as a deep link, automatically routing you to the Inventory page and filtering the view for that specific product so you can reorder immediately.
                </p>
                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-8">
                  <li><strong>Low Stock:</strong> Generated instantly when a product's available quantity drops to the danger zone (5 units or fewer).</li>
                  <li><strong>Out of Stock:</strong> Fired the absolute moment a product's inventory hits 0, indicating immediate lost revenue potential.</li>
                  <li><strong>Restock Requests:</strong> A human-driven alert triggered when a cashier manually clicks "Request Restock" from the POS terminal upon noticing a physically empty shelf or popular customer inquiry.</li>
                </ul>

                <h3 className="text-xl font-bold mt-10 mb-4">The Daily Auditor (Financials & Compliance)</h3>
                <p className="text-slate-600 mb-6">
                  The Daily Auditor is a heavy-duty background script. Instead of running continuously (which slows down servers), it executes a comprehensive date-based scan the moment an Admin logs in for the morning. To prevent alert fatigue and inbox spam, the engine is constrained by a strict Anti-Spam rule: it will only generate one alert per issue, per day.
                </p>
                
                <div className="grid sm:grid-cols-2 gap-6 my-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-red-600 flex items-center gap-2 mb-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Accounts Receivable Alerts
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">The Auditor scans the global ledger for <strong>Payments Due Today</strong> and <strong>Overdue Debts</strong>. It extracts the customer name, outstanding Rwf balance, and Invoice Number. Clicking the notification instantly opens that specific customer's profile in the Debt portal for immediate collection calls.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-yellow-600 flex items-center gap-2 mb-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Shift Abandonment Warnings
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">If a cashier abandons their station or goes home without finalizing their drawer, leaving a shift "Open" for more than 24 hours, the Auditor alerts the Admin. The Admin can click the warning to force-close the register and reconcile the cash variance manually.</p>
                  </div>
                </div>

                <ProTip>
                  <strong>System Broadcasts:</strong> The notification architecture also supports general System Alerts (indicated by blue icons). In future updates, this allows Super Admins to push global text announcements (e.g., "Holiday hours start tomorrow") to all staff member dashboards simultaneously.
                </ProTip>
              </div>
            )}

            {/* 7. CASHFLOW & CREDIT */}
            {activeTab === 'cashflow' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Sales, Expenses & Credit Facilities</h2>
                
                <h3 className="text-xl font-bold mt-8 mb-4">Dynamic Sales & Purchase Ledgers</h3>
                <p className="text-slate-600 mb-6">
                  Your Sales and Purchases tabs act as your immutable historical ledgers. Utilizing the date filters allows you to isolate performance metrics for a specific day, week, or fiscal quarter. The engine recalculates totals instantly:
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/sales.png'} alt="Sales history showing individual transactions and profit margins" />
                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/purchase.png'} alt="Purchases history showing individual transactions and cost of goods " />

                <FormulaBox 
                  title="Total Sales Amount (Period Revenue)" 
                  logic="[If No VAT]: Σ (Quantity Sold in Period × Sell Price)&#10;[If VAT Registered (Net)]: Σ (Quantity Sold in Period × Sell Price) × (100 / 118)" 
                  description="Cumulative revenue recognized during the filtered date range." 
                />

                <FormulaBox 
                  title="Total Profit (Period Margin)" 
                  logic="[If No VAT]: Total Sales Amount (No VAT) - Σ (Quantity Sold in Period × Buy Price)&#10;[If VAT Registered (Net)]: Total Sales Amount (Net) - Σ (Quantity Sold in Period × Buy Price)" 
                  description="Total gross profit generated within the specified timeframe. This reveals if a high-sales week was actually profitable." 
                />

                <h3 className="text-xl font-bold mt-10 mb-4">Operational Expense Tracking</h3>
                <p className="text-slate-600 mb-6">
                  Gross profit is an illusion until overhead is paid. To understand your true operational health, Admins must rigorously log non-inventory outflows in the <strong>Expenses</strong> tab. Categorizing items like <em>Shop Rent</em>, <em>Internet</em>, <em>Salaries</em>, or <em>Electricity</em> provides a clear picture of where cash is bleeding.
                </p>

                <FormulaBox 
                  title="Total Expenses" 
                  logic="Σ (All logged operational expense amounts in selected period)" 
                  description="Total money spent on non-inventory operational overhead. This is the critical figure deducted from Gross Profit to arrive at Net Profit." 
                />

                <h3 className="text-xl font-bold mt-10 mb-4">Credit & Debt Management</h3>
                <p className="text-slate-600 mb-4">
                  The <strong>Credit Management</strong> tab is a specialized ledger dedicated to delayed payments. Operating businesses on credit is risky without strict tracking. This portal divides debts into two distinct classes:
                </p>
                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-6">
                  <li><strong>Customer Debts (Accounts Receivable):</strong> Goods handed to clients without full payment. The system tracks "Partial Payments" (e.g., Client paid 50%, owes 50%) and enforces deadline dates monitored by the Daily Auditor.</li>
                  <li><strong>Supplier Debts (Accounts Payable):</strong> Bulk inventory shipments you have received into your warehouse but have not yet fully paid the vendor for.</li>
                </ul>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/credit.png'} alt="Credit Management ledger showing outstanding customer debts" />

                <p className="text-slate-600">
                  When a client physically brings cash to settle an old invoice, clicking <strong>Clear Debt</strong> executes a state change, updating the transaction status from "CREDIT" or "PARTIAL" to completely "PAID", thereby clearing it from the Daily Auditor's warning list.
                </p>
              </div>
            )}

            {/* 8. REPORTS */}
            {activeTab === 'reports' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Financial Reports & Audits</h2>
                
                <h3 className="text-xl font-bold mt-8 mb-4">The Income & Expense (P&L) Statement</h3>
                <p className="text-slate-600 mb-6">
                  Located under <strong>Reports</strong>, this is the most critical page for business owners and external accountants. It synthesizes millions of data points into a single, comprehensive Profit and Loss statement for any requested date range, executing a strict three-step accounting flow:
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/Income and expense.png'} alt="Income & Expense statement calculating Net Profit" />
                
                <FormulaBox 
                  title="Net Profit Execution Pipeline" 
                  logic="1. COGS (Cost of Goods Sold) = Σ (Quantity Sold × Original Buy Price)&#10;2. GROSS PROFIT = Total Sales Revenue - COGS&#10;3. NET PROFIT (Realized Income) = GROSS PROFIT - Total Operational Expenses" 
                  description="This strict cascade isolates exactly how much money the business actually kept in the bank after paying for the raw products (COGS) and keeping the lights on (Expenses)." 
                />

                <h3 className="text-xl font-bold mt-10 mb-4">Stock Performance & Forensic Audit</h3>
                <p className="text-slate-600 mb-6">
                  The <strong>Stock Status</strong> tab is a forensic tool designed to detect "phantom" capital loss caused by poor data entry or system anomalies. It captures your inventory capital and profit milestones as snapshots in time to ensure your ledger is perfectly balanced.
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/stock-audit.png'} alt="Stock Status Audit checking starting vs ending capital" />

                <FormulaBox 
                  title="Capital Variance Audits" 
                  logic="Starting Capital: Stock Value exactly at START DATE (00:00:00)&#10;Ending Capital: Stock Value exactly at END DATE (23:59:59)&#10;&#10;Starting Profit (Net): Historical cumulative profit up to the START DATE&#10;Ending Profit (Net): Historical cumulative profit up to the END DATE" 
                  description="By comparing your warehouse physical value against historical profit milestones, you can detect if stock was deleted maliciously. If Admins suspect severe database corruption, the 'Recalc & Fix Data' tools can force the engine to safely resynchronize all tables." 
                />

                <h3 className="text-xl font-bold mt-10 mb-4">The Global Audit Log</h3>
                <p className="text-slate-600 mb-4">
                  "Trust, but verify." In an enterprise environment, accountability is paramount. The Global Audit Log is a read-only, tamper-proof timeline. Every critical or destructive action in the system—whether an Admin deletes an expense, modifies a user's role, or alters business settings—is permanently captured with the exact User ID, Action Type, and Timestamp. This is your ultimate defense against internal fraud.
                </p>
              </div>
            )}

            {/* 9. TAX */}
            {activeTab === 'tax' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">VAT & Compliance</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  Vendora fundamentally removes the manual headache of monthly tax declarations. By toggling "VAT Registered" to ON in your Business Settings, the platform's accounting engine instantly rewires itself to process all transactions using exact EBM (Electronic Billing Machine) mathematical standards.
                </p>

                <h3 className="text-xl font-bold mt-8 mb-4">RRA VAT Declaration Dashboard</h3>
                <p className="text-slate-600 mb-6">
                  Found under <strong>Reports &gt; VAT Declaration</strong>, this dashboard acts as an automated tax accountant. It calculates your exact tax liability for a given calendar month, providing an itemized, exportable breakdown of every taxable transaction to satisfy RRA auditors.
                </p>

                <ScreenshotSpace imagePath={'http://localhost/stock-manager/frontend/src/assets/images/rra-vat.png'} alt="RRA VAT Declaration dashboard showing Input and Output tax" />

                <FormulaBox 
                  title="Automated Value Added Tax (VAT) Engine" 
                  logic="Calculated Net Amount = (Inclusive Amount × 100) / 118&#10;Calculated VAT = (Inclusive Amount × 18) / 118&#10;&#10;Output VAT = Σ (Customer VAT Amounts Collected)&#10;Input VAT = Σ (Supplier VAT Amounts Paid)&#10;NET VAT TO PAY = Output VAT - Input VAT (Deductible)" 
                  description="The brilliance of VAT: You collect 'Output VAT' from your customers on behalf of the government, but you are legally allowed to deduct the 'Input VAT' you already paid to your suppliers when buying the stock. The resulting 'Net VAT to Pay' is the precise amount you must declare and wire to the RRA by the 15th of the following month." 
                />

                <ProTip>
                  <strong>Audit-Proof Thermal Receipts & Invoices:</strong> When the VAT module is active, the POS engine alters its print templates. Customer receipts will automatically extract the VAT from the grand total, explicitly printing the "SUBTOTAL (NET)" and "VAT (18%)" lines. This ensures total legal compliance with revenue authority mandates for valid billing documents.
                </ProTip>
              </div>
            )}

            {/* 10. HARDWARE SETUP */}
            {activeTab === 'hardware' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Hardware Integration</h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Vendora is a pure web-based SaaS architecture. This means it requires absolutely zero proprietary drivers or complex middle-ware to interact with physical POS hardware. It relies entirely on native browser standards.
                </p>

                <h3 className="text-xl font-bold mt-8 mb-4">Barcode Scanner Calibration</h3>
                <p className="text-slate-600 mb-4">
                  To a web browser, a barcode scanner is identical to an extremely fast typist on a keyboard. 
                </p>
                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-8">
                  <li>Plug your USB or Bluetooth scanner into the workstation.</li>
                  <li>Ensure the scanner is programmed with a <strong>"Carriage Return" (Enter) suffix</strong>. This is standard on 99% of modern scanners.</li>
                  <li>Click inside the "Search or Scan" input field in Vendora.</li>
                  <li>Scan the item. The scanner inputs the SKU and automatically fires the "Enter" command, triggering the React component to fetch and add the item to the cart in milliseconds.</li>
                </ul>

                <h3 className="text-xl font-bold mt-10 mb-4">Thermal Receipt Printers</h3>
                <p className="text-slate-600 mb-4">
                  Vendora leverages your browser's (Chrome, Edge, Safari) native print spooler to generate perfectly formatted 58mm or 80mm ESC/POS style receipts.
                </p>
                <ul className="space-y-2 text-slate-600 list-disc pl-5 mb-8">
                  <li>Install the official OS driver (Windows/Mac) that came with your printer (e.g., Epson, Xprinter, Rongta).</li>
                  <li>Process a standard sale in Vendora. When the browser's print preview window launches, select your thermal printer from the "Destination" dropdown.</li>
                  <li><strong>Critical Browser Settings:</strong> For a professional, edge-to-edge print, you must open the browser's "More Settings" menu. Set "Margins" to <strong>None</strong>, and explicitly uncheck <strong>"Headers and Footers"</strong> to prevent the browser from printing the URL and date at the top and bottom of the receipt.</li>
                </ul>
              </div>
            )}

            {/* 11. KEYBOARD SHORTCUTS */}
            {activeTab === 'shortcuts' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">Keyboard Shortcuts</h2>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  For high-volume retail environments (like supermarkets or busy pharmacies), touching the mouse drastically slows down checkout speeds. Power users and trained cashiers can utilize these hotkeys to navigate the entire Point of Sale process continuously.
                </p>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-8">
                  <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 font-bold text-slate-900">Action Command</th>
                        <th className="px-6 py-4 font-bold text-slate-900">Windows / Linux OS</th>
                        <th className="px-6 py-4 font-bold text-slate-900">macOS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-6 py-4 font-medium text-slate-700">Focus Search/Scan Bar (Ready for input)</td>
                        <td className="px-6 py-4"><kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 shadow-sm">Ctrl</kbd> + <kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 shadow-sm">K</kbd></td>
                        <td className="px-6 py-4"><kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 shadow-sm">⌘</kbd> + <kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 shadow-sm">K</kbd></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-medium text-slate-700">Finalize Sale / Launch Checkout Modal</td>
                        <td className="px-6 py-4"><kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 shadow-sm">Enter</kbd> (when cart is ready)</td>
                        <td className="px-6 py-4"><kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 shadow-sm">Return</kbd></td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-medium text-slate-700">Clear Current Cart / Cancel Transaction</td>
                        <td className="px-6 py-4"><kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 shadow-sm">Esc</kbd></td>
                        <td className="px-6 py-4"><kbd className="rounded border border-slate-300 bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 shadow-sm">Esc</kbd></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 12. FAQ */}
            {activeTab === 'faq' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-3xl font-bold mb-6 mt-0">FAQ & Troubleshooting</h2>
                
                <div className="space-y-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">How do I process a refund or customer return?</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      To maintain strict, tamper-proof audit trails required by revenue authorities, finalized sales cannot be simply "deleted" from the database. If a customer returns a purchased item, an Admin must execute a two-step reversal: First, manually adjust the inventory stock back up in the Inventory tab. Second, record the refunded cash amount as a negative entry in the "Expenses" tab to ensure the daily shift drawer balances perfectly during the Z-Report.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Why is my thermal receipt printer feeding blank paper?</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Thermal printers use specialized heat-reactive paper, not ink cartridges. If the paper is feeding through but printing completely blank, the paper roll has been inserted upside down. Simply open the printer hatch, flip the roll over so the paper feeds from the bottom, and try printing a duplicate receipt from the Sales History tab.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-bold text-slate-900 mb-2">I am locked out. How do I reset a forgotten Admin password?</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Security protocols prevent Support from manually reading your encrypted password. You must use the "Forgot Password" link on the login screen to generate a secure, time-expiring reset link sent to the Admin email on file. If a cashier forgets their credentials, a Super Admin can instantly reset their password directly from the Settings &gt; Team Roles dashboard without needing email verification.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}