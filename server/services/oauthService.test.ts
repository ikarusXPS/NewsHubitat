/**
 * Unit tests for OAuthService
 * Tests OAuth authentication flows, account linking, and D-12 unlink protection
 */

// Set JWT_SECRET BEFORE any imports that load oauthService
process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only';

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';

// Prevent process.exit from killing the test runner
const originalExit = process.exit;
beforeAll(() => {
  process.exit = vi.fn() as never;
});
afterAll(() => {
  process.exit = originalExit;
});

// Mock prisma - hoisted factory
vi.mock('../db/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock tokenUtils
vi.mock('../utils/tokenUtils', () => ({
  hashToken: vi.fn((token: string) => `hashed_${token}`),
}));

// Mock disposableEmail
vi.mock('../utils/disposableEmail', () => ({
  isDisposableEmail: vi.fn((email: string) => email.includes('tempmail')),
}));

// Mock emailService - hoisted factory with persistent mock
const mockEmailSend = vi.fn().mockResolvedValue(true);
vi.mock('./emailService', () => ({
  EmailService: {
    getInstance: () => ({
      send: mockEmailSend,
    }),
  },
}));

// Mock bcryptjs for password verification (dynamic import needs both named and default export)
const mockBcryptCompare = vi.fn().mockResolvedValue(true);
vi.mock('bcryptjs', () => ({
  default: {
    compare: mockBcryptCompare,
  },
  compare: mockBcryptCompare,
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock_jwt_token'),
  },
}));

import { OAuthService } from './oauthService';
import { prisma } from '../db/prisma';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import type { Profile as GitHubProfile } from 'passport-github2';

// Get typed mocks for prisma
const mockPrisma = vi.mocked(prisma);

describe('OAuthService', () => {
  let service: OAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for testing
    (OAuthService as unknown as { instance: OAuthService | undefined }).instance = undefined;
    service = OAuthService.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      const instance1 = OAuthService.getInstance();
      const instance2 = OAuthService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('processGoogleAuth', () => {
    const mockGoogleProfile: Partial<GoogleProfile> = {
      id: 'google_123',
      displayName: 'Test User',
      emails: [{ value: 'test@example.com', verified: 'true' }],
      photos: [{ value: 'https://example.com/avatar.jpg' }],
    };

    it('creates new user when Google ID not found and email not registered', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        hasPassword: false,
        googleIdHash: 'hashed_google_123',
        githubIdHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      });

      const result = await service.processGoogleAuth(mockGoogleProfile as GoogleProfile);

      expect(result.token).toBe('mock_jwt_token');
      expect(result.user).not.toBeNull();
      expect(result.needsLinking).toBe(false);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
            emailVerified: true,
            hasPassword: false,
            googleIdHash: 'hashed_google_123',
          }),
        })
      );
    });

    it('returns existing user when Google ID found', async () => {
      const existingUser = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: true,
        hasPassword: true,
        googleIdHash: 'hashed_google_123',
        githubIdHash: null,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      const result = await service.processGoogleAuth(mockGoogleProfile as GoogleProfile);

      expect(result.token).toBe('mock_jwt_token');
      expect(result.needsLinking).toBe(false);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('requires linking when email exists but Google not linked', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        googleIdHash: null,
      });

      const result = await service.processGoogleAuth(mockGoogleProfile as GoogleProfile);

      expect(result.token).toBeNull();
      expect(result.needsLinking).toBe(true);
      expect(result.email).toBe('test@example.com');
    });

    it('rejects disposable email addresses', async () => {
      const disposableProfile: Partial<GoogleProfile> = {
        ...mockGoogleProfile,
        emails: [{ value: 'test@tempmail.com', verified: 'true' }],
      };

      const result = await service.processGoogleAuth(disposableProfile as GoogleProfile);

      expect(result.error).toBe('Disposable email addresses are not allowed');
      expect(result.token).toBeNull();
    });

    it('returns error when no email provided', async () => {
      const noEmailProfile: Partial<GoogleProfile> = {
        ...mockGoogleProfile,
        emails: [],
      };

      const result = await service.processGoogleAuth(noEmailProfile as GoogleProfile);

      expect(result.error).toBe('Email not provided by Google');
    });

    it('uses display name or email prefix for new user name', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const profileWithoutDisplayName: Partial<GoogleProfile> = {
        id: 'google_456',
        emails: [{ value: 'john.doe@example.com', verified: 'true' }],
      };

      mockPrisma.user.create.mockResolvedValue({
        id: 'user_2',
        email: 'john.doe@example.com',
        name: 'john.doe',
        emailVerified: true,
        hasPassword: false,
        googleIdHash: 'hashed_google_456',
        githubIdHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      });

      await service.processGoogleAuth(profileWithoutDisplayName as GoogleProfile);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'john.doe',
          }),
        })
      );
    });
  });

  describe('processGitHubAuth', () => {
    const mockGitHubProfile: Partial<GitHubProfile> = {
      id: 'github_123',
      displayName: 'GitHub User',
      username: 'githubuser',
      emails: [{ value: 'github@example.com', primary: true, verified: true }],
      photos: [{ value: 'https://github.com/avatar.jpg' }],
    };

    it('creates new user when GitHub ID not found and email not registered', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user_1',
        email: 'github@example.com',
        name: 'GitHub User',
        emailVerified: true,
        hasPassword: false,
        googleIdHash: null,
        githubIdHash: 'hashed_github_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      });

      const result = await service.processGitHubAuth(mockGitHubProfile as unknown as GitHubProfile);

      expect(result.token).toBe('mock_jwt_token');
      expect(result.user).not.toBeNull();
      expect(result.needsLinking).toBe(false);
    });

    it('returns existing user when GitHub ID found', async () => {
      const existingUser = {
        id: 'user_1',
        email: 'github@example.com',
        name: 'GitHub User',
        emailVerified: true,
        hasPassword: true,
        googleIdHash: null,
        githubIdHash: 'hashed_github_123',
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findFirst.mockResolvedValue(existingUser);

      const result = await service.processGitHubAuth(mockGitHubProfile as unknown as GitHubProfile);

      expect(result.token).toBe('mock_jwt_token');
      expect(result.needsLinking).toBe(false);
    });

    it('requires linking when email exists but GitHub not linked', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'github@example.com',
        githubIdHash: null,
      });

      const result = await service.processGitHubAuth(mockGitHubProfile as unknown as GitHubProfile);

      expect(result.token).toBeNull();
      expect(result.needsLinking).toBe(true);
      expect(result.email).toBe('github@example.com');
    });

    it('returns error when no email accessible', async () => {
      const noEmailProfile: Partial<GitHubProfile> = {
        id: 'github_456',
        username: 'nomail',
        emails: [],
      };

      const result = await service.processGitHubAuth(noEmailProfile as unknown as GitHubProfile);

      expect(result.error).toBe('Email not accessible from GitHub. Please make your email public or add a verified email.');
    });

    it('prefers primary verified email over others', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const multiEmailProfile: Partial<GitHubProfile> = {
        id: 'github_789',
        displayName: 'Multi Email User',
        username: 'multimail',
        emails: [
          { value: 'secondary@example.com', primary: false, verified: true },
          { value: 'primary@example.com', primary: true, verified: true },
        ],
        photos: [],
      };

      mockPrisma.user.create.mockResolvedValue({
        id: 'user_3',
        email: 'primary@example.com',
        name: 'Multi Email User',
        emailVerified: true,
        hasPassword: false,
        googleIdHash: null,
        githubIdHash: 'hashed_github_789',
        createdAt: new Date(),
        updatedAt: new Date(),
        tokenVersion: 0,
      });

      await service.processGitHubAuth(multiEmailProfile as unknown as GitHubProfile);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'primary@example.com',
          }),
        })
      );
    });
  });

  describe('linkOAuthAccount', () => {
    it('links OAuth account after password verification', async () => {
      const existingUser = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed_password',
        hasPassword: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing link
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        googleIdHash: 'hashed_provider_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        githubIdHash: null,
      });

      const result = await service.linkOAuthAccount(
        'google',
        'provider_123',
        'test@example.com',
        'password123'
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock_jwt_token');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_1' },
          data: { googleIdHash: 'hashed_provider_123' },
        })
      );
    });

    it('links GitHub OAuth account', async () => {
      const existingUser = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed_password',
        hasPassword: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        githubIdHash: 'hashed_github_456',
        googleIdHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
      });

      const result = await service.linkOAuthAccount(
        'github',
        'github_456',
        'test@example.com',
        'password123'
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { githubIdHash: 'hashed_github_456' },
        })
      );
    });

    it('rejects linking when account not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.linkOAuthAccount(
        'google',
        'provider_123',
        'test@example.com',
        'password123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account not found');
    });

    it('rejects linking when account has no password set', async () => {
      const oauthOnlyUser = {
        id: 'user_1',
        email: 'test@example.com',
        passwordHash: null,
        hasPassword: false,
      };
      mockPrisma.user.findUnique.mockResolvedValue(oauthOnlyUser);

      const result = await service.linkOAuthAccount(
        'google',
        'provider_123',
        'test@example.com',
        'password123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account has no password set');
    });

    it('rejects linking when password is invalid', async () => {
      mockBcryptCompare.mockResolvedValueOnce(false);

      const existingUser = {
        id: 'user_1',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        hasPassword: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const result = await service.linkOAuthAccount(
        'google',
        'provider_123',
        'test@example.com',
        'wrongpassword'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });

    it('rejects linking when OAuth ID already linked to another user', async () => {
      const existingUser = {
        id: 'user_1',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        hasPassword: true,
      };
      const otherUser = { id: 'user_2', googleIdHash: 'hashed_provider_123' };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.findFirst.mockResolvedValue(otherUser);

      const result = await service.linkOAuthAccount(
        'google',
        'provider_123',
        'test@example.com',
        'password123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('This OAuth account is already linked to another user');
    });

    it('sends security notification email on successful link', async () => {
      const existingUser = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed_password',
        hasPassword: true,
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.update.mockResolvedValue({
        ...existingUser,
        googleIdHash: 'hashed_provider_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        emailVerified: true,
        githubIdHash: null,
      });

      await service.linkOAuthAccount(
        'google',
        'provider_123',
        'test@example.com',
        'password123'
      );

      expect(mockEmailSend).toHaveBeenCalledWith(
        'test@example.com',
        'NewsHub Security Alert: Google account linked',
        expect.stringContaining('Google account was linked')
      );
    });
  });

  describe('unlinkOAuthAccount', () => {
    it('unlinks OAuth account when user has password', async () => {
      const user = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed_password',
        hasPassword: true,
        googleIdHash: 'hashed_123',
        githubIdHash: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, googleIdHash: null });

      const result = await service.unlinkOAuthAccount('user_1', 'google', 'password');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { googleIdHash: null },
        })
      );
    });

    it('unlinks GitHub OAuth account', async () => {
      const user = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed_password',
        hasPassword: true,
        googleIdHash: null,
        githubIdHash: 'hashed_github',
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, githubIdHash: null });

      const result = await service.unlinkOAuthAccount('user_1', 'github', 'password');

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { githubIdHash: null },
        })
      );
    });

    it('blocks unlink when only login method (D-12)', async () => {
      const oauthOnlyUser = {
        id: 'user_1',
        email: 'test@example.com',
        hasPassword: false,
        googleIdHash: 'hashed_123',
        githubIdHash: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(oauthOnlyUser);

      const result = await service.unlinkOAuthAccount('user_1', 'google', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot unlink your only login method. Set a password first.');
    });

    it('allows unlink when other OAuth provider is linked', async () => {
      const multiOAuthUser = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test',
        hasPassword: false,
        googleIdHash: 'hashed_google',
        githubIdHash: 'hashed_github',
      };
      mockPrisma.user.findUnique.mockResolvedValue(multiOAuthUser);
      mockPrisma.user.update.mockResolvedValue({ ...multiOAuthUser, googleIdHash: null });

      const result = await service.unlinkOAuthAccount('user_1', 'google', '');

      expect(result.success).toBe(true);
    });

    it('returns error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.unlinkOAuthAccount('nonexistent', 'google', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('rejects unlink when password is invalid', async () => {
      mockBcryptCompare.mockResolvedValueOnce(false);

      const user = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed_password',
        hasPassword: true,
        googleIdHash: 'hashed_123',
        githubIdHash: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.unlinkOAuthAccount('user_1', 'google', 'wrongpassword');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });

    it('sends security notification email on successful unlink', async () => {
      const user = {
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'hashed_password',
        hasPassword: true,
        googleIdHash: 'hashed_123',
        githubIdHash: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, googleIdHash: null });

      await service.unlinkOAuthAccount('user_1', 'google', 'password');

      expect(mockEmailSend).toHaveBeenCalledWith(
        'test@example.com',
        'NewsHub Security Alert: Google account unlinked',
        expect.stringContaining('Google account was unlinked')
      );
    });
  });

  describe('getConnectedProviders', () => {
    it('returns connected provider status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        googleIdHash: 'hashed_google',
        githubIdHash: null,
        hasPassword: true,
      });

      const result = await service.getConnectedProviders('user_1');

      expect(result).toEqual({
        google: true,
        github: false,
        hasPassword: true,
      });
    });

    it('returns all providers connected', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        googleIdHash: 'hashed_google',
        githubIdHash: 'hashed_github',
        hasPassword: true,
      });

      const result = await service.getConnectedProviders('user_1');

      expect(result).toEqual({
        google: true,
        github: true,
        hasPassword: true,
      });
    });

    it('returns no providers connected for OAuth-only user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        googleIdHash: 'hashed_google',
        githubIdHash: null,
        hasPassword: false,
      });

      const result = await service.getConnectedProviders('user_1');

      expect(result).toEqual({
        google: true,
        github: false,
        hasPassword: false,
      });
    });

    it('returns defaults when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getConnectedProviders('nonexistent');

      expect(result).toEqual({
        google: false,
        github: false,
        hasPassword: true,
      });
    });
  });
});
