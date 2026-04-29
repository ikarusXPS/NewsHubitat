/**
 * Unit tests for MarketDataService
 * Tests Yahoo Finance API integration, singleton pattern, cache TTL, and fallback paths
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Hoist the mock function so it's available during vi.mock hoisting
const { mockQuote } = vi.hoisted(() => ({
  mockQuote: vi.fn(),
}));

// Mock yahoo-finance2 at module level per D-01
vi.mock('yahoo-finance2', () => {
  // Return a class constructor that creates an instance with quote method
  return {
    default: class MockYahooFinance {
      quote = mockQuote;
    },
  };
});

import { MarketDataService } from './marketDataService';

describe('MarketDataService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T12:00:00Z'));
    mockQuote.mockReset();
  });

  afterEach(() => {
    // Reset singleton between tests per D-13
    (MarketDataService as unknown as { instance: MarketDataService | null }).instance = null;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('singleton pattern', () => {
    it('getInstance() returns same instance', () => {
      const instance1 = MarketDataService.getInstance();
      const instance2 = MarketDataService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('getInstance() creates new instance after reset', () => {
      const instance1 = MarketDataService.getInstance();
      (MarketDataService as unknown as { instance: MarketDataService | null }).instance = null;
      const instance2 = MarketDataService.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('getMarketData', () => {
    describe('success path', () => {
      it('returns array of MarketQuote objects with correct structure', async () => {
        // Mock successful quote responses for all 4 symbols
        mockQuote.mockResolvedValue({
          regularMarketPrice: 78.5,
          regularMarketChange: 1.25,
          regularMarketChangePercent: 1.62,
        });

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        expect(result).toHaveLength(4);
        expect(result[0]).toMatchObject({
          symbol: expect.any(String),
          name: expect.any(String),
          price: expect.any(Number),
          change: expect.any(Number),
          changePercent: expect.any(Number),
          currency: expect.any(String),
        });
      });

      it('formats symbols correctly (CL=F -> OIL, GC=F -> GOLD, etc.)', async () => {
        // Mock returns for each symbol
        mockQuote.mockResolvedValue({
          regularMarketPrice: 100,
          regularMarketChange: 1,
          regularMarketChangePercent: 1,
        });

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        const symbols = result.map((q) => q.symbol);
        expect(symbols).toContain('OIL');
        expect(symbols).toContain('GOLD');
        expect(symbols).toContain('DAX');
        expect(symbols).toContain('SPX');
      });

      it('rounds price, change, changePercent to 2 decimal places', async () => {
        mockQuote.mockResolvedValue({
          regularMarketPrice: 78.5678,
          regularMarketChange: 1.2567,
          regularMarketChangePercent: 1.6234,
        });

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        // Check first result (OIL)
        const oilQuote = result.find((q) => q.symbol === 'OIL');
        expect(oilQuote?.price).toBe(78.57);
        expect(oilQuote?.change).toBe(1.26);
        expect(oilQuote?.changePercent).toBe(1.62);
      });

      it('fetches 4 symbols: CL=F, GC=F, ^GDAXI, ^GSPC', async () => {
        mockQuote.mockResolvedValue({
          regularMarketPrice: 100,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
        });

        const service = MarketDataService.getInstance();
        await service.getMarketData();

        expect(mockQuote).toHaveBeenCalledTimes(4);
        expect(mockQuote).toHaveBeenCalledWith('CL=F');
        expect(mockQuote).toHaveBeenCalledWith('GC=F');
        expect(mockQuote).toHaveBeenCalledWith('^GDAXI');
        expect(mockQuote).toHaveBeenCalledWith('^GSPC');
      });

      it('uses alternative price fields when regularMarketPrice unavailable', async () => {
        // First call: only price field available
        mockQuote.mockResolvedValueOnce({
          price: 85.0,
          priceChange: 2.0,
          percentChange: 2.5,
        });
        // Rest use regular fields
        mockQuote.mockResolvedValue({
          regularMarketPrice: 100,
          regularMarketChange: 1,
          regularMarketChangePercent: 1,
        });

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        const oilQuote = result.find((q) => q.symbol === 'OIL');
        expect(oilQuote?.price).toBe(85.0);
        expect(oilQuote?.change).toBe(2.0);
        expect(oilQuote?.changePercent).toBe(2.5);
      });

      it('uses preMarketPrice when other price fields unavailable', async () => {
        mockQuote.mockResolvedValueOnce({
          preMarketPrice: 79.0,
        });
        mockQuote.mockResolvedValue({
          regularMarketPrice: 100,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
        });

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        const oilQuote = result.find((q) => q.symbol === 'OIL');
        expect(oilQuote?.price).toBe(79.0);
      });

      it('uses postMarketPrice as last resort', async () => {
        mockQuote.mockResolvedValueOnce({
          postMarketPrice: 77.5,
        });
        mockQuote.mockResolvedValue({
          regularMarketPrice: 100,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
        });

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        const oilQuote = result.find((q) => q.symbol === 'OIL');
        expect(oilQuote?.price).toBe(77.5);
      });

      it('defaults to 0 when no price fields available', async () => {
        mockQuote.mockResolvedValueOnce({});
        mockQuote.mockResolvedValue({
          regularMarketPrice: 100,
          regularMarketChange: 0,
          regularMarketChangePercent: 0,
        });

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        const oilQuote = result.find((q) => q.symbol === 'OIL');
        expect(oilQuote?.price).toBe(0);
        expect(oilQuote?.change).toBe(0);
        expect(oilQuote?.changePercent).toBe(0);
      });
    });

    describe('cache behavior', () => {
      it('returns cached data within 60 seconds (no API call)', async () => {
        mockQuote.mockResolvedValue({
          regularMarketPrice: 78.5,
          regularMarketChange: 1.25,
          regularMarketChangePercent: 1.62,
        });

        const service = MarketDataService.getInstance();

        // First call - fetches from API
        const result1 = await service.getMarketData();
        expect(mockQuote).toHaveBeenCalledTimes(4);

        // Advance 30 seconds - within TTL
        vi.advanceTimersByTime(30 * 1000);
        mockQuote.mockClear();

        // Second call - should use cache
        const result2 = await service.getMarketData();
        expect(mockQuote).not.toHaveBeenCalled();
        expect(result2).toEqual(result1);
      });

      it('fetches fresh data after 60 second TTL expires', async () => {
        mockQuote.mockResolvedValue({
          regularMarketPrice: 78.5,
          regularMarketChange: 1.25,
          regularMarketChangePercent: 1.62,
        });

        const service = MarketDataService.getInstance();

        // First call
        await service.getMarketData();
        expect(mockQuote).toHaveBeenCalledTimes(4);

        // Advance past TTL (60 seconds)
        vi.advanceTimersByTime(61 * 1000);
        mockQuote.mockClear();

        // Mock different response
        mockQuote.mockResolvedValue({
          regularMarketPrice: 80.0,
          regularMarketChange: 2.0,
          regularMarketChangePercent: 2.5,
        });

        // Second call - should fetch fresh data
        const result = await service.getMarketData();
        expect(mockQuote).toHaveBeenCalledTimes(4);
        expect(result[0].price).toBe(80.0);
      });

      it('updates cache with fresh data after TTL expires', async () => {
        const service = MarketDataService.getInstance();

        // First call
        mockQuote.mockResolvedValue({
          regularMarketPrice: 78.5,
          regularMarketChange: 1.25,
          regularMarketChangePercent: 1.62,
        });
        await service.getMarketData();

        // Advance past TTL
        vi.advanceTimersByTime(61 * 1000);
        mockQuote.mockClear();

        // Second call with new data
        mockQuote.mockResolvedValue({
          regularMarketPrice: 85.0,
          regularMarketChange: 3.0,
          regularMarketChangePercent: 3.6,
        });
        await service.getMarketData();

        // Third call within TTL - should return updated cache
        vi.advanceTimersByTime(30 * 1000);
        mockQuote.mockClear();
        const result = await service.getMarketData();

        expect(mockQuote).not.toHaveBeenCalled();
        expect(result[0].price).toBe(85.0);
      });
    });

    describe('fallback paths', () => {
      it('uses fallback for single symbol failure (Path 1)', async () => {
        // First 3 symbols succeed, last fails
        mockQuote
          .mockResolvedValueOnce({
            regularMarketPrice: 78.5,
            regularMarketChange: 1.25,
            regularMarketChangePercent: 1.62,
          })
          .mockResolvedValueOnce({
            regularMarketPrice: 2650.0,
            regularMarketChange: 15.0,
            regularMarketChangePercent: 0.57,
          })
          .mockResolvedValueOnce({
            regularMarketPrice: 22800.0,
            regularMarketChange: 100.0,
            regularMarketChangePercent: 0.44,
          })
          .mockRejectedValueOnce(new Error('API timeout'));

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        // Should have 4 results - 3 real + 1 fallback
        expect(result).toHaveLength(4);

        // SPX should be fallback data (last symbol failed)
        const spxQuote = result.find((q) => q.symbol === 'SPX');
        expect(spxQuote).toMatchObject({
          symbol: 'SPX',
          name: 'S&P 500',
          price: 6100.0,
          change: 0,
          changePercent: 0,
          currency: 'USD',
        });

        // OIL should have real data
        const oilQuote = result.find((q) => q.symbol === 'OIL');
        expect(oilQuote?.price).toBe(78.5);
      });

      it('returns per-symbol fallback when all API calls fail (graceful degradation)', async () => {
        const service = MarketDataService.getInstance();

        // First call succeeds - populate cache
        mockQuote.mockResolvedValue({
          regularMarketPrice: 78.5,
          regularMarketChange: 1.25,
          regularMarketChangePercent: 1.62,
        });
        await service.getMarketData();

        // Advance past TTL
        vi.advanceTimersByTime(61 * 1000);
        mockQuote.mockClear();

        // All API calls fail - each symbol falls back to per-symbol fallback
        mockQuote.mockImplementation(() => {
          throw new Error('Network error');
        });

        // Should return fallback data for all symbols (graceful degradation)
        const result = await service.getMarketData();
        expect(result).toHaveLength(4);

        // All have fallback values (change/changePercent = 0)
        result.forEach((quote) => {
          expect(quote.change).toBe(0);
          expect(quote.changePercent).toBe(0);
        });
      });

      it('returns fallback data when no cache and API fails (Path 3)', async () => {
        const service = MarketDataService.getInstance();

        // All API calls fail and no prior cache
        mockQuote.mockRejectedValue(new Error('Service unavailable'));

        const result = await service.getMarketData();

        // Should return getFallbackData() values
        expect(result).toHaveLength(4);
        expect(result).toContainEqual({
          symbol: 'OIL',
          name: 'Crude Oil',
          price: 78.5,
          change: 0,
          changePercent: 0,
          currency: 'USD',
        });
        expect(result).toContainEqual({
          symbol: 'GOLD',
          name: 'Gold',
          price: 2650.0,
          change: 0,
          changePercent: 0,
          currency: 'USD',
        });
        expect(result).toContainEqual({
          symbol: 'DAX',
          name: 'DAX 40',
          price: 22800.0,
          change: 0,
          changePercent: 0,
          currency: 'EUR',
        });
        expect(result).toContainEqual({
          symbol: 'SPX',
          name: 'S&P 500',
          price: 6100.0,
          change: 0,
          changePercent: 0,
          currency: 'USD',
        });
      });

      it('uses fallback for middle symbol failure', async () => {
        // OIL succeeds, GOLD fails, DAX and SPX succeed
        mockQuote
          .mockResolvedValueOnce({
            regularMarketPrice: 78.5,
            regularMarketChange: 1.25,
            regularMarketChangePercent: 1.62,
          })
          .mockRejectedValueOnce(new Error('API error for GOLD'))
          .mockResolvedValueOnce({
            regularMarketPrice: 22800.0,
            regularMarketChange: 100.0,
            regularMarketChangePercent: 0.44,
          })
          .mockResolvedValueOnce({
            regularMarketPrice: 6100.0,
            regularMarketChange: 50.0,
            regularMarketChangePercent: 0.83,
          });

        const service = MarketDataService.getInstance();
        const result = await service.getMarketData();

        expect(result).toHaveLength(4);

        // GOLD should be fallback
        const goldQuote = result.find((q) => q.symbol === 'GOLD');
        expect(goldQuote).toMatchObject({
          symbol: 'GOLD',
          price: 2650.0,
          change: 0,
          changePercent: 0,
        });

        // OIL should have real data
        const oilQuote = result.find((q) => q.symbol === 'OIL');
        expect(oilQuote?.price).toBe(78.5);
      });
    });
  });

  describe('clearCache', () => {
    it('clears internal cache Map', async () => {
      mockQuote.mockResolvedValue({
        regularMarketPrice: 78.5,
        regularMarketChange: 1.25,
        regularMarketChangePercent: 1.62,
      });

      const service = MarketDataService.getInstance();

      // First call - populates cache
      await service.getMarketData();
      expect(mockQuote).toHaveBeenCalledTimes(4);

      // Clear cache
      service.clearCache();
      mockQuote.mockClear();

      // Next call should fetch fresh data
      await service.getMarketData();
      expect(mockQuote).toHaveBeenCalledTimes(4);
    });

    it('forces API call after clearCache even within TTL', async () => {
      mockQuote.mockResolvedValue({
        regularMarketPrice: 78.5,
        regularMarketChange: 1.25,
        regularMarketChangePercent: 1.62,
      });

      const service = MarketDataService.getInstance();

      // First call
      await service.getMarketData();

      // Advance only 10 seconds - well within TTL
      vi.advanceTimersByTime(10 * 1000);
      mockQuote.mockClear();

      // Clear cache
      service.clearCache();

      // Should fetch fresh data despite being within TTL
      await service.getMarketData();
      expect(mockQuote).toHaveBeenCalledTimes(4);
    });
  });
});
