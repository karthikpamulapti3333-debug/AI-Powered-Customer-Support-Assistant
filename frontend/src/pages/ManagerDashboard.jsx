import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, Clock, AlertTriangle, Users, BarChart3, CheckSquare, RefreshCw
} from 'lucide-react';
import { analyticsService, complaintService } from '../services/api';

export default function ManagerDashboard() {
  const [summary, setSummary] = useState({});
  const [categoriesData, setCategoriesData] = useState([]);
  const [priorityData, setPriorityData] = useState([]);
  const [slaData, setSlaData] = useState([]);
  const [agentData, setAgentData] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [highRiskTickets, setHighRiskTickets] = useState([]);
  
  // Full Queue States
  const [allComplaints, setAllComplaints] = useState([]);

  const safeAllComplaints = Array.isArray(allComplaints) ? allComplaints : [];
  const safeHighRiskTickets = Array.isArray(highRiskTickets) ? highRiskTickets : [];
  const safeCategoriesData = Array.isArray(categoriesData) ? categoriesData : [];
  const safePriorityData = Array.isArray(priorityData) ? priorityData : [];
  const safeSlaData = Array.isArray(slaData) ? slaData : [];
  const safeAgentData = Array.isArray(agentData) ? agentData : [];
  const safeTrendsData = Array.isArray(trendsData) ? trendsData : [];
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Get analytics summaries
      const sum = await analyticsService.getSummary();
      setSummary(sum);

      // 2. Load categories share
      const cats = await analyticsService.getCategories();
      const mappedCats = Object.keys(cats).map(key => ({ name: key, value: cats[key] }));
      setCategoriesData(mappedCats);

      // 3. Load priorities
      const prio = await analyticsService.getPriority();
      const mappedPrio = Object.keys(prio).map(key => ({ name: key, count: prio[key] }));
      setPriorityData(mappedPrio);

      // 4. Load SLA status
      const sla = await analyticsService.getSla();
      setSlaData([
        { name: 'On Time', value: sla.onTimeCount || 0 },
        { name: 'Breached', value: sla.breachedCount || 0 },
        { name: 'At Risk', value: sla.atRiskCount || 0 }
      ]);

      // 5. Load agents load
      const agents = await analyticsService.getAgents();
      setAgentData(agents);

      // 6. Load trends
      const trends = await analyticsService.getTrends();
      const mappedTrends = Object.keys(trends).map(key => ({ date: key, Count: trends[key] }));
      setTrendsData(mappedTrends);

      // 7. Load high-risk complaints for manager monitor panel
      const complaints = await complaintService.getComplaints({ escalationStatus: 'HIGH_RISK' });
      setHighRiskTickets(Array.isArray(complaints) ? complaints : []);
      
      // 8. Load all complaints for the full queue view
      const allComps = await complaintService.getComplaints();
      setAllComplaints(Array.isArray(allComps) ? allComps : []);
      
    } catch (err) {
      console.error(err);
      setError('Failed to fetch manager analytics. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#a855f7'];

  // Route flags
  const showQueueOnly = location.pathname.includes('/manager/complaints');
  const showChartsOnly = location.pathname.includes('/manager/analytics');
  const showDashboardDefault = !showQueueOnly && !showChartsOnly;

  // Filter queue
  const filteredTickets = safeAllComplaints.filter(t => {
    const matchesStatus = !statusFilter || t.status === statusFilter;
    const matchesPriority = !priorityFilter || t.priority === priorityFilter;
    const matchesSearch = !searchTerm || 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customerFullName && t.customerFullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      `CMP-${t.id}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {showQueueOnly ? 'Complaints Register' : showChartsOnly ? 'AI Analytics Triage' : 'Management Console'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {showQueueOnly ? 'Browse, filter, and audit all incoming and escalated customer support requests.' :
             showChartsOnly ? 'Analyze ticket distributions, workload distribution, and SLA resolution performance.' :
             'Monitor real-time system performance, oversee high-risk SLA escalations, and review auto-generated AI insights.'}
          </p>
        </div>
        <button 
          onClick={loadAnalytics}
          className="p-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white rounded-2xl text-slate-300 transition-all active:scale-[0.98]"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-center gap-3">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      {!showQueueOnly && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 flex flex-col justify-between shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <BarChart3 size={12} className="text-slate-400" />
              <span>Volume</span>
            </span>
            <div className="text-3xl font-extrabold text-white mt-3 font-mono">{summary.totalComplaints || 0}</div>
          </div>
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 flex flex-col justify-between shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <CheckSquare size={12} className="text-emerald-400" />
              <span>Resolved</span>
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-3 font-mono">{summary.resolvedComplaints || 0}</div>
          </div>
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 flex flex-col justify-between shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <Clock size={12} className="text-amber-400" />
              <span>Pending</span>
            </span>
            <div className="text-3xl font-extrabold text-amber-500 mt-3 font-mono">{summary.pendingComplaints || 0}</div>
          </div>
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 flex flex-col justify-between shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-red-400" />
              <span>SLA Breaches</span>
            </span>
            <div className="text-3xl font-extrabold text-red-500 mt-3 font-mono">{summary.slaBreachesCount || 0}</div>
          </div>
          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 flex flex-col justify-between shadow-md">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
              <TrendingUp size={12} className="text-indigo-400" />
              <span>Avg Resolve Time</span>
            </span>
            <div className="text-3xl font-extrabold text-indigo-400 mt-3 font-mono">
              {summary.avgResolutionTimeHours !== undefined ? `${summary.avgResolutionTimeHours}h` : '0h'}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-40 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <span className="w-9 h-9 border-3 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
          <span className="text-xs font-semibold">Generating AI business analytics...</span>
        </div>
      ) : (
        <>
          {/* VIEW: All Complaints Queue */}
          {showQueueOnly && (
            <div className="space-y-6">
              {/* Filter bar */}
              <div className="glassmorphism p-4 rounded-2xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search complaints..."
                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="ANALYZING">ANALYZING</option>
                    <option value="ASSIGNED">ASSIGNED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="ESCALATED">ESCALATED</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="">All Priorities</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <span className="text-xs text-slate-500 font-semibold">{filteredTickets.length} tickets found</span>
              </div>

              {/* Table */}
              <div className="glassmorphism rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
                        <th className="py-4 px-6">ID</th>
                        <th className="py-4 px-6">Client / Topic</th>
                        <th className="py-4 px-6">Agent Assignee</th>
                        <th className="py-4 px-6">Priority</th>
                        <th className="py-4 px-6">Risk Index</th>
                        <th className="py-4 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredTickets.map((t) => (
                        <tr 
                          key={t.id} 
                          onClick={() => navigate(`/manager/complaints/${t.id}`)}
                          className="hover:bg-slate-850/30 transition-all cursor-pointer"
                        >
                          <td className="py-4 px-6 text-xs font-mono font-bold text-slate-400">CMP-{t.id}</td>
                          <td className="py-4 px-6">
                            <div className="text-sm font-bold text-slate-200">{t.title}</div>
                            <span className="text-[10px] text-slate-500">{t.customerFullName}</span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-300">
                            {t.assignedAgentName || <span className="text-rose-450 font-bold">Unassigned</span>}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs font-mono font-bold text-rose-400">
                            {t.analysis?.escalationRisk ? `${Math.round(t.analysis.escalationRisk * 100)}%` : '--'}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                              t.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                              'bg-slate-500/10 text-slate-400 border border-slate-700/25'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: AI Analytics (Charts Grid) */}
          {(showChartsOnly || showDashboardDefault) && (
            <div className="space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Trends Chart */}
                <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-lg md:col-span-2">
                  <h3 className="font-bold text-slate-200 text-sm mb-4">Ticket Volume Daily Trends</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                        <Area type="monotone" dataKey="Count" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* SLA Compliance */}
                <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-lg">
                  <h3 className="font-bold text-slate-200 text-sm mb-4">SLA Deadline Compliance</h3>
                  <div className="h-64 flex flex-col justify-center items-center relative">
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={slaData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {safeSlaData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'On Time' ? '#10b981' : entry.name === 'Breached' ? '#ef4444' : '#f59e0b'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              {showChartsOnly && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Share */}
                  <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-lg">
                    <h3 className="font-bold text-slate-200 text-sm mb-4">Complaints by Business Area</h3>
                    <div className="h-64">
                      {safeCategoriesData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs">No classification data.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoriesData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {safeCategoriesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Agent Load Bar Chart */}
                  <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-lg">
                    <h3 className="font-bold text-slate-200 text-sm mb-4">Agent Workload Balancer</h3>
                    <div className="h-64">
                      {safeAgentData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-xs">No active support agents.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={agentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="agentName" stroke="#64748b" fontSize={9} />
                            <YAxis stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="openCount" name="Open Tickets" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="resolvedCount" name="Resolved Tickets" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: High-Risk Triage Monitor Panel (Default Dashboard only) */}
          {showDashboardDefault && (
            <div className="glassmorphism rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-800">
                <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                  <ShieldAlert className="text-rose-500 animate-pulse" />
                  <span>High-Risk SLA Escalations</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">AI flagged these tickets as containing severe risk of escalation or SLA breach.</p>
              </div>

              {safeHighRiskTickets.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs">
                  No high-risk escalations currently pending.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-900/50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-800">
                        <th className="py-4 px-6">ID</th>
                        <th className="py-4 px-6">Client / Topic</th>
                        <th className="py-4 px-6">Agent Assignee</th>
                        <th className="py-4 px-6">Priority</th>
                        <th className="py-4 px-6">Risk Factor</th>
                        <th className="py-4 px-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {safeHighRiskTickets.map((t) => (
                        <tr 
                          key={t.id} 
                          onClick={() => navigate(`/manager/complaints/${t.id}`)}
                          className="hover:bg-slate-800/30 transition-all cursor-pointer"
                        >
                          <td className="py-4 px-6 text-xs font-mono font-bold text-slate-400">CMP-{t.id}</td>
                          <td className="py-4 px-6">
                            <div className="text-sm font-bold text-slate-200">{t.title}</div>
                            <span className="text-[10px] text-slate-500">{t.customerFullName}</span>
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-300">
                            {t.assignedAgentName || <span className="text-rose-400 font-bold">Unassigned</span>}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs font-mono font-bold text-rose-400">
                            {t.analysis?.escalationRisk ? `${Math.round(t.analysis.escalationRisk * 100)}%` : '--'}
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
