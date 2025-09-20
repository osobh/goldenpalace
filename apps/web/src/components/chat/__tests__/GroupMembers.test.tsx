import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GroupMembers } from '../GroupMembers';
import { useAuthStore } from '../../../stores/authStore';
import type { GroupMember } from '../../../services/websocket.service';

// Mock the auth store
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'USER' as const,
  isVerified: true,
  createdAt: '2023-01-01T00:00:00Z',
};

const mockMembers: GroupMember[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    username: 'testuser',
    role: 'ADMIN',
    joinedAt: '2023-11-01T00:00:00Z',
    isOnline: true,
    lastSeen: '2023-12-01T10:02:00Z',
    permissions: ['MANAGE_MEMBERS', 'DELETE_MESSAGES', 'MODERATE_CHAT'],
  },
  {
    id: 'member-2',
    userId: 'user-2',
    username: 'otheruser',
    role: 'MODERATOR',
    joinedAt: '2023-11-15T00:00:00Z',
    isOnline: true,
    lastSeen: '2023-12-01T10:01:00Z',
    permissions: ['DELETE_MESSAGES', 'MODERATE_CHAT'],
  },
  {
    id: 'member-3',
    userId: 'user-3',
    username: 'trader123',
    role: 'MEMBER',
    joinedAt: '2023-11-20T00:00:00Z',
    isOnline: false,
    lastSeen: '2023-12-01T09:30:00Z', // 30 minutes before 10:00:00Z
  },
  {
    id: 'member-4',
    userId: 'user-4',
    username: 'investor456',
    role: 'MEMBER',
    joinedAt: '2023-11-25T00:00:00Z',
    isOnline: false,
    lastSeen: '2023-11-30T10:00:00Z', // 1 day before 10:00:00Z
  },
];

describe('GroupMembers', () => {
  const mockOnMemberAction = vi.fn();

  // Mock the current time to make relative time calculations predictable
  const mockCurrentTime = new Date('2023-12-01T10:00:00Z').getTime();

  // Use fake timers only for date-related tests
  const setupFakeTimers = () => {
    vi.useFakeTimers();
    vi.setSystemTime(mockCurrentTime);
  };

  const cleanupFakeTimers = () => {
    vi.useRealTimers();
  };

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
    it('should render member list with all members', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('otheruser')).toBeInTheDocument();
      expect(screen.getByText('trader123')).toBeInTheDocument();
      expect(screen.getByText('investor456')).toBeInTheDocument();
    });

    it('should show member count', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByText('4 members')).toBeInTheDocument();
    });

    it('should show online member count', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByText('2 online')).toBeInTheDocument();
    });

    it('should render empty state when no members', () => {
      render(
        <GroupMembers
          members={[]}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByText('No members')).toBeInTheDocument();
      expect(screen.getByText('This group has no members yet.')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByRole('region', { name: 'Group members' })).toBeInTheDocument();
      expect(screen.getByRole('list', { name: 'Member list' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });
  });

  describe('member display', () => {
    it('should show member roles', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('Moderator')).toBeInTheDocument();
      expect(screen.getAllByText('Member')).toHaveLength(2);
    });

    it('should show online status indicators', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByLabelText('testuser is online')).toBeInTheDocument();
      expect(screen.getByLabelText('otheruser is online')).toBeInTheDocument();
      expect(screen.getByLabelText('trader123 is offline')).toBeInTheDocument();
      expect(screen.getByLabelText('investor456 is offline')).toBeInTheDocument();
    });

    it('should show last seen time for offline members', () => {
      setupFakeTimers();
      try {
        render(
          <GroupMembers
            members={mockMembers}
            onMemberAction={mockOnMemberAction}
            groupId="group-1"
          />
        );

        expect(screen.getByText('Last seen 30 minutes ago')).toBeInTheDocument();
        expect(screen.getByText('Last seen 1 day ago')).toBeInTheDocument();
      } finally {
        cleanupFakeTimers();
      }
    });

    it('should show join date', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByText('Joined Nov 1, 2023')).toBeInTheDocument();
      expect(screen.getByText('Joined Nov 15, 2023')).toBeInTheDocument();
      expect(screen.getByText('Joined Nov 20, 2023')).toBeInTheDocument();
      expect(screen.getByText('Joined Nov 25, 2023')).toBeInTheDocument();
    });

    it('should highlight current user', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const currentUserElement = screen.getByText('testuser').closest('[data-member-id]');
      expect(currentUserElement).toHaveClass('current-user');
      expect(screen.getByText('(You)')).toBeInTheDocument();
    });
  });

  describe('member filtering and sorting', () => {
    it('should show search input', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByPlaceholderText('Search members...')).toBeInTheDocument();
    });

    it('should filter members by search term', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const searchInput = screen.getByPlaceholderText('Search members...');
      fireEvent.change(searchInput, { target: { value: 'trader' } });

      await waitFor(() => {
        expect(screen.getByText('trader123')).toBeInTheDocument();
        expect(screen.queryByText('testuser')).not.toBeInTheDocument();
        expect(screen.queryByText('otheruser')).not.toBeInTheDocument();
        expect(screen.queryByText('investor456')).not.toBeInTheDocument();
      });
    });

    it('should show filter options', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by role')).toBeInTheDocument();
    });

    it('should filter by online status', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const statusFilter = screen.getByLabelText('Filter by status');
      fireEvent.change(statusFilter, { target: { value: 'online' } });

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('otheruser')).toBeInTheDocument();
        expect(screen.queryByText('trader123')).not.toBeInTheDocument();
        expect(screen.queryByText('investor456')).not.toBeInTheDocument();
      });
    });

    it('should filter by role', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const roleFilter = screen.getByLabelText('Filter by role');
      fireEvent.change(roleFilter, { target: { value: 'ADMIN' } });

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.queryByText('otheruser')).not.toBeInTheDocument();
        expect(screen.queryByText('trader123')).not.toBeInTheDocument();
        expect(screen.queryByText('investor456')).not.toBeInTheDocument();
      });
    });

    it('should sort members by different criteria', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByLabelText('Sort members by')).toBeInTheDocument();

      const sortSelect = screen.getByLabelText('Sort members by');
      fireEvent.change(sortSelect, { target: { value: 'role' } });

      // Members should be sorted by role (Admin, Moderator, Member)
      const memberElements = screen.getAllByRole('listitem');
      const memberTexts = memberElements.map(el => el.textContent);

      expect(memberTexts[0]).toContain('testuser'); // Admin
      expect(memberTexts[1]).toContain('otheruser'); // Moderator
    });
  });

  describe('member actions', () => {
    it('should show member menu for admin users', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('trader123').closest('[data-member-id]');
      fireEvent.mouseEnter(memberElement!);

      expect(screen.getByRole('button', { name: 'Member actions' })).toBeInTheDocument();
    });

    it('should not show member menu for regular members', () => {
      const regularUserStore = {
        ...mockUser,
        id: 'user-3',
        username: 'trader123',
      };

      vi.mocked(useAuthStore).mockReturnValue({
        user: regularUserStore,
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

      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('testuser').closest('[data-member-id]');
      fireEvent.mouseEnter(memberElement!);

      expect(screen.queryByRole('button', { name: 'Member actions' })).not.toBeInTheDocument();
    });

    it('should show promote option for members', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('trader123').closest('[data-member-id]');
      fireEvent.mouseEnter(memberElement!);

      const actionsButton = screen.getByRole('button', { name: 'Member actions' });
      fireEvent.click(actionsButton);

      expect(screen.getByRole('menuitem', { name: 'Promote to Moderator' })).toBeInTheDocument();
    });

    it('should show demote option for moderators', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('otheruser').closest('[data-member-id]');
      fireEvent.mouseEnter(memberElement!);

      const actionsButton = screen.getByRole('button', { name: 'Member actions' });
      fireEvent.click(actionsButton);

      expect(screen.getByRole('menuitem', { name: 'Demote to Member' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'Promote to Admin' })).toBeInTheDocument();
    });

    it('should show remove option for all members except current user', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('trader123').closest('[data-member-id]');
      fireEvent.mouseEnter(memberElement!);

      const actionsButton = screen.getByRole('button', { name: 'Member actions' });
      fireEvent.click(actionsButton);

      expect(screen.getByRole('menuitem', { name: 'Remove from group' })).toBeInTheDocument();
    });

    it('should call onMemberAction when promote is clicked', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('trader123').closest('[data-member-id]');
      fireEvent.mouseEnter(memberElement!);

      const actionsButton = screen.getByRole('button', { name: 'Member actions' });
      fireEvent.click(actionsButton);

      const promoteButton = screen.getByRole('menuitem', { name: 'Promote to Moderator' });
      fireEvent.click(promoteButton);

      await waitFor(() => {
        expect(mockOnMemberAction).toHaveBeenCalledWith({
          action: 'promote',
          memberId: 'member-3',
          newRole: 'MODERATOR',
        });
      });
    });

    it('should call onMemberAction when remove is clicked', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('trader123').closest('[data-member-id]');
      fireEvent.mouseEnter(memberElement!);

      const actionsButton = screen.getByRole('button', { name: 'Member actions' });
      fireEvent.click(actionsButton);

      const removeButton = screen.getByRole('menuitem', { name: 'Remove from group' });
      fireEvent.click(removeButton);

      const confirmButton = screen.getByRole('button', { name: 'Remove member' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnMemberAction).toHaveBeenCalledWith({
          action: 'remove',
          memberId: 'member-3',
        });
      });
    });
  });

  describe('member invitations', () => {
    it('should show invite button for admins', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByRole('button', { name: 'Invite members' })).toBeInTheDocument();
    });

    it('should not show invite button for regular members', () => {
      const regularUserStore = {
        ...mockUser,
        id: 'user-3',
        username: 'trader123',
      };

      vi.mocked(useAuthStore).mockReturnValue({
        user: regularUserStore,
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

      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.queryByRole('button', { name: 'Invite members' })).not.toBeInTheDocument();
    });

    it('should open invite dialog when invite button is clicked', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const inviteButton = screen.getByRole('button', { name: 'Invite members' });
      fireEvent.click(inviteButton);

      expect(screen.getByRole('dialog', { name: 'Invite members' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username or email')).toBeInTheDocument();
    });

    it('should send invite when form is submitted', async () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const inviteButton = screen.getByRole('button', { name: 'Invite members' });
      fireEvent.click(inviteButton);

      const input = screen.getByPlaceholderText('Enter username or email');
      fireEvent.change(input, { target: { value: 'newuser@example.com' } });

      const sendButton = screen.getByRole('button', { name: 'Send invite' });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnMemberAction).toHaveBeenCalledWith({
          action: 'invite',
          email: 'newuser@example.com',
        });
      });
    });
  });

  describe('member profiles', () => {
    it('should show member profile when clicked', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      // Get the member element from the list, not the dialog
      const memberElements = screen.getAllByText('trader123');
      const memberElement = memberElements[0]; // First occurrence is in the list
      fireEvent.click(memberElement);

      expect(screen.getByRole('dialog', { name: 'Member profile' })).toBeInTheDocument();
      // Now trader123 appears twice - in list and dialog
      expect(screen.getAllByText('trader123')).toHaveLength(2);
      expect(screen.getByText('Member since Nov 20, 2023')).toBeInTheDocument();
    });

    it('should show member permissions in profile', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('otheruser');
      fireEvent.click(memberElement);

      expect(screen.getByText('Permissions')).toBeInTheDocument();
      expect(screen.getByText('Delete messages')).toBeInTheDocument();
      expect(screen.getByText('Moderate chat')).toBeInTheDocument();
    });

    it('should close profile when close button is clicked', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('trader123');
      fireEvent.click(memberElement);

      const closeButton = screen.getByRole('button', { name: 'Close profile' });
      fireEvent.click(closeButton);

      expect(screen.queryByRole('dialog', { name: 'Member profile' })).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should support keyboard navigation', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElements = screen.getAllByRole('listitem');
      memberElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should announce member count changes', () => {
      const { rerender } = render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const newMember: GroupMember = {
        id: 'member-5',
        userId: 'user-5',
        username: 'newmember',
        role: 'MEMBER',
        joinedAt: '2023-12-01T10:00:00Z',
        isOnline: true,
        lastSeen: '2023-12-01T10:00:00Z',
      };

      rerender(
        <GroupMembers
          members={[...mockMembers, newMember]}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByLabelText('Member count updated: 5 members, 3 online')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for actions', () => {
      render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      const memberElement = screen.getByText('trader123').closest('[data-member-id]');
      fireEvent.mouseEnter(memberElement!);

      const actionsButton = screen.getByRole('button', { name: 'Member actions' });
      expect(actionsButton).toHaveAttribute('aria-haspopup', 'menu');
      expect(actionsButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(actionsButton);
      expect(actionsButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('real-time updates', () => {
    it('should update member online status', () => {
      const { rerender } = render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByLabelText('trader123 is offline')).toBeInTheDocument();

      const updatedMembers = mockMembers.map(member =>
        member.userId === 'user-3' ? { ...member, isOnline: true } : member
      );

      rerender(
        <GroupMembers
          members={updatedMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      expect(screen.getByLabelText('trader123 is online')).toBeInTheDocument();
    });

    it('should show animation for new members', () => {
      vi.useFakeTimers();

      const { rerender } = render(
        <GroupMembers
          members={mockMembers.slice(0, 3)}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      act(() => {
        rerender(
          <GroupMembers
            members={mockMembers}
            onMemberAction={mockOnMemberAction}
            groupId="group-1"
          />
        );
      });

      // Check immediately after render for animation class
      const newMemberElement = screen.getByText('investor456').closest('[data-member-id]');
      expect(newMemberElement).toHaveClass('member-entering');

      // Advance time to verify animation class is removed
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(newMemberElement).not.toHaveClass('member-entering');

      vi.useRealTimers();
    });

    it('should show animation for removed members', () => {
      vi.useFakeTimers();

      const { rerender } = render(
        <GroupMembers
          members={mockMembers}
          onMemberAction={mockOnMemberAction}
          groupId="group-1"
        />
      );

      act(() => {
        rerender(
          <GroupMembers
            members={mockMembers.slice(0, 3)}
            onMemberAction={mockOnMemberAction}
            groupId="group-1"
          />
        );
      });

      // Member should still be in DOM briefly with exit animation
      const removedMemberElement = screen.getByText('investor456').closest('[data-member-id]');
      expect(removedMemberElement).toHaveClass('member-exiting');

      // Advance time to verify member is removed
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.queryByText('investor456')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});