import { prisma } from '@golden-palace/database';
import type { Message, MessageReaction, ReadReceipt, Prisma } from '@prisma/client';
import type { PaginatedResult } from '@golden-palace/shared';

export type MessageWithDetails = Message & {
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  replyTo?: {
    id: string;
    content?: string;
    user: {
      id: string;
      username: string;
    };
  } | null;
  reactions: (MessageReaction & {
    user: {
      id: string;
      username: string;
    };
  })[];
  readReceipts: (ReadReceipt & {
    user: {
      id: string;
      username: string;
    };
  })[];
};

export interface CreateMessageData {
  groupId: string;
  userId: string;
  content?: string;
  messageType: string;
  attachments?: any;
  replyToId?: string;
}

export interface UpdateMessageData {
  content?: string;
  attachments?: any;
  editedAt: Date;
}

export interface GetMessagesOptions {
  page?: number;
  limit?: number;
  before?: string;
  after?: string;
}

export class MessageRepository {
  async create(data: CreateMessageData): Promise<MessageWithDetails> {
    return await prisma.message.create({
      data: {
        ...data,
        messageType: data.messageType as any
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });
  }

  async findById(id: string): Promise<MessageWithDetails | null> {
    return await prisma.message.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });
  }

  async findByGroupId(
    groupId: string,
    options: GetMessagesOptions = {}
  ): Promise<PaginatedResult<MessageWithDetails>> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.MessageWhereInput = {
      groupId,
      deletedAt: null
    };

    if (options.before) {
      where.createdAt = { lt: new Date(options.before) };
    }

    if (options.after) {
      where.createdAt = { gt: new Date(options.after) };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true
            }
          },
          replyTo: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          },
          reactions: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          },
          readReceipts: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true
                }
              }
            }
          }
        }
      }),
      prisma.message.count({ where })
    ]);

    return {
      data: messages,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + limit < total
      }
    };
  }

  async update(id: string, data: UpdateMessageData): Promise<MessageWithDetails> {
    return await prisma.message.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });
  }

  async softDelete(id: string): Promise<MessageWithDetails> {
    return await prisma.message.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });
  }

  async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    return await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji
      }
    });
  }

  async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    await prisma.messageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });
  }

  async findReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction | null> {
    return await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji
        }
      }
    });
  }

  async markAsRead(messageId: string, userId: string): Promise<ReadReceipt> {
    return await prisma.readReceipt.upsert({
      where: {
        userId_messageId: {
          userId,
          messageId
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        userId,
        messageId,
        readAt: new Date()
      }
    });
  }

  async getUnreadCount(userId: string, groupId: string): Promise<number> {
    // Get user's join date for the group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    if (!membership) {
      return 0;
    }

    // Count messages after user joined that they haven't read
    const unreadCount = await prisma.message.count({
      where: {
        groupId,
        createdAt: {
          gte: membership.joinedAt
        },
        deletedAt: null,
        NOT: {
          readReceipts: {
            some: {
              userId
            }
          }
        }
      }
    });

    return unreadCount;
  }

  async searchMessages(groupId: string, query: string): Promise<MessageWithDetails[]> {
    return await prisma.message.findMany({
      where: {
        groupId,
        deletedAt: null,
        content: {
          contains: query,
          mode: 'insensitive'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });
  }

  async isMessageTooOldToEdit(messageId: string, maxAgeHours: number = 24): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { createdAt: true }
    });

    if (!message) {
      return true;
    }

    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    const messageAge = Date.now() - message.createdAt.getTime();

    return messageAge > maxAge;
  }

  async findReplyToMessage(replyToId: string, groupId: string): Promise<Message | null> {
    return await prisma.message.findFirst({
      where: {
        id: replyToId,
        groupId,
        deletedAt: null
      }
    });
  }
}