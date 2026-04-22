import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Languages,
  AlertCircle,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Flag,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface VerifyQueueProps {
  onVerify: (itemId: string, verdict: 'approve' | 'reject' | 'flag') => void;
}

interface QueueItem {
  id: string;
  type: 'news' | 'factcheck' | 'translation';
  title: string;
  author: string;
  authorAvatar: string;
  submittedAt: Date;
  url?: string;
  preview: string;
  votesUp: number;
  votesDown: number;
}

const MOCK_QUEUE: QueueItem[] = [
  {
    id: '1',
    type: 'news',
    title: 'Reuters: Middle East tensions escalate',
    author: 'NewsHunter',
    authorAvatar: '🔍',
    submittedAt: new Date(Date.now() - 15 * 60 * 1000),
    url: 'https://reuters.com/...',
    preview: 'Regional leaders meet to discuss ongoing diplomatic crisis...',
    votesUp: 5,
    votesDown: 0,
  },
  {
    id: '2',
    type: 'factcheck',
    title: 'Claim: "NATO expanding to 35 members"',
    author: 'FactChecker42',
    authorAvatar: '✓',
    submittedAt: new Date(Date.now() - 45 * 60 * 1000),
    preview: 'Verdict: FALSE - NATO currently has 32 members with no confirmed expansion plans...',
    votesUp: 12,
    votesDown: 2,
  },
  {
    id: '3',
    type: 'translation',
    title: 'Chinese article translation: Economic policy shifts',
    author: 'Polyglot',
    authorAvatar: '🌏',
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    preview: 'Translation from Mandarin to German: "Die Regierung hat neue Wirtschaftsmaßnahmen..."',
    votesUp: 3,
    votesDown: 1,
  },
];

const TYPE_ICONS = {
  news: FileText,
  factcheck: AlertCircle,
  translation: Languages,
};

const TYPE_COLORS = {
  news: '#00f0ff',
  factcheck: '#ff6600',
  translation: '#bf00ff',
};

export function VerifyQueue({ onVerify }: VerifyQueueProps) {
  const [queue] = useState<QueueItem[]>(MOCK_QUEUE);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatTimeAgo = (date: Date) => {
    // eslint-disable-next-line react-hooks/purity -- Date.now() for relative time display
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
        <div className="p-2 rounded-lg bg-[#00ff88]/20 text-[#00ff88]">
          <CheckCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-white">Verification Queue</h3>
          <p className="text-xs text-gray-500">Review and verify community contributions</p>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="flex gap-4 text-xs font-mono">
        <div className="flex items-center gap-1 text-gray-500">
          <Clock className="h-3 w-3" />
          <span>{queue.length} pending</span>
        </div>
        <div className="flex items-center gap-1 text-[#00ff88]">
          <CheckCircle className="h-3 w-3" />
          <span>+20 XP per verification</span>
        </div>
      </div>

      {/* Queue Items */}
      <div className="space-y-3">
        {queue.map((item) => {
          const Icon = TYPE_ICONS[item.type];
          const color = TYPE_COLORS[item.type];
          const isExpanded = expandedId === item.id;

          return (
            <motion.div
              key={item.id}
              layout
              className={cn(
                'glass-panel rounded-xl overflow-hidden transition-all',
                isExpanded && 'border-[#00f0ff]/30'
              )}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full p-4 text-left hover:bg-[rgba(0,240,255,0.02)] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{
                        backgroundColor: `${color}20`,
                        color,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-white text-sm">{item.title}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{item.authorAvatar}</span>
                        <span>{item.author}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(item.submittedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Vote counts */}
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1 text-[#00ff88]">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{item.votesUp}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#ff0044]">
                      <ThumbsDown className="h-3 w-3" />
                      <span>{item.votesDown}</span>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <p className="text-xs text-gray-400 mt-2 line-clamp-2">{item.preview}</p>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4 border-t border-gray-800"
                >
                  <div className="pt-4 space-y-4">
                    {/* Full preview */}
                    <div className="p-3 rounded-lg bg-[rgba(0,240,255,0.03)] border border-gray-800">
                      <p className="text-sm text-gray-300">{item.preview}</p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-[#00f0ff] hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View source
                        </a>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onVerify(item.id, 'approve')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors text-sm font-medium"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => onVerify(item.id, 'reject')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#ff0044]/10 border border-[#ff0044]/30 text-[#ff0044] hover:bg-[#ff0044]/20 transition-colors text-sm font-medium"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => onVerify(item.id, 'flag')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#ffee00]/10 border border-[#ffee00]/30 text-[#ffee00] hover:bg-[#ffee00]/20 transition-colors text-sm font-medium"
                        title="Flag for review"
                      >
                        <Flag className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {queue.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-[#00ff88] mx-auto mb-4" />
          <p className="text-gray-400">All caught up! No pending verifications.</p>
          <p className="text-xs text-gray-600 mt-2">Check back later for new contributions to verify.</p>
        </div>
      )}
    </div>
  );
}
