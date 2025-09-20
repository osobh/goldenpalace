import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { useAuthStore } from '../stores/authStore';

// Mock all the page components
vi.mock('../pages/auth/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('../pages/auth/RegisterPage', () => ({
  RegisterPage: () => <div data-testid="register-page">Register Page</div>,
}));

vi.mock('../pages/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="dashboard-page">Dashboard Page</div>,
}));

vi.mock('../pages/TradingPage', () => ({
  TradingPage: () => <div data-testid="trading-page">Trading Page</div>,
}));

vi.mock('../pages/ChatPage', () => ({
  ChatPage: () => <div data-testid="chat-page">Chat Page</div>,
}));

vi.mock('../pages/CompetitionsPage', () => ({
  CompetitionsPage: () => <div data-testid="competitions-page">Competitions Page</div>,
}));

vi.mock('../pages/RiskAnalyticsPage', () => ({
  RiskAnalyticsPage: () => <div data-testid="risk-analytics-page">Risk Analytics Page</div>,
}));

vi.mock('../pages/ProfilePage', () => ({
  ProfilePage: () => <div data-testid="profile-page">Profile Page</div>,
}));

// Mock the layout component
vi.mock('../components/layout/Layout', () => ({
  Layout: () => <div data-testid="layout">Layout Component</div>,
}));

// Mock the protected route component
vi.mock('../components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="protected-route">{children}</div>
  ),
}));

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('App', () => {
  const renderApp = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading spinner when auth is loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      renderApp();

      // Should show loading container
      const loadingContainer = document.querySelector('.flex.items-center.justify-center.min-h-screen');
      expect(loadingContainer).toBeInTheDocument();

      // Should show loading spinner
      const spinner = loadingContainer?.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass(
        'animate-spin',
        'rounded-full',
        'h-32',
        'w-32',
        'border-b-2',
        'border-primary'
      );
    });

    it('should not render routes when loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      renderApp(['/login']);

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();
    });
  });

  describe('public routes when unauthenticated', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });
    });

    it('should render login page when not authenticated', () => {
      renderApp(['/login']);

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();
    });

    it('should render register page when not authenticated', () => {
      renderApp(['/register']);

      expect(screen.getByTestId('register-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();
    });
  });

  describe('public routes when authenticated', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });
    });

    it('should redirect to protected routes from login when authenticated', () => {
      renderApp(['/login']);

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });

    it('should redirect to protected routes from register when authenticated', () => {
      renderApp(['/register']);

      expect(screen.queryByTestId('register-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });
  });

  describe('protected routes when authenticated', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });
    });

    it('should render protected routes with layout when authenticated', () => {
      const protectedRoutes = ['/dashboard', '/trading', '/chat', '/competitions', '/risk', '/profile'];

      protectedRoutes.forEach(route => {
        const { unmount } = renderApp([route]);
        expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        expect(screen.getByTestId('layout')).toBeInTheDocument();
        unmount();
      });
    });

    it('should redirect root path to protected routes', () => {
      renderApp(['/']);

      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });

    it('should redirect unknown paths to protected routes', () => {
      renderApp(['/unknown-path']);

      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('layout')).toBeInTheDocument();
    });
  });

  describe('route structure', () => {
    beforeEach(() => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });
    });

    it('should wrap protected routes with ProtectedRoute component', () => {
      renderApp(['/dashboard']);

      const protectedRoute = screen.getByTestId('protected-route');
      const layout = screen.getByTestId('layout');

      expect(protectedRoute).toBeInTheDocument();
      expect(layout).toBeInTheDocument();
      expect(protectedRoute).toContainElement(layout);
    });
  });

  describe('authentication state transitions', () => {
    it('should handle transition from loading to authenticated', () => {
      // Start loading
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      const { rerender } = renderApp(['/dashboard']);

      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();

      // Simulate loading complete and authenticated
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );

      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });

    it('should handle transition from loading to unauthenticated', () => {
      // Start loading
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      const { rerender } = renderApp(['/dashboard']);

      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();

      // Simulate loading complete but not authenticated
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );

      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });

    it('should handle transition from unauthenticated to authenticated on public routes', () => {
      // Start unauthenticated
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      const { rerender } = renderApp(['/login']);

      expect(screen.getByTestId('login-page')).toBeInTheDocument();

      // Simulate authentication
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      rerender(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      );

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });
  });

  describe('loading spinner styling', () => {
    it('should apply correct loading container styles', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      renderApp();

      const container = document.querySelector('.flex.items-center.justify-center.min-h-screen');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass(
        'flex',
        'items-center',
        'justify-center',
        'min-h-screen'
      );
    });

    it('should apply correct spinner styles', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      renderApp();

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toHaveClass(
        'animate-spin',
        'rounded-full',
        'h-32',
        'w-32',
        'border-b-2',
        'border-primary'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle all authentication states correctly', () => {
      const states = [
        { isAuthenticated: false, isLoading: false },
        { isAuthenticated: true, isLoading: false },
        { isAuthenticated: false, isLoading: true },
        { isAuthenticated: true, isLoading: true }, // edge case
      ];

      states.forEach(state => {
        vi.mocked(useAuthStore).mockReturnValue({
          ...state,
          user: state.isAuthenticated ? { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() } : null,
          login: vi.fn(),
          register: vi.fn(),
          logout: vi.fn(),
          clearError: vi.fn(),
          refreshUser: vi.fn(),
          initialize: vi.fn(),
          error: null,
        });

        const { unmount } = renderApp(['/dashboard']);

        if (state.isLoading) {
          expect(document.querySelector('.animate-spin')).toBeInTheDocument();
        } else {
          expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        }

        unmount();
      });
    });

    it('should handle navigation to non-existent routes when authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      const nonExistentRoutes = ['/invalid', '/foo/bar', '/dashboard/invalid'];

      nonExistentRoutes.forEach(route => {
        const { unmount } = renderApp([route]);
        expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('accessibility', () => {
    it('should provide accessible loading state', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      renderApp();

      const container = document.querySelector('.flex.items-center.justify-center.min-h-screen');
      expect(container).toBeInTheDocument();

      const spinner = container?.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render semantic structure when not loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      renderApp(['/dashboard']);

      expect(screen.getByTestId('layout')).toBeInTheDocument();
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    });

    it('should handle unauthenticated public route access', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      renderApp(['/login']);

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  describe('component integration', () => {
    it('should properly integrate with ProtectedRoute component', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      renderApp(['/dashboard']);

      const protectedRoute = screen.getByTestId('protected-route');
      const layout = screen.getByTestId('layout');

      expect(protectedRoute).toBeInTheDocument();
      expect(layout).toBeInTheDocument();
      expect(protectedRoute).toContainElement(layout);
    });

    it('should use MemoryRouter for routing in tests', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
        error: null,
      });

      expect(() => renderApp(['/login'])).not.toThrow();
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });
});