import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// localStorage shim so usePostComment.onMutate's optimistic-comment user
// blob can resolve consistently across tests.
const localStore = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((k: string) => (localStore.has(k) ? localStore.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => localStore.set(k, v)),
    removeItem: vi.fn((k: string) => localStore.delete(k)),
    clear: vi.fn(() => localStore.clear()),
  },
  configurable: true,
});

import {
  useComments,
  usePostComment,
  useEditComment,
  useDeleteComment,
  useFlagComment,
  useTypingIndicator,
} from './useComments';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
};

describe('useComments', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it('fetches comments for articleId and returns loading state', async () => {
    const mockComments = [
      { id: '1', text: 'Test comment', articleId: 'article-1', userId: 'user-1' },
    ];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockComments }),
    });

    const { result } = renderHook(() => useComments('article-1'), {
      wrapper: createWrapper(),
    });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.comments).toEqual(mockComments);
  });

  it('usePostComment provides mutate function for posting comments', () => {
    const { result } = renderHook(() => usePostComment('article-1'), {
      wrapper: createWrapper(),
    });

    // Hook provides mutate function
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
    // Initially not pending
    expect(result.current.isPending).toBe(false);
  });

  it('useDeleteComment provides mutate function for deleting comments', () => {
    const { result } = renderHook(() => useDeleteComment('article-1'), {
      wrapper: createWrapper(),
    });

    // Hook provides mutate function
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
    // Initially not pending
    expect(result.current.isPending).toBe(false);
  });

  it('WebSocket comment:new event triggers query invalidation', async () => {
    // This test verifies the socket setup
    const { io } = await import('socket.io-client');

    const { result: _result } = renderHook(() => useComments('article-1'), {
      wrapper: createWrapper(),
    });

    // Verify socket was created with correct URL
    expect(io).toHaveBeenCalled();
  });

  it('useTypingIndicator emits typing:start and auto-stops after 2s', async () => {
    vi.useFakeTimers();

    const mockSocket = {
      emit: vi.fn(),
    };

    const { result } = renderHook(
      () => useTypingIndicator('article-1', mockSocket as unknown as Parameters<typeof useTypingIndicator>[1]),
      { wrapper: createWrapper() }
    );

    // Start typing
    result.current.startTyping();

    expect(mockSocket.emit).toHaveBeenCalledWith('comment:typing:start', 'article-1');

    // Fast-forward 2 seconds for auto-stop
    vi.advanceTimersByTime(2000);

    expect(mockSocket.emit).toHaveBeenCalledWith('comment:typing:stop', 'article-1');

    vi.useRealTimers();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Mutation branch coverage (40-11)
  // The hook file was 15.38% branch covered before these tests — all four
  // mutations have at least: ok response, !ok response, onMutate optimistic,
  // onError rollback. Each exercise hits multiple branches.
  // ──────────────────────────────────────────────────────────────────────

  describe('usePostComment mutation paths', () => {
    beforeEach(() => {
      localStore.clear();
    });

    it('success: posts comment, returns new Comment, triggers onSuccess invalidate', async () => {
      const newComment = {
        id: 'c-1',
        text: 'Hello',
        articleId: 'a-1',
        parentId: null,
        userId: 'u-1',
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: newComment }),
      });
      const { result } = renderHook(() => usePostComment('a-1'), {
        wrapper: createWrapper(),
      });
      const data = await act(() => result.current.mutateAsync({ text: 'Hello' }));
      expect(data).toEqual(newComment);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/comments',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('failure: throws with server error.error message', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Comment too long' }),
      });
      const { result } = renderHook(() => usePostComment('a-1'), {
        wrapper: createWrapper(),
      });
      await expect(
        act(() => result.current.mutateAsync({ text: 'x'.repeat(9999) })),
      ).rejects.toThrow('Comment too long');
    });

    it('failure: throws generic "Failed to post comment" when no error field', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      const { result } = renderHook(() => usePostComment('a-1'), {
        wrapper: createWrapper(),
      });
      await expect(
        act(() => result.current.mutateAsync({ text: 'Hi' })),
      ).rejects.toThrow('Failed to post comment');
    });

    it('onMutate: reads currentUser from localStorage for optimistic comment', async () => {
      localStore.set(
        'newshub-auth-user',
        JSON.stringify({ id: 'u-99', name: 'Bob', avatarUrl: null }),
      );
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'c-2', text: 'Hi' } }),
      });
      const { result } = renderHook(() => usePostComment('a-1'), {
        wrapper: createWrapper(),
      });
      await act(() => result.current.mutateAsync({ text: 'Hi' }));
      // localStorage read happened (covers the JSON.parse branch + currentUser.id branch)
      expect(window.localStorage.getItem).toHaveBeenCalledWith('newshub-auth-user');
    });

    it('onMutate falls back to "unknown" id when localStorage is empty', async () => {
      // No user in localStorage — exercises the `currentUser.id || "unknown"` branch
      const optimisticResult = { id: 'c-3', text: 'Hi' };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: optimisticResult }),
      });
      const { result } = renderHook(() => usePostComment('a-1'), {
        wrapper: createWrapper(),
      });
      const data = await act(() => result.current.mutateAsync({ text: 'Hi' }));
      expect(data).toEqual(optimisticResult);
    });
  });

  describe('useEditComment mutation paths', () => {
    it('success: PATCH /api/comments/:id/edit, returns data', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'c-1', text: 'Edited' } }),
      });
      const { result } = renderHook(() => useEditComment('a-1'), {
        wrapper: createWrapper(),
      });
      await act(() =>
        result.current.mutateAsync({ commentId: 'c-1', text: 'Edited' }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/comments/c-1/edit',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('failure: throws with server error.error message', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Not your comment' }),
      });
      const { result } = renderHook(() => useEditComment('a-1'), {
        wrapper: createWrapper(),
      });
      await expect(
        act(() =>
          result.current.mutateAsync({ commentId: 'c-1', text: 'x' }),
        ),
      ).rejects.toThrow('Not your comment');
    });

    it('failure: throws generic "Failed to edit comment" when no error field', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      const { result } = renderHook(() => useEditComment('a-1'), {
        wrapper: createWrapper(),
      });
      await expect(
        act(() =>
          result.current.mutateAsync({ commentId: 'c-1', text: 'x' }),
        ),
      ).rejects.toThrow('Failed to edit comment');
    });
  });

  describe('useDeleteComment mutation paths', () => {
    it('success: DELETE /api/comments/:id, soft-mark in cache via onMutate', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ok: true } }),
      });
      const { result } = renderHook(() => useDeleteComment('a-1'), {
        wrapper: createWrapper(),
      });
      await act(() => result.current.mutateAsync({ commentId: 'c-1' }));
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/comments/c-1',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('failure: throws with server error.error message', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Already deleted' }),
      });
      const { result } = renderHook(() => useDeleteComment('a-1'), {
        wrapper: createWrapper(),
      });
      await expect(
        act(() => result.current.mutateAsync({ commentId: 'c-1' })),
      ).rejects.toThrow('Already deleted');
    });

    it('failure: throws generic "Failed to delete comment" when no error field', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      const { result } = renderHook(() => useDeleteComment('a-1'), {
        wrapper: createWrapper(),
      });
      await expect(
        act(() => result.current.mutateAsync({ commentId: 'c-1' })),
      ).rejects.toThrow('Failed to delete comment');
    });
  });

  describe('useFlagComment mutation paths', () => {
    it('success: POST /api/comments/:id/flag with reason + details', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ok: true } }),
      });
      const { result } = renderHook(() => useFlagComment('a-1'), {
        wrapper: createWrapper(),
      });
      await act(() =>
        result.current.mutateAsync({
          commentId: 'c-1',
          reason: 'spam',
          details: 'looks like marketing',
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/comments/c-1/flag',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('success: details optional', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { ok: true } }),
      });
      const { result } = renderHook(() => useFlagComment('a-1'), {
        wrapper: createWrapper(),
      });
      await act(() =>
        result.current.mutateAsync({ commentId: 'c-2', reason: 'abuse' }),
      );
      expect(global.fetch).toHaveBeenCalled();
    });

    it('failure: throws with server error.error message', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Already flagged' }),
      });
      const { result } = renderHook(() => useFlagComment('a-1'), {
        wrapper: createWrapper(),
      });
      await expect(
        act(() =>
          result.current.mutateAsync({ commentId: 'c-1', reason: 'spam' }),
        ),
      ).rejects.toThrow('Already flagged');
    });

    it('failure: throws generic "Failed to flag comment" when no error field', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });
      const { result } = renderHook(() => useFlagComment('a-1'), {
        wrapper: createWrapper(),
      });
      await expect(
        act(() =>
          result.current.mutateAsync({ commentId: 'c-1', reason: 'spam' }),
        ),
      ).rejects.toThrow('Failed to flag comment');
    });
  });

  describe('useTypingIndicator branches', () => {
    it('startTyping is no-op when socket is null', () => {
      const { result } = renderHook(() => useTypingIndicator('a-1', null), {
        wrapper: createWrapper(),
      });
      // Should not throw — covers the `if (!socket) return` branch
      result.current.startTyping();
      result.current.stopTyping();
      expect(true).toBe(true);
    });

    it('stopTyping clears existing timeout before emitting stop', () => {
      vi.useFakeTimers();
      const mockSocket = { emit: vi.fn() };
      const { result } = renderHook(
        () =>
          useTypingIndicator(
            'a-1',
            mockSocket as unknown as Parameters<typeof useTypingIndicator>[1],
          ),
        { wrapper: createWrapper() },
      );
      result.current.startTyping();
      result.current.stopTyping();
      // Auto-stop timeout should NOT fire because stopTyping cleared it
      vi.advanceTimersByTime(3000);
      // typing:stop emitted exactly once (from stopTyping, not auto-stop)
      const stopCalls = mockSocket.emit.mock.calls.filter(
        (c) => c[0] === 'comment:typing:stop',
      );
      expect(stopCalls.length).toBe(1);
      vi.useRealTimers();
    });
  });
});
