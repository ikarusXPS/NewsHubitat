/**
 * Email Verification Page
 * Shows result of clicking verification link from email
 * - D-10: Already verified shows success with login link
 * - D-12: Successful verification shows success with login link
 * - D-41: Expired link shows error with resend button
 * - D-43: Dark cyber theme
 */
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

type VerifyState = 'loading' | 'success' | 'already-verified' | 'expired' | 'invalid';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerifyState>(() => token ? 'loading' : 'invalid');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          if (data.data?.alreadyVerified) {
            setState('already-verified');
          } else {
            setState('success');
          }
        } else if (data.expired) {
          setState('expired');
        } else {
          setState('invalid');
        }
      } catch {
        setState('invalid');
      }
    };

    verify();
  }, [token]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      // Note: This would need the user to be logged in
      // For now, redirect to login with a message
      window.location.href = '/login?message=Please login to resend verification email';
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  const getContent = () => {
    switch (state) {
      case 'loading':
        return {
          icon: <Loader2 className="h-16 w-16 text-cyan-400 animate-spin" />,
          title: 'Verifying...',
          titleDe: 'Verifizierung...',
          message: 'Please wait while we verify your email.',
          messageDe: 'Bitte warten, waehrend wir deine E-Mail verifizieren.',
          color: 'cyan',
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-16 w-16 text-green-400" />,
          title: 'Email Verified!',
          titleDe: 'E-Mail verifiziert!',
          message: 'Your email has been verified successfully. You now have access to all features.',
          messageDe: 'Deine E-Mail wurde erfolgreich verifiziert. Du hast jetzt Zugang zu allen Features.',
          color: 'green',
        };
      case 'already-verified':
        return {
          icon: <CheckCircle className="h-16 w-16 text-cyan-400" />,
          title: 'Already Verified',
          titleDe: 'Bereits verifiziert',
          message: 'Your email is already verified. You have full access to all features.',
          messageDe: 'Deine E-Mail ist bereits verifiziert. Du hast vollen Zugang zu allen Features.',
          color: 'cyan',
        };
      case 'expired':
        return {
          icon: <Clock className="h-16 w-16 text-yellow-400" />,
          title: 'Link Expired',
          titleDe: 'Link abgelaufen',
          message: 'This verification link has expired. Please request a new one.',
          messageDe: 'Dieser Verifizierungslink ist abgelaufen. Bitte fordere einen neuen an.',
          color: 'yellow',
        };
      case 'invalid':
        return {
          icon: <XCircle className="h-16 w-16 text-red-400" />,
          title: 'Invalid Link',
          titleDe: 'Ungueltiger Link',
          message: 'This verification link is invalid or has already been used.',
          messageDe: 'Dieser Verifizierungslink ist ungueltig oder wurde bereits verwendet.',
          color: 'red',
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className={cn(
        'max-w-md w-full bg-[#111118] rounded-xl p-8 border',
        content.color === 'green' && 'border-green-500/30',
        content.color === 'cyan' && 'border-cyan-500/30',
        content.color === 'yellow' && 'border-yellow-500/30',
        content.color === 'red' && 'border-red-500/30',
      )}>
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            {content.icon}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-mono font-bold text-white">
              {content.title}
            </h1>
            <p className="text-gray-400 text-sm">
              {content.titleDe}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-gray-300">
              {content.message}
            </p>
            <p className="text-gray-500 text-sm">
              {content.messageDe}
            </p>
          </div>

          <div className="pt-4 space-y-3">
            {(state === 'success' || state === 'already-verified') && (
              <Link
                to="/profile"
                className="block w-full px-6 py-3 bg-cyan-500 text-black font-mono font-semibold rounded-lg hover:bg-cyan-400 transition-colors text-center"
              >
                Continue to Profile
              </Link>
            )}

            {state === 'expired' && (
              <button
                onClick={handleResend}
                disabled={isResending || resendSuccess}
                className={cn(
                  'w-full px-6 py-3 font-mono font-semibold rounded-lg transition-colors',
                  resendSuccess
                    ? 'bg-green-500 text-black'
                    : 'bg-yellow-500 text-black hover:bg-yellow-400',
                  isResending && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isResending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : resendSuccess ? (
                  'Email Sent!'
                ) : (
                  'Resend Verification Email'
                )}
              </button>
            )}

            {state === 'invalid' && (
              <Link
                to="/profile"
                className="block w-full px-6 py-3 bg-gray-700 text-white font-mono font-semibold rounded-lg hover:bg-gray-600 transition-colors text-center"
              >
                Go to Profile
              </Link>
            )}

            <Link
              to="/"
              className="block text-sm text-gray-500 hover:text-gray-400 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
