import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../config/api';
import Swal from 'sweetalert2';
import useDocumentTitle from '../hooks/useDocumentTitle';

// 1. THE MODERN TOAST CONFIGURATION
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  customClass: {
    popup: 'rounded-2xl shadow-xl border border-slate-100 bg-white py-2 px-4',
    title: 'text-sm font-bold text-slate-700 ml-2'
  },
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export default function Login() {
  useDocumentTitle('Login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
      const res = await apiFetch('login', {
        method: 'POST',
        body: formData
      });

      if (res.status === 'success') {
        navigate('/', { replace: true });
      } else {
        // 2. FIRE THE TOAST INSTEAD OF THE MODAL
        Toast.fire({
          icon: 'error',
          title: res.message || 'Login Failed'
        });
      }
    } catch (err) {
      Toast.fire({
        icon: 'error',
        title: 'Connection Error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Branding Panel */}
        <div className="bg-slate-900 text-white p-10 md:w-1/2 flex flex-col justify-between hidden md:flex">
          <div>
            <div className="flex items-center gap-2 mb-12">
              <img src="/favicon.png" alt="Vendora Logo" className="w-10 h-10" />
              <span className="text-2xl font-bold tracking-wider uppercase">Vendora</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 leading-tight">Welcome back to your dashboard.</h2>
            <p className="text-slate-400 text-sm leading-relaxed">Log in to view your latest stock movements, track sales, and generate business reports.</p>
          </div>
          <div className="text-xs text-slate-500">© {new Date().getFullYear()} Vendora Inc.</div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:p-8 md:p-12 md:w-1/2 flex flex-col justify-center">
          <div className="mb-8 md:hidden flex items-center justify-center gap-2">
            <img src="/favicon.png" alt="Vendora Logo" className="w-10 h-10" />
            <span className="text-2xl font-bold tracking-wider uppercase text-slate-800">Vendora</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center md:text-left">Sign In</h2>
          <p className="text-slate-500 text-sm mb-8 text-center md:text-left">Enter your email and password to access your account.</p>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 transition-all" 
                placeholder="admin@business.com" 
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full px-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 transition-all" 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex justify-center items-center mt-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Don't have a business account yet? <Link to="/register" className="text-blue-600 font-bold hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}