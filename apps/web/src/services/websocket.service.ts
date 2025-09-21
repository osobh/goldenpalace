import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: string;
  groupId: string;
  userId: string;
  username: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  createdAt: string;
  editedAt?: string;
  reactions: MessageReaction[];
  readBy: MessageReadStatus[];
  replyTo?: string;
  attachments?: MessageAttachment[];
}

export interface MessageReaction {
  id: string;
  userId: string;
  username: string;
  emoji: string;
  createdAt: string;
}

export interface MessageReadStatus {
  userId: string;
  username: string;
  readAt: string;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface GroupMember {
  id: string;
  userId: string;
  username: string;
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER';
  joinedAt: string;
  isOnline: boolean;
  lastSeen: string;
  permissions?: string[];
}

export interface TypingIndicator {
  userId: string;
  username: string;
  groupId: string;
  isTyping: boolean;
}

export interface MarketDataUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  high?: number;
  low?: number;
  open?: number;
}

export interface PortfolioUpdate {
  portfolioId: string;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  updatedAssets: AssetUpdate[];
  timestamp: string;
}

export interface AssetUpdate {
  symbol: string;
  currentPrice: number;
  totalValue: number;
  unrealizedPnl: number;
  change?: number;
  changePercent?: number;
}

export interface SendMessageData {
  groupId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE';
  replyTo?: string;
  attachments?: File[];
}

export interface TypingData {
  groupId: string;
  isTyping: boolean;
}

export interface ReactionData {
  messageId: string;
  emoji: string;
}

export interface GroupMemberUpdateData {
  groupId: string;
  member: GroupMember;
  action: 'joined' | 'left' | 'updated' | 'promoted' | 'demoted';
}

export class WebSocketService {
  private socket: Socket | null = null;
  private isReconnecting = false;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async connect(token: string, serverUrl?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = serverUrl || (import.meta.env as any).VITE_WS_URL || '';

      this.socket = io(url, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        this.processMessageQueue();
        resolve(true);
      });

      this.socket.on('connect_error', (error) => {
        this.handleReconnect();
        reject(error);
      });

      this.setupEventListeners();
      this.socket.connect();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.removeEventListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.messageQueue = [];
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | null {
    return this.socket?.connected ? this.socket.id : null;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        this.handleReconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private removeEventListeners(): void {
    if (!this.socket) return;

    const events = [
      'connect',
      'disconnect',
      'connect_error',
      'error',
      'message_received',
      'user_typing',
      'group_member_updated',
      'market_data_update',
      'portfolio_update',
    ];

    events.forEach(event => {
      this.socket?.off(event);
    });
  }

  private handleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const { event, data } = this.messageQueue.shift()!;
      this.emit(event, data);
    }
  }

  private emit(event: string, data: any): void {
    if (this.isConnected()) {
      this.socket?.emit(event, data);
    } else {
      this.messageQueue.push({ event, data });
    }
  }

  // Chat functionality
  joinGroup(groupId: string): void {
    this.emit('join_group', { groupId });
  }

  leaveGroup(groupId: string): void {
    this.emit('leave_group', { groupId });
  }

  sendMessage(data: SendMessageData): void {
    this.emit('send_message', data);
  }

  sendTyping(data: TypingData): void {
    this.emit('typing', data);
  }

  addReaction(data: ReactionData): void {
    this.emit('add_reaction', data);
  }

  removeReaction(data: ReactionData): void {
    this.emit('remove_reaction', data);
  }

  markMessageAsRead(messageId: string): void {
    this.emit('mark_read', { messageId });
  }

  editMessage(messageId: string, content: string): void {
    this.emit('edit_message', { messageId, content });
  }

  deleteMessage(messageId: string): void {
    this.emit('delete_message', { messageId });
  }

  // Market data functionality
  subscribeToMarketData(symbols: string[]): void {
    this.emit('subscribe_market_data', { symbols });
  }

  unsubscribeFromMarketData(symbols: string[]): void {
    this.emit('unsubscribe_market_data', { symbols });
  }

  subscribeToPortfolioUpdates(portfolioId: string): void {
    this.emit('subscribe_portfolio', { portfolioId });
  }

  unsubscribeFromPortfolioUpdates(portfolioId: string): void {
    this.emit('unsubscribe_portfolio', { portfolioId });
  }

  // Event listeners
  onMessage(callback: (message: ChatMessage) => void): void {
    this.socket?.on('message_received', callback);
  }

  onMessageUpdated(callback: (message: ChatMessage) => void): void {
    this.socket?.on('message_updated', callback);
  }

  onMessageDeleted(callback: (messageId: string) => void): void {
    this.socket?.on('message_deleted', callback);
  }

  onTyping(callback: (typing: TypingIndicator) => void): void {
    this.socket?.on('user_typing', callback);
  }

  onGroupMemberUpdate(callback: (data: GroupMemberUpdateData) => void): void {
    this.socket?.on('group_member_updated', callback);
  }

  onMarketDataUpdate(callback: (data: MarketDataUpdate) => void): void {
    this.socket?.on('market_data_update', callback);
  }

  onPortfolioUpdate(callback: (data: PortfolioUpdate) => void): void {
    this.socket?.on('portfolio_update', callback);
  }

  onError(callback: (error: Error) => void): void {
    this.socket?.on('error', callback);
  }

  onDisconnect(callback: (reason: string) => void): void {
    this.socket?.on('disconnect', callback);
  }

  onReconnect(callback: () => void): void {
    this.socket?.on('connect', callback);
  }

  // Connection status events
  onConnectionStatusChange(callback: (connected: boolean) => void): void {
    this.socket?.on('connect', () => callback(true));
    this.socket?.on('disconnect', () => callback(false));
  }

  // Group management
  createGroup(data: { name: string; description?: string; isPrivate: boolean }): void {
    this.emit('create_group', data);
  }

  inviteToGroup(data: { groupId: string; userIds: string[] }): void {
    this.emit('invite_to_group', data);
  }

  removeFromGroup(data: { groupId: string; userId: string }): void {
    this.emit('remove_from_group', data);
  }

  updateGroupRole(data: { groupId: string; userId: string; role: string }): void {
    this.emit('update_group_role', data);
  }

  // Utility methods
  getConnectionState(): {
    connected: boolean;
    socketId: string | null;
    reconnectAttempts: number;
    isReconnecting: boolean;
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected(),
      socketId: this.getSocketId(),
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
      queuedMessages: this.messageQueue.length,
    };
  }

  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  setMaxReconnectAttempts(attempts: number): void {
    this.maxReconnectAttempts = attempts;
  }

  setReconnectDelay(delay: number): void {
    this.reconnectDelay = delay;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();