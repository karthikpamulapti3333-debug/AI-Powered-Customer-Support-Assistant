import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LogIn, Key, User, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/api';

export default function Login({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const expired = searchParams.get('expired');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await authService.login(username.trim(), password.trim());
      setUser(data);

      const roles = data.roles || [];
      let targetPath = '/customer/dashboard';
      if (roles.includes('ROLE_ADMIN')) {
        targetPath = '/admin/dashboard';
      } else if (roles.includes('ROLE_MANAGER')) {
        targetPath = '/manager/dashboard';
      } else if (roles.includes('ROLE_AGENT')) {
        targetPath = '/agent/dashboard';
      }

      window.location.href = targetPath;
    } catch (err) {
      console.error(err);
      const serverDetail = err.response?.data?.detail || err.response?.data?.message;
      setError(
        serverDetail || 
        'Authentication failed. Please check your credentials or backend connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Determine welcome messages based on username typed for role hints, or general
  const getWelcomeText = () => {
    const name = username.toLowerCase();
    if (name.includes('admin')) return 'Welcome to Admin Portal';
    if (name.includes('agent')) return 'Welcome to Agent Portal';
    if (name.includes('manager')) return 'Welcome to Manager Portal';
    if (name.includes('customer')) return 'Welcome to Customer Portal';
    return 'Welcome Back';
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-500/5 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px]" />

      {/* Left Column: SaaS Highlights */}
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
            Intelligent Customer Support Powered by AI.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Fast-track your ticketing and analytics resolution loops. Get predictive insight classifiers, auto-escalations, and semantic knowledge-base answers on the fly.
          </p>
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs">✓</div>
              <span className="text-xs text-slate-300">AI-powered predictive assistance</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs">✓</div>
              <span className="text-xs text-slate-300">Smart support ticket routing and triage</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs">✓</div>
              <span className="text-xs text-slate-300">RAG Knowledge-based semantic answers</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-400 shrink-0 font-bold text-xs">✓</div>
              <span className="text-xs text-slate-300">Faster, responsive service level agreements (SLAs)</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
          Powered by Advanced Generative AI
        </div>
      </div>

      {/* Right Column: Sign In Form */}
      <div className="flex flex-col items-center justify-center p-6 md:p-8 z-10 overflow-y-auto relative bg-slate-950">
        {/* Subtle mesh background grid pattern for premium tech aesthetics */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
        
        {/* Colorful glowing background blobs behind the card */}
        <div className="absolute top-1/4 left-1/4 w-60 h-60 rounded-full bg-sky-500/10 blur-[100px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full bg-indigo-500/10 blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl shadow-[0_0_50px_rgba(14,165,233,0.12)] border border-slate-800/80 relative z-10">
          <div className="mb-8">
            {/* Branding Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
                A
              </div>
              <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                AI-Powered Customer Support Assistant
              </span>
            </div>
            
            <h2 className="text-xl font-extrabold text-white tracking-tight">{getWelcomeText()}</h2>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
              Access support prediction console dashboard.
            </p>
          </div>

          {expired && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
              <AlertCircle size={16} className="shrink-0" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3 animate-headShake">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500 pointer-events-none">
                  <Key size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 pl-11 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-355 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Log In</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 text-xs text-slate-500">
            <span>Don't have an account? </span>
            <Link to="/register" className="text-sky-400 font-semibold hover:text-sky-300 hover:underline">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
