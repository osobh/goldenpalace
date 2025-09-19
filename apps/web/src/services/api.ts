import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
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

    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options.headers,
    });

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        this.setToken(null);
        window.location.href = '/login';
        throw new Error('Unauthorized');
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
  accessToken: string;
  refreshToken: string;
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
    apiClient.post<{ accessToken: string }>('/auth/refresh'),

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
  getCompetitions: () =>
    apiClient.get('/competition'),

  getCompetition: (id: string) =>
    apiClient.get(`/competition/${id}`),

  createCompetition: (data: any) =>
    apiClient.post('/competition', data),

  joinCompetition: (id: string) =>
    apiClient.post(`/competition/${id}/join`),

  getLeaderboard: (id: string) =>
    apiClient.get(`/competition/${id}/leaderboard`),
};