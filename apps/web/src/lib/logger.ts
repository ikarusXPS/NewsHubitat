// Frontend console wrapper with PII scrubbing.
// TOM-FIX-04 / Plan 41-07 — companion to apps/web/server/utils/logger.ts.
//
// Pure delegate: same level surface as `console`, but each argument runs
// through scrubObject / scrubString before being handed to the real console.
// Existing `console.*` call sites are migrated incrementally — defer until
// the dedicated codemod follow-up.
import { scrubObject, scrubString } from '../../server/utils/scrub';

function scrubArg(arg: unknown): unknown {
  if (typeof arg === 'string') return scrubString(arg);
  if (arg instanceof Error) {
    // Errors get a shallow copy with scrubbed message + stack — preserves
    // the Error prototype for downstream code that does instanceof checks.
    const next = new Error(scrubString(arg.message));
    next.name = arg.name;
    if (arg.stack) next.stack = scrubString(arg.stack);
    return next;
  }
  if (arg && typeof arg === 'object') return scrubObject(arg);
  return arg;
}

function scrubArgs(args: unknown[]): unknown[] {
  return args.map(scrubArg);
}

export const logger = {
  log: (...args: unknown[]) => console.log(...scrubArgs(args)),
  info: (...args: unknown[]) => console.info(...scrubArgs(args)),
  warn: (...args: unknown[]) => console.warn(...scrubArgs(args)),
  error: (...args: unknown[]) => console.error(...scrubArgs(args)),
  debug: (...args: unknown[]) => console.debug(...scrubArgs(args)),
};

export default logger;
