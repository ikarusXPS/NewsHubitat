/**
 * useTranscript hook unit tests (Phase 40-06 / Task 8).
 *
 * Mirrors the useCredibility test layout. Mocks global fetch to lock in:
 *   - Authorization: Bearer header is attached from localStorage
 *   - 404 → null (not an error)
 *   - Non-OK + non-404 → throws (TanStack onError fires)
 *   - enabled: false → fetch never called
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement } from 'react';
import { useTranscript } from '../useTranscript';

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useTranscript', () => {
  const fetchMock = vi.fn();
  const localGetItem = vi.fn();
  const localSetItem = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    localGetItem.mockReset();
    localSetItem.mockReset();
    (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: localGetItem,
        setItem: localSetItem,
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      configurable: true,
    });
    localGetItem.mockImplementation((k: string) =>
      k === 'newshub-auth-token' ? 'token-abc' : null,
    );
  });

  it('attaches Bearer token from localStorage', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: { id: 't1', segments: [] } }),
    });

    const { result } = renderHook(() => useTranscript('podcast', 'ep1'), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe('Bearer token-abc');
  });

  it('returns null on 404 (transcript_unavailable)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'transcript_unavailable' }),
    });

    const { result } = renderHook(() => useTranscript('podcast', 'ep1'), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('throws on 500 so TanStack retry/onError fires', async () => {
    // useTranscript sets retry: 1 — return 500 enough times to settle to error.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'internal_error' }),
    });

    const { result } = renderHook(() => useTranscript('podcast', 'ep1'), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    });
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('does NOT fetch when enabled is false (FREE-tier gate)', async () => {
    renderHook(() => useTranscript('podcast', 'ep1', { enabled: false }), {
      wrapper: wrapper(),
    });
    // Give TanStack a tick to (not) fire.
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
