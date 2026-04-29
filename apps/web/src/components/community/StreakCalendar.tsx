import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Calendar } from 'lucide-react';

interface StreakCalendarProps {
  contributionData: Record<string, number>; // date string -> contribution count
  currentStreak: number;
  longestStreak: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getColorForCount(count: number): string {
  if (count === 0) return 'rgba(255,255,255,0.03)';
  if (count === 1) return 'rgba(0,240,255,0.2)';
  if (count === 2) return 'rgba(0,240,255,0.4)';
  if (count <= 4) return 'rgba(0,240,255,0.6)';
  return 'rgba(0,240,255,0.9)';
}

export function StreakCalendar({ contributionData, currentStreak, longestStreak }: StreakCalendarProps) {
  const calendarData = useMemo(() => {
    const today = new Date();
    const weeks: { date: Date; count: number }[][] = [];

    // Go back ~52 weeks (1 year)
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());

    let currentWeek: { date: Date; count: number }[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      currentWeek.push({
        date: new Date(currentDate),
        count: contributionData[dateStr] || 0,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [contributionData]);

  const monthLabels = useMemo(() => {
    const labels: { month: string; weekIndex: number }[] = [];
    let lastMonth = -1;

    calendarData.forEach((week, weekIndex) => {
      const firstDay = week[0];
      if (firstDay) {
        const month = firstDay.date.getMonth();
        if (month !== lastMonth) {
          labels.push({ month: MONTHS[month], weekIndex });
          lastMonth = month;
        }
      }
    });

    return labels;
  }, [calendarData]);

  const totalContributions = useMemo(() => {
    return Object.values(contributionData).reduce((sum, count) => sum + count, 0);
  }, [contributionData]);

  return (
    <div className="glass-panel rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#00f0ff]" />
          <span className="text-sm font-mono text-gray-300">Contribution Activity</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1">
            <Flame className="h-3 w-3 text-[#ff6600]" />
            <span className="text-[#ff6600]">{currentStreak} day streak</span>
          </div>
          <div className="text-gray-500">
            Best: {longestStreak} days
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Month Labels */}
          <div className="flex mb-1 text-[9px] text-gray-500 font-mono">
            <div className="w-6" /> {/* Spacer for weekday labels */}
            <div className="flex">
              {monthLabels.map((label, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{ marginLeft: label.weekIndex * 12 }}
                >
                  {label.month}
                </div>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex gap-0.5">
            {/* Weekday Labels */}
            <div className="flex flex-col gap-0.5 text-[8px] text-gray-500 font-mono pr-1">
              {WEEKDAYS.map((day, i) => (
                <div key={day} className="h-[10px] leading-[10px]">
                  {i % 2 === 1 ? day : ''}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="flex gap-0.5">
              {calendarData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-0.5">
                  {week.map((day, dayIndex) => {
                    const dateStr = day.date.toISOString().split('T')[0];
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <motion.div
                        key={`${weekIndex}-${dayIndex}`}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: weekIndex * 0.01 + dayIndex * 0.005,
                          duration: 0.2
                        }}
                        className="w-[10px] h-[10px] rounded-sm cursor-pointer relative group"
                        style={{
                          backgroundColor: getColorForCount(day.count),
                          boxShadow: day.count > 0 ? `0 0 4px ${getColorForCount(day.count)}` : undefined,
                          border: isToday ? '1px solid #00f0ff' : undefined,
                        }}
                        title={`${day.date.toDateString()}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded bg-gray-800 text-[9px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {day.count} contribution{day.count !== 1 ? 's' : ''} on {day.date.toLocaleDateString()}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between mt-3 text-[9px] text-gray-500 font-mono">
            <span>{totalContributions} contributions in the last year</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 5].map((count) => (
                  <div
                    key={count}
                    className="w-[10px] h-[10px] rounded-sm"
                    style={{ backgroundColor: getColorForCount(count) }}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
