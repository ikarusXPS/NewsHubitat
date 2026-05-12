/**
 * AuthContext tests — branch coverage for todo 40-11.
 *
 * AuthContext.tsx was at 0% branch coverage before this file. Covers:
 *   - verifyToken effect on mount: no-token / ok / !ok / fetch-throw
 *   - login: ok / !ok / Sentry.setUser
 *   - register: ok / !ok / Sentry.setUser
 *   - logout: clears token + user + Sentry
 *   - updatePreferences / addBookmark / removeBookmark: requires token; ok/!ok
 *   - resendVerification: requires token; 429 → rateLimited; else success
 *   - loginWithOAuth: ok / !ok / fetch-throw — both error paths clear token
 *   - useAuth outside provider → throws
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import type { ReactNode } from 'react';

// Sentry + logger are imported at module load. vi.mock factories are hoisted
// above local consts, so use vi.hoisted() to share the fn references safely.
const { sentrySetUser, loggerError } = vi.hoisted(() => ({
  sentrySetUser: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  setUser: sentrySetUser,
}));

vi.mock('../lib/logger', () => ({
  logger: { error: loggerError, info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const TOKEN_KEY = 'newshub-auth-token';

function freshLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((k: string) => (store.has(k) ? store.get(k)! : null)),
      setItem: vi.fn((k: string, v: string) => store.set(k, v)),
      removeItem: vi.fn((k: string) => store.delete(k)),
      clear: vi.fn(() => store.clear()),
    },
    configurable: true,
  });
  return store;
}

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function mockUser() {
  return {
    id: 'u1',
    email: 'a@b.test',
    name: 'Alice',
    createdAt: '2026-01-01',
    bookmarks: ['art-1'],
    preferences: { language: 'en', theme: 'dark', regions: ['usa'] },
    emailVerified: true,
    subscriptionTier: 'FREE',
  };
}

describe('AuthContext', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: Map<string, string>;

  beforeEach(() => {
    store = freshLocalStorage();
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    sentrySetUser.mockClear();
    loggerError.mockClear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('useAuth() guard', () => {
    it('throws when used outside AuthProvider', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        /useAuth must be used within an AuthProvider/,
      );
    });
  });

  describe('mount / verifyToken effect', () => {
    it('no token in storage → isLoading flips to false without fetching', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isVerified).toBe(false);
    });

    it('ok response → setUser + Sentry.setUser; isAuthenticated true', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isVerified).toBe(true);
      expect(sentrySetUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', email: 'a@b.test', username: 'Alice' }),
      );
    });

    it('non-ok response → clears token (no user, isAuthenticated false)', async () => {
      store.set(TOKEN_KEY, 'expired-jwt');
      fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(store.has(TOKEN_KEY)).toBe(false);
    });

    it('fetch throws → logger.error called; loading still resolves', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockRejectedValueOnce(new Error('network'));
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(loggerError).toHaveBeenCalledWith('Failed to verify token');
    });

    it('isVerified=false when emailVerified flag is absent/false', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      const u = { ...mockUser(), emailVerified: false };
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: u }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      expect(result.current.isVerified).toBe(false);
    });
  });

  describe('login', () => {
    it('success → stores token, sets user, fires Sentry.setUser', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { token: 'new-jwt', user: mockUser() } }),
          { status: 200 },
        ),
      );
      await act(() => result.current.login('a@b.test', 'pw'));
      expect(result.current.token).toBe('new-jwt');
      expect(result.current.user?.id).toBe('u1');
      expect(store.get(TOKEN_KEY)).toBe('new-jwt');
      expect(sentrySetUser).toHaveBeenCalled();
    });

    it('non-ok response → throws with server error message', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
        }),
      );
      await expect(
        act(() => result.current.login('a@b.test', 'wrong')),
      ).rejects.toThrow('Invalid credentials');
    });

    it('non-ok with no error field → throws generic "Login failed"', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 500 }),
      );
      await expect(
        act(() => result.current.login('a@b.test', 'pw')),
      ).rejects.toThrow('Login failed');
    });
  });

  describe('register', () => {
    it('success → stores token, sets user, fires Sentry.setUser', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: { token: 'reg-jwt', user: mockUser() } }),
          { status: 200 },
        ),
      );
      await act(() => result.current.register('a@b.test', 'pw', 'Alice'));
      expect(result.current.token).toBe('reg-jwt');
      expect(store.get(TOKEN_KEY)).toBe('reg-jwt');
      expect(sentrySetUser).toHaveBeenCalled();
    });

    it('non-ok → throws with server error message', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Email taken' }), { status: 409 }),
      );
      await expect(
        act(() => result.current.register('a@b.test', 'pw', 'A')),
      ).rejects.toThrow('Email taken');
    });

    it('non-ok with no error field → throws generic "Registration failed"', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 500 }),
      );
      await expect(
        act(() => result.current.register('a@b.test', 'pw', 'A')),
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('logout', () => {
    it('clears token, user, and Sentry context', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      sentrySetUser.mockClear();
      act(() => result.current.logout());
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(store.has(TOKEN_KEY)).toBe(false);
      expect(sentrySetUser).toHaveBeenCalledWith(null);
    });
  });

  describe('updatePreferences', () => {
    it('throws when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await expect(
        act(() => result.current.updatePreferences({ language: 'de' })),
      ).rejects.toThrow('Not authenticated');
    });

    it('success merges preferences into user state', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: { language: 'de', theme: 'light', regions: ['europa'] },
          }),
          { status: 200 },
        ),
      );
      await act(() => result.current.updatePreferences({ language: 'de' }));
      expect(result.current.user?.preferences.language).toBe('de');
      expect(result.current.user?.preferences.theme).toBe('light');
    });

    it('non-ok response throws with server error', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
      );
      await expect(
        act(() => result.current.updatePreferences({ language: 'de' })),
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('addBookmark / removeBookmark', () => {
    it('addBookmark throws when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await expect(
        act(() => result.current.addBookmark('art-2')),
      ).rejects.toThrow('Not authenticated');
    });

    it('addBookmark success appends article id to user.bookmarks', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
      await act(() => result.current.addBookmark('art-2'));
      expect(result.current.user?.bookmarks).toContain('art-2');
    });

    it('addBookmark non-ok throws with server error', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'limit reached' }), {
          status: 403,
        }),
      );
      await expect(
        act(() => result.current.addBookmark('art-2')),
      ).rejects.toThrow('limit reached');
    });

    it('removeBookmark throws when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await expect(
        act(() => result.current.removeBookmark('art-1')),
      ).rejects.toThrow('Not authenticated');
    });

    it('removeBookmark success filters bookmark from user state', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
      await act(() => result.current.removeBookmark('art-1'));
      expect(result.current.user?.bookmarks).not.toContain('art-1');
    });

    it('removeBookmark non-ok throws with server error', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'not found' }), { status: 404 }),
      );
      await expect(
        act(() => result.current.removeBookmark('missing')),
      ).rejects.toThrow('not found');
    });
  });

  describe('resendVerification', () => {
    it('throws when not authenticated', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await expect(
        act(() => result.current.resendVerification()),
      ).rejects.toThrow('Not authenticated');
    });

    it('429 → returns { success: false, rateLimited: true, minutesRemaining }', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ minutesRemaining: 3 }), { status: 429 }),
      );
      const res = await result.current.resendVerification();
      expect(res).toEqual({ success: false, rateLimited: true, minutesRemaining: 3 });
    });

    it('200 → returns { success: true }', async () => {
      store.set(TOKEN_KEY, 'jwt-x');
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.user).not.toBeNull());
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );
      const res = await result.current.resendVerification();
      expect(res.success).toBe(true);
    });
  });

  describe('loginWithOAuth', () => {
    it('ok response → setUser, Sentry.setUser called', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUser() }), { status: 200 }),
      );
      await act(() => result.current.loginWithOAuth('oauth-jwt'));
      expect(result.current.user?.id).toBe('u1');
      expect(result.current.token).toBe('oauth-jwt');
      expect(store.get(TOKEN_KEY)).toBe('oauth-jwt');
    });

    it('non-ok response → throws Invalid token + clears stored token', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
      await expect(
        act(() => result.current.loginWithOAuth('bad-oauth-jwt')),
      ).rejects.toThrow('Invalid token');
      expect(result.current.token).toBeNull();
      expect(store.has(TOKEN_KEY)).toBe(false);
    });

    it('fetch throws → rethrows + clears stored token', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      fetchMock.mockRejectedValueOnce(new Error('boom'));
      await expect(
        act(() => result.current.loginWithOAuth('oauth-jwt')),
      ).rejects.toThrow('boom');
      expect(result.current.token).toBeNull();
      expect(store.has(TOKEN_KEY)).toBe(false);
    });
  });

  describe('provider rendering', () => {
    it('renders children unchanged', () => {
      render(
        <AuthProvider>
          <div data-testid="child">hello</div>
        </AuthProvider>,
      );
      expect(screen.getByTestId('child').textContent).toBe('hello');
    });
  });
});
