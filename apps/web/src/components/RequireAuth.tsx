import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogIn, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';

interface RequireAuthProps {
  children: React.ReactNode;
}

// Route-level auth gate (todo 40-07-add-requireauth-wrapper).
// Wraps protected routes that hit authMiddleware-gated backend endpoints
// so anonymous users see an inline sign-in CTA instead of a 401-derived
// error UI. Once the user signs in via AuthModal, AuthContext.user flips
// truthy and the wrapped route renders automatically — no manual
// redirect plumbing required.
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation('common');
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#00f0ff]/30 bg-[#00f0ff]/10">
            <Lock className="h-8 w-8 text-[#00f0ff]" />
          </div>
          <h2 className="mb-3 font-mono text-2xl font-bold uppercase tracking-widest text-[#00f0ff]">
            {t('requireAuth.title')}
          </h2>
          <p className="mb-8 text-sm text-white/70">
            {t('requireAuth.description')}
          </p>
          <button
            type="button"
            onClick={() => setShowAuthModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#00f0ff] bg-[#00f0ff]/10 px-6 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-[#00f0ff] transition hover:bg-[#00f0ff]/20"
          >
            <LogIn className="h-4 w-4" />
            {t('requireAuth.signInButton')}
          </button>
        </div>
      </div>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
