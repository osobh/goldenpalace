import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Navigation } from '../Navigation';

describe('Navigation', () => {
  const renderNavigation = (initialEntries = ['/']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <Navigation />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render navigation container', () => {
      renderNavigation();

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('w-64', 'bg-card', 'border-r', 'border-border');
    });

    it('should render all navigation items', () => {
      renderNavigation();

      // Check all navigation items are present
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Trading')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Competitions')).toBeInTheDocument();
      expect(screen.getByText('Risk Analytics')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should render navigation items as links', () => {
      renderNavigation();

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const tradingLink = screen.getByRole('link', { name: /trading/i });
      const chatLink = screen.getByRole('link', { name: /chat/i });
      const competitionsLink = screen.getByRole('link', { name: /competitions/i });
      const riskLink = screen.getByRole('link', { name: /risk analytics/i });
      const profileLink = screen.getByRole('link', { name: /profile/i });

      expect(dashboardLink).toBeInTheDocument();
      expect(tradingLink).toBeInTheDocument();
      expect(chatLink).toBeInTheDocument();
      expect(competitionsLink).toBeInTheDocument();
      expect(riskLink).toBeInTheDocument();
      expect(profileLink).toBeInTheDocument();
    });

    it('should render icons for each navigation item', () => {
      renderNavigation();

      // Each link should contain an SVG icon (lucide-react icons)
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        const svg = link.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass('h-5', 'w-5');
      });
    });
  });

  describe('navigation structure', () => {
    it('should have proper list structure', () => {
      renderNavigation();

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('space-y-2');

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(6); // 6 navigation items
    });

    it('should wrap navigation in proper container', () => {
      renderNavigation();

      const nav = screen.getByRole('navigation');
      const container = nav.querySelector('.p-4');
      expect(container).toBeInTheDocument();
    });

    it('should have correct link URLs', () => {
      renderNavigation();

      expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
      expect(screen.getByRole('link', { name: /trading/i })).toHaveAttribute('href', '/trading');
      expect(screen.getByRole('link', { name: /chat/i })).toHaveAttribute('href', '/chat');
      expect(screen.getByRole('link', { name: /competitions/i })).toHaveAttribute('href', '/competitions');
      expect(screen.getByRole('link', { name: /risk analytics/i })).toHaveAttribute('href', '/risk');
      expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile');
    });
  });

  describe('active state handling', () => {
    it('should highlight active navigation item for dashboard route', () => {
      renderNavigation(['/dashboard']);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should highlight active navigation item for trading route', () => {
      renderNavigation(['/trading']);

      const tradingLink = screen.getByRole('link', { name: /trading/i });
      expect(tradingLink).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should highlight active navigation item for chat route', () => {
      renderNavigation(['/chat']);

      const chatLink = screen.getByRole('link', { name: /chat/i });
      expect(chatLink).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should not highlight inactive navigation items', () => {
      renderNavigation(['/dashboard']);

      const tradingLink = screen.getByRole('link', { name: /trading/i });
      const chatLink = screen.getByRole('link', { name: /chat/i });

      expect(tradingLink).not.toHaveClass('bg-primary', 'text-primary-foreground');
      expect(chatLink).not.toHaveClass('bg-primary', 'text-primary-foreground');
      expect(tradingLink).toHaveClass('text-muted-foreground');
      expect(chatLink).toHaveClass('text-muted-foreground');
    });

    it('should apply inactive styles to non-active links', () => {
      renderNavigation(['/dashboard']);

      const inactiveLinks = [
        screen.getByRole('link', { name: /trading/i }),
        screen.getByRole('link', { name: /chat/i }),
        screen.getByRole('link', { name: /competitions/i }),
        screen.getByRole('link', { name: /risk analytics/i }),
        screen.getByRole('link', { name: /profile/i }),
      ];

      inactiveLinks.forEach(link => {
        expect(link).toHaveClass('text-muted-foreground', 'hover:text-foreground', 'hover:bg-accent');
        expect(link).not.toHaveClass('bg-primary', 'text-primary-foreground');
      });
    });
  });

  describe('styling', () => {
    it('should apply correct navigation container styles', () => {
      renderNavigation();

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('w-64', 'bg-card', 'border-r', 'border-border');
    });

    it('should apply correct padding to content', () => {
      renderNavigation();

      const nav = screen.getByRole('navigation');
      const container = nav.querySelector('.p-4');
      expect(container).toHaveClass('p-4');
    });

    it('should apply correct list spacing', () => {
      renderNavigation();

      const list = screen.getByRole('list');
      expect(list).toHaveClass('space-y-2');
    });

    it('should apply correct link styles', () => {
      renderNavigation();

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass(
          'flex',
          'items-center',
          'space-x-3',
          'px-3',
          'py-2',
          'rounded-lg',
          'text-sm',
          'font-medium',
          'transition-colors'
        );
      });
    });

    it('should apply correct icon styles', () => {
      renderNavigation();

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        const icon = link.querySelector('svg');
        expect(icon).toHaveClass('h-5', 'w-5');
      });
    });
  });

  describe('accessibility', () => {
    it('should use semantic navigation element', () => {
      renderNavigation();

      const nav = screen.getByRole('navigation');
      expect(nav.tagName).toBe('NAV');
    });

    it('should have proper list structure for screen readers', () => {
      renderNavigation();

      const list = screen.getByRole('list');
      const listItems = screen.getAllByRole('listitem');

      expect(list.tagName).toBe('UL');
      listItems.forEach(item => {
        expect(item.tagName).toBe('LI');
      });
    });

    it('should have accessible link text', () => {
      renderNavigation();

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAccessibleName();
      });
    });

    it('should provide proper focus targets', () => {
      renderNavigation();

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toBeVisible();
        expect(link.tagName).toBe('A');
      });
    });
  });

  describe('router integration', () => {
    it('should work with React Router NavLink', () => {
      // Should render without errors
      expect(() => renderNavigation()).not.toThrow();
    });

    it('should use NavLink for proper active state handling', () => {
      renderNavigation(['/trading']);

      const tradingLink = screen.getByRole('link', { name: /trading/i });
      // NavLink should add active classes when route matches
      expect(tradingLink).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should handle route changes properly', () => {
      // Test dashboard route first
      const { unmount } = renderNavigation(['/dashboard']);
      let dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveClass('bg-primary');
      unmount();

      // Test chat route separately
      renderNavigation(['/chat']);
      const chatLink = screen.getByRole('link', { name: /chat/i });
      expect(chatLink).toHaveClass('bg-primary');
    });
  });

  describe('navigation items configuration', () => {
    it('should render all configured navigation items', () => {
      renderNavigation();

      const expectedItems = [
        'Dashboard',
        'Trading',
        'Chat',
        'Competitions',
        'Risk Analytics',
        'Profile'
      ];

      expectedItems.forEach(itemName => {
        expect(screen.getByText(itemName)).toBeInTheDocument();
      });
    });

    it('should maintain correct order of navigation items', () => {
      renderNavigation();

      const links = screen.getAllByRole('link');
      const linkTexts = links.map(link => link.textContent);

      expect(linkTexts).toEqual([
        'Dashboard',
        'Trading',
        'Chat',
        'Competitions',
        'Risk Analytics',
        'Profile'
      ]);
    });

    it('should use correct icons for each navigation item', () => {
      renderNavigation();

      // Check that each link has an icon (SVG element)
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const tradingLink = screen.getByRole('link', { name: /trading/i });
      const chatLink = screen.getByRole('link', { name: /chat/i });

      expect(dashboardLink.querySelector('svg')).toBeInTheDocument();
      expect(tradingLink.querySelector('svg')).toBeInTheDocument();
      expect(chatLink.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('responsive design', () => {
    it('should have fixed width for navigation', () => {
      renderNavigation();

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('w-64');
    });

    it('should handle icon and text layout properly', () => {
      renderNavigation();

      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('flex', 'items-center', 'space-x-3');
      });
    });
  });
});