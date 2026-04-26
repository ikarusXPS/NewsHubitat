/**
 * API Key Authentication Middleware (Phase 35, Plan 03)
 *
 * Validates X-API-Key header and attaches key metadata to request.
 * Implements caching for validated keys to reduce database lookups.
 *
 * D-06: Authenticate with X-API-Key header
 * T-35-10: Cache only first 15 chars as key identifier (security)
 * T-35-12: Never log full key
 */
import { Request, Response, NextFunction } from 'express';
import { ApiKeyService, type ApiKeyTier, type ApiKeyEnv } from '../services/apiKeyService';
import { CacheService } from '../services/cacheService';
import logger from '../utils/logger';

/**
 * Extended Request type with API key metadata attached after authentication.
 */
export interface ApiKeyRequest extends Request {
  apiKey?: {
    keyId: string;
    userId: string;
    tier: ApiKeyTier;
    environment: ApiKeyEnv;
  };
}

// Cache TTL for validated keys (5 minutes)
const KEY_CACHE_TTL = 300;

/**
 * API Key Authentication Middleware (D-06)
 *
 * Extracts X-API-Key header, validates the key, and attaches metadata to request.
 * Uses Redis cache to minimize database lookups.
 *
 * Flow:
 * 1. Extract X-API-Key header
 * 2. Check Redis cache for key metadata
 * 3. If cache miss, validate against database
 * 4. Cache valid key metadata for 5 minutes
 * 5. Attach metadata to request for downstream middleware
 * 6. Track usage asynchronously (fire-and-forget)
 */
export async function apiKeyAuth(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const key = req.headers['x-api-key'] as string;

  // No API key provided
  if (!key) {
    res.status(401).json({
      success: false,
      error: 'Missing X-API-Key header',
    });
    return;
  }

  try {
    const apiKeyService = ApiKeyService.getInstance();
    const cacheService = CacheService.getInstance();

    // T-35-10: Cache only first 15 chars as key identifier (security)
    const cacheKey = `apikey:${key.substring(0, 15)}`;
    let keyData: ApiKeyRequest['apiKey'] | null = null;

    // Try cache first
    if (cacheService.isAvailable()) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        keyData = cached as ApiKeyRequest['apiKey'];
        logger.debug(`API key cache hit: ${key.substring(0, 15)}...`);
      }
    }

    // Cache miss - validate against database
    if (!keyData) {
      const validated = await apiKeyService.validateApiKey(key);

      if (validated) {
        keyData = validated;

        // Cache for 5 minutes (T-35-10: cache only metadata, not full key)
        if (cacheService.isAvailable()) {
          await cacheService.set(cacheKey, keyData, KEY_CACHE_TTL);
        }
        logger.debug(`API key validated and cached: ${key.substring(0, 15)}...`);
      }
    }

    // Invalid or revoked key
    if (!keyData) {
      // T-35-12: Never log full key
      logger.warn(`Invalid API key attempt: ${key.substring(0, 15)}...`);
      res.status(401).json({
        success: false,
        error: 'Invalid or revoked API key',
      });
      return;
    }

    // Attach metadata to request for downstream middleware
    req.apiKey = keyData;

    // Fire-and-forget usage tracking (don't block the request)
    void apiKeyService.trackUsage(keyData.keyId).catch((err) => {
      logger.error('Failed to track API usage:', err);
    });

    next();
  } catch (error) {
    logger.error('API key auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
