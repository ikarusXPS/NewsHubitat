/**
 * Resend Verification Modal
 * Modal for resending verification email
 * - D-24: Opens when clicking locked feature
 */
import { useState } from 'react';
import { X, Mail, Loader2, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface ResendVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

const FEATURE_LABELS: Record<string, { en: string; de: string }> = {
  bookmarks: { en: 'save bookmarks', de: 'Lesezeichen speichern' },
  'ai-chat': { en: 'use AI chat', de: 'KI-Chat nutzen' },
  preferences: { en: 'customize preferences', de: 'Einstellungen anpassen' },
  digests: { en: 'receive email digests', de: 'E-Mail-Digests erhalten' },
};

export function ResendVerificationModal({ isOpen, onClose, feature }: ResendVerificationModalProps) {
  const { user, resendVerification } = useAuth();
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'rate-limited'>('idle');
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  const handleResend = async () => {
    setState('loading');

    try {
      const result = await resendVerification();

      if (result.rateLimited) {
        setState('rate-limited');
        setMinutesRemaining(result.minutesRemaining ?? null);
      } else if (result.success) {
        setState('success');
        // Auto-close after success
        setTimeout(() => {
          onClose();
          setState('idle');
        }, 2000);
      } else {
        setState('idle');
      }
    } catch {
      setState('idle');
    }
  };

  const featureLabel = feature ? FEATURE_LABELS[feature] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-[#111118] rounded-xl border border-gray-800 p-6 max-w-md w-full shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {state === 'success' ? (
                  <CheckCircle className="h-12 w-12 text-green-400" />
                ) : state === 'rate-limited' ? (
                  <Clock className="h-12 w-12 text-yellow-400" />
                ) : (
                  <Mail className="h-12 w-12 text-cyan-400" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-mono font-bold text-white">
                  {state === 'success' ? 'Email Sent!' : state === 'rate-limited' ? 'Please Wait' : 'Verify Your Email'}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {state === 'success' ? 'E-Mail gesendet!' : state === 'rate-limited' ? 'Bitte warten' : 'Bestaetige deine E-Mail'}
                </p>
              </div>

              {state === 'success' ? (
                <p className="text-gray-300">
                  Check your inbox for {user?.email}
                </p>
              ) : state === 'rate-limited' ? (
                <div className="space-y-2">
                  <p className="text-gray-300">
                    Too many requests. Please try again in {minutesRemaining} minutes.
                  </p>
                  <p className="text-gray-500 text-sm">
                    Zu viele Anfragen. Bitte versuche es in {minutesRemaining} Minuten erneut.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {featureLabel && (
                    <p className="text-gray-300">
                      Verify your email to {featureLabel.en}.
                    </p>
                  )}
                  <p className="text-gray-500 text-sm">
                    {featureLabel
                      ? `Bestaetige deine E-Mail, um ${featureLabel.de} zu koennen.`
                      : 'Bestaetige deine E-Mail, um alle Features zu nutzen.'}
                  </p>
                </div>
              )}

              {state !== 'success' && (
                <div className="pt-2">
                  <button
                    onClick={handleResend}
                    disabled={state === 'loading' || state === 'rate-limited'}
                    className={cn(
                      'w-full px-6 py-3 font-mono font-semibold rounded-lg transition-colors',
                      state === 'loading' || state === 'rate-limited'
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-cyan-500 text-black hover:bg-cyan-400'
                    )}
                  >
                    {state === 'loading' ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : state === 'rate-limited' ? (
                      `Try again in ${minutesRemaining}m`
                    ) : (
                      'Resend Verification Email'
                    )}
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Verification email will be sent to {user?.email}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ResendVerificationModal;
