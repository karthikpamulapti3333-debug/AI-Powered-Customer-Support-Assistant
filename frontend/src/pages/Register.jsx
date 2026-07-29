import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle, Sparkles } from 'lucide-react';
import { authService, adminService } from '../services/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (role === 'AGENT') {
      const loadDepts = async () => {
        try {
          const depts = await adminService.getDepartments();
          setDepartments(depts);
        } catch (err) {
          console.error('Failed to load departments', err);
          // Static fallback for dev
          setDepartments([
            { id: 1, name: 'Billing & Payments' },
            { id: 2, name: 'Logistics & Delivery' },
            { id: 5, name: 'Technical Operations' }
          ]);
        }
      };
      loadDepts();
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const signUpData = {
        username,
        email,
        password,
        firstName,
        lastName,
        role,
        departmentId: role === 'AGENT' && departmentId ? Number(departmentId) : null
      };

      await authService.register(signUpData);
      setSuccess('Account registered successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4 py-12">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="w-full max-w-lg glassmorphism p-8 rounded-3xl shadow-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white mx-auto shadow-lg shadow-sky-500/25 mb-4">
            A
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Join AI-Powered Customer Support Assistant platform
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
            <Sparkles size={16} className="shrink-0 animate-spin" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
              />
            </div>
            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pick a unique username"
              className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
              required
            />
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Role Type</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="AGENT">Support Agent</option>
                <option value="MANAGER">Support Manager</option>
                <option value="ADMIN">System Admin</option>
              </select>
            </div>

            {/* Department (visible only if registering as Agent) */}
            {role === 'AGENT' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
                  required
                >
                  <option value="">Choose department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus size={16} />
                <span>Register Account</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-slate-500">
          <span>Already have an account? </span>
          <Link to="/login" className="text-sky-400 font-semibold hover:text-sky-300 hover:underline">
            Login here
          </Link>
        </div>
      </div>
    </div>
  );
}
