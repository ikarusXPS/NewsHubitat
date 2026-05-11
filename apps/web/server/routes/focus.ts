import { Router, Request, Response } from 'express';
import { FocusSuggestionEngine } from '../services/focusSuggestionEngine';
import logger from '../utils/logger';

export const focusRoutes = Router();

/**
 * GET /api/focus/suggestions
 *
 * Returns top 5 focus suggestions based on current news patterns:
 * - Tension spikes (region-level sentiment increases)
 * - Breaking news (emerging topics in last 2h)
 * - Coverage gaps (under-represented perspectives)
 *
 * Response format:
 * {
 *   success: true,
 *   data: FocusSuggestion[],
 *   meta: {
 *     count: number,
 *     generatedAt: Date
 *   }
 * }
 */
focusRoutes.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const engine = FocusSuggestionEngine.getInstance();
    const suggestions = await engine.generateSuggestions();

    res.json({
      success: true,
      data: suggestions,
      meta: {
        count: suggestions.length,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error('Focus suggestions error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to generate focus suggestions',
    });
  }
});
