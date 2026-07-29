import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BrainCircuit, User, Clock, AlertTriangle, ShieldCheck, 
  Send, Lock, History, MessageSquare, Star, Sparkles
} from 'lucide-react';
import { complaintService, adminService, authService } from '../services/api';

export default function ComplaintDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [agents, setAgents] = useState([]);
  
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  
  // Feedback rating form
  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('comments'); // 'comments' or 'history'

  const user = authService.getCurrentUser() || {};
  const roles = user.roles || [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isManager = roles.includes('ROLE_MANAGER');
  const isAgent = roles.includes('ROLE_AGENT');
  const isCustomer = roles.includes('ROLE_CUSTOMER');

  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotData, setCopilotData] = useState(null);
  const [suggestedReply, setSuggestedReply] = useState('');

  const loadCopilotData = async (convId) => {
    if (!convId) return;
    setCopilotLoading(true);
    try {
      const res = await fetch(`/api/agent/copilot/${convId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCopilotData(data);
        setSuggestedReply(data.suggestedResponse);
      }
    } catch (err) {
      console.error("Failed to load Copilot data", err);
    } finally {
      setCopilotLoading(false);
    }
  };

  const loadTicketDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await complaintService.getComplaintById(id);
      setComplaint(data);

      const commentsData = await complaintService.getComments(id);
      setComments(commentsData);

      // Fetch audit history logs
      // Expose endpoint or query directly
      // In Spring Boot, we query via /api/complaints/{id}/history or inline. Since we logged it in DB, let's fetch
      // For simplicity, we can load history details from backend, we will add API fetch
      const histData = await fetch(`/api/complaints/${id}/history`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(res => res.ok ? res.json() : []);
      setHistory(histData);

      // Load agents list for reassignment (only for manager/admin)
      if (isManager || isAdmin) {
        const agentsData = await adminService.getAgents();
        setAgents(agentsData);
      }

      if (data.conversationId) {
        loadCopilotData(data.conversationId);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to pull ticket metadata. Ensure connection is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketDetails();
  }, [id]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const added = await complaintService.addComment(complaint.id, newComment, isInternal);
      setComments([...comments, added]);
      setNewComment('');
      setIsInternal(false);
      // Reload ticket status in case it toggled from WAITING_FOR_CUSTOMER to IN_PROGRESS
      const updated = await complaintService.getComplaintById(id);
      setComplaint(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await complaintService.updateComplaintStatus(complaint.id, newStatus);
      setComplaint(updated);
      loadTicketDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedAgentId) return;
    try {
      const updated = await complaintService.assignComplaint(complaint.id, selectedAgentId);
      setComplaint(updated);
      setSelectedAgentId('');
      loadTicketDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscalate = async () => {
    const reason = prompt("Enter reason for ticket escalation:");
    if (reason === null) return;
    try {
      const updated = await complaintService.escalateComplaint(complaint.id, reason);
      setComplaint(updated);
      loadTicketDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      await complaintService.submitFeedback(complaint.id, rating, feedbackText);
      setFeedbackText('');
      loadTicketDetails();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-40 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
        <span className="w-8 h-8 border-3 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
        <span className="text-xs font-semibold">Loading ticket details...</span>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="space-y-4 max-w-xl mx-auto pt-10 text-center">
        <AlertTriangle size={36} className="text-rose-500 mx-auto" />
        <div className="text-slate-200 font-bold">{error || 'Ticket not found.'}</div>
        <button onClick={() => navigate(-1)} className="text-sky-400 hover:underline text-xs">Go back</button>
      </div>
    );
  }

  const sentimentColors = {
    VERY_NEGATIVE: 'bg-rose-500/10 text-rose-400 border border-rose-500/25',
    NEGATIVE: 'bg-amber-500/10 text-amber-400 border border-amber-500/25',
    NEUTRAL: 'bg-slate-800 text-slate-400 border border-slate-700/30',
    POSITIVE: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
  };

  const timelineSteps = ['NEW', 'ANALYZING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const currentStepIdx = timelineSteps.indexOf(complaint.status);

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <button 
          onClick={() => navigate(-1)} 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Go Back</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN: Complaint Info & Timeline */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Resolution Banner */}
          {['RESOLVED', 'CLOSED'].includes(complaint.status) && (
            <div className="glassmorphism p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-md flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Complaint Resolved</h4>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                    This ticket has been solved by agent <strong className="text-slate-700 dark:text-slate-200">{complaint.assignedAgentName || 'System Triage'}</strong> on {new Date(complaint.resolvedAt || complaint.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                  </p>
                </div>
              </div>
              <span className="text-[9px] uppercase tracking-wider font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                {complaint.status}
              </span>
            </div>
          )}

          <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-lg space-y-6">
            <div className="flex justify-between items-start gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500">Ticket Ref: CMP-{complaint.id}</span>
                <h2 className="text-2xl font-extrabold text-white mt-0.5">{complaint.title}</h2>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                complaint.status === 'RESOLVED' || complaint.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                complaint.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                complaint.status === 'ESCALATED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {complaint.status}
              </span>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Complaint Details</h4>
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                {complaint.description}
              </p>
            </div>

            {/* Ticket Properties Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Customer Name</span>
                <div className="text-slate-200 font-semibold">{complaint.customerFullName}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Customer Email</span>
                <div className="text-slate-400 font-mono">{complaint.customerEmail}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Assigned Department</span>
                <div className="text-slate-200 font-semibold">{complaint.assignedDepartmentName || 'Pending Triage'}</div>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Assigned Agent</span>
                <div className="text-slate-200 font-semibold">{complaint.assignedAgentName || 'Awaiting Allocation'}</div>
              </div>
            </div>

            {/* Visual Timeline progress bar */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Triage Timeline</h4>
              <div className="flex items-center justify-between relative pt-2 pb-6 px-4">
                {/* Horizontal connector line */}
                <div className="absolute top-5 left-8 right-8 h-[2px] bg-slate-800 z-0" />
                <div 
                  className="absolute top-5 left-8 h-[2px] bg-gradient-to-r from-sky-500 to-indigo-500 z-0 transition-all duration-300"
                  style={{ width: `${Math.max(0, currentStepIdx) * 20}%` }}
                />

                {timelineSteps.map((step, idx) => {
                  const active = idx <= currentStepIdx;
                  return (
                    <div key={step} className="flex flex-col items-center relative z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                        active 
                          ? 'bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/20' 
                          : 'bg-slate-900 border border-slate-800 text-slate-500'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`absolute bottom-[-18px] text-[8px] uppercase tracking-wider font-bold shrink-0 ${
                        active ? 'text-sky-400' : 'text-slate-500'
                      }`}>
                        {step.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Customer Satisfaction Feedback Form (Visible to customer when resolved) */}
          {isCustomer && complaint.status === 'RESOLVED' && (
            <div className="glassmorphism p-6 rounded-3xl border border-sky-500/25 shadow-lg space-y-4">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <Sparkles className="text-sky-400 animate-pulse" />
                <span>Rate Complaint Resolution</span>
              </h3>
              <p className="text-slate-400 text-xs">Your complaint has been marked as resolved. Please provide your satisfaction feedback.</p>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-xl transition-all border ${
                        rating >= star 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-md' 
                          : 'bg-slate-900 text-slate-600 border-slate-800'
                      }`}
                    >
                      <Star size={16} fill={rating >= star ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Enter comments regarding resolution quality (optional)..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-2 px-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all"
                >
                  Submit Satisfaction Rating
                </button>
              </form>
            </div>
          )}

          {/* LOWER SECTION: Comments / Chat & Logs Tab */}
          <div className="glassmorphism rounded-3xl border border-slate-800 overflow-hidden shadow-lg">
            <div className="flex border-b border-slate-800 bg-slate-900/40">
              <button
                onClick={() => setActiveSubTab('comments')}
                className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                  activeSubTab === 'comments' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <MessageSquare size={14} />
                <span>Discussion Thread</span>
              </button>
              <button
                onClick={() => setActiveSubTab('history')}
                className={`flex items-center gap-2 px-6 py-4 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                  activeSubTab === 'history' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <History size={14} />
                <span>Audit Logs</span>
              </button>
            </div>

            {/* Sub Tab Panel: Comments */}
            {activeSubTab === 'comments' && (
              <div className="p-6 space-y-6">
                {/* Chat Feed */}
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs">
                      No comments posted on this ticket yet.
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div 
                        key={c.id} 
                        className={`p-4 rounded-2xl border ${
                          c.isInternal 
                            ? 'bg-rose-500/5 border-rose-500/10' 
                            : 'bg-slate-900/50 border-slate-850'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">{c.user?.username || 'user'}</span>
                            {c.isInternal && (
                              <span className="text-[8px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                                <Lock size={8} /> INTERNAL
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + 
                             new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">{c.commentText}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Box */}
                {complaint.status !== 'CLOSED' && (
                  <form onSubmit={handlePostComment} className="space-y-3 pt-4 border-t border-slate-800/80">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Type a message or response..."
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 resize-none"
                      required
                    />
                    <div className="flex justify-between items-center">
                      {/* Internal note option for staff */}
                      {!isCustomer ? (
                        <label className="flex items-center gap-2 text-xs text-slate-400 select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isInternal}
                            onChange={(e) => setIsInternal(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-800 text-sky-500 focus:ring-0 focus:ring-offset-0"
                          />
                          <span className="flex items-center gap-1">
                            <Lock size={12} className="text-slate-500" />
                            Internal Note (Staff only)
                          </span>
                        </label>
                      ) : <div />}

                      <button
                        type="submit"
                        disabled={commentLoading}
                        className="bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center gap-2"
                      >
                        <Send size={12} />
                        <span>Send</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Sub Tab Panel: Audit Logs */}
            {activeSubTab === 'history' && (
              <div className="p-6 space-y-4">
                {history.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    No history log recorded.
                  </div>
                ) : (
                  <div className="space-y-4 relative border-l border-slate-800 pl-4 ml-2">
                    {history.map((h) => (
                      <div key={h.id} className="relative text-xs">
                        {/* Dot indicator */}
                        <div className="absolute left-[-21px] top-1.5 w-2 h-2 rounded-full bg-sky-500" />
                        
                        <div className="flex justify-between text-slate-500 text-[10px] font-semibold">
                          <span>Action: {h.action} | Operator: {h.changedBy?.username}</span>
                          <span>{new Date(h.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-300 mt-1">{h.comment}</p>
                        {h.previousStatus && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Status change: <span className="text-slate-400">{h.previousStatus}</span> &rarr; <span className="text-sky-400">{h.newStatus}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI predictions & Management actions */}
        <div className="space-y-8">
          
          {/* AI predictions results (Center component request) */}
          <div className="glassmorphism p-6 rounded-3xl border border-sky-500/20 shadow-lg space-y-6">
            <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
              <BrainCircuit className="text-sky-400" />
              <span>AI Classifier Verdict</span>
            </h3>

            {complaint.analysis ? (
              <div className="space-y-4 text-xs">
                
                {/* Confidence Meter */}
                <div className="space-y-1 bg-slate-900/50 p-3 rounded-2xl border border-slate-850">
                  <div className="flex justify-between font-bold text-slate-300 text-[10px] uppercase">
                    <span>NLP Confidence</span>
                    <span className="text-sky-400">{Math.round(complaint.analysis.confidenceScore * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${complaint.analysis.confidenceScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* Sentiment & Priority */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Sentiment</span>
                    <div className={`px-2 py-1.5 rounded-xl font-bold text-center capitalize ${sentimentColors[complaint.analysis.sentiment] || 'bg-slate-800 text-slate-300'}`}>
                      {complaint.analysis.sentiment?.replace('_', ' ').toLowerCase()}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Priority Index</span>
                    <div className="px-2 py-1.5 rounded-xl font-bold bg-slate-900 border border-slate-850 text-slate-300 text-center">
                      {complaint.analysis.priority}
                    </div>
                  </div>
                </div>

                {/* Intent & Root Cause */}
                <div className="space-y-3 bg-slate-900/50 p-4 rounded-2xl border border-slate-850">
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Predicted Intent</span>
                    <div className="text-slate-200 font-bold font-mono text-[10px]">{complaint.analysis.intent}</div>
                  </div>
                  <div className="space-y-1 border-t border-slate-800 pt-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Root Cause Prediction</span>
                    <div className="text-slate-200 font-bold font-mono text-[10px]">{complaint.analysis.rootCause}</div>
                  </div>
                </div>

                {/* Escalation Risk */}
                <div className="space-y-1.5 bg-slate-900/50 p-3 rounded-2xl border border-slate-850">
                  <div className="flex justify-between font-bold text-slate-300 text-[10px] uppercase">
                    <span>Escalation Risk</span>
                    <span className={complaint.analysis.escalationRisk >= 0.8 ? 'text-rose-400 font-black' : 'text-slate-400'}>
                      {Math.round(complaint.analysis.escalationRisk * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        complaint.analysis.escalationRisk >= 0.8 ? 'bg-rose-500' :
                        complaint.analysis.escalationRisk >= 0.5 ? 'bg-amber-500' :
                        'bg-sky-500'
                      }`}
                      style={{ width: `${complaint.analysis.escalationRisk * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                AI verification pending.
              </div>
            )}
          </div>

          {/* AI AGENT COPILOT (Staff-Only) */}
          {!isCustomer && (
            <div className="glassmorphism p-6 rounded-3xl border border-indigo-500/20 shadow-lg space-y-6 bg-indigo-500/5">
              <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                <Sparkles className="text-indigo-400 animate-pulse" />
                <span>AI Support Copilot</span>
              </h3>

              {copilotLoading ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Generating Copilot suggestions...
                </div>
              ) : copilotData ? (
                <div className="space-y-5 text-xs">
                  
                  {/* Summary */}
                  <div className="space-y-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">AI Summary</span>
                    <p className="text-slate-300 bg-slate-900/50 p-3 rounded-xl border border-slate-850 leading-relaxed">
                      {copilotData.summary}
                    </p>
                  </div>

                  {/* ML Parameters */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                    <div>
                      <span className="text-slate-550 text-[9px] uppercase font-bold text-slate-550">Root Cause</span>
                      <div className="text-slate-200 font-bold font-mono mt-0.5">{copilotData.rootCause}</div>
                    </div>
                    <div>
                      <span className="text-slate-555 text-[9px] uppercase font-bold text-slate-550">Intent</span>
                      <div className="text-slate-200 font-bold font-mono mt-0.5">{copilotData.intent}</div>
                    </div>
                  </div>

                  {/* Playbook / Recommended Actions */}
                  <div className="space-y-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Playbook Play</span>
                    <ul className="space-y-1.5 text-slate-350 leading-relaxed list-disc pl-4">
                      {copilotData.recommendedActions && copilotData.recommendedActions.map((action, idx) => (
                        <li key={idx} className="hover:text-white transition-colors">{action}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested response draft */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Suggested AI Reply</span>
                      <button
                        onClick={() => loadCopilotData(complaint.conversationId)}
                        className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-colors"
                      >
                        Regenerate
                      </button>
                    </div>
                    <textarea
                      value={suggestedReply}
                      onChange={(e) => setSuggestedReply(e.target.value)}
                      rows={6}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500/35 rounded-xl py-3 px-3 text-[11px] text-slate-200 focus:outline-none leading-relaxed font-sans resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setNewComment(suggestedReply);
                          alert("AI suggested draft copied to the discussion thread input box. You can now edit and post it.");
                        }}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl transition-all shadow-md active:scale-95 text-center block text-[10px] uppercase tracking-wider"
                      >
                        Accept & Insert Draft
                      </button>
                    </div>
                  </div>

                  {/* Sources */}
                  {copilotData.sources && copilotData.sources.length > 0 && (
                    <div className="space-y-1 border-t border-slate-800 pt-2 flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Cited KB Articles:</span>
                      <span className="text-indigo-400 font-mono text-[9px] font-bold">
                        {copilotData.sources.join(', ')}
                      </span>
                    </div>
                  )}

                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  This ticket has no active chat context. Manual resolution suggested.
                </div>
              )}
            </div>
          )}

          {/* Support Actions Console (Staff actions) */}
          {!isCustomer && complaint.status !== 'CLOSED' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-lg space-y-6">
              <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Support Actions</h3>
              
              <div className="space-y-4 text-xs">
                {/* Agent status controls */}
                {isAgent && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Update Ticket Status</label>
                    <select
                      value={complaint.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="ASSIGNED">ASSIGNED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
                      <option value="RESOLVED">RESOLVED</option>
                    </select>
                  </div>
                )}

                {/* Manager assignment controls */}
                {(isManager || isAdmin) && (
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-500 font-bold uppercase">Assign/Reassign Agent</label>
                    <div className="flex gap-2">
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 focus:outline-none"
                      >
                        <option value="">Select agent...</option>
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>{a.user?.firstName} {a.user?.lastName} ({a.department?.name})</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssignAgent}
                        className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-3 py-2 rounded-xl transition-all"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}

                {/* Manual status tools for managers */}
                {(isManager || isAdmin) && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Administrative Status override</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStatusChange('RESOLVED')}
                        className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 py-2 rounded-xl transition-all font-bold"
                      >
                        Resolve Ticket
                      </button>
                      <button
                        onClick={() => handleStatusChange('CLOSED')}
                        className="flex-1 bg-slate-800 text-slate-300 hover:bg-slate-700 py-2 rounded-xl transition-all font-bold"
                      >
                        Close Ticket
                      </button>
                    </div>
                  </div>
                )}

                {/* Escalation button */}
                {complaint.escalationStatus !== 'ESCALATED' && complaint.status !== 'RESOLVED' && (
                  <button
                    onClick={handleEscalate}
                    className="w-full bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 py-2.5 rounded-xl transition-all font-bold flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle size={14} />
                    <span>Escalate Ticket</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
