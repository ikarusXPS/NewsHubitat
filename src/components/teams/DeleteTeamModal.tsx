/**
 * DeleteTeamModal - Confirmation modal for team deletion
 * Requires user to type team name to confirm (T-28-25 DoS mitigation)
 */

import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useDeleteTeam } from '../../hooks/useTeams';
import toast from 'react-hot-toast';

interface DeleteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
}

export function DeleteTeamModal({ isOpen, onClose, teamId, teamName }: DeleteTeamModalProps) {
  const { t } = useTranslation('teams');
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const { mutate: deleteTeam, isPending } = useDeleteTeam();

  const isConfirmed = confirmText === teamName;

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        onClose();
      }
    },
    [onClose, isPending]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  const handleDelete = () => {
    if (!isConfirmed) return;

    deleteTeam(teamId, {
      onSuccess: () => {
        toast.success(t('success.teamDeleted', 'Team deleted successfully'));
        onClose();
        navigate('/');
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !isPending && onClose()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 glass-panel rounded-xl p-6 border-[#ff0044]/30">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isPending}
          className={cn(
            'absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white transition-colors',
            isPending && 'opacity-50 cursor-not-allowed'
          )}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[rgba(255,0,68,0.2)] flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-[#ff0044]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono">
              {t('deleteTeam', 'Delete Team')}
            </h2>
            <p className="text-sm text-gray-400">{teamName}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-[rgba(255,0,68,0.1)] border border-[rgba(255,0,68,0.3)] rounded-lg p-4 mb-4">
          <p className="text-sm text-[#ff6666]">
            {t(
              'deleteTeamWarning',
              'This will permanently delete all team bookmarks and member access. This action cannot be undone.'
            )}
          </p>
        </div>

        {/* Confirmation input */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            {t('typeToConfirm', { name: teamName, defaultValue: 'Type "{{name}}" to confirm' })}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={teamName}
            disabled={isPending}
            className={cn(
              'w-full px-4 py-3 rounded-lg border bg-transparent text-white placeholder-gray-600',
              'focus:outline-none focus:ring-2 transition-colors',
              isConfirmed
                ? 'border-[#ff0044]/50 focus:ring-[#ff0044]/30'
                : 'border-gray-700 focus:ring-[#00f0ff]/30'
            )}
            autoComplete="off"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors font-medium"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || isPending}
            className={cn(
              'flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
              isConfirmed
                ? 'bg-[#ff0044] text-white hover:bg-[#ff0044]/90'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>{t('deleteTeam', 'Delete Team')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
