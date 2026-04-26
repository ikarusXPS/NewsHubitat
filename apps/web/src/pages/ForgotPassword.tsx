/**
 * Forgot Password Page
 * Request password reset email
 * - D-34: Shows generic success message regardless of email existence
 * - D-43: Dark cyber theme
 * - D-48: Bilingual error messages
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

type FormState = 'idle' | 'loading' | 'success' | 'rate-limited';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState('loading');

    try {
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.status === 429 && data.rateLimited) {
        setState('rate-limited');
        setMinutesRemaining(data.minutesRemaining || 60);
        return;
      }

      // D-34: Always show success (even if email doesn't exist)
      setState('success');
    } catch {
      // D-34: Still show success on network error to prevent enumeration
      setState('success');
    }
  };

  if (state === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111118] rounded-xl p-8 border border-cyan-500/30">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-cyan-400" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-mono font-bold text-white">
                Check your email
              </h1>
              <p className="text-gray-400 text-sm">
                Pruefe deine E-Mail
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-gray-300">
                If an account exists for {email}, you will receive a password reset link.
              </p>
              <p className="text-gray-500 text-sm">
                Falls ein Konto fuer diese E-Mail existiert, erhaeltst du einen Link zum Zuruecksetzen.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Link
                to="/profile"
                className="block w-full px-6 py-3 bg-cyan-500 text-black font-mono font-semibold rounded-lg hover:bg-cyan-400 transition-colors text-center"
              >
                Back to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111118] rounded-xl p-8 border border-gray-800">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-white">
              Reset Password
            </h1>
            <p className="text-gray-400 mt-1">
              Passwort zuruecksetzen
            </p>
          </div>

          <p className="text-gray-400 text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-mono text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {state === 'rate-limited' && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  Too many requests. Try again in {minutesRemaining} minutes.
                </p>
                <p className="text-yellow-500/70 text-xs mt-1">
                  Zu viele Anfragen. Versuche es in {minutesRemaining} Minuten erneut.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
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
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
