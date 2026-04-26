import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Rss, Link, Globe, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PerspectiveRegion } from '../../types';
import type { CustomFeed } from '../../types/feeds';

interface CustomFeedFormProps {
  onClose: () => void;
  onAdd: (feed: CustomFeed) => void;
}

const REGIONS: { value: PerspectiveRegion; label: string }[] = [
  { value: 'usa', label: 'USA' },
  { value: 'europa', label: 'Europa' },
  { value: 'deutschland', label: 'Deutschland' },
  { value: 'nahost', label: 'Nahost' },
  { value: 'tuerkei', label: 'Turkei' },
  { value: 'russland', label: 'Russland' },
  { value: 'china', label: 'China' },
  { value: 'asien', label: 'Asien' },
  { value: 'afrika', label: 'Afrika' },
  { value: 'lateinamerika', label: 'Lateinamerika' },
  { value: 'ozeanien', label: 'Ozeanien' },
  { value: 'kanada', label: 'Kanada' },
  { value: 'alternative', label: 'Alternative' },
];

export function CustomFeedForm({ onClose, onAdd }: CustomFeedFormProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [region, setRegion] = useState<PerspectiveRegion>('alternative');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    // URL validation
    try {
      new URL(url);
    } catch {
      setError('Invalid URL format');
      return;
    }

    setIsValidating(true);

    // In a real app, we'd validate the RSS feed here
    // For now, just simulate a delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newFeed: CustomFeed = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      url: url.trim(),
      region,
      addedAt: new Date(),
      isActive: true,
    };

    onAdd(newFeed);
    setIsValidating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-10"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md rounded-lg border border-[#bf00ff]/30 bg-[#0a0e1a] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Rss className="h-5 w-5 text-[#bf00ff]" />
            <h3 className="text-white font-medium">Add Custom Feed</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Feed Name</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My News Source"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-[#bf00ff]/50 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">RSS Feed URL</label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder-gray-500 focus:border-[#bf00ff]/50 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as PerspectiveRegion)}
              className="w-full px-4 py-2.5 rounded-lg bg-gray-900 border border-gray-700 text-white focus:border-[#bf00ff]/50 focus:outline-none text-sm appearance-none cursor-pointer"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-[#ff0044]/10 border border-[#ff0044]/30 text-sm text-[#ff0044]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isValidating}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                'bg-[#bf00ff] text-white hover:bg-[#bf00ff]/80',
                isValidating && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isValidating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating...
                </span>
              ) : (
                'Add Feed'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
