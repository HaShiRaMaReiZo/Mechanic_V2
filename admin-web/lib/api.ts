import axios from 'axios';

// Use Next.js API routes (same origin)
const API_BASE_URL = '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface Service {
  maintId: number;
  maintenanceCode: string | null;
  mileage: number | null;
  actualMaintCost: number;
  dateImplemented: string;
  engineOilRefilled: number;
  engineOilCost: number | null;
  chainTightened: number;
  chainTightenedCost: number | null;
  chainSprocketChanged: number;
  chainSprocketChangedCost: number | null;
  otherMaintServices: string | null;
  otherMaintServicesCost: number | null;
  maintCurrentReport: string | null;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  personImplemented: number | null;
  imageUrl: string | null;
  mechanicName: string;
  mechanic: any | null;
}

export interface Payment {
  paymentId: number;
  userId: number;
  weekStartDate: string;
  weekEndDate: string;
  totalAmount: number;
  serviceCount: number;
  paymentStatus: 'pending' | 'paid';
  paidDate: string | null;
  paidBy: number | null;
  remarks: string | null;
  username: string;
  first_name: string | null;
  last_name: string | null;
}

export interface User {
  id: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  is_active: number;
}

export interface DashboardStats {
  pendingReviews: number;
  weekServices: number;
  weekTotal: number;
  allServices: number;
  allTotal: number;
  pendingPayments: number;
}

export interface ServicesResponse {
  services: Service[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentsResponse {
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login', { username, password });
    if (response.data.success && response.data.data.token) {
      if (typeof window !== 'undefined') {
        const token = response.data.data.token;
        // Store in localStorage for API calls
        localStorage.setItem('admin_token', token);
        // Store in cookie for middleware
        document.cookie = `admin_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }
    }
    return response.data;
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      // Remove cookie
      document.cookie = 'admin_token=; path=/; max-age=0';
    }
  },
  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('admin_token');
  },
};

// Admin API
export const adminAPI = {
  // Stats
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/admin/stats');
    return response.data.data;
  },

  // Services
  getServices: async (params?: {
    status?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ServicesResponse> => {
    const response = await apiClient.get('/admin/services', { params });
    return response.data.data;
  },

  getService: async (maintId: number): Promise<Service> => {
    const response = await apiClient.get(`/admin/services/${maintId}`);
    return response.data.data;
  },

  approveService: async (maintId: number) => {
    const response = await apiClient.post(`/admin/services/${maintId}/approve`);
    return response.data;
  },

  rejectService: async (maintId: number, reviewNotes?: string) => {
    const response = await apiClient.post(`/admin/services/${maintId}/reject`, { reviewNotes });
    return response.data;
  },

  updateService: async (maintId: number, data: Partial<Service>) => {
    const response = await apiClient.put(`/admin/services/${maintId}`, data);
    return response.data;
  },

  deleteService: async (maintId: number) => {
    const response = await apiClient.delete(`/admin/services/${maintId}`);
    return response.data;
  },

  // Weekly Summary
  getWeeklySummary: async (weekStartDate?: string, userId?: number) => {
    const response = await apiClient.get('/admin/weekly-summary', {
      params: { weekStartDate, userId },
    });
    return response.data.data;
  },

  // Payments
  getPayments: async (params?: {
    status?: string;
    userId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaymentsResponse> => {
    const response = await apiClient.get('/admin/payments', { params });
    return response.data.data;
  },

  updatePaymentStatus: async (paymentId: number, data: {
    paymentStatus: 'pending' | 'paid';
    paidDate?: string;
    remarks?: string;
  }) => {
    const response = await apiClient.put(`/admin/payments/${paymentId}/status`, data);
    return response.data;
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/admin/users');
    return response.data.data;
  },
};

export default apiClient;

