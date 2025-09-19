import { z } from 'zod';

// Message Types
export const MESSAGE_TYPES = ['TEXT', 'IMAGE', 'FILE', 'TRADE_IDEA', 'CHART', 'SYSTEM'] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];

// Group Types
export const GROUP_TYPES = ['PUBLIC', 'PRIVATE', 'INVITE_ONLY'] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

// Group Roles
export const GROUP_ROLES = ['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER'] as const;
export type GroupRole = (typeof GROUP_ROLES)[number];

// Create Group Schema
export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name must not exceed 100 characters'),
  description: z.string().max(500, 'Description must not exceed 500 characters').optional(),
  groupType: z.enum(GROUP_TYPES).default('PRIVATE'),
  maxMembers: z.number().int().min(2).max(1000).default(100),
});

// Send Message Schema
export const sendMessageSchema = z.object({
  groupId: z.string().cuid('Invalid group ID'),
  content: z.string().max(2000, 'Message must not exceed 2000 characters').optional(),
  messageType: z.enum(MESSAGE_TYPES).default('TEXT'),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        size: z.number(),
        mimeType: z.string(),
      })
    )
    .optional(),
  replyToId: z.string().cuid('Invalid message ID').optional(),
});

// React to Message Schema
export const reactToMessageSchema = z.object({
  messageId: z.string().cuid('Invalid message ID'),
  emoji: z.string().min(1, 'Emoji is required').max(10),
});

// Type inference
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ReactToMessageInput = z.infer<typeof reactToMessageSchema>;

// Additional types for services and API
export type CreateMessageInput = {
  groupId?: string;
  content?: string;
  messageType: MessageType;
  attachments?: {
    images?: Array<{
      url: string;
      width: number;
      height: number;
      size: number;
      caption?: string;
    }>;
    files?: Array<{
      url: string;
      name: string;
      size: number;
      mimeType: string;
    }>;
  };
  replyToId?: string;
};

export type UpdateMessageInput = {
  content?: string;
  attachments?: CreateMessageInput['attachments'];
};

export type UpdateGroupInput = {
  name?: string;
  description?: string;
  maxMembers?: number;
  groupType?: GroupType;
};

export type GetMessagesQuery = {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
};

export type GetGroupsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  groupType?: GroupType;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'memberCount';
  sortOrder?: 'asc' | 'desc';
};

// Response types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// WebSocket Events
export interface SocketEvents {
  // Connection
  'user:connect': { userId: string };
  'user:disconnect': { userId: string };

  // Groups
  'group:join': { groupId: string };
  'group:leave': { groupId: string };

  // Messages
  'message:send': SendMessageInput;
  'message:new': {
    id: string;
    groupId: string;
    userId: string;
    content?: string;
    messageType: MessageType;
    attachments?: Array<{
      url: string;
      filename: string;
      size: number;
      mimeType: string;
    }>;
    replyToId?: string;
    user: {
      id: string;
      username: string;
      avatarUrl?: string;
    };
    createdAt: Date;
  };
  'message:edit': {
    messageId: string;
    content: string;
  };
  'message:delete': {
    messageId: string;
  };
  'message:reaction': ReactToMessageInput & {
    user: {
      id: string;
      username: string;
    };
  };

  // Typing indicators
  'typing:start': {
    groupId: string;
    userId: string;
    username: string;
  };
  'typing:stop': {
    groupId: string;
    userId: string;
  };

  // Read receipts
  'message:read': {
    messageId: string;
    userId: string;
  };

  // User status
  'user:online': {
    userId: string;
    username: string;
  };
  'user:offline': {
    userId: string;
    username: string;
  };
}

// Chat UI State
export interface ChatState {
  activeGroupId?: string;
  messages: Record<string, Array<SocketEvents['message:new']>>;
  typingUsers: Record<string, Array<{ userId: string; username: string }>>;
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;
}

// File Upload Types
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

// Attachment Types
export interface MessageAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
}

// Message Status
export interface MessageStatus {
  sent: boolean;
  delivered: boolean;
  read: boolean;
  readBy: Array<{
    userId: string;
    username: string;
    readAt: Date;
  }>;
}
