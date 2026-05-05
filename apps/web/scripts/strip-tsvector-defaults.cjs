#!/usr/bin/env node
/**
 * Rewrite schema.prisma in place: drop `@default(dbgenerated("..."))` from any
 * `Unsupported("tsvector")?` field. The dbgenerated argument is a SQL string
 * with nested parens and escaped quotes, so a regex-only approach is fragile —
 * this script does a tokenized walk for each tsvector line.
 *
 * Used by apps/web/scripts/ci-setup-db.sh — see that script's preamble for
 * the rationale (Postgres rejects DEFAULT clauses that reference sibling
 * columns; the columns are GENERATED ALWAYS AS ... STORED in the raw FTS
 * migrations).
 */

const fs = require('fs');

const path = process.argv[2];
if (!path) {
  console.error('usage: strip-tsvector-defaults.cjs <schema.prisma>');
  process.exit(1);
}

const src = fs.readFileSync(path, 'utf8');
const eol = src.includes('\r\n') ? '\r\n' : '\n';
const lines = src.split(/\r?\n/);
let stripped = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.includes('Unsupported("tsvector")')) continue;
  const start = line.indexOf('@default(dbgenerated(');
  if (start === -1) continue;

  // Walk from the inner opening quote, respecting escape sequences, to find
  // the matching closing quote of the dbgenerated string argument.
  const stringOpen = line.indexOf('"', start + '@default(dbgenerated('.length - 1);
  if (stringOpen === -1) continue;
  let stringEnd = -1;
  for (let j = stringOpen + 1; j < line.length; j++) {
    const ch = line[j];
    if (ch === '\\') { j++; continue; }
    if (ch === '"') { stringEnd = j; break; }
  }
  if (stringEnd === -1) continue;

  // After the closing quote we expect `))` to close dbgenerated() and @default().
  if (line.slice(stringEnd + 1, stringEnd + 3) !== '))') continue;
  // Also strip a single leading space so the field stays compact.
  const stripFrom = line[start - 1] === ' ' ? start - 1 : start;
  const stripTo = stringEnd + 3; // include `))`
  const rewritten = line.slice(0, stripFrom) + line.slice(stripTo);
  lines[i] = rewritten;
  stripped++;
}

if (stripped === 0) {
  console.error('strip-tsvector-defaults: no tsvector @default(dbgenerated(...)) clauses found — schema may already be stripped or shape changed');
  process.exit(2);
}

fs.writeFileSync(path, lines.join(eol));
console.log(`strip-tsvector-defaults: stripped ${stripped} dbgenerated default clause(s)`);
