/**
 * Reset Password Page
 * Set new password after clicking reset link
 * - D-30: Success page with login link (no auto-login)
 * - D-37: New password cannot match old password
 * - D-39: Password strength indicator
 * - D-40: Show/hide password toggle
 * - D-43: Dark cyber theme
 */
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';

type PageState = 'validating' | 'ready' | 'loading' | 'success' | 'invalid';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<PageState>('validating');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }

    const validateToken = async () => {
      try {
        const response = await fetch(`/api/auth/validate-reset-token?token=${token}`);
        const data = await response.json();

        if (response.ok && data.data?.valid) {
          setState('ready');
          setEmail(data.data.email);
        } else {
          setState('invalid');
        }
      } catch {
        setState('invalid');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match / Passwoerter stimmen nicht ueberein');
      return;
    }

    // Validate password length
    if (password.length < 12) {
      setError('Password must be at least 12 characters / Passwort muss mindestens 12 Zeichen haben');
      return;
    }

    setState('loading');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setState('success');
      } else {
        setError(data.error || 'Password reset failed');
        setState('ready');
      }
    } catch {
      setError('Network error. Please try again.');
      setState('ready');
    }
  };

  // Invalid token state
  if (state === 'invalid') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111118] rounded-xl p-8 border border-red-500/30">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <XCircle className="h-16 w-16 text-red-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-mono font-bold text-white">
                Invalid or Expired Link
              </h1>
              <p className="text-gray-400 text-sm">
                Ungueltiger oder abgelaufener Link
              </p>
            </div>
            <p className="text-gray-400">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
              className="block w-full px-6 py-3 bg-cyan-500 text-black font-mono font-semibold rounded-lg hover:bg-cyan-400 transition-colors text-center"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111118] rounded-xl p-8 border border-green-500/30">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-mono font-bold text-white">
                Password Reset!
              </h1>
              <p className="text-gray-400 text-sm">
                Passwort zurueckgesetzt!
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-300">
                Your password has been successfully reset. You can now login with your new password.
              </p>
              <p className="text-gray-500 text-sm">
                Dein Passwort wurde erfolgreich zurueckgesetzt. Du kannst dich jetzt mit deinem neuen Passwort anmelden.
              </p>
            </div>
            <Link
              to="/profile"
              className="block w-full px-6 py-3 bg-cyan-500 text-black font-mono font-semibold rounded-lg hover:bg-cyan-400 transition-colors text-center"
            >
              Continue to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Validating state
  if (state === 'validating') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111118] rounded-xl p-8 border border-gray-800">
          <div className="text-center space-y-6">
            <Loader2 className="h-12 w-12 text-cyan-400 animate-spin mx-auto" />
            <p className="text-gray-400">Validating reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  // Ready state - show form
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111118] rounded-xl p-8 border border-gray-800">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-white">
              Set New Password
            </h1>
            <p className="text-gray-400 mt-1">
              Neues Passwort setzen
            </p>
            {email && (
              <p className="text-sm text-gray-500 mt-2">
                for {email}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  className="w-full pl-10 pr-12 py-3 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Min. 12 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <div className="mt-2">
                <PasswordStrengthMeter password={password} />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-mono text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Repeat password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={state === 'loading' || password !== confirmPassword || password.length < 12}
              className={cn(
                'w-full px-6 py-3 font-mono font-semibold rounded-lg transition-colors',
                state === 'loading' || password !== confirmPassword || password.length < 12
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400'
              )}
            >
              {state === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center">
            Password must be at least 12 characters with uppercase, lowercase, and numbers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
