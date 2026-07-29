import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MessageSquare, Send, Bot, User, X, Sparkles, 
  Star, RefreshCw, Trash2, ArrowRight, Minimize2, Maximize2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { authService, analyticsService } from '../services/api';
import axios from 'axios';

export default function UniversalAIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Feedback popup state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Chart visualization state
  const [chartVisible, setChartVisible] = useState(false);
  const [chartData, setChartData] = useState(null);

  const messagesEndRef = useRef(null);
  const location = useLocation();

  const token = localStorage.getItem('token');
  const user = authService.getCurrentUser();

  if (!user || !token) return null;

  const headers = { 'Authorization': `Bearer ${token}` };

  // Parse page context
  const ticketIdMatch = location.pathname.match(/\/(customer|agent|manager)\/complaints\/(\d+)/i) 
    || location.pathname.match(/\/complaints\/(\d+)/i);
  const currentTicketId = ticketIdMatch ? ticketIdMatch[2] : null;

  const getRoleLabel = () => {
    if (!user.roles) return 'USER';
    if (user.roles.includes('ROLE_ADMIN')) return 'ADMIN';
    if (user.roles.includes('ROLE_MANAGER')) return 'MANAGER';
    if (user.roles.includes('ROLE_AGENT')) return 'AGENT';
    return 'CUSTOMER';
  };

  const userRole = getRoleLabel();

  // Load conversations on mount or open
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading]);

  const loadConversations = async () => {
    try {
      const res = await axios.get('/api/conversations', { headers });
      setConversations(res.data);
      if (res.data.length > 0 && !currentConvId) {
        selectConversation(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  };

  const selectConversation = async (id) => {
    setCurrentConvId(id);
    setErrorMessage('');
    setChartVisible(false);
    setChartData(null);
    try {
      const res = await axios.get(`/api/conversations/${id}/messages`, { headers });
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const handleNewChat = async () => {
    setErrorMessage('');
    setChartVisible(false);
    setChartData(null);
    try {
      const res = await axios.post('/api/conversations', {}, { headers });
      setConversations(prev => [res.data, ...prev]);
      setCurrentConvId(res.data.id);
      setMessages([]);
    } catch (err) {
      console.error("Failed to create new conversation", err);
    }
  };

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this conversation?");
    if (!confirmDelete) return;
    
    try {
      await axios.delete(`/api/conversations/${id}`, { headers });
      const res = await axios.get('/api/conversations', { headers });
      setConversations(res.data);
      if (id === currentConvId) {
        setMessages([]);
        if (res.data.length > 0) {
          selectConversation(res.data[0].id);
        } else {
          setCurrentConvId(null);
          setChartVisible(false);
          setChartData(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || chatLoading) return;

    if (!textToSend) setInputText('');
    setErrorMessage('');

    // If no active conversation exists, start one first
    let activeConvId = currentConvId;
    if (!activeConvId) {
      try {
        const res = await axios.post('/api/conversations', {}, { headers });
        setConversations(prev => [res.data, ...prev]);
        activeConvId = res.data.id;
        setCurrentConvId(activeConvId);
      } catch (err) {
        setErrorMessage("Unable to establish chat session.");
        return;
      }
    }

    const tempUserMsg = {
      id: Date.now(),
      senderRole: 'CUSTOMER',
      messageText: text,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setChatLoading(true);

    try {
      // Check for chart keywords
      const queryLower = text.toLowerCase();
      let requestedChartType = null;
      if (queryLower.includes('chart') || queryLower.includes('graph') || queryLower.includes('visualize') || queryLower.includes('plot')) {
        if (queryLower.includes('priority')) {
          requestedChartType = 'priority';
        } else if (queryLower.includes('category') || queryLower.includes('categories')) {
          requestedChartType = 'category';
        } else if (queryLower.includes('sentiment')) {
          requestedChartType = 'sentiment';
        } else if (queryLower.includes('sla')) {
          requestedChartType = 'sla';
        } else if (queryLower.includes('trend') || queryLower.includes('trends') || queryLower.includes('volume')) {
          requestedChartType = 'trends';
        }
      }

      if (requestedChartType) {
        try {
          if (requestedChartType === 'priority') {
            const data = await analyticsService.getPriority();
            const mapped = Object.keys(data).map(key => ({ name: key, count: data[key] }));
            setChartData({ type: 'priority', title: 'Complaints by Priority', data: mapped });
            setChartVisible(true);
          } else if (requestedChartType === 'category') {
            const data = await analyticsService.getCategories();
            const mapped = Object.keys(data).map(key => ({ name: key, value: data[key] }));
            setChartData({ type: 'category', title: 'Complaints by Category', data: mapped });
            setChartVisible(true);
          } else if (requestedChartType === 'sentiment') {
            const data = await analyticsService.getSentiment();
            const mapped = Object.keys(data).map(key => ({ name: key, value: data[key] }));
            setChartData({ type: 'sentiment', title: 'Complaints Sentiment Split', data: mapped });
            setChartVisible(true);
          } else if (requestedChartType === 'sla') {
            const data = await analyticsService.getSla();
            const mapped = [
              { name: 'On Time', value: data.onTimeCount || 0 },
              { name: 'Breached', value: data.breachedCount || 0 },
              { name: 'At Risk', value: data.atRiskCount || 0 }
            ];
            setChartData({ type: 'sla', title: 'SLA Compliance Rate', data: mapped });
            setChartVisible(true);
          } else if (requestedChartType === 'trends') {
            const data = await analyticsService.getTrends();
            const mapped = Object.keys(data).map(key => ({ name: key, count: data[key] }));
            setChartData({ type: 'trends', title: 'Daily Ticket Trends', data: mapped });
            setChartVisible(true);
          }
        } catch (err) {
          console.error("Failed to load chart stats inside universal chatbot", err);
        }
      }

      // Prepend context if useful
      let finalMessageText = text;
      if (currentTicketId) {
        finalMessageText = `[CONTEXT: ticketId=${currentTicketId}, page=TICKET_DETAILS, role=${userRole}] ${text}`;
      }

      const res = await axios.post(`/api/conversations/${activeConvId}/messages`, { messageText: finalMessageText }, { headers });
      
      // Strip out context tag in frontend message state representation
      const cleanReply = { ...res.data };
      setMessages(prev => [...prev, cleanReply]);
      
      // Refresh list
      axios.get('/api/conversations', { headers }).then(r => setConversations(r.data));
    } catch (err) {
      console.error("Failed to send message", err);
      setErrorMessage("Service offline. Please check connection.");
    } finally {
      setChatLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!currentConvId) return;
    try {
      await axios.post(`/api/conversations/${currentConvId}/feedback`, {
        rating,
        comment: feedbackComment
      }, { headers });
      setShowFeedbackModal(false);
      setFeedbackComment('');
      alert("Feedback submitted successfully!");
      selectConversation(currentConvId);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    }
  };

  const getRoleSuggestionChips = () => {
    switch (userRole) {
      case 'CUSTOMER':
        return [
          { text: "Who is C. V. Raman?", label: "Who is C. V. Raman?" },
          { text: "Where is my order 12345?", label: "Track Order" },
          { text: "Check ticket status CMP-1", label: "Check Ticket" },
          { text: "Search knowledge base", label: "Search FAQ" }
        ];
      case 'AGENT':
        return [
          { text: currentTicketId ? `Summarize ticket #${currentTicketId}` : "Search knowledge base", label: currentTicketId ? "Summarize Ticket" : "Search KB" },
          { text: currentTicketId ? `Suggest response for ticket #${currentTicketId}` : "Who is APJ Abdul Kalam?", label: currentTicketId ? "Suggest Response" : "Explain Kalam" },
          { text: "Explain OSI model", label: "Explain OSI" }
        ];
      case 'ADMIN':
        return [
          { text: "Show top complaint categories as a chart", label: "Categories Chart" },
          { text: "Show complaints by priority as a chart", label: "Priorities Chart" },
          { text: "Explain Artificial Intelligence", label: "Explain AI" }
        ];
      case 'MANAGER':
        return [
          { text: "Show ticket trends as a chart", label: "Trends Chart" },
          { text: "Show SLA compliance in a chart", label: "SLA Chart" },
          { text: "Who is C. V. Raman?", label: "Who is Raman?" }
        ];
      default:
        return [
          { text: "Who is C. V. Raman?", label: "Who is Raman?" },
          { text: "Explain Java", label: "Explain Java" }
        ];
    }
  };

  // Custom light formatting helper
  const renderMessageText = (text) => {
    if (!text) return null;
    
    // Strip hidden context tags from display if present
    const cleanText = text.replace(/^\[CONTEXT:.*?\]\s*/, '');
    const lines = cleanText.split('\n');
    
    return lines.map((line, lineIdx) => {
      let content = line;
      const isBullet = line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ');
      if (isBullet) {
        content = line.substring(2);
      }
      
      const parts = content.split(/\*\*(.*?)\*\*/g);
      const parsedLine = parts.map((part, partIdx) => {
        if (partIdx % 2 === 1) {
          return <strong key={partIdx} className="font-bold text-sky-500">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={lineIdx} className="flex items-start gap-1 ml-2 my-0.5 text-xs">
            <span className="text-sky-500">•</span>
            <span>{parsedLine}</span>
          </div>
        );
      }
      return (
        <p key={lineIdx} className={lineIdx > 0 ? "mt-1 text-xs" : "text-xs"}>
          {parsedLine}
        </p>
      );
    });
  };

  return (
    <>
      {/* FLOATING ACTION TRIGGER */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-full px-5 py-3 shadow-2xl flex items-center gap-2 border border-sky-400/20 active:scale-95 transition-all animate-bounce"
        style={{ animationDuration: '3s' }}
        title="Open ResolveAI Assistant"
      >
        <Bot size={18} className="animate-pulse" />
        <span className="text-xs font-bold tracking-wider uppercase">AI Assistant</span>
      </button>

      {/* CHAT PANEL PANEL */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in">
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white tracking-wider uppercase">ResolveAI Assistant</h3>
                <span className="text-[9px] text-sky-400 font-bold tracking-widest uppercase">{userRole} MODE</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleNewChat}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
                title="New Chat"
              >
                <RefreshCw size={12} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
                title="Minimize Panel"
              >
                <Minimize2 size={12} />
              </button>
            </div>
          </div>

          {/* Conversations Sub-selector dropdown */}
          {conversations.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 flex items-center justify-between text-[10px] shrink-0">
              <select 
                value={currentConvId || ''} 
                onChange={(e) => selectConversation(Number(e.target.value))}
                className="bg-transparent text-slate-700 dark:text-slate-300 font-bold focus:outline-none max-w-[200px]"
              >
                {conversations.map(c => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    Chat Session #{c.id} ({new Date(c.createdAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
              {currentConvId && (
                <button 
                  onClick={(e) => handleDeleteConversation(currentConvId, e)}
                  className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-all"
                  title="Delete active chat"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          )}

          {/* Conversation history area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20 dark:bg-slate-950/25">
            {messages.length === 0 && !chatLoading && (
              <div className="text-center py-12 space-y-3 px-6">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mx-auto">
                  <Bot size={20} className="text-slate-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">How can I assist you today?</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Ask me anything from general topics (like CV Raman/Java) to order tracking and complaint dashboards.
                </p>
                {currentTicketId && (
                  <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-2.5 text-left">
                    <span className="text-[9px] text-sky-400 font-black uppercase tracking-wider block">Context Alert</span>
                    <span className="text-[10px] text-slate-700 dark:text-slate-300 mt-1 block leading-relaxed">
                      You are currently viewing Ticket <strong>#CMP-{currentTicketId}</strong>. You can ask me to summarize or detail it.
                    </span>
                  </div>
                )}
              </div>
            )}

            {messages.map((m, idx) => (
              <div key={m.id || idx} className={`flex gap-2 ${m.senderRole === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}>
                {m.senderRole !== 'CUSTOMER' && (
                  <div className="w-6 h-6 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                    <Bot size={12} className="text-sky-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                  m.senderRole === 'CUSTOMER' 
                    ? 'bg-sky-500 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                }`}>
                  {renderMessageText(m.messageText)}
                  <span className="block text-[8px] text-slate-450 dark:text-slate-500 text-right mt-1 font-mono">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {m.senderRole === 'CUSTOMER' && (
                  <div className="w-6 h-6 rounded-lg bg-slate-250 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <User size={12} className="text-slate-400" />
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                  <Bot size={12} className="text-sky-400 animate-spin" />
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none px-3 py-2 text-xs text-slate-550 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-2.5 text-[10px] text-center font-bold">
                {errorMessage}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions chips */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 overflow-x-auto flex gap-1.5 shrink-0 whitespace-nowrap">
            {getRoleSuggestionChips().map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                className="bg-white dark:bg-slate-800 hover:bg-sky-500/10 border border-slate-200 dark:border-slate-700 hover:border-sky-500/30 text-slate-700 dark:text-slate-300 hover:text-sky-500 text-[10px] py-1 px-2.5 rounded-full transition-all shrink-0"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Input Chat Box Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
            className="p-3 border-t border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 flex gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={chatLoading}
              placeholder="Ask a question..."
              className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/30"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || chatLoading}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl p-2 shadow shadow-indigo-500/30 flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Send size={14} />
            </button>
          </form>

          {/* Rate Button */}
          {messages.length > 0 && (
            <div className="px-3 py-1 bg-slate-50 dark:bg-slate-950 border-t border-slate-150 dark:border-slate-900 text-center shrink-0">
              <button
                onClick={() => setShowFeedbackModal(true)}
                className="text-[9px] font-bold text-indigo-500 hover:underline uppercase tracking-wider"
              >
                Rate Helpful Response
              </button>
            </div>
          )}
        </div>
      )}

      {/* FLOAT SIDE CHART VIEW PANEL */}
      {isOpen && chartVisible && chartData && (
        <div className="fixed bottom-24 right-[26rem] w-96 h-[32rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col z-50 animate-fade-in side-chart-panel">
          <button 
            onClick={() => {
              setChartVisible(false);
              setChartData(null);
            }}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800 transition-all"
            title="Delete Chart"
          >
            <X size={16} />
          </button>
          
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-extrabold text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider pr-6">
                {chartData.title}
              </h3>
              
              <div className="h-64 mt-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  {chartData.type === 'priority' || chartData.type === 'trends' ? (
                    <BarChart data={chartData.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                      <YAxis stroke="#64748b" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={chartData.data}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {chartData.data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#10b981', '#a855f7'][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="text-[9px] text-slate-500 text-center italic mt-2">
              Visualized using live database analytics
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK POPUP MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
                <Sparkles className="text-sky-450" />
                <span>Rate Chat Response</span>
              </h3>
              <p className="text-slate-500 text-[10px] mt-1 leading-relaxed">
                Your satisfaction helps us audit and close Knowledge Base gaps. Rate this support session.
              </p>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="flex gap-1.5 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2 rounded-xl transition-all border ${
                      rating >= star 
                        ? 'bg-amber-500/10 text-amber-550 border-amber-500/35' 
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <Star size={16} fill={rating >= star ? '#f59e0b' : 'none'} />
                  </button>
                ))}
              </div>

              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Share any comments on chatbot answer helpfulness..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-sky-500/40 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold py-2 px-3 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-bold py-2 px-3 rounded-lg shadow-lg"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS Animations Styles Inject */}
      <style>{`
        .animate-fade-in {
          animation: chatbotFadeIn 0.3s ease-out forwards;
        }
        @keyframes chatbotFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
