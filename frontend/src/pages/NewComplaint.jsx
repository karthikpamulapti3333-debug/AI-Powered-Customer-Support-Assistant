import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Send, ArrowLeft, BrainCircuit, AlertCircle } from 'lucide-react';
import { complaintService } from '../services/api';

export default function NewComplaint() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (title.length < 5) {
      setError('Title must be at least 5 characters long.');
      return;
    }

    if (description.length < 10) {
      setError('Description must be at least 10 characters long.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const c = await complaintService.createComplaint(title, description);
      // Redirect to the newly created ticket detail page to watch AI analysis
      navigate(`/customer/complaints/${c.id}`);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        'Failed to submit complaint. Ensure backend and AI microservice are running.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Link */}
      <div>
        <Link 
          to="/customer/dashboard" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="glassmorphism p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BrainCircuit className="text-sky-400" />
            <span>Submit a Support Complaint</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Describe your issue. Our AI engine will predict priority, route the ticket to the correct department, and recommend solutions instantly.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Complaint Subject *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Charge failed but money was debited from account"
              className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Detailed Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please explain the details of the problem. If it is a payment issue, mention the transaction amount or order ID if you have it. This will help our AI models accurately categorize your complaint."
              rows={6}
              className="w-full bg-slate-900 border border-slate-800 focus:border-sky-500/40 rounded-2xl py-3 px-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20 transition-all resize-none"
              required
            />
          </div>

          {/* AI Banner Info */}
          <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/15 flex gap-3 text-[11px] text-sky-300 leading-relaxed">
            <BrainCircuit size={18} className="text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">AI Triage Notice:</span> This ticket will undergo natural language processing. 
              We will predict the category (Payment, Delivery, Product quality, Account lock, Technical glitch), 
              sentiment score, priority tier, and immediate resolution steps to expedite processing.
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              to="/customer/dashboard"
              className="px-5 py-3 rounded-2xl border border-slate-800 text-xs font-bold text-slate-400 hover:bg-slate-900 hover:text-white transition-all active:scale-[0.98]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold py-3 px-6 rounded-2xl shadow-lg shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={12} />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
