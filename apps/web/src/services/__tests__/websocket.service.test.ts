import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketService } from '../websocket.service';
import type {
  ChatMessage,
  GroupMember,
  TypingIndicator,
  MarketDataUpdate,
  PortfolioUpdate
} from '../websocket.service';

// Mock Socket.IO client
const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: false,
  id: 'mock-socket-id',
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

describe('WebSocketService', () => {
  let websocketService: WebSocketService;
  const mockToken = 'mock-jwt-token';

  const connectSocket = async () => {
    mockSocket.connected = true;
    const connectPromise = websocketService.connect(mockToken);
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }
    await connectPromise;
  };

  const getEventListener = (eventName: string) => {
    const listenerCall = mockSocket.on.mock.calls.filter(call => call[0] === eventName).pop();
    return listenerCall?.[1];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    websocketService = new WebSocketService();
  });

  afterEach(() => {
    websocketService.disconnect();
  });

  describe('connection management', () => {
    it('should connect with authentication token', async () => {
      mockSocket.connected = true;

      const connectPromise = websocketService.connect(mockToken);

      // Simulate successful connection
      const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();

      await expect(connectPromise).resolves.toBe(true);
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const connectPromise = websocketService.connect(mockToken);

      // Simulate connection error
      const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
      errorHandler(new Error('Connection failed'));

      await expect(connectPromise).rejects.toThrow('Connection failed');
    });

    it('should disconnect properly', async () => {
      await connectSocket();

      websocketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.off).toHaveBeenCalledWith('connect');
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect');
      expect(mockSocket.off).toHaveBeenCalledWith('connect_error');
    });

    it('should check connection status', async () => {
      await connectSocket();
      expect(websocketService.isConnected()).toBe(true);

      mockSocket.connected = false;
      expect(websocketService.isConnected()).toBe(false);
    });

    it('should get socket ID when connected', async () => {
      await connectSocket();
      mockSocket.id = 'test-socket-id';

      expect(websocketService.getSocketId()).toBe('test-socket-id');
    });

    it('should return null for socket ID when disconnected', () => {
      mockSocket.connected = false;

      expect(websocketService.getSocketId()).toBe(null);
    });
  });

  describe('chat functionality', () => {
    beforeEach(async () => {
      await connectSocket();
    });

    it('should join chat group', () => {
      const groupId = 'group-123';

      websocketService.joinGroup(groupId);

      expect(mockSocket.emit).toHaveBeenCalledWith('join_group', { groupId });
    });

    it('should leave chat group', () => {
      const groupId = 'group-123';

      websocketService.leaveGroup(groupId);

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_group', { groupId });
    });

    it('should send chat message', () => {
      const message = {
        groupId: 'group-123',
        content: 'Hello world',
        type: 'TEXT' as const,
      };

      websocketService.sendMessage(message);

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', message);
    });

    it('should handle incoming chat messages', () => {
      const messageHandler = vi.fn();
      websocketService.onMessage(messageHandler);

      const mockMessage: ChatMessage = {
        id: 'msg-1',
        groupId: 'group-123',
        userId: 'user-1',
        username: 'testuser',
        content: 'Hello world',
        type: 'TEXT',
        createdAt: '2023-12-01T10:00:00Z',
        reactions: [],
        readBy: [],
      };

      // Simulate receiving message
      const messageListener = getEventListener('message_received');
      if (messageListener) {
        messageListener(mockMessage);
      }

      expect(messageHandler).toHaveBeenCalledWith(mockMessage);
    });

    it('should send typing indicator', () => {
      const typingData = {
        groupId: 'group-123',
        isTyping: true,
      };

      websocketService.sendTyping(typingData);

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', typingData);
    });

    it('should handle typing indicators', () => {
      const typingHandler = vi.fn();
      websocketService.onTyping(typingHandler);

      const mockTyping: TypingIndicator = {
        userId: 'user-1',
        username: 'testuser',
        groupId: 'group-123',
        isTyping: true,
      };

      // Simulate receiving typing indicator
      const typingListener = getEventListener('user_typing');
      if (typingListener) {
        typingListener(mockTyping);
      }

      expect(typingHandler).toHaveBeenCalledWith(mockTyping);
    });

    it('should add message reaction', () => {
      const reactionData = {
        messageId: 'msg-1',
        emoji: '👍',
      };

      websocketService.addReaction(reactionData);

      expect(mockSocket.emit).toHaveBeenCalledWith('add_reaction', reactionData);
    });

    it('should handle group member updates', () => {
      const memberHandler = vi.fn();
      websocketService.onGroupMemberUpdate(memberHandler);

      const mockMember: GroupMember = {
        id: 'member-1',
        userId: 'user-1',
        username: 'testuser',
        role: 'MEMBER',
        joinedAt: '2023-12-01T10:00:00Z',
        isOnline: true,
        lastSeen: '2023-12-01T10:30:00Z',
      };

      // Simulate member update
      const memberListener = getEventListener('group_member_updated');
      if (memberListener) {
        memberListener({ groupId: 'group-123', member: mockMember, action: 'joined' });
      }

      expect(memberHandler).toHaveBeenCalledWith({
        groupId: 'group-123',
        member: mockMember,
        action: 'joined',
      });
    });
  });

  describe('market data functionality', () => {
    beforeEach(async () => {
      await connectSocket();
    });

    it('should subscribe to market data', () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      websocketService.subscribeToMarketData(symbols);

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_market_data', { symbols });
    });

    it('should unsubscribe from market data', () => {
      const symbols = ['AAPL', 'GOOGL'];

      websocketService.unsubscribeFromMarketData(symbols);

      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe_market_data', { symbols });
    });

    it('should handle market data updates', () => {
      const marketDataHandler = vi.fn();
      websocketService.onMarketDataUpdate(marketDataHandler);

      const mockMarketData: MarketDataUpdate = {
        symbol: 'AAPL',
        price: 180.50,
        change: 2.30,
        changePercent: 1.29,
        volume: 45000000,
        timestamp: '2023-12-01T10:30:00Z',
      };

      // Simulate market data update
      const marketListener = getEventListener('market_data_update');
      if (marketListener) {
        marketListener(mockMarketData);
      }

      expect(marketDataHandler).toHaveBeenCalledWith(mockMarketData);
    });

    it('should subscribe to portfolio updates', () => {
      const portfolioId = 'portfolio-123';

      websocketService.subscribeToPortfolioUpdates(portfolioId);

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe_portfolio', { portfolioId });
    });

    it('should handle portfolio updates', () => {
      const portfolioHandler = vi.fn();
      websocketService.onPortfolioUpdate(portfolioHandler);

      const mockPortfolioUpdate: PortfolioUpdate = {
        portfolioId: 'portfolio-123',
        totalValue: 65000,
        dayChange: 500,
        dayChangePercent: 0.77,
        updatedAssets: [
          {
            symbol: 'AAPL',
            currentPrice: 180.50,
            totalValue: 18050,
            unrealizedPnl: 1050,
          },
        ],
        timestamp: '2023-12-01T10:30:00Z',
      };

      // Simulate portfolio update
      const portfolioListener = getEventListener('portfolio_update');
      if (portfolioListener) {
        portfolioListener(mockPortfolioUpdate);
      }

      expect(portfolioHandler).toHaveBeenCalledWith(mockPortfolioUpdate);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await connectSocket();
    });

    it('should handle socket errors', () => {
      const errorHandler = vi.fn();
      websocketService.onError(errorHandler);

      const error = new Error('Socket error');

      // Simulate socket error
      const errorListener = getEventListener('error');
      if (errorListener) {
        errorListener(error);
      }

      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    it('should handle disconnection', () => {
      const disconnectHandler = vi.fn();
      websocketService.onDisconnect(disconnectHandler);

      const reason = 'transport close';

      // Simulate disconnection
      const disconnectListener = getEventListener('disconnect');
      if (disconnectListener) {
        disconnectListener(reason);
      }

      expect(disconnectHandler).toHaveBeenCalledWith(reason);
    });

    it('should not emit events when disconnected', () => {
      mockSocket.connected = false;

      websocketService.sendMessage({
        groupId: 'group-123',
        content: 'Hello',
        type: 'TEXT',
      });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should queue messages when disconnected and send when reconnected', () => {
      // The socket is already connected from beforeEach in this describe block

      // Then disconnect
      mockSocket.connected = false;

      const message = {
        groupId: 'group-123',
        content: 'Hello',
        type: 'TEXT' as const,
      };

      websocketService.sendMessage(message);
      expect(mockSocket.emit).not.toHaveBeenCalled();

      // Reconnect
      mockSocket.connected = true;
      const connectHandler = getEventListener('connect');
      if (connectHandler) {
        connectHandler();
      }

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', message);
    });
  });

  describe('cleanup', () => {
    it('should remove all event listeners on disconnect', async () => {
      await connectSocket();

      websocketService.disconnect();

      const expectedEvents = [
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

      expectedEvents.forEach(event => {
        expect(mockSocket.off).toHaveBeenCalledWith(event);
      });
    });

    it('should clear message queue on disconnect', async () => {
      // First establish connection
      await connectSocket();

      // Then disconnect
      mockSocket.connected = false;

      websocketService.sendMessage({
        groupId: 'group-123',
        content: 'Hello',
        type: 'TEXT',
      });

      websocketService.disconnect();

      // Reconnect should not send queued messages
      mockSocket.connected = true;
      const connectHandler = getEventListener('connect');
      if (connectHandler) {
        connectHandler();
      }

      expect(mockSocket.emit).not.toHaveBeenCalledWith('send_message', expect.any(Object));
    });
  });
});