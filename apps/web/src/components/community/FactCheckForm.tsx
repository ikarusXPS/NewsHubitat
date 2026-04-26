import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Link, FileText, Send, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FactCheckFormProps {
  onSubmit: (data: FactCheckSubmission) => void;
  onCancel: () => void;
}

export interface FactCheckSubmission {
  type: 'factcheck';
  articleUrl: string;
  claim: string;
  verdict: 'true' | 'false' | 'misleading' | 'unverified';
  evidence: string;
  sources: string[];
}

const VERDICTS = [
  { id: 'true', label: 'True', icon: CheckCircle, color: '#00ff88', description: 'Claim is accurate' },
  { id: 'false', label: 'False', icon: XCircle, color: '#ff0044', description: 'Claim is inaccurate' },
  { id: 'misleading', label: 'Misleading', icon: AlertCircle, color: '#ff6600', description: 'Partially true but misleading' },
  { id: 'unverified', label: 'Unverified', icon: HelpCircle, color: '#ffee00', description: 'Cannot be verified' },
];

export function FactCheckForm({ onSubmit, onCancel }: FactCheckFormProps) {
  const [articleUrl, setArticleUrl] = useState('');
  const [claim, setClaim] = useState('');
  const [verdict, setVerdict] = useState<FactCheckSubmission['verdict'] | ''>('');
  const [evidence, setEvidence] = useState('');
  const [sourcesInput, setSourcesInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!articleUrl || !claim || !verdict || !evidence) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const sources = sourcesInput
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      onSubmit({
        type: 'factcheck',
        articleUrl,
        claim,
        verdict: verdict as FactCheckSubmission['verdict'],
        evidence,
        sources,
      });
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
        <div className="p-2 rounded-lg bg-[#ff6600]/20 text-[#ff6600]">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-white">Fact Check</h3>
          <p className="text-xs text-gray-500">Verify claims and report corrections</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#ff0044]/10 border border-[#ff0044]/30 text-[#ff0044] text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          <Link className="h-3 w-3 inline mr-1" />
          Article URL *
        </label>
        <input
          type="url"
          value={articleUrl}
          onChange={(e) => setArticleUrl(e.target.value)}
          placeholder="URL of the article containing the claim..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          <FileText className="h-3 w-3 inline mr-1" />
          Claim to Verify *
        </label>
        <textarea
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          rows={2}
          placeholder="Quote or describe the specific claim..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50 resize-none"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          Verdict *
        </label>
        <div className="grid grid-cols-2 gap-2">
          {VERDICTS.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVerdict(v.id as FactCheckSubmission['verdict'])}
                className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border transition-all text-left',
                  verdict === v.id
                    ? 'border-opacity-50 bg-opacity-10'
                    : 'border-gray-700 hover:border-gray-600'
                )}
                style={{
                  borderColor: verdict === v.id ? v.color : undefined,
                  backgroundColor: verdict === v.id ? `${v.color}15` : undefined,
                }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: verdict === v.id ? v.color : '#6b7280' }}
                />
                <div>
                  <div
                    className="text-sm font-medium"
                    style={{ color: verdict === v.id ? v.color : '#e5e7eb' }}
                  >
                    {v.label}
                  </div>
                  <div className="text-[10px] text-gray-500">{v.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          Evidence / Explanation *
        </label>
        <textarea
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          rows={3}
          placeholder="Explain your reasoning and provide evidence..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50 resize-none"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          Sources (one per line)
        </label>
        <textarea
          value={sourcesInput}
          onChange={(e) => setSourcesInput(e.target.value)}
          rows={2}
          placeholder="https://source1.com&#10;https://source2.com"
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-mono text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            'flex-1 btn-cyber btn-cyber-primary py-3 rounded-lg flex items-center justify-center gap-2',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Send className="h-4 w-4" />
          {isLoading ? 'Submitting...' : 'Submit (+30 XP)'}
        </button>
      </div>
    </motion.form>
  );
}
