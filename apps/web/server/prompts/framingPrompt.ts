/**
 * Framing analysis prompt — Phase 38 plan 02 Task 3.
 *
 * Builds a multi-region framing prompt from a Map<PerspectiveRegion,
 * NewsArticle[]>; slices each region to 3 articles for prompt budget.
 *
 * Verbatim from RESEARCH.md §"Framing analysis prompt". The output schema
 * enumerates all 13 valid PerspectiveRegion values verbatim — the LLM is
 * instructed to only emit keys for regions that appear in the input.
 */

import type { PerspectiveRegion, NewsArticle } from '../../src/types';

export function buildFramingPrompt(args: {
  topic: string;
  articlesByRegion: Map<PerspectiveRegion, NewsArticle[]>;
  locale: 'de' | 'en' | 'fr';
}): string {
  const localeName = { de: 'German', en: 'English', fr: 'French' }[args.locale];
  let articlesText = '';
  for (const [region, arts] of args.articlesByRegion) {
    articlesText += `\n## ${region.toUpperCase()}\n`;
    for (const a of arts.slice(0, 3)) {
      const body = (a.summary ?? a.content ?? '').slice(0, 250);
      articlesText += `- [${a.source.name}, lang=${a.originalLanguage}] ${a.title}\n  ${body}\n`;
    }
  }

  return `You are a media framing analyst. Output ONLY a JSON object, no prose.

Topic: "${args.topic}"
${articlesText}

Produce a JSON object with this exact shape:
{
  "perspectives": {
    "<region>": {
      "narrative":      "<2-sentence framing summary in ${localeName}>",
      "omissions":      ["<short bullet, in ${localeName}>", ...up to 3],
      "vocabulary":     ["<charged term used in this region>", ...up to 5],
      "evidenceQuotes": ["<short quoted phrase from the articles above>", ...up to 3]
    },
    ... (one entry per region present in the input)
  }
}

Rules:
- The "<region>" key must be one of: usa, europa, deutschland, nahost, tuerkei, russland, china, asien, afrika, lateinamerika, ozeanien, kanada, alternative.
- Only include regions that appear in the input articles.
- vocabulary[] entries are short charged words/phrases (1-3 words each).
- evidenceQuotes[] must be substrings actually present in the input articles.
- Output JSON only, no markdown code fences.`;
}
