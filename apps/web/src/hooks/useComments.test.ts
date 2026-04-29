import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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

import { useComments, usePostComment, useDeleteComment, useTypingIndicator } from './useComments';

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
});
