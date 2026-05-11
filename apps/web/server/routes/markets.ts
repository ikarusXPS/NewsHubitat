import { Router } from 'express';
import { MarketDataService } from '../services/marketDataService.js';
import logger from '../utils/logger';

const router = Router();
const marketService = MarketDataService.getInstance();

// GET /api/markets - Fetch current market data
router.get('/', async (req, res) => {
  try {
    const marketData = await marketService.getMarketData();

    res.json({
      success: true,
      data: marketData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('Markets API error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
    });
  }
});

export default router;
