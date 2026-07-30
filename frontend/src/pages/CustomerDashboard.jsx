import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, Search, MessageSquare, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import { complaintService } from '../services/api';

export default function CustomerDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const loadComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await complaintService.getComplaints();
      setComplaints(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch your complaints. Please reload.');
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const safeComplaints = Array.isArray(complaints) ? complaints : [];
  const total = safeComplaints.length;
  const open = safeComplaints.filter(c => !['RESOLVED', 'CLOSED'].includes(c.status)).length;
  const resolved = safeComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;

  const showQueueOnly = location.pathname === '/customer/complaints';

  const getPriorityStyle = (prio) => {
    switch (prio?.toUpperCase()) {
      case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'HIGH': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'MEDIUM': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-700/20';
    }
  };

  const getStatusStyle = (status) => {
    switch (status?.toUpperCase()) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/25';
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
      case 'ESCALATED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
      case 'ANALYZING':
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 animate-pulse';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-700/25';
    }
  };

  return (
    <div className="space-y-8">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {showQueueOnly ? 'My Complaints Catalog' : 'Customer Dashboard'}
          </h2>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed">
            {showQueueOnly 
              ? 'Browse, check status updates, and view AI recommendations for your raised tickets.'
              : 'Monitor and raise customer complaints. Auto-triaged using Artificial Intelligence.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={loadComplaints}
            className="p-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white rounded-2xl text-slate-300 transition-all active:scale-[0.98]"
            title="Refresh Complaints"
          >
            <RefreshCw size={18} />
          </button>
          <Link
            to="/customer/complaints/new"
            className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-sm font-bold py-3 px-5 rounded-2xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <PlusCircle size={16} />
            <span>Submit Complaint</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {!showQueueOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-md">
            <div className="text-slate-550 text-xs font-bold uppercase tracking-wider">Total Complaints</div>
            <div className="text-4xl font-extrabold text-white mt-2 font-mono">{total}</div>
          </div>
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-md">
            <div className="text-slate-555 text-xs font-bold uppercase tracking-wider">Pending Resolution</div>
            <div className="text-4xl font-extrabold text-sky-400 mt-2 font-mono">{open}</div>
          </div>
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-md">
            <div className="text-slate-555 text-xs font-bold uppercase tracking-wider">Resolved Tickets</div>
            <div className="text-4xl font-extrabold text-emerald-400 mt-2 font-mono">{resolved}</div>
          </div>
        </div>
      )}

      {/* Complaints List Table */}
      <div className="glassmorphism rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-100">Ticket Catalog</h3>
        </div>

        {error && (
          <div className="p-6 bg-rose-500/5 text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
            <span className="w-8 h-8 border-3 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
            <span className="text-xs font-semibold">Retrieving tickets...</span>
          </div>
        ) : safeComplaints.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
            <MessageSquare size={36} className="text-slate-600" />
            <div>
              <p className="text-slate-300 font-bold text-sm">No complaints found</p>
              <p className="text-slate-500 text-xs mt-1">Submit your first complaint above to test ResolveAI's automatic triage.</p>
            </div>
            <Link
              to="/customer/complaints/new"
              className="mt-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition-all"
            >
              Raise complaint
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
                  <th className="py-4 px-6">Ticket ID</th>
                  <th className="py-4 px-6">Complaint Detail</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Registered On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {safeComplaints.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => navigate(`/customer/complaints/${c.id}`)}
                    className="hover:bg-slate-800/30 transition-all cursor-pointer group"
                  >
                    <td className="py-4 px-6 text-xs font-mono font-bold text-slate-400 group-hover:text-sky-400 transition-colors">
                      CMP-{c.id}
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white truncate transition-colors">
                        {c.title}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {c.description}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-300 font-semibold">
                      {c.categoryDisplayName || 'Analyzing...'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${getPriorityStyle(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 flex items-center gap-1.5">
                      <Calendar size={12} />
                      <span>{new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
