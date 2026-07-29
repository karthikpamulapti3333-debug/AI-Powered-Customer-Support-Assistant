import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await authService.forgotPassword(email);
      setSuccess(data.message || 'Recovery email sent! Please check your inbox.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to send recovery link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-500/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />

      {/* Left Column: Branding & Info (Hidden on mobile) */}
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
            Retrieve your password safely.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Enter your registered email address and we will generate a secure verification reset token to configure a new password.
          </p>
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs">✓</div>
              <p className="text-xs text-slate-350 leading-relaxed">Secure token expiry protection (15 mins window)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs">✓</div>
              <p className="text-xs text-slate-350 leading-relaxed">Single-use reset tokens for high security</p>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          Powered by Advanced Generative AI
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex items-center justify-center p-8 z-10">
        <div className="w-full max-w-md glassmorphism p-8 rounded-3xl shadow-2xl relative">
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Forgot Password</h2>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              No worries, let's recover your AI-Powered Customer Support Assistant account password.
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
                <h3 className="font-bold text-white text-base">Request Submitted</h3>
                <p className="text-slate-400 text-xs leading-relaxed px-4">
                  {success}
                </p>
                <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl text-[10px] text-slate-400 leading-normal text-left mt-4 font-mono">
                  <span className="font-bold text-sky-400 block mb-1">Developer Sandbox Info:</span>
                  The reset token link has been printed to the Spring Boot backend console logs. Copy the URL from there to test.
                </div>
              </div>
              <Link 
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-semibold py-3 px-4 rounded-2xl border border-slate-800 transition-all"
              >
                <ArrowLeft size={14} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Address */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Send Recovery Link</span>
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
