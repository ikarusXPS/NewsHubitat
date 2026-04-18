import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface MarketSparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}

export function MarketSparkline({
  data,
  color,
  width = 60,
  height = 20,
  showArea = true,
}: MarketSparklineProps) {
  const { path, areaPath } = useMemo(() => {
    if (data.length < 2) {
      return { path: '', areaPath: '', isPositive: true };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const effectiveWidth = width - padding * 2;
    const effectiveHeight = height - padding * 2;

    // Calculate points
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * effectiveWidth;
      const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
      return { x, y };
    });

    // Build path
    const linePath = points
      .map((point, i) => (i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
      .join(' ');

    // Build area path
    const area = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    // Determine if trend is positive
    const first = data[0];
    const last = data[data.length - 1];
    const positive = last >= first;

    return { path: linePath, areaPath: area, isPositive: positive };
  }, [data, width, height]);

  if (data.length < 2) {
    return <div style={{ width, height }} className="bg-gray-800/30 rounded" />;
  }

  const strokeColor = color;
  const fillColor = color;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {/* Area fill */}
      {showArea && (
        <motion.path
          d={areaPath}
          fill={fillColor}
          fillOpacity={0.1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Line */}
      <motion.path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />

      {/* End dot */}
      <motion.circle
        cx={data.length > 0 ? width - 2 : 0}
        cy={
          data.length > 0
            ? 2 +
              (height - 4) -
              ((data[data.length - 1] - Math.min(...data)) /
                (Math.max(...data) - Math.min(...data) || 1)) *
                (height - 4)
            : height / 2
        }
        r={2}
        fill={strokeColor}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.8 }}
      />
    </svg>
  );
}

// Generate mock 24h data for demonstration
export function generateMockSparklineData(
  basePrice: number,
  volatility: number = 0.02,
  points: number = 24
): number[] {
  const data: number[] = [];
  let currentPrice = basePrice;

  for (let i = 0; i < points; i++) {
    // Random walk with slight mean reversion
    const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
    const meanReversion = (basePrice - currentPrice) * 0.1;
    currentPrice = currentPrice + change + meanReversion;
    data.push(currentPrice);
  }

  return data;
}
