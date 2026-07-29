import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  PlusCircle, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  FolderTree, 
  ShieldAlert, 
  Clock, 
  Lightbulb,
  Bell,
  MessageSquare
} from 'lucide-react';
import { authService } from '../services/api';

export default function Sidebar({ user }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (!user) return null;

  const roles = user.roles || [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isManager = roles.includes('ROLE_MANAGER');
  const isAgent = roles.includes('ROLE_AGENT');
  const isCustomer = roles.includes('ROLE_CUSTOMER');

  const links = [];

  // CUSTOMER LINKS
  if (isCustomer) {
    links.push(
      { to: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/customer/chat', label: 'AI Chatbot Assist', icon: MessageSquare },
      { to: '/customer/complaints', label: 'My Complaints', icon: FileText },
      { to: '/customer/complaints/new', label: 'New Complaint', icon: PlusCircle },
      { to: '/settings', label: 'Settings', icon: Settings }
    );
  }

  // AGENT LINKS
  if (isAgent) {
    links.push(
      { to: '/agent/dashboard', label: 'Agent Console', icon: LayoutDashboard },
      { to: '/agent/complaints', label: 'My Assigned', icon: FileText },
      { to: '/settings', label: 'Settings', icon: Settings }
    );
  }

  // MANAGER LINKS
  if (isManager) {
    links.push(
      { to: '/manager/dashboard', label: 'Management Console', icon: LayoutDashboard },
      { to: '/manager/complaints', label: 'All Complaints', icon: FileText },
      { to: '/manager/analytics', label: 'AI Analytics', icon: BarChart3 },
      { to: '/settings', label: 'Settings', icon: Settings }
    );
  }

  // ADMIN LINKS
  if (isAdmin) {
    links.push(
      { to: '/admin/dashboard', label: 'Admin Panel', icon: LayoutDashboard },
      { to: '/admin/users', label: 'Users Management', icon: Users },
      { to: '/admin/departments', label: 'Departments', icon: FolderTree },
      { to: '/admin/categories', label: 'Categories', icon: ShieldAlert },
      { to: '/admin/solutions', label: 'Knowledge Base', icon: Lightbulb },
      { to: '/admin/gaps', label: 'Knowledge Gaps', icon: ShieldAlert },
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/admin/audit-logs', label: 'System Audit Logs', icon: FileText }
    );
  }

  return (
    <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-colors">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-sky-500/20">
          R
        </div>
        <div>
          <h1 className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:to-slate-400 dark:bg-clip-text leading-tight">
            AI-Powered Customer Support Assistant
          </h1>
          <span className="text-[9px] text-sky-500 dark:text-sky-400 uppercase tracking-widest font-semibold block mt-0.5">Support Triage</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 px-3 mb-2 tracking-wider">Navigation</div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-md font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-sky-500 dark:text-sky-400' : 'text-slate-400'} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="truncate flex-1">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user.username}</div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 border border-transparent hover:border-rose-500/20 transition-all duration-200"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
