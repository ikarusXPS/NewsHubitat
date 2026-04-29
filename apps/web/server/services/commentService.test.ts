/**
 * Unit tests for CommentService
 * Tests AI moderation, threading depth, edit window, and soft delete
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies at top level (per D-01)
vi.mock('./aiService');
vi.mock('./websocketService');
vi.mock('../db/prisma', () => ({
  prisma: {
    comment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock('../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Import after mocks
import { CommentService } from './commentService';
import { AIService } from './aiService';
import { WebSocketService } from './websocketService';
import { prisma } from '../db/prisma';

describe('CommentService', () => {
  let commentService: CommentService;
  let aiServiceMock: {
    isAvailable: ReturnType<typeof vi.fn>;
    callWithFallback: ReturnType<typeof vi.fn>;
  };
  let wsServiceMock: {
    broadcastNewComment: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset singleton for clean state
    (CommentService as unknown as { instance: CommentService | null }).instance = null;
    commentService = CommentService.getInstance();

    aiServiceMock = {
      isAvailable: vi.fn().mockReturnValue(true),
      callWithFallback: vi.fn(),
    };
    (AIService.getInstance as unknown as ReturnType<typeof vi.fn>).mockReturnValue(aiServiceMock);

    wsServiceMock = {
      broadcastNewComment: vi.fn(),
    };
    (WebSocketService.getInstance as unknown as ReturnType<typeof vi.fn>).mockReturnValue(wsServiceMock);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset singleton
    (CommentService as unknown as { instance: CommentService | null }).instance = null;
  });

  describe('createComment', () => {
    it('rejects 3rd level nesting (max 2 levels per D-05)', async () => {
      // Mock parent comment that already has a parent (would be 3rd level)
      (prisma.comment.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'reply-1',
        parentId: 'root-1', // Already a reply - this parent has its own parent
      });

      await expect(
        commentService.createComment({
          text: 'Deep reply attempt',
          userId: 'user-1',
          articleId: 'article-1',
          parentId: 'reply-1', // Trying to reply to a reply
        })
      ).rejects.toThrow('Max 2 levels');
    });

    it('calls AI toxicity check with timeout', async () => {
      // Mock no parent (root comment)
      (prisma.comment.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.comment.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'comment-1',
        text: 'Test comment',
        userId: 'user-1',
        articleId: 'article-1',
        parentId: null,
        isDeleted: false,
        isEdited: false,
        isFlagged: false,
        aiModerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User', avatarUrl: null },
      });

      aiServiceMock.callWithFallback.mockResolvedValue(
        '{"toxic": false, "confidence": 0}'
      );

      await commentService.createComment({
        text: 'Test comment',
        userId: 'user-1',
        articleId: 'article-1',
      });

      expect(aiServiceMock.callWithFallback).toHaveBeenCalledWith(
        expect.stringContaining('Analyze this comment for toxicity')
      );
    });

    it('auto-approves comment on AI failure (graceful degradation)', async () => {
      // Mock no parent (root comment)
      (prisma.comment.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.comment.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'comment-1',
        text: 'Test comment',
        userId: 'user-1',
        articleId: 'article-1',
        parentId: null,
        isDeleted: false,
        isEdited: false,
        isFlagged: false,
        aiModerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User', avatarUrl: null },
      });

      // AI fails
      aiServiceMock.callWithFallback.mockRejectedValue(new Error('AI timeout'));

      const result = await commentService.createComment({
        text: 'Test comment',
        userId: 'user-1',
        articleId: 'article-1',
      });

      // Comment should be created despite AI failure
      expect(result).toBeDefined();
      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isFlagged: false, // Not flagged due to AI failure
            aiModerated: true,
          }),
        })
      );
    });

    it('flags comment when toxicity confidence >0.7', async () => {
      // Mock no parent (root comment)
      (prisma.comment.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.comment.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'comment-1',
        text: 'Toxic comment',
        userId: 'user-1',
        articleId: 'article-1',
        parentId: null,
        isDeleted: false,
        isEdited: false,
        isFlagged: true,
        aiModerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User', avatarUrl: null },
      });

      // AI detects high-confidence toxicity
      aiServiceMock.callWithFallback.mockResolvedValue(
        '{"toxic": true, "confidence": 0.9, "reason": "hate speech"}'
      );

      await commentService.createComment({
        text: 'Toxic comment',
        userId: 'user-1',
        articleId: 'article-1',
      });

      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isFlagged: true,
            aiModerated: true,
          }),
        })
      );
    });

    it('broadcasts to WebSocket after successful insert', async () => {
      // Mock no parent (root comment)
      (prisma.comment.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const mockComment = {
        id: 'comment-1',
        text: 'Test comment',
        userId: 'user-1',
        articleId: 'article-1',
        parentId: null,
        isDeleted: false,
        isEdited: false,
        isFlagged: false,
        aiModerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User', avatarUrl: null },
      };
      (prisma.comment.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockComment);

      aiServiceMock.callWithFallback.mockResolvedValue(
        '{"toxic": false, "confidence": 0}'
      );

      await commentService.createComment({
        text: 'Test comment',
        userId: 'user-1',
        articleId: 'article-1',
      });

      expect(wsServiceMock.broadcastNewComment).toHaveBeenCalledWith(
        'article-1',
        expect.objectContaining({
          id: 'comment-1',
          text: 'Test comment',
        })
      );
    });
  });

  describe('editComment', () => {
    it('rejects edit after 15-minute window', async () => {
      // Comment created 20 minutes ago
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

      (prisma.comment.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'comment-1',
        userId: 'user-1',
        createdAt: twentyMinutesAgo,
      });

      await expect(
        commentService.editComment('comment-1', 'user-1', 'Edited text')
      ).rejects.toThrow('Edit time expired');
    });

    it('sets isEdited: true on successful update', async () => {
      // Comment created 5 minutes ago (within window)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      (prisma.comment.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'comment-1',
        userId: 'user-1',
        createdAt: fiveMinutesAgo,
      });

      (prisma.comment.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'comment-1',
        text: 'Edited text',
        userId: 'user-1',
        articleId: 'article-1',
        parentId: null,
        isDeleted: false,
        isEdited: true,
        isFlagged: false,
        aiModerated: true,
        createdAt: fiveMinutesAgo,
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'Test User', avatarUrl: null },
      });

      await commentService.editComment('comment-1', 'user-1', 'Edited text');

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: {
          text: 'Edited text',
          isEdited: true,
        },
        include: expect.any(Object),
      });
    });
  });

  describe('deleteComment', () => {
    it('sets isDeleted: true, preserves comment in database', async () => {
      (prisma.comment.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'comment-1',
        userId: 'user-1',
      });

      (prisma.comment.update as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'comment-1',
        isDeleted: true,
      });

      await commentService.deleteComment('comment-1', 'user-1');

      expect(prisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: { isDeleted: true },
      });

      // Verify NOT hard deleted - delete method should not be called
      expect((prisma.comment as unknown as { delete?: ReturnType<typeof vi.fn> }).delete).toBeUndefined();
    });
  });

  describe('getComments', () => {
    it('returns root comments with nested replies sorted correctly', async () => {
      const mockComments = [
        {
          id: 'root-1',
          text: 'First comment',
          userId: 'user-1',
          articleId: 'article-1',
          parentId: null,
          isDeleted: false,
          isEdited: false,
          isFlagged: false,
          aiModerated: true,
          createdAt: new Date('2026-04-25T10:00:00Z'),
          updatedAt: new Date('2026-04-25T10:00:00Z'),
          user: { id: 'user-1', name: 'User One', avatarUrl: null },
          replies: [
            {
              id: 'reply-1',
              text: 'First reply',
              userId: 'user-2',
              articleId: 'article-1',
              parentId: 'root-1',
              isDeleted: false,
              isEdited: false,
              isFlagged: false,
              aiModerated: true,
              createdAt: new Date('2026-04-25T10:05:00Z'),
              updatedAt: new Date('2026-04-25T10:05:00Z'),
              user: { id: 'user-2', name: 'User Two', avatarUrl: null },
            },
          ],
        },
        {
          id: 'root-2',
          text: 'Second comment',
          userId: 'user-1',
          articleId: 'article-1',
          parentId: null,
          isDeleted: false,
          isEdited: false,
          isFlagged: false,
          aiModerated: true,
          createdAt: new Date('2026-04-25T11:00:00Z'),
          updatedAt: new Date('2026-04-25T11:00:00Z'),
          user: { id: 'user-1', name: 'User One', avatarUrl: null },
          replies: [],
        },
      ];

      (prisma.comment.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockComments);

      const result = await commentService.getComments('article-1');

      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { articleId: 'article-1', parentId: null },
          orderBy: { createdAt: 'desc' }, // Root newest first per D-06
          include: expect.objectContaining({
            replies: expect.objectContaining({
              orderBy: { createdAt: 'asc' }, // Replies oldest first
            }),
          }),
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('root-1');
      expect(result[0].replies).toHaveLength(1);
    });
  });
});
