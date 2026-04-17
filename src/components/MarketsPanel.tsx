import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Droplet, Coins, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { MarketSparkline, generateMockSparklineData } from './monitor/MarketSparkline';

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  icon: typeof DollarSign;
  color: string;
  currency: string;
  sparklineData?: number[];
}

interface MarketApiResponse {
  success: boolean;
  data: Array<{
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    currency: string;
  }>;
  timestamp: string;
}

// Icon and color configuration for each symbol
const SYMBOL_CONFIG: Record<string, { icon: typeof DollarSign; color: string }> = {
  OIL: { icon: Droplet, color: '#ff6600' },
  GOLD: { icon: Coins, color: '#ffcc00' },
  DAX: { icon: BarChart3, color: '#00f0ff' },
  SPX: { icon: DollarSign, color: '#00ff88' },
};

async function fetchMarketData(): Promise<MarketData[]> {
  const response = await fetch('/api/markets');
  if (!response.ok) {
    throw new Error('Failed to fetch market data');
  }

  const apiData: MarketApiResponse = await response.json();

  // Map API response to component data with icons, colors, and sparkline data
  return apiData.data.map((market) => {
    // Determine volatility based on symbol
    const volatility = market.symbol === 'OIL' ? 0.03 : market.symbol === 'GOLD' ? 0.015 : 0.02;

    return {
      ...market,
      icon: SYMBOL_CONFIG[market.symbol]?.icon || DollarSign,
      color: SYMBOL_CONFIG[market.symbol]?.color || '#00f0ff',
      sparklineData: generateMockSparklineData(market.price, volatility, 24),
    };
  });
}

function formatPrice(price: number, currency: string): string {
  // Use locale-appropriate formatting based on currency
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  if (currency === 'EUR') {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }

  // Default: Use de-DE formatting for points/indices (no currency symbol)
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function MarketCard({ market, index }: { market: MarketData; index: number }) {
  const Icon = market.icon;
  const isPositive = market.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'relative rounded-lg p-2',
        'bg-gradient-to-br from-gray-800/50 to-gray-900/50',
        'border transition-all duration-200',
        isPositive
          ? 'border-[#00ff88]/20 hover:border-[#00ff88]/40'
          : 'border-[#ff0044]/20 hover:border-[#ff0044]/40'
      )}
    >
      {/* Header: Icon & Symbol */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div
          className="h-6 w-6 rounded flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: `${market.color}15`,
            borderColor: `${market.color}30`,
            borderWidth: '1px',
          }}
        >
          <Icon className="h-3 w-3" style={{ color: market.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
            {market.symbol}
          </div>
        </div>
        {/* Change Indicator */}
        <div className={cn('flex-shrink-0', isPositive ? 'text-[#00ff88]' : 'text-[#ff0044]')}>
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
        </div>
      </div>

      {/* Price & Sparkline Row */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-sm font-mono font-bold text-white">
          {formatPrice(market.price, market.currency)}
        </div>

        {/* 24h Sparkline */}
        {market.sparklineData && (
          <MarketSparkline
            data={market.sparklineData}
            color={isPositive ? '#00ff88' : '#ff0044'}
            width={50}
            height={18}
          />
        )}
      </div>

      {/* Change */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-[10px] font-mono font-bold',
            isPositive ? 'text-[#00ff88]' : 'text-[#ff0044]'
          )}
        >
          {isPositive ? '+' : ''}
          {market.changePercent.toFixed(2)}%
        </span>
        <span className="text-[8px] font-mono text-gray-500">24h</span>
      </div>

      {/* Glow Effect */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${market.color}10, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}

export function MarketsPanel() {
  const { data: markets, isLoading } = useQuery({
    queryKey: ['markets'],
    queryFn: fetchMarketData,
    refetchInterval: 60 * 1000, // Refresh every 60 seconds
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });

  if (isLoading || !markets) {
    return (
      <div className="glass-panel rounded-xl p-5 border border-[#00f0ff]/20">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-32 bg-gray-700 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-xl p-3 border border-[#00f0ff]/20"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
          <BarChart3 className="h-3.5 w-3.5 text-[#00f0ff]" />
        </div>
        <div>
          <h3 className="text-xs font-mono font-semibold text-white uppercase tracking-wider">
            Live Markets
          </h3>
        </div>
      </div>

      {/* Markets Grid - Compact 2-column */}
      <div className="grid grid-cols-2 gap-2">
        {markets.map((market, index) => (
          <MarketCard key={market.symbol} market={market} index={index} />
        ))}
      </div>
    </motion.div>
  );
}
