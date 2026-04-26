/**
 * Locked Feature Wrapper
 * Shows lock icon with tooltip for unverified users
 * - D-04: Unverified users are read-only (no bookmarks, AI chat, preferences, digests)
 * - D-23: Lock icons + tooltips on disabled features
 * - D-24: Clicking locked feature opens verification resend modal
 */
import { useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ResendVerificationModal } from './ResendVerificationModal';

interface LockedFeatureProps {
  children: ReactNode;
  feature: 'bookmarks' | 'ai-chat' | 'preferences' | 'digests';
  className?: string;
}

const FEATURE_LABELS: Record<string, { en: string; de: string }> = {
  bookmarks: { en: 'Bookmarks', de: 'Lesezeichen' },
  'ai-chat': { en: 'AI Chat', de: 'KI-Chat' },
  preferences: { en: 'Preferences', de: 'Einstellungen' },
  digests: { en: 'Email Digests', de: 'E-Mail-Digests' },
};

export function LockedFeature({ children, feature, className }: LockedFeatureProps) {
  const { isVerified, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // If not authenticated or already verified, render children normally
  if (!isAuthenticated || isVerified) {
    return <>{children}</>;
  }

  const label = FEATURE_LABELS[feature];

  return (
    <>
      <div
        className={cn('relative group cursor-not-allowed', className)}
        onClick={() => setShowModal(true)}
      >
        {/* Overlay with lock icon */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded flex items-center justify-center z-10 transition-opacity group-hover:bg-black/70">
          <div className="flex flex-col items-center gap-2 text-center px-4">
            <Lock className="h-6 w-6 text-cyan-400" />
            <div className="text-xs font-mono">
              <p className="text-gray-300">Verify email to unlock</p>
              <p className="text-gray-500">{label.de} entsperren</p>
            </div>
          </div>
        </div>

        {/* Disabled content */}
        <div className="opacity-40 pointer-events-none">
          {children}
        </div>
      </div>

      <ResendVerificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        feature={feature}
      />
    </>
  );
}

export default LockedFeature;
