import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../config/api';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  customClass: {
    popup: 'rounded-2xl shadow-xl border border-slate-100 bg-white py-2 px-4',
    title: 'text-sm font-bold text-slate-700 ml-2'
  }
});

export default function Register() {
  useDocumentTitle('Register');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState({ label: '', bg: 'bg-transparent', text: 'text-transparent', width: 'w-0' });
  const [formData, setFormData] = useState({
    company_name: '', business_type: 'Retail', phone: '', location: '', tin_number: '',
    name: '', email: '', password: ''
  });

  const [showPassword, setShowPassword] = useState(false);

  const [isSuccess, setIsSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, password: val });
    
    let score = 0;
    if (val.length > 5) score += 1;
    if (val.length > 8) score += 1;
    if (/[A-Z]/.test(val)) score += 1;
    if (/[0-9]/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;

    if (val.length === 0) {
      setStrength({ label: '', bg: 'bg-transparent', text: 'text-transparent', width: 'w-0' });
    } else if (score <= 2) {
      setStrength({ label: 'Weak', bg: 'bg-red-500', text: 'text-red-500', width: 'w-1/3' });
    } else if (score === 3 || score === 4) {
      setStrength({ label: 'Medium', bg: 'bg-yellow-400', text: 'text-yellow-500', width: 'w-2/3' });
    } else {
      setStrength({ label: 'Strong', bg: 'bg-green-500', text: 'text-green-500', width: 'w-full' });
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    const submitData = new FormData();
    Object.keys(formData).forEach(key => submitData.append(key, formData[key]));

    try {
      const res = await apiFetch('register', { method: 'POST', body: submitData });
      if (res.status === 'success') {
        setIsSuccess(true);
      } else {
        Toast.fire({ icon: 'error', title: res.message || 'Registration Failed' });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Connection Error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    try {
      // Make sure 'resend_verification' matches your backend API endpoint
      const res = await apiFetch('resend_verification', { 
        method: 'POST', 
        body: JSON.stringify({ email: formData.email }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.status === 'success') {
        Toast.fire({ icon: 'success', title: 'Verification email resent successfully!' });
      } else {
        Toast.fire({ icon: 'error', title: res.message || 'Failed to resend email' });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Connection Error. Please try again.' });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Branding Panel */}
        <div className="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <img src="/favicon.png" alt="Vendora Logo" className="w-10 h-10" />
              <span className="text-2xl font-bold tracking-wider uppercase">Vendora</span>
            </div>
            <h2 className="text-2xl font-bold mb-4">Start managing your inventory smarter.</h2>
            <p className="text-slate-400 text-sm leading-relaxed">Create your business account today to track stock, analyze sales, and monitor growth in real-time.</p>
          </div>
          <div className="text-xs text-slate-500">© {new Date().getFullYear()} Vendora Inc.</div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:p-8 md:w-2/3">
          
          <div className="mb-6 md:hidden flex items-center justify-center gap-2">
            <img src="/favicon.png" alt="Vendora Logo" className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-wider uppercase text-slate-800">Vendora</span>
          </div>
          {!isSuccess ? (
          <>
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center md:text-left">Create Account</h2>
          <form onSubmit={handleRegister} className="space-y-6">
            
            {/* Business Section */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">1. Business Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Company Name *</label>
                  <input type="text" name="company_name" required onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Business Type *</label>
                  <select name="business_type" required onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number *</label>
                  <input type="text" name="phone" required onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Location *</label>
                  <input type="text" name="location" required onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">TIN Number <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <input type="text" name="tin_number" onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Admin Section */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">2. Admin Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input type="text" name="name" required onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
                  <input type="email" name="email" required onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password *</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      name="password" 
                      required 
                      minLength="6" 
                      onChange={handlePasswordChange} 
                      className="w-full px-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                      )}
                    </button>
                  </div>
                  
                  {/* PASSWORD STRENGTH INDICATOR */}
                  <div className={`mt-2 flex items-center gap-2 transition-opacity duration-300 ${formData.password ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.bg} ${strength.width}`}></div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider w-12 ${strength.text}`}>{strength.label}</span>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex justify-center items-center mt-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Register Business'}
            </button>

            <p className="text-center text-sm text-slate-500 mt-4">
              Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Log in</Link>
            </p>
          </form>
          </>
          ) : (
            /* --- NEW INLINE SUCCESS VIEW --- */
            <div className="flex flex-col items-center justify-center text-center py-10 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              
              <h2 className="text-3xl font-black text-slate-800 mb-3">Registration Successful!</h2>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
                We've sent a verification link to <span className="font-bold text-slate-800">{formData.email}</span>. Please check your inbox to verify your account before logging in.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                <button 
                  onClick={() => navigate('/login')} 
                  className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/20"
                >
                  Go to Login
                </button>
                
                <button 
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className="flex-1 px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex justify-center items-center"
                >
                  {resendLoading ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : 'Resend Email'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}