/**
 * Comment Service
 * Business logic for comment CRUD with AI moderation
 */

import { prisma } from '../db/prisma';
import { AIService } from './aiService';
import { WebSocketService } from './websocketService';
import type { CommentWithUser } from './websocketService';
import logger from '../utils/logger';

export class CommentService {
  private static instance: CommentService;

  private constructor() {}

  static getInstance(): CommentService {
    if (!CommentService.instance) {
      CommentService.instance = new CommentService();
    }
    return CommentService.instance;
  }

  /**
   * AI toxicity pre-screening with graceful degradation
   * Returns { isToxic: boolean, confidence: number }
   * CRITICAL: NEVER block comment on AI failure (per D-04 auto-publish)
   */
  private async checkToxicity(text: string): Promise<{ isToxic: boolean; confidence: number }> {
    const aiService = AIService.getInstance();

    if (!aiService.isAvailable()) {
      logger.debug('AI not available, auto-approving comment');
      return { isToxic: false, confidence: 0 };
    }

    const prompt = `Analyze this comment for toxicity (hate speech, threats, spam, harassment). Respond with JSON only:
{"toxic": true/false, "confidence": 0-1, "reason": "brief explanation"}

Comment: ${text}`;

    try {
      // 5s timeout per RESEARCH.md pitfall #5
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
      const aiPromise = aiService.callWithFallback(prompt);

      const response = await Promise.race([aiPromise, timeoutPromise]);

      if (!response) {
        logger.warn('AI toxicity check timed out, auto-approving comment');
        return { isToxic: false, confidence: 0 };
      }

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.warn('AI response missing JSON, auto-approving comment');
        return { isToxic: false, confidence: 0 };
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        isToxic: result.toxic ?? false,
        confidence: result.confidence ?? 0,
      };
    } catch (error) {
      logger.error('AI toxicity check failed:', error);
      // Graceful degradation: allow comment (per D-04)
      return { isToxic: false, confidence: 0 };
    }
  }

  /**
   * Create new comment with AI pre-screening and WebSocket broadcast
   */
  async createComment(data: {
    text: string;
    userId: string;
    articleId: string;
    parentId?: string;
  }): Promise<CommentWithUser> {
    // Validate threading depth (max 2 levels per D-05)
    if (data.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: data.parentId },
        select: { parentId: true },
      });

      if (!parentComment) {
        throw new Error('Parent comment not found');
      }

      // If parent already has a parent, reject (would create 3rd level)
      if (parentComment.parentId !== null) {
        throw new Error('Cannot reply to a reply. Max 2 levels of nesting.');
      }
    }

    // AI toxicity pre-screening (async with 5s timeout)
    const { isToxic, confidence } = await this.checkToxicity(data.text);

    // Create comment (publish even if flagged per D-03, D-04)
    const comment = await prisma.comment.create({
      data: {
        text: data.text,
        userId: data.userId,
        articleId: data.articleId,
        parentId: data.parentId || null,
        aiModerated: true,
        isFlagged: isToxic && confidence > 0.7, // Flag if high confidence toxic
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Transform to CommentWithUser type
    const commentWithUser: CommentWithUser = {
      id: comment.id,
      text: comment.text,
      userId: comment.userId,
      articleId: comment.articleId,
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        avatarUrl: comment.user.avatarUrl,
      },
      isDeleted: comment.isDeleted,
      isEdited: comment.isEdited,
      isFlagged: comment.isFlagged,
      aiModerated: comment.aiModerated,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };

    // Broadcast to article room via WebSocket
    const wsService = WebSocketService.getInstance();
    wsService.broadcastNewComment(data.articleId, commentWithUser);

    return commentWithUser;
  }

  /**
   * Get comments for article with nested replies
   */
  async getComments(articleId: string): Promise<CommentWithUser[]> {
    const comments = await prisma.comment.findMany({
      where: {
        articleId,
        parentId: null, // Root comments only
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' }, // Replies oldest first
        },
      },
      orderBy: { createdAt: 'desc' }, // Root comments newest first per D-06
    });

    // Transform to CommentWithUser[] type
    return comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      userId: comment.userId,
      articleId: comment.articleId,
      parentId: comment.parentId,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        avatarUrl: comment.user.avatarUrl,
      },
      isDeleted: comment.isDeleted,
      isEdited: comment.isEdited,
      isFlagged: comment.isFlagged,
      aiModerated: comment.aiModerated,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        text: reply.text,
        userId: reply.userId,
        articleId: reply.articleId,
        parentId: reply.parentId,
        user: {
          id: reply.user.id,
          name: reply.user.name,
          avatarUrl: reply.user.avatarUrl,
        },
        isDeleted: reply.isDeleted,
        isEdited: reply.isEdited,
        isFlagged: reply.isFlagged,
        aiModerated: reply.aiModerated,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
      })),
    })) as unknown as CommentWithUser[];
  }

  /**
   * Edit comment (15-minute window per D-08)
   */
  async editComment(commentId: string, userId: string, text: string): Promise<CommentWithUser> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Check 15-minute edit window
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (comment.createdAt < fifteenMinutesAgo) {
      throw new Error('Edit time expired');
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        text,
        isEdited: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      text: updated.text,
      userId: updated.userId,
      articleId: updated.articleId,
      parentId: updated.parentId,
      user: {
        id: updated.user.id,
        name: updated.user.name,
        avatarUrl: updated.user.avatarUrl,
      },
      isDeleted: updated.isDeleted,
      isEdited: updated.isEdited,
      isFlagged: updated.isFlagged,
      aiModerated: updated.aiModerated,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Soft delete comment (preserves thread structure per D-09)
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
  }

  /**
   * Flag comment for moderation
   */
  async flagComment(
    commentId: string,
    userId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        isFlagged: true,
        flagReasons: {
          userId,
          reason,
          details,
          flaggedAt: new Date().toISOString(),
        },
      },
    });
  }
}

export default CommentService;
