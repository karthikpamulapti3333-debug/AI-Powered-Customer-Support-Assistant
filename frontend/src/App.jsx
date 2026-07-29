import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import UniversalAIChatbot from './components/UniversalAIChatbot';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import CustomerDashboard from './pages/CustomerDashboard';
import NewComplaint from './pages/NewComplaint';
import AgentDashboard from './pages/AgentDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ComplaintDetails from './pages/ComplaintDetails';
import CustomerChat from './pages/CustomerChat';
import { authService } from './services/api';

// Route Guard component
function ProtectedRoute({ children, allowedRoles }) {
  const user = authService.getCurrentUser();
  const location = useLocation();

  if (!user || !localStorage.getItem('token')) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roles = user.roles || [];
  const hasRole = allowedRoles.some(role => roles.includes(role));

  if (!hasRole) {
    // If authenticated but unauthorized role, redirect to appropriate default dashboard
    if (roles.includes('ROLE_ADMIN')) return <Navigate to="/admin/dashboard" replace />;
    if (roles.includes('ROLE_MANAGER')) return <Navigate to="/manager/dashboard" replace />;
    if (roles.includes('ROLE_AGENT')) return <Navigate to="/agent/dashboard" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }

  return children;
}

// Layout wrapper to inject sidebar/navbar dynamically
function LayoutWrapper({ user, theme, toggleTheme, children }) {
  const location = useLocation();
  const noLayoutPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
  const hideLayout = noLayoutPaths.includes(location.pathname);

  if (hideLayout) return children;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar user={user} theme={theme} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar user={user} theme={theme} toggleTheme={toggleTheme} />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <UniversalAIChatbot />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <span className="w-9 h-9 border-3 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
        <span className="text-xs font-semibold uppercase tracking-wider">ResolveAI booting...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <LayoutWrapper user={user} theme={theme} toggleTheme={toggleTheme}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Settings Shared Route */}
          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_AGENT', 'ROLE_CUSTOMER']}>
              <Settings user={user} setUser={setUser} theme={theme} toggleTheme={toggleTheme} />
            </ProtectedRoute>
          } />

          {/* CUSTOMER Protected Routes */}
          <Route path="/customer/dashboard" element={
            <ProtectedRoute allowedRoles={['ROLE_CUSTOMER']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/customer/complaints" element={
            <ProtectedRoute allowedRoles={['ROLE_CUSTOMER']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/customer/complaints/new" element={
            <ProtectedRoute allowedRoles={['ROLE_CUSTOMER']}>
              <NewComplaint />
            </ProtectedRoute>
          } />
          <Route path="/customer/complaints/:id" element={
            <ProtectedRoute allowedRoles={['ROLE_CUSTOMER']}>
              <ComplaintDetails />
            </ProtectedRoute>
          } />
          <Route path="/customer/chat" element={
            <ProtectedRoute allowedRoles={['ROLE_CUSTOMER']}>
              <CustomerChat />
            </ProtectedRoute>
          } />

          {/* AGENT Protected Routes */}
          <Route path="/agent/dashboard" element={
            <ProtectedRoute allowedRoles={['ROLE_AGENT']}>
              <AgentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/agent/complaints" element={
            <ProtectedRoute allowedRoles={['ROLE_AGENT']}>
              <AgentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/agent/complaints/:id" element={
            <ProtectedRoute allowedRoles={['ROLE_AGENT']}>
              <ComplaintDetails />
            </ProtectedRoute>
          } />

          {/* MANAGER Protected Routes */}
          <Route path="/manager/dashboard" element={
            <ProtectedRoute allowedRoles={['ROLE_MANAGER']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/manager/complaints" element={
            <ProtectedRoute allowedRoles={['ROLE_MANAGER']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/manager/analytics" element={
            <ProtectedRoute allowedRoles={['ROLE_MANAGER']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/manager/complaints/:id" element={
            <ProtectedRoute allowedRoles={['ROLE_MANAGER']}>
              <ComplaintDetails />
            </ProtectedRoute>
          } />

          {/* ADMIN Protected Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/agents" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/departments" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/categories" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/solutions" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/gaps" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/audit-logs" element={
            <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Wildcard redirects */}
          <Route path="*" element={
            user ? (
              user.roles.includes('ROLE_ADMIN') ? <Navigate to="/admin/dashboard" replace /> :
              user.roles.includes('ROLE_MANAGER') ? <Navigate to="/manager/dashboard" replace /> :
              user.roles.includes('ROLE_AGENT') ? <Navigate to="/agent/dashboard" replace /> :
              <Navigate to="/customer/dashboard" replace />
            ) : <Navigate to="/login" replace />
          } />
        </Routes>
      </LayoutWrapper>
    </BrowserRouter>
  );
}
