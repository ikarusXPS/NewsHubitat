import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface FactCheckButtonProps {
  /** Invoked with the highlighted text when the user clicks the bubble. */
  onClaim: (claim: string) => void;
  disabled?: boolean;
}

interface BubbleState {
  x: number;
  y: number;
  text: string;
}

/**
 * Selection-driven floating "Fact-check this" button.
 *
 * Per RESEARCH.md Pitfall 5 (T-38-23 DoS mitigation): listen on
 * `mouseup`/`touchend`, NEVER on `selectionchange` — `selectionchange` fires
 * thousands of times during a drag selection and would cause render storms.
 *
 * Per D-06 LOCKED + T-38-20 mitigation: the bubble appears only when:
 *   1. The selection length is between 10 and 500 characters (inclusive).
 *   2. The selection is anchored inside an element with
 *      `data-testid="article-content"`.
 * The article-content scope is the client-side first line; the server route
 * also enforces a 10-500 char Zod cap + injection-pattern rejection.
 *
 * Mobile long-press triggers the same Selection API natively — no extra code.
 */
export function FactCheckButton({ onClaim, disabled }: FactCheckButtonProps) {
  const { t } = useTranslation('factcheck');
  const [bubble, setBubble] = useState<BubbleState | null>(null);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';

      if (text.length < 10 || text.length > 500) {
        setBubble(null);
        return;
      }
      if (!sel || sel.rangeCount === 0) {
        setBubble(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const startEl =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;
      const containerEl = startEl?.closest('[data-testid="article-content"]');
      if (!containerEl) {
        setBubble(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setBubble({ x: rect.left, y: rect.top - 40, text });
    };

    document.addEventListener('mouseup', handler);
    document.addEventListener('touchend', handler);
    return () => {
      document.removeEventListener('mouseup', handler);
      document.removeEventListener('touchend', handler);
    };
  }, []);

  if (!bubble) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onClaim(bubble.text);
        setBubble(null);
        window.getSelection()?.removeAllRanges();
      }}
      style={{
        position: 'fixed',
        left: Math.max(8, bubble.x),
        top: Math.max(8, bubble.y),
        zIndex: 50,
      }}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full',
        'bg-[#00f0ff] text-gray-900 text-xs font-mono shadow-lg',
        'hover:bg-[#00f0ff]/90 disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-all'
      )}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {t('button.label')}
    </button>
  );
}
