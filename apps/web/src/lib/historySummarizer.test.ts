/**
 * Unit tests for historySummarizer library
 * Tests conversation history summarization, topic extraction, and token estimation
 */

import { describe, it, expect } from 'vitest';
import {
  summarizeHistory,
  prepareOptimizedHistory,
  estimateHistoryTokens,
} from './historySummarizer';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

describe('summarizeHistory', () => {
  describe('empty history per D-07', () => {
    it('returns empty string for empty array', () => {
      const result = summarizeHistory([]);
      expect(result).toBe('');
    });
  });

  describe('topic extraction', () => {
    it('extracts conflict-related keywords', () => {
      const messages: Message[] = [
        { role: 'user', content: 'What about the Gaza conflict?' },
      ];
      const result = summarizeHistory(messages);
      expect(result).toContain('gaza');
      expect(result).toContain('conflict');
    });

    it('extracts humanitarian keywords', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Tell me about humanitarian aid for refugees' },
      ];
      const result = summarizeHistory(messages);
      expect(result).toContain('humanitarian');
      expect(result).toContain('aid');
      expect(result).toContain('refugee');
    });

    it('extracts German keywords', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Der Krieg in Ukraine und die Sanktionen' },
      ];
      const result = summarizeHistory(messages);
      expect(result).toContain('krieg');
      expect(result).toContain('ukraine');
      expect(result).toContain('sanktion');
    });

    it('extracts geopolitical entities', () => {
      const messages: Message[] = [
        { role: 'user', content: 'NATO and Russia relations with USA' },
      ];
      const result = summarizeHistory(messages);
      expect(result).toContain('nato');
      expect(result).toContain('russia');
      expect(result).toContain('usa');
    });

    it('limits to 5 topics maximum', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content:
            'Gaza Israel Hamas conflict war attack military humanitarian aid refugee economy sanction',
        },
      ];
      const result = summarizeHistory(messages);
      // Count topics in "Bisherige Themen:" section
      const themesMatch = result.match(/Bisherige Themen: ([^.]+)/);
      expect(themesMatch).toBeTruthy();
      if (themesMatch) {
        const topics = themesMatch[1].split(', ');
        expect(topics.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('question extraction', () => {
    it('extracts core question removing filler words', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hi, can you tell me about Ukraine?' },
      ];
      const result = summarizeHistory(messages);
      // Should contain the question without filler
      expect(result).toContain('Vorherige Fragen:');
      // Should not start with hi or filler words in extracted question
      expect(result).not.toMatch(/Vorherige Fragen: hi/i);
    });

    it('removes German filler words', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hallo, kannst du mir von Gaza erzählen?' },
      ];
      const result = summarizeHistory(messages);
      expect(result).toContain('Vorherige Fragen:');
      // Filler should be removed
      expect(result).not.toMatch(/Vorherige Fragen: hallo/i);
      expect(result).not.toMatch(/Vorherige Fragen: kannst du/i);
    });

    it('truncates long questions to 80 chars', () => {
      const longQuestion =
        'This is a very long question that exceeds eighty characters and should be truncated with an ellipsis at the end';
      const messages: Message[] = [{ role: 'user', content: longQuestion }];
      const result = summarizeHistory(messages);
      // The extracted question should be truncated
      expect(result.includes('...')).toBe(true);
    });

    it('shows last 2-3 questions from multiple messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'First question about Gaza' },
        { role: 'assistant', content: 'Answer about Gaza' },
        { role: 'user', content: 'Second question about Ukraine' },
        { role: 'assistant', content: 'Answer about Ukraine' },
        { role: 'user', content: 'Third question about Russia' },
        { role: 'assistant', content: 'Answer about Russia' },
        { role: 'user', content: 'Fourth question about NATO' },
      ];
      const result = summarizeHistory(messages);
      // Should show recent questions
      expect(result).toContain('Vorherige Fragen:');
      // Should include recent questions separated by |
      expect(result).toMatch(/\|/);
    });
  });

  describe('output format', () => {
    it('includes "Bisherige Themen:" section when topics found', () => {
      const messages: Message[] = [
        { role: 'user', content: 'What about the conflict in Gaza?' },
      ];
      const result = summarizeHistory(messages);
      expect(result).toContain('Bisherige Themen:');
    });

    it('does not include "Bisherige Themen:" when no topics found', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, how are you today?' },
      ];
      const result = summarizeHistory(messages);
      // Generic greeting has no topic keywords
      expect(result).not.toContain('Bisherige Themen:');
    });

    it('includes message count in brackets', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Question one' },
        { role: 'assistant', content: 'Answer one' },
        { role: 'user', content: 'Question two' },
        { role: 'assistant', content: 'Answer two' },
      ];
      const result = summarizeHistory(messages);
      expect(result).toContain('[2 Fragen, 2 Antworten bisher]');
    });

    it('correctly counts single user message', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Single question about conflict' },
      ];
      const result = summarizeHistory(messages);
      expect(result).toContain('[1 Fragen, 0 Antworten bisher]');
    });
  });
});

describe('prepareOptimizedHistory', () => {
  it('returns empty array for empty input', () => {
    const result = prepareOptimizedHistory([]);
    expect(result).toEqual([]);
  });

  it('returns messages as-is when few messages', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const result = prepareOptimizedHistory(messages);
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('Hello');
    expect(result[1].content).toBe('Hi there');
  });

  it('returns messages as-is when exactly at threshold', () => {
    // keepRecentCount=2, threshold is keepRecentCount + 2 = 4
    const messages: Message[] = [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' },
      { role: 'assistant', content: 'A2' },
    ];
    const result = prepareOptimizedHistory(messages);
    expect(result).toHaveLength(4);
  });

  it('filters welcome messages containing "Signal Analysis AI online"', () => {
    const messages: Message[] = [
      {
        role: 'assistant',
        content:
          'Signal Analysis AI online. Ready to analyze global news perspectives.',
      },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];
    const result = prepareOptimizedHistory(messages);
    // Welcome message should be filtered out
    expect(result.some((m) => m.content.includes('Signal Analysis AI online'))).toBe(
      false
    );
    expect(result).toHaveLength(2);
  });

  it('summarizes older messages, keeps recent in full', () => {
    const messages: Message[] = [
      { role: 'user', content: 'First question about Gaza conflict' },
      { role: 'assistant', content: 'Answer about Gaza' },
      { role: 'user', content: 'Second question about Ukraine war' },
      { role: 'assistant', content: 'Answer about Ukraine' },
      { role: 'user', content: 'Third question about Russia' },
      { role: 'assistant', content: 'Recent answer' },
    ];
    // With keepRecentCount=2 and 6 messages > threshold(4), should summarize
    const result = prepareOptimizedHistory(messages);
    // Should have context summary + 2 recent messages
    expect(result.length).toBe(3);
    // Last 2 should be the recent messages
    expect(result[result.length - 1].content).toBe('Recent answer');
    expect(result[result.length - 2].content).toBe('Third question about Russia');
  });

  it('adds context summary as assistant message', () => {
    const messages: Message[] = [
      { role: 'user', content: 'First question about Gaza conflict' },
      { role: 'assistant', content: 'Answer about Gaza' },
      { role: 'user', content: 'Second question about Ukraine war' },
      { role: 'assistant', content: 'Answer about Ukraine' },
      { role: 'user', content: 'Third question' },
      { role: 'assistant', content: 'Third answer' },
    ];
    const result = prepareOptimizedHistory(messages);
    // First message should be the context summary
    expect(result[0].role).toBe('assistant');
    expect(result[0].content).toContain('[Konversationskontext:');
  });

  it('respects custom keepRecentCount parameter', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Q1 about Gaza' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2 about Ukraine' },
      { role: 'assistant', content: 'A2' },
      { role: 'user', content: 'Q3' },
      { role: 'assistant', content: 'A3' },
      { role: 'user', content: 'Q4' },
      { role: 'assistant', content: 'A4' },
    ];
    const result = prepareOptimizedHistory(messages, 4);
    // With keepRecentCount=4, should keep last 4 messages + 1 summary
    expect(result.length).toBe(5);
    expect(result[0].content).toContain('[Konversationskontext:');
  });
});

describe('estimateHistoryTokens', () => {
  it('returns 0 for empty array', () => {
    const result = estimateHistoryTokens([]);
    expect(result).toBe(0);
  });

  it('estimates ~13 tokens for 40-char message', () => {
    // Formula: (content.length + 10) / 4 rounded up
    // (40 + 10) / 4 = 12.5 -> ceil = 13
    const messages: Message[] = [
      { role: 'user', content: 'a'.repeat(40) }, // 40 chars
    ];
    const result = estimateHistoryTokens(messages);
    expect(result).toBe(13);
  });

  it('estimates correctly for short message', () => {
    // (10 + 10) / 4 = 5
    const messages: Message[] = [{ role: 'user', content: 'a'.repeat(10) }];
    const result = estimateHistoryTokens(messages);
    expect(result).toBe(5);
  });

  it('sums multiple messages correctly', () => {
    // Message 1: (20 + 10) / 4 = 7.5
    // Message 2: (30 + 10) / 4 = 10
    // Total chars = 20 + 10 + 30 + 10 = 70
    // Total / 4 = 17.5 -> ceil = 18
    const messages: Message[] = [
      { role: 'user', content: 'a'.repeat(20) },
      { role: 'assistant', content: 'b'.repeat(30) },
    ];
    const result = estimateHistoryTokens(messages);
    expect(result).toBe(18);
  });

  it('rounds up partial tokens', () => {
    // (11 + 10) / 4 = 5.25 -> ceil = 6
    const messages: Message[] = [{ role: 'user', content: 'a'.repeat(11) }];
    const result = estimateHistoryTokens(messages);
    expect(result).toBe(6);
  });

  it('handles realistic conversation', () => {
    const messages: Message[] = [
      { role: 'user', content: 'What is happening in Gaza?' }, // 26 chars
      { role: 'assistant', content: 'The situation in Gaza involves...' }, // 33 chars
      { role: 'user', content: 'How does this affect civilians?' }, // 31 chars
    ];
    // Total: (26+10) + (33+10) + (31+10) = 36 + 43 + 41 = 120
    // 120 / 4 = 30
    const result = estimateHistoryTokens(messages);
    expect(result).toBe(30);
  });
});
