/**
 * OAuth Service
 * Handles OAuth user authentication and account linking
 */
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { hashToken } from '../utils/tokenUtils';
import { isDisposableEmail } from '../utils/disposableEmail';
import { EmailService } from './emailService';
import type { Profile as GoogleProfile } from 'passport-google-oauth20';
import type { Profile as GitHubProfile } from 'passport-github2';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

// Safe user type matching authService.ts pattern
interface SafeUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: boolean;
  hasPassword: boolean;
  googleIdHash: string | null;
  githubIdHash: string | null;
}

export interface OAuthResult {
  token: string | null;
  user: SafeUser | null;
  needsLinking: boolean;
  email?: string;
  error?: string;
}

export class OAuthService {
  private static instance: OAuthService;

  private constructor() {
    console.log('OAuth service initialized');
  }

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Process Google OAuth authentication
   * D-04: Skip email verification for OAuth signups
   * D-09: Fetch email + name + avatar
   * D-10: Use avatar only if user hasn't set one
   * D-11: Hash provider ID before storing
   */
  async processGoogleAuth(profile: GoogleProfile): Promise<OAuthResult> {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    if (!email) {
      return { token: null, user: null, needsLinking: false, error: 'Email not provided by Google' };
    }

    // Block disposable emails (consistent with registration policy)
    if (isDisposableEmail(email)) {
      return { token: null, user: null, needsLinking: false, error: 'Disposable email addresses are not allowed' };
    }

    const googleIdHash = hashToken(profile.id);

    // Check if user exists by OAuth ID hash
    let user = await prisma.user.findFirst({ where: { googleIdHash } });
    if (user) {
      // Existing OAuth user - return token
      const token = this.generateToken(user);
      return { token, user: this.toSafeUser(user), needsLinking: false };
    }

    // Check if email exists (potential linking scenario)
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // D-01: Existing email user - needs password re-auth to link
      return { token: null, user: null, needsLinking: true, email };
    }

    // D-04: New user - create with emailVerified: true
    user = await prisma.user.create({
      data: {
        email,
        name: profile.displayName || email.split('@')[0],
        passwordHash: '', // D-03: Empty hash for OAuth-only
        googleIdHash,
        emailVerified: true, // D-04: OAuth provider verified email
        hasPassword: false, // D-03: Track OAuth-only status
        avatarUrl: profile.photos?.[0]?.value || null, // D-09, D-10
        preferences: JSON.stringify({
          language: 'de',
          theme: 'dark',
          regions: ['western', 'middle-east', 'turkish', 'russian', 'chinese', 'alternative'],
        }),
      },
    });

    const token = this.generateToken(user);
    return { token, user: this.toSafeUser(user), needsLinking: false };
  }

  /**
   * Process GitHub OAuth authentication
   * Same logic as Google with GitHub-specific profile parsing
   */
  async processGitHubAuth(profile: GitHubProfile): Promise<OAuthResult> {
    // GitHub may have multiple emails, prefer primary verified one
    const emails = profile.emails || [];
    const primaryEmail = emails.find((e: { primary?: boolean; verified?: boolean }) => e.primary && e.verified)
      || emails.find((e: { verified?: boolean }) => e.verified)
      || emails[0];
    const email = (primaryEmail?.value || profile.username + '@github.local')?.toLowerCase();

    if (!primaryEmail?.value) {
      return { token: null, user: null, needsLinking: false, error: 'Email not accessible from GitHub. Please make your email public or add a verified email.' };
    }

    if (isDisposableEmail(email)) {
      return { token: null, user: null, needsLinking: false, error: 'Disposable email addresses are not allowed' };
    }

    const githubIdHash = hashToken(String(profile.id));

    // Check if user exists by OAuth ID hash
    let user = await prisma.user.findFirst({ where: { githubIdHash } });
    if (user) {
      const token = this.generateToken(user);
      return { token, user: this.toSafeUser(user), needsLinking: false };
    }

    // Check if email exists
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // D-01: Existing email user - needs password re-auth to link
      return { token: null, user: null, needsLinking: true, email };
    }

    // New user
    user = await prisma.user.create({
      data: {
        email,
        name: profile.displayName || profile.username || email.split('@')[0],
        passwordHash: '',
        githubIdHash,
        emailVerified: true,
        hasPassword: false,
        avatarUrl: profile.photos?.[0]?.value || null,
        preferences: JSON.stringify({
          language: 'de',
          theme: 'dark',
          regions: ['western', 'middle-east', 'turkish', 'russian', 'chinese', 'alternative'],
        }),
      },
    });

    const token = this.generateToken(user);
    return { token, user: this.toSafeUser(user), needsLinking: false };
  }

  /**
   * Link OAuth provider to existing account
   * D-01: Require password verification before linking
   * D-02: Email must match exactly
   */
  async linkOAuthAccount(
    provider: 'google' | 'github',
    providerId: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: SafeUser; token?: string; error?: string }> {
    const bcrypt = await import('bcryptjs');

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { success: false, error: 'Account not found' };
    }

    // D-01: Verify password before linking
    if (!user.passwordHash) {
      return { success: false, error: 'Account has no password set' };
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid password' };
    }

    // D-11: Hash provider ID
    const idHash = hashToken(providerId);

    // Check if this OAuth ID is already linked to another account
    const existingLink = await prisma.user.findFirst({
      where: provider === 'google' ? { googleIdHash: idHash } : { githubIdHash: idHash },
    });
    if (existingLink && existingLink.id !== user.id) {
      return { success: false, error: 'This OAuth account is already linked to another user' };
    }

    // Update user with OAuth link
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: provider === 'google' ? { googleIdHash: idHash } : { githubIdHash: idHash },
    });

    // Send security notification email (Claude's discretion: recommend yes)
    this.sendSecurityNotification(
      user.email,
      user.name,
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} account linked`,
      `A ${provider.charAt(0).toUpperCase() + provider.slice(1)} account was linked to your NewsHub account.`
    );

    const token = this.generateToken(updatedUser);
    return { success: true, user: this.toSafeUser(updatedUser), token };
  }

  /**
   * Unlink OAuth provider from account
   * D-12: Block unlinking if it's the only login method
   */
  async unlinkOAuthAccount(
    userId: string,
    provider: 'google' | 'github',
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const bcrypt = await import('bcryptjs');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // D-12: Check if user has another login method
    const hasOtherOAuth = provider === 'google' ? !!user.githubIdHash : !!user.googleIdHash;
    if (!user.hasPassword && !hasOtherOAuth) {
      return { success: false, error: 'Cannot unlink your only login method. Set a password first.' };
    }

    // Require password re-auth if user has password (Claude's discretion)
    if (user.hasPassword && user.passwordHash) {
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Invalid password' };
      }
    }

    // Unlink
    await prisma.user.update({
      where: { id: userId },
      data: provider === 'google' ? { googleIdHash: null } : { githubIdHash: null },
    });

    // Send security notification
    this.sendSecurityNotification(
      user.email,
      user.name,
      `${provider.charAt(0).toUpperCase() + provider.slice(1)} account unlinked`,
      `A ${provider.charAt(0).toUpperCase() + provider.slice(1)} account was unlinked from your NewsHub account.`
    );

    return { success: true };
  }

  /**
   * Get connected OAuth providers for a user
   */
  async getConnectedProviders(userId: string): Promise<{ google: boolean; github: boolean; hasPassword: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleIdHash: true, githubIdHash: true, hasPassword: true },
    });

    return {
      google: !!user?.googleIdHash,
      github: !!user?.githubIdHash,
      hasPassword: user?.hasPassword ?? true,
    };
  }

  /**
   * Send security notification email for account changes
   * Uses generic email send method
   */
  private sendSecurityNotification(
    email: string,
    name: string,
    subject: string,
    description: string
  ): void {
    // Fire and forget - don't block on email send
    const emailService = EmailService.getInstance();
    const html = this.generateSecurityNotificationHtml(name, subject, description);
    emailService.send(email, `NewsHub Security Alert: ${subject}`, html).catch((err) => {
      console.error('Failed to send security notification:', err);
    });
  }

  /**
   * Generate security notification email HTML
   */
  private generateSecurityNotificationHtml(name: string, action: string, description: string): string {
    const date = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #374151;">
    <h2 style="color: #ffee00; margin: 0 0 16px;">Security Alert</h2>
    <p style="color: #e5e7eb; line-height: 1.6;">Hello ${name},</p>
    <p style="color: #9ca3af; line-height: 1.6;">
      ${description}
    </p>
    <div style="background: #1f2937; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="color: #9ca3af; margin: 0 0 8px; font-size: 14px;">Action: <span style="color: #e5e7eb;">${action}</span></p>
      <p style="color: #9ca3af; margin: 0; font-size: 14px;">Time: <span style="color: #e5e7eb;">${date}</span></p>
    </div>
    <p style="color: #ff6600; line-height: 1.6; margin-top: 16px;">
      If you did not perform this action, please secure your account immediately by changing your password.
    </p>
    <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
      This is an automated security notification from NewsHub.
    </p>
  </div>
</body>
</html>
    `;
  }

  private generateToken(user: { id: string; email: string; tokenVersion?: number }): string {
    return jwt.sign(
      { userId: user.id, email: user.email, tokenVersion: user.tokenVersion ?? 0 },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  private toSafeUser(user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    emailVerified: boolean;
    hasPassword: boolean;
    googleIdHash: string | null;
    githubIdHash: string | null;
  }): SafeUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      emailVerified: user.emailVerified,
      hasPassword: user.hasPassword,
      googleIdHash: user.googleIdHash,
      githubIdHash: user.githubIdHash,
    };
  }
}
