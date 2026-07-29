import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Send, Bot, User, ShieldAlert, Sparkles, 
  HelpCircle, ThumbsUp, Star, Link2, LogOut, ArrowRight, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { authService, analyticsService } from '../services/api';
import axios from 'axios';

export default function CustomerChat() {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  // Search and Error states
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Feedback popup state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Chart visualization state
  const [chartVisible, setChartVisible] = useState(false);
  const [chartData, setChartData] = useState(null);

  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = authService.getCurrentUser() || {};

  const headers = { 'Authorization': `Bearer ${token}` };

  // Custom Lightweight Markdown/Formatting Parser
  const renderMessageText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      let content = line;
      const isBullet = line.startsWith('• ') || line.startsWith('- ') || line.startsWith('* ');
      if (isBullet) {
        content = line.substring(2);
      }
      
      const parts = content.split(/\*\*(.*?)\*\*/g);
      const parsedLine = parts.map((part, partIdx) => {
        if (partIdx % 2 === 1) {
          return <strong key={partIdx} className="font-extrabold text-slate-900 dark:text-white bg-sky-500/10 px-1 rounded">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 ml-2 my-1">
            <span className="text-sky-500 mt-0.5">•</span>
            <span>{parsedLine}</span>
          </div>
        );
      }
      return (
        <p key={lineIdx} className={lineIdx > 0 ? "mt-2" : ""}>
          {parsedLine}
        </p>
      );
    });
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const handleRegenerateMessage = async (msgIndex) => {
    if (chatLoading) return;
    setErrorMessage('');
    
    // Find the last customer message before this AI response
    let customerMsg = null;
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].senderRole === 'CUSTOMER') {
        customerMsg = messages[i];
        break;
      }
    }
    
    if (!customerMsg) return;
    
    setChatLoading(true);
    try {
      const res = await axios.post(`/api/conversations/${currentConvId}/messages`, { messageText: customerMsg.messageText }, { headers });
      setMessages(prev => {
        const filtered = prev.filter((_, idx) => idx !== msgIndex);
        return [...filtered, res.data];
      });
    } catch (err) {
      console.error("Failed to regenerate response", err);
      setErrorMessage("Failed to regenerate response. Please check if services are running.");
    } finally {
      setChatLoading(false);
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
      alert("Unable to delete this conversation. Please try again.");
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/conversations', { headers });
      setConversations(res.data);
      if (res.data.length > 0) {
        selectConversation(res.data[0].id);
      } else {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading]);

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
    try {
      const res = await axios.post('/api/conversations', {}, { headers });
      setConversations(prev => [res.data, ...prev]);
      setCurrentConvId(res.data.id);
      setMessages([]);
      setErrorMessage('');
    } catch (err) {
      console.error("Failed to create new conversation", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || chatLoading) return;

    const userText = inputText;
    setInputText('');
    setErrorMessage('');
    
    const tempUserMsg = {
      id: Date.now(),
      senderRole: 'CUSTOMER',
      messageText: userText,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setChatLoading(true);

    try {
      // 1. Check if user explicitly requested a chart visualization
      const queryLower = userText.toLowerCase();
      let requestedChartType = null;
      if (queryLower.includes('chart') || queryLower.includes('graph') || queryLower.includes('visualize') || queryLower.includes('plot')) {
        if (queryLower.includes('priority') || queryLower.includes('priorities')) {
          requestedChartType = 'priority';
        } else if (queryLower.includes('category') || queryLower.includes('categories') || queryLower.includes('department') || queryLower.includes('depts')) {
          requestedChartType = 'category';
        } else if (queryLower.includes('sentiment')) {
          requestedChartType = 'sentiment';
        } else if (queryLower.includes('sla')) {
          requestedChartType = 'sla';
        } else if (queryLower.includes('trend') || queryLower.includes('trends') || queryLower.includes('volume') || queryLower.includes('daily')) {
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
          console.error("Failed to load requested chart data", err);
        }
      }

      const res = await axios.post(`/api/conversations/${currentConvId}/messages`, { messageText: userText }, { headers });
      setMessages(prev => [...prev, res.data]);
      axios.get('/api/conversations', { headers }).then(r => setConversations(r.data));
    } catch (err) {
      console.error("Failed to post message", err);
      setErrorMessage("I'm sorry, I'm having trouble connecting to the support service right now. Please try again in a moment.");
    } finally {
      setChatLoading(false);
    }
  };

  const triggerFeedbackModal = () => {
    setShowFeedbackModal(true);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setFeedbackLoading(true);
    try {
      await axios.post(`/api/conversations/${currentConvId}/feedback`, {
        rating,
        comment: feedbackComment
      }, { headers });
      
      // Update local status to RESOLVED
      setConversations(prev => prev.map(c => c.id === currentConvId ? { ...c, status: 'RESOLVED' } : c));
      setShowFeedbackModal(false);
      setFeedbackComment('');
      
      // Refresh current conversation
      selectConversation(currentConvId);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const triggerManualEscalate = async () => {
    const confirmEscalate = window.confirm("Would you like to open a formal complaint ticket for this issue?");
    if (!confirmEscalate) return;
    
    setChatLoading(true);
    try {
      // Send a dummy trigger to post message that escalates
      const res = await axios.post(`/api/conversations/${currentConvId}/messages`, { 
        messageText: "Please escalate this issue to a human agent and create a ticket immediately." 
      }, { headers });
      
      setMessages(prev => [...prev, res.data]);
      axios.get('/api/conversations', { headers }).then(r => setConversations(r.data));
    } catch (err) {
      console.error("Escalation failed", err);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      
      {/* LEFT PANEL: Chat List */}
      <div className="w-80 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/35">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm flex items-center gap-2">
              <MessageSquare size={16} className="text-sky-500" />
              <span>AI Assist Chats</span>
            </h3>
            <button 
              onClick={handleNewChat}
              className="text-[10px] uppercase tracking-wider font-bold bg-sky-500 hover:bg-sky-400 text-white py-1.5 px-3 rounded-xl transition-all shadow-md active:scale-95"
            >
              New Chat
            </button>
          </div>
          {/* Search bar */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-[11px] focus:outline-none focus:ring-1 focus:ring-sky-500/35 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-xs">Loading sessions...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs">No active chats. Click New Chat.</div>
          ) : (
            conversations
              .filter(c => c.id.toString().includes(searchQuery) || (c.status && c.status.toLowerCase().includes(searchQuery.toLowerCase())))
              .map((c) => {
                const active = c.id === currentConvId;
                return (
                  <div
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-1.5 cursor-pointer ${
                      active 
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 shadow-md font-bold' 
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/50 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <div className="flex justify-between items-center w-full">
                        <span className="text-xs font-bold font-mono">CHAT-{c.id}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          c.status === 'COMPLAINT_CREATED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                          c.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                          'bg-sky-500/10 text-sky-400 border-sky-500/25'
                        }`}>
                          {c.status?.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 truncate w-full">
                        Updated: {new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {/* Delete conversation button */}
                    <button
                      onClick={(e) => handleDeleteConversation(c.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0 ml-2 text-lg font-bold"
                      title="Clear chat history"
                    >
                      ×
                    </button>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* CENTER PANEL: Main Conversation Thread */}
      <div className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col overflow-hidden shadow-lg">
        
        {/* Chat Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/35">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white">
              <Bot size={18} />
            </div>
            <div>
              <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm">ResolveAI Agent</h4>
              <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Online (RAG-Enabled)
              </span>
            </div>
          </div>

          {currentConvId && (
            <div className="flex gap-2">
              <button 
                onClick={triggerManualEscalate}
                className="text-[10px] uppercase font-bold tracking-wider bg-rose-500/15 text-rose-500 hover:bg-rose-500 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-rose-500/20"
              >
                Talk to Agent
              </button>
              <button 
                onClick={triggerFeedbackModal}
                className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500 hover:text-white px-3.5 py-2 rounded-xl transition-all border border-emerald-500/20"
              >
                Mark Solved
              </button>
            </div>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/20">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-[11px] leading-normal flex items-start gap-2 shadow-sm animate-pulse">
              <span className="font-bold shrink-0">⚠️ Error:</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {messages.length === 0 && !chatLoading && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-10">
              <Bot size={44} className="text-sky-500/30 animate-bounce" />
              <div>
                <h5 className="font-extrabold text-slate-200 text-sm">Welcome to ResolveAI Assistance</h5>
                <p className="text-slate-500 text-xs mt-1 max-w-sm">
                  Ask me anything about our Refund, Shipping, or Technical policies. I'll search our Knowledge Base and reply immediately!
                </p>
              </div>
            </div>
          )}

          {messages.map((m, idx) => {
            const isUser = m.senderRole === 'CUSTOMER';
            return (
              <div 
                key={m.id} 
                className={`flex gap-3 max-w-[75%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                  isUser 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' 
                    : 'bg-gradient-to-tr from-sky-500 to-indigo-600 text-white'
                }`}>
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Msg Box */}
                <div className="space-y-1.5 flex-1">
                  <div className={`p-4 rounded-3xl border text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-slate-100 dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tr-none' 
                      : 'bg-slate-900/60 dark:bg-slate-900 border-sky-500/10 text-slate-350 dark:text-slate-200 rounded-tl-none shadow-md'
                  }`}>
                    {renderMessageText(m.messageText)}
                  </div>

                  {/* Metadata (Intent/Citations) for AI replies */}
                  <div className="flex flex-wrap items-center gap-2 pl-1 select-none">
                    {!isUser && (
                      <>
                        {m.intent && m.intent !== 'OTHER' && (
                          <span className="text-[8px] uppercase tracking-wider font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
                            Intent: {m.intent}
                          </span>
                        )}
                        {m.sources && (
                          <span className="text-[8px] uppercase tracking-wider font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Link2 size={10} /> Sources: {m.sources}
                          </span>
                        )}
                      </>
                    )}
                    
                    {/* Timestamp & Interactive Buttons */}
                    <div className="flex gap-2.5 items-center">
                      <span className="text-[9px] text-slate-400">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!isUser && (
                        <>
                          <button 
                            type="button"
                            onClick={() => handleCopyText(m.messageText)} 
                            className="text-[9px] text-sky-500 hover:text-sky-400 font-bold hover:underline"
                            title="Copy reply to clipboard"
                          >
                            Copy
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRegenerateMessage(idx)}
                            className="text-[9px] text-sky-500 hover:text-sky-400 font-bold hover:underline"
                            title="Regenerate this chatbot answer"
                          >
                            Regenerate
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {chatLoading && (
            <div className="flex gap-3 mr-auto max-w-[75%]">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                <Bot size={14} />
              </div>
              <div className="bg-slate-900 border border-sky-500/5 p-4 rounded-3xl rounded-tl-none shadow-md flex items-center gap-1.5">
                <span className="w-2 h-2 bg-sky-500/30 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-sky-500/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-sky-500/90 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/35 flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={chatLoading}
            placeholder="Ask a question (e.g. Where is my order 12345?)..."
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl py-3 px-4 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/30 dark:focus:ring-sky-500/20"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || chatLoading}
            className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl p-3 shadow-md transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* RIGHT PANEL: Analytics Visualizer */}
      {chartVisible && chartData && (
        <div className="w-96 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl animate-fade-in relative shrink-0">
          <button 
            type="button"
            onClick={() => {
              setChartVisible(false);
              setChartData(null);
            }}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 p-1.5 rounded-xl transition-all"
            title="Delete Chart"
          >
            <X size={18} />
          </button>
          
          <div className="space-y-4">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider pr-6">
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
          
          <div className="text-[10px] text-slate-500 text-center italic mt-4">
            Visualized using live database analytics
          </div>
        </div>
      )}

      {/* FEEDBACK POPUP MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-lg flex items-center gap-2">
                <Sparkles className="text-sky-400" />
                <span>Rate Chat Helpful Response</span>
              </h3>
              <p className="text-slate-450 dark:text-slate-400 text-xs mt-1">
                Your satisfaction helps us audit and close Knowledge Base gaps. Rate this support session.
              </p>
            </div>

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-2.5 rounded-xl transition-all border ${
                      rating >= star 
                        ? 'bg-amber-500/10 text-amber-450 border-amber-500/35' 
                        : 'bg-slate-950 text-slate-600 border-slate-800'
                    }`}
                  >
                    <Star size={18} fill={rating >= star ? '#f59e0b' : 'none'} />
                  </button>
                ))}
              </div>

              <textarea
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Share any comments on chatbot answer helpfulness..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-850 focus:border-sky-500/40 rounded-2xl py-3.5 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/25"
              />

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedbackLoading}
                  className="bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
