import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuthStore } from '../../../stores/authStore';

// Mock the auth store
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock React Router's Navigate component and useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: vi.fn(({ to, replace }) => <div data-testid="navigate" data-to={to} data-replace={replace} />),
    useNavigate: vi.fn(),
  };
});

describe('ProtectedRoute', () => {
  const mockNavigate = vi.fn();
  const mockChildren = <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  const renderProtectedRoute = () => {
    return render(
      <MemoryRouter>
        <ProtectedRoute>{mockChildren}</ProtectedRoute>
      </MemoryRouter>
    );
  };

  describe('loading state', () => {
    it('should show loading spinner when authentication is loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      // Should show loading container
      const loadingContainer = document.querySelector('.flex.items-center.justify-center.min-h-screen');
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer).toHaveClass('flex', 'items-center', 'justify-center', 'min-h-screen');

      // Should show loading spinner
      const spinner = loadingContainer.querySelector('.animate-spin');
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

    it('should not show protected content during loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should not navigate during loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
  });

  describe('unauthenticated state', () => {
    it('should redirect to login when not authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      const navigate = screen.getByTestId('navigate');
      expect(navigate).toBeInTheDocument();
      expect(navigate).toHaveAttribute('data-to', '/login');
      expect(navigate).toHaveAttribute('data-replace', 'true');
    });

    it('should not show protected content when not authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should not show loading spinner when not authenticated and not loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should use replace navigation to prevent back navigation issues', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      const navigate = screen.getByTestId('navigate');
      expect(navigate).toHaveAttribute('data-replace', 'true');
    });
  });

  describe('authenticated state', () => {
    it('should render children when authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should not show loading spinner when authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should not navigate when authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('should render fragment wrapper around children', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      // Should render children directly within the fragment
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle authenticated but loading state', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: true,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      // Loading state takes precedence
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle different children types', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      const multipleChildren = (
        <>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </>
      );

      render(
        <MemoryRouter>
          <ProtectedRoute>{multipleChildren}</ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });

    it('should handle null children', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>{null}</ProtectedRoute>
        </MemoryRouter>
      );

      // Should not crash and should not render anything
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle string children', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>Simple text content</ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Simple text content')).toBeInTheDocument();
    });
  });

  describe('loading spinner styling', () => {
    it('should apply correct container styles for loading state', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

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
        logout: vi.fn(),
      });

      renderProtectedRoute();

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

  describe('state transitions', () => {
    it('should handle transition from loading to authenticated', () => {
      const mockAuthStore = {
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      };

      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

      const { rerender } = renderProtectedRoute();

      // Initially loading
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Update to authenticated
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.isLoading = false;
      mockAuthStore.user = { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' };

      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

      rerender(
        <MemoryRouter>
          <ProtectedRoute>{mockChildren}</ProtectedRoute>
        </MemoryRouter>
      );

      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle transition from loading to unauthenticated', () => {
      const mockAuthStore = {
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      };

      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

      const { rerender } = renderProtectedRoute();

      // Initially loading
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Update to unauthenticated
      mockAuthStore.isLoading = false;

      vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);

      rerender(
        <MemoryRouter>
          <ProtectedRoute>{mockChildren}</ProtectedRoute>
        </MemoryRouter>
      );

      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should provide accessible loading state', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        login: vi.fn(),
        logout: vi.fn(),
      });

      renderProtectedRoute();

      // The loading container should be properly structured
      const container = document.querySelector('.flex.items-center.justify-center.min-h-screen');
      expect(container).toBeInTheDocument();

      // The spinner should be visible for screen readers
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not interfere with children accessibility when authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: '1', username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        logout: vi.fn(),
      });

      const accessibleChild = (
        <div role="main" aria-label="Main content">
          Accessible content
        </div>
      );

      render(
        <MemoryRouter>
          <ProtectedRoute>{accessibleChild}</ProtectedRoute>
        </MemoryRouter>
      );

      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();
      expect(mainContent).toHaveAttribute('aria-label', 'Main content');
    });
  });
});