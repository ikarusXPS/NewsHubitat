/**
 * API Key Service (Phase 35)
 * Handles API key generation, validation, and lifecycle management for developer access.
 *
 * Security considerations:
 * - Keys are stored hashed with bcrypt (never plaintext)
 * - Plaintext key returned only once at creation
 * - Format validation with checksum prevents invalid DB lookups
 * - Max 3 keys per user (D-10)
 */
import { customAlphabet } from 'nanoid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import { CacheService } from './cacheService';
import logger from '../utils/logger';

// Generate URL-safe random string (24 chars, alphanumeric)
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 24);

export type ApiKeyTier = 'free' | 'pro';
export type ApiKeyEnv = 'live' | 'test';

export interface ApiKeyComponents {
  prefix: string;    // nh_live or nh_test
  random: string;    // 24-char nanoid
  checksum: string;  // 4-char SHA-256 hash (uppercase hex)
  full: string;      // prefix_random_checksum
}

export interface ApiKeyData {
  id: string;
  name: string;
  tier: ApiKeyTier;
  environment: ApiKeyEnv;
  createdAt: Date;
  lastUsedAt: Date | null;
  requestCount: number;
}

const MAX_KEYS_PER_USER = 3;  // D-10: Maximum 3 API keys per user

export class ApiKeyService {
  private static instance: ApiKeyService;

  private constructor() {
    logger.info('API Key service initialized');
  }

  static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  /**
   * Generate API key with format: nh_{env}_{random}_{checksum}
   * Example: nh_live_1A2b3C4d5E6f7G8h9I0j1K2L_A3B4
   *
   * Key format per D-06:
   * - Prefix: nh_live_ or nh_test_ (environment indicator)
   * - Random: 24 alphanumeric characters (nanoid)
   * - Checksum: 4 uppercase hex chars (first 4 of SHA-256 hash)
   */
  generateApiKey(environment: ApiKeyEnv = 'live'): ApiKeyComponents {
    const prefix = `nh_${environment}`;
    const random = nanoid();  // 24 chars

    // Generate checksum: first 4 chars of SHA-256 hash (uppercase)
    const hash = crypto.createHash('sha256').update(`${prefix}_${random}`).digest('hex');
    const checksum = hash.substring(0, 4).toUpperCase();

    const full = `${prefix}_${random}_${checksum}`;

    return { prefix, random, checksum, full };
  }

  /**
   * Validate API key format and checksum before database lookup.
   * Returns false for invalid format to prevent unnecessary DB queries.
   *
   * T-35-04: Pre-validation rejects 99.99% invalid guesses before DB lookup.
   */
  validateApiKeyFormat(key: string): boolean {
    // Format: nh_(live|test)_<24-chars>_<4-chars>
    const pattern = /^nh_(live|test)_[0-9A-Za-z]{24}_[0-9A-F]{4}$/;
    if (!pattern.test(key)) {
      return false;
    }

    // Extract components
    const parts = key.split('_');
    const prefix = `${parts[0]}_${parts[1]}`;  // nh_live or nh_test
    const random = parts[2];
    const providedChecksum = parts[3];

    // Recalculate checksum
    const hash = crypto.createHash('sha256').update(`${prefix}_${random}`).digest('hex');
    const expectedChecksum = hash.substring(0, 4).toUpperCase();

    return providedChecksum === expectedChecksum;
  }

  /**
   * Create new API key for user.
   * Throws if user already has MAX_KEYS_PER_USER active keys.
   *
   * T-35-05: Key hashed with bcrypt factor 10 before storage.
   * Plaintext returned ONCE at creation (user must copy immediately).
   */
  async createApiKey(
    userId: string,
    name: string,
    tier: ApiKeyTier = 'free',
    environment: ApiKeyEnv = 'live'
  ): Promise<{ key: string; keyData: ApiKeyData }> {
    // Check key limit (D-10)
    const activeKeys = await prisma.apiKey.count({
      where: {
        userId,
        revokedAt: null,
      },
    });

    if (activeKeys >= MAX_KEYS_PER_USER) {
      throw new Error(`Maximum ${MAX_KEYS_PER_USER} API keys per user. Revoke an existing key first.`);
    }

    // Generate key
    const { full } = this.generateApiKey(environment);

    // Hash for storage (never store plaintext) - T-35-05
    const keyHash = await bcrypt.hash(full, 10);

    // Create in database
    const apiKey = await prisma.apiKey.create({
      data: {
        keyHash,
        name,
        tier,
        environment,
        userId,
        createdAt: new Date(),
      },
    });

    // Return plaintext key ONCE (user must copy it now)
    const keyData: ApiKeyData = {
      id: apiKey.id,
      name: apiKey.name,
      tier: apiKey.tier as ApiKeyTier,
      environment: apiKey.environment as ApiKeyEnv,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      requestCount: apiKey.requestCount,
    };

    return { key: full, keyData };
  }

  /**
   * Validate API key against database.
   * Returns key metadata if valid, null if invalid/revoked.
   *
   * Note: This iterates active keys and uses bcrypt.compare for each.
   * Performance consideration: For high-volume APIs, consider caching
   * validated keys in Redis.
   */
  async validateApiKey(key: string): Promise<{
    keyId: string;
    userId: string;
    tier: ApiKeyTier;
    environment: ApiKeyEnv;
  } | null> {
    // Pre-validation: check format and checksum (T-35-08)
    if (!this.validateApiKeyFormat(key)) {
      return null;
    }

    // Fetch all active keys (need to iterate for bcrypt comparison)
    const apiKeys = await prisma.apiKey.findMany({
      where: { revokedAt: null },
      select: {
        id: true,
        keyHash: true,
        userId: true,
        tier: true,
        environment: true,
      },
    });

    // Find matching key by hash comparison
    for (const record of apiKeys) {
      const match = await bcrypt.compare(key, record.keyHash);
      if (match) {
        return {
          keyId: record.id,
          userId: record.userId,
          tier: record.tier as ApiKeyTier,
          environment: record.environment as ApiKeyEnv,
        };
      }
    }

    return null;
  }

  /**
   * Get user's API keys (returns metadata only, never hashes).
   * Keys are ordered by creation date, newest first.
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyData[]> {
    const keys = await prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      tier: key.tier as ApiKeyTier,
      environment: key.environment as ApiKeyEnv,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      requestCount: key.requestCount,
    }));
  }

  /**
   * Revoke API key.
   * Once revoked, key cannot be used and is excluded from listings.
   */
  async revokeApiKey(keyId: string, userId: string, reason?: string): Promise<void> {
    const key = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) {
      throw new Error('API key not found');
    }

    if (key.userId !== userId) {
      throw new Error('Unauthorized: not your API key');
    }

    if (key.revokedAt) {
      throw new Error('API key already revoked');
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    // Phase 35.1 hotfix: invalidate cache so revocation takes effect immediately
    // (previously a 5-min stale-cache window let revoked keys keep working)
    const cacheService = CacheService.getInstance();
    if (cacheService.isAvailable()) {
      const secondaryKey = `apikey:by-id:${keyId}`;
      const cacheKey = await cacheService.get<string>(secondaryKey);
      if (cacheKey) {
        await cacheService.del(cacheKey);
      }
      await cacheService.del(secondaryKey);
    }
  }

  /**
   * Update lastUsedAt timestamp and increment request count.
   * Called async from middleware (fire-and-forget), never blocks request.
   */
  async trackUsage(keyId: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    });
  }
}

// Export singleton getter for convenience
export const getApiKeyService = () => ApiKeyService.getInstance();
