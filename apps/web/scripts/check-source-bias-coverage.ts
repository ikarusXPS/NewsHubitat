// apps/web/scripts/check-source-bias-coverage.ts
//
// D-A3 enforcement: every region (17 total) must have at least one source per
// political-bias bucket: left (< -0.33), center (-0.33..0.33), right (> 0.33).
//
// Honest exception (per D-A3): if ANY source in a region carries
// `biasDiversityNote: 'limited'`, that region is exempt (state-dominated press
// makes balance infeasible — flagged in UI as a footnote per 40-CONTEXT.md).
//
// Wired into CI via `pnpm --filter @newshub/web check:source-bias`.
// Exits 0 on success, 1 on any region failing the gate.

import { NEWS_SOURCES } from '../server/config/sources';
import type { NewsSource } from '../src/types';

type Bucket = 'left' | 'center' | 'right';

const bucket = (b: number): Bucket =>
  b < -0.33 ? 'left' : b > 0.33 ? 'right' : 'center';

const byRegion: Record<string, Record<Bucket, NewsSource[]>> = {};
for (const s of NEWS_SOURCES) {
  byRegion[s.region] ??= { left: [], center: [], right: [] };
  byRegion[s.region][bucket(s.bias.political)].push(s);
}

let failures = 0;
const regionsChecked = Object.keys(byRegion).sort();

console.log(`--- Bias-coverage gate (D-A3): ${regionsChecked.length} regions, ${NEWS_SOURCES.length} sources ---`);

for (const region of regionsChecked) {
  const buckets = byRegion[region];
  const all: NewsSource[] = [...buckets.left, ...buckets.center, ...buckets.right];
  const limited = all.some((s) => s.biasDiversityNote === 'limited');

  if (limited) {
    console.log(`ℹ ${region.padEnd(20)}: limited diversity (exception per D-A3) — skipping`);
    continue;
  }

  const missing: Bucket[] = [];
  for (const b of ['left', 'center', 'right'] as Bucket[]) {
    if (buckets[b].length === 0) missing.push(b);
  }

  if (missing.length > 0) {
    console.error(
      `✗ ${region.padEnd(20)}: missing source(s) for bucket(s): ${missing.join(', ')} ` +
      `(have left=${buckets.left.length}, center=${buckets.center.length}, right=${buckets.right.length})`
    );
    failures++;
  } else {
    console.log(
      `✓ ${region.padEnd(20)}: left=${buckets.left.length}, center=${buckets.center.length}, right=${buckets.right.length}`
    );
  }
}

if (failures > 0) {
  console.error(`\n✗ Bias-coverage FAILED: ${failures} region(s) below the D-A3 threshold.`);
  process.exit(1);
}

console.log(`\n✓ Bias-coverage PASSED for all ${regionsChecked.length} regions.`);
process.exit(0);
