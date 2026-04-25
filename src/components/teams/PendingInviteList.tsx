/**
 * PendingInviteList - Display and manage pending team invitations
 * Only visible to team owners and admins
 */

import { Mail, Clock, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useTeamInvites, useCancelInvite, type TeamInvite } from '../../hooks/useTeamMembers';
import { TeamRoleBadge } from './TeamRoleBadge';
import type { TeamRole } from '../../hooks/useTeams';
import toast from 'react-hot-toast';

interface PendingInviteListProps {
  teamId: string;
  userRole: TeamRole;
}

/**
 * Single invite row component
 */
function InviteRow({ invite, teamId }: { invite: TeamInvite; teamId: string }) {
  const { t } = useTranslation('teams');
  const { mutate: cancelInvite, isPending } = useCancelInvite(teamId);

  const handleCancel = () => {
    if (!confirm(t('confirm.cancelInvite.message', 'Cancel this invitation?'))) return;
    cancelInvite(invite.id, {
      onSuccess: () => {
        toast.success(t('success.inviteCancelled', 'Invitation cancelled'));
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  };

  const formatExpiry = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return t('expired', 'Expired');
    }
    if (diffDays === 0) {
      return t('expirestoday', 'Expires today');
    }
    if (diffDays === 1) {
      return t('expiresTomorrow', 'Expires tomorrow');
    }
    return t('expiresInDays', { days: diffDays, defaultValue: 'Expires in {{days}} days' });
  };

  const isExpired = new Date(invite.expiresAt) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border transition-colors',
        isExpired
          ? 'bg-[rgba(255,0,68,0.05)] border-[rgba(255,0,68,0.2)]'
          : 'bg-[rgba(0,240,255,0.02)] border-gray-700 hover:border-[#00f0ff]/30'
      )}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {/* Email icon */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#bf00ff]/20 flex items-center justify-center flex-shrink-0">
          <Mail className="h-5 w-5 text-[#00f0ff]" />
        </div>

        {/* Invite info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">{invite.email}</span>
            <TeamRoleBadge role={invite.role} size="sm" />
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <Clock className="h-3 w-3" />
            <span className={cn(isExpired && 'text-[#ff0044]')}>{formatExpiry(invite.expiresAt)}</span>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <button
        onClick={handleCancel}
        disabled={isPending}
        className={cn(
          'p-2 rounded-lg text-gray-400 hover:text-[#ff0044] hover:bg-[rgba(255,0,68,0.1)] transition-colors',
          'touch-target',
          isPending && 'opacity-50 cursor-not-allowed'
        )}
        title={t('cancelInvite', 'Cancel invitation')}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
      </button>
    </motion.div>
  );
}

export function PendingInviteList({ teamId, userRole }: PendingInviteListProps) {
  const { t } = useTranslation('teams');
  const { invites, isLoading } = useTeamInvites(teamId);

  // Only owners and admins can see invites
  if (userRole === 'member') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#00f0ff]" />
      </div>
    );
  }

  if (invites.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="h-12 w-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">
          {t('empty.noInvites.title', 'No pending invites')}
        </h3>
        <p className="text-gray-400 text-sm">
          {t('empty.noInvites.description', 'Use the Invite Member button to send invitations.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} teamId={teamId} />
        ))}
      </AnimatePresence>
    </div>
  );
}
