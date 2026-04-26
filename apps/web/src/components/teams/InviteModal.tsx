/**
 * InviteModal - Email invite form for team members
 */

import { useState, useEffect } from 'react';
import { X, Mail, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useInviteMember } from '../../hooks/useTeamMembers';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}

export function InviteModal({ isOpen, onClose, teamId, teamName }: InviteModalProps) {
  const { t } = useTranslation('teams');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { mutate: inviteMember, isPending } = useInviteMember(teamId);

  // Reset form on close - intentional state reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      /* eslint-disable react-hooks/set-state-in-effect -- Intentional reset on modal close */
      setEmail('');
      setRole('member');
      setError(null);
      setSuccess(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('validation.emailInvalid', 'Please enter a valid email address'));
      return;
    }

    inviteMember(
      { email, role },
      {
        onSuccess: () => {
          setSuccess(true);
          setEmail('');
          // Auto-close after success
          setTimeout(() => onClose(), 1500);
        },
        onError: (err) => {
          setError(err.message);
        },
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 glass-panel rounded-xl p-6 border border-gray-700">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,240,255,0.15)] flex items-center justify-center">
            <Mail className="h-5 w-5 text-[#00f0ff]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono">{t('inviteMember', 'Invite Member')}</h2>
            <p className="text-sm text-gray-400">{teamName}</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-[rgba(0,255,136,0.15)] mx-auto mb-4 flex items-center justify-center">
              <Mail className="h-6 w-6 text-[#00ff88]" />
            </div>
            <p className="text-[#00ff88]">{t('success.inviteSent', { email, defaultValue: 'Invite sent to {{email}}' })}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('form.email', 'Email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('form.emailPlaceholder', 'colleague@example.com')}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-500 focus:border-[#00f0ff] focus:outline-none"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">{t('form.role', 'Role')}</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRole('member')}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg border transition-all text-sm font-medium',
                    role === 'member'
                      ? 'border-[#00f0ff] bg-[rgba(0,240,255,0.1)] text-[#00f0ff]'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500'
                  )}
                >
                  {t('roles.member', 'Member')}
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg border transition-all text-sm font-medium',
                    role === 'admin'
                      ? 'border-[#00f0ff] bg-[rgba(0,240,255,0.1)] text-[#00f0ff]'
                      : 'border-gray-600 text-gray-400 hover:border-gray-500'
                  )}
                >
                  {t('roles.admin', 'Admin')}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="text-sm text-[#ff0044] bg-[rgba(255,0,68,0.1)] px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className={cn(
                'w-full py-3 rounded-lg font-semibold transition-all',
                'bg-[#00f0ff] text-[#0a0a0f] hover:bg-[#00d4e0]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : (
                t('sendInvite', 'Send Invite')
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
