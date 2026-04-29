interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Extract main topics/keywords from a message.
 * Identifies key nouns and topic indicators.
 */
function extractTopics(text: string): string[] {
  // Common topic indicators in both German and English
  const topicPatterns = [
    /(?:über|about|regarding)\s+(\w+)/gi,
    /(?:thema|topic|subject):\s*(\w+)/gi,
    /(?:gaza|israel|hamas|hezbollah|iran|ukraine|russia|nato|eu|usa|türkei|turkey)/gi,
    /(?:konflikt|conflict|krieg|war|frieden|peace|verhandlung|negotiation)/gi,
    /(?:angriff|attack|rakete|rocket|militär|military|truppen|troops)/gi,
    /(?:humanitär|humanitarian|hilfe|aid|flüchtling|refugee)/gi,
    /(?:wirtschaft|economy|sanktion|sanction|handel|trade)/gi,
  ];

  const topics = new Set<string>();

  for (const pattern of topicPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      // Add the full match or captured group
      const topic = (match[1] || match[0]).toLowerCase().trim();
      if (topic.length > 2) {
        topics.add(topic);
      }
    }
  }

  return Array.from(topics).slice(0, 5);
}

/**
 * Extract the core question from a user message.
 * Removes filler words and gets to the essence.
 */
function extractCoreQuestion(text: string): string {
  // Remove common filler phrases
  const cleanedText = text
    .replace(/^(hi|hello|hey|hallo|guten tag|kannst du|könntest du|bitte|please|can you|could you)\s*/gi, '')
    .replace(/\?\s*$/g, '')
    .trim();

  // Truncate if too long
  if (cleanedText.length > 80) {
    return cleanedText.substring(0, 77) + '...';
  }

  return cleanedText;
}

/**
 * Summarize conversation history without making an LLM call.
 * Creates a compact representation of the conversation context.
 *
 * @param messages - Full conversation history
 * @returns Compact summary string
 */
export function summarizeHistory(messages: Message[]): string {
  if (messages.length === 0) {
    return '';
  }

  // Collect all topics mentioned across messages
  const allTopics = new Set<string>();
  const userQuestions: string[] = [];

  for (const msg of messages) {
    const topics = extractTopics(msg.content);
    topics.forEach(t => allTopics.add(t));

    if (msg.role === 'user') {
      userQuestions.push(extractCoreQuestion(msg.content));
    }
  }

  // Build compact summary
  const parts: string[] = [];

  // Topics discussed
  if (allTopics.size > 0) {
    const topicList = Array.from(allTopics).slice(0, 5).join(', ');
    parts.push(`Bisherige Themen: ${topicList}`);
  }

  // Previous questions (last 2-3)
  if (userQuestions.length > 0) {
    const recentQuestions = userQuestions.slice(-3);
    parts.push(`Vorherige Fragen: ${recentQuestions.join(' | ')}`);
  }

  // Message count for context
  const userCount = messages.filter(m => m.role === 'user').length;
  const assistantCount = messages.filter(m => m.role === 'assistant').length;
  parts.push(`[${userCount} Fragen, ${assistantCount} Antworten bisher]`);

  return parts.join('. ');
}

/**
 * Prepare optimized conversation history for API call.
 * Returns summarized history for older messages + full recent messages.
 *
 * @param messages - Full conversation history
 * @param keepRecentCount - Number of recent messages to keep in full (default: 2)
 * @returns Optimized message array for API
 */
export function prepareOptimizedHistory(
  messages: Message[],
  keepRecentCount: number = 2
): Message[] {
  // Filter out welcome messages
  const filteredMessages = messages.filter(m =>
    !(m.role === 'assistant' && m.content.includes('Signal Analysis AI online'))
  );

  // If few messages, return as-is
  if (filteredMessages.length <= keepRecentCount + 2) {
    return filteredMessages.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }

  // Split into older and recent
  const olderMessages = filteredMessages.slice(0, -keepRecentCount);
  const recentMessages = filteredMessages.slice(-keepRecentCount);

  // Summarize older messages
  const summary = summarizeHistory(olderMessages);

  // Build optimized history
  const optimizedHistory: Message[] = [];

  // Add summary as system context
  if (summary) {
    optimizedHistory.push({
      role: 'assistant',
      content: `[Konversationskontext: ${summary}]`,
    });
  }

  // Add recent messages in full
  for (const msg of recentMessages) {
    optimizedHistory.push({
      role: msg.role,
      content: msg.content,
    });
  }

  return optimizedHistory;
}

/**
 * Estimate token count for history.
 * Rough estimate: ~4 characters per token.
 */
export function estimateHistoryTokens(messages: Message[]): number {
  let totalChars = 0;
  for (const msg of messages) {
    totalChars += msg.content.length + 10; // +10 for role overhead
  }
  return Math.ceil(totalChars / 4);
}
