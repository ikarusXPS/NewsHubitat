/**
 * TeamInviteAccept - Handle team invite link acceptance
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export function TeamInviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('teams');
  const { isAuthenticated, token: authToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [teamName, setTeamName] = useState('');
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      /* eslint-disable react-hooks/set-state-in-effect -- Initial validation on mount */
      setStatus('error');
      setError(t('errors.invalidInvite', 'Invalid invite link'));
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    // If not authenticated, redirect to login with return URL
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(`/team/invite/${token}`);
      navigate(`/login?return=${returnUrl}`);
      return;
    }

    // Accept the invite
    const acceptInvite = async () => {
      try {
        const response = await fetch(`/api/teams/accept-invite/${token}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t('errors.acceptFailed', 'Failed to accept invite'));
        }

        setTeamName(data.data.name);
        setTeamId(data.data.id);
        setStatus('success');

        // Redirect to team after delay
        setTimeout(() => {
          navigate(`/team/${data.data.id}`);
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : t('errors.acceptFailed', 'Failed to accept invite'));
      }
    };

    acceptInvite();
  }, [token, isAuthenticated, authToken, navigate, t]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 text-[#00f0ff] mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-bold text-white mb-2">{t('joiningTeam', 'Joining team...')}</h2>
            <p className="text-gray-400">{t('processingInvite', 'Please wait while we process your invite.')}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-[#00ff88] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {t('success.inviteAccepted', { team: teamName, defaultValue: 'Welcome to {{team}}!' })}
            </h2>
            <p className="text-gray-400 mb-4">{t('redirectingToTeam', 'Redirecting to team...')}</p>
            <Link
              to={`/team/${teamId}`}
              className="text-[#00f0ff] hover:underline"
            >
              {t('goToTeam', 'Go to team now')}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-[#ff0044] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">{t('errors.invalidInvite', 'Invalid invite')}</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Link
              to="/"
              className="text-[#00f0ff] hover:underline"
            >
              {t('goToDashboard', 'Go to Dashboard')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
