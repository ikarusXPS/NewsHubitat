/**
 * TeamSettingsModal - Edit team name and description (Phase 40.1 D-02)
 * Visible to owners and admins. Wires to useUpdateTeam hook.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Settings, Save, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useUpdateTeam } from '../../hooks/useTeams';

interface TeamSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  currentName: string;
  currentDescription: string | null;
}

/**
 * Inner form component — only mounts when modal is open, so useState
 * initialises fresh from props on every open without needing a reset effect.
 */
function TeamSettingsForm({
  onClose,
  teamId,
  currentName,
  currentDescription,
}: Omit<TeamSettingsModalProps, 'isOpen'>) {
  const { t } = useTranslation('teams');
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription ?? '');
  const { mutate: updateTeam, isPending } = useUpdateTeam(teamId);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const isNameValid = trimmedName.length >= 3 && trimmedName.length <= 50;
  const hasChanges =
    trimmedName !== currentName.trim() ||
    trimmedDescription !== (currentDescription ?? '').trim();
  const canSubmit = isNameValid && hasChanges && !isPending;

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onClose();
    },
    [onClose, isPending]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    updateTeam(
      {
        name: trimmedName,
        description: trimmedDescription.length > 0 ? trimmedDescription : null,
      },
      {
        onSuccess: () => {
          toast.success(t('success.teamUpdated', 'Team updated successfully'));
          onClose();
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => !isPending && onClose()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 glass-panel rounded-xl p-6 border border-[#00f0ff]/30">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isPending}
          className={cn(
            'absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white transition-colors',
            isPending && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={t('close', 'Close')}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[rgba(0,240,255,0.2)] flex items-center justify-center">
            <Settings className="h-5 w-5 text-[#00f0ff]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-mono">
              {t('settings.title', 'Team Settings')}
            </h2>
            <p className="text-sm text-gray-400">{currentName}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Name */}
          <div>
            <label htmlFor="team-settings-name" className="block text-sm text-gray-400 mb-1">
              {t('settings.nameLabel', 'Team Name')}
            </label>
            <input
              id="team-settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={3}
              maxLength={50}
              required
              disabled={isPending}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/30 transition-colors"
            />
            <p className="text-xs text-gray-500 mt-1">{trimmedName.length}/50</p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="team-settings-description"
              className="block text-sm text-gray-400 mb-1"
            >
              {t('settings.descriptionLabel', 'Description')}
            </label>
            <textarea
              id="team-settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isPending}
              className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-transparent text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/30 transition-colors resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{trimmedDescription.length}/500</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors font-medium"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors',
                canSubmit
                  ? 'bg-[#00f0ff] text-[#0a0a0f] hover:bg-[#00d4e0]'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{t('settings.saveButton', 'Save Changes')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * TeamSettingsModal - outer wrapper that gates mounting on isOpen.
 * When isOpen is false, returns null so the form state resets naturally
 * on next open (no setState-in-effect needed).
 */
export function TeamSettingsModal({ isOpen, ...props }: TeamSettingsModalProps) {
  if (!isOpen) return null;
  return <TeamSettingsForm {...props} />;
}
