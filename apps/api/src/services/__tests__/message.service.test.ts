import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MessageService } from '../message.service';
import { MessageRepository } from '../../repositories/message.repository';
import { GroupRepository } from '../../repositories/group.repository';
import { UserRepository } from '../../repositories/user.repository';
import { prisma } from '@golden-palace/database';
import type { CreateMessageInput, UpdateMessageInput } from '@golden-palace/shared';

describe('MessageService', () => {
  let messageService: MessageService;
  let messageRepository: MessageRepository;
  let groupRepository: GroupRepository;
  let userRepository: UserRepository;
  let testUser: any;
  let testGroup: any;

  beforeEach(async () => {
    // Clean database before each test
    await prisma.messageReaction.deleteMany();
    await prisma.readReceipt.deleteMany();
    await prisma.message.deleteMany();
    await prisma.groupMembership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.userStats.deleteMany();
    await prisma.user.deleteMany();

    userRepository = new UserRepository();
    groupRepository = new GroupRepository();
    messageRepository = new MessageRepository();
    messageService = new MessageService(messageRepository, groupRepository, userRepository);

    // Create test user
    testUser = await userRepository.create({
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword123'
    });

    // Create test group (owner is automatically added as member)
    testGroup = await groupRepository.create({
      name: 'Test Group',
      description: 'A test group for messaging',
      ownerId: testUser.id,
      groupType: 'PRIVATE'
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.messageReaction.deleteMany();
    await prisma.readReceipt.deleteMany();
    await prisma.message.deleteMany();
    await prisma.groupMembership.deleteMany();
    await prisma.group.deleteMany();
    await prisma.userStats.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('createMessage', () => {
    it('should create a text message successfully', async () => {
      const messageData: CreateMessageInput = {
        groupId: testGroup.id,
        content: 'Hello, this is a test message!',
        messageType: 'TEXT'
      };

      const result = await messageService.createMessage(testUser.id, messageData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.content).toBe(messageData.content);
      expect(result.data!.messageType).toBe('TEXT');
      expect(result.data!.userId).toBe(testUser.id);
      expect(result.data!.groupId).toBe(testGroup.id);
      expect(result.data!.createdAt).toBeDefined();
    });

    it('should create an image message with attachments', async () => {
      const messageData: CreateMessageInput = {
        groupId: testGroup.id,
        content: 'Check out this chart!',
        messageType: 'IMAGE',
        attachments: {
          images: [
            {
              url: 'https://example.com/chart.png',
              width: 800,
              height: 600,
              size: 245760
            }
          ]
        }
      };

      const result = await messageService.createMessage(testUser.id, messageData);

      expect(result.success).toBe(true);
      expect(result.data!.messageType).toBe('IMAGE');
      expect(result.data!.attachments).toBeDefined();
      expect(result.data!.attachments).toEqual(messageData.attachments);
    });

    it('should create a reply message', async () => {
      // First create original message
      const originalMessage = await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Original message',
        messageType: 'TEXT'
      });

      const replyData: CreateMessageInput = {
        groupId: testGroup.id,
        content: 'This is a reply',
        messageType: 'TEXT',
        replyToId: originalMessage.data!.id
      };

      const result = await messageService.createMessage(testUser.id, replyData);

      expect(result.success).toBe(true);
      expect(result.data!.replyToId).toBe(originalMessage.data!.id);
      expect(result.data!.content).toBe(replyData.content);
    });

    it('should fail when user is not a member of the group', async () => {
      // Create another user not in the group
      const otherUser = await userRepository.create({
        email: 'other@example.com',
        username: 'otheruser',
        passwordHash: 'hashedpassword123'
      });

      const messageData: CreateMessageInput = {
        groupId: testGroup.id,
        content: 'Unauthorized message',
        messageType: 'TEXT'
      };

      const result = await messageService.createMessage(otherUser.id, messageData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });

    it('should fail when group does not exist', async () => {
      const messageData: CreateMessageInput = {
        groupId: 'non-existent-group-id',
        content: 'Message to nowhere',
        messageType: 'TEXT'
      };

      const result = await messageService.createMessage(testUser.id, messageData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Group not found');
    });

    it('should fail when replying to non-existent message', async () => {
      const messageData: CreateMessageInput = {
        groupId: testGroup.id,
        content: 'Reply to nothing',
        messageType: 'TEXT',
        replyToId: 'non-existent-message-id'
      };

      const result = await messageService.createMessage(testUser.id, messageData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reply message not found');
    });

    it('should validate message content length', async () => {
      const longContent = 'a'.repeat(10001); // Exceeds 10000 character limit

      const messageData: CreateMessageInput = {
        groupId: testGroup.id,
        content: longContent,
        messageType: 'TEXT'
      };

      const result = await messageService.createMessage(testUser.id, messageData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('getMessages', () => {
    beforeEach(async () => {
      // Create test messages
      await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'First message',
        messageType: 'TEXT'
      });

      await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Second message',
        messageType: 'TEXT'
      });

      await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Third message',
        messageType: 'TEXT'
      });
    });

    it('should retrieve messages for a group with pagination', async () => {
      const result = await messageService.getMessages(testUser.id, testGroup.id, {
        limit: 2,
        page: 1
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.data).toHaveLength(2);
      expect(result.data!.pagination.total).toBe(3);
      expect(result.data!.pagination.hasMore).toBe(true);
    });

    it('should return messages in chronological order (newest first)', async () => {
      const result = await messageService.getMessages(testUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data!.data[0].content).toBe('Third message');
      expect(result.data!.data[1].content).toBe('Second message');
      expect(result.data!.data[2].content).toBe('First message');
    });

    it('should fail when user is not a member of the group', async () => {
      const otherUser = await userRepository.create({
        email: 'other@example.com',
        username: 'otheruser',
        passwordHash: 'hashedpassword123'
      });

      const result = await messageService.getMessages(otherUser.id, testGroup.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });

    it('should include message reactions and read receipts', async () => {
      const message = await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Message with reactions',
        messageType: 'TEXT'
      });

      // Add reaction
      await messageService.addReaction(testUser.id, message.data!.id, '👍');

      // Mark as read
      await messageService.markAsRead(testUser.id, message.data!.id);

      const result = await messageService.getMessages(testUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data!.data[0].reactions).toHaveLength(1);
      expect(result.data!.data[0].reactions[0].emoji).toBe('👍');
      expect(result.data!.data[0].readReceipts).toHaveLength(1);
    });
  });

  describe('updateMessage', () => {
    let testMessage: any;

    beforeEach(async () => {
      const result = await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Original content',
        messageType: 'TEXT'
      });
      testMessage = result.data!;
    });

    it('should update message content successfully', async () => {
      const updateData: UpdateMessageInput = {
        content: 'Updated content'
      };

      const result = await messageService.updateMessage(testUser.id, testMessage.id, updateData);

      expect(result.success).toBe(true);
      expect(result.data!.content).toBe('Updated content');
      expect(result.data!.editedAt).toBeDefined();
    });

    it('should fail when user is not the message author', async () => {
      const otherUser = await userRepository.create({
        email: 'other@example.com',
        username: 'otheruser',
        passwordHash: 'hashedpassword123'
      });

      await groupRepository.addMember(testGroup.id, otherUser.id, 'MEMBER');

      const updateData: UpdateMessageInput = {
        content: 'Unauthorized update'
      };

      const result = await messageService.updateMessage(otherUser.id, testMessage.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should fail when message does not exist', async () => {
      const updateData: UpdateMessageInput = {
        content: 'Update non-existent'
      };

      const result = await messageService.updateMessage(testUser.id, 'non-existent-id', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Message not found');
    });

    it('should prevent editing messages older than 24 hours', async () => {
      // Create old message (simulate by manually setting createdAt)
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      await prisma.message.update({
        where: { id: testMessage.id },
        data: { createdAt: oldDate }
      });

      const updateData: UpdateMessageInput = {
        content: 'Too late to edit'
      };

      const result = await messageService.updateMessage(testUser.id, testMessage.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too old to edit');
    });
  });

  describe('deleteMessage', () => {
    let testMessage: any;

    beforeEach(async () => {
      const result = await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Message to delete',
        messageType: 'TEXT'
      });
      testMessage = result.data!;
    });

    it('should soft delete message successfully', async () => {
      const result = await messageService.deleteMessage(testUser.id, testMessage.id);

      expect(result.success).toBe(true);

      // Verify message is soft deleted
      const deletedMessage = await prisma.message.findUnique({
        where: { id: testMessage.id }
      });
      expect(deletedMessage!.deletedAt).toBeDefined();
    });

    it('should fail when user is not the message author', async () => {
      const otherUser = await userRepository.create({
        email: 'other@example.com',
        username: 'otheruser',
        passwordHash: 'hashedpassword123'
      });

      await groupRepository.addMember(testGroup.id, otherUser.id, 'MEMBER');

      const result = await messageService.deleteMessage(otherUser.id, testMessage.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should allow group moderators to delete any message', async () => {
      const moderator = await userRepository.create({
        email: 'mod@example.com',
        username: 'moderator',
        passwordHash: 'hashedpassword123'
      });

      await groupRepository.addMember(testGroup.id, moderator.id, 'MODERATOR');

      const result = await messageService.deleteMessage(moderator.id, testMessage.id);

      expect(result.success).toBe(true);
    });
  });

  describe('addReaction', () => {
    let testMessage: any;

    beforeEach(async () => {
      const result = await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Message for reactions',
        messageType: 'TEXT'
      });
      testMessage = result.data!;
    });

    it('should add reaction to message successfully', async () => {
      const result = await messageService.addReaction(testUser.id, testMessage.id, '👍');

      expect(result.success).toBe(true);
      expect(result.data!.emoji).toBe('👍');
      expect(result.data!.userId).toBe(testUser.id);
      expect(result.data!.messageId).toBe(testMessage.id);
    });

    it('should prevent duplicate reactions from same user', async () => {
      await messageService.addReaction(testUser.id, testMessage.id, '👍');

      const result = await messageService.addReaction(testUser.id, testMessage.id, '👍');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already reacted');
    });

    it('should validate emoji format', async () => {
      const result = await messageService.addReaction(testUser.id, testMessage.id, 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid emoji');
    });

    it('should fail when user is not group member', async () => {
      const otherUser = await userRepository.create({
        email: 'other@example.com',
        username: 'otheruser',
        passwordHash: 'hashedpassword123'
      });

      const result = await messageService.addReaction(otherUser.id, testMessage.id, '👍');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });
  });

  describe('removeReaction', () => {
    let testMessage: any;

    beforeEach(async () => {
      const result = await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Message for reactions',
        messageType: 'TEXT'
      });
      testMessage = result.data!;

      await messageService.addReaction(testUser.id, testMessage.id, '👍');
    });

    it('should remove reaction successfully', async () => {
      const result = await messageService.removeReaction(testUser.id, testMessage.id, '👍');

      expect(result.success).toBe(true);
    });

    it('should fail when reaction does not exist', async () => {
      const result = await messageService.removeReaction(testUser.id, testMessage.id, '❤️');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Reaction not found');
    });
  });

  describe('markAsRead', () => {
    let testMessage: any;

    beforeEach(async () => {
      const result = await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Message to mark as read',
        messageType: 'TEXT'
      });
      testMessage = result.data!;
    });

    it('should mark message as read successfully', async () => {
      const result = await messageService.markAsRead(testUser.id, testMessage.id);

      expect(result.success).toBe(true);
    });

    it('should update existing read receipt timestamp', async () => {
      await messageService.markAsRead(testUser.id, testMessage.id);

      const firstReadTime = await prisma.readReceipt.findUnique({
        where: {
          userId_messageId: {
            userId: testUser.id,
            messageId: testMessage.id
          }
        }
      });

      // Wait a moment and mark as read again
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await messageService.markAsRead(testUser.id, testMessage.id);

      expect(result.success).toBe(true);

      const secondReadTime = await prisma.readReceipt.findUnique({
        where: {
          userId_messageId: {
            userId: testUser.id,
            messageId: testMessage.id
          }
        }
      });

      expect(secondReadTime!.readAt.getTime()).toBeGreaterThan(firstReadTime!.readAt.getTime());
    });

    it('should fail when user is not group member', async () => {
      const otherUser = await userRepository.create({
        email: 'other@example.com',
        username: 'otheruser',
        passwordHash: 'hashedpassword123'
      });

      const result = await messageService.markAsRead(otherUser.id, testMessage.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });
  });

  describe('getUnreadCount', () => {
    beforeEach(async () => {
      // Create multiple messages
      for (let i = 1; i <= 5; i++) {
        await messageService.createMessage(testUser.id, {
          groupId: testGroup.id,
          content: `Message ${i}`,
          messageType: 'TEXT'
        });
      }
    });

    it('should return correct unread count for user', async () => {
      const result = await messageService.getUnreadCount(testUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(5); // All 5 messages are unread
    });

    it('should return 0 when all messages are read', async () => {
      const messages = await messageService.getMessages(testUser.id, testGroup.id);

      // Mark all messages as read
      for (const message of messages.data!.data) {
        await messageService.markAsRead(testUser.id, message.id);
      }

      const result = await messageService.getUnreadCount(testUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    it('should only count messages after user joined group', async () => {
      // Create new user and add to group after messages exist
      const newUser = await userRepository.create({
        email: 'new@example.com',
        username: 'newuser',
        passwordHash: 'hashedpassword123'
      });

      await groupRepository.addMember(testGroup.id, newUser.id, 'MEMBER');

      const result = await messageService.getUnreadCount(newUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0); // User joined after messages were created
    });
  });

  describe('searchMessages', () => {
    beforeEach(async () => {
      await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Trading strategy discussion',
        messageType: 'TEXT'
      });

      await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'Market analysis for AAPL',
        messageType: 'TEXT'
      });

      await messageService.createMessage(testUser.id, {
        groupId: testGroup.id,
        content: 'General chat message',
        messageType: 'TEXT'
      });
    });

    it('should search messages by content', async () => {
      const result = await messageService.searchMessages(testUser.id, testGroup.id, 'trading');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].content).toContain('Trading');
    });

    it('should perform case-insensitive search', async () => {
      const result = await messageService.searchMessages(testUser.id, testGroup.id, 'MARKET');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].content).toContain('Market');
    });

    it('should return empty array when no matches found', async () => {
      const result = await messageService.searchMessages(testUser.id, testGroup.id, 'nonexistent');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should fail when user is not group member', async () => {
      const otherUser = await userRepository.create({
        email: 'other@example.com',
        username: 'otheruser',
        passwordHash: 'hashedpassword123'
      });

      const result = await messageService.searchMessages(otherUser.id, testGroup.id, 'search');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });
  });
});