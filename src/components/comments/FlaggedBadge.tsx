import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FlaggedBadge() {
  const { t } = useTranslation();

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40 mb-2">
      <AlertCircle className="h-3 w-3 text-yellow-500" />
      <span className="text-xs font-mono text-yellow-500">
        {t('comments.flagged', 'Flagged for review')}
      </span>
    </div>
  );
}
