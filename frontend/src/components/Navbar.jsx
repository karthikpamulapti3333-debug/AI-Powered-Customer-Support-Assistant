import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Shield, Sun, Moon } from 'lucide-react';
import { notificationService } from '../services/api';

export default function Navbar({ user, theme, toggleTheme }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchUnreadNotifications = async () => {
    try {
      const data = await notificationService.getUnreadNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();
      // Poll notifications every 30 seconds
      const interval = setInterval(fetchUnreadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      await notificationService.markRead(notif.id);
      setNotifications(notifications.filter(n => n.id !== notif.id));
      setShowDropdown(false);
      
      // Determine redirection path based on user role
      const roles = user.roles || [];
      if (roles.includes('ROLE_CUSTOMER')) {
        navigate(`/customer/complaints/${notif.complaintId}`);
      } else if (roles.includes('ROLE_AGENT')) {
        navigate(`/agent/complaints/${notif.complaintId}`);
      } else {
        navigate(`/manager/complaints/${notif.complaintId}`);
      }
    } catch (err) {
      console.error('Failed to process notification:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications([]);
      setShowDropdown(false);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getRoleLabel = () => {
    const roles = user?.roles || [];
    if (roles.includes('ROLE_ADMIN')) return 'Admin';
    if (roles.includes('ROLE_MANAGER')) return 'Manager';
    if (roles.includes('ROLE_AGENT')) return 'Agent';
    return 'Customer';
  };

  if (!user) return null;

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-40 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Welcome,</span>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{user.username}</span>
        <span className="flex items-center gap-1 text-[10px] bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-bold ml-2">
          <Shield size={10} />
          {getRoleLabel()}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
          title="Toggle Theme Mode"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-bounce">
                {notifications.length}
              </span>
            )}
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <span className="text-xs font-bold text-slate-200">Recent Alerts</span>
                {notifications.length > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Check size={10} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No unread notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className="w-full text-left p-4 hover:bg-slate-900/60 transition-all flex flex-col gap-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-slate-200 line-clamp-1">{notif.title}</span>
                        <span className="text-[9px] text-slate-500 shrink-0 font-medium">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
