import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Key, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { authService } from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError('Password reset token is missing. Please request a new recovery link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Missing token.');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired or is invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-500/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />

      {/* Left Column (Hidden on mobile) */}
      <div className="hidden md:flex flex-col justify-between p-12 bg-slate-900/40 border-r border-slate-900 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
            A
          </div>
          <span className="font-black text-sm tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            AI-Powered Customer Support Assistant
          </span>
        </div>

        <div className="space-y-6 my-auto max-w-lg">
          <h1 className="text-4xl font-extrabold leading-tight text-white">
            Set up your new password.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Configure a strong password to safeguard your complaints tracking portal. Use a mix of alphanumeric characters and special symbols.
          </p>
        </div>

        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          Powered by Advanced Generative AI
        </div>
      </div>

      {/* Right Column: Reset Form */}
      <div className="flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-md glassmorphism p-8 rounded-3xl shadow-2xl relative">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Reset Password</h2>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Define your new credentials to restore portal access.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/5">
                <CheckCircle2 size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-white text-base">Password Updated</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Your credentials have been securely refreshed. You can now log in using your new password.
                </p>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-bold py-3 px-4 rounded-2xl shadow-lg transition-all"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
                    <Key size={16} />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 pl-11 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                    required
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-355 focus:outline-none"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
                    <Key size={16} />
                  </span>
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 pl-11 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                    required
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf(!showConf)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-355 focus:outline-none"
                    aria-label={showConf ? "Hide password" : "Show password"}
                  >
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Reset Password</span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link 
                  to="/login"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
