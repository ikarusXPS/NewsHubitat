import { useState, useEffect } from 'react';
import { X, Loader2, Mail, Lock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { OAuthButton } from './oauth/OAuthButton';
import { ReAuthModal } from './oauth/ReAuthModal';
import { useOAuthPopup } from '../hooks/useOAuthPopup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'login' | 'register';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { t } = useTranslation('auth');
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, register, loginWithOAuth } = useAuth();

  // OAuth state
  const [linkingProvider, setLinkingProvider] = useState<'google' | 'github' | null>(null);
  const [linkingEmail, setLinkingEmail] = useState<string>('');
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);

  const { openOAuthPopup } = useOAuthPopup({
    onSuccess: async (result) => {
      setOauthLoading(null);
      if (result.token) {
        try {
          await loginWithOAuth(result.token);
          onClose();
          // Reset form
          setEmail('');
          setPassword('');
          setName('');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'OAuth login failed');
        }
      }
    },
    onError: (errorMsg) => {
      setOauthLoading(null);
      setError(errorMsg);
    },
    onNeedsLinking: (linkEmail) => {
      const currentProvider = oauthLoading;
      setOauthLoading(null);
      setLinkingEmail(linkEmail);
      setLinkingProvider(currentProvider);
    },
  });

  const handleGoogleAuth = () => {
    setError(null);
    setOauthLoading('google');
    openOAuthPopup('google');
  };

  const handleGitHubAuth = () => {
    setError(null);
    setOauthLoading('github');
    openOAuthPopup('github');
  };

  const handleLinkAccount = async (linkPassword: string) => {
    if (!linkingProvider) return { success: false, error: 'No provider selected' };

    try {
      const response = await fetch('/api/auth/oauth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: linkingProvider,
          email: linkingEmail,
          password: linkPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        return { success: false, error: data.error };
      }

      // Login with the returned token
      await loginWithOAuth(data.data.token);
      setLinkingProvider(null);
      setLinkingEmail('');
      onClose();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Link failed' };
    }
  };

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      onClose();
      // Reset form
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="auth-modal">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        data-testid="auth-modal-backdrop"
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full shadow-xl",
          "max-w-none md:max-w-md", // Full-width mobile, constrained desktop (D-56)
          "h-full md:h-auto", // Full-height mobile, auto desktop
          "rounded-none md:rounded-lg", // No radius mobile, rounded desktop
          "p-6",
          "pt-[calc(var(--safe-area-top)+1.5rem)] md:pt-6", // Safe area top mobile (D-28)
          "pb-[calc(var(--safe-area-bottom)+1.5rem)] md:pb-6", // Safe area bottom mobile
          "border-0 md:border md:border-gray-700",
          "bg-gray-800"
        )}
        data-testid="auth-modal-content"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
          data-testid="auth-modal-close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-white">
          {mode === 'login' ? 'Anmelden' : 'Registrieren'}
        </h2>

        {/* OAuth Buttons per D-06, D-07 - above email/password form */}
        <div className="space-y-3 mb-6">
          <OAuthButton
            provider="google"
            onClick={handleGoogleAuth}
            isLoading={oauthLoading === 'google'}
            disabled={oauthLoading !== null}
          />
          <OAuthButton
            provider="github"
            onClick={handleGitHubAuth}
            isLoading={oauthLoading === 'github'}
            disabled={oauthLoading !== null}
          />
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-800 px-3 text-gray-400">{t('oauth.or')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-sm text-gray-400">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dein Name"
                  required
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-gray-400">E-Mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-400">Passwort</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Min. 6 Zeichen' : '••••••••'}
                required
                minLength={mode === 'register' ? 6 : undefined}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800/50 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'w-full rounded-lg py-2.5 font-medium text-white transition-colors',
              isSubmitting
                ? 'bg-blue-600/50 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500'
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {mode === 'login' ? 'Anmelden...' : 'Registrieren...'}
              </span>
            ) : (
              mode === 'login' ? 'Anmelden' : 'Registrieren'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>
              Noch kein Konto?{' '}
              <button
                onClick={switchMode}
                className="text-blue-400 hover:text-blue-300"
              >
                Jetzt registrieren
              </button>
            </>
          ) : (
            <>
              Bereits registriert?{' '}
              <button
                onClick={switchMode}
                className="text-blue-400 hover:text-blue-300"
              >
                Anmelden
              </button>
            </>
          )}
        </div>

        {/* Re-auth modal for account linking */}
        <ReAuthModal
          isOpen={linkingProvider !== null}
          provider={linkingProvider || 'google'}
          email={linkingEmail}
          onLink={handleLinkAccount}
          onCancel={() => {
            setLinkingProvider(null);
            setLinkingEmail('');
          }}
        />
      </div>
    </div>
  );
}
