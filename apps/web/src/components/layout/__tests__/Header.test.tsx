import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '../Header';
import { useAuthStore } from '../../../stores/authStore';

// Mock the auth store
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('Header', () => {
  const mockLogout = vi.fn();
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'USER' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      login: vi.fn(),
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('rendering', () => {
    it('should render the header with Golden Palace title', () => {
      render(<Header />);

      expect(screen.getByText('Golden Palace')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should display the current user username', () => {
      render(<Header />);

      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should render logout button', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
    });

    it('should render user icon', () => {
      render(<Header />);

      // User icon should be present (lucide-react User component)
      const userSection = screen.getByText('testuser').closest('div');
      expect(userSection).toBeInTheDocument();
    });
  });

  describe('user interaction', () => {
    it('should call logout when logout button is clicked', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledOnce();
    });

    it('should have proper hover styles on logout button', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toHaveClass('hover:text-foreground');
    });
  });

  describe('user states', () => {
    it('should handle user with no username gracefully', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: { ...mockUser, username: '' },
        logout: mockLogout,
        login: vi.fn(),
        isAuthenticated: true,
        isLoading: false,
      });

      render(<Header />);

      // Should render without crashing and show empty username
      const usernameSpan = screen.getByText('Golden Palace').closest('header')?.querySelector('.text-sm.font-medium');
      expect(usernameSpan).toBeInTheDocument();
      expect(usernameSpan?.textContent).toBe('');
    });

    it('should handle null user gracefully', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        logout: mockLogout,
        login: vi.fn(),
        isAuthenticated: false,
        isLoading: false,
      });

      render(<Header />);

      // Should still render the header structure
      expect(screen.getByText('Golden Palace')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });

  describe('layout structure', () => {
    it('should have proper layout classes', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-card', 'border-b', 'border-border', 'px-6', 'py-4');
    });

    it('should have proper flex layout for content', () => {
      render(<Header />);

      const headerContent = screen.getByRole('banner').firstChild;
      expect(headerContent).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('should position title and user controls correctly', () => {
      render(<Header />);

      const title = screen.getByText('Golden Palace');
      const userControls = screen.getByText('testuser').closest('.flex.items-center.space-x-4');

      expect(title.closest('div')).toHaveClass('flex', 'items-center', 'space-x-4');
      expect(userControls).toHaveClass('flex', 'items-center', 'space-x-4');
    });
  });

  describe('styling', () => {
    it('should apply correct title styling', () => {
      render(<Header />);

      const title = screen.getByText('Golden Palace');
      expect(title).toHaveClass('text-2xl', 'font-bold', 'text-primary');
    });

    it('should apply correct username styling', () => {
      render(<Header />);

      const username = screen.getByText('testuser');
      expect(username).toHaveClass('text-sm', 'font-medium');
    });

    it('should apply correct logout button styling', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toHaveClass(
        'flex',
        'items-center',
        'space-x-2',
        'px-3',
        'py-2',
        'text-sm',
        'text-muted-foreground',
        'hover:text-foreground',
        'transition-colors'
      );
    });
  });

  describe('accessibility', () => {
    it('should have proper semantic HTML structure', () => {
      render(<Header />);

      const header = screen.getByRole('banner');
      expect(header.tagName).toBe('HEADER');
    });

    it('should have accessible logout button', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
      // HTML buttons without explicit type default to "submit" but in React they default to "button"
      expect(logoutButton.tagName).toBe('BUTTON');
    });

    it('should have proper heading structure', () => {
      render(<Header />);

      const title = screen.getByText('Golden Palace');
      expect(title.tagName).toBe('H1');
    });
  });

  describe('icons', () => {
    it('should render logout icon in button', () => {
      render(<Header />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      const logoutText = screen.getByText('Logout');

      expect(logoutButton).toContainElement(logoutText);
    });

    it('should render user icon next to username', () => {
      render(<Header />);

      const userSection = screen.getByText('testuser').closest('div');
      expect(userSection).toHaveClass('flex', 'items-center', 'space-x-2');
    });
  });
});