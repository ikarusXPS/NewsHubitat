import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';

interface UserPreferences {
  language: 'de' | 'en';
  theme: 'dark' | 'light';
  regions: string[];
}

interface JWTPayload {
  userId: string;
  email: string;
}

// SECURITY: JWT_SECRET must be set in environment - no fallback allowed
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  console.error('Set JWT_SECRET in .env file or environment before starting the server');
  process.exit(1);
}

const JWT_EXPIRES_IN = '7d';
const MIN_PASSWORD_LENGTH = 12;

export class AuthService {
  private static instance: AuthService;

  private constructor() {
    console.log('Auth service initialized with Prisma');
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(email: string, password: string, name: string): Promise<{ user: any; token: string }> {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Validate password - minimum 12 characters for security
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        preferences: JSON.stringify({
          language: 'de',
          theme: 'dark',
          regions: ['western', 'middle-east', 'turkish', 'russian', 'chinese', 'alternative'],
        }),
      },
    });

    // Generate token
    const token = this.generateToken(user);

    // Return user without password
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  async login(email: string, password: string): Promise<{ user: any; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user);

    // Return user without password
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  verifyToken(token: string): JWTPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET!) as JWTPayload;
      return payload;
    } catch {
      return null;
    }
  }

  async getUserById(id: string): Promise<any | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        bookmarks: true,
      },
    });
    if (!user) return null;

    const { passwordHash: _, ...safeUser } = user;
    return {
      ...safeUser,
      preferences: user.preferences ? JSON.parse(user.preferences) : null,
    };
  }

  // Bookmark management
  async addBookmark(userId: string, articleId: string): Promise<boolean> {
    try {
      await prisma.bookmark.upsert({
        where: {
          userId_articleId: {
            userId,
            articleId,
          },
        },
        update: {},
        create: {
          userId,
          articleId,
        },
      });
      return true;
    } catch (err) {
      console.error('Failed to add bookmark:', err);
      return false;
    }
  }

  async removeBookmark(userId: string, articleId: string): Promise<boolean> {
    try {
      await prisma.bookmark.delete({
        where: {
          userId_articleId: {
            userId,
            articleId,
          },
        },
      });
      return true;
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
      return false;
    }
  }

  async getBookmarks(userId: string): Promise<string[]> {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { articleId: true },
    });
    return bookmarks.map((b) => b.articleId);
  }

  // Preferences
  async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return null;

    const currentPrefs = user.preferences ? JSON.parse(user.preferences) : {};
    const newPrefs = { ...currentPrefs, ...preferences };

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: JSON.stringify(newPrefs),
      },
    });

    return newPrefs;
  }

  // Change password
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) return false;

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return false;

    // Hash and set new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return true;
  }

  private generateToken(user: { id: string, email: string }): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
    };

    return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Stats
  async getUserCount(): Promise<number> {
    return prisma.user.count();
  }
}

// Middleware for protected routes
export function authMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const token = authHeader.slice(7);
  const authService = AuthService.getInstance();
  const payload = authService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  // Add user info to request
  (req as unknown as { user: JWTPayload }).user = payload;
  next();
}
