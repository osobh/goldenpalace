import { MessageRepository, type MessageWithDetails } from '../repositories/message.repository';
import { GroupRepository } from '../repositories/group.repository';
import { UserRepository } from '../repositories/user.repository';
import type {
  CreateMessageInput,
  UpdateMessageInput,
  GetMessagesQuery,
  PaginatedResult,
  ServiceResult
} from '@golden-palace/shared';

export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly groupRepository: GroupRepository,
    private readonly userRepository: UserRepository
  ) {}

  async createMessage(
    userId: string,
    input: CreateMessageInput
  ): Promise<ServiceResult<MessageWithDetails>> {
    try {
      // Validate input
      const validation = this.validateCreateMessageInput(input);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check if group exists
      const group = await this.groupRepository.findById(input.groupId!);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      // Check if user is a member of the group
      const isMember = await this.groupRepository.isUserMember(input.groupId!, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      // Validate reply message if specified
      if (input.replyToId) {
        const replyMessage = await this.messageRepository.findReplyToMessage(input.replyToId, input.groupId!);
        if (!replyMessage) {
          return { success: false, error: 'Reply message not found' };
        }
      }

      // Create message
      const message = await this.messageRepository.create({
        groupId: input.groupId!,
        userId,
        content: input.content,
        messageType: input.messageType,
        attachments: input.attachments,
        replyToId: input.replyToId
      });

      return { success: true, data: message };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getMessages(
    userId: string,
    groupId: string,
    query: GetMessagesQuery = {}
  ): Promise<ServiceResult<PaginatedResult<MessageWithDetails>>> {
    try {
      // Check if user is a member of the group
      const isMember = await this.groupRepository.isUserMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      const result = await this.messageRepository.findByGroupId(groupId, query);

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateMessage(
    userId: string,
    messageId: string,
    input: UpdateMessageInput
  ): Promise<ServiceResult<MessageWithDetails>> {
    try {
      // Find the message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      // Check if user is the author
      if (message.userId !== userId) {
        return { success: false, error: 'You are not authorized to edit this message' };
      }

      // Check if message is too old to edit
      const tooOld = await this.messageRepository.isMessageTooOldToEdit(messageId);
      if (tooOld) {
        return { success: false, error: 'Message is too old to edit' };
      }

      // Update message
      const updatedMessage = await this.messageRepository.update(messageId, {
        content: input.content,
        attachments: input.attachments,
        editedAt: new Date()
      });

      return { success: true, data: updatedMessage };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteMessage(userId: string, messageId: string): Promise<ServiceResult<void>> {
    try {
      // Find the message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      // Check if user is the author or a moderator
      const canDelete = message.userId === userId ||
        await this.groupRepository.hasPermission(message.groupId, userId, ['OWNER', 'MODERATOR']);

      if (!canDelete) {
        return { success: false, error: 'You are not authorized to delete this message' };
      }

      // Soft delete the message
      await this.messageRepository.softDelete(messageId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async addReaction(
    userId: string,
    messageId: string,
    emoji: string
  ): Promise<ServiceResult<any>> {
    try {
      // Find the message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      // Check if user is a member of the group
      const isMember = await this.groupRepository.isUserMember(message.groupId, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      // Validate emoji
      if (!this.isValidEmoji(emoji)) {
        return { success: false, error: 'Invalid emoji format' };
      }

      // Check if user already reacted with this emoji
      const existingReaction = await this.messageRepository.findReaction(messageId, userId, emoji);
      if (existingReaction) {
        return { success: false, error: 'You have already reacted with this emoji' };
      }

      // Add reaction
      const reaction = await this.messageRepository.addReaction(messageId, userId, emoji);

      return { success: true, data: reaction };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add reaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async removeReaction(
    userId: string,
    messageId: string,
    emoji: string
  ): Promise<ServiceResult<void>> {
    try {
      // Find the message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      // Check if reaction exists
      const existingReaction = await this.messageRepository.findReaction(messageId, userId, emoji);
      if (!existingReaction) {
        return { success: false, error: 'Reaction not found' };
      }

      // Remove reaction
      await this.messageRepository.removeReaction(messageId, userId, emoji);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove reaction: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async markAsRead(userId: string, messageId: string): Promise<ServiceResult<void>> {
    try {
      // Find the message
      const message = await this.messageRepository.findById(messageId);
      if (!message) {
        return { success: false, error: 'Message not found' };
      }

      // Check if user is a member of the group
      const isMember = await this.groupRepository.isUserMember(message.groupId, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      // Mark as read
      await this.messageRepository.markAsRead(messageId, userId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to mark message as read: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getUnreadCount(userId: string, groupId: string): Promise<ServiceResult<number>> {
    try {
      // Check if user is a member of the group
      const isMember = await this.groupRepository.isUserMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      const count = await this.messageRepository.getUnreadCount(userId, groupId);

      return { success: true, data: count };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get unread count: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async searchMessages(
    userId: string,
    groupId: string,
    query: string
  ): Promise<ServiceResult<MessageWithDetails[]>> {
    try {
      // Check if user is a member of the group
      const isMember = await this.groupRepository.isUserMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      if (!query || query.trim().length === 0) {
        return { success: true, data: [] };
      }

      const messages = await this.messageRepository.searchMessages(groupId, query.trim());

      return { success: true, data: messages };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search messages: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private validateCreateMessageInput(input: CreateMessageInput): { valid: boolean; error?: string } {
    if (!input.groupId) {
      return { valid: false, error: 'Group ID is required' };
    }

    if (!input.messageType) {
      return { valid: false, error: 'Message type is required' };
    }

    if (input.content && input.content.length > 10000) {
      return { valid: false, error: 'Message content is too long (max 10,000 characters)' };
    }

    // For text messages, content is required
    if (input.messageType === 'TEXT' && (!input.content || input.content.trim().length === 0)) {
      return { valid: false, error: 'Content is required for text messages' };
    }

    // For other message types, at least content or attachments is required
    if (input.messageType !== 'TEXT' && !input.content && !input.attachments) {
      return { valid: false, error: 'Either content or attachments is required' };
    }

    return { valid: true };
  }

  private isValidEmoji(emoji: string): boolean {
    // Simple emoji validation - check if it's a valid Unicode emoji
    const emojiRegex = /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F0FF}]|[\u{1F0A0}-\u{1F0FF}]|[👍👎❤️🔥💯]$/u;
    return emojiRegex.test(emoji) && emoji.length <= 10;
  }
}