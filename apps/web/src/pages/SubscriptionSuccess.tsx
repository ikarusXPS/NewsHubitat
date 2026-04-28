/**
 * Subscription Success Page
 * Shown after successful Stripe Checkout
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function SubscriptionSuccess() {
  const { t } = useTranslation('pricing');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const sessionId = searchParams.get('session_id');

  // Refresh user data to get updated subscription tier
  const refreshUser = useCallback(async () => {
    if (!token) return;

    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to refresh user data');
    }
  }, [token]);

  useEffect(() => {
    // Refresh user data to get updated subscription tier
    const verifySubscription = async () => {
      try {
        await refreshUser();
        setStatus('success');

        // Redirect to dashboard after 3 seconds
        setTimeout(() => navigate('/'), 3000);
      } catch {
        setStatus('error');
      }
    };

    if (sessionId) {
      verifySubscription();
    } else {
      setStatus('error');
    }
  }, [sessionId, refreshUser, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-[#00f0ff] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t('success.verifying')}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{t('success.error')}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            {t('success.goHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="mb-6">
          <CheckCircle className="h-20 w-20 text-[#00ff88] mx-auto" />
        </div>
        <h1 className="text-3xl font-bold text-white font-mono mb-4">
          {t('success.title')}
        </h1>
        <p className="text-gray-400 mb-8">
          {t('success.message')}
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-[#00f0ff] text-black font-medium rounded-lg hover:bg-[#00f0ff]/90 transition-colors"
        >
          {t('success.explore')}
        </button>
        <p className="text-gray-500 text-sm mt-4">
          {t('success.redirect')}
        </p>
      </div>
    </div>
  );
}
