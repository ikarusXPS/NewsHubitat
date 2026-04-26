import { Edit2, Trash2, Check } from 'lucide-react';
import type { FocusPreset } from '../types/focus';
import { cn } from '../lib/utils';

interface PresetCardProps {
  preset: FocusPreset;
  isActive?: boolean;
  onApply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PresetCard({ preset, isActive, onApply, onEdit, onDelete }: PresetCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-lg border p-4 transition-all',
        isActive
          ? 'border-[#00f0ff] bg-[rgba(0,240,255,0.05)]'
          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
      )}
      style={{
        borderColor: isActive ? preset.color : undefined,
        backgroundColor: isActive ? `${preset.color}10` : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{preset.icon}</span>
          <div className="min-w-0 flex-1">
            <h3 className="font-mono text-sm font-medium text-white truncate">
              {preset.name}
            </h3>
            <p className="text-xs text-gray-400 line-clamp-1">
              {preset.description}
            </p>
          </div>
        </div>

        {isActive && (
          <div
            className="flex-shrink-0 rounded-full p-1"
            style={{ backgroundColor: `${preset.color}20` }}
          >
            <Check className="h-3.5 w-3.5" style={{ color: preset.color }} />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="mt-3 space-y-2">
        {/* Regions */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
            Regions ({preset.regions.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {preset.regions.map((region) => (
              <span
                key={region}
                className="rounded px-1.5 py-0.5 text-[10px] font-mono uppercase"
                style={{
                  backgroundColor: `${preset.color}20`,
                  color: preset.color,
                }}
              >
                {region}
              </span>
            ))}
          </div>
        </div>

        {/* Topics */}
        {preset.topics.length > 0 && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">
              Topics ({preset.topics.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {preset.topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-mono text-gray-400"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {onApply && (
          <button
            onClick={onApply}
            className={cn(
              'flex-1 rounded-lg px-3 py-1.5 text-xs font-mono transition-all',
              isActive
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-[#00f0ff]/20 text-[#00f0ff] hover:bg-[#00f0ff]/30 border border-[#00f0ff]/30'
            )}
            disabled={isActive}
            style={{
              backgroundColor: isActive ? undefined : `${preset.color}20`,
              color: isActive ? undefined : preset.color,
              borderColor: isActive ? undefined : `${preset.color}40`,
            }}
          >
            {isActive ? 'Active' : 'Apply'}
          </button>
        )}
        
        {onEdit && preset.isCustom && (
          <button
            onClick={onEdit}
            className="rounded-lg bg-gray-700 p-1.5 text-gray-400 hover:bg-gray-600 hover:text-white transition-colors"
            title="Edit preset"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
        )}
        
        {onDelete && preset.isCustom && (
          <button
            onClick={onDelete}
            className="rounded-lg bg-[#ff0044]/20 p-1.5 text-[#ff0044] hover:bg-[#ff0044]/30 transition-colors border border-[#ff0044]/30"
            title="Delete preset"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Built-in badge */}
      {preset.isDefault && (
        <div className="absolute top-2 right-2 rounded-full bg-[#00ff88]/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[#00ff88]">
          Default
        </div>
      )}
    </div>
  );
}
