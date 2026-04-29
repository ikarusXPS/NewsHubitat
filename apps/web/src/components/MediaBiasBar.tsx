import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { cn } from '../lib/utils';
import type { NewsArticle } from '../types';

interface MediaBiasBarProps {
  articles: NewsArticle[];
  className?: string;
}

export function MediaBiasBar({ articles, className }: MediaBiasBarProps) {
  const biasStats = useMemo(() => {
    if (articles.length === 0) {
      return { left: 0, center: 0, right: 0 };
    }

    let leftCount = 0;
    let centerCount = 0;
    let rightCount = 0;

    for (const article of articles) {
      const bias = article.source.bias.political;

      // Classify bias: left (-1 to -0.2), center (-0.2 to 0.2), right (0.2 to 1)
      if (bias < -0.2) {
        leftCount++;
      } else if (bias > 0.2) {
        rightCount++;
      } else {
        centerCount++;
      }
    }

    const total = articles.length;
    return {
      left: Math.round((leftCount / total) * 100),
      center: Math.round((centerCount / total) * 100),
      right: Math.round((rightCount / total) * 100),
      leftCount,
      centerCount,
      rightCount,
    };
  }, [articles]);

  return (
    <div className={cn('glass-panel rounded-xl p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="signal-label flex items-center gap-2">
          <span>Media Bias Distribution</span>
          <div className="group relative">
            <Info className="h-3 w-3 text-gray-500 cursor-help" />
            <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300 shadow-xl">
              Shows the political bias distribution of sources in your current view.
              Based on source political lean (-1 left to +1 right).
            </div>
          </div>
        </h3>
        <span className="text-xs font-mono text-gray-500">
          {articles.length} sources
        </span>
      </div>

      {/* Bias Bar */}
      <div className="h-8 rounded-lg overflow-hidden flex border border-gray-700">
        {biasStats.left > 0 && (
          <div
            className="h-full bg-[#0088ff] flex items-center justify-center text-xs font-mono font-bold text-white transition-all hover:brightness-110"
            style={{ width: `${biasStats.left}%`, boxShadow: 'inset 0 0 10px rgba(0,136,255,0.3)' }}
            title={`Left: ${biasStats.leftCount} sources (${biasStats.left}%)`}
          >
            {biasStats.left >= 15 && <span>L {biasStats.left}%</span>}
          </div>
        )}
        {biasStats.center > 0 && (
          <div
            className="h-full bg-[#bf00ff] flex items-center justify-center text-xs font-mono font-bold text-white transition-all hover:brightness-110"
            style={{ width: `${biasStats.center}%`, boxShadow: 'inset 0 0 10px rgba(191,0,255,0.3)' }}
            title={`Center: ${biasStats.centerCount} sources (${biasStats.center}%)`}
          >
            {biasStats.center >= 15 && <span>C {biasStats.center}%</span>}
          </div>
        )}
        {biasStats.right > 0 && (
          <div
            className="h-full bg-[#ff0044] flex items-center justify-center text-xs font-mono font-bold text-white transition-all hover:brightness-110"
            style={{ width: `${biasStats.right}%`, boxShadow: 'inset 0 0 10px rgba(255,0,68,0.3)' }}
            title={`Right: ${biasStats.rightCount} sources (${biasStats.right}%)`}
          >
            {biasStats.right >= 15 && <span>R {biasStats.right}%</span>}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#0088ff]" style={{ boxShadow: '0 0 4px #0088ff' }} />
            <span className="text-gray-400">Left {biasStats.left}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#bf00ff]" style={{ boxShadow: '0 0 4px #bf00ff' }} />
            <span className="text-gray-400">Center {biasStats.center}%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ff0044]" style={{ boxShadow: '0 0 4px #ff0044' }} />
            <span className="text-gray-400">Right {biasStats.right}%</span>
          </div>
        </div>
      </div>

      {/* Bias Balance Indicator */}
      <div className="mt-3 pt-3 border-t border-gray-800">
        {(() => {
          // Calculate balance score deterministically
          // Use raw counts instead of rounded percentages to avoid rounding issues
          const leftRatio = biasStats.leftCount ?? 0;
          const rightRatio = biasStats.rightCount ?? 0;
          const centerRatio = biasStats.centerCount ?? 0;
          const total = leftRatio + rightRatio + centerRatio;

          if (total === 0) return null;

          // Imbalance = difference between left and right, normalized
          const imbalance = Math.abs(leftRatio - rightRatio) / total;
          // Center weight reduces perceived imbalance
          const centerWeight = centerRatio / total;

          // Score: 0 = perfectly balanced, 1 = completely one-sided
          const balanceScore = Math.max(0, imbalance - centerWeight * 0.5);

          let label: string;
          let colorClass: string;

          if (balanceScore <= 0.15) {
            label = 'BALANCED';
            colorClass = 'text-[#00ff88]';
          } else if (balanceScore <= 0.35) {
            label = 'MODERATE';
            colorClass = 'text-[#ffee00]';
          } else if (leftRatio > rightRatio) {
            label = 'LEANS LEFT';
            colorClass = 'text-[#ff6600]';
          } else {
            label = 'LEANS RIGHT';
            colorClass = 'text-[#ff6600]';
          }

          return (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500 font-mono uppercase">Balance Score</span>
              <span className={cn('font-mono font-bold', colorClass)}>
                {label}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
