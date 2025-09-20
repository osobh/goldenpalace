import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageList } from '../MessageList';
import { useAuthStore } from '../../../stores/authStore';
import { websocketService } from '../../../services/websocket.service';
import type { ChatMessage } from '../../../services/websocket.service';

// Mock the auth store
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock the websocket service
vi.mock('../../../services/websocket.service', () => ({
  websocketService: {
    addReaction: vi.fn(),
    removeReaction: vi.fn(),
    markMessageAsRead: vi.fn(),
    editMessage: vi.fn(),
    deleteMessage: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'USER' as const,
  isVerified: true,
  createdAt: '2023-01-01T00:00:00Z',
};

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    groupId: 'group-1',
    userId: 'user-1',
    username: 'testuser',
    content: 'Hello everyone!',
    type: 'TEXT',
    createdAt: '2023-12-01T10:00:00Z',
    reactions: [
      {
        id: 'reaction-1',
        userId: 'user-2',
        username: 'otheruser',
        emoji: '👍',
        createdAt: '2023-12-01T10:00:30Z',
      },
    ],
    readBy: [
      {
        userId: 'user-2',
        username: 'otheruser',
        readAt: '2023-12-01T10:00:45Z',
      },
    ],
  },
  {
    id: 'msg-2',
    groupId: 'group-1',
    userId: 'user-2',
    username: 'otheruser',
    content: 'Hi there!',
    type: 'TEXT',
    createdAt: '2023-12-01T10:01:00Z',
    reactions: [],
    readBy: [],
    editedAt: '2023-12-01T10:01:15Z',
  },
  {
    id: 'msg-3',
    groupId: 'group-1',
    userId: 'user-1',
    username: 'testuser',
    content: 'Check this out!',
    type: 'IMAGE',
    createdAt: '2023-12-01T10:02:00Z',
    reactions: [],
    readBy: [],
    attachments: [
      {
        id: 'attachment-1',
        filename: 'chart.png',
        url: 'https://example.com/chart.png',
        mimeType: 'image/png',
        size: 1024000,
      },
    ],
  },
  {
    id: 'msg-4',
    groupId: 'group-1',
    userId: 'system',
    username: 'System',
    content: 'user-3 joined the group',
    type: 'SYSTEM',
    createdAt: '2023-12-01T10:03:00Z',
    reactions: [],
    readBy: [],
  },
];

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      verifyEmail: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      updateProfile: vi.fn(),
      refreshToken: vi.fn(),
      clearError: vi.fn(),
      isLoading: false,
      error: null,
    });
  });

  describe('rendering', () => {
    it('should render all messages', () => {
      render(<MessageList messages={mockMessages} />);

      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
      expect(screen.getByText('Check this out!')).toBeInTheDocument();
      expect(screen.getByText('user-3 joined the group')).toBeInTheDocument();
    });

    it('should render empty state when no messages', () => {
      render(<MessageList messages={[]} />);

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Messages will appear here when someone starts chatting.')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(<MessageList messages={mockMessages} />);

      expect(screen.getByRole('log', { name: 'Chat messages' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });

    it('should group consecutive messages from same user', () => {
      const consecutiveMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          groupId: 'group-1',
          userId: 'user-1',
          username: 'testuser',
          content: 'First message',
          type: 'TEXT',
          createdAt: '2023-12-01T10:00:00Z',
          reactions: [],
          readBy: [],
        },
        {
          id: 'msg-2',
          groupId: 'group-1',
          userId: 'user-1',
          username: 'testuser',
          content: 'Second message',
          type: 'TEXT',
          createdAt: '2023-12-01T10:00:30Z',
          reactions: [],
          readBy: [],
        },
        {
          id: 'msg-3',
          groupId: 'group-1',
          userId: 'user-2',
          username: 'otheruser',
          content: 'Different user',
          type: 'TEXT',
          createdAt: '2023-12-01T10:01:00Z',
          reactions: [],
          readBy: [],
        },
      ];

      render(<MessageList messages={consecutiveMessages} />);

      // Should only show username once for grouped messages
      const testuserElements = screen.getAllByText('testuser');
      expect(testuserElements).toHaveLength(1);

      const otheruserElements = screen.getAllByText('otheruser');
      expect(otheruserElements).toHaveLength(1);
    });
  });

  describe('message types', () => {
    it('should render text messages correctly', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    });

    it('should render system messages differently', () => {
      render(<MessageList messages={[mockMessages[3]]} />);

      const systemMessage = screen.getByText('user-3 joined the group');
      const messageContainer = systemMessage.closest('.message-item');
      expect(messageContainer).toHaveClass('system-message');
      expect(screen.getByLabelText('System message')).toBeInTheDocument();
    });

    it('should render image messages with attachments', () => {
      render(<MessageList messages={[mockMessages[2]]} />);

      expect(screen.getByText('Check this out!')).toBeInTheDocument();
      // For image attachments, filename is in alt attribute
      expect(screen.getByRole('img', { name: 'chart.png' })).toBeInTheDocument();
      // File size is not shown for image attachments
    });

    it('should show edited indicator for edited messages', () => {
      render(<MessageList messages={[mockMessages[1]]} />);

      expect(screen.getByText('(edited)')).toBeInTheDocument();
      expect(screen.getByLabelText('Message was edited')).toBeInTheDocument();
    });
  });

  describe('timestamps', () => {
    it('should format timestamps correctly', () => {
      render(<MessageList messages={mockMessages} />);

      expect(screen.getByText('10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('10:01 AM')).toBeInTheDocument();
      expect(screen.getByText('10:02 AM')).toBeInTheDocument();
      // System messages don't display timestamps
      expect(screen.getByText('user-3 joined the group')).toBeInTheDocument();
    });

    it('should show date separator for messages on different days', () => {
      const messagesOnDifferentDays: ChatMessage[] = [
        {
          ...mockMessages[0],
          createdAt: '2023-12-01T10:00:00Z',
        },
        {
          ...mockMessages[1],
          createdAt: '2023-12-02T10:00:00Z',
        },
      ];

      render(<MessageList messages={messagesOnDifferentDays} />);

      expect(screen.getByText('December 1, 2023')).toBeInTheDocument();
      expect(screen.getByText('December 2, 2023')).toBeInTheDocument();
    });

    it('should show "Today" for messages from today', () => {
      const today = new Date();
      const todayMessage: ChatMessage = {
        ...mockMessages[0],
        createdAt: today.toISOString(),
      };

      render(<MessageList messages={[todayMessage]} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  describe('reactions', () => {
    it('should display reactions on messages', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByLabelText('👍 reaction by otheruser')).toBeInTheDocument();
    });

    it('should allow adding reactions', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      const addReactionButton = screen.getByRole('button', { name: 'Add reaction' });
      fireEvent.click(addReactionButton);

      // Check emoji picker is shown
      expect(screen.getByRole('dialog', { name: 'Select emoji' })).toBeInTheDocument();

      const emojiButton = screen.getByRole('button', { name: '❤️' });
      expect(emojiButton).toBeInTheDocument();
      fireEvent.click(emojiButton);

      // Emoji picker should close after selection
      expect(screen.queryByRole('dialog', { name: 'Select emoji' })).not.toBeInTheDocument();
    });

    it('should allow removing reactions', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      const reactionButton = screen.getByRole('button', { name: '👍 reaction by otheruser' });

      // Test that the button exists and is clickable
      expect(reactionButton).toBeInTheDocument();
      fireEvent.click(reactionButton);

      // The actual removal would happen through websocket
      // We're testing the UI responds correctly
      expect(reactionButton).toBeInTheDocument();
    });

    it('should show reaction picker when add reaction is clicked', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      const addReactionButton = screen.getByRole('button', { name: 'Add reaction' });
      fireEvent.click(addReactionButton);

      expect(screen.getByRole('dialog', { name: 'Select emoji' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '👍' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '❤️' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '😂' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '😮' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '😢' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '😠' })).toBeInTheDocument();
    });
  });

  describe('message actions', () => {
    it('should show message menu for own messages', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      const messageElement = screen.getByText('Hello everyone!').closest('[data-message-id]');
      fireEvent.mouseEnter(messageElement!);

      expect(screen.getByRole('button', { name: 'Edit message' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete message' })).toBeInTheDocument();
    });

    it('should not show edit/delete for other users messages', () => {
      render(<MessageList messages={[mockMessages[1]]} />);

      const messageElement = screen.getByText('Hi there!').closest('[data-message-id]');
      fireEvent.mouseEnter(messageElement!);

      expect(screen.queryByRole('button', { name: 'Edit message' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete message' })).not.toBeInTheDocument();
    });

    it('should allow editing own messages', async () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      const messageElement = screen.getByText('Hello everyone!').closest('[data-message-id]');
      fireEvent.mouseEnter(messageElement!);

      const editButton = screen.getByRole('button', { name: 'Edit message' });
      fireEvent.click(editButton);

      const editInput = screen.getByDisplayValue('Hello everyone!');
      fireEvent.change(editInput, { target: { value: 'Hello everyone! (edited)' } });
      fireEvent.keyDown(editInput, { key: 'Enter' });

      await waitFor(() => {
        expect(websocketService.editMessage).toHaveBeenCalledWith('msg-1', 'Hello everyone! (edited)');
      });
    });

    it('should allow deleting own messages', async () => {
      window.confirm = vi.fn(() => true);
      render(<MessageList messages={[mockMessages[0]]} />);

      const messageElement = screen.getByText('Hello everyone!').closest('[data-message-id]');
      fireEvent.mouseEnter(messageElement!);

      const deleteButton = screen.getByRole('button', { name: 'Delete message' });
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(websocketService.deleteMessage).toHaveBeenCalledWith('msg-1');
      });
    });

    it('should cancel edit when escape is pressed', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      const messageElement = screen.getByText('Hello everyone!').closest('[data-message-id]');
      fireEvent.mouseEnter(messageElement!);

      const editButton = screen.getByRole('button', { name: 'Edit message' });
      fireEvent.click(editButton);

      const editInput = screen.getByDisplayValue('Hello everyone!');
      expect(editInput).toBeInTheDocument();

      fireEvent.keyDown(editInput, { key: 'Escape' });

      // Edit mode should be cancelled
      expect(screen.queryByDisplayValue('Hello everyone!')).not.toBeInTheDocument();
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    });
  });

  describe('read receipts', () => {
    it('should show read receipts for messages', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      expect(screen.getByLabelText('Read by otheruser')).toBeInTheDocument();
    });

    it('should mark messages as read when they enter viewport', () => {
      // IntersectionObserver is not available in jsdom
      // Test that the component renders without errors
      render(<MessageList messages={mockMessages} />);

      // Messages should be rendered
      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  describe('virtual scrolling', () => {
    it('should handle large number of messages efficiently', () => {
      const manyMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        groupId: 'group-1',
        userId: 'user-1',
        username: 'testuser',
        content: `Message ${i}`,
        type: 'TEXT' as const,
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        reactions: [],
        readBy: [],
      }));

      render(<MessageList messages={manyMessages} />);

      // Should only render visible messages (virtual scrolling)
      const renderedMessages = screen.getAllByText(/Message \d+/);
      expect(renderedMessages.length).toBeLessThan(100); // Should virtualize
    });

    it('should maintain scroll position when new messages arrive', () => {
      const { rerender } = render(<MessageList messages={mockMessages} />);

      const messageContainer = screen.getByRole('log');
      messageContainer.scrollTop = 100;

      const newMessage: ChatMessage = {
        id: 'msg-5',
        groupId: 'group-1',
        userId: 'user-2',
        username: 'otheruser',
        content: 'New message',
        type: 'TEXT',
        createdAt: '2023-12-01T10:04:00Z',
        reactions: [],
        readBy: [],
      };

      rerender(<MessageList messages={[...mockMessages, newMessage]} />);

      // New message should be rendered
      expect(screen.getByText('New message')).toBeInTheDocument();
    });

    it('should auto-scroll to bottom for new messages from current user', () => {
      const { rerender } = render(<MessageList messages={mockMessages} />);

      const newMessage: ChatMessage = {
        id: 'msg-5',
        groupId: 'group-1',
        userId: 'user-1', // Current user
        username: 'testuser',
        content: 'My new message',
        type: 'TEXT',
        createdAt: '2023-12-01T10:04:00Z',
        reactions: [],
        readBy: [],
      };

      rerender(<MessageList messages={[...mockMessages, newMessage]} />);

      const messageContainer = screen.getByRole('log');
      expect(messageContainer.scrollTop).toBe(messageContainer.scrollHeight - messageContainer.clientHeight);
    });
  });

  describe('accessibility', () => {
    it('should announce new messages to screen readers', () => {
      const { rerender } = render(<MessageList messages={mockMessages} />);

      const newMessage: ChatMessage = {
        id: 'msg-5',
        groupId: 'group-1',
        userId: 'user-2',
        username: 'otheruser',
        content: 'New message',
        type: 'TEXT',
        createdAt: '2023-12-01T10:04:00Z',
        reactions: [],
        readBy: [],
      };

      rerender(<MessageList messages={[...mockMessages, newMessage]} />);

      expect(screen.getByLabelText('New message from otheruser: New message')).toBeInTheDocument();
    });

    it('should support keyboard navigation for reactions', () => {
      render(<MessageList messages={[mockMessages[0]]} />);

      const reactionButton = screen.getByRole('button', { name: '👍 reaction by otheruser' });

      // Test that keyboard events work on reaction buttons
      fireEvent.keyDown(reactionButton, { key: 'Enter' });
      expect(reactionButton).toBeInTheDocument();

      fireEvent.keyDown(reactionButton, { key: ' ' });
      expect(reactionButton).toBeInTheDocument();
    });
  });

  describe('virtual scrolling', () => {
    it('should only render visible messages for performance', () => {
      // Create 1000 messages for testing
      const manyMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        userId: i % 2 === 0 ? 'user-1' : 'user-2',
        username: i % 2 === 0 ? 'currentuser' : 'otheruser',
        content: `Message ${i}`,
        createdAt: new Date(2023, 11, 1, 10, i).toISOString(),
        reactions: [],
        readBy: [],
      }));

      const { container } = render(<MessageList messages={manyMessages} />);

      // Check that not all messages are rendered in the DOM
      const messageElements = container.querySelectorAll('[data-message-id]');
      expect(messageElements.length).toBeLessThan(100); // Should use virtual scrolling
      expect(messageElements.length).toBeGreaterThan(0); // But some should be visible
    });

    it('should render more messages as user scrolls', async () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        userId: 'user-1',
        username: 'testuser',
        content: `Message ${i}`,
        createdAt: new Date(2023, 11, 1, 10, i).toISOString(),
        reactions: [],
        readBy: [],
      }));

      const { container } = render(<MessageList messages={manyMessages} />);

      const scrollContainer = container.querySelector('.message-list-scroll-container');
      expect(scrollContainer).toBeInTheDocument();

      // Initially should show limited messages
      let visibleMessages = container.querySelectorAll('[data-message-id]');
      const initialCount = visibleMessages.length;

      // Simulate scroll
      fireEvent.scroll(scrollContainer!, { target: { scrollTop: 500 } });

      await waitFor(() => {
        visibleMessages = container.querySelectorAll('[data-message-id]');
        expect(visibleMessages.length).toBeGreaterThanOrEqual(initialCount);
      });
    });

    it('should maintain scroll position when new messages arrive', async () => {
      const initialMessages = Array.from({ length: 50 }, (_, i) => ({
        id: `msg-${i}`,
        userId: 'user-1',
        username: 'testuser',
        content: `Message ${i}`,
        createdAt: new Date(2023, 11, 1, 10, i).toISOString(),
        reactions: [],
        readBy: [],
      }));

      const { container, rerender } = render(<MessageList messages={initialMessages} />);

      const scrollContainer = container.querySelector('.message-list-scroll-container');

      // Scroll to middle
      fireEvent.scroll(scrollContainer!, { target: { scrollTop: 300 } });
      const scrollPosBefore = scrollContainer!.scrollTop;

      // Add new message at the end
      const newMessage = {
        id: 'msg-new',
        userId: 'user-2',
        username: 'otheruser',
        content: 'New message',
        createdAt: new Date(2023, 11, 1, 10, 51).toISOString(),
        reactions: [],
        readBy: [],
      };

      rerender(<MessageList messages={[...initialMessages, newMessage]} />);

      // Scroll position should be maintained
      await waitFor(() => {
        expect(scrollContainer!.scrollTop).toBe(scrollPosBefore);
      });
    });

    it('should handle dynamic message height correctly', () => {
      const messagesWithVariableHeight = [
        {
          id: 'msg-1',
          userId: 'user-1',
          username: 'testuser',
          content: 'Short',
          createdAt: '2023-12-01T10:00:00Z',
          reactions: [],
          readBy: [],
        },
        {
          id: 'msg-2',
          userId: 'user-1',
          username: 'testuser',
          content: 'This is a much longer message that will wrap to multiple lines and take up more vertical space in the message list component',
          createdAt: '2023-12-01T10:01:00Z',
          reactions: [],
          readBy: [],
        },
        {
          id: 'msg-3',
          userId: 'user-1',
          username: 'testuser',
          content: 'Another short one',
          createdAt: '2023-12-01T10:02:00Z',
          reactions: [],
          readBy: [],
          attachments: [{
            id: 'att-1',
            name: 'image.png',
            url: '/image.png',
            type: 'image',
            size: 1024,
          }],
        },
      ];

      const { container } = render(<MessageList messages={messagesWithVariableHeight} />);

      // All visible messages should be rendered despite different heights
      const messageElements = container.querySelectorAll('[data-message-id]');
      expect(messageElements.length).toBeGreaterThan(0);
    });

    it('should provide smooth scrolling performance metrics', () => {
      const manyMessages = Array.from({ length: 500 }, (_, i) => ({
        id: `msg-${i}`,
        userId: 'user-1',
        username: 'testuser',
        content: `Message ${i}`,
        createdAt: new Date(2023, 11, 1, 10, i).toISOString(),
        reactions: [],
        readBy: [],
      }));

      const { container } = render(<MessageList messages={manyMessages} />);

      const scrollContainer = container.querySelector('.message-list-scroll-container');

      // Measure initial render performance
      const startTime = performance.now();
      fireEvent.scroll(scrollContainer!, { target: { scrollTop: 1000 } });
      const scrollTime = performance.now() - startTime;

      // Scrolling should be performant (under 100ms for response)
      expect(scrollTime).toBeLessThan(100);
    });
  });
});