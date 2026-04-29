/**
 * Verification Banner
 * Persistent banner for unverified users
 * - D-05: Dismissible persistent top banner
 * - D-06: Shows countdown of days remaining until deletion
 * - D-07: Urgency escalates: cyan (default) -> yellow (7 days) -> orange (3 days) -> red (1 day)
 */
import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const ACCOUNT_RETENTION_DAYS = 30;

function getDaysRemaining(createdAt: string): number {
  const created = new Date(createdAt);
  const deletionDate = new Date(created.getTime() + ACCOUNT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const remaining = Math.ceil((deletionDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

function getUrgencyColor(daysRemaining: number): string {
  if (daysRemaining <= 1) return '#ff0044';   // red
  if (daysRemaining <= 3) return '#ff6600';   // orange
  if (daysRemaining <= 7) return '#ffee00';   // yellow
  return '#00f0ff';                            // cyan (default)
}

function getUrgencyLevel(daysRemaining: number): 'critical' | 'high' | 'medium' | 'low' {
  if (daysRemaining <= 1) return 'critical';
  if (daysRemaining <= 3) return 'high';
  if (daysRemaining <= 7) return 'medium';
  return 'low';
}

export function VerificationBanner() {
  const { user, isLoading, isVerified, resendVerification } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendResult, setResendResult] = useState<'success' | 'rate-limited' | null>(null);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  // Don't show while loading, if not logged in, if verified, or if dismissed
  if (isLoading || !user || isVerified || isDismissed) {
    return null;
  }

  const daysRemaining = getDaysRemaining(user.createdAt);
  const urgencyColor = getUrgencyColor(daysRemaining);
  const urgencyLevel = getUrgencyLevel(daysRemaining);

  const handleResend = async () => {
    setIsResending(true);
    setResendResult(null);

    try {
      const result = await resendVerification();

      if (result.rateLimited) {
        setResendResult('rate-limited');
        setMinutesRemaining(result.minutesRemaining ?? null);
      } else if (result.success) {
        setResendResult('success');
      }
    } catch {
      // Silently fail - user can try again
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          'border-b',
          urgencyLevel === 'critical' && 'border-red-500/30',
          urgencyLevel === 'high' && 'border-orange-500/30',
          urgencyLevel === 'medium' && 'border-yellow-500/30',
          urgencyLevel === 'low' && 'border-cyan-500/30',
        )}
        style={{ backgroundColor: `${urgencyColor}10` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3">
              <Mail
                className="h-5 w-5 shrink-0"
                style={{ color: urgencyColor }}
              />
              <div className="text-sm">
                <span className="text-white font-mono">
                  Verify your email to unlock all features
                </span>
                <span
                  className="ml-2 font-mono text-xs"
                  style={{ color: urgencyColor }}
                >
                  ({daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {resendResult === 'success' ? (
                <span className="text-sm text-green-400 font-mono">
                  Email sent!
                </span>
              ) : resendResult === 'rate-limited' ? (
                <span className="text-sm text-yellow-400 font-mono">
                  Try again in {minutesRemaining}m
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className={cn(
                    'px-4 py-1.5 rounded text-sm font-mono font-semibold transition-colors',
                    isResending
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'text-black hover:opacity-90'
                  )}
                  style={{
                    backgroundColor: isResending ? undefined : urgencyColor
                  }}
                >
                  {isResending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    'Resend Email'
                  )}
                </button>
              )}

              <button
                onClick={() => setIsDismissed(true)}
                className="text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default VerificationBanner;
