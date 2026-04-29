/**
 * AI Personas API Routes
 */

import { Router, Request } from 'express';
import { PersonaService } from '../services/personaService';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  userId?: string;
}

const router = Router();
const personaService = PersonaService.getInstance();

/**
 * GET /api/personas
 * Get all available personas
 */
router.get('/', (req, res) => {
  try {
    const personas = personaService.getPublicPersonas();
    res.json({
      success: true,
      data: personas,
    });
  } catch (err) {
    logger.error('Error fetching personas:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch personas' });
  }
});

/**
 * GET /api/personas/:id
 * Get a specific persona
 */
router.get('/:id', (req, res) => {
  try {
    const persona = personaService.getPersona(req.params.id);
    if (!persona) {
      return res.status(404).json({ success: false, error: 'Persona not found' });
    }
    res.json({ success: true, data: persona });
  } catch (err) {
    logger.error('Error fetching persona:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch persona' });
  }
});

/**
 * POST /api/personas/suggest
 * Get persona suggestion based on question
 */
router.post('/suggest', (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, error: 'Question required' });
    }

    const suggested = personaService.suggestPersona(question);
    res.json({ success: true, data: suggested });
  } catch (err) {
    logger.error('Error suggesting persona:', err);
    res.status(500).json({ success: false, error: 'Failed to suggest persona' });
  }
});

/**
 * POST /api/personas/:id/analyze
 * Analyze with specific persona
 */
router.post('/:id/analyze', async (req, res) => {
  try {
    const { question, context } = req.body;
    if (!question) {
      return res.status(400).json({ success: false, error: 'Question required' });
    }

    const result = await personaService.analyzeWithPersona(
      req.params.id,
      question,
      context || ''
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    logger.error('Error analyzing with persona:', err);
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
});

/**
 * GET /api/personas/user/active
 * Get user's active persona (requires auth)
 */
router.get('/user/active', (req, res) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = (req as AuthenticatedRequest).userId || 'anonymous';
    const persona = personaService.getUserActivePersona(userId);
    res.json({ success: true, data: persona });
  } catch (err) {
    logger.error('Error fetching user persona:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch user persona' });
  }
});

/**
 * POST /api/personas/user/active
 * Set user's active persona (requires auth)
 */
router.post('/user/active', (req, res) => {
  try {
    const { personaId } = req.body;
    if (!personaId) {
      return res.status(400).json({ success: false, error: 'personaId required' });
    }

    // TODO: Get userId from auth middleware
    const userId = (req as AuthenticatedRequest).userId || 'anonymous';
    const success = personaService.setUserActivePersona(userId, personaId);

    if (!success) {
      return res.status(404).json({ success: false, error: 'Persona not found' });
    }

    res.json({ success: true, data: { personaId } });
  } catch (err) {
    logger.error('Error setting user persona:', err);
    res.status(500).json({ success: false, error: 'Failed to set user persona' });
  }
});

export default router;
