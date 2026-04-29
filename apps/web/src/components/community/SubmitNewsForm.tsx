import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Link, Globe, Send, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SubmitNewsFormProps {
  onSubmit: (data: NewsSubmission) => void;
  onCancel: () => void;
}

export interface NewsSubmission {
  type: 'news';
  url: string;
  title: string;
  source: string;
  region: string;
  summary: string;
  topics: string[];
}

const REGIONS = [
  { id: 'western', label: 'Western', color: '#3b82f6' },
  { id: 'middle-east', label: 'Middle East', color: '#10b981' },
  { id: 'turkish', label: 'Turkish', color: '#ef4444' },
  { id: 'russian', label: 'Russian', color: '#a855f7' },
  { id: 'chinese', label: 'Chinese', color: '#eab308' },
  { id: 'alternative', label: 'Alternative', color: '#00f0ff' },
];

export function SubmitNewsForm({ onSubmit, onCancel }: SubmitNewsFormProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [region, setRegion] = useState('');
  const [summary, setSummary] = useState('');
  const [topicsInput, setTopicsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url || !title || !region) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const topics = topicsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      onSubmit({
        type: 'news',
        url,
        title,
        source,
        region,
        summary,
        topics,
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
        <div className="p-2 rounded-lg bg-[#00f0ff]/20 text-[#00f0ff]">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-white">Submit News Article</h3>
          <p className="text-xs text-gray-500">Share a news article from any source</p>
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
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          <FileText className="h-3 w-3 inline mr-1" />
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article headline..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-2">
            Source Name
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g., Reuters, BBC..."
            className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-gray-400 mb-2">
            <Globe className="h-3 w-3 inline mr-1" />
            Region *
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white outline-none focus:border-[#00f0ff]/50"
            required
          >
            <option value="">Select region...</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          Summary
        </label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Brief summary of the article..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-gray-400 mb-2">
          Topics (comma-separated)
        </label>
        <input
          type="text"
          value={topicsInput}
          onChange={(e) => setTopicsInput(e.target.value)}
          placeholder="politics, economy, conflict..."
          className="w-full rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-3 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50"
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
          {isLoading ? 'Submitting...' : 'Submit (+50 XP)'}
        </button>
      </div>
    </motion.form>
  );
}
