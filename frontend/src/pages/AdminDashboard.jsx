import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, FolderTree, ShieldAlert, Lightbulb, Clock, Plus, Trash2, Edit3, Save, X, RefreshCw, FileText, Upload, AlertCircle
} from 'lucide-react';
import api, { adminService, authService } from '../services/api';

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (path) => {
    if (path.includes('/admin/departments') || path.includes('/admin/depts') || path.includes('/admin/categories')) {
      return 'depts';
    }
    if (path.includes('/admin/solutions')) {
      return 'solutions';
    }
    if (path.includes('/admin/settings')) {
      return 'sla';
    }
    if (path.includes('/admin/gaps')) {
      return 'gaps';
    }
    if (path.includes('/admin/audit-logs')) {
      return 'logs';
    }
    return 'users';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  // Tab State Collections
  const [usersList, setUsersList] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [deptsList, setDeptsList] = useState([]);
  const [catsList, setCatsList] = useState([]);
  const [solutionsList, setSolutionsList] = useState([]);
  const [slaList, setSlaList] = useState([]);
  const [kbDocsList, setKbDocsList] = useState([]);
  const [gapsList, setGapsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  
  // File Upload states
  const [fileToUpload, setFileToUpload] = useState(null);
  const [kbCategory, setKbCategory] = useState('GENERAL');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Create Form States
  const [newDept, setNewDept] = useState({ name: '', description: '' });
  const [newCat, setNewCat] = useState({ name: '', displayName: '', description: '' });
  const [newSol, setNewSol] = useState({ title: '', description: '', category: '', intent: '', rootCause: '', resolutionSteps: '' });
  const [editingSolId, setEditingSolId] = useState(null);
  
  // Registration Form in Admin Panel
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', firstName: '', lastName: '', role: 'AGENT', departmentId: '' });

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (activeTab === 'users') {
        const u = await adminService.getUsers();
        setUsersList(u);
        const a = await adminService.getAgents();
        setAgentsList(a);
        const d = await adminService.getDepartments();
        setDeptsList(d);
      } else if (activeTab === 'depts') {
        const d = await adminService.getDepartments();
        setDeptsList(d);
        const c = await adminService.getCategories();
        setCatsList(c);
      } else if (activeTab === 'solutions') {
        const s = await adminService.getSolutions();
        setSolutionsList(s);
        const c = await adminService.getCategories();
        setCatsList(c);
        
        // Load RAG documents
        const docs = await api.get('/knowledge/documents').then(r => r.data).catch(() => []);
        setKbDocsList(docs);
      } else if (activeTab === 'sla') {
        const s = await adminService.getSlaRules();
        setSlaList(s);
      } else if (activeTab === 'gaps') {
        const gaps = await api.get('/admin/knowledge-gaps').then(r => r.data).catch(() => []);
        setGapsList(gaps);
      } else if (activeTab === 'logs') {
        const logs = await api.get('/admin/audit-logs').then(r => r.data).catch(() => []);
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to pull administrative records from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  // Operations
  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminService.deleteUser(id);
      setSuccess('User account removed.');
      setUsersList(usersList.filter(u => u.id !== id));
      setAgentsList(agentsList.filter(a => a.user.id !== id));
    } catch (err) {
      setError('Failed to delete user.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const signUpData = {
        ...newUser,
        departmentId: newUser.role === 'AGENT' && newUser.departmentId ? Number(newUser.departmentId) : null
      };
      await authService.register(signUpData);
      setSuccess('Created user successfully.');
      setNewUser({ username: '', email: '', password: '', firstName: '', lastName: '', role: 'AGENT', departmentId: '' });
      loadTabData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register account.');
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await adminService.createDepartment(newDept.name, newDept.description);
      setSuccess('Department added.');
      setNewDept({ name: '', description: '' });
      loadTabData();
    } catch (err) {
      setError('Failed to add department.');
    }
  };

  const handleDeleteDept = async (id) => {
    try {
      await adminService.deleteDepartment(id);
      setSuccess('Department deleted.');
      loadTabData();
    } catch (err) {
      setError('Failed to delete department.');
    }
  };

  const handleCreateCat = async (e) => {
    e.preventDefault();
    try {
      await adminService.createCategory(newCat.name, newCat.displayName, newCat.description);
      setSuccess('Category added.');
      setNewCat({ name: '', displayName: '', description: '' });
      loadTabData();
    } catch (err) {
      setError('Failed to add category.');
    }
  };

  const handleDeleteCat = async (id) => {
    try {
      await adminService.deleteCategory(id);
      setSuccess('Category deleted.');
      loadTabData();
    } catch (err) {
      setError('Failed to delete category.');
    }
  };

  const handleCreateSolution = async (e) => {
    e.preventDefault();
    try {
      if (editingSolId) {
        await adminService.updateSolution(editingSolId, newSol);
        setSuccess('Recommended solution updated.');
      } else {
        await adminService.createSolution(newSol);
        setSuccess('Recommended solution created.');
      }
      setNewSol({ title: '', description: '', category: '', intent: '', rootCause: '', resolutionSteps: '' });
      setEditingSolId(null);
      loadTabData();
    } catch (err) {
      setError('Failed to save recommended solution.');
    }
  };

  const handleEditSolution = (sol) => {
    setNewSol({
      title: sol.title,
      description: sol.description || '',
      category: sol.category || '',
      intent: sol.intent || '',
      rootCause: sol.rootCause || '',
      resolutionSteps: sol.resolutionSteps || ''
    });
    setEditingSolId(sol.id);
  };

  const handleDeleteSolution = async (id) => {
    try {
      await adminService.deleteSolution(id);
      setSuccess('Solution deleted.');
      loadTabData();
    } catch (err) {
      setError('Failed to delete solution.');
    }
  };

  const handleUpdateSla = async (rule) => {
    try {
      await adminService.updateSlaRule(rule.id, rule.priority, rule.resolutionTimeHours, rule.warningTimeHours);
      setSuccess('SLA deadline configuration updated.');
    } catch (err) {
      setError('Failed to update SLA configuration.');
    }
  };

  const handleFileChange = (e) => {
    setFileToUpload(e.target.files[0]);
  };

  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!fileToUpload) return;
    setUploadingFile(true);
    setError('');
    setSuccess('');
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('category', kbCategory);
    try {
      const res = await api.post('/knowledge/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.status === 200 || res.status === 201) {
        setSuccess('Document successfully parsed, chunked, and RAG indexed.');
        setFileToUpload(null);
        e.target.reset();
        const docs = await api.get('/knowledge/documents').then(r => r.data).catch(() => []);
        setKbDocsList(docs);
      } else {
        setError('Failed to process and index document.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure during file upload.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (docId) => {
    if (!confirm('Are you sure you want to delete this document? All associated vector database search chunks will be permanently purged.')) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/knowledge/documents/${docId}`);
      setSuccess('Document purged from knowledge catalog.');
      setKbDocsList(kbDocsList.filter(d => d.id !== docId));
    } catch (err) {
      console.error(err);
      setError('Failed to delete document.');
    }
  };

  const handleResolveGap = async (gapId) => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/admin/knowledge-gaps/${gapId}/resolve`);
      setSuccess('Knowledge gap marked resolved.');
      setGapsList(gapsList.map(g => g.id === gapId ? { ...g, resolved: true } : g));
    } catch (err) {
      console.error(err);
      setError('Failed to resolve knowledge gap.');
    }
  };

  const handleReindexKb = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/knowledge/reindex');
      setSuccess('Full RAG database reindexing complete.');
    } catch (err) {
      console.error(err);
      setError('Reindexing failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Admin Console</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure user accounts, support departments, AI categorization taxonomy, and SLA timers.</p>
        </div>
        <button 
          onClick={loadTabData}
          className="p-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl transition-all active:scale-[0.98]"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
        <button
          onClick={() => navigate('/admin/users')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${
            activeTab === 'users' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users size={14} />
          <span>Users & Agents</span>
        </button>
        <button
          onClick={() => navigate('/admin/departments')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${
            activeTab === 'depts' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FolderTree size={14} />
          <span>Departments & Categories</span>
        </button>
        <button
          onClick={() => navigate('/admin/solutions')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${
            activeTab === 'solutions' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Lightbulb size={14} />
          <span>Knowledge Base</span>
        </button>
        <button
          onClick={() => navigate('/admin/gaps')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${
            activeTab === 'gaps' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert size={14} />
          <span>Knowledge Gaps</span>
        </button>
        <button
          onClick={() => navigate('/admin/settings')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${
            activeTab === 'sla' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Clock size={14} />
          <span>SLA Regulations</span>
        </button>
        <button
          onClick={() => navigate('/admin/audit-logs')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs uppercase tracking-wider border-b-2 transition-all shrink-0 ${
            activeTab === 'logs' ? 'border-sky-500 text-sky-600 dark:text-sky-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText size={14} />
          <span>System Audit Logs</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-2xl">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-2xl">
          {success}
        </div>
      )}

      {/* Tab Panels */}
      {loading ? (
        <div className="p-40 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <span className="w-8 h-8 border-3 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
          <span className="text-xs font-semibold">Loading data...</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* TAB: USERS */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Register Form */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                  <Plus size={16} />
                  <span>Register Users / Staff</span>
                </h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Username</label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Password</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/20"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">First Name</label>
                      <input
                        type="text"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Last Name</label>
                      <input
                        type="text"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                      >
                        <option value="AGENT">AGENT</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                      </select>
                    </div>
                    {newUser.role === 'AGENT' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Department</label>
                        <select
                          value={newUser.departmentId}
                          onChange={(e) => setNewUser({...newUser, departmentId: e.target.value})}
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                          required
                        >
                          <option value="">Select...</option>
                          {deptsList.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
                  >
                    Create User
                  </button>
                </form>
              </div>

              {/* Users Catalog */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-800 shadow-lg lg:col-span-2 space-y-4">
                <h3 className="font-bold text-slate-200 text-sm">Registered Accounts</h3>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/40 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-800">
                        <th className="py-2.5 px-4">User</th>
                        <th className="py-2.5 px-4">Email</th>
                        <th className="py-2.5 px-4">Roles</th>
                        <th className="py-2.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {usersList.map(u => (
                        <tr key={u.id} className="hover:bg-slate-800/20">
                          <td className="py-2.5 px-4 font-bold text-slate-200">
                            {u.username} <span className="text-[10px] text-slate-500 font-normal">({u.firstName} {u.lastName})</span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-400 font-mono">{u.email}</td>
                          <td className="py-2.5 px-4">
                            {u.roles.map(r => r.name.replace('ROLE_', '')).join(', ')}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {u.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-rose-400 hover:text-rose-300 transition-colors p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DEPTS & CATEGORIES */}
          {activeTab === 'depts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Departments CRUD */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Service Departments</h3>
                <form onSubmit={handleCreateDept} className="flex gap-2 bg-slate-100 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <input
                    type="text"
                    value={newDept.name}
                    onChange={(e) => setNewDept({...newDept, name: e.target.value})}
                    placeholder="Dept Name"
                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    value={newDept.description}
                    onChange={(e) => setNewDept({...newDept, description: e.target.value})}
                    placeholder="Description"
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                  />
                  <button type="submit" className="bg-sky-500 hover:bg-sky-400 p-2 rounded-xl text-white font-bold transition-all font-bold">
                    <Plus size={14} />
                  </button>
                </form>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                  {deptsList.map(d => (
                    <div key={d.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{d.name}</div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] mt-0.5">{d.description}</p>
                      </div>
                      {![1, 2, 3, 4, 5, 6].includes(d.id) && (
                        <button onClick={() => handleDeleteDept(d.id)} className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories CRUD */}
              <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Complaint Categories (AI targets)</h3>
                <form onSubmit={handleCreateCat} className="space-y-2 bg-slate-105 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCat.name}
                      onChange={(e) => setNewCat({...newCat, name: e.target.value})}
                      placeholder="Name (e.g. PAYMENT)"
                      className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                      required
                    />
                    <input
                      type="text"
                      value={newCat.displayName}
                      onChange={(e) => setNewCat({...newCat, displayName: e.target.value})}
                      placeholder="Display (e.g. Payments)"
                      className="flex-1 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCat.description}
                      onChange={(e) => setNewCat({...newCat, description: e.target.value})}
                      placeholder="Brief description"
                      className="flex-1 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                    />
                    <button type="submit" className="bg-sky-500 hover:bg-sky-400 p-2 rounded-xl text-white font-bold transition-all shrink-0">
                      <Plus size={14} />
                    </button>
                  </div>
                </form>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/40 text-slate-700 dark:text-slate-300">
                  {catsList.map(c => (
                    <div key={c.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.displayName} <span className="text-[10px] text-slate-500 font-mono">({c.name})</span></div>
                        <p className="text-slate-550 dark:text-slate-400 text-[10px] mt-0.5">{c.description}</p>
                      </div>
                      {![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(c.id) && (
                        <button onClick={() => handleDeleteCat(c.id)} className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: KNOWLEDGE BASE & SOLUTIONS */}
          {activeTab === 'solutions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side: Document Uploader & Manual Creator */}
              <div className="space-y-6">
                
                {/* RAG File Indexer */}
                <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm flex items-center gap-2">
                    <Upload size={16} className="text-indigo-400" />
                    <span>RAG Document Uploader</span>
                  </h3>
                  <form onSubmit={handleUploadFile} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Knowledge File (.pdf, .docx, .txt)</label>
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={handleFileChange}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-350 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Category Group</label>
                      <select
                        value={kbCategory}
                        onChange={(e) => setKbCategory(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                      >
                        <option value="GENERAL">GENERAL</option>
                        <option value="REFUND">REFUND & RETURN</option>
                        <option value="SHIPPING">SHIPPING & DELIVERY</option>
                        <option value="TECHNICAL">TECHNICAL MANUAL</option>
                        <option value="SECURITY">SECURITY SYSTEM</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={uploadingFile}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Upload size={14} />
                      <span>{uploadingFile ? 'Indexing...' : 'Upload & RAG Index'}</span>
                    </button>
                  </form>
                  
                  <button
                    onClick={handleReindexKb}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 border border-slate-200 dark:border-slate-750"
                  >
                    <RefreshCw size={12} />
                    <span>Full Sync Database Reindex</span>
                  </button>
                </div>

                {/* Manual Creator Form */}
                <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm flex items-center justify-between">
                    <span>{editingSolId ? 'Edit Manual Playbook' : 'Add Manual Playbook'}</span>
                    {editingSolId && (
                      <button 
                        onClick={() => {
                          setEditingSolId(null);
                          setNewSol({ title: '', description: '', category: '', intent: '', rootCause: '', resolutionSteps: '' });
                        }}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </h3>
                  <form onSubmit={handleCreateSolution} className="space-y-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-0.5">Title</label>
                      <input
                        type="text"
                        value={newSol.title}
                        onChange={(e) => setNewSol({...newSol, title: e.target.value})}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-0.5">Description</label>
                      <input
                        type="text"
                        value={newSol.description}
                        onChange={(e) => setNewSol({...newSol, description: e.target.value})}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-0.5">Category</label>
                        <select
                          value={newSol.category}
                          onChange={(e) => setNewSol({...newSol, category: e.target.value})}
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-1 text-[10px] text-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          <option value="">Select...</option>
                          {catsList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-0.5">Intent</label>
                        <input
                          type="text"
                          value={newSol.intent}
                          onChange={(e) => setNewSol({...newSol, intent: e.target.value})}
                          placeholder="ORDER_DELAY"
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-1 text-[10px] text-slate-900 dark:text-slate-200 placeholder-slate-450 dark:placeholder-slate-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-0.5">Root Cause</label>
                        <input
                          type="text"
                          value={newSol.rootCause}
                          onChange={(e) => setNewSol({...newSol, rootCause: e.target.value})}
                          placeholder="LOGISTICS_DELAY"
                          className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-1 text-[10px] text-slate-900 dark:text-slate-200 placeholder-slate-450 dark:placeholder-slate-600 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-0.5">Resolution Steps</label>
                      <textarea
                        value={newSol.resolutionSteps}
                        onChange={(e) => setNewSol({...newSol, resolutionSteps: e.target.value})}
                        rows={5}
                        className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-600 resize-none font-mono focus:outline-none"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 shadow-md active:scale-95"
                    >
                      <Save size={14} />
                      <span>{editingSolId ? 'Update Playbook' : 'Save Playbook'}</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Side: RAG Documents and Playbook Tables */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* RAG Documents Catalog */}
                <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Indexed Document Articles (RAG Sources)</h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl max-h-56">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900/40 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-850">
                          <th className="py-2.5 px-4">Filename</th>
                          <th className="py-2.5 px-4">Group</th>
                          <th className="py-2.5 px-4">Size</th>
                          <th className="py-2.5 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {kbDocsList.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-6 text-center text-slate-500 text-xs">No documents uploaded for RAG matching.</td>
                          </tr>
                        ) : (
                          kbDocsList.map(doc => (
                            <tr key={doc.id} className="hover:bg-slate-800/10">
                              <td className="py-2.5 px-4 font-bold text-slate-200">{doc.fileName}</td>
                              <td className="py-2.5 px-4 font-mono text-[10px] text-indigo-400 font-bold">{doc.category}</td>
                              <td className="py-2.5 px-4 text-slate-400">{Math.round(doc.fileSize / 1024)} KB</td>
                              <td className="py-2.5 px-4 text-center">
                                <button
                                  onClick={() => handleDeleteFile(doc.id)}
                                  className="text-rose-500 hover:text-rose-455 p-1 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Solution templates catalog */}
                <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Playbook Templates</h3>
                  <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2">
                    {solutionsList.length === 0 ? (
                      <div className="text-center py-6 text-slate-550 text-xs">No manual playbooks defined.</div>
                    ) : (
                      solutionsList.map(s => (
                        <div key={s.id} className="p-4 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex justify-between items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                          <div className="space-y-1">
                            <div className="font-bold text-xs text-slate-800 dark:text-slate-200">{s.title}</div>
                            <p className="text-[10px] text-slate-550 dark:text-slate-400">{s.description}</p>
                            <div className="flex gap-1.5 pt-1.5">
                              <span className="text-[8px] uppercase tracking-wide bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold">Cat: {s.category}</span>
                              <span className="text-[8px] uppercase tracking-wide bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold">Cause: {s.rootCause}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditSolution(s)} className="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-350">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeleteSolution(s.id)} className="text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-350">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KNOWLEDGE GAPS */}
          {activeTab === 'gaps' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4 max-w-4xl mx-auto">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                <ShieldAlert className="text-amber-500" />
                <span>NLP Knowledge Gaps</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                System records user queries that fell below the confidence score threshold, returned no document matching results, or were rated unhelpful.
              </p>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-850">
                      <th className="py-3 px-4">Recorded Query</th>
                      <th className="py-3 px-4">Trigger Reason</th>
                      <th className="py-3 px-4">Logged On</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {gapsList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-550 text-xs">No knowledge gaps detected in support sessions.</td>
                      </tr>
                    ) : (
                      gapsList.map(g => (
                        <tr key={g.id} className="hover:bg-slate-800/10">
                          <td className="py-3 px-4 text-slate-200 italic">"{g.queryText}"</td>
                          <td className="py-3 px-4 font-bold text-amber-500 font-mono text-[10px]">{g.reason}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(g.checkedAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              g.resolved ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {g.resolved ? 'Resolved' : 'Open gap'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {!g.resolved && (
                              <button
                                onClick={() => handleResolveGap(g.id)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-xl text-[10px] transition-all shadow-md"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SYSTEM AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                <FileText className="text-sky-500" />
                <span>System Transaction Audit Trail</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Chronological audit records of logins, category/SLA adjustments, file indexing, reassignments, and automated escalations.
              </p>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl max-h-[30rem]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/40 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-850">
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4">Action Type</th>
                      <th className="py-3 px-4">Affected Element</th>
                      <th className="py-3 px-4 font-bold">Operation Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-550 text-xs">No audit transactions found.</td>
                      </tr>
                    ) : (
                      auditLogs.map(l => (
                        <tr key={l.id} className="hover:bg-slate-800/10">
                          <td className="py-3 px-4 text-slate-450 font-mono">
                            {new Date(l.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-200">
                            {l.user ? l.user.username : 'SYSTEM'}
                          </td>
                          <td className="py-3 px-4 font-bold font-mono text-[10px] text-sky-400">
                            {l.action}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {l.targetType ? `${l.targetType} [ID: ${l.targetId || 'N/A'}]` : '--'}
                          </td>
                          <td className="py-3 px-4 text-slate-350 leading-relaxed max-w-md break-words">
                            {l.details}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SLA */}
          {activeTab === 'sla' && (
            <div className="glassmorphism p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-4 max-w-xl mx-auto">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">SLA Resolution Rules</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Configure the maximum duration allotted for resolving support tickets by priority tier.</p>
              
              <div className="space-y-4 pt-2">
                {slaList.map((rule, idx) => (
                  <div key={rule.id} className="p-4 bg-slate-105 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4">
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
                          className="w-16 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-2 text-center text-xs text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateSla(rule)}
                        className="bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500 hover:text-white p-2 rounded-xl border border-sky-500/20 transition-all font-bold mt-3"
                      >
                        <Save size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
