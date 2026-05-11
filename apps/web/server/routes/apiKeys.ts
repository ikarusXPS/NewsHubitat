/**
 * API Key Management Routes (Phase 35-04)
 * CRUD endpoints for self-service API key management.
 *
 * Endpoints:
 * - GET /api/keys - List user's API keys
 * - POST /api/keys - Create new API key (max 3 per user)
 * - DELETE /api/keys/:keyId - Revoke API key
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../services/authService';
import { ApiKeyService } from '../services/apiKeyService';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

export const apiKeyRoutes = Router();

// Zod schemas for request validation
const createApiKeySchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name too long'),
  tier: z.enum(['free', 'pro']).default('free'),
  environment: z.enum(['live', 'test']).default('live'),
});

const revokeApiKeySchema = z.object({
  reason: z.string().optional(),
});

/**
 * Format Zod errors into a comma-separated string.
 */
function formatZodError(error: z.ZodError): string {
  return error.issues.map((e) => e.message).join(', ');
}

/**
 * GET /api/keys - List user's API keys
 *
 * Returns list of user's active API keys with metadata (no hashes).
 * Fields: id, name, tier, environment, createdAt, lastUsedAt, requestCount
 */
apiKeyRoutes.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const apiKeyService = ApiKeyService.getInstance();
    const keys = await apiKeyService.getUserApiKeys(req.user!.userId);

    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    logger.error('GET /api/keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys',
    });
  }
});

/**
 * POST /api/keys - Create new API key
 *
 * D-10: Max 3 keys per user (enforced in service layer)
 * Returns plaintext key ONCE - user must copy immediately.
 */
apiKeyRoutes.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = createApiKeySchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { name, tier, environment } = result.data;

  try {
    const apiKeyService = ApiKeyService.getInstance();
    const { key, keyData } = await apiKeyService.createApiKey(
      req.user!.userId,
      name,
      tier,
      environment
    );

    // Return plaintext key ONCE - T-35-14: user must store securely
    res.status(201).json({
      success: true,
      data: {
        key, // Plaintext key - user must copy now
        keyData,
      },
      message: "API key created. Copy it now - you won't see it again.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create API key';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/keys/:keyId - Revoke API key
 *
 * T-35-17: Backend checks userId matches key owner before revocation.
 */
apiKeyRoutes.delete('/:keyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = revokeApiKeySchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { reason } = result.data;

  try {
    const apiKeyService = ApiKeyService.getInstance();
    await apiKeyService.revokeApiKey(req.params.keyId, req.user!.userId, reason);

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to revoke API key';
    res.status(400).json({
      success: false,
      error: message,
    });
  }
});
