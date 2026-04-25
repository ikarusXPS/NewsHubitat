/**
 * Team Bookmark Hooks
 * TanStack Query hooks with WebSocket real-time updates for team bookmarks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import type { ServerToClientEvents, ClientToServerEvents } from '../../server/services/websocketService';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamBookmark {
  id: string;
  teamId: string;
  articleId: string;
  addedBy: string;
  addedByUser: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  note: string | null;
  createdAt: string;
  article: {
    id: string;
    title: string;
    url: string;
  } | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// FETCH FUNCTIONS
// ============================================================================

async function fetchTeamBookmarks(teamId: string, token: string): Promise<TeamBookmark[]> {
  const response = await fetch(`/api/teams/${teamId}/bookmarks`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch team bookmarks');
  const data: ApiResponse<TeamBookmark[]> = await response.json();
  return data.data || [];
}

async function addTeamBookmark(
  teamId: string,
  articleId: string,
  note: string | undefined,
  token: string
): Promise<TeamBookmark> {
  const response = await fetch(`/api/teams/${teamId}/bookmarks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ articleId, note }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add bookmark');
  }

  const data: ApiResponse<TeamBookmark> = await response.json();
  return data.data!;
}

async function removeTeamBookmark(teamId: string, bookmarkId: string, token: string): Promise<void> {
  const response = await fetch(`/api/teams/${teamId}/bookmarks/${bookmarkId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove bookmark');
  }
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook: Fetch team bookmarks with real-time WebSocket updates
 */
export function useTeamBookmarks(teamId: string | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const { token, isAuthenticated } = useAuth();

  const { data: bookmarks, isLoading, error } = useQuery({
    queryKey: ['team-bookmarks', teamId],
    queryFn: () => fetchTeamBookmarks(teamId!, token!),
    staleTime: 60_000,
    enabled: isAuthenticated && !!token && !!teamId,
  });

  // WebSocket subscription for real-time updates (D-10)
  useEffect(() => {
    if (!teamId || !token || !isAuthenticated) return;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Authenticate socket connection
      socket.emit('authenticate', token);
      // Subscribe to team room
      socket.emit('subscribe:team', teamId);
    });

    socket.on('team:bookmark:new', ({ teamId: eventTeamId }) => {
      if (eventTeamId === teamId) {
        // Invalidate to refetch with new bookmark
        queryClient.invalidateQueries({ queryKey: ['team-bookmarks', teamId] });
      }
    });

    return () => {
      socket.emit('unsubscribe:team', teamId);
      socket.off('connect');
      socket.off('team:bookmark:new');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [teamId, token, isAuthenticated, queryClient]);

  return {
    bookmarks: bookmarks || [],
    isLoading,
    error,
  };
}

/**
 * Hook: Add bookmark to team with optimistic update
 */
export function useAddTeamBookmark(teamId: string) {
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  return useMutation({
    mutationFn: ({ articleId, note }: { articleId: string; note?: string }) =>
      addTeamBookmark(teamId, articleId, note, token!),

    onMutate: async ({ articleId, note }) => {
      await queryClient.cancelQueries({ queryKey: ['team-bookmarks', teamId] });

      const previousBookmarks = queryClient.getQueryData(['team-bookmarks', teamId]);

      // Optimistic bookmark
      const optimisticBookmark: TeamBookmark = {
        id: `temp-${Date.now()}`,
        teamId,
        articleId,
        addedBy: user?.id || 'unknown',
        addedByUser: {
          id: user?.id || 'unknown',
          name: user?.name || 'You',
          avatarUrl: null,
        },
        note: note || null,
        createdAt: new Date().toISOString(),
        article: null, // Will be populated on refetch
      };

      queryClient.setQueryData(['team-bookmarks', teamId], (old: TeamBookmark[] | undefined) =>
        [optimisticBookmark, ...(old || [])]
      );

      return { previousBookmarks };
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['team-bookmarks', teamId], context?.previousBookmarks);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-bookmarks', teamId] });
    },
  });
}

/**
 * Hook: Remove bookmark from team with optimistic update
 */
export function useRemoveTeamBookmark(teamId: string) {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  return useMutation({
    mutationFn: (bookmarkId: string) => removeTeamBookmark(teamId, bookmarkId, token!),

    onMutate: async (bookmarkId) => {
      await queryClient.cancelQueries({ queryKey: ['team-bookmarks', teamId] });

      const previousBookmarks = queryClient.getQueryData(['team-bookmarks', teamId]);

      // Optimistically remove
      queryClient.setQueryData(['team-bookmarks', teamId], (old: TeamBookmark[] | undefined) =>
        (old || []).filter((b) => b.id !== bookmarkId)
      );

      return { previousBookmarks };
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['team-bookmarks', teamId], context?.previousBookmarks);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-bookmarks', teamId] });
    },
  });
}
