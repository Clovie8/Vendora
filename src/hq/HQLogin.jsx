import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hqFetch } from '../config/hq-api';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

// 🌟 Enterprise Top-Right Toast Notification
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  customClass: { popup: 'rounded-xl shadow-sm border text-sm', title: 'font-normal' }
});

export default function HQLogin() {
  useDocumentTitle('Vendora HQ | Login');
  const navigate = useNavigate();

  // --- REFINEMENT 1: THE SILENT LOGOUT SAFETY NET ---
  // Forcefully destroy any old sessions the moment this screen loads
  useEffect(() => {
    hqFetch('logout', { method: 'POST' }).catch(() => {});
  }, []);
  // --------------------------------------------------

  // Step 1 = Login, Step 2 = 2FA Code
  const [step, setStep] = useState(1); 
  const [userId, setUserId] = useState(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- PHASE 1: EMAIL & PASSWORD ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Because backend login() uses $_POST, we must send FormData
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
      // CHANGED: Assign directly to 'res' and remove the .json() step!
      const res = await hqFetch('login', {
        method: 'POST',
        credentials: 'include', // CRITICAL for Sessions
        body: formData
      });
      
      if (res.status === '2fa_required') {
        // SUCCESS: Move to Step 2!
        setUserId(res.user_id);
        setStep(2);
        Toast.fire({ icon: 'info', title: res.message });
      } else {
        Toast.fire({ icon: 'error', title: res.message || 'Login failed.' });
      }
    } catch (error) {
      console.error("HQ Login Error:", error); // Pro-tip: Log the actual error!
      Toast.fire({ icon: 'error', title: 'Cannot connect to HQ server.' });
    } finally {
      setIsLoading(false);
    }
  };

  // --- PHASE 2: VERIFY 6-DIGIT CODE ---
  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // CHANGED: Assign directly to 'res' and remove the .json() step!
      const res = await hqFetch('verify_2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: This allows PHP to create the Session Cookie!
        body: JSON.stringify({ user_id: userId, code: twoFactorCode })
      });
      
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Security Cleared. Welcome to HQ.' });
        
        setTimeout(() => {
          navigate('/hq-admin', { replace: true }); 
        }, 150);
      } else {
        Toast.fire({ icon: 'error', title: res.message || 'Verification failed.' });
      }
    } catch (error) {
      console.error("2FA Verification Error:", error); // Pro-tip: Log the actual error!
      Toast.fire({ icon: 'error', title: 'Verification failed. Cannot connect to HQ server.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B2B5E] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
          <img src="./favicon.png" alt="Vendora HQ Logo" className="mx-auto w-16 mb-4" />
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Vendora HQ</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Personnel Only</p>
        </div>

        {/* Dynamic Form Content */}
        {step === 1 ? (
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Super Admin Email</label>
              <input 
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-slate-800"
                placeholder="admin@vendora.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-slate-800"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit" disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex justify-center items-center"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Initiate Secure Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FASubmit} className="p-8 space-y-6 animate-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-500 mt-2">We sent a secure 6-digit code to<br/><b>{email}</b></p>
            </div>
            <div>
              <input 
                type="text" required maxLength="6"
                value={twoFactorCode} 
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))} // Forces numbers only
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-3xl tracking-[0.5em] font-black text-slate-800 text-center"
                placeholder="000000"
              />
            </div>
            <button 
              type="submit" disabled={isLoading || twoFactorCode.length !== 6}
              className="w-full bg-[#0B2B5E] hover:bg-blue-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 flex justify-center items-center disabled:opacity-50"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Verify & Enter HQ'}
            </button>
            <div className="text-center mt-2">
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className="text-xs font-bold text-slate-400 hover:text-slate-600 underline decoration-slate-300 hover:decoration-slate-500 transition-colors"
              >
                Cancel & Go Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}