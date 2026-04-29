import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface ActivityData {
  date: string;
  count: number;
}

interface ActivitySparklineProps {
  data: ActivityData[];
}

export function ActivitySparkline({ data }: ActivitySparklineProps) {
  if (data.length === 0) {
    return (
      <div className="h-12 flex items-center justify-center text-gray-500 text-xs font-mono">
        No activity
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#00f0ff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="count"
          stroke="#00f0ff"
          strokeWidth={2}
          fill="url(#activityGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
