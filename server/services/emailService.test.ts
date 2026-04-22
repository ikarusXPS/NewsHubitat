/**
 * Unit tests for EmailService
 * Tests singleton pattern, availability, send operations, template rendering with user name and URLs,
 * bilingual content verification, retry logic, and urgency-based subjects
 */

import { vi, describe, it, expect, beforeAll, afterEach } from 'vitest';

// Mock nodemailer before importing EmailService
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
      verify: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    })),
  },
}));

vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
}));

import { EmailService } from './emailService';
import type { DigestOptions } from './emailService';

describe('EmailService', () => {
  beforeAll(() => {
    vi.stubEnv('SMTP_USER', 'test@example.com');
    vi.stubEnv('SMTP_PASS', 'test-password');
    vi.stubEnv('APP_URL', 'http://localhost:5173');
  });

  afterEach(() => {
    // Reset singleton between tests
    (EmailService as unknown as { instance: EmailService | null }).instance = null;
    vi.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = EmailService.getInstance();
      const instance2 = EmailService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isAvailable', () => {
    it('returns false when SMTP not configured', () => {
      vi.unstubAllEnvs();
      const service = EmailService.getInstance();
      expect(service.isAvailable()).toBe(false);
    });

    it('returns true when SMTP configured', () => {
      const service = EmailService.getInstance();
      (service as any).isConfigured = true;
      (service as any).transporter = {};
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('verify', () => {
    it('returns false when transporter is null', async () => {
      const service = EmailService.getInstance();
      (service as any).transporter = null;
      const result = await service.verify();
      expect(result).toBe(false);
    });

    it('returns true when SMTP connection verified', async () => {
      const service = EmailService.getInstance();
      const mockTransporter = { verify: vi.fn().mockResolvedValue(true) };
      (service as any).transporter = mockTransporter;

      const result = await service.verify();
      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('returns false on verification error', async () => {
      const service = EmailService.getInstance();
      const mockTransporter = { verify: vi.fn().mockRejectedValue(new Error('SMTP error')) };
      (service as any).transporter = mockTransporter;

      const result = await service.verify();
      expect(result).toBe(false);
    });
  });

  describe('send', () => {
    it('returns false when transporter not available', async () => {
      const service = EmailService.getInstance();
      (service as any).transporter = null;

      const result = await service.send('test@example.com', 'Subject', '<p>Body</p>');
      expect(result).toBe(false);
    });

    it('sends email with HTML and auto-generated text', async () => {
      const service = EmailService.getInstance();
      const mockTransporter = {
        sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      const result = await service.send('user@example.com', 'Test Subject', '<p>Test Body</p>');

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@test.com',
          to: 'user@example.com',
          subject: 'Test Subject',
          html: '<p>Test Body</p>',
          text: expect.any(String),
        })
      );
    });

    it('sends email with custom text', async () => {
      const service = EmailService.getInstance();
      const mockTransporter = {
        sendMail: vi.fn().mockResolvedValue({ messageId: 'test-id' }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      const result = await service.send('user@example.com', 'Subject', '<p>HTML</p>', 'Plain text');

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text',
        })
      );
    });

    it('returns false on send error', async () => {
      const service = EmailService.getInstance();
      const mockTransporter = {
        sendMail: vi.fn().mockRejectedValue(new Error('Send failed')),
      };
      (service as any).transporter = mockTransporter;

      const result = await service.send('user@example.com', 'Subject', '<p>Body</p>');
      expect(result).toBe(false);
    });
  });

  describe('sendDigest', () => {
    it('returns true with empty articles (no email sent)', async () => {
      const service = EmailService.getInstance();
      const options: DigestOptions = {
        userId: 'user-1',
        email: 'user@example.com',
        articles: [],
        frequency: 'daily',
        regions: ['western'],
        topics: ['politics'],
      };

      const result = await service.sendDigest(options);
      expect(result).toBe(true);
    });

    it('generates correct subject for daily digest', async () => {
      const service = EmailService.getInstance();
      let capturedSubject = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ subject }) => {
          capturedSubject = subject;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      const options: DigestOptions = {
        userId: 'user-1',
        email: 'user@example.com',
        articles: [
          {
            id: 'art-1',
            title: 'Test Article',
            content: 'Content',
            summary: 'Summary',
            url: 'https://example.com/article',
            source: { id: 'src-1', name: 'Test Source' },
            perspective: 'western',
            sentiment: 'neutral',
            publishedAt: new Date().toISOString(),
          } as any,
        ],
        frequency: 'daily',
        regions: ['western'],
        topics: ['politics'],
      };

      await service.sendDigest(options);
      expect(capturedSubject).toContain('täglicher');
      expect(capturedSubject).toContain('1 Artikel');
    });

    it('generates correct subject for weekly digest', async () => {
      const service = EmailService.getInstance();
      let capturedSubject = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ subject }) => {
          capturedSubject = subject;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      const options: DigestOptions = {
        userId: 'user-1',
        email: 'user@example.com',
        articles: [
          {
            id: 'art-1',
            title: 'Test',
            content: 'Test content',
            url: 'https://example.com',
            source: { name: 'Test Source' },
            perspective: 'western',
            sentiment: 'neutral',
            publishedAt: new Date().toISOString(),
          } as any
        ],
        frequency: 'weekly',
        regions: ['western'],
        topics: ['politics'],
      };

      await service.sendDigest(options);
      expect(capturedSubject).toContain('Wochen-Digest');
    });

    it('generates correct subject for realtime digest', async () => {
      const service = EmailService.getInstance();
      let capturedSubject = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ subject }) => {
          capturedSubject = subject;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      const options: DigestOptions = {
        userId: 'user-1',
        email: 'user@example.com',
        articles: [
          {
            id: 'art-1',
            title: 'Test',
            content: 'Test content',
            url: 'https://example.com',
            source: { name: 'Test Source' },
            perspective: 'western',
            sentiment: 'neutral',
            publishedAt: new Date().toISOString(),
          } as any
        ],
        frequency: 'realtime',
        regions: ['western'],
        topics: ['politics'],
      };

      await service.sendDigest(options);
      expect(capturedSubject).toContain('Breaking');
    });
  });

  describe('sendVerification', () => {
    it('HTML contains user name in greeting', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).isConfigured = true;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendVerification('test@example.com', 'John Doe', 'token123');

      expect(capturedHtml).toContain('John Doe');
      expect(capturedHtml).toContain('Hallo John Doe');  // German greeting
      expect(capturedHtml).toContain('Hello John Doe');  // English greeting
    });

    it('HTML contains verification URL', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).isConfigured = true;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendVerification('test@example.com', 'Test User', 'abc123token');

      expect(capturedHtml).toContain('verify-email?token=abc123token');
    });

    it('HTML contains bilingual sections (DE + EN)', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).isConfigured = true;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendVerification('test@example.com', 'Test User', 'token');

      expect(capturedHtml).toContain('Bestaetige deine E-Mail');  // German section
      expect(capturedHtml).toContain('Verify your email');        // English section
    });

    it('calls send method successfully', async () => {
      const service = EmailService.getInstance();
      const mockTransporter = {
        sendMail: vi.fn().mockResolvedValue({ messageId: 'test' }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).isConfigured = true;
      (service as any).config = { from: 'noreply@test.com' };

      const result = await service.sendVerification('test@example.com', 'Test', 'token');

      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledOnce();
    });

    it('returns false when send fails', async () => {
      const service = EmailService.getInstance();
      const mockTransporter = {
        sendMail: vi.fn().mockRejectedValue(new Error('SMTP error')),
      };
      (service as any).transporter = mockTransporter;
      (service as any).isConfigured = true;
      (service as any).config = { from: 'noreply@test.com' };

      const result = await service.sendVerification('test@example.com', 'Test', 'token');

      // send() catches errors and returns false, so no retry happens
      expect(result).toBe(false);
      expect(mockTransporter.sendMail).toHaveBeenCalledOnce();
    });
  });

  describe('sendPasswordResetBilingual', () => {
    it('HTML contains user name', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendPasswordResetBilingual('test@example.com', 'Jane Smith', 'reset-token');

      expect(capturedHtml).toContain('Jane Smith');
      expect(capturedHtml).toContain('Hallo Jane Smith');
      expect(capturedHtml).toContain('Hello Jane Smith');
    });

    it('HTML contains reset URL', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendPasswordResetBilingual('test@example.com', 'User', 'reset123');

      expect(capturedHtml).toContain('reset-password?token=reset123');
    });

    it('HTML contains bilingual sections', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendPasswordResetBilingual('test@example.com', 'User', 'token');

      expect(capturedHtml).toContain('Passwort zuruecksetzen');  // German
      expect(capturedHtml).toContain('Reset your password');     // English
    });
  });

  describe('sendPasswordChangeConfirmation', () => {
    it('HTML contains user name', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendPasswordChangeConfirmation('test@example.com', 'Bob Wilson', 'recovery-token');

      expect(capturedHtml).toContain('Bob Wilson');
      expect(capturedHtml).toContain('Hallo Bob Wilson');
      expect(capturedHtml).toContain('Hello Bob Wilson');
    });

    it('HTML contains recovery URL', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendPasswordChangeConfirmation('test@example.com', 'User', 'recovery456');

      expect(capturedHtml).toContain('reset-password?token=recovery456');
    });

    it('HTML contains "wasn\'t you" warning in both languages', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendPasswordChangeConfirmation('test@example.com', 'User', 'token');

      expect(capturedHtml).toContain('Das warst nicht du');  // German
      expect(capturedHtml).toContain('Wasn\'t you');         // English
    });
  });

  describe('sendVerificationReminder', () => {
    it('HTML contains days remaining', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendVerificationReminder('test@example.com', 'User', 3, 'token');

      expect(capturedHtml).toContain('3 TAGE');
      expect(capturedHtml).toContain('3 DAYS');
    });

    it('subject changes based on urgency (1 day)', async () => {
      const service = EmailService.getInstance();
      let capturedSubject = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ subject }) => {
          capturedSubject = subject;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendVerificationReminder('test@example.com', 'User', 1, 'token');
      expect(capturedSubject).toContain('Last day');
    });

    it('subject changes based on urgency (7 days)', async () => {
      const service = EmailService.getInstance();
      let capturedSubject = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ subject }) => {
          capturedSubject = subject;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      await service.sendVerificationReminder('test@example.com', 'User', 7, 'token');
      expect(capturedSubject).toContain('7 days');
    });

    it('uses appropriate urgency color based on days remaining', async () => {
      const service = EmailService.getInstance();
      let capturedHtml = '';
      const mockTransporter = {
        sendMail: vi.fn().mockImplementation(({ html }) => {
          capturedHtml = html;
          return Promise.resolve({ messageId: 'test' });
        }),
      };
      (service as any).transporter = mockTransporter;
      (service as any).config = { from: 'noreply@test.com' };

      // 1 day remaining - red
      await service.sendVerificationReminder('test@example.com', 'User', 1, 'token');
      expect(capturedHtml).toContain('#ff0044');

      vi.clearAllMocks();
      capturedHtml = '';

      // 3 days remaining - orange
      await service.sendVerificationReminder('test@example.com', 'User', 3, 'token');
      expect(capturedHtml).toContain('#ff6600');

      vi.clearAllMocks();
      capturedHtml = '';

      // 7 days remaining - yellow
      await service.sendVerificationReminder('test@example.com', 'User', 7, 'token');
      expect(capturedHtml).toContain('#ffee00');
    });
  });

  describe('shutdown', () => {
    it('closes transporter', async () => {
      const service = EmailService.getInstance();
      const mockTransporter = { close: vi.fn() };
      (service as any).transporter = mockTransporter;

      await service.shutdown();

      expect(mockTransporter.close).toHaveBeenCalled();
      expect((service as any).transporter).toBeNull();
    });

    it('handles null transporter gracefully', async () => {
      const service = EmailService.getInstance();
      (service as any).transporter = null;

      await expect(service.shutdown()).resolves.not.toThrow();
    });
  });
});
