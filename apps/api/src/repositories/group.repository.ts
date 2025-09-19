import { prisma } from '@golden-palace/database';
import type { Group, GroupMembership, Prisma } from '@prisma/client';
import type { PaginatedResult, GroupType, GroupRole } from '@golden-palace/shared';

export type GroupWithDetails = Group & {
  owner: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  members: (GroupMembership & {
    user: {
      id: string;
      username: string;
      email: string;
      avatarUrl?: string;
      bio?: string;
      lastSeen?: Date;
    };
  })[];
  messages: {
    id: string;
    content?: string;
    createdAt: Date;
    user: {
      id: string;
      username: string;
    };
  }[];
  _count: {
    members: number;
    messages: number;
  };
};

export type GroupMembershipWithUser = GroupMembership & {
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    bio?: string;
    lastSeen?: Date;
  };
};

export interface CreateGroupData {
  name: string;
  description?: string;
  ownerId: string;
  groupType: GroupType;
  maxMembers?: number;
  inviteCode?: string;
}

export interface UpdateGroupData {
  name?: string;
  description?: string;
  maxMembers?: number;
  groupType?: GroupType;
  inviteCode?: string;
}

export interface GetGroupsOptions {
  page?: number;
  limit?: number;
  search?: string;
  groupType?: GroupType;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'memberCount';
  sortOrder?: 'asc' | 'desc';
}

export class GroupRepository {
  async create(data: CreateGroupData): Promise<GroupWithDetails> {
    return await prisma.group.create({
      data: {
        ...data,
        groupType: data.groupType as any,
        members: {
          create: {
            userId: data.ownerId,
            role: 'OWNER',
            status: 'ACTIVE'
          }
        }
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                bio: true,
                lastSeen: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      }
    });
  }

  async findById(id: string): Promise<GroupWithDetails | null> {
    return await prisma.group.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                bio: true,
                lastSeen: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      }
    });
  }

  async findByInviteCode(inviteCode: string): Promise<Group | null> {
    return await prisma.group.findUnique({
      where: { inviteCode }
    });
  }

  async findByOwnerId(ownerId: string, options: GetGroupsOptions = {}): Promise<PaginatedResult<GroupWithDetails>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GroupWhereInput = {
      ownerId
    };

    if (options.search) {
      where.name = {
        contains: options.search,
        mode: 'insensitive'
      };
    }

    if (options.groupType) {
      where.groupType = options.groupType as any;
    }

    const orderBy: Prisma.GroupOrderByWithRelationInput = {};
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    if (sortBy === 'memberCount') {
      orderBy.members = { _count: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatarUrl: true,
                  bio: true,
                  lastSeen: true
                }
              }
            }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          },
          _count: {
            select: {
              members: true,
              messages: true
            }
          }
        }
      }),
      prisma.group.count({ where })
    ]);

    return {
      data: groups,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total
      }
    };
  }

  async findUserGroups(userId: string, options: GetGroupsOptions = {}): Promise<PaginatedResult<GroupWithDetails>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.GroupWhereInput = {
      members: {
        some: {
          userId,
          status: 'ACTIVE'
        }
      }
    };

    if (options.search) {
      where.name = {
        contains: options.search,
        mode: 'insensitive'
      };
    }

    if (options.groupType) {
      where.groupType = options.groupType as any;
    }

    const orderBy: Prisma.GroupOrderByWithRelationInput = {};
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';

    if (sortBy === 'memberCount') {
      orderBy.members = { _count: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatarUrl: true,
                  bio: true,
                  lastSeen: true
                }
              }
            }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          },
          _count: {
            select: {
              members: true,
              messages: true
            }
          }
        }
      }),
      prisma.group.count({ where })
    ]);

    return {
      data: groups,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total
      }
    };
  }

  async update(id: string, data: UpdateGroupData): Promise<GroupWithDetails> {
    return await prisma.group.update({
      where: { id },
      data: {
        ...data,
        groupType: data.groupType as any,
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                bio: true,
                lastSeen: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.group.delete({
      where: { id }
    });
  }

  async addMember(groupId: string, userId: string, role: GroupRole = 'MEMBER'): Promise<GroupMembershipWithUser> {
    // Check if membership already exists
    const existing = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    if (existing) {
      throw new Error('User is already a member of this group');
    }

    return await prisma.groupMembership.create({
      data: {
        groupId,
        userId,
        role: role as any,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            bio: true,
            lastSeen: true
          }
        }
      }
    });
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await prisma.groupMembership.delete({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });
  }

  async updateMemberRole(groupId: string, userId: string, role: GroupRole): Promise<GroupMembershipWithUser> {
    return await prisma.groupMembership.update({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      },
      data: {
        role: role as any
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            bio: true,
            lastSeen: true
          }
        }
      }
    });
  }

  async getMembership(groupId: string, userId: string): Promise<GroupMembershipWithUser | null> {
    return await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            bio: true,
            lastSeen: true
          }
        }
      }
    });
  }

  async getMembers(groupId: string, role?: GroupRole): Promise<GroupMembershipWithUser[]> {
    const where: Prisma.GroupMembershipWhereInput = {
      groupId,
      status: 'ACTIVE'
    };

    if (role) {
      where.role = role as any;
    }

    return await prisma.groupMembership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            bio: true,
            lastSeen: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // Owners first, then admins, etc.
        { joinedAt: 'asc' }
      ]
    });
  }

  async getMemberCount(groupId: string): Promise<number> {
    return await prisma.groupMembership.count({
      where: {
        groupId,
        status: 'ACTIVE'
      }
    });
  }

  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    return !!membership && membership.status === 'ACTIVE';
  }

  async hasPermission(groupId: string, userId: string, requiredRoles: GroupRole[]): Promise<boolean> {
    const membership = await this.getMembership(groupId, userId);

    if (!membership || membership.status !== 'ACTIVE') {
      return false;
    }

    return requiredRoles.includes(membership.role as GroupRole);
  }

  async generateInviteCode(): Promise<string> {
    // Generate random 8-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Ensure uniqueness
    const existingGroup = await prisma.group.findUnique({
      where: { inviteCode: code }
    });

    if (existingGroup) {
      return this.generateInviteCode(); // Recursive call if code exists
    }

    return code;
  }

  async updateInviteCode(groupId: string, inviteCode: string): Promise<Group> {
    return await prisma.group.update({
      where: { id: groupId },
      data: { inviteCode }
    });
  }

  async checkGroupNameExists(ownerId: string, name: string, excludeGroupId?: string): Promise<boolean> {
    const where: Prisma.GroupWhereInput = {
      ownerId,
      name: {
        equals: name,
        mode: 'insensitive'
      }
    };

    if (excludeGroupId) {
      where.id = { not: excludeGroupId };
    }

    const existingGroup = await prisma.group.findFirst({ where });
    return !!existingGroup;
  }
}