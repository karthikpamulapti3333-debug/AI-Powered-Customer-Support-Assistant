import React, { useState, useEffect } from 'react';
import { 
  User, Key, Bell, SunMoon, MessageSquare, ShieldCheck, 
  Eye, EyeOff, Save, Trash2, ShieldAlert, Upload, RefreshCw, Clock
} from 'lucide-react';
import { authService, adminService } from '../services/api';

export default function Settings({ user, setUser, theme, toggleTheme }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile Form State
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  // Password Form State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Notification Preference State
  const [notifications, setNotifications] = useState({
    emailUpdates: localStorage.getItem('pref_email_updates') !== 'false',
    ticketActivity: localStorage.getItem('pref_ticket_activity') !== 'false',
    statusChanges: localStorage.getItem('pref_status_changes') !== 'false',
    aiAlerts: localStorage.getItem('pref_ai_alerts') !== 'false'
  });

  // AI assistant preferences
  const [aiPreferences, setAiPreferences] = useState({
    enabled: localStorage.getItem('ai_assistant_enabled') !== 'false',
    clearHistoryConfirm: false
  });

  // Admin config mock state
  const [adminConfig, setAdminConfig] = useState({
    provider: localStorage.getItem('AI_PROVIDER') || 'LOCAL_SIMULATOR',
    model: localStorage.getItem('LLM_MODEL_NAME') || 'gpt-3.5-turbo',
    baseUrl: 'https://api.openai.com/v1'
  });
  const [slaList, setSlaList] = useState([]);
  const [kbDocsList, setKbDocsList] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);

  const isAdmin = user?.roles?.includes('ROLE_ADMIN');

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Load SLA rules if user is Admin
  useEffect(() => {
    if (isAdmin && activeTab === 'admin') {
      loadAdminData();
    }
  }, [activeTab]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const sla = await adminService.getSlaRules();
      setSlaList(sla);
      const token = localStorage.getItem('token');
      const docs = await fetch('/api/knowledge/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => res.ok ? res.json() : []);
      setKbDocsList(docs);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch admin settings data.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profile.firstName || !profile.lastName || !profile.email) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const updated = await authService.updateProfile(profile);
      if (setUser) {
        setUser(authService.getCurrentUser());
      }
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update profile information.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (passwords.newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await authService.changePassword(passwords.currentPassword, passwords.newPassword);
      setSuccess('Password updated successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = (key) => {
    const updatedVal = !notifications[key];
    setNotifications(prev => ({ ...prev, [key]: updatedVal }));
    localStorage.setItem(`pref_${key.replace(/([A-Z])/g, "_$1").toLowerCase()}`, updatedVal);
    setSuccess('Notification preferences saved locally.');
  };

  const handleAIPreferenceChange = () => {
    const updatedVal = !aiPreferences.enabled;
    setAiPreferences(prev => ({ ...prev, enabled: updatedVal }));
    localStorage.setItem('ai_assistant_enabled', updatedVal);
    // Reload components depending on the toggle
    window.dispatchEvent(new Event('storage'));
    setSuccess('AI Assistant visibility setting updated.');
  };

  const handleClearChatHistory = () => {
    // Clear chat messages from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('chat_history_')) {
        localStorage.removeItem(key);
      }
    });
    setAiPreferences(prev => ({ ...prev, clearHistoryConfirm: false }));
    setSuccess('Chat history cleared successfully.');
    window.dispatchEvent(new Event('storage'));
  };

  const handleThemeChange = (mode) => {
    if (mode === 'light' && theme === 'dark') {
      toggleTheme();
    } else if (mode === 'dark' && theme === 'light') {
      toggleTheme();
    }
    setSuccess('Theme preference updated.');
  };

  // Admin Actions
  const handleUpdateSla = async (id, priority, resHrs, warnHrs) => {
    setError('');
    setSuccess('');
    try {
      await adminService.updateSlaRule(id, priority, resHrs, warnHrs);
      setSuccess(`SLA Rule for ${priority} priority updated successfully.`);
      loadAdminData();
    } catch (err) {
      console.error(err);
      setError('Failed to update SLA rule on the backend.');
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!fileToUpload) return;
    setUploadingFile(true);
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('category', 'GENERAL');
    try {
      const res = await fetch('/api/knowledge/upload-document', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setSuccess('RAG Document uploaded and indexed successfully!');
        setFileToUpload(null);
        loadAdminData();
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to index document.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to microservice indexing endpoint.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (fileName) => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/knowledge/delete-document?fileName=${encodeURIComponent(fileName)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccess('Document successfully removed from vector store.');
        loadAdminData();
      } else {
        setError('Failed to delete document from index.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to document deletion endpoint.');
    }
  };

  const handleSaveAIConfig = () => {
    localStorage.setItem('AI_PROVIDER', adminConfig.provider);
    localStorage.setItem('LLM_MODEL_NAME', adminConfig.model);
    
    // Dispatch custom event to notify FastAPI gateway if applicable, or uvicorn
    setSuccess('LLM Provider configuration saved locally. Backend dynamic environment parser will reflect this on subsequent calls.');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Account Settings</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure profiles, change passwords, select appearance themes, and AI parameters.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-3">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-3">
          <ShieldCheck size={16} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left tabs selector */}
        <div className="glassmorphism p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'profile' 
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <User size={16} />
            <span>Profile Settings</span>
          </button>

          <button
            onClick={() => { setActiveTab('password'); setError(''); setSuccess(''); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'password' 
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <Key size={16} />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => { setActiveTab('notifications'); setError(''); setSuccess(''); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'notifications' 
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <Bell size={16} />
            <span>Notifications</span>
          </button>

          <button
            onClick={() => { setActiveTab('appearance'); setError(''); setSuccess(''); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'appearance' 
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <SunMoon size={16} />
            <span>Appearance</span>
          </button>

          <button
            onClick={() => { setActiveTab('ai'); setError(''); setSuccess(''); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ai' 
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            <MessageSquare size={16} />
            <span>AI Assistant Settings</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => { setActiveTab('admin'); setError(''); setSuccess(''); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'admin' 
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <ShieldCheck size={16} className="text-violet-500" />
              <span>Admin Configuration</span>
            </button>
          )}
        </div>

        {/* Right Tab pane Content */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* PROFILE SETTINGS TAB */}
          {activeTab === 'profile' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Profile Details</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Manage public profile attributes and account contact details.</p>
              </div>

              <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username (Protected)</label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-500 select-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Account Role (Protected)</label>
                  <input
                    type="text"
                    value={user?.roles?.join(', ') || 'CUSTOMER'}
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-500 select-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">First Name</label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Name</label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="name@company.com"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                  />
                </div>

                <div className="md:col-span-2 pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/40 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
                  >
                    <Save size={14} />
                    <span>{loading ? 'Saving Changes...' : 'Save Profile'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CHANGE PASSWORD TAB */}
          {activeTab === 'password' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 max-w-xl">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Change Password</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Verify your identity and setup secure credentials.</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={passwords.currentPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-355 focus:outline-none"
                    >
                      {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password (min 6 chars)"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-355 focus:outline-none"
                    >
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-4 pr-12 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-355 focus:outline-none"
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-sky-500 hover:bg-sky-400 disabled:bg-sky-500/40 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
                  >
                    <Save size={14} />
                    <span>{loading ? 'Changing Password...' : 'Change Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* NOTIFICATION PREFERENCES TAB */}
          {activeTab === 'notifications' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Notification Preferences</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Configure channels for automated complaints status activity updates.</p>
              </div>

              <div className="space-y-4 max-w-lg">
                <div className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs text-slate-850 dark:text-slate-200">Email System Alerts</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">Receive summary reports on resolved complaints via email.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.emailUpdates}
                    onChange={() => handleNotificationChange('emailUpdates')}
                    className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-800 rounded focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs text-slate-850 dark:text-slate-200">Ticket Updates</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">Alert when support agents post responses or request additional logs.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.ticketActivity}
                    onChange={() => handleNotificationChange('ticketActivity')}
                    className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-800 rounded focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs text-slate-850 dark:text-slate-200">Status Change Notifications</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">Notify immediately when status changes (e.g. In Progress, Resolved).</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.statusChanges}
                    onChange={() => handleNotificationChange('statusChanges')}
                    className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-800 rounded focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs text-slate-850 dark:text-slate-200">AI Assistant suggestions</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">Let the AI notify you when new articles match your active tickets.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.aiAlerts}
                    onChange={() => handleNotificationChange('aiAlerts')}
                    className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-800 rounded focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE SETTINGS TAB */}
          {activeTab === 'appearance' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Appearance Settings</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Configure layout theme settings for comfortable support sessions.</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`flex-1 min-w-[12rem] p-6 rounded-3xl border text-left space-y-3 transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-900/80 border-sky-500 text-white shadow-lg shadow-sky-500/10'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-850 dark:bg-slate-800 flex items-center justify-center text-sky-400">
                    <SunMoon size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-xs">Dark Futuristic AI Style</h4>
                    <p className="text-[9px] text-slate-500 dark:text-slate-450 mt-0.5">Sleek neon highlights with glassmorphic cards layout (Recommended).</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`flex-1 min-w-[12rem] p-6 rounded-3xl border text-left space-y-3 transition-all ${
                    theme === 'light'
                      ? 'bg-slate-50 border-sky-500 text-slate-900 shadow-lg shadow-sky-500/5'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-100'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-900 flex items-center justify-center text-amber-500">
                    <SunMoon size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-xs">Clean Light Mode</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">High contrast minimal design for daylight reading setups.</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* AI ASSISTANT SETTINGS TAB */}
          {activeTab === 'ai' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">AI Assistant Settings</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Manage parameters for the global chatbot assistant utility.</p>
              </div>

              <div className="space-y-6 max-w-lg">
                <div className="flex items-center justify-between p-3.5 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="font-bold text-xs text-slate-850 dark:text-slate-200">Enable AI Chatbot Bubble</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">Display floating 🤖 AI Assistant at bottom-right corner for quick actions.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={aiPreferences.enabled}
                    onChange={handleAIPreferenceChange}
                    className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-800 rounded focus:ring-sky-500"
                  />
                </div>

                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-rose-500">Clear Local Chat History</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5">Permanently flush chatbot histories and conversations caching stored locally.</p>
                  </div>
                  {aiPreferences.clearHistoryConfirm ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleClearChatHistory}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setAiPreferences(prev => ({ ...prev, clearHistoryConfirm: false }))}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-1.5 px-3 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAiPreferences(prev => ({ ...prev, clearHistoryConfirm: true }))}
                      className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold py-1.5 px-3 rounded-lg text-xs border border-rose-500/20 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={12} />
                      <span>Clear Conversations Memory</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ADMIN-ONLY CONFIGURATION TAB */}
          {isAdmin && activeTab === 'admin' && (
            <div className="space-y-6">
              
              {/* AI/LLM Provider settings */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">LLM Provider & Gateway</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Configure active server-side LLM provider models and endpoints.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active provider</label>
                    <select
                      value={adminConfig.provider}
                      onChange={(e) => setAdminConfig(prev => ({ ...prev, provider: e.target.value }))}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-slate-100"
                    >
                      <option value="LOCAL_SIMULATOR">Local Simulator (No keys required)</option>
                      <option value="OPENAI">OpenAI completions API</option>
                      <option value="GOOGLE">Google Gemini REST API</option>
                      <option value="ANTHROPIC">Anthropic Claude API</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model ID</label>
                    <input
                      type="text"
                      value={adminConfig.model}
                      onChange={(e) => setAdminConfig(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="e.g. gpt-3.5-turbo, gemini-1.5-flash"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2 flex justify-end">
                    <button
                      onClick={handleSaveAIConfig}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
                    >
                      <Save size={14} />
                      <span>Save Provider Config</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SLA Resolution Rules */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">SLA Resolution Rules</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Configure standard SLA hours allotted for ticket resolving by priority tier.</p>
                </div>

                <div className="space-y-4 pt-2 max-w-xl">
                  {slaList.map((rule, idx) => (
                    <div key={rule.id} className="p-4 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 w-24">{rule.priority}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <label className="text-[9px] text-slate-500 dark:text-slate-405 block mb-0.5">SLA Hours</label>
                          <input
                            type="number"
                            value={rule.resolutionTimeHours}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updatedList = [...slaList];
                              updatedList[idx].resolutionTimeHours = val;
                              setSlaList(updatedList);
                            }}
                            className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-2 text-center text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-500 dark:text-slate-405 block mb-0.5">Warning Hours</label>
                          <input
                            type="number"
                            value={rule.warningTimeHours}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updatedList = [...slaList];
                              updatedList[idx].warningTimeHours = val;
                              setSlaList(updatedList);
                            }}
                            className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-2 text-center text-xs text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <button
                          onClick={() => handleUpdateSla(rule.id, rule.priority, rule.resolutionTimeHours, rule.warningTimeHours)}
                          className="bg-sky-500 hover:bg-sky-400 text-white font-bold py-1 px-3 rounded-lg text-[10px] ml-2"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RAG Knowledge Base Management */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">RAG Knowledge Documents</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Upload and index document files into vector stores for chatbot knowledge support.</p>
                </div>

                <form onSubmit={handleUploadDocument} className="flex flex-col md:flex-row items-end gap-4 max-w-xl">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Index file (.txt, .pdf, .docx)</label>
                    <input
                      type="file"
                      onChange={(e) => setFileToUpload(e.target.files[0])}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={uploadingFile}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all shrink-0"
                  >
                    <Upload size={14} />
                    <span>{uploadingFile ? 'Uploading...' : 'Index Document'}</span>
                  </button>
                </form>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-w-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900/60 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-4">Document File Name</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/40">
                      {kbDocsList.length === 0 ? (
                        <tr>
                          <td colSpan="2" className="py-6 text-center text-slate-450 text-xs">No indexed document files found in vector stores.</td>
                        </tr>
                      ) : (
                        kbDocsList.map(doc => (
                          <tr key={doc} className="hover:bg-slate-100/20 dark:hover:bg-slate-900/20">
                            <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{doc}</td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteDocument(doc)}
                                className="text-rose-500 hover:text-rose-600 font-bold text-xs"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
