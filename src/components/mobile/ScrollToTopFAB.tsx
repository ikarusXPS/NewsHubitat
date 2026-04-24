import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';

/**
 * ScrollToTopFAB - Floating action button for scroll-to-top
 *
 * Per D-31: Positioned above bottom nav (bottom-nav-height + 16px gap)
 * Per D-32: Appears after 500px scroll
 * Per PATTERNS.md: Glass panel styling with cyan border
 */
export function ScrollToTopFAB() {
  const [isVisible, setIsVisible] = useState(false);
  const { lightTap } = useHapticFeedback();

  useEffect(() => {
    const handleScroll = () => {
      // D-32: 500px threshold
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    lightTap();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          className="fixed z-40 md:hidden glass-panel rounded-full p-3 border border-[#00f0ff]/20 shadow-lg shadow-[#00f0ff]/10"
          style={{
            bottom: 'calc(var(--bottom-nav-height) + 16px)',
            right: '16px',
          }}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5 text-[#00f0ff]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
