/**
 * Email Service
 * Handles email digests, notifications, and transactional emails
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import logger from '../utils/logger';
import type { NewsArticle } from '../../src/types';

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
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
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
    if (!this.config.auth.user || !this.config.auth.pass) {
      logger.warn('⚠ Email service not configured (SMTP_USER/SMTP_PASS missing)');
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
    } catch (err) {
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

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      logger.debug(`Email sent to ${to}: ${subject}`);
      return true;
    } catch (err) {
      logger.error(`Failed to send email to ${to}:`, err);
      return false;
    }
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
   * Send password reset email
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
