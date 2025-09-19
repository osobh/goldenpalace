import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GroupService } from '../group.service';
import { GroupRepository } from '../../repositories/group.repository';
import { UserRepository } from '../../repositories/user.repository';
import { prisma } from '@golden-palace/database';
import type { CreateGroupInput, UpdateGroupInput, GroupRole } from '@golden-palace/shared';

describe('GroupService', () => {
  let groupService: GroupService;
  let groupRepository: GroupRepository;
  let userRepository: UserRepository;
  let testUser: any;
  let otherUser: any;

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
    groupService = new GroupService(groupRepository, userRepository);

    // Create test users
    testUser = await userRepository.create({
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword123'
    });

    otherUser = await userRepository.create({
      email: 'other@example.com',
      username: 'otheruser',
      passwordHash: 'hashedpassword123'
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

  describe('createGroup', () => {
    it('should create a private group successfully', async () => {
      const groupData: CreateGroupInput = {
        name: 'Test Trading Group',
        description: 'A group for testing trading strategies',
        groupType: 'PRIVATE',
        maxMembers: 50
      };

      const result = await groupService.createGroup(testUser.id, groupData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe(groupData.name);
      expect(result.data!.description).toBe(groupData.description);
      expect(result.data!.groupType).toBe('PRIVATE');
      expect(result.data!.ownerId).toBe(testUser.id);
      expect(result.data!.maxMembers).toBe(50);
    });

    it('should create a public group with invite code', async () => {
      const groupData: CreateGroupInput = {
        name: 'Public Trading Group',
        description: 'Open trading discussions',
        groupType: 'PUBLIC',
        maxMembers: 100
      };

      const result = await groupService.createGroup(testUser.id, groupData);

      expect(result.success).toBe(true);
      expect(result.data!.groupType).toBe('PUBLIC');
      expect(result.data!.inviteCode).toBeDefined();
      expect(result.data!.inviteCode).toMatch(/^[A-Z0-9]{8}$/); // 8-character alphanumeric code
    });

    it('should automatically add creator as owner', async () => {
      const groupData: CreateGroupInput = {
        name: 'Owner Test Group',
        groupType: 'PRIVATE'
      };

      const result = await groupService.createGroup(testUser.id, groupData);

      expect(result.success).toBe(true);

      // Verify membership
      const membership = await groupService.getMembership(testUser.id, result.data!.id);
      expect(membership.success).toBe(true);
      expect(membership.data!.role).toBe('OWNER');
      expect(membership.data!.status).toBe('ACTIVE');
    });

    it('should validate group name length', async () => {
      const groupData: CreateGroupInput = {
        name: 'a'.repeat(101), // Exceeds 100 character limit
        groupType: 'PRIVATE'
      };

      const result = await groupService.createGroup(testUser.id, groupData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should validate max members limit', async () => {
      const groupData: CreateGroupInput = {
        name: 'Large Group',
        groupType: 'PRIVATE',
        maxMembers: 1001 // Exceeds 1000 member limit
      };

      const result = await groupService.createGroup(testUser.id, groupData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum members must be between 2 and 1000');
    });

    it('should prevent duplicate group names for same owner', async () => {
      const groupData: CreateGroupInput = {
        name: 'Unique Group Name',
        groupType: 'PRIVATE'
      };

      await groupService.createGroup(testUser.id, groupData);

      const result = await groupService.createGroup(testUser.id, groupData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already have a group with this name');
    });
  });

  describe('updateGroup', () => {
    let testGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Original Group',
        description: 'Original description',
        groupType: 'PRIVATE'
      });
      testGroup = result.data!;
    });

    it('should update group information successfully', async () => {
      const updateData: UpdateGroupInput = {
        name: 'Updated Group Name',
        description: 'Updated description',
        maxMembers: 75
      };

      const result = await groupService.updateGroup(testUser.id, testGroup.id, updateData);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe(updateData.name);
      expect(result.data!.description).toBe(updateData.description);
      expect(result.data!.maxMembers).toBe(75);
      expect(result.data!.updatedAt).toBeDefined();
    });

    it('should only allow owner to update group', async () => {
      const updateData: UpdateGroupInput = {
        name: 'Unauthorized Update'
      };

      const result = await groupService.updateGroup(otherUser.id, testGroup.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should allow moderators to update certain fields', async () => {
      // Add other user as moderator
      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MODERATOR');

      const updateData: UpdateGroupInput = {
        description: 'Moderator updated description'
      };

      const result = await groupService.updateGroup(otherUser.id, testGroup.id, updateData);

      expect(result.success).toBe(true);
      expect(result.data!.description).toBe(updateData.description);
    });

    it('should prevent moderators from changing ownership-only fields', async () => {
      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MODERATOR');

      const updateData: UpdateGroupInput = {
        name: 'Moderator trying to change name',
        groupType: 'PUBLIC'
      };

      const result = await groupService.updateGroup(otherUser.id, testGroup.id, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized to change');
    });
  });

  describe('deleteGroup', () => {
    let testGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Group to Delete',
        groupType: 'PRIVATE'
      });
      testGroup = result.data!;
    });

    it('should delete group successfully by owner', async () => {
      const result = await groupService.deleteGroup(testUser.id, testGroup.id);

      expect(result.success).toBe(true);

      // Verify group is deleted
      const deletedGroup = await groupRepository.findById(testGroup.id);
      expect(deletedGroup).toBeNull();
    });

    it('should only allow owner to delete group', async () => {
      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MODERATOR');

      const result = await groupService.deleteGroup(otherUser.id, testGroup.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should cascade delete all related data', async () => {
      // Add member and create message
      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MEMBER');

      const messageResult = await prisma.message.create({
        data: {
          groupId: testGroup.id,
          userId: testUser.id,
          content: 'Test message',
          messageType: 'TEXT'
        }
      });

      await groupService.deleteGroup(testUser.id, testGroup.id);

      // Verify cascade deletion
      const messages = await prisma.message.findMany({
        where: { groupId: testGroup.id }
      });
      expect(messages).toHaveLength(0);

      const memberships = await prisma.groupMembership.findMany({
        where: { groupId: testGroup.id }
      });
      expect(memberships).toHaveLength(0);
    });
  });

  describe('addMember', () => {
    let testGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Member Test Group',
        groupType: 'PRIVATE'
      });
      testGroup = result.data!;
    });

    it('should add member with specified role', async () => {
      const result = await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MODERATOR');

      expect(result.success).toBe(true);
      expect(result.data!.userId).toBe(otherUser.id);
      expect(result.data!.role).toBe('MODERATOR');
      expect(result.data!.status).toBe('ACTIVE');
    });

    it('should add member with default role', async () => {
      const result = await groupService.addMember(testUser.id, testGroup.id, otherUser.id);

      expect(result.success).toBe(true);
      expect(result.data!.role).toBe('MEMBER');
    });

    it('should only allow owner and moderators to add members', async () => {
      const thirdUser = await userRepository.create({
        email: 'third@example.com',
        username: 'thirduser',
        passwordHash: 'hashedpassword123'
      });

      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MEMBER');

      const result = await groupService.addMember(otherUser.id, testGroup.id, thirdUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should prevent adding member if group is at capacity', async () => {
      // Create group with max 2 members (owner already takes 1 slot)
      const smallGroup = await groupService.createGroup(testUser.id, {
        name: 'Small Group',
        groupType: 'PRIVATE',
        maxMembers: 2
      });

      expect(smallGroup.success).toBe(true);

      // Add one member to reach capacity
      await groupService.addMember(testUser.id, smallGroup.data!.id, otherUser.id);

      // Create another user to try adding when at capacity
      const thirdUser = await userRepository.create({
        email: 'third@example.com',
        username: 'thirduser',
        passwordHash: 'hashedpassword123'
      });

      const result = await groupService.addMember(testUser.id, smallGroup.data!.id, thirdUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at maximum capacity');
    });

    it('should prevent duplicate memberships', async () => {
      await groupService.addMember(testUser.id, testGroup.id, otherUser.id);

      const result = await groupService.addMember(testUser.id, testGroup.id, otherUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already a member');
    });

    it('should validate user exists', async () => {
      const result = await groupService.addMember(testUser.id, testGroup.id, 'non-existent-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('removeMember', () => {
    let testGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Member Test Group',
        groupType: 'PRIVATE'
      });
      testGroup = result.data!;

      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MEMBER');
    });

    it('should remove member successfully', async () => {
      const result = await groupService.removeMember(testUser.id, testGroup.id, otherUser.id);

      expect(result.success).toBe(true);

      // Verify membership is removed
      const membership = await groupService.getMembership(otherUser.id, testGroup.id);
      expect(membership.success).toBe(false);
    });

    it('should only allow owner and moderators to remove members', async () => {
      const thirdUser = await userRepository.create({
        email: 'third@example.com',
        username: 'thirduser',
        passwordHash: 'hashedpassword123'
      });

      await groupService.addMember(testUser.id, testGroup.id, thirdUser.id);

      const result = await groupService.removeMember(otherUser.id, testGroup.id, thirdUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should allow members to remove themselves', async () => {
      const result = await groupService.removeMember(otherUser.id, testGroup.id, otherUser.id);

      expect(result.success).toBe(true);
    });

    it('should prevent owner from being removed by others', async () => {
      await groupService.updateMemberRole(testUser.id, testGroup.id, otherUser.id, 'MODERATOR');

      const result = await groupService.removeMember(otherUser.id, testGroup.id, testUser.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot remove group owner');
    });

    it('should handle removing non-existent member gracefully', async () => {
      const nonMember = await userRepository.create({
        email: 'nonmember@example.com',
        username: 'nonmember',
        passwordHash: 'hashedpassword123'
      });

      const result = await groupService.removeMember(testUser.id, testGroup.id, nonMember.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });
  });

  describe('updateMemberRole', () => {
    let testGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Role Test Group',
        groupType: 'PRIVATE'
      });
      testGroup = result.data!;

      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MEMBER');
    });

    it('should update member role successfully', async () => {
      const result = await groupService.updateMemberRole(testUser.id, testGroup.id, otherUser.id, 'MODERATOR');

      expect(result.success).toBe(true);
      expect(result.data!.role).toBe('MODERATOR');
    });

    it('should only allow owner to update roles', async () => {
      const thirdUser = await userRepository.create({
        email: 'third@example.com',
        username: 'thirduser',
        passwordHash: 'hashedpassword123'
      });

      await groupService.addMember(testUser.id, testGroup.id, thirdUser.id);

      const result = await groupService.updateMemberRole(otherUser.id, testGroup.id, thirdUser.id, 'MODERATOR');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should prevent changing owner role', async () => {
      const result = await groupService.updateMemberRole(testUser.id, testGroup.id, testUser.id, 'MEMBER');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot change owner role');
    });

    it('should validate role value', async () => {
      const result = await groupService.updateMemberRole(testUser.id, testGroup.id, otherUser.id, 'INVALID_ROLE' as GroupRole);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });
  });

  describe('joinByInviteCode', () => {
    let publicGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Public Join Group',
        groupType: 'PUBLIC'
      });
      publicGroup = result.data!;
    });

    it('should join group with valid invite code', async () => {
      const result = await groupService.joinByInviteCode(otherUser.id, publicGroup.inviteCode);

      expect(result.success).toBe(true);
      expect(result.data!.userId).toBe(otherUser.id);
      expect(result.data!.groupId).toBe(publicGroup.id);
      expect(result.data!.role).toBe('MEMBER');
    });

    it('should fail with invalid invite code', async () => {
      const result = await groupService.joinByInviteCode(otherUser.id, 'INVALID0');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid invite code');
    });

    it('should prevent joining if already a member', async () => {
      await groupService.joinByInviteCode(otherUser.id, publicGroup.inviteCode);

      const result = await groupService.joinByInviteCode(otherUser.id, publicGroup.inviteCode);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already a member');
    });

    it('should prevent joining if group is at capacity', async () => {
      // Create a new group with max 2 members (owner already takes 1)
      const smallPublicGroup = await groupService.createGroup(testUser.id, {
        name: 'Small Public Group',
        groupType: 'PUBLIC',
        maxMembers: 2
      });

      expect(smallPublicGroup.success).toBe(true);

      // Add one member to reach capacity
      await groupService.joinByInviteCode(otherUser.id, smallPublicGroup.data!.inviteCode!);

      // Create another user to try joining when at capacity
      const thirdUser = await userRepository.create({
        email: 'third@example.com',
        username: 'thirduser',
        passwordHash: 'hashedpassword123'
      });

      const result = await groupService.joinByInviteCode(thirdUser.id, smallPublicGroup.data!.inviteCode!);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at maximum capacity');
    });
  });

  describe('getGroups', () => {
    beforeEach(async () => {
      // Create multiple groups
      await groupService.createGroup(testUser.id, {
        name: 'Group 1',
        groupType: 'PRIVATE'
      });

      await groupService.createGroup(testUser.id, {
        name: 'Group 2',
        groupType: 'PUBLIC'
      });

      const group3 = await groupService.createGroup(otherUser.id, {
        name: 'Group 3',
        groupType: 'PRIVATE'
      });

      // Add testUser to group3
      await groupService.addMember(otherUser.id, group3.data!.id, testUser.id);
    });

    it('should return all groups for user with pagination', async () => {
      const result = await groupService.getGroups(testUser.id, {
        page: 1,
        limit: 2
      });

      expect(result.success).toBe(true);
      expect(result.data!.data).toHaveLength(2);
      expect(result.data!.pagination.total).toBe(3);
      expect(result.data!.pagination.hasMore).toBe(true);
    });

    it('should include group details and member count', async () => {
      const result = await groupService.getGroups(testUser.id);

      expect(result.success).toBe(true);
      expect(result.data!.data[0]._count).toBeDefined();
      expect(result.data!.data[0]._count.members).toBeGreaterThan(0);
      expect(result.data!.data[0].owner).toBeDefined();
    });

    it('should filter by group type', async () => {
      const result = await groupService.getGroups(testUser.id, {
        groupType: 'PRIVATE'
      });

      expect(result.success).toBe(true);
      expect(result.data!.data.every(group => group.groupType === 'PRIVATE')).toBe(true);
    });

    it('should search by group name', async () => {
      const result = await groupService.getGroups(testUser.id, {
        search: 'Group 1'
      });

      expect(result.success).toBe(true);
      expect(result.data!.data).toHaveLength(1);
      expect(result.data!.data[0].name).toBe('Group 1');
    });
  });

  describe('getMembers', () => {
    let testGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Members Test Group',
        groupType: 'PRIVATE'
      });
      testGroup = result.data!;

      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MODERATOR');
    });

    it('should return all group members', async () => {
      const result = await groupService.getMembers(testUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Owner + moderator
      expect(result.data!.find(m => m.role === 'OWNER')).toBeDefined();
      expect(result.data!.find(m => m.role === 'MODERATOR')).toBeDefined();
    });

    it('should include user information for each member', async () => {
      const result = await groupService.getMembers(testUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data![0].user).toBeDefined();
      expect(result.data![0].user.username).toBeDefined();
      expect(result.data![0].user.email).toBeDefined();
      expect(result.data![0].user.passwordHash).toBeUndefined(); // Should not include sensitive data
    });

    it('should only allow members to view member list', async () => {
      const nonMember = await userRepository.create({
        email: 'nonmember@example.com',
        username: 'nonmember',
        passwordHash: 'hashedpassword123'
      });

      const result = await groupService.getMembers(nonMember.id, testGroup.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });

    it('should filter members by role', async () => {
      const result = await groupService.getMembers(testUser.id, testGroup.id, 'OWNER');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].role).toBe('OWNER');
    });
  });

  describe('generateNewInviteCode', () => {
    let testGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Invite Code Group',
        groupType: 'PUBLIC'
      });
      testGroup = result.data!;
    });

    it('should generate new invite code successfully', async () => {
      const oldCode = testGroup.inviteCode;

      const result = await groupService.generateNewInviteCode(testUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data!.inviteCode).toBeDefined();
      expect(result.data!.inviteCode).not.toBe(oldCode);
      expect(result.data!.inviteCode).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('should only allow owner to generate new invite code', async () => {
      await groupService.addMember(testUser.id, testGroup.id, otherUser.id, 'MODERATOR');

      const result = await groupService.generateNewInviteCode(otherUser.id, testGroup.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should fail for private groups', async () => {
      const privateGroup = await groupService.createGroup(testUser.id, {
        name: 'Private Group',
        groupType: 'PRIVATE'
      });

      const result = await groupService.generateNewInviteCode(testUser.id, privateGroup.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Private groups do not have invite codes');
    });
  });

  describe('getMembership', () => {
    let testGroup: any;

    beforeEach(async () => {
      const result = await groupService.createGroup(testUser.id, {
        name: 'Membership Test Group',
        groupType: 'PRIVATE'
      });
      testGroup = result.data!;
    });

    it('should return membership details for member', async () => {
      const result = await groupService.getMembership(testUser.id, testGroup.id);

      expect(result.success).toBe(true);
      expect(result.data!.role).toBe('OWNER');
      expect(result.data!.status).toBe('ACTIVE');
      expect(result.data!.joinedAt).toBeDefined();
    });

    it('should fail for non-members', async () => {
      const result = await groupService.getMembership(otherUser.id, testGroup.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a member');
    });

    it('should return null for non-existent group', async () => {
      const result = await groupService.getMembership(testUser.id, 'non-existent-group-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Group not found');
    });
  });
});