/**
 * Unit tests for CacheService
 * Tests singleton pattern, connection state, get/set/del operations, getOrSet, incr, and CacheKeys builders
 */

import { vi, describe, it, expect, afterEach } from 'vitest';

// Mock ioredis before importing CacheService
vi.mock('ioredis', () => {
  const MockRedis = vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    incr: vi.fn(),
    expire: vi.fn(),
    zadd: vi.fn(),
    zrevrange: vi.fn().mockResolvedValue([]),
    publish: vi.fn(),
    info: vi.fn().mockResolvedValue('used_memory_human:1M'),
    dbsize: vi.fn().mockResolvedValue(10),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  }));
  return { default: MockRedis };
});

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { CacheService, CacheKeys, CACHE_TTL } from './cacheService';

describe('CacheService', () => {
  afterEach(() => {
    // Reset singleton between tests
    (CacheService as unknown as { instance: CacheService | null }).instance = null;
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = CacheService.getInstance();
      const instance2 = CacheService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isAvailable', () => {
    it('returns false when not connected', () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      expect(service.isAvailable()).toBe(false);
    });

    it('returns false when client is null', () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      (service as any).client = null;
      expect(service.isAvailable()).toBe(false);
    });

    it('returns true when connected and client exists', () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      (service as any).client = {};
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('get', () => {
    it('returns null when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('returns null when key not found', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { get: vi.fn().mockResolvedValue(null) };
      (service as any).client = mockClient;

      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('returns parsed JSON when key exists', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { get: vi.fn().mockResolvedValue('{"foo":"bar"}') };
      (service as any).client = mockClient;

      const result = await service.get<{ foo: string }>('test-key');
      expect(result).toEqual({ foo: 'bar' });
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    it('returns null on parse error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { get: vi.fn().mockResolvedValue('invalid-json') };
      (service as any).client = mockClient;

      const result = await service.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('returns false when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.set('test-key', 'value');
      expect(result).toBe(false);
    });

    it('stores value with default TTL', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { setex: vi.fn().mockResolvedValue('OK') };
      (service as any).client = mockClient;

      const result = await service.set('test-key', { data: 'test' });
      expect(result).toBe(true);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'test-key',
        CACHE_TTL.MEDIUM,
        '{"data":"test"}'
      );
    });

    it('stores value with custom TTL', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { setex: vi.fn().mockResolvedValue('OK') };
      (service as any).client = mockClient;

      const result = await service.set('test-key', 'value', CACHE_TTL.LONG);
      expect(result).toBe(true);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'test-key',
        CACHE_TTL.LONG,
        '"value"'
      );
    });

    it('returns false on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { setex: vi.fn().mockRejectedValue(new Error('Redis error')) };
      (service as any).client = mockClient;

      const result = await service.set('test-key', 'value');
      expect(result).toBe(false);
    });
  });

  describe('del', () => {
    it('returns false when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.del('test-key');
      expect(result).toBe(false);
    });

    it('deletes key and returns true', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { del: vi.fn().mockResolvedValue(1) };
      (service as any).client = mockClient;

      const result = await service.del('test-key');
      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });

    it('returns false on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { del: vi.fn().mockRejectedValue(new Error('Redis error')) };
      (service as any).client = mockClient;

      const result = await service.del('test-key');
      expect(result).toBe(false);
    });
  });

  describe('delPattern', () => {
    it('returns 0 when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.delPattern('news:*');
      expect(result).toBe(0);
    });

    it('returns 0 when no keys match pattern', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { keys: vi.fn().mockResolvedValue([]) };
      (service as any).client = mockClient;

      const result = await service.delPattern('news:*');
      expect(result).toBe(0);
    });

    it('deletes matching keys and returns count', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = {
        keys: vi.fn().mockResolvedValue(['news:1', 'news:2', 'news:3']),
        del: vi.fn().mockResolvedValue(3)
      };
      (service as any).client = mockClient;

      const result = await service.delPattern('news:*');
      expect(result).toBe(3);
      expect(mockClient.keys).toHaveBeenCalledWith('news:*');
      expect(mockClient.del).toHaveBeenCalledWith('news:1', 'news:2', 'news:3');
    });

    it('returns 0 on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { keys: vi.fn().mockRejectedValue(new Error('Redis error')) };
      (service as any).client = mockClient;

      const result = await service.delPattern('news:*');
      expect(result).toBe(0);
    });
  });

  describe('flushPrefix', () => {
    it('deletes all keys with prefix', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      (service as any).config = { keyPrefix: 'newshub:' };
      const mockClient = {
        keys: vi.fn().mockResolvedValue(['newshub:key1', 'newshub:key2']),
        del: vi.fn().mockResolvedValue(2)
      };
      (service as any).client = mockClient;

      const result = await service.flushPrefix();
      expect(result).toBe(2);
      expect(mockClient.keys).toHaveBeenCalledWith('newshub:*');
    });
  });

  describe('getOrSet', () => {
    it('returns cached value if exists', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { get: vi.fn().mockResolvedValue('"cached-value"') };
      (service as any).client = mockClient;

      const computeFn = vi.fn().mockResolvedValue('computed-value');
      const result = await service.getOrSet('test-key', computeFn);

      expect(result).toBe('cached-value');
      expect(computeFn).not.toHaveBeenCalled();
    });

    it('calls computeFn and caches when key missing', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK')
      };
      (service as any).client = mockClient;

      const computeFn = vi.fn().mockResolvedValue('computed-value');
      const result = await service.getOrSet('test-key', computeFn, CACHE_TTL.SHORT);

      expect(result).toBe('computed-value');
      expect(computeFn).toHaveBeenCalledOnce();
      expect(mockClient.setex).toHaveBeenCalledWith(
        'test-key',
        CACHE_TTL.SHORT,
        '"computed-value"'
      );
    });

    it('calls computeFn when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;

      const computeFn = vi.fn().mockResolvedValue('computed-value');
      const result = await service.getOrSet('test-key', computeFn);

      expect(result).toBe('computed-value');
      expect(computeFn).toHaveBeenCalledOnce();
    });
  });

  describe('incr', () => {
    it('returns 0 when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.incr('counter');
      expect(result).toBe(0);
    });

    it('increments counter and returns new value', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { incr: vi.fn().mockResolvedValue(5) };
      (service as any).client = mockClient;

      const result = await service.incr('counter');
      expect(result).toBe(5);
      expect(mockClient.incr).toHaveBeenCalledWith('counter');
    });

    it('returns 0 on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { incr: vi.fn().mockRejectedValue(new Error('Redis error')) };
      (service as any).client = mockClient;

      const result = await service.incr('counter');
      expect(result).toBe(0);
    });
  });

  describe('expire', () => {
    it('returns false when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.expire('key', 60);
      expect(result).toBe(false);
    });

    it('sets expiration and returns true', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { expire: vi.fn().mockResolvedValue(1) };
      (service as any).client = mockClient;

      const result = await service.expire('key', 300);
      expect(result).toBe(true);
      expect(mockClient.expire).toHaveBeenCalledWith('key', 300);
    });

    it('returns false on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { expire: vi.fn().mockRejectedValue(new Error('Redis error')) };
      (service as any).client = mockClient;

      const result = await service.expire('key', 300);
      expect(result).toBe(false);
    });
  });

  describe('zadd', () => {
    it('returns false when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.zadd('leaderboard', 100, 'user1');
      expect(result).toBe(false);
    });

    it('adds to sorted set and returns true', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { zadd: vi.fn().mockResolvedValue(1) };
      (service as any).client = mockClient;

      const result = await service.zadd('leaderboard', 100, 'user1');
      expect(result).toBe(true);
      expect(mockClient.zadd).toHaveBeenCalledWith('leaderboard', 100, 'user1');
    });

    it('returns false on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { zadd: vi.fn().mockRejectedValue(new Error('Redis error')) };
      (service as any).client = mockClient;

      const result = await service.zadd('leaderboard', 100, 'user1');
      expect(result).toBe(false);
    });
  });

  describe('zrevrange', () => {
    it('returns empty array when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.zrevrange('leaderboard', 0, 9);
      expect(result).toEqual([]);
    });

    it('returns top N members from sorted set', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { zrevrange: vi.fn().mockResolvedValue(['user1', 'user2']) };
      (service as any).client = mockClient;

      const result = await service.zrevrange('leaderboard', 0, 1);
      expect(result).toEqual(['user1', 'user2']);
      expect(mockClient.zrevrange).toHaveBeenCalledWith('leaderboard', 0, 1);
    });

    it('returns empty array on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { zrevrange: vi.fn().mockRejectedValue(new Error('Redis error')) };
      (service as any).client = mockClient;

      const result = await service.zrevrange('leaderboard', 0, 1);
      expect(result).toEqual([]);
    });
  });

  describe('publish', () => {
    it('returns false when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.publish('channel', { event: 'test' });
      expect(result).toBe(false);
    });

    it('publishes message and returns true', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { publish: vi.fn().mockResolvedValue(1) };
      (service as any).client = mockClient;

      const result = await service.publish('channel', { event: 'test' });
      expect(result).toBe(true);
      expect(mockClient.publish).toHaveBeenCalledWith('channel', '{"event":"test"}');
    });

    it('returns false on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = { publish: vi.fn().mockRejectedValue(new Error('Redis error')) };
      (service as any).client = mockClient;

      const result = await service.publish('channel', { event: 'test' });
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('returns disconnected stats when cache unavailable', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = false;
      const result = await service.getStats();
      expect(result).toEqual({ connected: false, keys: 0, memory: '0' });
    });

    it('returns cache statistics when available', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = {
        info: vi.fn().mockResolvedValue('used_memory_human:1.5M\nother:data'),
        dbsize: vi.fn().mockResolvedValue(42)
      };
      (service as any).client = mockClient;

      const result = await service.getStats();
      expect(result).toEqual({ connected: true, keys: 42, memory: '1.5M' });
    });

    it('returns null on error', async () => {
      const service = CacheService.getInstance();
      (service as any).isConnected = true;
      const mockClient = {
        info: vi.fn().mockRejectedValue(new Error('Redis error')),
        dbsize: vi.fn()
      };
      (service as any).client = mockClient;

      const result = await service.getStats();
      expect(result).toBeNull();
    });
  });

  describe('shutdown', () => {
    it('disconnects Redis client', async () => {
      const service = CacheService.getInstance();
      const mockClient = { quit: vi.fn().mockResolvedValue('OK') };
      (service as any).client = mockClient;
      (service as any).isConnected = true;

      await service.shutdown();

      expect(mockClient.quit).toHaveBeenCalled();
      expect((service as any).client).toBeNull();
      expect((service as any).isConnected).toBe(false);
    });

    it('handles null client gracefully', async () => {
      const service = CacheService.getInstance();
      (service as any).client = null;

      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Token Blacklist (D-01, D-02, D-03)', () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.test';

    describe('blacklistToken', () => {
      it('should blacklist a token with SHA-256 hash', async () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = true;
        const mockClient = { setex: vi.fn().mockResolvedValue('OK') };
        (cacheService as any).client = mockClient;

        const result = await cacheService.blacklistToken(testToken, 3600);

        expect(result).toBe(true);
        // Verify key is SHA-256 hash format (64 hex chars)
        expect(mockClient.setex).toHaveBeenCalledWith(
          expect.stringMatching(/^blacklist:[a-f0-9]{64}$/),
          3600,
          expect.stringContaining('"blacklisted":true')
        );
      });

      it('should return false if Redis unavailable (D-03)', async () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = false;

        const result = await cacheService.blacklistToken(testToken, 3600);

        expect(result).toBe(false);
      });

      it('should cap TTL to WEEK (604800 seconds)', async () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = true;
        const mockClient = { setex: vi.fn().mockResolvedValue('OK') };
        (cacheService as any).client = mockClient;

        await cacheService.blacklistToken(testToken, 1000000);  // > WEEK

        expect(mockClient.setex).toHaveBeenCalledWith(
          expect.any(String),
          604800,  // Capped to WEEK
          expect.any(String)
        );
      });

      it('should handle negative TTL by setting to 0', async () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = true;
        const mockClient = { setex: vi.fn().mockResolvedValue('OK') };
        (cacheService as any).client = mockClient;

        await cacheService.blacklistToken(testToken, -100);

        expect(mockClient.setex).toHaveBeenCalledWith(
          expect.any(String),
          0,  // Clamped to 0
          expect.any(String)
        );
      });
    });

    describe('isTokenBlacklisted', () => {
      it('should return true for blacklisted token', async () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = true;
        const mockClient = { get: vi.fn().mockResolvedValue('{"blacklisted":true}') };
        (cacheService as any).client = mockClient;

        const result = await cacheService.isTokenBlacklisted(testToken);

        expect(result).toBe(true);
        // Verify key is SHA-256 hash format
        expect(mockClient.get).toHaveBeenCalledWith(
          expect.stringMatching(/^blacklist:[a-f0-9]{64}$/)
        );
      });

      it('should return false for non-blacklisted token', async () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = true;
        const mockClient = { get: vi.fn().mockResolvedValue(null) };
        (cacheService as any).client = mockClient;

        const result = await cacheService.isTokenBlacklisted(testToken);

        expect(result).toBe(false);
      });

      it('should return false if Redis unavailable (D-03 graceful degradation)', async () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = false;

        const result = await cacheService.isTokenBlacklisted(testToken);

        expect(result).toBe(false);
      });
    });

    describe('getClient', () => {
      it('should return Redis client when available', () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = true;
        const mockClient = { ping: vi.fn() };
        (cacheService as any).client = mockClient;

        const client = cacheService.getClient();

        expect(client).toBe(mockClient);
      });

      it('should return null when Redis unavailable', () => {
        const cacheService = CacheService.getInstance();
        (cacheService as any).isConnected = false;

        const client = cacheService.getClient();

        expect(client).toBeNull();
      });
    });
  });
});

describe('CacheKeys', () => {
  it('newsList() returns correct format', () => {
    expect(CacheKeys.newsList('region=western')).toBe('news:list:region=western');
  });

  it('newsArticle() returns correct format', () => {
    expect(CacheKeys.newsArticle('art-123')).toBe('news:article:art-123');
  });

  it('newsSentiment() returns correct format', () => {
    expect(CacheKeys.newsSentiment()).toBe('news:sentiment');
  });

  it('newsSources() returns correct format', () => {
    expect(CacheKeys.newsSources()).toBe('news:sources');
  });

  it('userSession() returns correct format', () => {
    expect(CacheKeys.userSession('user-456')).toBe('user:session:user-456');
  });

  it('userBookmarks() returns correct format', () => {
    expect(CacheKeys.userBookmarks('user-789')).toBe('user:bookmarks:user-789');
  });

  it('clusters() returns correct format with summaries', () => {
    expect(CacheKeys.clusters(true)).toBe('analysis:clusters:true');
  });

  it('clusters() returns correct format without summaries', () => {
    expect(CacheKeys.clusters(false)).toBe('analysis:clusters:false');
  });

  it('geoEvents() returns correct format', () => {
    expect(CacheKeys.geoEvents()).toBe('events:geo');
  });

  it('timeline() returns correct format', () => {
    expect(CacheKeys.timeline()).toBe('events:timeline');
  });

  it('rateLimit() returns correct format', () => {
    expect(CacheKeys.rateLimit('192.168.1.1', '/api/news')).toBe('ratelimit:192.168.1.1:/api/news');
  });

  it('framing() returns correct format', () => {
    expect(CacheKeys.framing('ukraine-conflict')).toBe('analysis:framing:ukraine-conflict');
  });

  it('trendingTopics() returns correct format', () => {
    expect(CacheKeys.trendingTopics()).toBe('trending:topics');
  });

  it('trendingArticles() returns correct format', () => {
    expect(CacheKeys.trendingArticles()).toBe('trending:articles');
  });
});

describe('CACHE_TTL', () => {
  it('exports correct TTL constants', () => {
    expect(CACHE_TTL.SHORT).toBe(60);
    expect(CACHE_TTL.MEDIUM).toBe(300);
    expect(CACHE_TTL.LONG).toBe(1800);
    expect(CACHE_TTL.HOUR).toBe(3600);
    expect(CACHE_TTL.DAY).toBe(86400);
    expect(CACHE_TTL.WEEK).toBe(604800);
  });
});
