import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../config/api';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function VerifyEmail() {
  useDocumentTitle('Verify Email');
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); 
  const [message, setMessage] = useState('Verifying your email address...');
  const hasAttempted = useRef(false); // Fixes React 18 Strict Mode double-firing

  useEffect(() => {
    const verifyToken = async () => {
      if (hasAttempted.current) return;
      hasAttempted.current = true;

      const token = searchParams.get('token');
      if (!token) {
        setStatus('error');
        setMessage('No verification token provided.');
        return;
      }

      try {
        const res = await apiFetch(`verify_email&token=${token}`);
        if (res.status === 'success') {
          setStatus('success');
          setMessage(res.message);
        } else {
          setStatus('error');
          setMessage(res.message);
        }
      } catch (err) {
        setStatus('error');
        setMessage('Connection error. Please try again later.');
      }
    };

    verifyToken();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-10 text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-slate-800">Verifying...</h2>
            <p className="text-slate-500 mt-2 text-sm">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Email Verified!</h2>
            <p className="text-slate-500 mt-3 mb-8 text-sm">{message}</p>
            <Link to="/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20">Continue to Login</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Verification Failed</h2>
            <p className="text-slate-500 mt-3 mb-8 text-sm">{message}</p>
            <Link to="/login" className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-all">Back to Login</Link>
          </div>
        )}
      </div>
    </div>
  );
}