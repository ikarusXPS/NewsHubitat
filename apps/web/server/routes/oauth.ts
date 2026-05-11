/**
 * OAuth Routes
 * Handles Google and GitHub OAuth authentication flows
 */
import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { OAuthService } from '../services/oauthService';
import { authMiddleware } from '../services/authService';
import { generateCallbackHtml } from '../utils/oauthCallbackHtml';
import { GOOGLE_SCOPES, GITHUB_SCOPES } from '../config/passport';
import logger from '../utils/logger';

export const oauthRoutes = Router();

const oauthService = OAuthService.getInstance();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// Zod schemas for input validation
const linkAccountSchema = z.object({
  provider: z.enum(['google', 'github']),
  providerId: z.string().min(1, 'Provider ID required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

const unlinkAccountSchema = z.object({
  provider: z.enum(['google', 'github']),
  password: z.string().optional(), // Optional if user has other OAuth
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

// ============================================================================
// GOOGLE OAUTH
// ============================================================================

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow
 * Opens in popup, redirects to Google consent screen
 */
oauthRoutes.get(
  '/google',
  passport.authenticate('google', {
    scope: GOOGLE_SCOPES,
    session: false,
  })
);

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback
 * Returns HTML that posts result to parent window (popup flow per D-08)
 */
oauthRoutes.get(
  '/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', { session: false }, (err: Error | null, result: unknown) => {
      if (err) {
        logger.error('google:callback:error', err);
        res.send(generateCallbackHtml(null, false, err.message));
        return;
      }

      if (!result) {
        res.send(generateCallbackHtml(null, false, 'Authentication failed'));
        return;
      }

      const oauthResult = result as {
        token: string | null;
        needsLinking: boolean;
        email?: string;
        error?: string;
      };

      if (oauthResult.error) {
        res.send(generateCallbackHtml(null, false, oauthResult.error));
        return;
      }

      res.send(generateCallbackHtml(
        oauthResult.token,
        oauthResult.needsLinking,
        null,
        oauthResult.email
      ));
    })(req, res, next);
  }
);

// ============================================================================
// GITHUB OAUTH
// ============================================================================

/**
 * GET /api/auth/github
 * Initiates GitHub OAuth flow
 */
oauthRoutes.get(
  '/github',
  passport.authenticate('github', {
    scope: GITHUB_SCOPES,
    session: false,
  })
);

/**
 * GET /api/auth/github/callback
 * Handles GitHub OAuth callback
 */
oauthRoutes.get(
  '/github/callback',
  (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('github', { session: false }, (err: Error | null, result: unknown) => {
      if (err) {
        logger.error('github:callback:error', err);
        res.send(generateCallbackHtml(null, false, err.message));
        return;
      }

      if (!result) {
        res.send(generateCallbackHtml(null, false, 'Authentication failed'));
        return;
      }

      const oauthResult = result as {
        token: string | null;
        needsLinking: boolean;
        email?: string;
        error?: string;
      };

      if (oauthResult.error) {
        res.send(generateCallbackHtml(null, false, oauthResult.error));
        return;
      }

      res.send(generateCallbackHtml(
        oauthResult.token,
        oauthResult.needsLinking,
        null,
        oauthResult.email
      ));
    })(req, res, next);
  }
);

// ============================================================================
// ACCOUNT LINKING (D-01, D-02, D-03)
// ============================================================================

/**
 * POST /api/auth/oauth/link
 * Link OAuth provider to existing account
 * Requires password verification per D-01
 */
oauthRoutes.post('/oauth/link', async (req: Request, res: Response) => {
  const result = linkAccountSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { provider, providerId, email, password } = result.data;

  try {
    const linkResult = await oauthService.linkOAuthAccount(provider, providerId, email, password);

    if (!linkResult.success) {
      res.status(400).json({
        success: false,
        error: linkResult.error,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user: linkResult.user,
        token: linkResult.token,
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account linked successfully`,
      },
    });
  } catch (err) {
    logger.error('oauth:link:error', err);
    res.status(500).json({
      success: false,
      error: 'Failed to link account',
    });
  }
});

/**
 * POST /api/auth/oauth/unlink
 * Unlink OAuth provider from account
 * D-12: Blocks if it's the only login method
 */
oauthRoutes.post('/oauth/unlink', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = unlinkAccountSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { provider, password } = result.data;

  try {
    const unlinkResult = await oauthService.unlinkOAuthAccount(
      req.user!.userId,
      provider,
      password || ''
    );

    if (!unlinkResult.success) {
      res.status(400).json({
        success: false,
        error: unlinkResult.error,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked`,
      },
    });
  } catch (err) {
    logger.error('oauth:unlink:error', err);
    res.status(500).json({
      success: false,
      error: 'Failed to unlink account',
    });
  }
});

/**
 * GET /api/auth/oauth/providers
 * Get connected OAuth providers for current user
 */
oauthRoutes.get('/oauth/providers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const providers = await oauthService.getConnectedProviders(req.user!.userId);

    res.json({
      success: true,
      data: providers,
    });
  } catch (err) {
    logger.error('oauth:providers:error', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get connected providers',
    });
  }
});
