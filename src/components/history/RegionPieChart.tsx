import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PerspectiveRegion } from '../../types';

const REGION_COLORS: Record<PerspectiveRegion, string> = {
  usa: '#00f0ff',
  europa: '#a855f7',
  deutschland: '#06b6d4',
  nahost: '#f59e0b',
  tuerkei: '#ec4899',
  russland: '#ef4444',
  china: '#eab308',
  asien: '#f97316',
  afrika: '#10b981',
  lateinamerika: '#14b8a6',
  ozeanien: '#0ea5e9',
  kanada: '#dc2626',
  alternative: '#00ff88',
};

interface RegionData {
  region: PerspectiveRegion;
  count: number;
  label: string;
}

interface RegionPieChartProps {
  data: RegionData[];
}

export function RegionPieChart({ data }: RegionPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-gray-500 text-xs font-mono">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={96}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius={25}
          outerRadius={40}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.region} fill={REGION_COLORS[entry.region]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a2236',
            border: '1px solid rgba(0,240,255,0.3)',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono, monospace',
          }}
          formatter={(value) => [`${value} articles`, '']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
