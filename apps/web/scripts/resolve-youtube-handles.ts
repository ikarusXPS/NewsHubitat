/**
 * One-shot maintenance script — resolve YouTube @handles to UCxxxx channelIds
 * (Phase 40-05 / Task 2).
 *
 * The curated `apps/web/server/config/video-channels.ts` ships with all
 * channelIds already filled in (resolved offline at planning time). This
 * script is the operational tool used when adding NEW channels: write the
 * entry with `channelId: ''`, run this script, and it patches the file in
 * place.
 *
 * Strategy
 * ────────
 *   1. Read `video-channels.ts` as a string (we rewrite the file, so we can
 *      preserve formatting and comments).
 *   2. For every entry whose `channelId` is empty, call
 *      `https://www.googleapis.com/youtube/v3/channels?forHandle=<handle-sans-@>&part=id&key=…`
 *      (1 quota unit per call — trivial cost; result cached forever once
 *      committed).
 *   3. Splice the resolved `UC…` value into the matching object literal,
 *      placing `channelId: 'UC…',` immediately after the `handle:` line.
 *   4. Print a summary `✓ resolved N/M`. Exit non-zero if any handles failed
 *      so the operator surfaces the missing entries.
 *
 * Anti-cost guard: aborts with a non-zero exit if `YOUTUBE_DATA_API_KEY` is
 * missing — never burn unattributed quota.
 *
 * Usage:
 *   YOUTUBE_DATA_API_KEY=… tsx apps/web/scripts/resolve-youtube-handles.ts
 */

import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(__dirname, '..', 'server', 'config', 'video-channels.ts');

interface ResolveResult {
  handle: string;
  channelId: string | null;
  reason?: string;
}

async function resolveHandle(
  handle: string,
  apiKey: string,
): Promise<ResolveResult> {
  const stripped = handle.replace(/^@/, '');
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(
      stripped,
    )}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    return { handle, channelId: null, reason: `HTTP ${res.status}` };
  }
  const data = (await res.json()) as { items?: Array<{ id?: string }> };
  const id = data.items?.[0]?.id;
  if (!id) return { handle, channelId: null, reason: 'no items' };
  return { handle, channelId: id };
}

function findUnresolvedHandles(source: string): Array<{ handle: string; line: number }> {
  // Match objects literal blocks where `channelId: ''` (or absent) follows a `handle: '@xxx'` line
  const lines = source.split(/\r?\n/);
  const results: Array<{ handle: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const handleMatch = lines[i].match(/^\s*handle:\s*'(@[^']+)'/);
    if (!handleMatch) continue;
    // Look for channelId in the next ~5 lines
    let foundFilled = false;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const cidMatch = lines[j].match(/^\s*channelId:\s*'([^']*)'/);
      if (cidMatch) {
        if (cidMatch[1] && cidMatch[1].length > 0) {
          foundFilled = true;
        }
        break;
      }
    }
    if (!foundFilled) {
      results.push({ handle: handleMatch[1], line: i });
    }
  }

  return results;
}

function patchSource(source: string, handle: string, channelId: string): string {
  // Insert `channelId: '<UC…>',` after the line containing `handle: '<handle>'`
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)handle:\s*'@[^']+'/);
    if (m && lines[i].includes(`'${handle}'`)) {
      // Check if next line is an empty channelId we should replace
      const next = lines[i + 1];
      if (next && /^\s*channelId:\s*''/.test(next)) {
        lines[i + 1] = `${m[1]}channelId: '${channelId}',`;
      } else {
        // Insert a new line right after the handle line
        lines.splice(i + 1, 0, `${m[1]}channelId: '${channelId}',`);
      }
      break;
    }
  }
  return lines.join('\n');
}

async function main() {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY;
  if (!apiKey) {
    console.error('FATAL: YOUTUBE_DATA_API_KEY environment variable is required');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`FATAL: config file not found at ${CONFIG_PATH}`);
    process.exit(1);
  }

  let source = fs.readFileSync(CONFIG_PATH, 'utf8');
  const unresolved = findUnresolvedHandles(source);

  if (unresolved.length === 0) {
    console.log('✓ No unresolved channelIds — nothing to do.');
    return;
  }

  console.log(`Resolving ${unresolved.length} channel handle(s)…`);

  let resolved = 0;
  let failed = 0;

  for (const entry of unresolved) {
    const result = await resolveHandle(entry.handle, apiKey);
    if (result.channelId) {
      source = patchSource(source, entry.handle, result.channelId);
      console.log(`  ✓ ${entry.handle} → ${result.channelId}`);
      resolved++;
    } else {
      console.warn(`  ✗ ${entry.handle}: ${result.reason ?? 'unknown error'}`);
      failed++;
    }
  }

  if (resolved > 0) {
    fs.writeFileSync(CONFIG_PATH, source, 'utf8');
    console.log(`\nWrote ${resolved} resolution(s) to ${path.relative(process.cwd(), CONFIG_PATH)}`);
  }

  console.log(`\n✓ Resolved ${resolved}/${unresolved.length} channels (${failed} failed)`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
