import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  chatService,
  type Group,
  type GroupMember,
  type Message,
  type CreateGroupRequest,
  type UpdateGroupRequest,
  type SendMessageRequest,
  type GetGroupsQuery,
  type GetMessagesQuery,
  type PaginatedResult,
} from '../services/chat.service';
import type { ApiResponse } from '../services/api';

interface ChatState {
  // Data
  groups: Group[];
  selectedGroup: Group | null;
  groupMembers: Record<string, GroupMember[]>;
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedGroupId: string | null;

  // Actions
  fetchGroups: (query?: GetGroupsQuery) => Promise<void>;
  createGroup: (data: CreateGroupRequest) => Promise<ApiResponse<Group>>;
  selectGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, data: UpdateGroupRequest) => Promise<ApiResponse<Group>>;
  deleteGroup: (groupId: string) => Promise<ApiResponse<{ message: string }>>;

  // Member actions
  fetchGroupMembers: (groupId: string) => Promise<void>;
  addMember: (groupId: string, userId: string, role?: string) => Promise<void>;
  removeMember: (groupId: string, userId: string) => Promise<void>;

  // Message actions
  fetchMessages: (groupId: string, query?: GetMessagesQuery) => Promise<void>;
  sendMessage: (groupId: string, data: SendMessageRequest) => Promise<void>;
  updateMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  // Utility actions
  clearError: () => void;
  clearSelection: () => void;
  joinGroupByInviteCode: (inviteCode: string) => Promise<ApiResponse<Group>>;
  markAsRead: (messageId: string) => Promise<void>;
  fetchUnreadCount: (groupId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      groups: [],
      selectedGroup: null,
      groupMembers: {},
      messages: {},
      unreadCounts: {},
      isLoading: false,
      error: null,
      selectedGroupId: null,

      // Fetch all groups
      fetchGroups: async (query?: GetGroupsQuery) => {
        set({ isLoading: true, error: null });

        try {
          const response = await chatService.getGroups(query);

          if (response.success && response.data) {
            set({
              groups: response.data.data,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              groups: [],
              isLoading: false,
              error: response.error || 'Failed to fetch groups',
            });
          }
        } catch (error) {
          set({
            groups: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch groups',
          });
        }
      },

      // Create new group
      createGroup: async (data: CreateGroupRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await chatService.createGroup(data);

          if (response.success && response.data) {
            const currentGroups = get().groups;
            set({
              groups: [response.data, ...currentGroups],
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to create group',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create group';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Select and fetch detailed group data
      selectGroup: async (groupId: string) => {
        set({ isLoading: true, error: null, selectedGroupId: groupId });

        try {
          const response = await chatService.getGroup(groupId);

          if (response.success && response.data) {
            set({
              selectedGroup: response.data,
              isLoading: false,
              error: null,
            });

            // Also fetch messages and members for this group
            get().fetchMessages(groupId);
            get().fetchGroupMembers(groupId);
            get().fetchUnreadCount(groupId);
          } else {
            set({
              selectedGroup: null,
              isLoading: false,
              error: response.error || 'Failed to fetch group',
            });
          }
        } catch (error) {
          set({
            selectedGroup: null,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch group',
          });
        }
      },

      // Update existing group
      updateGroup: async (groupId: string, data: UpdateGroupRequest) => {
        set({ isLoading: true, error: null });

        try {
          const response = await chatService.updateGroup(groupId, data);

          if (response.success && response.data) {
            const currentGroups = get().groups;
            const updatedGroups = currentGroups.map(group =>
              group.id === groupId ? response.data! : group
            );

            const currentSelected = get().selectedGroup;
            const updatedSelected = currentSelected?.id === groupId ? response.data : currentSelected;

            set({
              groups: updatedGroups,
              selectedGroup: updatedSelected,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to update group',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update group';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Delete group
      deleteGroup: async (groupId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await chatService.deleteGroup(groupId);

          if (response.success) {
            const currentGroups = get().groups;
            const updatedGroups = currentGroups.filter(group => group.id !== groupId);

            const currentSelected = get().selectedGroup;
            const updatedSelected = currentSelected?.id === groupId ? null : currentSelected;

            set({
              groups: updatedGroups,
              selectedGroup: updatedSelected,
              selectedGroupId: updatedSelected?.id || null,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to delete group',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete group';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Fetch group members
      fetchGroupMembers: async (groupId: string) => {
        try {
          const response = await chatService.getMembers(groupId);

          if (response.success && response.data) {
            set(state => ({
              groupMembers: {
                ...state.groupMembers,
                [groupId]: response.data!,
              },
            }));
          }
        } catch (error) {
          console.error('Failed to fetch group members:', error);
        }
      },

      // Add member to group
      addMember: async (groupId: string, userId: string, role = 'MEMBER') => {
        try {
          const response = await chatService.addMember(groupId, userId, role as any);

          if (response.success) {
            get().fetchGroupMembers(groupId);
          }
        } catch (error) {
          console.error('Failed to add member:', error);
        }
      },

      // Remove member from group
      removeMember: async (groupId: string, userId: string) => {
        try {
          const response = await chatService.removeMember(groupId, userId);

          if (response.success) {
            get().fetchGroupMembers(groupId);
          }
        } catch (error) {
          console.error('Failed to remove member:', error);
        }
      },

      // Fetch messages for a group
      fetchMessages: async (groupId: string, query?: GetMessagesQuery) => {
        try {
          const response = await chatService.getMessages(groupId, query);

          if (response.success && response.data) {
            set(state => ({
              messages: {
                ...state.messages,
                [groupId]: response.data!.data,
              },
            }));
          }
        } catch (error) {
          console.error('Failed to fetch messages:', error);
        }
      },

      // Send message to group
      sendMessage: async (groupId: string, data: SendMessageRequest) => {
        try {
          const response = await chatService.sendMessage(groupId, data);

          if (response.success && response.data) {
            set(state => ({
              messages: {
                ...state.messages,
                [groupId]: [...(state.messages[groupId] || []), response.data!],
              },
            }));
          }
        } catch (error) {
          console.error('Failed to send message:', error);
        }
      },

      // Update message
      updateMessage: async (messageId: string, content: string) => {
        try {
          const response = await chatService.updateMessage(messageId, content);

          if (response.success && response.data) {
            const state = get();
            const updatedMessages = { ...state.messages };

            // Find and update the message across all groups
            Object.keys(updatedMessages).forEach(groupId => {
              updatedMessages[groupId] = updatedMessages[groupId].map(msg =>
                msg.id === messageId ? response.data! : msg
              );
            });

            set({ messages: updatedMessages });
          }
        } catch (error) {
          console.error('Failed to update message:', error);
        }
      },

      // Delete message
      deleteMessage: async (messageId: string) => {
        try {
          const response = await chatService.deleteMessage(messageId);

          if (response.success) {
            const state = get();
            const updatedMessages = { ...state.messages };

            // Remove the message from all groups
            Object.keys(updatedMessages).forEach(groupId => {
              updatedMessages[groupId] = updatedMessages[groupId].filter(msg => msg.id !== messageId);
            });

            set({ messages: updatedMessages });
          }
        } catch (error) {
          console.error('Failed to delete message:', error);
        }
      },

      // Join group by invite code
      joinGroupByInviteCode: async (inviteCode: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await chatService.joinGroupByInviteCode(inviteCode);

          if (response.success && response.data) {
            const currentGroups = get().groups;
            set({
              groups: [response.data, ...currentGroups],
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Failed to join group',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to join group';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      // Mark message as read
      markAsRead: async (messageId: string) => {
        try {
          await chatService.markAsRead(messageId);
        } catch (error) {
          console.error('Failed to mark message as read:', error);
        }
      },

      // Fetch unread count for a group
      fetchUnreadCount: async (groupId: string) => {
        try {
          const response = await chatService.getUnreadCount(groupId);

          if (response.success && response.data) {
            set(state => ({
              unreadCounts: {
                ...state.unreadCounts,
                [groupId]: response.data!.unreadCount,
              },
            }));
          }
        } catch (error) {
          console.error('Failed to fetch unread count:', error);
        }
      },

      // Utility actions
      clearError: () => {
        set({ error: null });
      },

      clearSelection: () => {
        set({
          selectedGroup: null,
          selectedGroupId: null,
        });
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        // Only persist groups list and selected group ID
        groups: state.groups,
        selectedGroupId: state.selectedGroupId,
      }),
    }
  )
);