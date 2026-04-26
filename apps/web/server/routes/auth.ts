import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, authMiddleware } from '../services/authService';

export const authRoutes = Router();

const authService = AuthService.getInstance();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// Zod validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(64).max(64, 'Invalid token format'),
});

const requestResetSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(64).max(64, 'Invalid token format'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const validateResetTokenSchema = z.object({
  token: z.string().min(64).max(64, 'Invalid token format'),
});

// Helper to format Zod errors
function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

// Register
authRoutes.post('/register', async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { email, password, name } = result.data;

  try {
    const authResult = await authService.register(email, password, name);
    res.status(201).json({
      success: true,
      data: authResult,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed',
    });
  }
});

// Login
authRoutes.post('/login', async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { email, password } = result.data;

  try {
    const authResult = await authService.login(email, password);
    res.json({
      success: true,
      data: authResult,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err instanceof Error ? err.message : 'Login failed',
    });
  }
});

// Get current user
authRoutes.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await authService.getUserById(req.user!.userId);

  if (!user) {
    res.status(404).json({
      success: false,
      error: 'User not found',
    });
    return;
  }

  res.json({
    success: true,
    data: user,
  });
});

// Update preferences
authRoutes.patch('/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { language, theme, regions } = req.body;

  const preferences = await authService.updatePreferences(req.user!.userId, {
    ...(language && { language }),
    ...(theme && { theme }),
    ...(regions && { regions }),
  });

  if (!preferences) {
    res.status(404).json({
      success: false,
      error: 'User not found',
    });
    return;
  }

  res.json({
    success: true,
    data: preferences,
  });
});

// Get bookmarks
authRoutes.get('/bookmarks', authMiddleware, async (req: AuthRequest, res: Response) => {
  const bookmarks = await authService.getBookmarks(req.user!.userId);
  res.json({
    success: true,
    data: bookmarks,
  });
});

// Add bookmark
authRoutes.post('/bookmarks/:articleId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { articleId } = req.params;
  const success = await authService.addBookmark(req.user!.userId, articleId);

  if (!success) {
    res.status(404).json({
      success: false,
      error: 'User not found',
    });
    return;
  }

  res.json({
    success: true,
    data: { articleId, action: 'added' },
  });
});

// Remove bookmark
authRoutes.delete('/bookmarks/:articleId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { articleId } = req.params;
  const success = await authService.removeBookmark(req.user!.userId, articleId);

  if (!success) {
    res.status(404).json({
      success: false,
      error: 'User not found',
    });
    return;
  }

  res.json({
    success: true,
    data: { articleId, action: 'removed' },
  });
});

// Verify token (for frontend to check if still valid)
authRoutes.get('/verify', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: { valid: true, userId: req.user!.userId },
  });
});

// Logout - blacklist current token (D-01, D-02)
authRoutes.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Get the token from the request
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // Shouldn't happen since authMiddleware passed, but be defensive
      res.json({ success: true, data: { message: 'Logged out' } });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer '
    const blacklisted = await authService.blacklistToken(token);

    if (blacklisted) {
      console.log(`logout:blacklisted userId=${req.user!.userId}`);
    } else {
      console.log(`logout:redis_unavailable userId=${req.user!.userId}`);
    }

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    console.error('logout:error', err);
    // Still return success - user intended to log out
    res.json({
      success: true,
      data: { message: 'Logged out' },
    });
  }
});

// Change password
authRoutes.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  const result = changePasswordSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { currentPassword, newPassword } = result.data;

  try {
    const success = await authService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );

    if (!success) {
      res.status(400).json({
        success: false,
        error: 'Current password is incorrect',
      });
      return;
    }

    // D-02: Blacklist current token after password change
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.slice(7);
      const blacklisted = await authService.blacklistToken(token);
      if (blacklisted) {
        console.log(`password_change:blacklisted userId=${req.user!.userId}`);
      }
    }

    res.json({
      success: true,
      data: { message: 'Password changed successfully' },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to change password',
    });
  }
});

// Verify email (D-10, D-12, D-21)
authRoutes.get('/verify-email', async (req: Request, res: Response) => {
  const result = verifyEmailSchema.safeParse({ token: req.query.token });

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid link', // D-42: Generic error
    });
    return;
  }

  const { token } = result.data;

  try {
    const verifyResult = await authService.verifyEmail(token);

    if (verifyResult.alreadyVerified) {
      // D-10: Already verified
      res.json({
        success: true,
        data: { message: 'Email already verified', alreadyVerified: true },
      });
      return;
    }

    if (verifyResult.expired) {
      // D-41: Expired link
      res.status(400).json({
        success: false,
        error: 'Link expired',
        expired: true,
      });
      return;
    }

    if (!verifyResult.success) {
      // D-42: Invalid/tampered token
      res.status(400).json({
        success: false,
        error: 'Invalid link',
      });
      return;
    }

    // D-12: Success
    res.json({
      success: true,
      data: { message: 'Email verified successfully' },
    });
  } catch (err) {
    console.error('verify-email:error', err);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
});

// Resend verification email (D-03)
authRoutes.post('/resend-verification', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await authService.resendVerification(req.user!.userId);

    if (result.rateLimited) {
      // D-44: Rate limit error with cooldown timer
      res.status(429).json({
        success: false,
        error: `Too many requests. Try again in ${result.minutesRemaining} minutes.`,
        rateLimited: true,
        minutesRemaining: result.minutesRemaining,
      });
      return;
    }

    res.json({
      success: true,
      data: { message: 'Verification email sent' },
    });
  } catch (err) {
    console.error('resend-verification:error', err);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification email',
    });
  }
});

// Request password reset (D-26, D-34)
authRoutes.post('/request-reset', async (req: Request, res: Response) => {
  const result = requestResetSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { email } = result.data;

  try {
    const resetResult = await authService.requestPasswordReset(email);

    if (resetResult.rateLimited) {
      // D-44: Rate limit with cooldown
      res.status(429).json({
        success: false,
        error: `Too many requests. Try again in ${resetResult.minutesRemaining} minutes.`,
        rateLimited: true,
        minutesRemaining: resetResult.minutesRemaining,
      });
      return;
    }

    // D-34: Always same response to prevent enumeration
    res.json({
      success: true,
      data: { message: 'If an account exists, a reset email has been sent.' },
    });
  } catch (err) {
    console.error('request-reset:error', err);
    // D-34: Same response even on error
    res.json({
      success: true,
      data: { message: 'If an account exists, a reset email has been sent.' },
    });
  }
});

// Validate reset token (for showing reset form)
authRoutes.get('/validate-reset-token', async (req: Request, res: Response) => {
  const result = validateResetTokenSchema.safeParse({ token: req.query.token });

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid link',
    });
    return;
  }

  const { token } = result.data;

  try {
    const validateResult = await authService.validateResetToken(token);

    if (!validateResult.valid) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired link',
      });
      return;
    }

    res.json({
      success: true,
      data: { valid: true, email: validateResult.email },
    });
  } catch (err) {
    console.error('validate-reset-token:error', err);
    res.status(400).json({
      success: false,
      error: 'Invalid link',
    });
  }
});

// Reset password (D-27, D-30, D-37)
authRoutes.post('/reset-password', async (req: Request, res: Response) => {
  const result = resetPasswordSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: formatZodError(result.error),
    });
    return;
  }

  const { token, password } = result.data;

  try {
    const resetResult = await authService.resetPassword(token, password);

    if (!resetResult.success) {
      res.status(400).json({
        success: false,
        error: resetResult.error || 'Password reset failed',
      });
      return;
    }

    // D-30: Success page with login link (handled by frontend)
    res.json({
      success: true,
      data: { message: 'Password reset successfully' },
    });
  } catch (err) {
    console.error('reset-password:error', err);
    res.status(500).json({
      success: false,
      error: 'Password reset failed',
    });
  }
});

// Check verification status (for frontend)
authRoutes.get('/verification-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isVerified = await authService.isUserVerified(req.user!.userId);
    res.json({
      success: true,
      data: { emailVerified: isVerified },
    });
  } catch (err) {
    console.error('verification-status:error', err);
    res.status(500).json({
      success: false,
      error: 'Failed to check verification status',
    });
  }
});
