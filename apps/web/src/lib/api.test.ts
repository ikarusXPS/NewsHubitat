import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, authHeader, getAuthToken } from './api';

const TOKEN_KEY = 'newshub-auth-token';

// Re-define window.localStorage with a controlled mock — mirrors the
// pattern used by hooks/__tests__/useTranscript.test.tsx. Required
// because the jsdom default Storage prototype isn't reliably mutable
// from vitest test scope under the project's forks pool.
const store = new Map<string, string>();
const localGetItem = vi.fn((k: string) => (store.has(k) ? store.get(k)! : null));
const localSetItem = vi.fn((k: string, v: string) => {
  store.set(k, v);
});
const localRemoveItem = vi.fn((k: string) => {
  store.delete(k);
});
const localClear = vi.fn(() => {
  store.clear();
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: localGetItem,
    setItem: localSetItem,
    removeItem: localRemoveItem,
    clear: localClear,
  },
  configurable: true,
});

describe('getAuthToken', () => {
  beforeEach(() => {
    store.clear();
    localGetItem.mockClear();
  });

  it('returns null when no token stored', () => {
    expect(getAuthToken()).toBeNull();
  });

  it('returns the stored token verbatim', () => {
    store.set(TOKEN_KEY, 'abc.def.ghi');
    expect(getAuthToken()).toBe('abc.def.ghi');
  });

  it('does not throw when localStorage access throws', () => {
    localGetItem.mockImplementationOnce(() => {
      throw new Error('access denied');
    });
    expect(getAuthToken()).toBeNull();
  });
});

describe('authHeader', () => {
  beforeEach(() => {
    store.clear();
  });

  it('returns an empty object when no token is stored', () => {
    expect(authHeader()).toEqual({});
  });

  it('returns a Bearer Authorization header when token is present', () => {
    store.set(TOKEN_KEY, 'abc');
    expect(authHeader()).toEqual({ Authorization: 'Bearer abc' });
  });
});

describe('apiFetch', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store.clear();
    fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('forwards the request when no token is stored (no Authorization injected)', async () => {
    await apiFetch('/api/news');
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init?.headers as Record<string, string>;
    expect(headers?.Authorization).toBeUndefined();
  });

  it('injects Authorization header when a token is stored', async () => {
    store.set(TOKEN_KEY, 'jwt-xyz');
    await apiFetch('/api/me');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-xyz');
  });

  it('preserves caller-supplied headers alongside the injected Authorization', async () => {
    store.set(TOKEN_KEY, 'tok');
    await apiFetch('/api/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Custom': 'one' },
      body: '{}',
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{}');
    const headers = init.headers as Record<string, string>;
    expect(headers).toMatchObject({
      Authorization: 'Bearer tok',
      'Content-Type': 'application/json',
      'X-Custom': 'one',
    });
  });

  it('does not overwrite a caller-supplied Authorization header', async () => {
    store.set(TOKEN_KEY, 'tok');
    await apiFetch('/api/x', {
      headers: { Authorization: 'Bearer override' },
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer override');
  });

  it('accepts a Headers instance as init.headers', async () => {
    store.set(TOKEN_KEY, 'tok');
    const h = new Headers({ 'X-From-Headers': 'yes' });
    await apiFetch('/api/x', { headers: h });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers['x-from-headers'] ?? headers['X-From-Headers']).toBe('yes');
  });

  it('accepts a [string, string][] tuple list as init.headers', async () => {
    store.set(TOKEN_KEY, 'tok');
    await apiFetch('/api/x', {
      headers: [
        ['X-Tuple', 'yes'],
        ['Accept', 'application/json'],
      ],
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
    expect(headers['X-Tuple']).toBe('yes');
    expect(headers.Accept).toBe('application/json');
  });

  it('returns the underlying Response promise unchanged', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    const res = await apiFetch('/api/x');
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });
});
