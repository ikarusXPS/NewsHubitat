import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  ExternalLink,
  Maximize2,
  Minimize2,
  Cpu,
  Zap,
  Trash2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getTopRelevantArticles, estimateContextTokens } from '../lib/articleRelevance';
import { prepareOptimizedHistory, estimateHistoryTokens } from '../lib/historySummarizer';
import type { NewsArticle } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { id: string; title: string; url: string }[];
  timestamp: Date;
}

const STORAGE_KEY = 'newshub-ai-history';
const MAX_MESSAGES = 20;

// Load messages from localStorage
function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
  return [];
}

// Save messages to localStorage
function saveMessages(messages: Message[]) {
  try {
    // Keep only last MAX_MESSAGES
    const toSave = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
}

interface AskAIProps {
  articles: NewsArticle[];
}

const welcomeMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Signal Analysis AI online. I can help you:\n\n• Summarize intelligence signals\n• Compare perspectives across sources\n• Detect narrative patterns\n• Verify factual claims',
  timestamp: new Date(),
};

export function AskAI({ articles }: AskAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = loadMessages();
    // If no saved messages, start with welcome message
    return saved.length > 0 ? saved : [welcomeMessage];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedSourceId, setHighlightedSourceId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<{ [key: string]: HTMLAnchorElement | null }>({});

  // Persist messages to localStorage when they change
  useEffect(() => {
    // Don't save if only welcome message exists
    if (messages.length > 1 || (messages.length === 1 && messages[0].id !== 'welcome')) {
      saveMessages(messages);
    }
  }, [messages]);

  const clearHistory = () => {
    setMessages([welcomeMessage]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Render content with clickable citation links
  const renderContentWithCitations = (
    content: string,
    sources?: { id: string; title: string; url: string }[]
  ) => {
    if (!sources || sources.length === 0) {
      return <span>{content}</span>;
    }

    // Split content by citation patterns like [1], [2], [1][2], etc.
    const parts = content.split(/(\[\d+\])/g);

    return parts.map((part, index) => {
      const citationMatch = part.match(/\[(\d+)\]/);
      if (citationMatch) {
        const citationNum = parseInt(citationMatch[1], 10);
        const sourceIndex = citationNum - 1;
        const source = sources[sourceIndex];

        if (source) {
          return (
            <button
              key={index}
              onClick={() => {
                setHighlightedSourceId(source.id);
                // Scroll to source
                const sourceEl = sourcesRef.current[source.id];
                if (sourceEl) {
                  sourceEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                // Clear highlight after 2 seconds
                setTimeout(() => setHighlightedSourceId(null), 2000);
              }}
              className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 mx-0.5 text-[10px] font-mono font-bold rounded bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40 hover:bg-[#00f0ff]/30 hover:border-[#00f0ff]/60 transition-all cursor-pointer"
              title={`Source: ${source.title}`}
            >
              {citationNum}
            </button>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Select top 10 relevant articles based on question (reduced from 20)
      const relevantArticles = getTopRelevantArticles(articles, userMessage.content, 10);

      // Prepare optimized history (summarize older messages, keep recent 2)
      const conversationHistory = prepareOptimizedHistory(
        messages.map(m => ({ role: m.role, content: m.content })),
        2
      );

      // Prepare compact context (title + truncated summary only)
      const context = relevantArticles.map((a) => ({
        id: a.id,
        title: a.title,
        summary: (a.summary || a.content).substring(0, 150),
        source: a.source.name,
        perspective: a.perspective,
        url: a.url,
      }));

      // Log token estimates for monitoring
      const contextTokens = estimateContextTokens(relevantArticles);
      const historyTokens = estimateHistoryTokens(conversationHistory);
      console.log(`[AI] Articles: ${context.length}, History: ${conversationHistory.length}, Tokens: ~${contextTokens + historyTokens + 400}`);

      const response = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          context,
          conversationHistory,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Signal processing error. Please retry your query.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQueries = [
    'Main topics today?',
    'Compare perspectives',
    'Positive developments?',
    'Source analysis',
  ];

  return (
    <>
      {/* Floating button - Cyber style */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'h-14 w-14 rounded-xl',
          'bg-[#0a0e1a] border border-[#00f0ff]/50',
          'text-[#00f0ff] shadow-lg',
          'flex items-center justify-center',
          'hover:border-[#00f0ff] hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]',
          'transition-all duration-300',
          isOpen && 'hidden'
        )}
        style={{
          boxShadow: '0 0 15px rgba(0,240,255,0.2)',
        }}
      >
        <Cpu className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md bg-[#00ff88] text-[8px] font-mono font-bold text-black">
          AI
        </span>
      </motion.button>

      {/* Chat window - Cyber style */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              'fixed z-50 flex flex-col',
              'glass-panel rounded-xl',
              'border border-[#00f0ff]/30',
              'overflow-hidden',
              isExpanded
                ? 'inset-4 md:inset-8'
                : 'bottom-6 right-6 w-96 h-[500px]'
            )}
            style={{
              boxShadow: '0 0 30px rgba(0,240,255,0.15)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#00f0ff]/20 bg-[rgba(0,240,255,0.05)]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-8 w-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-[#00f0ff]" />
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-[#ffee00]" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-medium text-white">SIGNAL AI</h3>
                  <p className="text-[10px] font-mono text-[#00f0ff]/70">
                    {articles.length} signals in context
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 1 && (
                  <button
                    onClick={clearHistory}
                    className="p-2 text-gray-500 hover:text-[#ff6600] rounded-lg hover:bg-[#ff6600]/10 transition-colors"
                    title="Clear conversation history"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-gray-500 hover:text-[#00f0ff] rounded-lg hover:bg-[#00f0ff]/10 transition-colors"
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-500 hover:text-[#ff0044] rounded-lg hover:bg-[#ff0044]/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center border',
                      message.role === 'assistant'
                        ? 'bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff]'
                        : 'bg-[#bf00ff]/10 border-[#bf00ff]/30 text-[#bf00ff]'
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-4 py-3 border',
                      message.role === 'assistant'
                        ? 'bg-[rgba(0,240,255,0.05)] border-[#00f0ff]/20 text-gray-100'
                        : 'bg-[rgba(191,0,255,0.1)] border-[#bf00ff]/30 text-white'
                    )}
                  >
                    <p className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                      {message.role === 'assistant' && message.sources && message.sources.length > 0
                        ? renderContentWithCitations(message.content, message.sources)
                        : message.content}
                    </p>

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#00f0ff]/20">
                        <p className="text-[10px] font-mono text-[#00f0ff]/70 mb-2 uppercase tracking-wider">Sources:</p>
                        <div className="space-y-1">
                          {message.sources.map((source, index) => (
                            <a
                              key={source.id}
                              ref={(el) => { sourcesRef.current[source.id] = el; }}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'flex items-center gap-2 text-xs font-mono transition-all rounded-lg px-2 py-1.5 -mx-2',
                                highlightedSourceId === source.id
                                  ? 'bg-[#00f0ff]/20 text-[#00ff88] ring-2 ring-[#00f0ff]/50'
                                  : 'text-[#00f0ff] hover:bg-[#00f0ff]/10 hover:text-[#00ff88]'
                              )}
                            >
                              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-[#00f0ff]/20 text-[10px] font-bold">
                                {index + 1}
                              </span>
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{source.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="h-8 w-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-[#00f0ff] animate-spin" />
                  </div>
                  <div className="bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-[#00f0ff] animate-pulse" />
                      <span className="text-xs font-mono text-[#00f0ff]/70">Processing...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested queries */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {suggestedQueries.map((query) => (
                    <button
                      key={query}
                      onClick={() => setInput(query)}
                      className="text-[10px] font-mono px-3 py-1.5 rounded-md bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 text-[#00f0ff]/70 hover:bg-[rgba(0,240,255,0.1)] hover:text-[#00f0ff] hover:border-[#00f0ff]/40 transition-all"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-[#00f0ff]/20 bg-[rgba(0,240,255,0.02)]"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Enter query..."
                  disabled={isLoading}
                  className="flex-1 rounded-lg bg-[rgba(0,240,255,0.05)] border border-[#00f0ff]/20 px-4 py-2.5 text-sm font-mono text-white placeholder-gray-500 outline-none focus:border-[#00f0ff]/50 focus:bg-[rgba(0,240,255,0.08)] disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    'rounded-lg p-2.5 transition-all border',
                    'bg-[#00f0ff]/10 border-[#00f0ff]/30 text-[#00f0ff]',
                    'hover:bg-[#00f0ff]/20 hover:border-[#00f0ff]/50',
                    'disabled:opacity-30 disabled:cursor-not-allowed'
                  )}
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
