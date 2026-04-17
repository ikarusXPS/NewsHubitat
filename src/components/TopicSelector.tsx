import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { AVAILABLE_TOPICS } from '../config/focusPresets';

interface TopicSelectorProps {
  selectedTopics: string[];
  onToggle: (topic: string) => void;
}

export function TopicSelector({ selectedTopics, onToggle }: TopicSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {AVAILABLE_TOPICS.map((topic, index) => {
        const isSelected = selectedTopics.includes(topic.id);

        return (
          <motion.button
            key={topic.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            onClick={() => onToggle(topic.id)}
            className={`
              relative px-4 py-3 rounded-lg border-2 transition-all
              flex items-center gap-2
              ${
                isSelected
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }
            `}
          >
            {/* Checkmark */}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Check className="w-3 h-3 text-slate-900" />
              </motion.div>
            )}

            {/* Icon */}
            <span className="text-xl">{topic.icon}</span>

            {/* Label */}
            <div className="flex-1 text-left">
              <div className={`font-semibold text-sm ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                {topic.label}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
