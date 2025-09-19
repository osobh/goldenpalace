import { GroupRepository, type GroupWithDetails, type GroupMembershipWithUser } from '../repositories/group.repository';
import { UserRepository } from '../repositories/user.repository';
import type {
  CreateGroupInput,
  UpdateGroupInput,
  GetGroupsQuery,
  PaginatedResult,
  ServiceResult,
  GroupRole
} from '@golden-palace/shared';

export class GroupService {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly userRepository: UserRepository
  ) {}

  async createGroup(
    userId: string,
    input: CreateGroupInput
  ): Promise<ServiceResult<GroupWithDetails>> {
    try {
      // Validate input
      const validation = this.validateCreateGroupInput(input);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check for duplicate group name for this user
      const nameExists = await this.groupRepository.checkGroupNameExists(userId, input.name);
      if (nameExists) {
        return { success: false, error: 'You already have a group with this name' };
      }

      // Generate invite code for public groups
      const inviteCode = input.groupType === 'PUBLIC' ?
        await this.groupRepository.generateInviteCode() : undefined;

      // Create group
      const group = await this.groupRepository.create({
        name: input.name,
        description: input.description,
        ownerId: userId,
        groupType: input.groupType,
        maxMembers: input.maxMembers || 100,
        inviteCode
      });

      return { success: true, data: group };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateGroup(
    userId: string,
    groupId: string,
    input: UpdateGroupInput
  ): Promise<ServiceResult<GroupWithDetails>> {
    try {
      // Find the group
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      // Check permissions
      const canUpdate = await this.canUserUpdateGroup(userId, group, input);
      if (!canUpdate.allowed) {
        return { success: false, error: canUpdate.reason };
      }

      // Validate input
      const validation = this.validateUpdateGroupInput(input);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check for duplicate name if changing name
      if (input.name && input.name !== group.name) {
        const nameExists = await this.groupRepository.checkGroupNameExists(
          group.ownerId,
          input.name,
          groupId
        );
        if (nameExists) {
          return { success: false, error: 'You already have a group with this name' };
        }
      }

      // Update group
      const updatedGroup = await this.groupRepository.update(groupId, input);

      return { success: true, data: updatedGroup };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update group: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteGroup(userId: string, groupId: string): Promise<ServiceResult<void>> {
    try {
      // Find the group
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      // Only owner can delete group
      if (group.ownerId !== userId) {
        return { success: false, error: 'You are not authorized to delete this group' };
      }

      // Delete group (cascade delete will handle members, messages, etc.)
      await this.groupRepository.delete(groupId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete group: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getGroups(
    userId: string,
    query: GetGroupsQuery = {}
  ): Promise<ServiceResult<PaginatedResult<GroupWithDetails>>> {
    try {
      const result = await this.groupRepository.findUserGroups(userId, query);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get groups: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async addMember(
    userId: string,
    groupId: string,
    memberId: string,
    role: GroupRole = 'MEMBER'
  ): Promise<ServiceResult<GroupMembershipWithUser>> {
    try {
      // Find the group
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      // Check if user has permission to add members
      const hasPermission = await this.groupRepository.hasPermission(groupId, userId, ['OWNER', 'MODERATOR']);
      if (!hasPermission) {
        return { success: false, error: 'You are not authorized to add members' };
      }

      // Check if target user exists
      const targetUser = await this.userRepository.findById(memberId);
      if (!targetUser) {
        return { success: false, error: 'User not found' };
      }

      // Check if user is already a member
      const existingMembership = await this.groupRepository.getMembership(groupId, memberId);
      if (existingMembership) {
        return { success: false, error: 'User is already a member of this group' };
      }

      // Check group capacity
      const memberCount = await this.groupRepository.getMemberCount(groupId);
      if (memberCount >= group.maxMembers) {
        return { success: false, error: 'Group is at maximum capacity' };
      }

      // Add member
      const membership = await this.groupRepository.addMember(groupId, memberId, role);

      return { success: true, data: membership };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async removeMember(
    userId: string,
    groupId: string,
    memberId: string
  ): Promise<ServiceResult<void>> {
    try {
      // Find the group
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      // Check if target is the owner
      if (group.ownerId === memberId) {
        return { success: false, error: 'Cannot remove group owner' };
      }

      // Check permissions - users can remove themselves, or moderators can remove others
      const canRemove = userId === memberId ||
        await this.groupRepository.hasPermission(groupId, userId, ['OWNER', 'MODERATOR']);

      if (!canRemove) {
        return { success: false, error: 'You are not authorized to remove this member' };
      }

      // Check if member exists
      const membership = await this.groupRepository.getMembership(groupId, memberId);
      if (!membership) {
        return { success: false, error: 'User is not a member of this group' };
      }

      // Remove member
      await this.groupRepository.removeMember(groupId, memberId);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateMemberRole(
    userId: string,
    groupId: string,
    memberId: string,
    role: GroupRole
  ): Promise<ServiceResult<GroupMembershipWithUser>> {
    try {
      // Find the group
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      // Only owner can update roles
      if (group.ownerId !== userId) {
        return { success: false, error: 'You are not authorized to update member roles' };
      }

      // Cannot change owner role
      if (group.ownerId === memberId) {
        return { success: false, error: 'Cannot change owner role' };
      }

      // Validate role
      if (!this.isValidRole(role)) {
        return { success: false, error: 'Invalid role specified' };
      }

      // Check if member exists
      const membership = await this.groupRepository.getMembership(groupId, memberId);
      if (!membership) {
        return { success: false, error: 'User is not a member of this group' };
      }

      // Update role
      const updatedMembership = await this.groupRepository.updateMemberRole(groupId, memberId, role);

      return { success: true, data: updatedMembership };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update member role: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async joinByInviteCode(
    userId: string,
    inviteCode: string
  ): Promise<ServiceResult<GroupMembershipWithUser>> {
    try {
      // Find group by invite code
      const group = await this.groupRepository.findByInviteCode(inviteCode);
      if (!group) {
        return { success: false, error: 'Invalid invite code' };
      }

      // Check if user is already a member
      const existingMembership = await this.groupRepository.getMembership(group.id, userId);
      if (existingMembership) {
        return { success: false, error: 'You are already a member of this group' };
      }

      // Check group capacity
      const memberCount = await this.groupRepository.getMemberCount(group.id);
      if (memberCount >= group.maxMembers) {
        return { success: false, error: 'Group is at maximum capacity' };
      }

      // Add member
      const membership = await this.groupRepository.addMember(group.id, userId, 'MEMBER');

      return { success: true, data: membership };
    } catch (error) {
      return {
        success: false,
        error: `Failed to join group: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getMembers(
    userId: string,
    groupId: string,
    role?: GroupRole
  ): Promise<ServiceResult<GroupMembershipWithUser[]>> {
    try {
      // Check if user is a member
      const isMember = await this.groupRepository.isUserMember(groupId, userId);
      if (!isMember) {
        return { success: false, error: 'You are not a member of this group' };
      }

      const members = await this.groupRepository.getMembers(groupId, role);

      // Remove sensitive data
      const sanitizedMembers = members.map(member => ({
        ...member,
        user: {
          ...member.user,
          passwordHash: undefined
        }
      }));

      return { success: true, data: sanitizedMembers };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get members: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async generateNewInviteCode(
    userId: string,
    groupId: string
  ): Promise<ServiceResult<{ inviteCode: string }>> {
    try {
      // Find the group
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      // Only owner can generate new invite code
      if (group.ownerId !== userId) {
        return { success: false, error: 'You are not authorized to generate invite codes' };
      }

      // Private groups don't have invite codes
      if (group.groupType === 'PRIVATE') {
        return { success: false, error: 'Private groups do not have invite codes' };
      }

      // Generate new code
      const newInviteCode = await this.groupRepository.generateInviteCode();

      // Update group
      await this.groupRepository.updateInviteCode(groupId, newInviteCode);

      return { success: true, data: { inviteCode: newInviteCode } };
    } catch (error) {
      return {
        success: false,
        error: `Failed to generate invite code: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getMembership(
    userId: string,
    groupId: string
  ): Promise<ServiceResult<GroupMembershipWithUser>> {
    try {
      // Check if group exists
      const group = await this.groupRepository.findById(groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      const membership = await this.groupRepository.getMembership(groupId, userId);
      if (!membership) {
        return { success: false, error: 'You are not a member of this group' };
      }

      return { success: true, data: membership };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get membership: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private validateCreateGroupInput(input: CreateGroupInput): { valid: boolean; error?: string } {
    if (!input.name || input.name.trim().length === 0) {
      return { valid: false, error: 'Group name is required' };
    }

    if (input.name.length > 100) {
      return { valid: false, error: 'Group name is too long (max 100 characters)' };
    }

    if (input.description && input.description.length > 500) {
      return { valid: false, error: 'Group description is too long (max 500 characters)' };
    }

    if (input.maxMembers && (input.maxMembers < 2 || input.maxMembers > 1000)) {
      return { valid: false, error: 'Maximum members must be between 2 and 1000' };
    }

    return { valid: true };
  }

  private validateUpdateGroupInput(input: UpdateGroupInput): { valid: boolean; error?: string } {
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        return { valid: false, error: 'Group name cannot be empty' };
      }

      if (input.name.length > 100) {
        return { valid: false, error: 'Group name is too long (max 100 characters)' };
      }
    }

    if (input.description !== undefined && input.description.length > 500) {
      return { valid: false, error: 'Group description is too long (max 500 characters)' };
    }

    if (input.maxMembers !== undefined && (input.maxMembers < 2 || input.maxMembers > 1000)) {
      return { valid: false, error: 'Maximum members must be between 2 and 1000' };
    }

    return { valid: true };
  }

  private async canUserUpdateGroup(
    userId: string,
    group: GroupWithDetails,
    input: UpdateGroupInput
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Owner can update everything
    if (group.ownerId === userId) {
      return { allowed: true };
    }

    // Moderators can update some fields
    const isModerator = await this.groupRepository.hasPermission(group.id, userId, ['MODERATOR']);
    if (isModerator) {
      // Check if trying to update owner-only fields
      const ownerOnlyFields = ['name', 'groupType', 'maxMembers'];
      const hasOwnerOnlyFields = ownerOnlyFields.some(field => input[field] !== undefined);

      if (hasOwnerOnlyFields) {
        return { allowed: false, reason: 'You are not authorized to change these fields' };
      }

      return { allowed: true };
    }

    return { allowed: false, reason: 'You are not authorized to update this group' };
  }

  private isValidRole(role: GroupRole): boolean {
    const validRoles: GroupRole[] = ['OWNER', 'MODERATOR', 'MEMBER'];
    return validRoles.includes(role);
  }
}