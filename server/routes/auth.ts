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
