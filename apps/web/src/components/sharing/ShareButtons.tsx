import { useState } from 'react';
import { Share2, MessageCircle, Copy, Check, Globe, Send, AtSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useShareClick, type ShareUrls } from '../../hooks/useShare';
import { logger } from '../../lib/logger';

interface ShareButtonsProps {
  shareCode: string;
  title: string;
  urls: ShareUrls;
  className?: string;
}

// Platform colors per D-03 (using generic icons - social brand icons not in lucide-react)
const PLATFORM_CONFIG = {
  twitter: {
    icon: AtSign, // X/Twitter
    color: '#1DA1F2',
    hoverClass: 'hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]',
  },
  linkedin: {
    icon: Send, // LinkedIn
    color: '#0A66C2',
    hoverClass: 'hover:bg-[#0A66C2]/20 hover:text-[#0A66C2]',
  },
  whatsapp: {
    icon: MessageCircle,
    color: '#25D366',
    hoverClass: 'hover:bg-[#25D366]/20 hover:text-[#25D366]',
  },
  facebook: {
    icon: Globe, // Facebook
    color: '#1877F2',
    hoverClass: 'hover:bg-[#1877F2]/20 hover:text-[#1877F2]',
  },
} as const;

type Platform = keyof typeof PLATFORM_CONFIG;

export function ShareButtons({ shareCode, title, urls, className }: ShareButtonsProps) {
  const { t } = useTranslation('share');
  const isMobile = useIsMobile();
  const trackClick = useShareClick();
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  // Check Web Share API availability (must be in secure context)
  const canUseNativeShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    isMobile;

  // Handle native share (mobile) per D-07
  const handleNativeShare = async () => {
    if (!navigator.share) {
      setShowFallback(true);
      return;
    }

    try {
      await navigator.share({
        title,
        url: urls.direct,
      });
      // Track successful native share
      trackClick.mutate({ shareCode, platform: 'native' });
    } catch (err) {
      // AbortError = user cancelled, not an error
      if ((err as Error).name !== 'AbortError') {
        setShowFallback(true);
      }
    }
  };

  // Handle platform click (desktop or fallback) per D-03
  const handlePlatformClick = (platform: Platform) => {
    // Fire-and-forget tracking (don't await)
    trackClick.mutate({ shareCode, platform });
    // Open immediately
    window.open(urls[platform], '_blank', 'noopener,noreferrer');
  };

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(urls.direct);
      setCopied(true);
      trackClick.mutate({ shareCode, platform: 'copy' });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  };

  // Mobile: single share button (D-07) unless fallback needed
  if (canUseNativeShare && !showFallback) {
    return (
      <motion.button
        onClick={handleNativeShare}
        className={cn(
          'flex items-center gap-2 rounded-lg bg-gray-700/50 px-4 py-2 text-gray-300',
          'hover:bg-gray-600/50 transition-colors min-h-[44px]',
          className
        )}
        whileTap={{ scale: 0.95 }}
        aria-label={t('buttons.share')}
      >
        <Share2 className="h-4 w-4" />
        <span className="text-sm font-mono">{t('buttons.share')}</span>
      </motion.button>
    );
  }

  // Desktop or mobile fallback: icon row (D-03, D-08)
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {(Object.entries(PLATFORM_CONFIG) as [Platform, typeof PLATFORM_CONFIG[Platform]][]).map(
        ([platform, { icon: Icon, hoverClass }]) => (
          <motion.button
            key={platform}
            onClick={() => handlePlatformClick(platform)}
            className={cn(
              'rounded-lg p-2 text-gray-400 transition-all',
              'focus:ring-2 focus:ring-[#00f0ff] focus:ring-offset-2 focus:ring-offset-gray-900',
              hoverClass
            )}
            title={t(`platforms.${platform}`)}
            aria-label={t(`platforms.${platform}`)}
            whileTap={{ scale: 0.95 }}
          >
            <Icon className="h-4 w-4" />
          </motion.button>
        )
      )}

      {/* Copy link button */}
      <motion.button
        onClick={handleCopyLink}
        className={cn(
          'rounded-lg p-2 text-gray-400 transition-all',
          'hover:bg-gray-700/50 hover:text-white',
          'focus:ring-2 focus:ring-[#00f0ff] focus:ring-offset-2 focus:ring-offset-gray-900'
        )}
        title={copied ? t('buttons.copied') : t('buttons.copyLink')}
        aria-label={copied ? t('buttons.copied') : t('buttons.copyLink')}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="h-4 w-4 text-[#00ff88]" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Copy className="h-4 w-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
