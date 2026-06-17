import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import StockStatus from './pages/StockStatus';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import ShiftAnalytics from './pages/ShiftAnalytics';
import Credits from './pages/Credits';
import TaxReport from './pages/TaxReport';
import UserGuide from './pages/Documentation';
import Proformas from './pages/Proformas';
import SerialManager from './pages/SerialManager';
import Batches from './pages/Batches';
import VendoraHQ from './hq/VendoraHQ';
import HQLogin from './hq/HQLogin';
import NewSale from './pages/NewSale';
import Contacts from './pages/Contacts';



export default function App() {
  // A simple protection wrapper
const ProtectedHQRoute = ({ children }) => {
  const token = localStorage.getItem('vendora_hq_token');
  return token ? children : <Navigate to="/hq-login" />;
};
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES (No Sidebar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/user-guide" element={<UserGuide />} />
        <Route path="/hq-admin" element={<VendoraHQ />} />

        {/* PROTECTED ROUTES (With Sidebar & Navbar) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="serials" element={<SerialManager />} />
          <Route path="batches" element={<Batches />} />
          <Route path="sales" element={<Sales />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="credits" element={<Credits />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="reports/tax" element={<TaxReport />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:type" element={<Reports />} />
          <Route path="proformas" element={<Proformas />} />
          <Route path="status" element={<StockStatus />} />
          <Route path="shift-analytics" element={<ShiftAnalytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="pos" element={<NewSale />} />
        </Route>
        
        {/* HQ ROUTES */}
        <Route path="/hq-login" element={<HQLogin />} />
        <Route path="/hq-admin" element={
          <ProtectedHQRoute>
            <VendoraHQ />
          </ProtectedHQRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}