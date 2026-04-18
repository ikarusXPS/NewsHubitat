import { motion } from 'framer-motion';

interface TensionGaugeProps {
  value: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md' | 'lg';
}

const LEVEL_COLORS = {
  low: '#00ff88',
  medium: '#ffcc00',
  high: '#ff6600',
  critical: '#ff0044',
};

export function TensionGauge({ value, level, size = 'md' }: TensionGaugeProps) {
  const color = LEVEL_COLORS[level];

  // Sizes
  const sizes = {
    sm: { width: 100, height: 60, strokeWidth: 6, fontSize: 16 },
    md: { width: 140, height: 80, strokeWidth: 8, fontSize: 22 },
    lg: { width: 180, height: 100, strokeWidth: 10, fontSize: 28 },
  };

  const { width, height, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const centerX = width / 2;
  const centerY = height - 10;

  // Arc calculations (180 degree arc - semicircle)
  const startAngle = Math.PI; // 180 degrees (left)
  const endAngle = 0; // 0 degrees (right)
  const angleRange = Math.PI; // 180 degrees total

  // Calculate the arc path
  const arcStart = {
    x: centerX + radius * Math.cos(startAngle),
    y: centerY - radius * Math.sin(startAngle),
  };

  const arcEnd = {
    x: centerX + radius * Math.cos(endAngle),
    y: centerY - radius * Math.sin(endAngle),
  };

  // Background arc path
  const backgroundPath = `
    M ${arcStart.x} ${arcStart.y}
    A ${radius} ${radius} 0 0 1 ${arcEnd.x} ${arcEnd.y}
  `;

  // Value arc path (partial)
  const valueAngle = startAngle - (value / 100) * angleRange;
  const valueEnd = {
    x: centerX + radius * Math.cos(valueAngle),
    y: centerY - radius * Math.sin(valueAngle),
  };

  const valuePath = `
    M ${arcStart.x} ${arcStart.y}
    A ${radius} ${radius} 0 0 1 ${valueEnd.x} ${valueEnd.y}
  `;

  // Needle position
  const needleLength = radius - 8;
  const needleEnd = {
    x: centerX + needleLength * Math.cos(valueAngle),
    y: centerY - needleLength * Math.sin(valueAngle),
  };

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="33%" stopColor="#ffcc00" />
            <stop offset="66%" stopColor="#ff6600" />
            <stop offset="100%" stopColor="#ff0044" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background arc (gray) */}
        <path
          d={backgroundPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored gradient background arc */}
        <path
          d={backgroundPath}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />

        {/* Value arc */}
        <motion.path
          d={valuePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const tickAngle = startAngle - (tick / 100) * angleRange;
          const innerRadius = radius - strokeWidth / 2 - 4;
          const outerRadius = radius - strokeWidth / 2 - 10;
          const tickStart = {
            x: centerX + innerRadius * Math.cos(tickAngle),
            y: centerY - innerRadius * Math.sin(tickAngle),
          };
          const tickEnd = {
            x: centerX + outerRadius * Math.cos(tickAngle),
            y: centerY - outerRadius * Math.sin(tickAngle),
          };
          return (
            <line
              key={tick}
              x1={tickStart.x}
              y1={tickStart.y}
              x2={tickEnd.x}
              y2={tickEnd.y}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth={1}
            />
          );
        })}

        {/* Needle */}
        <motion.line
          x1={centerX}
          y1={centerY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ x2: centerX - needleLength, y2: centerY }}
          animate={{ x2: needleEnd.x, y2: needleEnd.y }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />

        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r={4}
          fill={color}
          filter="url(#glow)"
        />
      </svg>

      {/* Value display */}
      <motion.div
        className="absolute inset-x-0 text-center"
        style={{ bottom: 0 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <span
          className="font-mono font-bold"
          style={{ color, fontSize, textShadow: `0 0 10px ${color}` }}
        >
          {Math.round(value)}
        </span>
      </motion.div>
    </div>
  );
}
