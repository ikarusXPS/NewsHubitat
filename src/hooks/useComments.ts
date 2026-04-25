import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../../server/services/websocketService';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Comment {
  id: string;
  text: string;
  userId: string;
  articleId: string;
  parentId: string | null;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  isDeleted: boolean;
  isEdited: boolean;
  isFlagged: boolean;
  aiModerated: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

/**
 * Fetch comments for article
 */
async function fetchComments(articleId: string): Promise<Comment[]> {
  const response = await fetch(`/api/comments/${articleId}`);
  if (!response.ok) throw new Error('Failed to fetch comments');
  const data = await response.json();
  return data.data;
}

/**
 * Post new comment
 */
async function postComment(data: {
  articleId: string;
  text: string;
  parentId?: string;
  token: string;
}): Promise<Comment> {
  const response = await fetch('/api/comments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
    body: JSON.stringify({
      articleId: data.articleId,
      text: data.text,
      parentId: data.parentId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to post comment');
  }

  const result = await response.json();
  return result.data;
}

/**
 * Hook: Fetch comments with real-time updates
 */
export function useComments(articleId: string) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', articleId],
    queryFn: () => fetchComments(articleId),
    staleTime: 60_000,
  });

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!articleId) return;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe:article', articleId);
    });

    socket.on('comment:new', ({ articleId: eventArticleId }) => {
      if (eventArticleId === articleId) {
        // Invalidate to refetch
        queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
      }
    });

    return () => {
      socket.emit('unsubscribe:article', articleId);
      socket.off('connect');
      socket.off('comment:new');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [articleId, queryClient]);

  return {
    comments: comments || [],
    isLoading,
    socket: socketRef.current,
  };
}

/**
 * Hook: Post comment with optimistic update
 */
export function usePostComment(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { text: string; parentId?: string; token: string }) =>
      postComment({ articleId, ...data }),

    onMutate: async ({ text, parentId }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', articleId] });

      const previousComments = queryClient.getQueryData(['comments', articleId]);

      // Optimistic comment
      const currentUser = JSON.parse(localStorage.getItem('newshub-auth-user') || '{}');
      const optimisticComment: Comment = {
        id: `temp-${Date.now()}`,
        text,
        userId: currentUser.id || 'unknown',
        articleId,
        parentId: parentId || null,
        user: {
          id: currentUser.id || 'unknown',
          name: currentUser.name || 'You',
          avatarUrl: currentUser.avatarUrl || null,
        },
        isDeleted: false,
        isEdited: false,
        isFlagged: false,
        aiModerated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(['comments', articleId], (old: Comment[] | undefined) =>
        [optimisticComment, ...(old || [])]
      );

      return { previousComments };
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['comments', articleId], context?.previousComments);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });
}

/**
 * Hook: Edit comment
 */
export function useEditComment(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, text, token }: { commentId: string; text: string; token: string }) => {
      const response = await fetch(`/api/comments/${commentId}/edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to edit comment');
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });
}

/**
 * Hook: Delete comment (soft delete)
 */
export function useDeleteComment(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, token }: { commentId: string; token: string }) => {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete comment');
      }

      return response.json();
    },

    onMutate: async ({ commentId }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', articleId] });

      const previousComments = queryClient.getQueryData(['comments', articleId]);

      // Optimistically mark as deleted
      queryClient.setQueryData(['comments', articleId], (old: Comment[] | undefined) =>
        (old || []).map(comment =>
          comment.id === commentId ? { ...comment, isDeleted: true } : comment
        )
      );

      return { previousComments };
    },

    onError: (_err, _variables, context) => {
      queryClient.setQueryData(['comments', articleId], context?.previousComments);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });
}

/**
 * Hook: Flag comment
 */
export function useFlagComment(articleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      reason,
      details,
      token,
    }: {
      commentId: string;
      reason: string;
      details?: string;
      token: string;
    }) => {
      const response = await fetch(`/api/comments/${commentId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, details }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to flag comment');
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
    },
  });
}

/**
 * Hook: Typing indicator with debounce
 */
export function useTypingIndicator(articleId: string, socket: Socket | null) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTyping = useCallback(() => {
    if (!socket) return;

    socket.emit('comment:typing:start', articleId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Auto-stop after 2s
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('comment:typing:stop', articleId);
    }, 2000);
  }, [articleId, socket]);

  const stopTyping = useCallback(() => {
    if (!socket) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    socket.emit('comment:typing:stop', articleId);
  }, [articleId, socket]);

  return { startTyping, stopTyping };
}
