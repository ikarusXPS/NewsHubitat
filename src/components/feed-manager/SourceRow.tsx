import { ToggleLeft, ToggleRight, ExternalLink, Target } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store';
import type { NewsSource } from '../../types';

interface SourceRowProps {
  source: NewsSource;
  isEnabled: boolean;
  onToggle: () => void;
}

// Convert country code to flag emoji
function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function SourceRow({ source, isEnabled, onToggle }: SourceRowProps) {
  const { setActiveSourceFilter } = useAppStore();

  const handleFilterBySource = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSourceFilter(source.id);
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-md transition-all',
        isEnabled
          ? 'bg-gray-800/50 hover:bg-gray-800'
          : 'bg-gray-900/30 opacity-60 hover:opacity-80'
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Country Flag */}
        <span className="text-base flex-shrink-0" title={source.country}>
          {getCountryFlag(source.country)}
        </span>

        {/* Source Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm truncate',
                isEnabled ? 'text-white' : 'text-gray-400'
              )}
            >
              {source.name}
            </span>
            {/* Reliability Badge */}
            <span
              className={cn(
                'text-[9px] font-mono px-1.5 py-0.5 rounded',
                source.bias.reliability >= 8
                  ? 'bg-[#00ff88]/10 text-[#00ff88]'
                  : source.bias.reliability >= 6
                    ? 'bg-[#ffee00]/10 text-[#ffee00]'
                    : 'bg-[#ff0044]/10 text-[#ff0044]'
              )}
            >
              R:{source.bias.reliability}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
            <span>{source.language.toUpperCase()}</span>
            <span>|</span>
            <span
              className={cn(
                source.bias.political < -0.2
                  ? 'text-blue-400'
                  : source.bias.political > 0.2
                    ? 'text-red-400'
                    : 'text-gray-400'
              )}
            >
              {source.bias.political < -0.2
                ? 'Left'
                : source.bias.political > 0.2
                  ? 'Right'
                  : 'Center'}
            </span>
            <span>|</span>
            <span className="capitalize">{source.bias.ownership}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Filter by this source */}
        <button
          onClick={handleFilterBySource}
          className="p-1.5 rounded-md text-gray-500 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10 transition-colors"
          title="Filter feed by this source"
        >
          <Target className="h-3.5 w-3.5" />
        </button>

        {/* External link if has endpoint */}
        {source.apiEndpoint && (
          <a
            href={source.apiEndpoint}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-md text-gray-500 hover:text-[#bf00ff] hover:bg-[#bf00ff]/10 transition-colors"
            title="View RSS feed"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            isEnabled
              ? 'text-[#00ff88] hover:bg-[#00ff88]/10'
              : 'text-gray-500 hover:bg-gray-700'
          )}
          title={isEnabled ? 'Disable source' : 'Enable source'}
        >
          {isEnabled ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
