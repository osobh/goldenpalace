import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatWindow } from '../ChatWindow';
import { useAuthStore } from '../../../stores/authStore';
import { websocketService } from '../../../services/websocket.service';
import type { ChatMessage, GroupMember } from '../../../services/websocket.service';

// Mock the auth store
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock the websocket service
vi.mock('../../../services/websocket.service', () => ({
  websocketService: {
    isConnected: vi.fn(),
    joinGroup: vi.fn(),
    leaveGroup: vi.fn(),
    sendMessage: vi.fn(),
    sendTyping: vi.fn(),
    onMessage: vi.fn(),
    onTyping: vi.fn(),
    onGroupMemberUpdate: vi.fn(),
    onError: vi.fn(),
    onDisconnect: vi.fn(),
    getConnectionState: vi.fn(),
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
    reactions: [],
    readBy: [],
  },
  {
    id: 'msg-2',
    groupId: 'group-1',
    userId: 'user-2',
    username: 'otheruser',
    content: 'Hi there!',
    type: 'TEXT',
    createdAt: '2023-12-01T10:01:00Z',
    reactions: [
      {
        id: 'reaction-1',
        userId: 'user-1',
        username: 'testuser',
        emoji: '👍',
        createdAt: '2023-12-01T10:01:30Z',
      },
    ],
    readBy: [],
  },
];

const mockMembers: GroupMember[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    username: 'testuser',
    role: 'ADMIN',
    joinedAt: '2023-11-01T00:00:00Z',
    isOnline: true,
    lastSeen: '2023-12-01T10:02:00Z',
  },
  {
    id: 'member-2',
    userId: 'user-2',
    username: 'otheruser',
    role: 'MEMBER',
    joinedAt: '2023-11-15T00:00:00Z',
    isOnline: false,
    lastSeen: '2023-12-01T09:30:00Z',
  },
];

describe('ChatWindow', () => {
  const mockGroupId = 'group-1';
  const mockGroupName = 'Test Trading Group';

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

    vi.mocked(websocketService.isConnected).mockReturnValue(true);
    vi.mocked(websocketService.getConnectionState).mockReturnValue({
      connected: true,
      socketId: 'socket-123',
      reconnectAttempts: 0,
      isReconnecting: false,
      queuedMessages: 0,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render chat window with group name', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByText(mockGroupName)).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Chat window' })).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={[]}
          members={[]}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading chat...')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading chat messages')).toBeInTheDocument();
    });

    it('should render connection status indicator', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByLabelText('Connection status: Connected')).toBeInTheDocument();
    });

    it('should show disconnected status when not connected', () => {
      vi.mocked(websocketService.isConnected).mockReturnValue(false);
      vi.mocked(websocketService.getConnectionState).mockReturnValue({
        connected: false,
        socketId: null,
        reconnectAttempts: 2,
        isReconnecting: true,
        queuedMessages: 1,
      });

      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByLabelText('Connection status: Reconnecting')).toBeInTheDocument();
      expect(screen.getByText('Reconnecting... (attempt 2)')).toBeInTheDocument();
    });

    it('should render member count', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByText('2 members')).toBeInTheDocument();
    });

    it('should render online member count', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByText('1 online')).toBeInTheDocument();
    });
  });

  describe('message display', () => {
    it('should render all messages', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('should show empty state when no messages', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={[]}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Start the conversation by sending a message.')).toBeInTheDocument();
    });

    it('should scroll to bottom when new message arrives', async () => {
      const { rerender } = render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const newMessage: ChatMessage = {
        id: 'msg-3',
        groupId: 'group-1',
        userId: 'user-3',
        username: 'newuser',
        content: 'New message!',
        type: 'TEXT',
        createdAt: '2023-12-01T10:02:00Z',
        reactions: [],
        readBy: [],
      };

      rerender(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={[...mockMessages, newMessage]}
          members={mockMembers}
          isLoading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('New message!')).toBeInTheDocument();
      });
    });
  });

  describe('message input', () => {
    it('should render message input field', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });

    it('should send message when form is submitted', async () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(websocketService.sendMessage).toHaveBeenCalledWith({
          groupId: mockGroupId,
          content: 'Test message',
          type: 'TEXT',
        });
      });

      expect(input).toHaveValue('');
    });

    it('should send message on Enter key press', async () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(websocketService.sendMessage).toHaveBeenCalledWith({
          groupId: mockGroupId,
          content: 'Test message',
          type: 'TEXT',
        });
      });
    });

    it('should not send empty messages', async () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      fireEvent.click(sendButton);

      expect(websocketService.sendMessage).not.toHaveBeenCalled();
    });

    it('should disable input when not connected', () => {
      vi.mocked(websocketService.isConnected).mockReturnValue(false);

      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('typing indicators', () => {
    it('should send typing indicator when user types', async () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'T' } });

      await waitFor(() => {
        expect(websocketService.sendTyping).toHaveBeenCalledWith({
          groupId: mockGroupId,
          isTyping: true,
        });
      });
    });

    it('should stop typing indicator after delay', () => {
      vi.useFakeTimers();

      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');

      act(() => {
        fireEvent.change(input, { target: { value: 'Test' } });
      });

      // Verify typing indicator was sent
      expect(websocketService.sendTyping).toHaveBeenCalledWith({
        groupId: mockGroupId,
        isTyping: true,
      });

      // Advance time to trigger stop typing and run all timers
      act(() => {
        vi.advanceTimersByTime(3000);
        vi.runAllTimers();
      });

      // Verify stop typing was called (should be called twice: once for true, once for false)
      expect(websocketService.sendTyping).toHaveBeenCalledTimes(2);
      expect(websocketService.sendTyping).toHaveBeenNthCalledWith(2, {
        groupId: mockGroupId,
        isTyping: false,
      });

      vi.useRealTimers();
    });

    it('should display typing indicators from other users', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
          typingUsers={['otheruser', 'thirduser']}
        />
      );

      expect(screen.getByText('otheruser, thirduser are typing...')).toBeInTheDocument();
    });

    it('should display single user typing indicator', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
          typingUsers={['otheruser']}
        />
      );

      expect(screen.getByText('otheruser is typing...')).toBeInTheDocument();
    });
  });

  describe('group management', () => {
    it('should join group on mount', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(websocketService.joinGroup).toHaveBeenCalledWith(mockGroupId);
    });

    it('should leave group on unmount', () => {
      const { unmount } = render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      unmount();

      expect(websocketService.leaveGroup).toHaveBeenCalledWith(mockGroupId);
    });

    it('should rejoin when group ID changes', () => {
      const { rerender } = render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const newGroupId = 'group-2';
      rerender(
        <ChatWindow
          groupId={newGroupId}
          groupName="New Group"
          messages={[]}
          members={[]}
          isLoading={false}
        />
      );

      expect(websocketService.leaveGroup).toHaveBeenCalledWith(mockGroupId);
      expect(websocketService.joinGroup).toHaveBeenCalledWith(newGroupId);
    });
  });

  describe('member list', () => {
    it('should toggle member list visibility', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const toggleButton = screen.getByRole('button', { name: 'Toggle member list' });
      fireEvent.click(toggleButton);

      // Check for member names in the member list container
      const memberList = screen.getByTestId('group-members');
      expect(memberList).toBeInTheDocument();

      // Use getAllByText since 'testuser' appears in messages too
      const testUserElements = screen.getAllByText('testuser');
      expect(testUserElements.length).toBeGreaterThan(0);

      const otherUserElements = screen.getAllByText('otheruser');
      expect(otherUserElements.length).toBeGreaterThan(0);

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('should show online status for members', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const toggleButton = screen.getByRole('button', { name: 'Toggle member list' });
      fireEvent.click(toggleButton);

      expect(screen.getByLabelText('testuser is online')).toBeInTheDocument();
      expect(screen.getByLabelText('otheruser is offline')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      expect(screen.getByRole('region', { name: 'Chat window' })).toBeInTheDocument();
      expect(screen.getByRole('log', { name: 'Chat messages' })).toBeInTheDocument();
      expect(screen.getByRole('form', { name: 'Send message' })).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      const sendButton = screen.getByRole('button', { name: 'Send message' });
      const toggleButton = screen.getByRole('button', { name: 'Toggle member list' });

      expect(input).toHaveAttribute('tabIndex', '0');
      expect(sendButton).toHaveAttribute('tabIndex', '0');
      expect(toggleButton).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('error handling', () => {
    it('should display error message when connection fails', () => {
      const onRetry = vi.fn();

      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
          error="Connection failed"
          onRetry={onRetry}
        />
      );

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry connection' })).toBeInTheDocument();
    });

    it('should retry connection when retry button is clicked', () => {
      const onRetry = vi.fn();

      render(
        <ChatWindow
          groupId={mockGroupId}
          groupName={mockGroupName}
          messages={mockMessages}
          members={mockMembers}
          isLoading={false}
          error="Connection failed"
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: 'Retry connection' });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });
  });
});