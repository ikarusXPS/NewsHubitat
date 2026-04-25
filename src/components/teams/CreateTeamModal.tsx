/**
 * CreateTeamModal - Team creation form
 */

import { useState, useEffect } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useCreateTeam } from '../../hooks/useTeams';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (teamId: string) => void;
}

export function CreateTeamModal({ isOpen, onClose, onSuccess }: CreateTeamModalProps) {
  const { t } = useTranslation('teams');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { mutate: createTeam, isPending } = useCreateTeam();

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setError(null);
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

    // Validation
    if (name.length < 3) {
      setError(t('validation.nameTooShort', 'Team name must be at least 3 characters'));
      return;
    }
    if (name.length > 50) {
      setError(t('validation.nameTooLong', 'Team name must be 50 characters or less'));
      return;
    }
    if (description.length > 500) {
      setError(t('validation.descriptionTooLong', 'Description must be 500 characters or less'));
      return;
    }

    createTeam(
      { name, description: description || undefined },
      {
        onSuccess: (team) => {
          onClose();
          onSuccess?.(team.id);
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
            <Users className="h-5 w-5 text-[#00f0ff]" />
          </div>
          <h2 className="text-xl font-bold text-white font-mono">{t('createTeam', 'Create Team')}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Team Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('form.teamName', 'Team Name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.teamNamePlaceholder', 'Enter team name')}
              required
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-500 focus:border-[#00f0ff] focus:outline-none"
            />
            <div className="text-xs text-gray-500 mt-1 text-right">{name.length}/50</div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('form.description', 'Description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder', 'What is this team about?')}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700 text-white placeholder-gray-500 focus:border-[#00f0ff] focus:outline-none resize-none"
            />
            <div className="text-xs text-gray-500 mt-1 text-right">{description.length}/500</div>
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
            disabled={isPending || !name.trim()}
            className={cn(
              'w-full py-3 rounded-lg font-semibold transition-all',
              'bg-[#00f0ff] text-[#0a0a0f] hover:bg-[#00d4e0]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              t('createTeam', 'Create Team')
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
