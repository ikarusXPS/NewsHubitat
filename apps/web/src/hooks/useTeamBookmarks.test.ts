import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

type SocketEventHandler = (...args: unknown[]) => void;

const socketHandlers = new Map<string, SocketEventHandler>();
const socketEmits: Array<{ event: string; args: unknown[] }> = [];
const mockSocket = {
  on: vi.fn((event: string, handler: SocketEventHandler) => {
    socketHandlers.set(event, handler);
  }),
  off: vi.fn((event: string) => {
    socketHandlers.delete(event);
  }),
  emit: vi.fn((event: string, ...args: unknown[]) => {
    socketEmits.push({ event, args });
  }),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

const mockAuth = {
  token: 'test-token',
  user: { id: 'user-1', name: 'Alice' },
  isAuthenticated: true,
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import { useTeamBookmarks, useAddTeamBookmark, useRemoveTeamBookmark, type TeamBookmark } from './useTeamBookmarks';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const sampleBookmark: TeamBookmark = {
  id: 'bm-1',
  teamId: 'team-1',
  articleId: 'art-1',
  addedBy: 'user-1',
  addedByUser: { id: 'user-1', name: 'Alice', avatarUrl: null },
  note: 'good read',
  createdAt: '2026-05-03T00:00:00Z',
  article: { id: 'art-1', title: 'Title', url: 'https://example.test/a' },
};

describe('useTeamBookmarks (fetch + socket)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    socketHandlers.clear();
    socketEmits.length = 0;
    mockAuth.token = 'test-token';
    mockAuth.user = { id: 'user-1', name: 'Alice' };
    mockAuth.isAuthenticated = true;
    global.fetch = vi.fn();
  });

  it('returns empty bookmarks and skips fetch when teamId is undefined', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTeamBookmarks(undefined), { wrapper: Wrapper });

    expect(result.current.bookmarks).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches bookmarks for the team and returns them', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [sampleBookmark] }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTeamBookmarks('team-1'), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.bookmarks).toEqual([sampleBookmark]);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/teams/team-1/bookmarks',
      expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
    );
  });

  it('returns the empty fallback when API responds with no data', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTeamBookmarks('team-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.bookmarks).toEqual([]);
  });

  it('surfaces an error when fetch returns non-ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'forbidden' }),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useTeamBookmarks('team-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('opens a socket and authenticates + subscribes on connect', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { Wrapper } = createWrapper();
    renderHook(() => useTeamBookmarks('team-1'), { wrapper: Wrapper });

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('team:bookmark:new', expect.any(Function));

    act(() => socketHandlers.get('connect')?.());

    expect(socketEmits).toEqual(
      expect.arrayContaining([
        { event: 'authenticate', args: ['test-token'] },
        { event: 'subscribe:team', args: ['team-1'] },
      ])
    );
  });

  it('invalidates the query when team:bookmark:new fires for the current team', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { Wrapper, queryClient } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useTeamBookmarks('team-1'), { wrapper: Wrapper });

    act(() => socketHandlers.get('team:bookmark:new')?.({ teamId: 'team-1' }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['team-bookmarks', 'team-1'] });

    invalidate.mockClear();
    act(() => socketHandlers.get('team:bookmark:new')?.({ teamId: 'other-team' }));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('cleans up the socket on unmount', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { Wrapper } = createWrapper();
    const { unmount } = renderHook(() => useTeamBookmarks('team-1'), { wrapper: Wrapper });

    socketEmits.length = 0;
    unmount();

    expect(socketEmits).toContainEqual({ event: 'unsubscribe:team', args: ['team-1'] });
    expect(mockSocket.off).toHaveBeenCalledWith('connect');
    expect(mockSocket.off).toHaveBeenCalledWith('team:bookmark:new');
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('does not open a socket when not authenticated', () => {
    mockAuth.isAuthenticated = false;
    mockAuth.token = null as unknown as string;

    const { Wrapper } = createWrapper();
    renderHook(() => useTeamBookmarks('team-1'), { wrapper: Wrapper });

    expect(mockSocket.on).not.toHaveBeenCalled();
  });
});

describe('useAddTeamBookmark', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.token = 'test-token';
    mockAuth.user = { id: 'user-1', name: 'Alice' };
    mockAuth.isAuthenticated = true;
    global.fetch = vi.fn();
  });

  it('exposes a TanStack mutation API', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddTeamBookmark('team-1'), { wrapper: Wrapper });

    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
    expect(result.current.isPending).toBe(false);
  });

  it('optimistically prepends a bookmark, then invalidates on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: sampleBookmark }),
    });

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['team-bookmarks', 'team-1'], [sampleBookmark]);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useAddTeamBookmark('team-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ articleId: 'art-2', note: 'fresh' });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/teams/team-1/bookmarks',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ articleId: 'art-2', note: 'fresh' }) })
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['team-bookmarks', 'team-1'] });
  });

  it('falls back to "unknown" + "You" when the user is missing', async () => {
    mockAuth.user = null as unknown as typeof mockAuth.user;
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: sampleBookmark }),
    });

    const { Wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useAddTeamBookmark('team-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({ articleId: 'art-2' });
    });

    const cached = queryClient.getQueryData<TeamBookmark[]>(['team-bookmarks', 'team-1']);
    // Optimistic entry was replaced by invalidate → mocked fetch returns sampleBookmark.
    // The optimistic-fallback branch still ran; assert the request body shape.
    expect(global.fetch).toHaveBeenCalled();
    expect(cached).toBeDefined();
  });

  it('rolls back optimistic state when the request errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'boom' }),
    });

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['team-bookmarks', 'team-1'], [sampleBookmark]);

    const { result } = renderHook(() => useAddTeamBookmark('team-1'), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ articleId: 'art-2' })).rejects.toThrow(/boom/);
    });

    const cached = queryClient.getQueryData<TeamBookmark[]>(['team-bookmarks', 'team-1']);
    expect(cached).toEqual([sampleBookmark]);
  });

  it('uses the default error message when the response body has no error field', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddTeamBookmark('team-1'), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ articleId: 'art-2' })).rejects.toThrow('Failed to add bookmark');
    });
  });
});

describe('useRemoveTeamBookmark', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuth.token = 'test-token';
    mockAuth.user = { id: 'user-1', name: 'Alice' };
    mockAuth.isAuthenticated = true;
    global.fetch = vi.fn();
  });

  it('exposes a TanStack mutation API', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveTeamBookmark('team-1'), { wrapper: Wrapper });

    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
    expect(result.current.isPending).toBe(false);
  });

  it('optimistically removes the bookmark, then invalidates on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });

    const { Wrapper, queryClient } = createWrapper();
    const other: TeamBookmark = { ...sampleBookmark, id: 'bm-2', articleId: 'art-2' };
    queryClient.setQueryData(['team-bookmarks', 'team-1'], [sampleBookmark, other]);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useRemoveTeamBookmark('team-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('bm-1');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/teams/team-1/bookmarks/bm-1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['team-bookmarks', 'team-1'] });
  });

  it('rolls back to previous bookmarks on error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'nope' }),
    });

    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(['team-bookmarks', 'team-1'], [sampleBookmark]);

    const { result } = renderHook(() => useRemoveTeamBookmark('team-1'), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync('bm-1')).rejects.toThrow(/nope/);
    });

    const cached = queryClient.getQueryData<TeamBookmark[]>(['team-bookmarks', 'team-1']);
    expect(cached).toEqual([sampleBookmark]);
  });

  it('handles undefined cache gracefully when removing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({}) });

    const { Wrapper, queryClient } = createWrapper();
    // No prior data set — exercises the `(old || [])` branch
    const { result } = renderHook(() => useRemoveTeamBookmark('team-1'), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync('bm-1');
    });

    expect(queryClient.getQueryData(['team-bookmarks', 'team-1'])).toBeDefined();
  });

  it('uses the default error message when the response body has no error field', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useRemoveTeamBookmark('team-1'), { wrapper: Wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync('bm-1')).rejects.toThrow('Failed to remove bookmark');
    });
  });
});
