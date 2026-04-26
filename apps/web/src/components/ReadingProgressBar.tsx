import { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

interface ReadingProgressBarProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  color?: string;
  height?: number;
  showPercentage?: boolean;
}

export function ReadingProgressBar({
  containerRef,
  color = 'from-blue-500 via-purple-500 to-pink-500',
  height = 3,
  showPercentage = false,
}: ReadingProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const springProgress = useSpring(0, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const updateProgress = () => {
      let scrollTop: number;
      let scrollHeight: number;
      let clientHeight: number;

      if (containerRef?.current) {
        scrollTop = containerRef.current.scrollTop;
        scrollHeight = containerRef.current.scrollHeight;
        clientHeight = containerRef.current.clientHeight;
      } else {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      }

      const totalScrollable = scrollHeight - clientHeight;
      const currentProgress = totalScrollable > 0
        ? (scrollTop / totalScrollable) * 100
        : 0;

      setProgress(Math.min(100, Math.max(0, currentProgress)));
      springProgress.set(currentProgress);
    };

    const target = containerRef?.current || window;
    target.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    return () => {
      target.removeEventListener('scroll', updateProgress);
    };
  }, [containerRef, springProgress]);

  return (
    <>
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50"
        style={{ height }}
        initial={{ opacity: 0 }}
        animate={{ opacity: progress > 0 ? 1 : 0 }}
      >
        <motion.div
          className={`h-full bg-gradient-to-r ${color}`}
          style={{
            width: `${progress}%`,
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
          }}
        />
      </motion.div>

      {/* Percentage indicator */}
      {showPercentage && progress > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50 rounded-full bg-gray-800/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white shadow-lg border border-gray-700"
        >
          {Math.round(progress)}%
        </motion.div>
      )}
    </>
  );
}
