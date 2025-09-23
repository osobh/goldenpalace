import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, authApi, type User, type LoginRequest, type RegisterRequest } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
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
      isInitialized: false,
      error: null,

      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authApi.login(credentials);
          console.log('[AuthStore] Login response:', response);

          if (response.success && response.data) {
            const { user, tokens } = response.data;
            const { accessToken, refreshToken } = tokens || {};

            console.log('[AuthStore] Login successful, tokens:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
              accessTokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : null,
              refreshTokenPreview: refreshToken ? `${refreshToken.substring(0, 20)}...` : null
            });

            apiClient.setToken(accessToken);
            localStorage.setItem('refreshToken', refreshToken);

            console.log('[AuthStore] Tokens stored, localStorage check:', {
              accessToken: localStorage.getItem('accessToken'),
              refreshToken: localStorage.getItem('refreshToken')
            });

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
            const { user, tokens } = response.data;
            const { accessToken, refreshToken } = tokens || {};

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
            // Handle specific error cases for better user feedback
            let errorMessage = response.error || 'Registration failed';

            // Make 409 Conflict errors more user-friendly
            if (errorMessage.includes('already exists')) {
              errorMessage = errorMessage; // Keep the specific "Email already exists" or "Username already exists" message
            }

            set({
              error: errorMessage,
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
        // Clear local state first to prevent loops
        apiClient.setToken(null);
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('accessToken');

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        // Try to call logout endpoint, but don't let it trigger more events
        authApi.logout().catch(() => {
          // Silent fail for logout API call - we've already cleared local state
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
        console.log('[AuthStore] Initialize called');

        // Don't re-initialize if already done
        if (get().isInitialized) {
          console.log('[AuthStore] Already initialized, skipping');
          return;
        }

        set({ isLoading: true });

        const token = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        console.log('[AuthStore] Tokens from localStorage:', {
          hasAccessToken: !!token,
          hasRefreshToken: !!refreshToken,
          tokenPreview: token ? `${token.substring(0, 20)}...` : null
        });

        if (!token || !refreshToken) {
          console.log('[AuthStore] No tokens found, setting unauthenticated state');
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: null
          });
          return;
        }

        try {
          // Set the token first so API calls can use it
          apiClient.setToken(token);

          // Try to get current user with existing token
          console.log('[AuthStore] Fetching current user with token...');
          const userResponse = await authApi.getCurrentUser();
          console.log('[AuthStore] User response:', userResponse);

          if (userResponse.success && userResponse.data) {
            console.log('[AuthStore] Successfully got user:', userResponse.data);
            set({
              user: userResponse.data,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
            return;
          }

          // If user fetch fails due to token issues, try to refresh
          if (userResponse.error?.toLowerCase().includes('authentication') ||
              userResponse.error?.toLowerCase().includes('unauthorized')) {

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
                  isInitialized: true,
                  error: null,
                });
                return;
              }
            }
          }

          // If all fails, clear auth state
          get().logout();
        } catch (error) {
          console.error('Auth initialization failed:', error);
          get().logout();
        } finally {
          set({ isLoading: false, isInitialized: true });
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
// Load token synchronously first to prevent race conditions
const token = localStorage.getItem('accessToken');
if (token) {
  apiClient.setToken(token);
}

// Then do the async initialization
useAuthStore.getState().initialize();

// Automatic logout disabled - logout only happens when user explicitly clicks logout button
// To re-enable automatic logout, uncomment the code below:
/*
if (typeof window !== 'undefined') {
  let logoutTimeout: NodeJS.Timeout | null = null;

  window.addEventListener('auth:unauthorized', () => {
    const authStore = useAuthStore.getState();

    // Only trigger logout if user is currently authenticated
    if (!authStore.isAuthenticated) {
      return;
    }

    // Debounce logout calls to prevent rapid fire
    if (logoutTimeout) {
      clearTimeout(logoutTimeout);
    }

    logoutTimeout = setTimeout(() => {
      console.log('Received unauthorized event, logging out...');
      authStore.logout();
      logoutTimeout = null;
    }, 100); // 100ms debounce
  });
}
*/