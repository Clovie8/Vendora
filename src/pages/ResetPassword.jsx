import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
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

export default function ResetPassword() {
  useDocumentTitle('Reset Password');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [showPassword, setShowPassword] = useState(false);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState({ label: '', bg: 'bg-transparent', text: 'text-transparent', width: 'w-0' });

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Invalid Link</h2>
          <p className="text-slate-500 mb-6">No reset token was found in the URL.</p>
          <Link to="/login" className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold py-3 px-6 rounded-xl">Back to Login</Link>
        </div>
      </div>
    );
  }

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      Toast.fire({ icon: 'error', title: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('token', token);
    formData.append('password', password);

    try {
      const res = await apiFetch('reset_password', { method: 'POST', body: formData });
      if (res.status === 'success') {
        Swal.fire({
          html: `
            <div class="flex flex-col items-center">
              <div class="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-5 mt-2">
                <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h2 class="text-2xl font-bold text-slate-800 mb-2">Password Reset!</h2>
              <p class="text-slate-500 text-sm text-center">${res.message}</p>
            </div>
          `,
          showConfirmButton: true,
          confirmButtonText: 'Login Now',
          buttonsStyling: false,
          customClass: { 
            popup: 'rounded-[32px] shadow-2xl border border-slate-100 p-8', 
            confirmButton: 'min-w-[200px] px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/30 active:scale-95 mt-4',
            backdrop: 'backdrop-blur-sm bg-slate-900/40'
          }
        }).then(() => navigate('/login'));
      } else {
        Toast.fire({ icon: 'error', title: res.message });
      }
    } catch (err) {
      Toast.fire({ icon: 'error', title: 'Connection Error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 sm:p-10">
        
        <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Create New Password</h2>
        <p className="text-slate-500 text-sm mb-8 text-center">Your new password must be at least 6 characters long.</p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                minLength="6" 
                value={password} 
                onChange={handlePasswordChange} 
                className="w-full px-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
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
            
            <div className={`mt-2 flex items-center gap-2 transition-opacity duration-300 ${password ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-300 ${strength.bg} ${strength.width}`}></div>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider w-12 ${strength.text}`}>{strength.label}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                required 
                minLength="6" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full px-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                )}
              </button>
            </div>
          </div>

          
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 mt-4 flex justify-center items-center">
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}