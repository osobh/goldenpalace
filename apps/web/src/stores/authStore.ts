import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, authApi, type User, type LoginRequest, type RegisterRequest } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (userData: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login(credentials);

          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;

            apiClient.setToken(accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          } else {
            set({
              error: response.error || 'Login failed',
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          return false;
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.register(userData);

          if (response.success && response.data) {
            const { user, accessToken, refreshToken } = response.data;

            apiClient.setToken(accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return true;
          } else {
            set({
              error: response.error || 'Registration failed',
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        authApi.logout().catch(() => {
          // Silent fail for logout API call
        });

        apiClient.setToken(null);
        localStorage.removeItem('refreshToken');

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      refreshUser: async () => {
        try {
          const response = await authApi.getCurrentUser();

          if (response.success && response.data) {
            set({ user: response.data });
          }
        } catch (error) {
          console.error('Failed to refresh user:', error);
        }
      },

      initialize: async () => {
        set({ isLoading: true });

        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (!token || !refreshToken) {
          set({ isLoading: false });
          return;
        }

        try {
          // Try to get current user with existing token
          const userResponse = await authApi.getCurrentUser();

          if (userResponse.success && userResponse.data) {
            set({
              user: userResponse.data,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }

          // If that fails, try to refresh the token
          const refreshResponse = await authApi.refreshToken();

          if (refreshResponse.success && refreshResponse.data) {
            apiClient.setToken(refreshResponse.data.accessToken);

            // Try getting user again with new token
            const newUserResponse = await authApi.getCurrentUser();

            if (newUserResponse.success && newUserResponse.data) {
              set({
                user: newUserResponse.data,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }

          // If all fails, clear auth state
          get().logout();
        } catch (error) {
          console.error('Auth initialization failed:', error);
          get().logout();
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth on app start
useAuthStore.getState().initialize();