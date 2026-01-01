import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceSettings,
  Card,
  CardWithUtilization,
  Transaction,
  DashboardStats,
  MonthlyBreakdown,
  RecentActivity,
  Invitation,
  ApiResponse,
  LoginCredentials,
  RegisterCredentials,
  OnboardingData,
  CardFormData,
  TransactionFormData,
  SettingsFormData,
  TransactionFilters,
} from '@/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
        if (response.data.data?.accessToken) {
          setAccessToken(response.data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear token and redirect to login
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================

export const authApi = {
  register: async (data: RegisterCredentials) => {
    const response = await api.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/register', data);
    if (response.data.data?.accessToken) {
      setAccessToken(response.data.data.accessToken);
    }
    return response.data;
  },

  login: async (data: LoginCredentials) => {
    const response = await api.post<ApiResponse<{ user: User; accessToken: string; workspace?: Workspace; workspaceMember?: WorkspaceMember }>>('/auth/login', data);
    if (response.data.data?.accessToken) {
      setAccessToken(response.data.data.accessToken);
    }
    return response.data;
  },

  logout: async () => {
    const response = await api.post<ApiResponse<void>>('/auth/logout');
    setAccessToken(null);
    return response.data;
  },

  refresh: async () => {
    const response = await api.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    if (response.data.data?.accessToken) {
      setAccessToken(response.data.data.accessToken);
    }
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get<ApiResponse<{ user: User; workspace?: Workspace; workspaceMember?: WorkspaceMember }>>('/auth/me');
    return response.data;
  },

  checkOnboarding: async () => {
    const response = await api.get<ApiResponse<{ needsOnboarding: boolean; user: User }>>('/auth/onboarding-status');
    return response.data;
  },

  googleAuth: () => {
    window.location.href = `${API_URL}/auth/google`;
  },

  appleAuth: () => {
    window.location.href = `${API_URL}/auth/apple`;
  },
};

// ============================================
// Workspace API
// ============================================

export const workspaceApi = {
  onboarding: async (data: OnboardingData) => {
    const response = await api.post<ApiResponse<{ workspace: Workspace; workspaceMember: WorkspaceMember; settings: WorkspaceSettings }>>('/workspaces/onboarding', data);
    return response.data;
  },

  getCurrent: async () => {
    const response = await api.get<ApiResponse<{ workspace: Workspace; members: WorkspaceMember[]; settings: WorkspaceSettings }>>('/workspaces/current');
    return response.data;
  },

  update: async (data: { name: string }) => {
    const response = await api.put<ApiResponse<Workspace>>('/workspaces/current', data);
    return response.data;
  },

  getMembers: async () => {
    const response = await api.get<ApiResponse<WorkspaceMember[]>>('/workspaces/members');
    return response.data;
  },

  inviteMember: async (email: string) => {
    const response = await api.post<ApiResponse<Invitation>>('/workspaces/invite', { email });
    return response.data;
  },

  cancelInvitation: async (invitationId: string) => {
    const response = await api.delete<ApiResponse<void>>(`/workspaces/invitations/${invitationId}`);
    return response.data;
  },

  acceptInvitation: async (token: string) => {
    const response = await api.post<ApiResponse<{ workspace: Workspace; workspaceMember: WorkspaceMember }>>('/workspaces/accept-invitation', { token });
    return response.data;
  },

  getInvitations: async () => {
    const response = await api.get<ApiResponse<Invitation[]>>('/workspaces/invitations');
    return response.data;
  },

  updateProfitSplit: async (memberId: string, profitSplitPercentage: number) => {
    const response = await api.put<ApiResponse<WorkspaceMember>>(`/workspaces/members/${memberId}/profit-split`, { profitSplitPercentage });
    return response.data;
  },

  removeMember: async (memberId: string) => {
    const response = await api.delete<ApiResponse<void>>(`/workspaces/members/${memberId}`);
    return response.data;
  },
};

// ============================================
// Cards API
// ============================================

export const cardsApi = {
  getAll: async () => {
    const response = await api.get<ApiResponse<Card[]>>('/cards');
    return response.data;
  },

  getAllWithUtilization: async () => {
    const response = await api.get<ApiResponse<CardWithUtilization[]>>('/cards/utilization');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Card>>(`/cards/${id}`);
    return response.data;
  },

  create: async (data: CardFormData) => {
    const response = await api.post<ApiResponse<Card>>('/cards', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CardFormData>) => {
    const response = await api.put<ApiResponse<Card>>(`/cards/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/cards/${id}`);
    return response.data;
  },

  getMonthlyUsage: async (id: string, month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const response = await api.get<ApiResponse<{ totalUsed: number; transactions: number }>>(`/cards/${id}/monthly-usage?${params}`);
    return response.data;
  },

  getHistory: async (id: string) => {
    const response = await api.get<ApiResponse<Transaction[]>>(`/cards/${id}/history`);
    return response.data;
  },
};

// ============================================
// Transactions API
// ============================================

export const transactionsApi = {
  getAll: async (filters?: TransactionFilters) => {
    const params = new URLSearchParams();
    if (filters?.cardId) params.append('cardId', filters.cardId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    const response = await api.get<ApiResponse<Transaction[]>>(`/transactions?${params}`);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get<ApiResponse<Transaction>>(`/transactions/${id}`);
    return response.data;
  },

  create: async (data: TransactionFormData) => {
    const response = await api.post<ApiResponse<Transaction>>('/transactions', data);
    return response.data;
  },

  update: async (id: string, data: Partial<TransactionFormData>) => {
    const response = await api.put<ApiResponse<Transaction>>(`/transactions/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<ApiResponse<void>>(`/transactions/${id}`);
    return response.data;
  },

  getMonthly: async (month: number, year: number) => {
    const response = await api.get<ApiResponse<Transaction[]>>(`/transactions/monthly?month=${month}&year=${year}`);
    return response.data;
  },

  exportCsv: async (filters?: TransactionFilters) => {
    const params = new URLSearchParams();
    if (filters?.cardId) params.append('cardId', filters.cardId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    const response = await api.get(`/transactions/export?${params}`, { responseType: 'blob' });
    return response.data;
  },
};

// ============================================
// Dashboard API
// ============================================

export const dashboardApi = {
  getStats: async () => {
    const response = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return response.data;
  },

  getMonthlyBreakdown: async (year?: number) => {
    const params = year ? `?year=${year}` : '';
    const response = await api.get<ApiResponse<MonthlyBreakdown[]>>(`/dashboard/monthly-breakdown${params}`);
    return response.data;
  },

  getRecentActivity: async (limit: number = 10) => {
    const response = await api.get<ApiResponse<RecentActivity[]>>(`/dashboard/recent-activity?limit=${limit}`);
    return response.data;
  },

  getTopCards: async (limit: number = 5) => {
    const response = await api.get<ApiResponse<{ cardId: string; cardName: string; cardColor: string; totalProfit: number; transactionCount: number }[]>>(`/dashboard/top-cards?limit=${limit}`);
    return response.data;
  },
};

// ============================================
// Settings API
// ============================================

export const settingsApi = {
  get: async () => {
    const response = await api.get<ApiResponse<WorkspaceSettings>>('/settings');
    return response.data;
  },

  update: async (data: Partial<SettingsFormData>) => {
    const response = await api.put<ApiResponse<WorkspaceSettings>>('/settings', data);
    return response.data;
  },

  updateRates: async (data: { defaultUsdToMvrRate?: number; defaultUsdtToMvrRate?: number }) => {
    const response = await api.put<ApiResponse<WorkspaceSettings>>('/settings/rates', data);
    return response.data;
  },
};

export default api;
