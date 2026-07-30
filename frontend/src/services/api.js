import axios from 'axios';

let rawApiUrl = import.meta.env.VITE_API_URL || '/api';
if (typeof rawApiUrl === 'string') {
  rawApiUrl = rawApiUrl.trim().replace(/\/+$/, '');
  if (rawApiUrl.startsWith('http') && !rawApiUrl.endsWith('/api')) {
    rawApiUrl += '/api';
  }
}
const API_URL = rawApiUrl;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Intercept 401 Unauthorized errors to auto-logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('JWT session expired or unauthorized. Logging out.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // If we are in the browser, redirect to login
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth Services ---
export const authService = {
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const token = res.data?.token || res.data?.accessToken;
    if (res.data) {
      if (token) localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(res.data));
    }
    return res.data;
  },
  register: async (signUpData) => {
    const res = await api.post('/auth/register', signUpData);
    return res.data;
  },
  me: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  updateProfile: async (profileData) => {
    const res = await api.put('/auth/profile/update', profileData);
    const currentUser = authService.getCurrentUser();
    if (currentUser && res.data) {
      const updated = {
        ...currentUser,
        email: res.data.email,
        firstName: res.data.firstName,
        lastName: res.data.lastName,
        phone: res.data.phone
      };
      localStorage.setItem('user', JSON.stringify(updated));
    }
    return res.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const res = await api.put('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token, newPassword) => {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

// --- Complaint Services ---
export const complaintService = {
  createComplaint: async (title, description) => {
    const res = await api.post('/complaints', { title, description });
    return res.data;
  },
  getComplaints: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const res = await api.get(`/complaints?${params.toString()}`);
    return res.data;
  },
  getComplaintById: async (id) => {
    const res = await api.get(`/complaints/${id}`);
    return res.data;
  },
  updateComplaintStatus: async (id, status) => {
    const res = await api.put(`/complaints/${id}/status?status=${status}`);
    return res.data;
  },
  addComment: async (id, commentText, isInternal = false) => {
    const res = await api.post(`/complaints/${id}/comments`, { commentText, isInternal });
    return res.data;
  },
  getComments: async (id) => {
    const res = await api.get(`/complaints/${id}/comments`);
    return res.data;
  },
  submitFeedback: async (id, rating, comments) => {
    const res = await api.post(`/complaints/${id}/feedback`, { rating, comments });
    return res.data;
  },
  assignComplaint: async (id, agentId) => {
    const res = await api.post(`/complaints/${id}/assign?agentId=${agentId}`);
    return res.data;
  },
  escalateComplaint: async (id, comments = '') => {
    const res = await api.post(`/complaints/${id}/escalate?comments=${comments}`);
    return res.data;
  }
};

// --- Analytics Services ---
export const analyticsService = {
  getSummary: async () => {
    const res = await api.get('/analytics/summary');
    return res.data;
  },
  getCategories: async () => {
    const res = await api.get('/analytics/categories');
    return res.data;
  },
  getSentiment: async () => {
    const res = await api.get('/analytics/sentiment');
    return res.data;
  },
  getPriority: async () => {
    const res = await api.get('/analytics/priority');
    return res.data;
  },
  getSla: async () => {
    const res = await api.get('/analytics/sla');
    return res.data;
  },
  getAgents: async () => {
    const res = await api.get('/analytics/agents');
    return res.data;
  },
  getTrends: async () => {
    const res = await api.get('/analytics/trends');
    return res.data;
  }
};

// --- Notifications Services ---
export const notificationService = {
  getNotifications: async () => {
    const res = await api.get('/notifications');
    return res.data;
  },
  getUnreadNotifications: async () => {
    const res = await api.get('/notifications/unread');
    return res.data;
  },
  markRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  }
};

// --- Admin Management Services ---
export const adminService = {
  getUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },
  getAgents: async () => {
    const res = await api.get('/admin/agents');
    return res.data;
  },
  getDepartments: async () => {
    const res = await api.get('/admin/departments');
    return res.data;
  },
  createDepartment: async (name, description) => {
    const res = await api.post('/admin/departments', { name, description });
    return res.data;
  },
  deleteDepartment: async (id) => {
    const res = await api.delete(`/admin/departments/${id}`);
    return res.data;
  },
  getCategories: async () => {
    const res = await api.get('/admin/categories');
    return res.data;
  },
  createCategory: async (name, displayName, description) => {
    const res = await api.post('/admin/categories', { name, displayName, description });
    return res.data;
  },
  deleteCategory: async (id) => {
    const res = await api.delete(`/admin/categories/${id}`);
    return res.data;
  },
  getSolutions: async () => {
    const res = await api.get('/admin/solutions');
    return res.data;
  },
  createSolution: async (solutionData) => {
    const res = await api.post('/admin/solutions', solutionData);
    return res.data;
  },
  updateSolution: async (id, solutionData) => {
    const res = await api.put(`/admin/solutions/${id}`, solutionData);
    return res.data;
  },
  deleteSolution: async (id) => {
    const res = await api.delete(`/admin/solutions/${id}`);
    return res.data;
  },
  getSlaRules: async () => {
    const res = await api.get('/admin/sla-rules');
    return res.data;
  },
  updateSlaRule: async (id, priority, resolutionTimeHours, warningTimeHours) => {
    const res = await api.put(`/admin/sla-rules/${id}`, { priority, resolutionTimeHours, warningTimeHours });
    return res.data;
  }
};

export default api;
