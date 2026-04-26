/**
 * Unit tests for ApiKeyService
 * Tests key generation, format validation, checksum verification, CRUD operations, and limits
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock Prisma
vi.mock('../db/prisma', () => ({
  prisma: {
    apiKey: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../db/prisma';
import { ApiKeyService } from './apiKeyService';

// Reset singleton between tests
afterEach(() => {
  (ApiKeyService as unknown as { instance: ApiKeyService | null }).instance = null;
  vi.clearAllMocks();
});

describe('ApiKeyService', () => {
  describe('getInstance', () => {
    it('returns same instance (singleton pattern)', () => {
      const instance1 = ApiKeyService.getInstance();
      const instance2 = ApiKeyService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateApiKey', () => {
    it('should generate key with live environment prefix', () => {
      const service = ApiKeyService.getInstance();
      const { prefix, random, checksum, full } = service.generateApiKey('live');

      expect(prefix).toBe('nh_live');
      expect(random).toHaveLength(24);
      expect(checksum).toHaveLength(4);
      expect(full).toMatch(/^nh_live_[0-9A-Za-z]{24}_[0-9A-F]{4}$/);
    });

    it('should generate key with test environment prefix', () => {
      const service = ApiKeyService.getInstance();
      const { prefix, full } = service.generateApiKey('test');

      expect(prefix).toBe('nh_test');
      expect(full).toMatch(/^nh_test_[0-9A-Za-z]{24}_[0-9A-F]{4}$/);
    });

    it('should generate unique keys on multiple calls', () => {
      const service = ApiKeyService.getInstance();
      const key1 = service.generateApiKey('live');
      const key2 = service.generateApiKey('live');

      expect(key1.full).not.toBe(key2.full);
    });

    it('should default to live environment', () => {
      const service = ApiKeyService.getInstance();
      const { prefix } = service.generateApiKey();

      expect(prefix).toBe('nh_live');
    });
  });

  describe('validateApiKeyFormat', () => {
    it('should return true for valid key with correct checksum', () => {
      const service = ApiKeyService.getInstance();
      const { full } = service.generateApiKey('live');
      expect(service.validateApiKeyFormat(full)).toBe(true);
    });

    it('should return true for test environment key', () => {
      const service = ApiKeyService.getInstance();
      const { full } = service.generateApiKey('test');
      expect(service.validateApiKeyFormat(full)).toBe(true);
    });

    it('should return false for key with wrong checksum', () => {
      const service = ApiKeyService.getInstance();
      const { prefix, random } = service.generateApiKey('live');
      const invalidKey = `${prefix}_${random}_ZZZZ`;

      expect(service.validateApiKeyFormat(invalidKey)).toBe(false);
    });

    it('should return false for malformed key (wrong format)', () => {
      const service = ApiKeyService.getInstance();

      expect(service.validateApiKeyFormat('invalid-key')).toBe(false);
      expect(service.validateApiKeyFormat('nh_live_short')).toBe(false);
      expect(service.validateApiKeyFormat('nh_invalid_1234567890123456789012_ABCD')).toBe(false);
      expect(service.validateApiKeyFormat('')).toBe(false);
    });

    it('should return false for key with lowercase checksum', () => {
      const service = ApiKeyService.getInstance();
      const { prefix, random } = service.generateApiKey('live');
      const key = `${prefix}_${random}_abcd`;  // checksum must be uppercase

      expect(service.validateApiKeyFormat(key)).toBe(false);
    });

    it('should return false for key with wrong random length', () => {
      const service = ApiKeyService.getInstance();

      // Too short random part
      expect(service.validateApiKeyFormat('nh_live_abc_ABCD')).toBe(false);
      // Too long random part
      expect(service.validateApiKeyFormat('nh_live_1234567890123456789012345_ABCD')).toBe(false);
    });
  });

  describe('createApiKey', () => {
    const testUserId = 'test-user-id';

    beforeEach(() => {
      vi.mocked(prisma.apiKey.count).mockResolvedValue(0);
      vi.mocked(prisma.apiKey.create).mockImplementation(async ({ data }) => ({
        id: 'key-id-1',
        keyHash: data.keyHash,
        name: data.name,
        tier: data.tier,
        environment: data.environment,
        userId: data.userId,
        createdAt: data.createdAt || new Date(),
        lastUsedAt: null,
        requestCount: 0,
        revokedAt: null,
        revokedReason: null,
      }));
    });

    it('should create API key and return plaintext', async () => {
      const service = ApiKeyService.getInstance();
      const result = await service.createApiKey(testUserId, 'Test Key', 'free', 'live');

      expect(result.key).toMatch(/^nh_live_[0-9A-Za-z]{24}_[0-9A-F]{4}$/);
      expect(result.keyData.name).toBe('Test Key');
      expect(result.keyData.tier).toBe('free');
      expect(result.keyData.environment).toBe('live');
    });

    it('should hash key before storing in database', async () => {
      const service = ApiKeyService.getInstance();
      const result = await service.createApiKey(testUserId, 'Test Key', 'free', 'live');

      // Verify create was called with hashed key
      expect(prisma.apiKey.create).toHaveBeenCalledTimes(1);
      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      const storedHash = createCall.data.keyHash;

      // Hash should not equal plaintext
      expect(storedHash).not.toBe(result.key);

      // Hash should be bcrypt format (60 chars)
      expect(storedHash).toHaveLength(60);

      // Verify hash matches plaintext key
      const match = await bcrypt.compare(result.key, storedHash);
      expect(match).toBe(true);
    });

    it('should throw error when user has 3 active keys', async () => {
      vi.mocked(prisma.apiKey.count).mockResolvedValue(3);

      const service = ApiKeyService.getInstance();

      await expect(
        service.createApiKey(testUserId, 'Key 4', 'free', 'live')
      ).rejects.toThrow('Maximum 3 API keys');
    });

    it('should allow creating key when count is less than 3', async () => {
      vi.mocked(prisma.apiKey.count).mockResolvedValue(2);

      const service = ApiKeyService.getInstance();
      const result = await service.createApiKey(testUserId, 'Key 3', 'free', 'live');

      expect(result.keyData.name).toBe('Key 3');
    });

    it('should use correct tier and environment', async () => {
      const service = ApiKeyService.getInstance();

      await service.createApiKey(testUserId, 'Pro Test Key', 'pro', 'test');

      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      expect(createCall.data.tier).toBe('pro');
      expect(createCall.data.environment).toBe('test');
    });

    it('should default to free tier and live environment', async () => {
      const service = ApiKeyService.getInstance();

      await service.createApiKey(testUserId, 'Default Key');

      const createCall = vi.mocked(prisma.apiKey.create).mock.calls[0][0];
      expect(createCall.data.tier).toBe('free');
      expect(createCall.data.environment).toBe('live');
    });
  });

  describe('validateApiKey', () => {
    it('should return null for non-existent key', async () => {
      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([]);

      const service = ApiKeyService.getInstance();
      const { full } = service.generateApiKey('live');
      const result = await service.validateApiKey(full);

      expect(result).toBeNull();
    });

    it('should return key metadata for valid key', async () => {
      const service = ApiKeyService.getInstance();
      const { full } = service.generateApiKey('live');
      const keyHash = await bcrypt.hash(full, 10);

      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([{
        id: 'key-1',
        keyHash,
        userId: 'user-1',
        tier: 'pro',
        environment: 'live',
        name: 'Test',
        createdAt: new Date(),
        lastUsedAt: null,
        requestCount: 0,
        revokedAt: null,
        revokedReason: null,
      }]);

      const validated = await service.validateApiKey(full);

      expect(validated).not.toBeNull();
      expect(validated!.keyId).toBe('key-1');
      expect(validated!.userId).toBe('user-1');
      expect(validated!.tier).toBe('pro');
      expect(validated!.environment).toBe('live');
    });

    it('should return null for key with invalid checksum', async () => {
      const service = ApiKeyService.getInstance();
      const { prefix, random } = service.generateApiKey('live');
      const invalidKey = `${prefix}_${random}_ZZZZ`;

      const result = await service.validateApiKey(invalidKey);

      expect(result).toBeNull();
      // Should not even query database for invalid format
      expect(prisma.apiKey.findMany).not.toHaveBeenCalled();
    });

    it('should return null for malformed key', async () => {
      const service = ApiKeyService.getInstance();

      const result = await service.validateApiKey('not-a-valid-key');

      expect(result).toBeNull();
      expect(prisma.apiKey.findMany).not.toHaveBeenCalled();
    });

    it('should match correct key when multiple keys exist', async () => {
      const service = ApiKeyService.getInstance();
      const { full: key1 } = service.generateApiKey('live');
      const { full: key2 } = service.generateApiKey('live');
      const hash1 = await bcrypt.hash(key1, 10);
      const hash2 = await bcrypt.hash(key2, 10);

      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([
        {
          id: 'key-1',
          keyHash: hash1,
          userId: 'user-1',
          tier: 'free',
          environment: 'live',
          name: 'Key 1',
          createdAt: new Date(),
          lastUsedAt: null,
          requestCount: 0,
          revokedAt: null,
          revokedReason: null,
        },
        {
          id: 'key-2',
          keyHash: hash2,
          userId: 'user-2',
          tier: 'pro',
          environment: 'live',
          name: 'Key 2',
          createdAt: new Date(),
          lastUsedAt: null,
          requestCount: 0,
          revokedAt: null,
          revokedReason: null,
        },
      ]);

      const result = await service.validateApiKey(key2);

      expect(result).not.toBeNull();
      expect(result!.keyId).toBe('key-2');
      expect(result!.userId).toBe('user-2');
    });
  });

  describe('getUserApiKeys', () => {
    it('should return empty array for user with no keys', async () => {
      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([]);

      const service = ApiKeyService.getInstance();
      const keys = await service.getUserApiKeys('user-1');

      expect(keys).toEqual([]);
    });

    it('should return all active keys for user', async () => {
      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([
        {
          id: 'key-2',
          keyHash: 'hash2',
          userId: 'user-1',
          tier: 'pro',
          environment: 'test',
          name: 'Key 2',
          createdAt: new Date('2026-04-26T10:00:00Z'),
          lastUsedAt: null,
          requestCount: 0,
          revokedAt: null,
          revokedReason: null,
        },
        {
          id: 'key-1',
          keyHash: 'hash1',
          userId: 'user-1',
          tier: 'free',
          environment: 'live',
          name: 'Key 1',
          createdAt: new Date('2026-04-26T09:00:00Z'),
          lastUsedAt: null,
          requestCount: 0,
          revokedAt: null,
          revokedReason: null,
        },
      ]);

      const service = ApiKeyService.getInstance();
      const keys = await service.getUserApiKeys('user-1');

      expect(keys).toHaveLength(2);
      expect(keys[0].name).toBe('Key 2');  // Most recent first
      expect(keys[1].name).toBe('Key 1');
    });

    it('should not expose keyHash in returned data', async () => {
      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([
        {
          id: 'key-1',
          keyHash: 'secret-hash',
          userId: 'user-1',
          tier: 'free',
          environment: 'live',
          name: 'Key 1',
          createdAt: new Date(),
          lastUsedAt: null,
          requestCount: 0,
          revokedAt: null,
          revokedReason: null,
        },
      ]);

      const service = ApiKeyService.getInstance();
      const keys = await service.getUserApiKeys('user-1');

      // Verify keyHash is not in returned data
      expect((keys[0] as unknown as Record<string, unknown>).keyHash).toBeUndefined();
    });

    it('should query with correct filters', async () => {
      vi.mocked(prisma.apiKey.findMany).mockResolvedValue([]);

      const service = ApiKeyService.getInstance();
      await service.getUserApiKeys('user-123');

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', revokedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('revokeApiKey', () => {
    it('should set revokedAt timestamp', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
        id: 'key-1',
        keyHash: 'hash',
        userId: 'user-1',
        tier: 'free',
        environment: 'live',
        name: 'Key 1',
        createdAt: new Date(),
        lastUsedAt: null,
        requestCount: 0,
        revokedAt: null,
        revokedReason: null,
      });
      vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);

      const service = ApiKeyService.getInstance();
      await service.revokeApiKey('key-1', 'user-1', 'No longer needed');

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: 'No longer needed',
        },
      });
    });

    it('should throw error for non-existent key', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue(null);

      const service = ApiKeyService.getInstance();

      await expect(
        service.revokeApiKey('non-existent-id', 'user-1')
      ).rejects.toThrow('API key not found');
    });

    it("should throw error when revoking another user's key", async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
        id: 'key-1',
        keyHash: 'hash',
        userId: 'other-user',
        tier: 'free',
        environment: 'live',
        name: 'Key 1',
        createdAt: new Date(),
        lastUsedAt: null,
        requestCount: 0,
        revokedAt: null,
        revokedReason: null,
      });

      const service = ApiKeyService.getInstance();

      await expect(
        service.revokeApiKey('key-1', 'user-1')
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw error when revoking already revoked key', async () => {
      vi.mocked(prisma.apiKey.findUnique).mockResolvedValue({
        id: 'key-1',
        keyHash: 'hash',
        userId: 'user-1',
        tier: 'free',
        environment: 'live',
        name: 'Key 1',
        createdAt: new Date(),
        lastUsedAt: null,
        requestCount: 0,
        revokedAt: new Date(),  // Already revoked
        revokedReason: 'Previous reason',
      });

      const service = ApiKeyService.getInstance();

      await expect(
        service.revokeApiKey('key-1', 'user-1')
      ).rejects.toThrow('already revoked');
    });
  });

  describe('trackUsage', () => {
    it('should update lastUsedAt and increment requestCount', async () => {
      vi.mocked(prisma.apiKey.update).mockResolvedValue({} as never);

      const service = ApiKeyService.getInstance();
      await service.trackUsage('key-1');

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: {
          lastUsedAt: expect.any(Date),
          requestCount: { increment: 1 },
        },
      });
    });
  });
});
