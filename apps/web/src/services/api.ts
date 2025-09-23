import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3002/api`;

console.log('[API Client] Initializing with:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_BASE_URL,
  hostname: window.location.hostname,
  protocol: window.location.protocol
});

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimited?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('accessToken');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log('[API Request]', {
      url,
      method: options.method || 'GET',
      hasToken: !!this.token,
      tokenPreview: this.token ? `${this.token.substring(0, 20)}...` : null
    });

    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options.headers,
    });

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    try {
      console.log('[API Headers]', Object.fromEntries(headers.entries()));

      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('[API Response]', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });

      if (response.status === 401) {
        // Don't automatically clear token - let user stay logged in
        // Token will only be cleared when user explicitly logs out
        // this.setToken(null); // Commented out to prevent automatic logout

        // Don't dispatch unauthorized event anymore since we're not auto-logging out
        // if (!endpoint.includes('/auth/logout')) {
        //   window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        // }

        return {
          success: false,
          error: 'Authentication required'
        } as ApiResponse<T>;
      }

      if (response.status === 429) {
        // Handle rate limiting with retry-after header
        const retryAfter = response.headers.get('Retry-After');
        return {
          success: false,
          error: `Rate limited. Please wait ${retryAfter || '60'} seconds before retrying.`,
          rateLimited: true
        } as ApiResponse<T>;
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP error! status: ${response.status}`,
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      ...(data && { body: JSON.stringify(data) }),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      ...(data && { body: JSON.stringify(data) }),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      ...(data && { body: JSON.stringify(data) }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Auth types
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    bio?: string;
    tradingExperience?: string;
    specialties?: string[];
    createdAt: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface User {
  id: string;
  email: string;
  username: string;
  bio?: string;
  tradingExperience?: string;
  specialties?: string[];
  createdAt: string;
}

// API service methods
export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  refreshToken: () =>
    apiClient.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken: localStorage.getItem('refreshToken')
    }),

  logout: () =>
    apiClient.post('/auth/logout'),

  getCurrentUser: () =>
    apiClient.get<User>('/auth/me'),
};

export const portfolioApi = {
  getPortfolios: () =>
    apiClient.get('/portfolio'),

  getPortfolio: (id: string) =>
    apiClient.get(`/portfolio/${id}`),

  createPortfolio: (data: any) =>
    apiClient.post('/portfolio', data),

  updatePortfolio: (id: string, data: any) =>
    apiClient.put(`/portfolio/${id}`, data),

  deletePortfolio: (id: string) =>
    apiClient.delete(`/portfolio/${id}`),
};

export const riskApi = {
  calculateRisk: (data: any) =>
    apiClient.post('/risk/calculate', data),

  getPositionRisks: (portfolioId: string) =>
    apiClient.get(`/risk/position-risks/${portfolioId}`),

  runStressTest: (data: any) =>
    apiClient.post('/risk/stress-test', data),

  runMonteCarloSimulation: (data: any) =>
    apiClient.post('/risk/monte-carlo', data),

  getLiquidityRisk: (portfolioId: string) =>
    apiClient.get(`/risk/liquidity/${portfolioId}`),

  generateRiskReport: (data: any) =>
    apiClient.post('/risk/report', data),
};

export const competitionApi = {
  // Competition CRUD
  getCompetitions: (params?: { groupId?: string; status?: string; type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.groupId) queryParams.append('groupId', params.groupId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    const query = queryParams.toString();
    return apiClient.get(`/competitions${query ? `?${query}` : ''}`);
  },

  getCompetition: (id: string) =>
    apiClient.get(`/competitions/${id}`),

  createCompetition: (data: any) =>
    apiClient.post('/competitions', data),

  updateCompetition: (id: string, data: any) =>
    apiClient.patch(`/competitions/${id}`, data),

  deleteCompetition: (id: string) =>
    apiClient.delete(`/competitions/${id}`),

  // Participation
  joinCompetition: (id: string, data?: { portfolioId?: string }) =>
    apiClient.post(`/competitions/${id}/join`, data),

  leaveCompetition: (id: string) =>
    apiClient.post(`/competitions/${id}/leave`),

  getMyCompetitions: (userId: string) =>
    apiClient.get(`/competitions/user/${userId}`),

  // Leaderboard & Rankings
  getLeaderboard: (id: string, params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    const query = queryParams.toString();
    return apiClient.get(`/competitions/${id}/leaderboard${query ? `?${query}` : ''}`);
  },

  getGlobalLeaderboard: (params?: { period?: string; metric?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.period) queryParams.append('period', params.period);
    if (params?.metric) queryParams.append('metric', params.metric);
    const query = queryParams.toString();
    return apiClient.get(`/competitions/leaderboard/global${query ? `?${query}` : ''}`);
  },

  getUserRank: (competitionId: string, userId: string) =>
    apiClient.get(`/competitions/${competitionId}/rank/${userId}`),

  // Statistics
  getUserStats: (userId: string) =>
    apiClient.get(`/competitions/stats/user/${userId}`),

  getCompetitionStats: (id: string) =>
    apiClient.get(`/competitions/${id}/stats`),

  // Entry management
  getCompetitionEntries: (id: string) =>
    apiClient.get(`/competitions/${id}/entries`),

  updateEntry: (competitionId: string, entryId: string, data: any) =>
    apiClient.patch(`/competitions/${competitionId}/entries/${entryId}`, data),
};

export type { ApiResponse };