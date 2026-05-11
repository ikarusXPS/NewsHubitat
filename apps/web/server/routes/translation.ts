import { Router, Request, Response } from 'express';
import { TranslationService } from '../services/translationService';
import logger from '../utils/logger';

export const translationRoutes = Router();

const translationService = TranslationService.getInstance();

translationRoutes.post('/', async (req: Request, res: Response) => {
  const { text, targetLang, sourceLang } = req.body;

  if (!text || !targetLang) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: text, targetLang',
    });
    return;
  }

  if (!['de', 'en'].includes(targetLang)) {
    res.status(400).json({
      success: false,
      error: 'Invalid targetLang. Must be "de" or "en"',
    });
    return;
  }

  try {
    const result = await translationService.translate(text, targetLang, sourceLang);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Translation error:', err);
    res.status(500).json({
      success: false,
      error: 'Translation failed',
    });
  }
});

translationRoutes.post('/batch', async (req: Request, res: Response) => {
  const { texts, targetLang } = req.body;

  if (!texts || !Array.isArray(texts) || !targetLang) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: texts (array), targetLang',
    });
    return;
  }

  try {
    const results = await translationService.translateBatch(texts, targetLang);
    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    logger.error('Batch translation error:', err);
    res.status(500).json({
      success: false,
      error: 'Batch translation failed',
    });
  }
});

translationRoutes.get('/usage', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: translationService.getUsageStats(),
  });
});
