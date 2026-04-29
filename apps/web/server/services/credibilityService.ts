/**
 * credibilityService — pure functions for deterministic credibility derivation.
 *
 * Phase 38 plan 02 — implements CONTEXT.md D-01 (deterministic 0-100 score),
 * D-04 (LOCKED bias thresholds copied verbatim from MediaBiasBar.tsx:24-31),
 * and D-05 (LOCKED 60/80 confidence thresholds).
 *
 * No I/O, no async, no external calls — these are pure utility functions
 * consumed by aiService.getSourceCredibility (Task 5) before it asks the LLM
 * for the methodology paragraph.
 */

import type { NewsSource } from '../../src/types';

export type ConfidenceBucket = 'low' | 'medium' | 'high';

/**
 * Derive a deterministic 0-100 credibility score from the curated NewsSource
 * bias profile. Formula:
 *
 *   reliabilityComponent = source.bias.reliability * 7        // 0..70
 *   biasPenalty          = |source.bias.political| * 30       // 0..30
 *   score                = clamp(round(reliabilityComponent - biasPenalty), 0, 100)
 *
 * The constants 7 (reliability multiplier) and 30 (max bias penalty) are
 * tunable here in this single function — no call site references them
 * directly (per RESEARCH.md A1 Q-1 recommendation). If the team chooses to
 * shift the weighting (e.g. emphasize bias more) these are the only knobs.
 *
 * Pure function — same input always returns the same output.
 */
export function deriveCredibilityScore(source: NewsSource): number {
  const reliabilityComponent = source.bias.reliability * 7; // 0..70
  const biasPenalty = Math.abs(source.bias.political) * 30; // 0..30
  return Math.max(0, Math.min(100, Math.round(reliabilityComponent - biasPenalty)));
}

/**
 * Classify a political-bias number into one of three buckets. Thresholds are
 * copied VERBATIM from MediaBiasBar.tsx:24-31 (D-04 LOCKED — single source of
 * truth between server-side classification and the chart UI).
 *
 *   bias < -0.2  →  'left'
 *   -0.2 ≤ bias ≤ 0.2  →  'center'
 *   bias > 0.2  →  'right'
 *
 * Pure function.
 */
export function deriveBiasBucket(politicalBias: number): 'left' | 'center' | 'right' {
  if (politicalBias < -0.2) return 'left';
  if (politicalBias > 0.2) return 'right';
  return 'center';
}

/**
 * Bucket a raw 0-100 confidence integer into 'low' | 'medium' | 'high'.
 * Thresholds are LOCKED at 60 / 80 per CONTEXT.md D-05 (single source of truth
 * for confidence-bucket UI labels across credibility, framing, and fact-check).
 *
 *   confidence < 60   →  'low'
 *   60 ≤ confidence < 80  →  'medium'
 *   confidence ≥ 80   →  'high'
 *
 * Pure function.
 */
export function bucketConfidence(rawConfidence: number): ConfidenceBucket {
  if (rawConfidence < 60) return 'low';
  if (rawConfidence < 80) return 'medium';
  return 'high';
}
