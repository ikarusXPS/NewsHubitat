import { useState, useEffect } from 'react';
import { Rss } from 'lucide-react';
import { FeedManagerModal } from './feed-manager';
import { useAppStore } from '../store';
import type { NewsSource } from '../types';

interface FeedManagerButtonProps {
  sources?: NewsSource[];
}

export function FeedManagerButton({ sources = [] }: FeedManagerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [allSources, setAllSources] = useState<NewsSource[]>(sources);
  const { feedState } = useAppStore();

  // Fetch sources if not provided
  useEffect(() => {
    if (sources.length === 0) {
      fetch('/api/news/sources')
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setAllSources(data.data);
          }
        })
        .catch(() => {
          // Silently fail, sources will be empty
        });
    }
  }, [sources]);

  const enabledCount = allSources.filter(
    (s) => feedState.enabledSources[s.id] !== false
  ).length;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-cyber py-1.5 px-3 rounded-md text-[10px] flex items-center gap-1.5"
        title="Manage news sources"
      >
        <Rss className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Feeds</span>
        {allSources.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-[#00f0ff]/10 text-[#00f0ff] text-[9px] font-mono">
            {enabledCount}/{allSources.length}
          </span>
        )}
      </button>

      <FeedManagerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        sources={allSources}
      />
    </>
  );
}
