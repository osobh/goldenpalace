import { apiClient, type ApiResponse } from './api';

export type GroupType = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type GroupRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
export type MembershipStatus = 'ACTIVE' | 'PENDING' | 'BANNED';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'TRADE_IDEA' | 'SYSTEM';

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  ownerId: string;
  groupType: GroupType;
  inviteCode?: string;
  maxMembers: number;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  unreadCount?: number;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupRole;
  status: MembershipStatus;
  joinedAt: string;
  leftAt?: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface Message {
  id: string;
  groupId: string;
  userId: string;
  content?: string;
  messageType: MessageType;
  attachments?: Array<{
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
  editedAt?: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    userReacted: boolean;
  }>;
  readBy?: Array<{
    userId: string;
    readAt: string;
  }>;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  groupType: GroupType;
  maxMembers?: number;
  avatarUrl?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  maxMembers?: number;
  groupType?: GroupType;
}

export interface SendMessageRequest {
  content?: string;
  messageType?: MessageType;
  attachments?: Array<{
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  }>;
}

export interface GetGroupsQuery {
  page?: number;
  limit?: number;
  search?: string;
  groupType?: GroupType;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'memberCount';
  sortOrder?: 'asc' | 'desc';
}

export interface GetMessagesQuery {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export class ChatService {
  // Group management
  async createGroup(data: CreateGroupRequest): Promise<ApiResponse<Group>> {
    return apiClient.post<Group>('/chat/groups', data);
  }

  async getGroups(query?: GetGroupsQuery): Promise<ApiResponse<PaginatedResult<Group>>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.search) params.append('search', query.search);
    if (query?.groupType) params.append('groupType', query.groupType);
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const queryString = params.toString();
    const endpoint = queryString ? `/chat/groups?${queryString}` : '/chat/groups';

    return apiClient.get<PaginatedResult<Group>>(endpoint);
  }

  async getGroup(groupId: string): Promise<ApiResponse<Group>> {
    return apiClient.get<Group>(`/chat/groups/${groupId}`);
  }

  async updateGroup(groupId: string, data: UpdateGroupRequest): Promise<ApiResponse<Group>> {
    return apiClient.put<Group>(`/chat/groups/${groupId}`, data);
  }

  async deleteGroup(groupId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/chat/groups/${groupId}`);
  }

  async joinGroupByInviteCode(inviteCode: string): Promise<ApiResponse<Group>> {
    return apiClient.post<Group>(`/chat/groups/join/${inviteCode}`);
  }

  // Member management
  async addMember(groupId: string, userId: string, role: GroupRole = 'MEMBER'): Promise<ApiResponse<GroupMember>> {
    return apiClient.post<GroupMember>(`/chat/groups/${groupId}/members`, {
      userId,
      role
    });
  }

  async getMembers(groupId: string, role?: GroupRole): Promise<ApiResponse<GroupMember[]>> {
    const endpoint = role ?
      `/chat/groups/${groupId}/members?role=${role}` :
      `/chat/groups/${groupId}/members`;

    return apiClient.get<GroupMember[]>(endpoint);
  }

  async removeMember(groupId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/chat/groups/${groupId}/members/${userId}`);
  }

  async updateMemberRole(groupId: string, userId: string, role: GroupRole): Promise<ApiResponse<GroupMember>> {
    return apiClient.put<GroupMember>(`/chat/groups/${groupId}/members/${userId}`, {
      role
    });
  }

  // Message management
  async sendMessage(groupId: string, data: SendMessageRequest): Promise<ApiResponse<Message>> {
    return apiClient.post<Message>(`/chat/groups/${groupId}/messages`, data);
  }

  async getMessages(groupId: string, query?: GetMessagesQuery): Promise<ApiResponse<PaginatedResult<Message>>> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.before) params.append('before', query.before);
    if (query?.after) params.append('after', query.after);

    const queryString = params.toString();
    const endpoint = queryString ?
      `/chat/groups/${groupId}/messages?${queryString}` :
      `/chat/groups/${groupId}/messages`;

    return apiClient.get<PaginatedResult<Message>>(endpoint);
  }

  async updateMessage(messageId: string, content: string): Promise<ApiResponse<Message>> {
    return apiClient.put<Message>(`/chat/messages/${messageId}`, {
      content
    });
  }

  async deleteMessage(messageId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/chat/messages/${messageId}`);
  }

  // Message reactions
  async addReaction(messageId: string, emoji: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>(`/chat/messages/${messageId}/reactions`, {
      emoji
    });
  }

  async removeReaction(messageId: string, emoji: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.delete<{ message: string }>(`/chat/messages/${messageId}/reactions?emoji=${emoji}`);
  }

  // Read receipts
  async markAsRead(messageId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<{ message: string }>(`/chat/messages/${messageId}/read`);
  }

  async getUnreadCount(groupId: string): Promise<ApiResponse<{ unreadCount: number }>> {
    return apiClient.get<{ unreadCount: number }>(`/chat/groups/${groupId}/unread-count`);
  }

  // Search
  async searchMessages(groupId: string, query: string): Promise<ApiResponse<Message[]>> {
    return apiClient.get<Message[]>(`/chat/groups/${groupId}/search?q=${encodeURIComponent(query)}`);
  }
}

export const chatService = new ChatService();