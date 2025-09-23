import { createClient, RedisClientType } from 'redis';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export class RedisService {
  private client: RedisClientType | null = null;
  private readonly defaultTTL = 3600; // 1 hour default TTL
  private readonly prefix = '';

  constructor(options?: CacheOptions) {
    if (options?.prefix) {
      this.prefix = options.prefix;
    }
    if (options?.ttl) {
      this.defaultTTL = options.ttl;
    }
  }

  async connect(): Promise<void> {
    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = createClient({ url }) as RedisClientType;

      // Set up error handlers
      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
      });

      await this.client.connect();
    } catch (error) {
      throw new Error(`Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client?.isReady ?? false;
  }

  private ensureConnected(): void {
    if (!this.client?.isReady) {
      throw new Error('Redis client is not connected');
    }
  }

  private getKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  async ping(): Promise<string> {
    this.ensureConnected();
    return await this.client!.ping();
  }

  // Basic operations
  async get(key: string): Promise<string | null> {
    try {
      this.ensureConnected();
      return await this.client!.get(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      this.ensureConnected();
      const fullKey = this.getKey(key);

      if (ttl) {
        await this.client!.setEx(fullKey, ttl, value);
      } else {
        await this.client!.set(fullKey, value);
      }
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      this.ensureConnected();
      const result = await this.client!.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      this.ensureConnected();
      const result = await this.client!.exists(this.getKey(key));
      return result > 0;
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async clear(): Promise<void> {
    try {
      this.ensureConnected();
      await this.client!.flushAll();
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      this.ensureConnected();
      return await this.client!.expire(this.getKey(key), seconds);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      this.ensureConnected();
      return await this.client!.ttl(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getKeys(pattern: string): Promise<string[]> {
    try {
      this.ensureConnected();
      const fullPattern = this.prefix ? `${this.prefix}:${pattern}` : pattern;
      return await this.client!.keys(fullPattern);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // JSON operations
  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.set(key, jsonString, ttl);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;

      try {
        return JSON.parse(value) as T;
      } catch {
        return null; // Return null for invalid JSON
      }
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch operations
  async mGet(keys: string[]): Promise<(string | null)[]> {
    try {
      this.ensureConnected();
      const fullKeys = keys.map(key => this.getKey(key));
      return await this.client!.mGet(fullKeys);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async mSet(keyValuePairs: Record<string, string>): Promise<void> {
    try {
      this.ensureConnected();
      const fullPairs: Record<string, string> = {};
      for (const [key, value] of Object.entries(keyValuePairs)) {
        fullPairs[this.getKey(key)] = value;
      }
      await this.client!.mSet(fullPairs);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteMany(keys: string[]): Promise<number> {
    try {
      this.ensureConnected();
      const fullKeys = keys.map(key => this.getKey(key));
      return await this.client!.del(fullKeys);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Counter operations
  async increment(key: string): Promise<number> {
    try {
      this.ensureConnected();
      return await this.client!.incr(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async decrement(key: string): Promise<number> {
    try {
      this.ensureConnected();
      return await this.client!.decr(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Hash operations
  async hSet(key: string, field: string, value: string): Promise<void> {
    try {
      this.ensureConnected();
      await this.client!.hSet(this.getKey(key), field, value);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hGet(key: string, field: string): Promise<string | null> {
    try {
      this.ensureConnected();
      const result = await this.client!.hGet(this.getKey(key), field);
      return result ?? null;
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    try {
      this.ensureConnected();
      return await this.client!.hGetAll(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async hDel(key: string, field: string): Promise<boolean> {
    try {
      this.ensureConnected();
      const result = await this.client!.hDel(this.getKey(key), field);
      return result > 0;
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // List operations
  async lPush(key: string, value: string): Promise<number> {
    try {
      this.ensureConnected();
      return await this.client!.lPush(this.getKey(key), value);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async rPush(key: string, value: string): Promise<number> {
    try {
      this.ensureConnected();
      return await this.client!.rPush(this.getKey(key), value);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async lPop(key: string): Promise<string | null> {
    try {
      this.ensureConnected();
      return await this.client!.lPop(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async rPop(key: string): Promise<string | null> {
    try {
      this.ensureConnected();
      return await this.client!.rPop(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      this.ensureConnected();
      return await this.client!.lRange(this.getKey(key), start, stop);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async lLen(key: string): Promise<number> {
    try {
      this.ensureConnected();
      return await this.client!.lLen(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Set operations
  async sAdd(key: string, member: string): Promise<number> {
    try {
      this.ensureConnected();
      return await this.client!.sAdd(this.getKey(key), member);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sRem(key: string, member: string): Promise<number> {
    try {
      this.ensureConnected();
      return await this.client!.sRem(this.getKey(key), member);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sMembers(key: string): Promise<string[]> {
    try {
      this.ensureConnected();
      return await this.client!.sMembers(this.getKey(key));
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    try {
      this.ensureConnected();
      return await this.client!.sIsMember(this.getKey(key), member);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cache patterns
  async getOrSet(key: string, loader: () => Promise<string>, ttl?: number): Promise<string> {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Load data
      const value = await loader();

      // Store in cache
      await this.set(key, value, ttl || this.defaultTTL);

      return value;
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrSetJSON<T>(key: string, loader: () => Promise<T>, ttl?: number): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.getJSON<T>(key);
      if (cached !== null) {
        return cached;
      }

      // Load data
      const value = await loader();

      // Store in cache
      await this.setJSON(key, value, ttl || this.defaultTTL);

      return value;
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async invalidatePattern(patterns: string | string[]): Promise<number> {
    try {
      this.ensureConnected();
      const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

      const keysToDelete: string[] = [];
      for (const pattern of patternsArray) {
        const keys = await this.getKeys(pattern);
        keysToDelete.push(...keys);
      }

      if (keysToDelete.length === 0) {
        return 0;
      }

      return await this.client!.del(keysToDelete);
    } catch (error) {
      throw new Error(`Cache operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance for the application
let redisService: RedisService | null = null;

export function getRedisService(): RedisService {
  if (!redisService) {
    redisService = new RedisService();
  }
  return redisService;
}

// Export a configured instance
export const redis = getRedisService();