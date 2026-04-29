/**
 * Email Service
 * Handles email digests, notifications, and transactional emails
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import logger from '../utils/logger';
import type { NewsArticle } from '../../src/types';
import { prisma } from '../db/prisma';
import { MetricsService } from './metricsService';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface DigestOptions {
  userId: string;
  email: string;
  articles: NewsArticle[];
  frequency: 'daily' | 'weekly' | 'realtime';
  regions: string[];
  topics: string[];
}

const DEFAULT_CONFIG: EmailConfig = {
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey',  // Literal string 'apikey' per SendGrid SMTP spec
    pass: process.env.SENDGRID_API_KEY || '',
  },
  from: process.env.SMTP_FROM || 'NewsHub <noreply@newshub.app>',
};

export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private readonly config: EmailConfig;

  private constructor(config: EmailConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.initialize();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initialize(): void {
    if (!this.config.auth.pass) {
      logger.warn('⚠ Email service not configured (SENDGRID_API_KEY missing)');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });

      this.isConfigured = true;
      logger.info('✓ Email service initialized');
    } catch {
      logger.warn('Email service initialization failed');
    }
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Verify SMTP connection
   */
  async verify(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.verify();
      return true;
    } catch (err) {
      logger.error('SMTP verification failed:', err);
      return false;
    }
  }

  /**
   * Send a generic email
   */
  async send(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.transporter) {
      logger.warn('Email not sent - service not configured');
      return false;
    }

    const metricsService = MetricsService.getInstance();

    // D-05: Check if email is bounced
    try {
      const user = await prisma.user.findUnique({ where: { email: to } });
      if (user?.emailBounced) {
        logger.warn(`Email blocked - address bounced: ${to}`);
        metricsService.incrementEmailBounced(this.getEmailType(subject), 'blocked');
        return false;
      }

      // D-07: Check if user opted out
      if (user?.emailOptOut) {
        logger.warn(`Email blocked - user opted out: ${to}`);
        return false;
      }
    } catch (_err) {
      // Non-user emails (e.g., external addresses) can still be sent
      logger.debug(`Bounce check skipped for ${to}: not a registered user`);
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      logger.debug(`Email sent to ${to}: ${subject}`);

      // D-11: Increment sent counter
      metricsService.incrementEmailSent(this.getEmailType(subject));

      return true;
    } catch (err) {
      logger.error(`Failed to send email to ${to}:`, err);
      return false;
    }
  }

  /**
   * Extract email type from subject for metrics labeling
   */
  private getEmailType(subject: string): string {
    if (subject.includes('Verify') || subject.includes('Bestaetige')) return 'verification';
    if (subject.includes('Reset') || subject.includes('zuruecksetzen')) return 'password_reset';
    if (subject.includes('changed') || subject.includes('geaendert')) return 'password_change';
    return 'other';
  }

  /**
   * Generate and send news digest
   */
  async sendDigest(options: DigestOptions): Promise<boolean> {
    const { email, articles, frequency, regions, topics } = options;

    if (articles.length === 0) {
      logger.debug(`No articles for digest to ${email}`);
      return true;
    }

    const subject = this.getDigestSubject(frequency, articles.length);
    const html = this.generateDigestHtml(articles, regions, topics, frequency);

    return this.send(email, subject, html);
  }

  /**
   * Generate digest email subject
   */
  private getDigestSubject(frequency: string, articleCount: number): string {
    const date = new Date().toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    switch (frequency) {
      case 'daily':
        return `📰 Dein täglicher News-Digest (${articleCount} Artikel) - ${date}`;
      case 'weekly':
        return `📰 Dein Wochen-Digest (${articleCount} Artikel) - KW ${this.getWeekNumber()}`;
      case 'realtime':
        return `🔴 Breaking: ${articleCount} neue Artikel`;
      default:
        return `📰 NewsHub Digest - ${date}`;
    }
  }

  /**
   * Generate digest HTML content
   */
  private generateDigestHtml(
    articles: NewsArticle[],
    regions: string[],
    topics: string[],
    frequency: string
  ): string {
    const regionColors: Record<string, string> = {
      western: '#3b82f6',
      'middle-east': '#22c55e',
      turkish: '#ef4444',
      russian: '#a855f7',
      chinese: '#eab308',
      alternative: '#00f0ff',
    };

    const articleCards = articles
      .slice(0, 20) // Limit to 20 articles
      .map((article) => {
        const regionColor = regionColors[article.perspective] || '#6b7280';
        const sentimentIcon =
          article.sentiment === 'positive' ? '📈' : article.sentiment === 'negative' ? '📉' : '➡️';

        return `
        <tr>
          <td style="padding: 16px; border-bottom: 1px solid #374151;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <span style="background: ${regionColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                ${article.perspective}
              </span>
              <span style="font-size: 14px;">${sentimentIcon}</span>
            </div>
            <a href="${article.url}" style="color: #00f0ff; text-decoration: none; font-size: 16px; font-weight: 600;">
              ${article.title}
            </a>
            <p style="color: #9ca3af; font-size: 14px; margin: 8px 0;">
              ${article.summary || article.content.slice(0, 150)}...
            </p>
            <div style="color: #6b7280; font-size: 12px;">
              ${article.source.name} • ${new Date(article.publishedAt).toLocaleDateString('de-DE')}
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #111118;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px; text-align: center; border-bottom: 1px solid #00f0ff;">
        <h1 style="color: #00f0ff; margin: 0; font-size: 28px; font-family: 'JetBrains Mono', monospace;">
          📡 NEWSHUB
        </h1>
        <p style="color: #9ca3af; margin: 8px 0 0;">
          ${frequency === 'daily' ? 'Täglicher' : frequency === 'weekly' ? 'Wöchentlicher' : 'Breaking'} Digest
        </p>
      </td>
    </tr>

    <!-- Stats -->
    <tr>
      <td style="padding: 16px;">
        <table width="100%" cellpadding="8">
          <tr>
            <td style="background: #1a1a24; border-radius: 8px; text-align: center; padding: 16px;">
              <div style="color: #00f0ff; font-size: 24px; font-weight: bold;">${articles.length}</div>
              <div style="color: #6b7280; font-size: 12px;">Artikel</div>
            </td>
            <td style="background: #1a1a24; border-radius: 8px; text-align: center; padding: 16px;">
              <div style="color: #00f0ff; font-size: 24px; font-weight: bold;">${regions.length}</div>
              <div style="color: #6b7280; font-size: 12px;">Regionen</div>
            </td>
            <td style="background: #1a1a24; border-radius: 8px; text-align: center; padding: 16px;">
              <div style="color: #00f0ff; font-size: 24px; font-weight: bold;">${topics.length}</div>
              <div style="color: #6b7280; font-size: 12px;">Themen</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Articles -->
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${articleCards}
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px; text-align: center; border-top: 1px solid #374151;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          Du erhältst diese E-Mail, weil du den NewsHub Digest abonniert hast.
        </p>
        <p style="margin: 8px 0 0;">
          <a href="${process.env.APP_URL || 'http://localhost:5173'}/settings/email" style="color: #00f0ff; font-size: 12px;">
            Einstellungen ändern
          </a>
          &nbsp;|&nbsp;
          <a href="${process.env.APP_URL || 'http://localhost:5173'}/unsubscribe" style="color: #ef4444; font-size: 12px;">
            Abmelden
          </a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send welcome email
   */
  async sendWelcome(email: string, name: string): Promise<boolean> {
    const subject = '🎉 Willkommen bei NewsHub!';
    const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #00f0ff;">
    <h1 style="color: #00f0ff; margin: 0 0 16px;">Hallo ${name}! 👋</h1>
    <p style="color: #e5e7eb; line-height: 1.6;">
      Willkommen bei <strong>NewsHub</strong> - deiner Plattform für Multi-Perspektiven-News.
    </p>
    <p style="color: #9ca3af; line-height: 1.6;">
      Entdecke, wie verschiedene Regionen der Welt über die gleichen Ereignisse berichten.
      Brich aus der Filter-Blase aus und sieh das größere Bild.
    </p>
    <a href="${process.env.APP_URL || 'http://localhost:5173'}"
       style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px;
              border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
      Jetzt loslegen →
    </a>
  </div>
</body>
</html>
    `;

    return this.send(email, subject, html);
  }

  /**
   * Send password reset email (legacy - kept for backward compatibility)
   */
  async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const subject = '🔐 Passwort zurücksetzen - NewsHub';
    const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #374151;">
    <h1 style="color: #e5e7eb; margin: 0 0 16px;">Passwort zurücksetzen</h1>
    <p style="color: #9ca3af; line-height: 1.6;">
      Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.
      Klicke auf den Button unten, um ein neues Passwort zu setzen.
    </p>
    <a href="${resetUrl}"
       style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px;
              border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
      Passwort zurücksetzen
    </a>
    <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
      Dieser Link ist 1 Stunde gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.
    </p>
  </div>
</body>
</html>
    `;

    return this.send(email, subject, html);
  }

  /**
   * Send verification email (bilingual DE/EN per D-08)
   * Per D-09: Includes feature preview (AI chat, bookmarks, preferences)
   * Per D-47: Auto-retry with exponential backoff (1s, 2s, 4s)
   */
  async sendVerification(
    email: string,
    name: string,
    token: string,
    attempt = 1
  ): Promise<boolean> {
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [1000, 2000, 4000];
    const verifyUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

    const subject = 'Verify your NewsHub account / Bestaetige dein NewsHub-Konto';
    const html = this.generateVerificationEmailHtml(name, verifyUrl);

    try {
      const result = await this.send(email, subject, html);
      if (result) {
        logger.info(`verification:sent email=${email}`);
      }
      return result;
    } catch (error) {
      logger.error(`verification:send_failed email=${email} attempt=${attempt}`, error);

      if (attempt < MAX_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, BACKOFF_MS[attempt - 1]));
        return this.sendVerification(email, name, token, attempt + 1);
      }

      return false;
    }
  }

  /**
   * Generate bilingual verification email HTML (D-08, D-09)
   */
  private generateVerificationEmailHtml(name: string, verifyUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #00f0ff;">
    <!-- German Section -->
    <div style="margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #374151;">
      <h2 style="color: #00f0ff; margin: 0 0 16px;">Bestaetige deine E-Mail</h2>
      <p style="color: #e5e7eb; line-height: 1.6;">Hallo ${name},</p>
      <p style="color: #9ca3af; line-height: 1.6;">
        Klicke auf den Button unten, um dein Konto zu verifizieren und alle Features freizuschalten:
      </p>
      <ul style="color: #9ca3af; line-height: 1.8; padding-left: 20px;">
        <li>KI-Chat und Analyse</li>
        <li>Lesezeichen speichern</li>
        <li>Personalisierte Einstellungen</li>
      </ul>
      <a href="${verifyUrl}"
         style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
        Jetzt verifizieren
      </a>
      <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
        Dieser Link ist 24 Stunden gueltig.
      </p>
    </div>

    <!-- English Section -->
    <div>
      <h2 style="color: #00f0ff; margin: 0 0 16px;">Verify your email</h2>
      <p style="color: #e5e7eb; line-height: 1.6;">Hello ${name},</p>
      <p style="color: #9ca3af; line-height: 1.6;">
        Click the button below to verify your account and unlock all features:
      </p>
      <ul style="color: #9ca3af; line-height: 1.8; padding-left: 20px;">
        <li>AI Chat & Analysis</li>
        <li>Save Bookmarks</li>
        <li>Personalized Settings</li>
      </ul>
      <a href="${verifyUrl}"
         style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
        Verify Now
      </a>
      <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
        This link expires in 24 hours.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send password reset email (bilingual DE/EN per D-38)
   * Per D-29: Shows user's name only (no partial email)
   */
  async sendPasswordResetBilingual(
    email: string,
    name: string,
    token: string
  ): Promise<boolean> {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const subject = 'Reset your NewsHub password / NewsHub Passwort zuruecksetzen';
    const html = this.generateResetEmailHtml(name, resetUrl);

    const result = await this.send(email, subject, html);
    if (result) {
      logger.info(`reset:sent email=${email}`);
    }
    return result;
  }

  /**
   * Generate bilingual password reset email HTML (D-38)
   */
  private generateResetEmailHtml(name: string, resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #374151;">
    <!-- German Section -->
    <div style="margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #374151;">
      <h2 style="color: #e5e7eb; margin: 0 0 16px;">Passwort zuruecksetzen</h2>
      <p style="color: #e5e7eb; line-height: 1.6;">Hallo ${name},</p>
      <p style="color: #9ca3af; line-height: 1.6;">
        Du hast eine Anfrage zum Zuruecksetzen deines Passworts gestellt.
        Klicke auf den Button unten, um ein neues Passwort zu setzen.
      </p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
        Passwort zuruecksetzen
      </a>
      <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
        Dieser Link ist 1 Stunde gueltig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.
      </p>
    </div>

    <!-- English Section -->
    <div>
      <h2 style="color: #e5e7eb; margin: 0 0 16px;">Reset your password</h2>
      <p style="color: #e5e7eb; line-height: 1.6;">Hello ${name},</p>
      <p style="color: #9ca3af; line-height: 1.6;">
        You requested to reset your password.
        Click the button below to set a new password.
      </p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
        Reset Password
      </a>
      <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
        This link expires in 1 hour. If you didn't request this, please ignore this email.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send password change confirmation (D-32, D-33)
   * Includes "wasn't you?" recovery link
   */
  async sendPasswordChangeConfirmation(
    email: string,
    name: string,
    recoveryToken: string
  ): Promise<boolean> {
    const recoveryUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${recoveryToken}`;
    const subject = 'Your NewsHub password was changed / Dein NewsHub Passwort wurde geaendert';
    const html = this.generatePasswordChangeConfirmationHtml(name, recoveryUrl);

    const result = await this.send(email, subject, html);
    if (result) {
      logger.info(`password_change_confirmation:sent email=${email}`);
    }
    return result;
  }

  /**
   * Generate password change confirmation email HTML (D-32, D-33)
   */
  private generatePasswordChangeConfirmationHtml(name: string, recoveryUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #374151;">
    <!-- German Section -->
    <div style="margin-bottom: 32px; padding-bottom: 32px; border-bottom: 1px solid #374151;">
      <h2 style="color: #00ff88; margin: 0 0 16px;">Passwort geaendert</h2>
      <p style="color: #e5e7eb; line-height: 1.6;">Hallo ${name},</p>
      <p style="color: #9ca3af; line-height: 1.6;">
        Dein NewsHub Passwort wurde erfolgreich geaendert.
      </p>
      <p style="color: #ff6600; line-height: 1.6; margin-top: 16px;">
        Das warst nicht du? Klicke hier, um dein Passwort sofort zurueckzusetzen:
      </p>
      <a href="${recoveryUrl}"
         style="display: inline-block; background: #ff0044; color: white; padding: 10px 20px;
                border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px; font-size: 14px;">
        Das war ich nicht
      </a>
    </div>

    <!-- English Section -->
    <div>
      <h2 style="color: #00ff88; margin: 0 0 16px;">Password changed</h2>
      <p style="color: #e5e7eb; line-height: 1.6;">Hello ${name},</p>
      <p style="color: #9ca3af; line-height: 1.6;">
        Your NewsHub password has been successfully changed.
      </p>
      <p style="color: #ff6600; line-height: 1.6; margin-top: 16px;">
        Wasn't you? Click here to reset your password immediately:
      </p>
      <a href="${recoveryUrl}"
         style="display: inline-block; background: #ff0044; color: white; padding: 10px 20px;
                border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 8px; font-size: 14px;">
        This wasn't me
      </a>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Send reminder email for unverified accounts (D-19)
   */
  async sendVerificationReminder(
    email: string,
    name: string,
    daysRemaining: number,
    token: string
  ): Promise<boolean> {
    const verifyUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    const subject = daysRemaining === 1
      ? 'Last day to verify your NewsHub account / Letzter Tag zur Verifizierung'
      : `${daysRemaining} days left to verify / Noch ${daysRemaining} Tage zur Verifizierung`;

    const urgencyColor = daysRemaining <= 1 ? '#ff0044' : daysRemaining <= 3 ? '#ff6600' : '#ffee00';

    const html = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 2px solid ${urgencyColor};">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="background: ${urgencyColor}; color: #0a0a0f; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
        ${daysRemaining} ${daysRemaining === 1 ? 'TAG' : 'TAGE'} / ${daysRemaining} ${daysRemaining === 1 ? 'DAY' : 'DAYS'} LEFT
      </span>
    </div>
    <h2 style="color: ${urgencyColor}; text-align: center;">Verify to keep your account</h2>
    <p style="color: #9ca3af; text-align: center;">
      Hallo ${name}, dein Konto wird in ${daysRemaining} ${daysRemaining === 1 ? 'Tag' : 'Tagen'} geloescht, wenn du es nicht verifizierst.
    </p>
    <p style="color: #9ca3af; text-align: center;">
      Hello ${name}, your account will be deleted in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} if not verified.
    </p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${verifyUrl}" style="display: inline-block; background: ${urgencyColor}; color: #0a0a0f; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Verify Now / Jetzt verifizieren
      </a>
    </div>
  </div>
</body>
</html>
    `;

    return this.send(email, subject, html);
  }

  /**
   * Send team invite email (Phase 28, per D-01, D-02)
   */
  async sendTeamInvite(
    email: string,
    teamName: string,
    inviterName: string,
    inviteUrl: string
  ): Promise<boolean> {
    const subject = `You're invited to join ${teamName} on NewsHub`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 500px; margin: 0 auto; background: #111118; border-radius: 12px; padding: 32px; border: 1px solid #00f0ff;">
    <h1 style="color: #00f0ff; margin: 0 0 16px; font-size: 24px;">Team Invitation</h1>
    <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6;">
      <strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on NewsHub.
    </p>
    <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
      Share and discover news articles with your team. Click below to accept the invitation.
    </p>
    <a href="${inviteUrl}"
       style="display: inline-block; background: #00f0ff; color: #0a0a0f; padding: 12px 24px;
              border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; font-size: 14px;">
      Join Team
    </a>
    <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
      This invitation expires in 7 days. If you don't have a NewsHub account, you'll be prompted to create one.
    </p>
  </div>
</body>
</html>
    `;

    const result = await this.send(email, subject, html);
    if (result) {
      logger.info(`team_invite:sent email=${email} team=${teamName}`);
    }
    return result;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get current ISO week number
   */
  private getWeekNumber(): number {
    const date = new Date();
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      logger.info('Email service shut down');
    }
  }
}

export default EmailService;
