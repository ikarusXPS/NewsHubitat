/**
 * Credibility methodology prompt — Phase 38 plan 02 Task 3.
 *
 * The deterministic 0-100 score is computed BEFORE this call (by
 * credibilityService.deriveCredibilityScore) and passed in as `derivedScore`.
 * The LLM's job is to produce sub-dimension self-ratings + a localized
 * methodology paragraph that EXPLICITLY discloses the AI-attribution per D-02.
 *
 * Verbatim from RESEARCH.md §"Credibility methodology prompt".
 */

export function buildCredibilityPrompt(args: {
  sourceName: string;
  reliability: number; // 0-10
  politicalBias: number; // -1..1
  derivedScore: number; // 0-100 (computed deterministically before this call)
  locale: 'de' | 'en' | 'fr';
}): string {
  const localeName = { de: 'German', en: 'English', fr: 'French' }[args.locale];
  return `You are a media credibility analyst. Output ONLY a JSON object, no prose.

Source: "${args.sourceName}"
Curated reliability: ${args.reliability}/10
Political bias direction: ${args.politicalBias.toFixed(2)} (range -1 = far left, +1 = far right)
Derived 0-100 credibility score (already computed): ${args.derivedScore}

Produce a JSON object with this exact shape:
{
  "subDimensions": {
    "accuracy":     <integer 0-100>,
    "transparency": <integer 0-100>,
    "corrections":  <integer 0-100>
  },
  "methodologyMd": "<markdown paragraph in ${localeName}, 60-100 words, that EXPLICITLY discloses these sub-dimensions are AI-attributed estimates based on the source's reputation profile, not measured signals from this platform. Open with a one-sentence summary of the source's credibility tier. End by saying the user should verify with primary sources for any consequential decision.>"
}

Rules:
- Do not invent factual claims about the source's history.
- Do not exceed 100 words in methodologyMd.
- All three sub-dimensions must be integers in [0, 100].
- Output JSON only, no markdown code fences, no leading text.`;
}
