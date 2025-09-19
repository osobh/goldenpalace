import type { Prisma } from '.prisma/client';

// Extended user type with relationships
export type UserWithStats = Prisma.UserGetPayload<{
  include: {
    userStats: true;
    groupMemberships: {
      include: {
        group: true;
      };
    };
  };
}>;

// Group with members and recent messages
export type GroupWithDetails = Prisma.GroupGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    members: {
      include: {
        user: {
          select: {
            id: true;
            username: true;
            avatarUrl: true;
          };
        };
      };
    };
    messages: {
      take: 1;
      orderBy: {
        createdAt: 'desc';
      };
      include: {
        user: {
          select: {
            id: true;
            username: true;
          };
        };
      };
    };
    _count: {
      select: {
        members: true;
        messages: true;
      };
    };
  };
}>;

// Message with user info and reactions
export type MessageWithDetails = Prisma.MessageGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    replyTo: {
      include: {
        user: {
          select: {
            id: true;
            username: true;
          };
        };
      };
    };
    reactions: {
      include: {
        user: {
          select: {
            id: true;
            username: true;
          };
        };
      };
    };
    readReceipts: {
      include: {
        user: {
          select: {
            id: true;
            username: true;
          };
        };
      };
    };
  };
}>;

// Trade idea with user and position info
export type TradeIdeaWithDetails = Prisma.TradeIdeaGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    group: {
      select: {
        id: true;
        name: true;
      };
    };
    paperPositions: {
      include: {
        user: {
          select: {
            id: true;
            username: true;
          };
        };
      };
    };
  };
}>;

// Competition with entries and rankings
export type CompetitionWithEntries = Prisma.CompetitionGetPayload<{
  include: {
    creator: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    group: {
      select: {
        id: true;
        name: true;
      };
    };
    entries: {
      include: {
        user: {
          select: {
            id: true;
            username: true;
            avatarUrl: true;
          };
        };
      };
      orderBy: {
        rank: 'asc';
      };
    };
    _count: {
      select: {
        entries: true;
      };
    };
  };
}>;

// Database operation result types
export type DatabaseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Pagination types
export type PaginationOptions = {
  page?: number;
  limit?: number;
  cursor?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
};
