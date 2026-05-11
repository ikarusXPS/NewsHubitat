import { describe, it, expect } from 'vitest';
import {
  scrubObject,
  scrubUrl,
  scrubString,
  scrubSentryEvent,
} from './scrub';

describe('scrubObject', () => {
  it('redacts password and password hashes', () => {
    const input = { password: 'hunter2', passwordHash: '$argon2id$...' };
    expect(scrubObject(input)).toEqual({
      password: '[redacted]',
      passwordHash: '[redacted]',
    });
  });

  it('redacts verification + reset tokens (raw + hash forms)', () => {
    const input = {
      verificationToken: 'abc',
      verificationTokenHash: 'def',
      resetToken: 'ghi',
      resetTokenHash: 'jkl',
    };
    const result = scrubObject(input);
    for (const v of Object.values(result)) {
      expect(v).toBe('[redacted]');
    }
  });

  it('redacts OAuth provider id hashes', () => {
    const input = { googleIdHash: 'h1', githubIdHash: 'h2' };
    expect(scrubObject(input)).toEqual({
      googleIdHash: '[redacted]',
      githubIdHash: '[redacted]',
    });
  });

  it('redacts Stripe customer + subscription ids', () => {
    const input = { stripeCustomerId: 'cus_x', stripeSubscriptionId: 'sub_x' };
    expect(scrubObject(input)).toEqual({
      stripeCustomerId: '[redacted]',
      stripeSubscriptionId: '[redacted]',
    });
  });

  it('redacts API key + key hash', () => {
    const input = { apiKey: 'nh_prod_abc_def', keyHash: '$bcrypt$...' };
    expect(scrubObject(input)).toEqual({
      apiKey: '[redacted]',
      keyHash: '[redacted]',
    });
  });

  it('redacts Authorization header to "Bearer [redacted]"', () => {
    const input = { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9...' };
    expect(scrubObject(input)).toEqual({ Authorization: 'Bearer [redacted]' });
  });

  it('redacts lowercase authorization header too', () => {
    const input = { authorization: 'Bearer xyz' };
    expect(scrubObject(input)).toEqual({ authorization: 'Bearer [redacted]' });
  });

  it('redacts Cookie header', () => {
    const input = { Cookie: 'newshub-auth-token=abc; theme=dark' };
    expect(scrubObject(input)).toEqual({ Cookie: '[redacted]' });
  });

  it('walks nested objects', () => {
    const input = {
      user: { id: 7, password: 'secret' },
      headers: { Authorization: 'Bearer abc', 'Content-Type': 'application/json' },
    };
    expect(scrubObject(input)).toEqual({
      user: { id: 7, password: '[redacted]' },
      headers: { Authorization: 'Bearer [redacted]', 'Content-Type': 'application/json' },
    });
  });

  it('walks arrays', () => {
    const input = [{ password: 'a' }, { password: 'b' }];
    expect(scrubObject(input)).toEqual([
      { password: '[redacted]' },
      { password: '[redacted]' },
    ]);
  });

  it('returns the input unchanged when no sensitive fields present', () => {
    const input = { id: 1, name: 'Alice', tags: ['a', 'b'] };
    expect(scrubObject(input)).toEqual(input);
  });

  it('does not mutate the input', () => {
    const input = { password: 'secret', nested: { apiKey: 'k' } };
    const snapshot = JSON.parse(JSON.stringify(input));
    scrubObject(input);
    expect(input).toEqual(snapshot);
  });

  it('handles primitives and nullish without throwing', () => {
    expect(scrubObject(null as unknown as object)).toBeNull();
    expect(scrubObject(undefined as unknown as object)).toBeUndefined();
    expect(scrubObject('plain string' as unknown as object)).toBe('plain string');
    expect(scrubObject(42 as unknown as object)).toBe(42);
  });

  it('bounds recursion at depth 8', () => {
    // Build a deeply nested object beyond the depth cap.
    let deep: Record<string, unknown> = { password: 'leaf' };
    for (let i = 0; i < 20; i++) deep = { next: deep };
    // Should not throw; deeper levels left unscrubbed by design.
    expect(() => scrubObject(deep)).not.toThrow();
  });

  it('scrubs URL-shaped string values inside objects', () => {
    const input = { redirect: 'https://app/foo?token=abc&keep=1' };
    expect(scrubObject(input)).toEqual({
      redirect: 'https://app/foo?token=[redacted]&keep=1',
    });
  });
});

describe('scrubUrl', () => {
  it('redacts ?token=', () => {
    expect(scrubUrl('https://app/x?token=abc')).toBe(
      'https://app/x?token=[redacted]'
    );
  });

  it('redacts ?verification_token=, ?reset_token=, ?code=, ?state=', () => {
    const url =
      'https://app/cb?verification_token=a&reset_token=b&code=c&state=d&keep=ok';
    expect(scrubUrl(url)).toBe(
      'https://app/cb?verification_token=[redacted]&reset_token=[redacted]&code=[redacted]&state=[redacted]&keep=ok'
    );
  });

  it('redacts only the configured params, leaves others intact', () => {
    expect(scrubUrl('https://app/x?token=abc&utm_source=email')).toBe(
      'https://app/x?token=[redacted]&utm_source=email'
    );
  });

  it('returns the URL unchanged when no query string is present', () => {
    expect(scrubUrl('https://app/x')).toBe('https://app/x');
  });

  it('preserves URL fragments after query params', () => {
    expect(scrubUrl('https://app/x?token=abc#section')).toBe(
      'https://app/x?token=[redacted]#section'
    );
  });

  it('handles relative URLs', () => {
    expect(scrubUrl('/auth/callback?code=xyz')).toBe(
      '/auth/callback?code=[redacted]'
    );
  });

  it('returns empty string unchanged', () => {
    expect(scrubUrl('')).toBe('');
  });

  it('is case-insensitive for param names', () => {
    expect(scrubUrl('https://app/x?TOKEN=abc')).toBe(
      'https://app/x?TOKEN=[redacted]'
    );
  });
});

describe('scrubString', () => {
  it('redacts email addresses in stack traces', () => {
    const trace = 'Error: invalid login for alice@example.com at handler.ts:42';
    expect(scrubString(trace)).toBe(
      'Error: invalid login for [redacted-email] at handler.ts:42'
    );
  });

  it('redacts multiple emails in one string', () => {
    expect(scrubString('a@x.io and b+tag@y.co.uk')).toBe(
      '[redacted-email] and [redacted-email]'
    );
  });

  it('redacts query params in URL-shaped messages', () => {
    expect(scrubString('https://app/x?token=abc')).toBe(
      'https://app/x?token=[redacted]'
    );
  });

  it('returns empty string unchanged', () => {
    expect(scrubString('')).toBe('');
  });

  it('leaves emails-in-domain-like-text alone if pattern is not matched', () => {
    // Word that contains @ but no domain — leave untouched.
    expect(scrubString('user@')).toBe('user@');
  });
});

describe('scrubSentryEvent', () => {
  it('redacts user.email', () => {
    const event = { user: { id: 'u1', email: 'alice@example.com' } };
    expect(scrubSentryEvent(event).user?.email).toBe('[redacted-email]');
  });

  it('scrubs request.url query params', () => {
    const event = { request: { url: 'https://api/x?token=abc' } };
    expect(scrubSentryEvent(event).request?.url).toBe(
      'https://api/x?token=[redacted]'
    );
  });

  it('scrubs request.headers Authorization + Cookie', () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer xyz',
          Cookie: 'sid=abc',
          'X-Custom': 'keep',
        },
      },
    };
    const result = scrubSentryEvent(event);
    expect(result.request?.headers).toEqual({
      Authorization: 'Bearer [redacted]',
      Cookie: '[redacted]',
      'X-Custom': 'keep',
    });
  });

  it('scrubs request.data password field', () => {
    const event = {
      request: { data: { email: 'a@b.io', password: 'hunter2' } },
    };
    const data = scrubSentryEvent(event).request?.data as Record<string, unknown>;
    expect(data.password).toBe('[redacted]');
    // Plain email in request.data is left alone (no key match); the email
    // pattern only fires on free-text message/exception fields.
    expect(data.email).toBe('a@b.io');
  });

  it('scrubs exception.values[].value (stack trace emails)', () => {
    const event = {
      exception: {
        values: [
          { value: 'Login failed for charlie@example.com' },
          { value: 'something else' },
        ],
      },
    };
    const result = scrubSentryEvent(event);
    expect(result.exception?.values?.[0]?.value).toBe(
      'Login failed for [redacted-email]'
    );
    expect(result.exception?.values?.[1]?.value).toBe('something else');
  });

  it('scrubs top-level message', () => {
    const event = { message: 'Error from bob@example.com' };
    expect(scrubSentryEvent(event).message).toBe(
      'Error from [redacted-email]'
    );
  });

  it('handles empty event without throwing', () => {
    expect(() => scrubSentryEvent({})).not.toThrow();
  });

  it('handles event with no request gracefully', () => {
    const event = { user: { email: 'a@b.io' } };
    expect(scrubSentryEvent(event).user?.email).toBe('[redacted-email]');
  });
});
