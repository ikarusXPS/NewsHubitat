/**
 * Redis Cache Service
 * Provides caching layer for API responses, sessions, and frequently accessed data
 */

import Redis from 'ioredis';
import logger from '../utils/logger';

export interface CacheConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}

const DEFAULT_CONFIG: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: 'newshub:',
};

// Cache TTL presets (in seconds)
export const CACHE_TTL = {
  SHORT: 60,              // 1 minute - for rapidly changing data
  MEDIUM: 300,            // 5 minutes - default API cache
  LONG: 1800,             // 30 minutes - stable data
  HOUR: 3600,             // 1 hour
  DAY: 86400,             // 24 hours - for rarely changing data
  WEEK: 604800,           // 7 days
} as const;

export class CacheService {
  private static instance: CacheService;
  private client: Redis | null = null;
  private isConnected = false;
  private readonly config: CacheConfig;

  private constructor(config: CacheConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.connect();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private connect(): void {
    const redisUrl = process.env.REDIS_URL;

    try {
      if (redisUrl) {
        // Use connection URL if provided (e.g., for cloud Redis)
        this.client = new Redis(redisUrl, {
          keyPrefix: this.config.keyPrefix,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis connection failed after 3 retries, running without cache');
              return null;
            }
            return Math.min(times * 200, 2000);
          },
        });
      } else {
        // Use individual config options
        this.client = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          keyPrefix: this.config.keyPrefix,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis connection failed after 3 retries, running without cache');
              return null;
            }
            return Math.min(times * 200, 2000);
          },
        });
      }

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('✓ Redis connected');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.debug(`Redis error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.debug('Redis connection closed');
      });
    } catch {
      logger.warn('Redis initialization failed, running without cache');
      this.client = null;
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Get a cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.client!.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      logger.debug(`Cache get error for key ${key}: ${err}`);
      return null;
    }
  }

  /**
   * Set a cached value with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (err) {
      logger.debug(`Cache set error for key ${key}: ${err}`);
      return false;
    }
  }

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.del(key);
      return true;
    } catch (err) {
      logger.debug(`Cache delete error for key ${key}: ${err}`);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length === 0) return 0;
      return await this.client!.del(...keys);
    } catch (err) {
      logger.debug(`Cache delete pattern error: ${err}`);
      return 0;
    }
  }

  /**
   * Get or set: Return cached value or compute and cache it
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await computeFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (!this.isAvailable()) return 0;

    try {
      return await this.client!.incr(key);
    } catch (err) {
      logger.debug(`Cache incr error for key ${key}: ${err}`);
      return 0;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.expire(key, ttlSeconds);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add to a sorted set (for leaderboards, trending, etc.)
   */
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.zadd(key, score, member);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get top N from sorted set
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.isAvailable()) return [];

    try {
      return await this.client!.zrevrange(key, start, stop);
    } catch {
      return [];
    }
  }

  /**
   * Publish message to channel (for real-time updates)
   */
  async publish(channel: string, message: unknown): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.client!.publish(channel, JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache stats
   */
  async getStats(): Promise<{ connected: boolean; keys: number; memory: string } | null> {
    if (!this.isAvailable()) {
      return { connected: false, keys: 0, memory: '0' };
    }

    try {
      const info = await this.client!.info('memory');
      const dbsize = await this.client!.dbsize();
      const memoryMatch = info.match(/used_memory_human:(\S+)/);

      return {
        connected: true,
        keys: dbsize,
        memory: memoryMatch?.[1] || 'unknown',
      };
    } catch {
      return null;
    }
  }

  /**
   * Flush all keys with our prefix
   */
  async flushPrefix(): Promise<number> {
    return this.delPattern(`${this.config.keyPrefix}*`);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis connection closed');
    }
  }
}

// Cache key builders for consistent naming
export const CacheKeys = {
  // News
  newsList: (filters: string) => `news:list:${filters}`,
  newsArticle: (id: string) => `news:article:${id}`,
  newsSentiment: () => 'news:sentiment',
  newsSources: () => 'news:sources',

  // Analysis
  clusters: (withSummaries: boolean) => `analysis:clusters:${withSummaries}`,
  framing: (topic: string) => `analysis:framing:${topic}`,

  // Events
  geoEvents: () => 'events:geo',
  timeline: () => 'events:timeline',

  // User
  userSession: (userId: string) => `user:session:${userId}`,
  userBookmarks: (userId: string) => `user:bookmarks:${userId}`,

  // Trending
  trendingTopics: () => 'trending:topics',
  trendingArticles: () => 'trending:articles',

  // Rate limiting
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${ip}:${endpoint}`,
} as const;

export default CacheService;
