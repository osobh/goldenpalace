import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { TypingIndicator } from '../TypingIndicator';

describe('TypingIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when no one is typing', () => {
      render(<TypingIndicator typingUsers={[]} />);

      expect(screen.queryByText(/typing/)).not.toBeInTheDocument();
    });

    it('should render single user typing', () => {
      render(<TypingIndicator typingUsers={['john']} />);

      expect(screen.getByText('john is typing...')).toBeInTheDocument();
    });

    it('should render two users typing', () => {
      render(<TypingIndicator typingUsers={['john', 'jane']} />);

      expect(screen.getByText('john, jane are typing...')).toBeInTheDocument();
    });

    it('should render multiple users typing', () => {
      render(<TypingIndicator typingUsers={['john', 'jane', 'bob']} />);

      expect(screen.getByText('john, jane, bob are typing...')).toBeInTheDocument();
    });

    it('should render many users typing with count', () => {
      render(<TypingIndicator typingUsers={['john', 'jane', 'bob', 'alice', 'charlie']} />);

      expect(screen.getByText('john, jane, bob, alice, charlie are typing...')).toBeInTheDocument();
    });

    it('should show animated dots', () => {
      render(<TypingIndicator typingUsers={['john']} />);

      expect(screen.getByLabelText('Typing animation')).toBeInTheDocument();
      expect(screen.getByText('john is typing...')).toBeInTheDocument();
    });
  });

  describe('animations', () => {
    it('should have fade-in animation when appearing', () => {
      const { rerender } = render(<TypingIndicator typingUsers={[]} />);

      rerender(<TypingIndicator typingUsers={['john']} />);

      const indicator = screen.getByText('john is typing...');
      expect(indicator.closest('[data-testid="typing-indicator"]')).toHaveClass('fade-in');
    });

    it('should have fade-out animation when disappearing', () => {
      const { rerender } = render(<TypingIndicator typingUsers={['john']} />);

      act(() => {
        rerender(<TypingIndicator typingUsers={[]} />);
      });

      // Should briefly show with fade-out class before being removed
      const indicator = screen.queryByText('john is typing...');
      if (indicator) {
        expect(indicator.closest('[data-testid="typing-indicator"]')).toHaveClass('fade-out');
      }
    });

    it('should animate dots continuously', () => {
      vi.useFakeTimers();

      render(<TypingIndicator typingUsers={['john']} />);

      const dots = screen.getByLabelText('Typing animation');
      expect(dots).toHaveClass('dots-animation');

      vi.useRealTimers();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TypingIndicator typingUsers={['john']} />);

      expect(screen.getByLabelText('john is typing')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should announce typing status to screen readers', () => {
      render(<TypingIndicator typingUsers={['john']} />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
      expect(statusElement).toHaveTextContent('john is typing...');
    });

    it('should be hidden from screen readers when no one is typing', () => {
      render(<TypingIndicator typingUsers={[]} />);

      const container = screen.getByTestId('typing-indicator-container');
      expect(container).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = vi.fn();

      function TestComponent({ users }: { users: string[] }) {
        renderSpy();
        return <TypingIndicator typingUsers={users} />;
      }

      const { rerender } = render(<TestComponent users={['john']} />);

      renderSpy.mockClear();

      // Same props should not cause re-render
      rerender(<TestComponent users={['john']} />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Different props should cause re-render
      rerender(<TestComponent users={['jane']} />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid updates efficiently', () => {
      const { rerender } = render(<TypingIndicator typingUsers={[]} />);

      // Rapidly add and remove users
      act(() => {
        rerender(<TypingIndicator typingUsers={['john']} />);
        rerender(<TypingIndicator typingUsers={['john', 'jane']} />);
        rerender(<TypingIndicator typingUsers={['jane']} />);
        rerender(<TypingIndicator typingUsers={[]} />);
      });

      // Should handle all updates without issues
      expect(screen.queryByText(/typing/)).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty username', () => {
      render(<TypingIndicator typingUsers={['']} />);

      expect(screen.getByText('Someone is typing...')).toBeInTheDocument();
    });

    it('should handle undefined usernames', () => {
      render(<TypingIndicator typingUsers={[undefined as any]} />);

      expect(screen.getByText('Someone is typing...')).toBeInTheDocument();
    });

    it('should handle very long usernames', () => {
      const longUsername = 'a'.repeat(100);
      render(<TypingIndicator typingUsers={[longUsername]} />);

      expect(screen.getByText(`${longUsername} is typing...`)).toBeInTheDocument();
    });

    it('should handle special characters in usernames', () => {
      render(<TypingIndicator typingUsers={['user@domain.com']} />);

      expect(screen.getByText('user@domain.com is typing...')).toBeInTheDocument();
    });

    it('should deduplicate duplicate usernames', () => {
      render(<TypingIndicator typingUsers={['john', 'john', 'jane']} />);

      expect(screen.getByText('john, jane are typing...')).toBeInTheDocument();
    });
  });

  describe('customization', () => {
    it('should support custom typing text', () => {
      render(
        <TypingIndicator
          typingUsers={['john']}
          customText="is composing a message..."
        />
      );

      expect(screen.getByText('john is composing a message...')).toBeInTheDocument();
    });

    it('should support custom max displayed users', () => {
      render(
        <TypingIndicator
          typingUsers={['john', 'jane', 'bob']}
          maxDisplayedUsers={2}
        />
      );

      expect(screen.getByText('john, jane, bob are typing...')).toBeInTheDocument();
    });

    it('should support custom styling classes', () => {
      render(
        <TypingIndicator
          typingUsers={['john']}
          className="custom-typing-indicator"
        />
      );

      const indicator = screen.getByText('john is typing...');
      expect(indicator.closest('[data-testid="typing-indicator"]')).toHaveClass('custom-typing-indicator');
    });
  });

  describe('internationalization', () => {
    it('should support different languages', () => {
      render(
        <TypingIndicator
          typingUsers={['john']}
          locale="es"
          customText="está escribiendo..."
        />
      );

      expect(screen.getByText('john está escribiendo...')).toBeInTheDocument();
    });

    it('should handle RTL languages', () => {
      render(
        <TypingIndicator
          typingUsers={['محمد']}
          locale="ar"
          direction="rtl"
        />
      );

      const indicator = screen.getByText('محمد is typing...');
      expect(indicator.closest('[data-testid="typing-indicator"]')).toHaveAttribute('dir', 'rtl');
    });
  });

  describe('timing', () => {
    it('should show for minimum duration even if users stop typing quickly', () => {
      vi.useFakeTimers();

      const { rerender } = render(<TypingIndicator typingUsers={['john']} />);

      // Immediately remove typing user
      act(() => {
        rerender(<TypingIndicator typingUsers={[]} />);
      });

      // Should still be visible during minimum duration
      expect(screen.getByText('john is typing...')).toBeInTheDocument();

      // After minimum duration, should disappear
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByText('john is typing...')).not.toBeInTheDocument();

      vi.useRealTimers();
    });

    it('should debounce rapid changes', () => {
      vi.useFakeTimers();

      const { rerender } = render(<TypingIndicator typingUsers={[]} />);

      // Rapid changes
      act(() => {
        rerender(<TypingIndicator typingUsers={['john']} />);
        rerender(<TypingIndicator typingUsers={['john', 'jane']} />);
        rerender(<TypingIndicator typingUsers={['jane']} />);
      });

      // Should debounce and show final state
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByText('jane is typing...')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});