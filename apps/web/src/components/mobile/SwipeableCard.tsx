import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

interface SwipeableCardProps {
  children: React.ReactNode;
  onBookmark: () => void;
  isBookmarked: boolean;
}

/**
 * SwipeableCard - Wrapper for swipe-to-bookmark gesture on mobile
 *
 * Per D-61: Swipe right on card to bookmark (spring animation reveal)
 * Per D-62: No swipe-left action
 * Per RESEARCH.md: 80px threshold, spring animation with damping: 20, stiffness: 180
 */
export function SwipeableCard({ children, onBookmark, isBookmarked }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 100], [0, 1]);
  const { lightTap } = useHapticFeedback();

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Threshold: 80px swipe right (Claude's discretion from RESEARCH.md)
    if (info.offset.x > 80 && !isBookmarked) {
      onBookmark();
      lightTap(); // Haptic feedback per D-61
    }
    // Snap back to original position
    x.set(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Bookmark reveal background */}
      <motion.div
        className="absolute inset-y-0 left-0 flex items-center justify-start px-6 bg-[#00f0ff]/10 rounded-lg"
        style={{ opacity }}
      >
        <Bookmark
          className="h-6 w-6 text-[#00f0ff]"
          fill={isBookmarked ? 'currentColor' : 'none'}
        />
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 150 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 180,
          // @ts-expect-error - Framer Motion supports reducedMotion but types are incomplete
          reducedMotion: 'user', // Accessibility per RESEARCH.md line 731
        }}
        className="relative bg-inherit"
      >
        {children}
      </motion.div>
    </div>
  );
}
