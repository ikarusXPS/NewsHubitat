/**
 * Unit tests for AuthService
 * Tests JWT validation, auth flows, email verification, password reset, and rate limiting
 */

import { describe, it, expect, afterEach, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock Prisma at file top (D-01, D-02)
vi.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    bookmark: {
      upsert: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock EmailService (D-01)
const mockEmailService = {
  sendVerification: vi.fn().mockResolvedValue(true),
  sendPasswordResetBilingual: vi.fn().mockResolvedValue(true),
  sendPasswordChangeConfirmation: vi.fn().mockResolvedValue(true),
};

vi.mock('./emailService', () => ({
  EmailService: {
    getInstance: vi.fn(() => mockEmailService),
  },
}));

// Mock logger (D-01)
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock disposable email utility
vi.mock('../utils/disposableEmail', () => ({
  isDisposableEmail: vi.fn((email: string) => email.includes('tempmail')),
}));

import { prisma } from '../db/prisma';
import { EmailService } from './emailService';

// Set JWT_SECRET before importing authService
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';
});

import { AuthService, authMiddleware } from './authService';

// Singleton reset pattern (D-09, D-10)
afterEach(() => {
  (AuthService as unknown as { instance: AuthService | null }).instance = null;
  vi.clearAllMocks();
});

describe('AuthService', () => {
  describe('getInstance', () => {
    it('returns same instance (singleton pattern)', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('creates user with hashed password', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        passwordHash: 'hashed',
        name: 'Test User',
        role: 'user',
        emailVerified: false,
        preferences: '{"language":"de","theme":"dark","regions":[]}',
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: 'hash',
        verificationTokenExpiry: new Date(),
        verificationSendCount: 1,
        lastVerificationSentAt: new Date(),
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.register('test@example.com', 'securepassword123', 'Test User');

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(result.token).toBeTruthy();
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('throws for invalid email format', async () => {
      const authService = AuthService.getInstance();

      await expect(
        authService.register('invalid-email', 'securepassword123', 'Test')
      ).rejects.toThrow('Invalid email format');
    });

    it('throws for disposable email (e.g., tempmail.com)', async () => {
      const authService = AuthService.getInstance();

      await expect(
        authService.register('test@tempmail.com', 'securepassword123', 'Test')
      ).rejects.toThrow('Disposable email addresses are not allowed');
    });

    it('throws for existing email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u1',
        email: 'existing@example.com',
        passwordHash: 'hash',
        name: 'Existing',
        role: 'user',
        emailVerified: true,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      });

      const authService = AuthService.getInstance();

      await expect(
        authService.register('existing@example.com', 'securepassword123', 'Test')
      ).rejects.toThrow('Email already registered');
    });

    it('throws for password < 12 characters', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const authService = AuthService.getInstance();

      await expect(
        authService.register('test@example.com', 'short', 'Test')
      ).rejects.toThrow('Password must be at least 12 characters');
    });
  });

  describe('login', () => {
    it('returns user and token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('securepassword123', 10);
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        passwordHash,
        name: 'Test User',
        role: 'user',
        emailVerified: true,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.login('test@example.com', 'securepassword123');

      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBeTruthy();
    });

    it('throws for non-existent email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const authService = AuthService.getInstance();

      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws for wrong password', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        passwordHash,
        name: 'Test User',
        role: 'user',
        emailVerified: true,
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();

      await expect(
        authService.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('verifyToken', () => {
    it('returns payload for valid JWT', () => {
      const authService = AuthService.getInstance();
      const token = jwt.sign(
        { userId: 'u1', email: 'test@example.com', tokenVersion: 0 },
        'test-secret-key-for-testing-purposes-only',
        { expiresIn: '7d' }
      );

      const result = authService.verifyToken(token);

      expect(result).toBeTruthy();
      expect(result?.userId).toBe('u1');
      expect(result?.email).toBe('test@example.com');
      expect(result?.tokenVersion).toBe(0);
    });

    it('returns null for expired JWT (D-06)', () => {
      const authService = AuthService.getInstance();
      // Create JWT that expired 1 hour ago
      const expiredToken = jwt.sign(
        { userId: 'u1', email: 'test@example.com', tokenVersion: 0 },
        'test-secret-key-for-testing-purposes-only',
        { expiresIn: '-1h' }
      );

      const result = authService.verifyToken(expiredToken);

      expect(result).toBeNull();
    });

    it('returns null for malformed JWT (D-06)', () => {
      const authService = AuthService.getInstance();
      const result = authService.verifyToken('not.a.valid.jwt');

      expect(result).toBeNull();
    });

    it('returns null for wrong signature (D-06)', () => {
      const authService = AuthService.getInstance();
      const wrongSignatureToken = jwt.sign(
        { userId: 'u1', email: 'test@example.com', tokenVersion: 0 },
        'wrong-secret-key',
        { expiresIn: '7d' }
      );

      const result = authService.verifyToken(wrongSignatureToken);

      expect(result).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('returns { success: true } for valid token', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        emailVerified: false,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        name: 'Test',
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: 'hashed-token',
        verificationSendCount: 1,
        lastVerificationSentAt: new Date(),
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, emailVerified: true });

      const authService = AuthService.getInstance();
      const result = await authService.verifyEmail('test-token');

      expect(result.success).toBe(true);
      expect(result.alreadyVerified).toBeUndefined();
    });

    it('returns { success: true, alreadyVerified: true } for already verified user', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        emailVerified: true,
        verificationTokenExpiry: new Date(),
        name: 'Test',
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: 'hashed-token',
        verificationSendCount: 1,
        lastVerificationSentAt: new Date(),
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.verifyEmail('test-token');

      expect(result.success).toBe(true);
      expect(result.alreadyVerified).toBe(true);
    });

    it('returns { success: false, expired: true } for expired token', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        emailVerified: false,
        verificationTokenExpiry: new Date(Date.now() - 1000), // Expired
        name: 'Test',
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: 'hashed-token',
        verificationSendCount: 1,
        lastVerificationSentAt: new Date(),
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.verifyEmail('test-token');

      expect(result.success).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('returns { success: false } for invalid token', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const authService = AuthService.getInstance();
      const result = await authService.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
    });
  });

  describe('resendVerification', () => {
    it('succeeds within rate limit (< 3 per hour)', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: false,
        verificationSendCount: 2,
        lastVerificationSentAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: 'hash',
        verificationTokenExpiry: new Date(),
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.resendVerification('u1');

      expect(result.success).toBe(true);
      expect(result.rateLimited).toBeUndefined();
    });

    it('returns rateLimited: true after 3 sends in 1 hour', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: false,
        verificationSendCount: 3,
        lastVerificationSentAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: 'hash',
        verificationTokenExpiry: new Date(),
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.resendVerification('u1');

      expect(result.rateLimited).toBe(true);
      expect(result.minutesRemaining).toBeGreaterThan(0);
    });

    it('returns success for already verified user', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: true,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.resendVerification('u1');

      expect(result.success).toBe(true);
    });
  });

  describe('requestPasswordReset', () => {
    it('always returns { success: true } regardless of email existence (prevent enumeration)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const authService = AuthService.getInstance();
      const result = await authService.requestPasswordReset('nonexistent@example.com');

      expect(result.success).toBe(true);
    });

    it('returns rateLimited after 3 attempts', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: true,
        resetSendCount: 3,
        lastResetSentAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.rateLimited).toBe(true);
      expect(result.minutesRemaining).toBeGreaterThan(0);
    });

    it('sends reset email for valid user', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: true,
        resetSendCount: 0,
        lastResetSentAt: null,
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const emailService = EmailService.getInstance();
      const sendSpy = vi.mocked(emailService.sendPasswordResetBilingual);

      const authService = AuthService.getInstance();
      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  describe('validateResetToken', () => {
    it('returns valid: true for valid token', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        resetTokenHash: 'hashed-token',
        name: 'Test',
        passwordHash: 'hash',
        emailVerified: true,
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.validateResetToken('test-token');

      expect(result.valid).toBe(true);
      expect(result.email).toBe('test@example.com');
    });

    it('returns valid: false for invalid token', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const authService = AuthService.getInstance();
      const result = await authService.validateResetToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.email).toBeUndefined();
    });

    it('returns valid: false for expired token', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        resetTokenExpiry: new Date(Date.now() - 1000), // Expired
        resetTokenHash: 'hashed-token',
        name: 'Test',
        passwordHash: 'hash',
        emailVerified: true,
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.validateResetToken('test-token');

      expect(result.valid).toBe(false);
    });
  });

  describe('resetPassword', () => {
    it('succeeds with valid token and new password', async () => {
      const oldPasswordHash = await bcrypt.hash('oldpassword123', 10);
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: false,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        resetTokenHash: 'hashed-token',
        passwordHash: oldPasswordHash,
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue({ ...mockUser, emailVerified: true });

      const authService = AuthService.getInstance();
      const result = await authService.resetPassword('test-token', 'newpassword123');

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('fails with expired token', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: false,
        resetTokenExpiry: new Date(Date.now() - 1000), // Expired
        resetTokenHash: 'hashed-token',
        passwordHash: 'hash',
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.resetPassword('test-token', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired link');
    });

    it('fails when new password matches old password', async () => {
      const passwordHash = await bcrypt.hash('samepassword123', 10);
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        emailVerified: false,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
        resetTokenHash: 'hashed-token',
        passwordHash,
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.resetPassword('test-token', 'samepassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('New password cannot be the same as old password');
    });

    it('fails with invalid token', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const authService = AuthService.getInstance();
      const result = await authService.resetPassword('invalid-token', 'newpassword123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired link');
    });
  });

  describe('changePassword', () => {
    it('succeeds with correct current password', async () => {
      const currentPasswordHash = await bcrypt.hash('currentpass123', 10);
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: currentPasswordHash,
        emailVerified: true,
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.changePassword('u1', 'currentpass123', 'newpassword123');

      expect(result).toBe(true);
    });

    it('fails with wrong current password', async () => {
      const currentPasswordHash = await bcrypt.hash('currentpass123', 10);
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: currentPasswordHash,
        emailVerified: true,
        role: 'user',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.changePassword('u1', 'wrongpassword', 'newpassword123');

      expect(result).toBe(false);
    });
  });

  describe('authMiddleware', () => {
    it('returns 401 for missing Authorization header', async () => {
      const req = { headers: {} };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      await authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Authentication required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for invalid token', async () => {
      const req = { headers: { authorization: 'Bearer invalid.token.here' } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      await authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 when tokenVersion mismatch (session invalidated)', async () => {
      const token = jwt.sign(
        { userId: 'u1', email: 'test@example.com', tokenVersion: 0 },
        'test-secret-key-for-testing-purposes-only',
        { expiresIn: '7d' }
      );

      const mockUser = {
        id: 'u1',
        tokenVersion: 1, // Different version = session invalidated
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      await authMiddleware(req as any, res as any, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Session invalidated' });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() for valid token', async () => {
      const token = jwt.sign(
        { userId: 'u1', email: 'test@example.com', tokenVersion: 0 },
        'test-secret-key-for-testing-purposes-only',
        { expiresIn: '7d' }
      );

      const mockUser = {
        id: 'u1',
        tokenVersion: 0,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();

      await authMiddleware(req as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('returns user with parsed preferences', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hash',
        emailVerified: true,
        role: 'user',
        preferences: '{"language":"en","theme":"light","regions":["western"]}',
        createdAt: new Date(),
        updatedAt: new Date(),
        bookmarks: [],
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.getUserById('u1');

      expect(result?.preferences).toEqual({
        language: 'en',
        theme: 'light',
        regions: ['western'],
      });
    });

    it('returns null for non-existent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const authService = AuthService.getInstance();
      const result = await authService.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('bookmark management', () => {
    it('addBookmark creates bookmark', async () => {
      vi.mocked(prisma.bookmark.upsert).mockResolvedValue({
        userId: 'u1',
        articleId: 'a1',
        createdAt: new Date(),
      });

      const authService = AuthService.getInstance();
      const result = await authService.addBookmark('u1', 'a1');

      expect(result).toBe(true);
      expect(prisma.bookmark.upsert).toHaveBeenCalled();
    });

    it('removeBookmark deletes bookmark', async () => {
      vi.mocked(prisma.bookmark.delete).mockResolvedValue({
        userId: 'u1',
        articleId: 'a1',
        createdAt: new Date(),
      });

      const authService = AuthService.getInstance();
      const result = await authService.removeBookmark('u1', 'a1');

      expect(result).toBe(true);
      expect(prisma.bookmark.delete).toHaveBeenCalled();
    });

    it('getBookmarks returns article IDs', async () => {
      vi.mocked(prisma.bookmark.findMany).mockResolvedValue([
        { userId: 'u1', articleId: 'a1', createdAt: new Date() },
        { userId: 'u1', articleId: 'a2', createdAt: new Date() },
      ]);

      const authService = AuthService.getInstance();
      const result = await authService.getBookmarks('u1');

      expect(result).toEqual(['a1', 'a2']);
    });
  });

  describe('preferences', () => {
    it('updatePreferences merges with existing preferences', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hash',
        emailVerified: true,
        role: 'user',
        preferences: '{"language":"de","theme":"dark","regions":[]}',
        createdAt: new Date(),
        updatedAt: new Date(),
        verificationTokenHash: null,
        verificationTokenExpiry: null,
        verificationSendCount: 0,
        lastVerificationSentAt: null,
        resetTokenHash: null,
        resetTokenExpiry: null,
        resetSendCount: 0,
        lastResetSentAt: null,
        tokenVersion: 0,
        deletionScheduledAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(prisma.user.update).mockResolvedValue(mockUser);

      const authService = AuthService.getInstance();
      const result = await authService.updatePreferences('u1', { language: 'en' });

      expect(result?.language).toBe('en');
      expect(result?.theme).toBe('dark'); // Preserved
    });
  });

  describe('utility methods', () => {
    it('isUserVerified returns true for verified user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        emailVerified: true,
      } as any);

      const authService = AuthService.getInstance();
      const result = await authService.isUserVerified('u1');

      expect(result).toBe(true);
    });

    it('isUserVerified returns false for unverified user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        emailVerified: false,
      } as any);

      const authService = AuthService.getInstance();
      const result = await authService.isUserVerified('u1');

      expect(result).toBe(false);
    });

    it('getUserCount returns user count', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(42);

      const authService = AuthService.getInstance();
      const result = await authService.getUserCount();

      expect(result).toBe(42);
    });

    it('verifyPassword returns true for matching password', async () => {
      const passwordHash = await bcrypt.hash('testpassword123', 10);

      const authService = AuthService.getInstance();
      const result = await authService.verifyPassword('testpassword123', passwordHash);

      expect(result).toBe(true);
    });

    it('verifyPassword returns false for non-matching password', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 10);

      const authService = AuthService.getInstance();
      const result = await authService.verifyPassword('wrongpassword', passwordHash);

      expect(result).toBe(false);
    });
  });
});
