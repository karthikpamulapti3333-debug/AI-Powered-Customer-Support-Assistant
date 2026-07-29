import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Inbox, 
  Flame, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  ShieldAlert,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { complaintService } from '../services/api';

export default function AgentDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const loadAgentTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await complaintService.getComplaints();
      setComplaints(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assigned complaints.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgentTickets();
  }, []);

  const total = complaints.length;
  const assigned = complaints.filter(c => c.status === 'ASSIGNED').length;
  const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS').length;
  const resolved = complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;
  const escalated = complaints.filter(c => c.status === 'ESCALATED').length;
  const highRisk = complaints.filter(c => c.escalationStatus === 'HIGH_RISK').length;

  const showQueueOnly = location.pathname === '/agent/complaints';

  const getPriorityStyle = (prio) => {
    switch (prio?.toUpperCase()) {
      case 'CRITICAL': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'HIGH': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'MEDIUM': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-700/20';
    }
  };

  const getRiskStyle = (risk) => {
    if (risk >= 0.8) return 'text-rose-400 font-bold';
    if (risk >= 0.5) return 'text-amber-400 font-semibold';
    return 'text-slate-400';
  };

  const calculateAge = (dateStr) => {
    const created = new Date(dateStr);
    const diff = Math.max(0, new Date() - created);
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {showQueueOnly ? 'Assigned Complaints Queue' : 'Agent Console'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {showQueueOnly 
              ? 'Review details, update status, and apply AI recommendation playbooks on your assigned tickets.'
              : 'Manage your auto-assigned complaints, resolve customer queries, and leverage AI recommendation cards.'}
          </p>
        </div>
        <button 
          onClick={loadAgentTickets}
          className="p-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white rounded-2xl text-slate-300 transition-all active:scale-[0.98]"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Metric Cards */}
      {!showQueueOnly && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <Inbox size={12} className="text-slate-400" />
              <span>Assigned</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-2 font-mono">{assigned}</div>
          </div>
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <Clock size={12} className="text-sky-400" />
              <span>In Progress</span>
            </div>
            <div className="text-3xl font-extrabold text-sky-400 mt-2 font-mono">{inProgress}</div>
          </div>
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <CheckCircle size={12} className="text-emerald-400" />
              <span>Resolved</span>
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono">{resolved}</div>
          </div>
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <Flame size={12} className="text-rose-400" />
              <span>Escalated</span>
            </div>
            <div className="text-3xl font-extrabold text-rose-400 mt-2 font-mono">{escalated}</div>
          </div>
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={12} className="text-red-400" />
              <span>High Risk</span>
            </div>
            <div className="text-3xl font-extrabold text-red-500 mt-2 font-mono">{highRisk}</div>
          </div>
          <div className="glassmorphism p-5 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-md">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <TrendingUp size={12} className="text-indigo-400" />
              <span>Total Cases</span>
            </div>
            <div className="text-3xl font-extrabold text-indigo-400 mt-2 font-mono">{total}</div>
          </div>
        </div>
      )}

      {/* Ticket List */}
      <div className="glassmorphism rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="font-bold text-lg text-slate-100">Assigned Queue</h3>
        </div>

        {error && (
          <div className="p-6 bg-rose-500/5 border-b border-rose-500/10 text-rose-400 text-sm flex items-center gap-3">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
            <span className="w-8 h-8 border-3 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
            <span className="text-xs font-semibold">Triage loading...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center gap-4 text-slate-500">
            <Inbox size={42} className="text-slate-700" />
            <div>
              <p className="text-slate-300 font-bold text-sm">Inbox Zero!</p>
              <p className="text-slate-500 text-xs mt-1">No customer complaints are currently assigned to your account queue.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
                  <th className="py-4 px-6">Ticket ID</th>
                  <th className="py-4 px-6">Customer / Topic</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Risk Index</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {complaints.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => navigate(`/agent/complaints/${c.id}`)}
                    className="hover:bg-slate-800/30 transition-all cursor-pointer group"
                  >
                    <td className="py-4 px-6 text-xs font-mono font-bold text-slate-400 group-hover:text-sky-400 transition-colors">
                      CMP-{c.id}
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <div className="text-sm font-bold text-slate-200 group-hover:text-white truncate">
                        {c.title}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        Client: {c.customerFullName} ({c.customerUsername})
                      </p>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-300 font-semibold">
                      {c.categoryDisplayName || 'PAYMENT'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${getPriorityStyle(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs font-mono font-bold">
                      {c.analysis?.escalationRisk !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          {c.analysis.escalationRisk >= 0.8 && <AlertTriangle size={12} className="text-rose-400 animate-pulse" />}
                          <span className={getRiskStyle(c.analysis.escalationRisk)}>
                            {Math.round(c.analysis.escalationRisk * 100)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'RESOLVED' || c.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                        c.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                        c.status === 'ESCALATED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' :
                        'bg-slate-500/10 text-slate-400 border border-slate-700/25'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 flex items-center gap-1.5 mt-1 border-none">
                      <Calendar size={12} />
                      <span>{calculateAge(c.createdAt)}</span>
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
