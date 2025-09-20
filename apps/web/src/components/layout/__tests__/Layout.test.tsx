import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../Layout';

// Mock the child components
vi.mock('../Header', () => ({
  Header: () => <header data-testid="mock-header">Mock Header</header>,
}));

vi.mock('../Navigation', () => ({
  Navigation: () => <nav data-testid="mock-navigation">Mock Navigation</nav>,
}));

// Mock auth store for child components
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { username: 'testuser' },
    logout: vi.fn(),
    isAuthenticated: true,
    isLoading: false,
  })),
}));

describe('Layout', () => {
  const renderLayout = () => {
    return render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render the main layout structure', () => {
      renderLayout();

      // Should render the main container
      const container = screen.getByTestId('mock-header').closest('.min-h-screen');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('min-h-screen', 'bg-background');
    });

    it('should render Header component', () => {
      renderLayout();

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    });

    it('should render Navigation component', () => {
      renderLayout();

      expect(screen.getByTestId('mock-navigation')).toBeInTheDocument();
    });

    it('should render main content area', () => {
      renderLayout();

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('flex-1', 'p-6');
    });

    it('should render Outlet for route content', () => {
      renderLayout();

      // The Outlet component should be present in the main area
      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
    });
  });

  describe('layout structure', () => {
    it('should have proper container styling', () => {
      renderLayout();

      const container = screen.getByTestId('mock-header').closest('.min-h-screen');
      expect(container).toHaveClass('min-h-screen', 'bg-background');
    });

    it('should have proper flex layout for content area', () => {
      renderLayout();

      const flexContainer = screen.getByTestId('mock-navigation').closest('.flex');
      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass('flex');
    });

    it('should position navigation and main content side by side', () => {
      renderLayout();

      const navigation = screen.getByTestId('mock-navigation');
      const main = screen.getByRole('main');
      const flexContainer = navigation.closest('.flex');

      expect(flexContainer).toContainElement(navigation);
      expect(flexContainer).toContainElement(main);
    });

    it('should make main content area flexible', () => {
      renderLayout();

      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1');
    });
  });

  describe('component hierarchy', () => {
    it('should render Header at the top level', () => {
      renderLayout();

      const header = screen.getByTestId('mock-header');
      const container = header.closest('.min-h-screen');
      const flexContainer = screen.getByTestId('mock-navigation').closest('.flex');

      expect(container).toContainElement(header);
      expect(container).toContainElement(flexContainer);

      // Header should come before the flex container in DOM order
      const containerChildren = Array.from(container?.children || []);
      const headerIndex = containerChildren.indexOf(header as Element);
      const flexIndex = containerChildren.indexOf(flexContainer as Element);

      expect(headerIndex).toBeLessThan(flexIndex);
    });

    it('should render Navigation and main content at the same level', () => {
      renderLayout();

      const navigation = screen.getByTestId('mock-navigation');
      const main = screen.getByRole('main');
      const flexContainer = navigation.closest('.flex');

      expect(flexContainer).toContainElement(navigation);
      expect(flexContainer).toContainElement(main);

      // Both should be direct children of the flex container
      const flexChildren = Array.from(flexContainer?.children || []);
      expect(flexChildren).toContain(navigation);
      expect(flexChildren).toContain(main);
    });
  });

  describe('responsive design', () => {
    it('should have minimum height set to screen height', () => {
      renderLayout();

      const container = screen.getByTestId('mock-header').closest('.min-h-screen');
      expect(container).toHaveClass('min-h-screen');
    });

    it('should have flexible main content that grows', () => {
      renderLayout();

      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1');
    });

    it('should have proper padding for main content', () => {
      renderLayout();

      const main = screen.getByRole('main');
      expect(main).toHaveClass('p-6');
    });
  });

  describe('accessibility', () => {
    it('should have proper main landmark', () => {
      renderLayout();

      const main = screen.getByRole('main');
      expect(main.tagName).toBe('MAIN');
    });

    it('should provide proper document structure', () => {
      renderLayout();

      // Should have header, navigation, and main landmarks
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should maintain semantic HTML structure', () => {
      renderLayout();

      const container = screen.getByTestId('mock-header').closest('div');
      const header = screen.getByTestId('mock-header');
      const navigation = screen.getByTestId('mock-navigation');
      const main = screen.getByRole('main');

      expect(container?.tagName).toBe('DIV');
      expect(header.tagName).toBe('HEADER');
      expect(navigation.tagName).toBe('NAV');
      expect(main.tagName).toBe('MAIN');
    });
  });

  describe('router integration', () => {
    it('should work with React Router', () => {
      // Should render without errors when wrapped in MemoryRouter
      expect(() => renderLayout()).not.toThrow();
    });

    it('should provide Outlet for route rendering', () => {
      renderLayout();

      const main = screen.getByRole('main');
      // The Outlet component should be rendered inside main
      expect(main).toBeInTheDocument();
    });
  });

  describe('CSS classes', () => {
    it('should apply background and layout classes to container', () => {
      renderLayout();

      const container = screen.getByTestId('mock-header').closest('div');
      expect(container).toHaveClass('min-h-screen', 'bg-background');
    });

    it('should apply flex classes to content wrapper', () => {
      renderLayout();

      const flexContainer = screen.getByTestId('mock-navigation').closest('.flex');
      expect(flexContainer).toHaveClass('flex');
    });

    it('should apply proper classes to main content', () => {
      renderLayout();

      const main = screen.getByRole('main');
      expect(main).toHaveClass('flex-1', 'p-6');
    });
  });

  describe('component integration', () => {
    it('should integrate Header, Navigation, and main content properly', () => {
      renderLayout();

      // All components should be present and in correct positions
      const header = screen.getByTestId('mock-header');
      const navigation = screen.getByTestId('mock-navigation');
      const main = screen.getByRole('main');

      expect(header).toBeInTheDocument();
      expect(navigation).toBeInTheDocument();
      expect(main).toBeInTheDocument();

      // Check they are in the expected container structure
      const container = header.closest('.min-h-screen');
      const flexContainer = navigation.closest('.flex');

      expect(container).toContainElement(header);
      expect(container).toContainElement(flexContainer);
      expect(flexContainer).toContainElement(navigation);
      expect(flexContainer).toContainElement(main);
    });
  });
});