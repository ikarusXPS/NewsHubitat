import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { generateSecureToken, hashToken, getTokenExpiry, isTokenExpired } from '../utils/tokenUtils';
import { isDisposableEmail } from '../utils/disposableEmail';
import { EmailService } from './emailService';
import { CacheService, CACHE_TTL } from './cacheService';
import logger from '../utils/logger';

interface UserPreferences {
  language: 'de' | 'en';
  theme: 'dark' | 'light';
  regions: string[];
}

interface JWTPayload {
  userId: string;
  email: string;
  tokenVersion: number;  // For session invalidation (D-28)
}

// Safe user type without password hash
interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  preferences: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;  // Added for verification status
}

// SECURITY: JWT_SECRET must be set in environment - no fallback allowed
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  logger.error('FATAL: JWT_SECRET environment variable is not set');
  logger.error('Set JWT_SECRET in .env file or environment before starting the server');
  process.exit(1);
}

const JWT_EXPIRES_IN = '7d';
const MIN_PASSWORD_LENGTH = 12;
const VERIFICATION_EXPIRY_HOURS = 24;  // D-02
const RESET_EXPIRY_HOURS = 1;          // D-25
const MAX_SENDS_PER_HOUR = 3;          // D-03, D-26

export class AuthService {
  private static instance: AuthService;

  private constructor() {
    logger.info('Auth service initialized with Prisma');
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(email: string, password: string, name: string): Promise<{ user: SafeUser; token: string; emailSent: boolean }> {
    // Validate email format
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Block disposable emails (D-16)
    if (isDisposableEmail(email)) {
      throw new Error('Disposable email addresses are not allowed');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Validate password
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate verification token (D-11, D-13, D-14)
    const { token: verificationToken, hash: verificationTokenHash } = generateSecureToken();

    // Create user with verification fields
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        emailVerified: false,
        verificationTokenHash,
        verificationTokenExpiry: getTokenExpiry(VERIFICATION_EXPIRY_HOURS),
        verificationSendCount: 1,
        lastVerificationSentAt: new Date(),
        preferences: JSON.stringify({
          language: 'de',
          theme: 'dark',
          regions: ['western', 'middle-east', 'turkish', 'russian', 'chinese', 'alternative'],
        }),
      },
    });

    // Send verification email (D-11) - don't fail registration on email failure (D-46)
    const emailService = EmailService.getInstance();
    let emailSent = false;
    try {
      emailSent = await emailService.sendVerification(user.email, user.name, verificationToken);
      logger.info(`verification:${emailSent ? 'sent' : 'failed'} email=${user.email}`);
    } catch (err) {
      logger.error('verification:send_error', err);
    }

    // Generate JWT token
    const jwtToken = this.generateToken(user);

    // Return user without password (omit hash fields)
     
    const { passwordHash: _ph, verificationTokenHash: _vth, resetTokenHash: _rth, ...safeUser } = user;
    return { user: safeUser as SafeUser, token: jwtToken, emailSent };
  }

  async login(email: string, password: string): Promise<{ user: SafeUser; token: string }> {
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

  async getUserById(id: string): Promise<(SafeUser & { bookmarks: unknown[]; preferences: UserPreferences | null }) | null> {
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
      logger.error('Failed to add bookmark:', err);
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
      logger.error('Failed to remove bookmark:', err);
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

  /**
   * Verify email with token (D-10, D-12, D-15)
   */
  async verifyEmail(token: string): Promise<{ success: boolean; alreadyVerified?: boolean; expired?: boolean }> {
    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: { verificationTokenHash: tokenHash },
    });

    if (!user) {
      // Check if user exists with this email already verified (D-10)
      logger.info('verification:invalid_token');
      return { success: false };
    }

    // Already verified (D-10)
    if (user.emailVerified) {
      logger.info(`verification:already_verified email=${user.email}`);
      return { success: true, alreadyVerified: true };
    }

    // Token expired (D-02)
    if (isTokenExpired(user.verificationTokenExpiry)) {
      logger.info(`verification:expired email=${user.email}`);
      return { success: false, expired: true };
    }

    // Verify and clear token (D-15)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationTokenHash: null,
        verificationTokenExpiry: null,
      },
    });

    logger.info(`verification:verified email=${user.email}`);
    return { success: true };
  }

  /**
   * Resend verification email with rate limiting (D-03)
   */
  async resendVerification(userId: string): Promise<{ success: boolean; rateLimited?: boolean; minutesRemaining?: number }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false };

    if (user.emailVerified) {
      return { success: true }; // Already verified, nothing to do
    }

    // Rate limit check (D-03: max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (user.lastVerificationSentAt && user.lastVerificationSentAt > oneHourAgo) {
      if (user.verificationSendCount >= MAX_SENDS_PER_HOUR) {
        const minutesRemaining = Math.ceil(
          (user.lastVerificationSentAt.getTime() + 60 * 60 * 1000 - Date.now()) / (60 * 1000)
        );
        logger.info(`verification:rate_limited email=${user.email} minutes=${minutesRemaining}`);
        return { success: false, rateLimited: true, minutesRemaining };
      }
    }

    // Generate new token (D-15: invalidates previous)
    const { token: verificationToken, hash: verificationTokenHash } = generateSecureToken();

    // Reset counter if hour has passed
    const newCount = (user.lastVerificationSentAt && user.lastVerificationSentAt > oneHourAgo)
      ? user.verificationSendCount + 1
      : 1;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationTokenHash,
        verificationTokenExpiry: getTokenExpiry(VERIFICATION_EXPIRY_HOURS),
        verificationSendCount: newCount,
        lastVerificationSentAt: new Date(),
      },
    });

    // Send email
    const emailService = EmailService.getInstance();
    const sent = await emailService.sendVerification(user.email, user.name, verificationToken);
    logger.info(`verification:resent email=${user.email} sent=${sent}`);

    return { success: sent };
  }

  /**
   * Request password reset (D-26, D-34, D-36)
   * Always returns success to prevent email enumeration
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; rateLimited?: boolean; minutesRemaining?: number }> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // D-34, D-50: Generic response regardless of user existence
    if (!user) {
      logger.info(`reset:request_nonexistent email=${email}`);
      return { success: true }; // Same response as success
    }

    // D-50: Same response for disposable emails
    if (isDisposableEmail(email)) {
      logger.info(`reset:request_disposable email=${email}`);
      return { success: true };
    }

    // Rate limit check (D-26: max 3 per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (user.lastResetSentAt && user.lastResetSentAt > oneHourAgo) {
      if (user.resetSendCount >= MAX_SENDS_PER_HOUR) {
        const minutesRemaining = Math.ceil(
          (user.lastResetSentAt.getTime() + 60 * 60 * 1000 - Date.now()) / (60 * 1000)
        );
        logger.info(`reset:rate_limited email=${email} minutes=${minutesRemaining}`);
        return { success: false, rateLimited: true, minutesRemaining };
      }
    }

    // Generate new token (D-36: invalidates previous)
    const { token: resetToken, hash: resetTokenHash } = generateSecureToken();

    // Reset counter if hour has passed
    const newCount = (user.lastResetSentAt && user.lastResetSentAt > oneHourAgo)
      ? user.resetSendCount + 1
      : 1;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash,
        resetTokenExpiry: getTokenExpiry(RESET_EXPIRY_HOURS),
        resetSendCount: newCount,
        lastResetSentAt: new Date(),
      },
    });

    // Send email (D-29: shows name only)
    const emailService = EmailService.getInstance();
    await emailService.sendPasswordResetBilingual(user.email, user.name, resetToken);

    return { success: true };
  }

  /**
   * Validate reset token (for showing reset form)
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: { resetTokenHash: tokenHash },
    });

    if (!user) {
      logger.info('reset:invalid_token');
      return { valid: false };
    }

    if (isTokenExpired(user.resetTokenExpiry)) {
      logger.info(`reset:expired email=${user.email}`);
      return { valid: false };
    }

    return { valid: true, email: user.email };
  }

  /**
   * Reset password with token (D-27, D-31, D-32, D-33, D-35, D-37)
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const tokenHash = hashToken(token);

    const user = await prisma.user.findFirst({
      where: { resetTokenHash: tokenHash },
    });

    // D-42, D-49: Generic error for invalid/used tokens
    if (!user) {
      logger.info('reset:invalid_token');
      return { success: false, error: 'Invalid or expired link' };
    }

    if (isTokenExpired(user.resetTokenExpiry)) {
      logger.info(`reset:expired email=${user.email}`);
      return { success: false, error: 'Invalid or expired link' };
    }

    // Validate password length
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return { success: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
    }

    // D-37: New password cannot match old password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return { success: false, error: 'New password cannot be the same as old password' };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Generate recovery token for "wasn't you?" link (D-33)
    const { token: recoveryToken, hash: recoveryTokenHash } = generateSecureToken();

    // D-27, D-28: Increment tokenVersion to invalidate all sessions
    // D-31: Mark email as verified
    // D-35: Invalidate reset token (single-use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: recoveryTokenHash, // Repurpose for recovery (D-33)
        resetTokenExpiry: getTokenExpiry(RESET_EXPIRY_HOURS),
        tokenVersion: { increment: 1 },
        emailVerified: true, // D-31
      },
    });

    logger.info(`reset:password_changed email=${user.email}`);

    // D-32, D-33: Send confirmation with recovery link
    const emailService = EmailService.getInstance();
    await emailService.sendPasswordChangeConfirmation(user.email, user.name, recoveryToken);

    return { success: true };
  }

  /**
   * Check if user is verified
   */
  async isUserVerified(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    return user?.emailVerified ?? false;
  }

  private generateToken(user: { id: string; email: string; tokenVersion?: number }): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion ?? 0,
    };

    return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Verify a password against a hash (for profile editing D-28)
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Stats
  async getUserCount(): Promise<number> {
    return prisma.user.count();
  }

  /**
   * Blacklist a token (D-01, D-02)
   * Called on logout and password change
   * @param token - The JWT token to blacklist
   * @returns true if blacklisted, false if Redis unavailable
   */
  async blacklistToken(token: string): Promise<boolean> {
    const cacheService = CacheService.getInstance();
    // Use WEEK TTL to match JWT_EXPIRES_IN = '7d'
    return cacheService.blacklistToken(token, CACHE_TTL.WEEK);
  }
}

// Middleware for protected routes
export async function authMiddleware(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction
): Promise<void> {
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

  // D-01, D-02: Check token blacklist (Redis)
  // D-03: Graceful degradation - if Redis unavailable, skip check
  const cacheService = CacheService.getInstance();
  const isBlacklisted = await cacheService.isTokenBlacklisted(token);
  if (isBlacklisted) {
    res.status(401).json({ success: false, error: 'Token revoked' });
    return;
  }

  // D-28: Check tokenVersion against database
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { tokenVersion: true },
  });

  if (!user || user.tokenVersion !== payload.tokenVersion) {
    res.status(401).json({ success: false, error: 'Session invalidated' });
    return;
  }

  // Add user info to request
  (req as unknown as { user: JWTPayload }).user = payload;
  next();
}
