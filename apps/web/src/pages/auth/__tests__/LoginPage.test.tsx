import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { useAuthStore } from '../../../stores/authStore';

// Mock the auth store
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock React Router's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  const mockLogin = vi.fn();
  const mockClearError = vi.fn();

  const renderLoginPage = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      clearError: mockClearError,
      error: null,
      isLoading: false,
      user: null,
      isAuthenticated: false,
      register: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      initialize: vi.fn(),
    });
  });

  describe('rendering', () => {
    it('should render login form', () => {
      renderLoginPage();

      expect(screen.getByText('Welcome to Golden Palace')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your trading account')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render email input with correct attributes', () => {
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
    });

    it('should render password input with correct attributes', () => {
      renderLoginPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    });

    it('should render password visibility toggle button', () => {
      renderLoginPage();

      const toggleButton = screen.getByRole('button', { name: '' });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('type', 'button');
    });

    it('should render sign up link', () => {
      renderLoginPage();

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/register');
    });

    it('should render submit button with correct text', () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('password visibility toggle', () => {
    it('should toggle password visibility when clicking the toggle button', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const toggleButton = screen.getByRole('button', { name: '' });

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should show Eye icon when password is hidden', () => {
      renderLoginPage();

      const eyeIcon = document.querySelector('.lucide-eye');
      expect(eyeIcon).toBeInTheDocument();
    });

    it('should show EyeOff icon when password is visible', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const toggleButton = screen.getByRole('button', { name: '' });
      await user.click(toggleButton);

      const eyeOffIcon = document.querySelector('.lucide-eye-off');
      expect(eyeOffIcon).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should show email validation error for invalid email', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByText(/invalid/i);
        expect(errorElement).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should show email validation error for empty email', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });
    });

    it('should show password validation error for short password', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/string must contain at least 8 character/i)).toBeInTheDocument();
      });
    });

    it('should show password validation error for empty password', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/string must contain at least 8 character/i)).toBeInTheDocument();
      });
    });

    it('should not show validation errors for valid input', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/string must contain at least 8 character/i)).not.toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('should call login with correct credentials on form submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(true);
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalled();
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should navigate to dashboard on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(true);
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should not navigate on failed login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(false);
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should clear previous errors before submission', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(true);
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockClearError).toHaveBeenCalledBefore(mockLogin);
      });
    });

    it('should not submit form with invalid data', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Wait for validation errors to appear
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('should show loading text when login is in progress', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        clearError: mockClearError,
        error: null,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
      });

      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        clearError: mockClearError,
        error: null,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
      });

      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toBeDisabled();
    });

    it('should show normal state when not loading', () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message when login fails', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        clearError: mockClearError,
        error: 'Invalid credentials',
        isLoading: false,
        user: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
      });

      renderLoginPage();

      const errorMessage = screen.getByText('Invalid credentials');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-destructive');
    });

    it('should not display error message when no error', () => {
      renderLoginPage();

      expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
    });

    it('should display error in proper styling container', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        clearError: mockClearError,
        error: 'Network error',
        isLoading: false,
        user: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
      });

      renderLoginPage();

      const errorContainer = screen.getByText('Network error').closest('div');
      expect(errorContainer).toHaveClass('bg-destructive/10', 'border', 'border-destructive/20');
    });
  });

  describe('styling and layout', () => {
    it('should apply correct page layout styles', () => {
      renderLoginPage();

      const pageContainer = screen.getByText('Welcome to Golden Palace').closest('.min-h-screen');
      expect(pageContainer).toHaveClass(
        'min-h-screen',
        'flex',
        'items-center',
        'justify-center',
        'bg-background'
      );
    });

    it('should apply correct form container styles', () => {
      renderLoginPage();

      const formContainer = screen.getByText('Welcome to Golden Palace').closest('.max-w-md');
      expect(formContainer).toHaveClass('max-w-md', 'w-full', 'space-y-8');
    });

    it('should apply correct input styles', () => {
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      expect(emailInput).toHaveClass(
        'mt-1',
        'block',
        'w-full',
        'px-3',
        'py-2',
        'border',
        'border-input',
        'bg-background',
        'rounded-md'
      );
    });

    it('should apply correct button styles', () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveClass(
        'w-full',
        'flex',
        'justify-center',
        'py-2',
        'px-4',
        'text-primary-foreground',
        'bg-primary'
      );
    });

    it('should apply disabled styles when loading', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        login: mockLogin,
        clearError: mockClearError,
        error: null,
        isLoading: true,
        user: null,
        isAuthenticated: false,
        register: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
        initialize: vi.fn(),
      });

      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /signing in/i });
      expect(submitButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      expect(emailInput).toBeInTheDocument();
      expect(passwordInput).toBeInTheDocument();
    });

    it('should have proper button roles', () => {
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const toggleButton = screen.getByRole('button', { name: '' });

      expect(submitButton).toBeInTheDocument();
      expect(toggleButton).toBeInTheDocument();
    });

    it('should have proper link text and navigation', () => {
      renderLoginPage();

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toHaveAttribute('href', '/register');
    });

    it('should associate error messages with inputs', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/invalid email/i);
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('text-destructive');
      });
    });

    it('should provide proper focus management', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: '' })).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('form integration', () => {
    it('should integrate with react-hook-form properly', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should handle form reset properly', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });
  });

  describe('edge cases', () => {
    it('should handle rapid form submissions gracefully', async () => {
      const user = userEvent.setup();
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Click submit multiple times rapidly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only call login once due to form handling
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle special characters in password', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(true);
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'p@$$w0rd!123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'p@$$w0rd!123',
        });
      });
    });

    it('should handle internationalized email addresses', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(true);
      renderLoginPage();

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@münchen.de');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@münchen.de',
          password: 'password123',
        });
      });
    });
  });
});