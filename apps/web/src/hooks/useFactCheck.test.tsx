import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useFactCheck } from './useFactCheck';

// Token is auto-attached by apiFetch when present. Use the shared mock pattern
// from hooks/__tests__/useTranscript.test.tsx so localStorage.getItem returns
// a value when apiFetch reads it.
const store = new Map<string, string>();
const localGetItem = vi.fn((k: string) => (store.has(k) ? store.get(k)! : null));
const localSetItem = vi.fn((k: string, v: string) => store.set(k, v));
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: localGetItem,
    setItem: localSetItem,
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  configurable: true,
});

function wrapper({ children }: { children: ReactNode }) {
  // Disable retry so 4xx/5xx surface to mutateAsync directly.
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useFactCheck', () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store.clear();
    store.set('newshub-auth-token', 'test-jwt');
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('resolves with FactCheckResult on 200 success', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            factCheckId: 'fc-1',
            verdict: 'true',
            confidence: 92,
            confidenceBucket: 'high',
            methodologyMd: '## How we checked',
            citations: [],
            locale: 'en',
            generatedAt: '2026-05-11T00:00:00.000Z',
            cached: false,
          },
        }),
        { status: 200 },
      ),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    const data = await result.current.mutateAsync({ claim: 'The sky is blue' });
    expect(data.verdict).toBe('true');
    expect(data.confidenceBucket).toBe('high');
  });

  it('throws RATE_LIMIT:<upgradeUrl> on 429 with upgradeUrl payload', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ upgradeUrl: '/pricing?source=ai' }), { status: 429 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    await expect(
      result.current.mutateAsync({ claim: 'A' }),
    ).rejects.toThrow('RATE_LIMIT:/pricing?source=ai');
  });

  it('throws RATE_LIMIT:/pricing fallback when 429 body lacks upgradeUrl', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 429 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    await expect(
      result.current.mutateAsync({ claim: 'A' }),
    ).rejects.toThrow('RATE_LIMIT:/pricing');
  });

  it('falls back to /pricing when 429 body is invalid JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('not-json', { status: 429 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    await expect(
      result.current.mutateAsync({ claim: 'A' }),
    ).rejects.toThrow('RATE_LIMIT:/pricing');
  });

  it('throws VALIDATION:<message> on 400 with server message', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Claim too short' }), { status: 400 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    await expect(
      result.current.mutateAsync({ claim: 'a' }),
    ).rejects.toThrow('VALIDATION:Claim too short');
  });

  it('uses "Invalid claim" default when 400 body lacks error field', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 400 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    await expect(
      result.current.mutateAsync({ claim: 'a' }),
    ).rejects.toThrow('VALIDATION:Invalid claim');
  });

  it('throws Fact-check failed: <status> for other non-OK responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('upstream error', { status: 503 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    await expect(
      result.current.mutateAsync({ claim: 'A' }),
    ).rejects.toThrow('Fact-check failed: 503');
  });

  it('attaches the Bearer token (auto-injected by apiFetch) when present', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    await result.current.mutateAsync({ claim: 'X' });
    const call = fetchMock.mock.calls[0];
    const headers = (call[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-jwt');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('passes article + language when provided', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: {} }), { status: 200 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    await result.current.mutateAsync({ claim: 'X', articleId: 'a1', language: 'de' });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({ claim: 'X', articleId: 'a1', language: 'de' });
  });

  it('waitFor() resolves once mutation settles to success state', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { verdict: 'mixed' } }), { status: 200 }),
    );
    const { result } = renderHook(() => useFactCheck(), { wrapper });
    result.current.mutate({ claim: 'X' });
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
