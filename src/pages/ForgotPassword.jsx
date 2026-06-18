import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../config/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function ForgotPassword() {
  useDocumentTitle('Forgot Password');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('email', email);

    try {
      await apiFetch('forgot_password', { method: 'POST', body: formData });
      setSubmitted(true); // Always show success to prevent email fishing
    } catch (err) {
      console.error(err);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {!submitted ? (
          <>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Reset Password</h2>
            <p className="text-slate-500 text-sm mb-6">Enter the email address associated with your account and we'll send you a link to reset your password.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="admin@business.com" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md flex justify-center">
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Check Your Email</h2>
            <p className="text-slate-500 text-sm mb-6">If an account exists for <b>{email}</b>, we have sent a password reset link.</p>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}