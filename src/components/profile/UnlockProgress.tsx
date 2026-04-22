import { Lock } from 'lucide-react';
import type { PerspectiveRegion } from '../../types';

interface UnlockProgressProps {
  region: PerspectiveRegion;
  articlesRead: number;
  required: number;
  label: string;
}

const REGION_COLORS: Record<PerspectiveRegion, string> = {
  usa: '#00f0ff',
  europa: '#3b82f6',
  deutschland: '#00f0ff',
  nahost: '#ff6600',
  tuerkei: '#ff0044',
  russland: '#bf00ff',
  china: '#ffee00',
  asien: '#f59e0b',
  afrika: '#10b981',
  lateinamerika: '#ec4899',
  ozeanien: '#6366f1',
  kanada: '#ef4444',
  alternative: '#00ff88',
};

export function UnlockProgress({ region, articlesRead, required, label }: UnlockProgressProps) {
  const progress = Math.min(100, (articlesRead / required) * 100);
  const color = REGION_COLORS[region];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
      <Lock className="h-4 w-4 text-gray-500" />
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-400">{label}</span>
          <span className="text-xs font-mono text-gray-500">
            {articlesRead}/{required}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}
