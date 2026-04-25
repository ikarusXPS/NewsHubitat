/**
 * Comment API Routes
 * CRUD endpoints for comments with auth and rate limiting
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../services/authService';
import { commentLimiter } from '../middleware/rateLimiter';
import { CommentService } from '../services/commentService';

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

const router = Router();

// Zod validation schemas
const createCommentSchema = z.object({
  articleId: z.string().min(1, 'Article ID required'),
  text: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment must be 5000 characters or less'),
  parentId: z.string().optional(), // Null for root comments, ID for replies
});

const editCommentSchema = z.object({
  text: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment must be 5000 characters or less'),
});

const flagCommentSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'misinformation', 'other'], {
    errorMap: () => ({ message: 'Invalid flag reason' }),
  }),
  details: z.string().max(500, 'Details too long').optional(),
});

function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => e.message).join(', ');
}

/**
 * POST /api/comments
 * Create new comment (auth + rate limited)
 */
router.post('/', authMiddleware, commentLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const result = createCommentSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: formatZodError(result.error),
      });
      return;
    }

    const userId = req.user!.userId;
    const { articleId, text, parentId } = result.data;

    const commentService = CommentService.getInstance();
    const comment = await commentService.createComment({
      text,
      userId,
      articleId,
      parentId,
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create comment';

    // Handle specific errors
    if (message.includes('Max 2 levels')) {
      res.status(400).json({ success: false, error: message });
      return;
    }

    if (message.includes('Parent comment not found')) {
      res.status(404).json({ success: false, error: message });
      return;
    }

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/comments/:articleId
 * List comments for article (public - no auth required)
 */
router.get('/:articleId', async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;

    if (!articleId || typeof articleId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Article ID required',
      });
      return;
    }

    const commentService = CommentService.getInstance();
    const comments = await commentService.getComments(articleId);

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch comments',
    });
  }
});

/**
 * PATCH /api/comments/:id/edit
 * Edit comment (auth required, 15-min window)
 */
router.patch('/:id/edit', authMiddleware, commentLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const result = editCommentSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: formatZodError(result.error),
      });
      return;
    }

    const { id } = req.params;
    const userId = req.user!.userId;
    const { text } = result.data;

    const commentService = CommentService.getInstance();
    const comment = await commentService.editComment(id, userId, text);

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to edit comment';

    if (message === 'Unauthorized') {
      res.status(403).json({ success: false, error: message });
      return;
    }

    if (message === 'Comment not found') {
      res.status(404).json({ success: false, error: message });
      return;
    }

    if (message === 'Edit time expired') {
      res.status(400).json({ success: false, error: message });
      return;
    }

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/comments/:id
 * Soft delete comment (auth required)
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const commentService = CommentService.getInstance();
    await commentService.deleteComment(id, userId);

    res.status(200).json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete comment';

    if (message === 'Unauthorized') {
      res.status(403).json({ success: false, error: message });
      return;
    }

    if (message === 'Comment not found') {
      res.status(404).json({ success: false, error: message });
      return;
    }

    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/comments/:id/flag
 * Flag comment for moderation (auth required)
 */
router.post('/:id/flag', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = flagCommentSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: formatZodError(result.error),
      });
      return;
    }

    const { id } = req.params;
    const userId = req.user!.userId;
    const { reason, details } = result.data;

    const commentService = CommentService.getInstance();
    await commentService.flagComment(id, userId, reason, details);

    res.status(200).json({
      success: true,
      message: 'Comment flagged for review',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to flag comment',
    });
  }
});

export default router;
