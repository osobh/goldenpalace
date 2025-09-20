import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../authStore';
import { authApi, apiClient } from '../../services/api';

// Mock the API modules
vi.mock('../../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    refreshToken: vi.fn(),
  },
  apiClient: {
    setToken: vi.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should have all required actions', () => {
      const state = useAuthStore.getState();

      expect(typeof state.login).toBe('function');
      expect(typeof state.register).toBe('function');
      expect(typeof state.logout).toBe('function');
      expect(typeof state.clearError).toBe('function');
      expect(typeof state.refreshUser).toBe('function');
      expect(typeof state.initialize).toBe('function');
    });
  });

  describe('login', () => {
    it('should handle successful login', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password123' };
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };
      const mockResponse = {
        success: true,
        data: {
          user: mockUser,
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
        },
      };

      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const result = await useAuthStore.getState().login(mockCredentials);
      const state = useAuthStore.getState();

      expect(result).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(apiClient.setToken).toHaveBeenCalledWith('access-token-123');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-123');
    });

    it('should handle login failure with error message', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'wrongpassword' };
      const mockResponse = {
        success: false,
        error: 'Invalid credentials',
      };

      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const result = await useAuthStore.getState().login(mockCredentials);
      const state = useAuthStore.getState();

      expect(result).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('should handle login failure without error message', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'wrongpassword' };
      const mockResponse = {
        success: false,
      };

      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      const result = await useAuthStore.getState().login(mockCredentials);
      const state = useAuthStore.getState();

      expect(result).toBe(false);
      expect(state.error).toBe('Login failed');
    });

    it('should handle login exception', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password123' };
      const mockError = new Error('Network error');

      vi.mocked(authApi.login).mockRejectedValue(mockError);

      const result = await useAuthStore.getState().login(mockCredentials);
      const state = useAuthStore.getState();

      expect(result).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });

    it('should handle non-Error exception', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password123' };

      vi.mocked(authApi.login).mockRejectedValue('String error');

      const result = await useAuthStore.getState().login(mockCredentials);
      const state = useAuthStore.getState();

      expect(result).toBe(false);
      expect(state.error).toBe('Login failed');
    });

    it('should set loading state during login', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password123' };
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      vi.mocked(authApi.login).mockReturnValue(loginPromise);

      const loginCall = useAuthStore.getState().login(mockCredentials);

      // Check loading state is set
      expect(useAuthStore.getState().isLoading).toBe(true);
      expect(useAuthStore.getState().error).toBeNull();

      // Resolve the promise
      resolveLogin!({
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' },
          accessToken: 'token',
          refreshToken: 'refresh',
        },
      });

      await loginCall;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('should handle successful registration', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };
      const mockResponse = {
        success: true,
        data: {
          user: mockUser,
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
        },
      };

      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const result = await useAuthStore.getState().register(mockUserData);
      const state = useAuthStore.getState();

      expect(result).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(apiClient.setToken).toHaveBeenCalledWith('access-token-123');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refreshToken', 'refresh-token-123');
    });

    it('should handle registration failure with error message', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'weak',
        username: 'testuser'
      };
      const mockResponse = {
        success: false,
        error: 'Password too weak',
      };

      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const result = await useAuthStore.getState().register(mockUserData);
      const state = useAuthStore.getState();

      expect(result).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Password too weak');
    });

    it('should handle registration failure without error message', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };
      const mockResponse = {
        success: false,
      };

      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      const result = await useAuthStore.getState().register(mockUserData);
      const state = useAuthStore.getState();

      expect(result).toBe(false);
      expect(state.error).toBe('Registration failed');
    });

    it('should handle registration exception', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };
      const mockError = new Error('Server error');

      vi.mocked(authApi.register).mockRejectedValue(mockError);

      const result = await useAuthStore.getState().register(mockUserData);
      const state = useAuthStore.getState();

      expect(result).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Server error');
    });

    it('should handle non-Error exception during registration', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };

      vi.mocked(authApi.register).mockRejectedValue('Unknown error');

      const result = await useAuthStore.getState().register(mockUserData);
      const state = useAuthStore.getState();

      expect(result).toBe(false);
      expect(state.error).toBe('Registration failed');
    });

    it('should set loading state during registration', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser'
      };
      let resolveRegister: (value: any) => void;
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve;
      });

      vi.mocked(authApi.register).mockReturnValue(registerPromise);

      const registerCall = useAuthStore.getState().register(mockUserData);

      // Check loading state is set
      expect(useAuthStore.getState().isLoading).toBe(true);
      expect(useAuthStore.getState().error).toBeNull();

      // Resolve the promise
      resolveRegister!({
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' },
          accessToken: 'token',
          refreshToken: 'refresh',
        },
      });

      await registerCall;
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear auth state on logout', () => {
      // Set authenticated state first
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      vi.mocked(authApi.logout).mockResolvedValue({});

      useAuthStore.getState().logout();
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(apiClient.setToken).toHaveBeenCalledWith(null);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should handle logout API failure silently', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      vi.mocked(authApi.logout).mockRejectedValue(new Error('Logout API failed'));

      expect(() => useAuthStore.getState().logout()).not.toThrow();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      useAuthStore.getState().clearError();
      const state = useAuthStore.getState();

      expect(state.error).toBeNull();
    });

    it('should not affect other state properties', () => {
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: 'Some error',
      });

      useAuthStore.getState().clearError();
      const state = useAuthStore.getState();

      expect(state.error).toBeNull();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('refreshUser', () => {
    it('should update user data on successful refresh', async () => {
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };
      const mockResponse = {
        success: true,
        data: mockUser,
      };

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockResponse);

      await useAuthStore.getState().refreshUser();
      const state = useAuthStore.getState();

      expect(state.user).toEqual(mockUser);
      expect(authApi.getCurrentUser).toHaveBeenCalled();
    });

    it('should not update user data on failed refresh', async () => {
      const originalUser = { id: '1', email: 'old@example.com', username: 'olduser', role: 'USER' };
      useAuthStore.setState({ user: originalUser });

      const mockResponse = {
        success: false,
        error: 'User not found',
      };

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockResponse);

      await useAuthStore.getState().refreshUser();
      const state = useAuthStore.getState();

      expect(state.user).toEqual(originalUser);
    });

    it('should handle refresh exception silently', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalUser = { id: '1', email: 'old@example.com', username: 'olduser', role: 'USER' };
      useAuthStore.setState({ user: originalUser });

      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Network error'));

      await expect(useAuthStore.getState().refreshUser()).resolves.not.toThrow();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(originalUser);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh user:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('initialize', () => {
    it('should set loading false when no tokens exist', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();

      expect(state.isLoading).toBe(false);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('accessToken');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should authenticate user with valid existing token', async () => {
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };
      mockLocalStorage.getItem
        .mockReturnValueOnce('existing-access-token')
        .mockReturnValueOnce('existing-refresh-token');

      vi.mocked(authApi.getCurrentUser).mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('should refresh token and authenticate when current user fails but refresh succeeds', async () => {
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };
      mockLocalStorage.getItem
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('valid-refresh-token');

      vi.mocked(authApi.getCurrentUser)
        .mockResolvedValueOnce({ success: false, error: 'Token expired' })
        .mockResolvedValueOnce({ success: true, data: mockUser });

      vi.mocked(authApi.refreshToken).mockResolvedValue({
        success: true,
        data: { accessToken: 'new-access-token' },
      });

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(apiClient.setToken).toHaveBeenCalledWith('new-access-token');
    });

    it('should logout when refresh token fails', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('invalid-refresh-token');

      vi.mocked(authApi.getCurrentUser).mockResolvedValue({
        success: false,
        error: 'Token expired',
      });

      vi.mocked(authApi.refreshToken).mockResolvedValue({
        success: false,
        error: 'Invalid refresh token',
      });

      vi.mocked(authApi.logout).mockResolvedValue({});

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(apiClient.setToken).toHaveBeenCalledWith(null);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refreshToken');
    });

    it('should logout when user fetch fails after successful token refresh', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('expired-access-token')
        .mockReturnValueOnce('valid-refresh-token');

      vi.mocked(authApi.getCurrentUser)
        .mockResolvedValueOnce({ success: false, error: 'Token expired' })
        .mockResolvedValueOnce({ success: false, error: 'User not found' });

      vi.mocked(authApi.refreshToken).mockResolvedValue({
        success: true,
        data: { accessToken: 'new-access-token' },
      });

      vi.mocked(authApi.logout).mockResolvedValue({});

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('should handle initialization exception', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLocalStorage.getItem
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Network error'));
      vi.mocked(authApi.logout).mockResolvedValue({});

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Auth initialization failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should ensure loading is false even if exception occurs', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLocalStorage.getItem
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Network error'));
      vi.mocked(authApi.logout).mockRejectedValue(new Error('Logout error'));

      await useAuthStore.getState().initialize();
      const state = useAuthStore.getState();

      expect(state.isLoading).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('persistence', () => {
    it('should persist user and isAuthenticated state', () => {
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: 'Some error',
      });

      // Test the partialize function
      const persistedState = (useAuthStore as any).persist.getOptions().partialize(useAuthStore.getState());

      expect(persistedState).toEqual({
        user: mockUser,
        isAuthenticated: true,
      });
      expect(persistedState.isLoading).toBeUndefined();
      expect(persistedState.error).toBeUndefined();
    });
  });

  describe('state transitions', () => {
    it('should transition from unauthenticated to authenticated during login', async () => {
      const mockCredentials = { email: 'test@example.com', password: 'password123' };
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };

      // Start unauthenticated
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      vi.mocked(authApi.login).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          accessToken: 'token',
          refreshToken: 'refresh',
        },
      });

      await useAuthStore.getState().login(mockCredentials);
      const state = useAuthStore.getState();

      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should transition from authenticated to unauthenticated during logout', () => {
      const mockUser = { id: '1', email: 'test@example.com', username: 'testuser', role: 'USER' };

      // Start authenticated
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      vi.mocked(authApi.logout).mockResolvedValue({});

      useAuthStore.getState().logout();
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});