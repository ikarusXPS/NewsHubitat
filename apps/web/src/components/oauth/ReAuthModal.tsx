import { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface ReAuthModalProps {
  isOpen: boolean;
  provider: 'google' | 'github';
  email: string;
  onLink: (password: string) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

export function ReAuthModal({
  isOpen,
  provider,
  email,
  onLink,
  onCancel,
}: ReAuthModalProps) {
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await onLink(password);
      if (!result.success) {
        setError(result.error || t('oauth.linkFailed'));
      }
      // If success, parent component will close modal
    } catch (err) {
      setError(err instanceof Error ? err.message : t('oauth.linkFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
          aria-label={t('oauth.notNow')}
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 text-xl font-bold text-white">
          {t('oauth.linkTitle', { provider: providerName })}
        </h2>

        <p className="mb-6 text-sm text-gray-400">
          {t('oauth.linkDescription', { email })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              {t('login.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoFocus
                className="w-full rounded-lg border border-gray-600 bg-gray-700 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-[#00f0ff] focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-900/30 border border-red-800/50 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-600 py-2.5 text-gray-300 hover:bg-gray-700 transition-colors min-h-[44px]"
            >
              {t('oauth.notNow')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !password}
              className={cn(
                'flex-1 rounded-lg py-2.5 font-medium text-white transition-colors flex items-center justify-center gap-2 min-h-[44px]',
                isSubmitting || !password
                  ? 'bg-blue-600/50 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500'
              )}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('oauth.linkAccount')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
