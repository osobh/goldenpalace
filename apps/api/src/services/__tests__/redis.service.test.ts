import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedisService } from '../redis.service';
import { createClient } from 'redis';

// Mock redis client
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    flushAll: vi.fn(),
    ping: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    keys: vi.fn(),
    mGet: vi.fn(),
    mSet: vi.fn(),
    incr: vi.fn(),
    decr: vi.fn(),
    hSet: vi.fn(),
    hGet: vi.fn(),
    hGetAll: vi.fn(),
    hDel: vi.fn(),
    lPush: vi.fn(),
    rPush: vi.fn(),
    lPop: vi.fn(),
    rPop: vi.fn(),
    lRange: vi.fn(),
    lLen: vi.fn(),
    sAdd: vi.fn(),
    sRem: vi.fn(),
    sMembers: vi.fn(),
    sIsMember: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isOpen: true,
    isReady: true
  }))
}));

describe('RedisService', () => {
  let redisService: RedisService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = createClient();
    redisService = new RedisService();
    // Inject the mock client into the service
    (redisService as any).client = mockClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should create and connect to Redis client', async () => {
      // Reset client to test connection
      (redisService as any).client = null;
      await redisService.connect();
      expect(createClient).toHaveBeenCalled();
    });

    it('should disconnect from Redis', async () => {
      await redisService.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      (redisService as any).client = null;
      // Override the mock createClient to throw error
      const errorClient = {
        ...mockClient,
        connect: vi.fn().mockRejectedValue(new Error('Connection failed'))
      };
      (createClient as ReturnType<typeof vi.fn>).mockReturnValue(errorClient);
      await expect(redisService.connect()).rejects.toThrow('Failed to connect to Redis');
    });

    it('should check if Redis is connected', async () => {
      const isConnected = redisService.isConnected();
      expect(isConnected).toBe(true);
    });

    it('should ping Redis server', async () => {
      mockClient.ping.mockResolvedValue('PONG');
      const result = await redisService.ping();
      expect(result).toBe('PONG');
      expect(mockClient.ping).toHaveBeenCalled();
    });
  });

  describe('Basic Cache Operations', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should get a value from cache', async () => {
      mockClient.get.mockResolvedValue('test-value');
      const result = await redisService.get('test-key');
      expect(result).toBe('test-value');
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', async () => {
      mockClient.get.mockResolvedValue(null);
      const result = await redisService.get('non-existent');
      expect(result).toBeNull();
    });

    it('should set a value in cache without TTL', async () => {
      mockClient.set.mockResolvedValue('OK');
      await redisService.set('test-key', 'test-value');
      expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('should set a value in cache with TTL', async () => {
      mockClient.setEx.mockResolvedValue('OK');
      await redisService.set('test-key', 'test-value', 3600);
      expect(mockClient.setEx).toHaveBeenCalledWith('test-key', 3600, 'test-value');
    });

    it('should delete a key from cache', async () => {
      mockClient.del.mockResolvedValue(1);
      const result = await redisService.delete('test-key');
      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should return false when deleting non-existent key', async () => {
      mockClient.del.mockResolvedValue(0);
      const result = await redisService.delete('non-existent');
      expect(result).toBe(false);
    });

    it('should check if key exists', async () => {
      mockClient.exists.mockResolvedValue(1);
      const result = await redisService.exists('test-key');
      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith('test-key');
    });

    it('should return false for non-existent key', async () => {
      mockClient.exists.mockResolvedValue(0);
      const result = await redisService.exists('non-existent');
      expect(result).toBe(false);
    });

    it('should clear all cache', async () => {
      mockClient.flushAll.mockResolvedValue('OK');
      await redisService.clear();
      expect(mockClient.flushAll).toHaveBeenCalled();
    });

    it('should set expiration on existing key', async () => {
      mockClient.expire.mockResolvedValue(true);
      const result = await redisService.expire('test-key', 3600);
      expect(result).toBe(true);
      expect(mockClient.expire).toHaveBeenCalledWith('test-key', 3600);
    });

    it('should get TTL for a key', async () => {
      mockClient.ttl.mockResolvedValue(3600);
      const result = await redisService.getTTL('test-key');
      expect(result).toBe(3600);
      expect(mockClient.ttl).toHaveBeenCalledWith('test-key');
    });

    it('should get all keys matching pattern', async () => {
      mockClient.keys.mockResolvedValue(['user:1', 'user:2']);
      const result = await redisService.getKeys('user:*');
      expect(result).toEqual(['user:1', 'user:2']);
      expect(mockClient.keys).toHaveBeenCalledWith('user:*');
    });
  });

  describe('JSON Operations', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should store JSON object', async () => {
      const obj = { id: 1, name: 'test' };
      mockClient.set.mockResolvedValue('OK');
      await redisService.setJSON('test-key', obj);
      expect(mockClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(obj));
    });

    it('should store JSON object with TTL', async () => {
      const obj = { id: 1, name: 'test' };
      mockClient.setEx.mockResolvedValue('OK');
      await redisService.setJSON('test-key', obj, 3600);
      expect(mockClient.setEx).toHaveBeenCalledWith('test-key', 3600, JSON.stringify(obj));
    });

    it('should retrieve JSON object', async () => {
      const obj = { id: 1, name: 'test' };
      mockClient.get.mockResolvedValue(JSON.stringify(obj));
      const result = await redisService.getJSON('test-key');
      expect(result).toEqual(obj);
    });

    it('should return null for non-existent JSON key', async () => {
      mockClient.get.mockResolvedValue(null);
      const result = await redisService.getJSON('non-existent');
      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', async () => {
      mockClient.get.mockResolvedValue('invalid-json');
      const result = await redisService.getJSON('test-key');
      expect(result).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should get multiple values', async () => {
      mockClient.mGet.mockResolvedValue(['value1', 'value2', null]);
      const result = await redisService.mGet(['key1', 'key2', 'key3']);
      expect(result).toEqual(['value1', 'value2', null]);
      expect(mockClient.mGet).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
    });

    it('should set multiple values', async () => {
      mockClient.mSet.mockResolvedValue('OK');
      await redisService.mSet({ key1: 'value1', key2: 'value2' });
      expect(mockClient.mSet).toHaveBeenCalledWith({ key1: 'value1', key2: 'value2' });
    });

    it('should delete multiple keys', async () => {
      mockClient.del.mockResolvedValue(2);
      const result = await redisService.deleteMany(['key1', 'key2']);
      expect(result).toBe(2);
      expect(mockClient.del).toHaveBeenCalledWith(['key1', 'key2']);
    });
  });

  describe('Counter Operations', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should increment counter', async () => {
      mockClient.incr.mockResolvedValue(5);
      const result = await redisService.increment('counter');
      expect(result).toBe(5);
      expect(mockClient.incr).toHaveBeenCalledWith('counter');
    });

    it('should decrement counter', async () => {
      mockClient.decr.mockResolvedValue(3);
      const result = await redisService.decrement('counter');
      expect(result).toBe(3);
      expect(mockClient.decr).toHaveBeenCalledWith('counter');
    });
  });

  describe('Hash Operations', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should set hash field', async () => {
      mockClient.hSet.mockResolvedValue(1);
      await redisService.hSet('hash-key', 'field', 'value');
      expect(mockClient.hSet).toHaveBeenCalledWith('hash-key', 'field', 'value');
    });

    it('should get hash field', async () => {
      mockClient.hGet.mockResolvedValue('value');
      const result = await redisService.hGet('hash-key', 'field');
      expect(result).toBe('value');
      expect(mockClient.hGet).toHaveBeenCalledWith('hash-key', 'field');
    });

    it('should get all hash fields', async () => {
      mockClient.hGetAll.mockResolvedValue({ field1: 'value1', field2: 'value2' });
      const result = await redisService.hGetAll('hash-key');
      expect(result).toEqual({ field1: 'value1', field2: 'value2' });
      expect(mockClient.hGetAll).toHaveBeenCalledWith('hash-key');
    });

    it('should delete hash field', async () => {
      mockClient.hDel.mockResolvedValue(1);
      const result = await redisService.hDel('hash-key', 'field');
      expect(result).toBe(true);
      expect(mockClient.hDel).toHaveBeenCalledWith('hash-key', 'field');
    });
  });

  describe('List Operations', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should push to left of list', async () => {
      mockClient.lPush.mockResolvedValue(3);
      const result = await redisService.lPush('list-key', 'value');
      expect(result).toBe(3);
      expect(mockClient.lPush).toHaveBeenCalledWith('list-key', 'value');
    });

    it('should push to right of list', async () => {
      mockClient.rPush.mockResolvedValue(3);
      const result = await redisService.rPush('list-key', 'value');
      expect(result).toBe(3);
      expect(mockClient.rPush).toHaveBeenCalledWith('list-key', 'value');
    });

    it('should pop from left of list', async () => {
      mockClient.lPop.mockResolvedValue('value');
      const result = await redisService.lPop('list-key');
      expect(result).toBe('value');
      expect(mockClient.lPop).toHaveBeenCalledWith('list-key');
    });

    it('should pop from right of list', async () => {
      mockClient.rPop.mockResolvedValue('value');
      const result = await redisService.rPop('list-key');
      expect(result).toBe('value');
      expect(mockClient.rPop).toHaveBeenCalledWith('list-key');
    });

    it('should get list range', async () => {
      mockClient.lRange.mockResolvedValue(['value1', 'value2', 'value3']);
      const result = await redisService.lRange('list-key', 0, -1);
      expect(result).toEqual(['value1', 'value2', 'value3']);
      expect(mockClient.lRange).toHaveBeenCalledWith('list-key', 0, -1);
    });

    it('should get list length', async () => {
      mockClient.lLen.mockResolvedValue(5);
      const result = await redisService.lLen('list-key');
      expect(result).toBe(5);
      expect(mockClient.lLen).toHaveBeenCalledWith('list-key');
    });
  });

  describe('Set Operations', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should add to set', async () => {
      mockClient.sAdd.mockResolvedValue(1);
      const result = await redisService.sAdd('set-key', 'value');
      expect(result).toBe(1);
      expect(mockClient.sAdd).toHaveBeenCalledWith('set-key', 'value');
    });

    it('should remove from set', async () => {
      mockClient.sRem.mockResolvedValue(1);
      const result = await redisService.sRem('set-key', 'value');
      expect(result).toBe(1);
      expect(mockClient.sRem).toHaveBeenCalledWith('set-key', 'value');
    });

    it('should get all set members', async () => {
      mockClient.sMembers.mockResolvedValue(['value1', 'value2']);
      const result = await redisService.sMembers('set-key');
      expect(result).toEqual(['value1', 'value2']);
      expect(mockClient.sMembers).toHaveBeenCalledWith('set-key');
    });

    it('should check if member exists in set', async () => {
      mockClient.sIsMember.mockResolvedValue(true);
      const result = await redisService.sIsMember('set-key', 'value');
      expect(result).toBe(true);
      expect(mockClient.sIsMember).toHaveBeenCalledWith('set-key', 'value');
    });
  });

  describe('Cache Patterns', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should implement cache-aside pattern', async () => {
      const loader = vi.fn().mockResolvedValue('loaded-value');

      // First call - cache miss
      mockClient.get.mockResolvedValue(null);
      mockClient.setEx.mockResolvedValue('OK');

      const result1 = await redisService.getOrSet('cache-key', loader, 3600);
      expect(result1).toBe('loaded-value');
      expect(loader).toHaveBeenCalledTimes(1);
      expect(mockClient.setEx).toHaveBeenCalledWith('cache-key', 3600, 'loaded-value');

      // Second call - cache hit
      mockClient.get.mockResolvedValue('loaded-value');
      const result2 = await redisService.getOrSet('cache-key', loader, 3600);
      expect(result2).toBe('loaded-value');
      expect(loader).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should implement cache-aside pattern for JSON', async () => {
      const loader = vi.fn().mockResolvedValue({ id: 1, name: 'test' });

      // First call - cache miss
      mockClient.get.mockResolvedValue(null);
      mockClient.setEx.mockResolvedValue('OK');

      const result1 = await redisService.getOrSetJSON('cache-key', loader, 3600);
      expect(result1).toEqual({ id: 1, name: 'test' });
      expect(loader).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      mockClient.get.mockResolvedValue(JSON.stringify({ id: 1, name: 'test' }));
      const result2 = await redisService.getOrSetJSON('cache-key', loader, 3600);
      expect(result2).toEqual({ id: 1, name: 'test' });
      expect(loader).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should invalidate cache pattern', async () => {
      const patterns = ['user:*', 'session:*'];
      mockClient.keys.mockResolvedValueOnce(['user:1', 'user:2']);
      mockClient.keys.mockResolvedValueOnce(['session:1', 'session:2']);
      mockClient.del.mockResolvedValue(4);

      const result = await redisService.invalidatePattern(patterns);
      expect(result).toBe(4);
      expect(mockClient.keys).toHaveBeenCalledTimes(2);
      expect(mockClient.del).toHaveBeenCalledWith(['user:1', 'user:2', 'session:1', 'session:2']);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Client is already mocked and injected
    });

    it('should handle Redis errors gracefully', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis error'));
      await expect(redisService.get('test-key')).rejects.toThrow('Cache operation failed');
    });

    it('should handle connection loss', async () => {
      Object.defineProperty(mockClient, 'isReady', { value: false, writable: true });
      await expect(redisService.get('test-key')).rejects.toThrow('Redis client is not connected');
    });
  });
});