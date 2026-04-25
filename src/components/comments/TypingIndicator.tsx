import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function TypingIndicator() {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-2"
    >
      <div className="flex gap-1">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          className="w-1 h-1 rounded-full bg-[#00f0ff]"
        />
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="w-1 h-1 rounded-full bg-[#00f0ff]"
        />
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          className="w-1 h-1 rounded-full bg-[#00f0ff]"
        />
      </div>
      <span>{t('comments.typing', 'Someone is typing...')}</span>
    </motion.div>
  );
}
